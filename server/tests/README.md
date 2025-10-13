# Documentation des tests — Nutri-Check

Cette documentation explique l'architecture de tests du projet **Nutri-Check** et fournit les instructions pour exécuter les tests unitaires, d'intégration et E2E.

---

## 1. Architecture des tests

```
tests/
├── unit/           # Tests unitaires
├── integration/    # Tests d'intégration
├── e2e/            # Tests bout-à-bout (E2E)
├── conftest.py     # Fichier commun à tous les tests
```

---

### 1.1 Fichier `conftest.py`

Ce fichier contient les **fixtures** partagées entre tous les tests :

- **mock_db** : Base MongoDB simulée avec `mongomock` pour isoler les tests unitaires.
- **real_db** : Connexion à une vraie instance MongoDB pour les tests d’intégration.
- **client** : Client HTTP FastAPI pour exécuter les tests E2E.
- **sample_product** : Données de test réutilisables (ex : un produit fictif).

Les fixtures utilisent le décorateur `@pytest.fixture(scope="...")` :

- `function` : la fixture est recréée pour chaque test.
- `module` : la fixture est partagée entre tous les tests d’un même module.
- `session` : la fixture est partagée sur toute la session de tests.

---

## 2. Comment exécuter les tests

1. Installer les dépendances du projet :

```bash
poetry install
```

2. Lancer tous les tests avec pytest :

```bash
poetry run pytest
```

3. Lancer uniquement les tests unitaires, d’intégration ou E2E :

```bash
# Tests unitaires
poetry run pytest tests/unit

# Tests d'intégration
poetry run pytest tests/integration

# Tests E2E
poetry run pytest tests/e2e
```

4. Afficher un rapport détaillé :

```bash
poetry run pytest -v --tb=short
```

---

## 3. Bonnes pratiques

- Les tests unitaires utilisent mock_db pour isoler les opérations sur la base.

- Les tests d’intégration peuvent utiliser real_db pour vérifier la communication avec une vraie instance MongoDB.

- Les tests E2E utilisent client pour tester les endpoints FastAPI comme un utilisateur réel.

- Les données créées dans les tests unitaires ne doivent jamais persister dans la base réelle.

---

## 4. Remarques

- Chaque fixture est responsable de l'initialisation et du nettoyage des ressources.

- Pour ajouter de nouvelles collections ou modèles, ajouter une fixture correspondante et des données de test dans conftest.py.

- mongomock est utilisé pour simuler MongoDB sans avoir besoin d’un serveur réel pour les tests rapides.

- Les tests E2E garantissent que l'API fonctionne correctement avec toutes les dépendances de l'application simulées ou réelles.
