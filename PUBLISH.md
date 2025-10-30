Déploiement

# Pour une correction de bug (ex: 1.0.0 -> 1.0.1)
```shell
npm version patch
```
# Pour une nouvelle fonctionnalité (ex: 1.0.1 -> 1.1.0)
```shell
npm version minor
```

# Pour un changement non rétrocompatible (ex: 1.1.0 -> 2.0.0)
```shell
npm version major
```


# Pousser le commit de version
```shell
git push
```

# Pousser les tags
```shell
git push --tags
```

```shell
npm login
npm publish
```