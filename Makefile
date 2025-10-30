.PHONY: help diff build watch clean check-diff update-docs init setup-scripts

# --- Configuration de la branche de base ---
# Par défaut, utilise 'main'. Peut être surchargé (ex: make update-docs BASE_BRANCH=dev)
BASE_BRANCH ?= main

# Cible par défaut
help:
	@echo "Commandes disponibles:"
	@echo "  make build   - Compiler le TypeScript (une fois)"
	@echo "  make watch   - Compiler le TypeScript en mode watch"
	@echo "  make clean   - Supprimer les fichiers générés"

	@echo "  update-docs  - Met à jour la documentation et la version"

# Exporter le git diff
diff:
	git diff main > mon_diff.patch
	@echo "Diff exporté vers mon_diff.patch"

# Compiler le TypeScript (une fois)
build:
	npx tsup src/index.ts --format cjs,esm --dts

# Compiler le TypeScript en mode watch
watch:
	npx tsup src/index.ts --format cjs,esm --dts --watch

# Nettoyer les fichiers générés
clean:
	rm -rf dist/
	@echo "Fichiers nettoyés"



# --- Tâche Principale : Met à jour la documentation et la version ---
update-docs: setup-scripts VERSION CHANGELOG.md README.md
	@echo "--------------------------------------------------------"
	@echo "1. Récupération des informations et analyse par l'IA..."
	@echo "   Branche de base pour le diff: $(BASE_BRANCH)"
	@echo "--------------------------------------------------------"

	# 2. Exécute le script shell pour le versionnement, l'analyse IA et la documentation
	dos2unix scripts/update_docs.sh
	@/bin/bash scripts/update_docs.sh "$(BASE_BRANCH)"

	@echo "--------------------------------------------------------"
	@echo "SUCCESS: L'IA a déterminé le type de changement et mis à jour la version."
	@echo "Les fichiers VERSION, CHANGELOG.md et README.md ont été mis à jour."
	@echo "Pensez à engager ces changements : git add . && git commit -m \"chore(release): $(shell cat VERSION)\""
	@echo "--------------------------------------------------------"

# --- Tâche de diagnostic : affiche le diff ---
# Reste pour une analyse humaine si nécessaire
check-diff:
	@echo "--------------------------------------------------------"
	@echo "ANALYSE DU DIFF AVEC $(BASE_BRANCH)"
	@echo "--------------------------------------------------------"
	@echo "Voici le diff entre la branche courante et $(BASE_BRANCH):"
	# Affiche les fichiers modifiés et les lignes
	@git diff --stat $(BASE_BRANCH) || { echo "Attention: La branche '$(BASE_BRANCH)' n'est peut-être pas trouvée ou il n'y a pas de diff."; }
	@echo ""
	@echo "Vous pouvez exécuter 'make update-docs' pour laisser l'IA déduire le type de changement."
	@echo "--------------------------------------------------------"

# --- Targets factices pour la création des fichiers s'ils sont manquants ---
VERSION:
	@echo "1.0.0" > VERSION
CHANGELOG.md:
	@echo "# CHANGELOG" > CHANGELOG.md
	@echo "## [1.0.0] - $(shell date +%Y-%m-%d)" >> CHANGELOG.md
	@echo "### Added" >> CHANGELOG.md
	@echo "- Initialisation du projet." >> CHANGELOG.md
README.md:
	@echo "# Mon Projet" > README.md
	@echo "\n## Version\n\nVersion actuelle: 1.0.0" >> README.md

# Tâche d'initialisation pour créer tous les fichiers de base
init: setup-scripts VERSION CHANGELOG.md README.md
	@echo "Fichiers VERSION, CHANGELOG.md et README.md initialisés (si non présents)."

# --- Tâche de préparation des scripts (ajoute les droits d'exécution) ---
setup-scripts:
	@mkdir -p scripts
	@chmod +x scripts/update_docs.sh 2>/dev/null || true
