# MongoDB Initialization

Ce dossier contient le script d'initialisation de la base de données MongoDB pour le projet Nutri-Check.

## Fichiers

- **init-mongo.sh** : Script bash d'initialisation automatique de MongoDB
- **init-mongo-v2.py** : Script Python d'analyse et validation des données de produits
- **dev-sample.gz** : Échantillon local des données de produits (optionnel)

## Fonctionnement

### init-mongo.sh

Le script `init-mongo.sh` effectue les opérations suivantes :

1. **Vérifie si l'initialisation a déjà été effectuée** via un fichier flag
2. **Charge les données** depuis l'une des deux sources :
   - Données locales (`dev-sample.gz`) si `DATA_SOURCE_URL` n'est pas défini
   - Données distantes téléchargées depuis `DATA_SOURCE_URL` si défini

### init-mongo-v2.py

Script Python d'analyse des données du dump MongoDB qui :

1. **Valide les produits** selon les champs requis
2. **Affiche des statistiques détaillées** sur :
   - Nombre total de produits lus
   - Nombre de produits valides vs invalides
   - Taux de remplissage de chaque champ
   - Valeurs les plus communes par champ

#### Champs requis pour un produit valide

Un produit est considéré comme **VALIDE** s'il possède TOUS les champs suivants (non-vides) :

- `product_name` : Nom du produit
- `categories` : Catégories du produit
- `nutriments` : Informations nutritionnelles
- `code` : Code du produit (EAN/UPC)

#### Utilisation

```bash
python3 init-mongo-v2.py
```

**Configuration**

- `ZIP_PATH` : Chemin du fichier dump (`.gz`)
- `MAX_PRODUCTS` : Nombre maximum de produits à analyser (None = tous)
- `REQUIRED_FIELDS` : Liste des champs obligatoires pour la validation

#### Sortie exemple

```
================================================================================
🚀 DÉMARRAGE DU CHARGEMENT DES DONNÉES
================================================================================
📂 Fichier à traiter: openfoodfacts-mongodbdump.gz
📋 Champs requis: product_name, categories, nutriments, code

  ✓ 10,000 produits lus | 8,234 valides
  ✓ 20,000 produits lus | 16,102 valides
...

✅ Analyse complète: 100,000 produits lus
   └─ Produits valides: 75,432 (75.43%)

================================================================================
📊 RAPPORT D'ANALYSE DES DONNÉES
================================================================================

📈 STATISTIQUES GLOBALES:
   • Total produits lus: 100,000
   • ✅ Produits VALIDES: 75,432 (75.43%)
   • ❌ Produits INVALIDES: 24,568 (24.57%)
   • Champs analysés: 14
   • Champs requis: product_name, categories, nutriments, code
```

## Utilisation

### Avec Docker Compose

Le script `init-mongo.sh` est automatiquement exécuté lors du démarrage du conteneur MongoDB via Docker.

### Variables d'environnement

- `DATA_SOURCE_URL` : URL de téléchargement du dump complet de la base de données
  - Si non défini : utilise les données locales
  - Exemple : `https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz`

### Base de données par défaut

- **Base** : `nutridb`
- **Collection** : `products`

## Notes

- Le script `init-mongo.sh` garantit une initialisation unique de la base de données
- Le script `init-mongo-v2.py` permet de valider et analyser les données avant insertion
- L'authentification est configurée parallèlement par Docker lors du démarrage
- Seuls les produits **VALIDES** (avec tous les champs requis) devraient être insérés dans la base de données en production
