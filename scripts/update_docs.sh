#!/bin/bash
# Description: Script to analyze git diff via Gemini CLI, calculate the next
# SemVer version, and update documentation files.

set -e # Exit immediately if a command exits with a non-zero status
#set -x # Uncomment for debug tracing

BASE_BRANCH=$1

# --- Prerequisites and Configuration ---

if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install it (e.g., sudo apt install jq)."
    exit 1
fi

if ! command -v gemini &> /dev/null; then
    echo "Error: 'gemini' command not found."
    echo "Please ensure the Gemini CLI is installed and in your PATH (e.g., npm install -g @google/gemini-cli)."
    exit 1
fi

if [ ! -f VERSION ] || [ ! -f CHANGELOG.md ] || [ ! -f README.md ]; then
    echo "Error: Missing required files. Run 'make init' first."
    exit 1
fi

# --- 1. Fetch Git Diff, CHANGELOG, and existing README ---

GIT_DIFF=$(git diff --no-color "$BASE_BRANCH" || true)
if [ -z "$GIT_DIFF" ]; then
    echo "No changes: No diff found between the current branch and $BASE_BRANCH."
    exit 0
fi

CHANGELOG_CONTENT=$(cat CHANGELOG.md)
README_CONTENT=$(cat README.md)

echo "   Diff captured, existing CHANGELOG and README read. Sending analysis to AI via Gemini CLI..."

# --- 2. Build prompt for Gemini ---

TEMP_PROMPT_FILE=$(mktemp)
cat <<EOF > "$TEMP_PROMPT_FILE"
Act as an expert in code analysis and Semantic Versioning (SemVer).
Analyze the 'git diff' below and determine the change type ('fix', 'minor', or 'major').
Generate a concise and descriptive CHANGELOG message that respects the style of the existing CHANGELOG.
Also, review the README.md content and update it if the changes in the diff warrant it (new features, API changes, updates to instructions, etc.).

Your ONLY response MUST be a valid JSON object adhering to the following schema:
--- JSON Schema ---
{
    "type": "OBJECT",
    "properties": {
        "type": {"type": "STRING", "enum": ["fix", "minor", "major"]},
        "message": {"type": "STRING"},
        "readme_content": {"type": "STRING"}
    },
    "required": ["type", "message", "readme_content"]
}
--- End JSON Schema ---

--- Context Git Diff ---
$GIT_DIFF

--- Context Existing CHANGELOG.md ---
$CHANGELOG_CONTENT

--- Context Existing README.md ---
$README_CONTENT
EOF

# --- 3. Call Gemini CLI ---

TEMP_OUTPUT_FILE=$(mktemp)
gemini --yolo "$(cat "$TEMP_PROMPT_FILE")" \
    --model gemini-2.5-flash \
    --output-format json 2>&1 | tee "$TEMP_OUTPUT_FILE"
GEMINI_EXIT_CODE=$?
rm "$TEMP_PROMPT_FILE"

if [ $GEMINI_EXIT_CODE -ne 0 ]; then
    echo "Error: The 'gemini' command exited with code $GEMINI_EXIT_CODE." >&2
    echo "CLI Output: $(cat "$TEMP_OUTPUT_FILE")" >&2
    rm "$TEMP_OUTPUT_FILE"
    exit 1
fi

# --- 4. Parse Gemini response robustly ---

GENERATED_RESPONSE_TEXT=$(cat "$TEMP_OUTPUT_FILE" | \
    sed -n '/^{/,$p' | \
    jq -r '
    if has("response") then
        .response
        | gsub("^```json\\n"; "")
        | gsub("```$"; "")
    elif has("candidates") then
        .candidates[0].content.parts[0].text
        | gsub("^```json\\n"; "")
        | gsub("```$"; "")
    else
        .
    end
' 2>/dev/null)

rm "$TEMP_OUTPUT_FILE"

# Ensure valid JSON
GENERATED_JSON_STRING=$(echo "$GENERATED_RESPONSE_TEXT" | jq -c '.' 2>/dev/null || true)
if [ -z "$GENERATED_JSON_STRING" ]; then
    echo "Parsing Error: Could not extract valid JSON from Gemini response." >&2
    echo "Raw response (after stripping markdown): $GENERATED_RESPONSE_TEXT" >&2
    exit 1
fi

# Ensure required fields exist
if ! echo "$GENERATED_JSON_STRING" | jq -e '.type and .message and .readme_content' >/dev/null; then
    echo "Parsing Error: AI response missing required fields (type, message, readme_content)." >&2
    echo "Final Parsed JSON: $GENERATED_JSON_STRING" >&2
    exit 1
fi

AI_TYPE=$(echo "$GENERATED_JSON_STRING" | jq -r '.type')
AI_MESSAGE=$(echo "$GENERATED_JSON_STRING" | jq -r '.message')
AI_README_CONTENT=$(echo "$GENERATED_JSON_STRING" | jq -r '.readme_content')

echo "--------------------------------------------------------"
echo "AI ANALYSIS SUCCESSFUL"
echo "   Deduced Type: $AI_TYPE"
echo "   Generated Message: $AI_MESSAGE"
echo "--------------------------------------------------------"

# --- 5. Version Update Logic ---

CURRENT_VERSION=$(cat VERSION)
MAJOR=$(echo $CURRENT_VERSION | awk -F. '{print $1}')
MINOR=$(echo $CURRENT_VERSION | awk -F. '{print $2}')
FIX=$(echo $CURRENT_VERSION | awk -F. '{print $3}')

case "$AI_TYPE" in
  major)
    NEXT_VERSION="$((MAJOR + 1)).0.0"
    CATEGORY="Major Changes (BREAKING CHANGES)"
    ;;
  minor)
    NEXT_VERSION="$MAJOR.$((MINOR + 1)).0"
    CATEGORY="New Features (Minor)"
    ;;
  fix|*)
    NEXT_VERSION="$MAJOR.$MINOR.$((FIX + 1))"
    CATEGORY="Bug Fixes (Fix)"
    ;;
esac

echo "   Current Version: $CURRENT_VERSION"
echo "   Next Version: $NEXT_VERSION"
echo "$NEXT_VERSION" > VERSION
echo "   VERSION file updated to $NEXT_VERSION."

# --- 6. Update CHANGELOG.md ---

DATE=$(date +%Y-%m-%d)
CHANGELOG_PATH="CHANGELOG.md"
NEW_ENTRY="## [$NEXT_VERSION] - $DATE\n\n### $CATEGORY\n- $AI_MESSAGE\n"

TEMP_CHANGELOG=$(mktemp)
head -n 1 "$CHANGELOG_PATH" > "$TEMP_CHANGELOG"
echo -e "$NEW_ENTRY" >> "$TEMP_CHANGELOG"
tail -n +2 "$CHANGELOG_PATH" >> "$TEMP_CHANGELOG"
mv "$TEMP_CHANGELOG" "$CHANGELOG_PATH"

echo "   CHANGELOG.md file updated with category '$CATEGORY'."

# --- 7. Update README.md ---

README_PATH="README.md"
if [ "$AI_README_CONTENT" != "NO_CHANGE_NEEDED" ]; then
    echo "   Updating README.md content based on AI suggestions..."
    echo -e "$AI_README_CONTENT" > "$README_PATH"
    echo "   README.md content updated by AI."
else
    echo "   AI suggested no changes to README.md."
fi

echo "   Updating version number in README.md..."
if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "s/Version actuelle: [0-9]*\.[0-9]*\.[0-9]*/Version actuelle: $NEXT_VERSION/g" "$README_PATH"
else
    sed -i '' "s/Version actuelle: [0-9]*\.[0-9]*\.[0-9]*/Version actuelle: $NEXT_VERSION/g" "$README_PATH"
fi
echo "   README.md updated with version $NEXT_VERSION."

exit 0
