# MongoDB Initialization

Ce dossier contient le script d'initialisation de la base de données MongoDB pour le projet Nutri-Check.

## Fichiers

- **init-mongo.sh** : Script bash d'initialisation automatique de MongoDB
- **dev-sample.gz** : Échantillon local des données de produits (optionnel)

## Fonctionnement

Le script `init-mongo.sh` effectue les opérations suivantes :

1. **Vérifie si l'initialisation a déjà été effectuée** via un fichier flag
2. **Charge les données** depuis l'une des deux sources :
   - Données locales (`dev-sample.gz`) si `DATA_SOURCE_URL` n'est pas défini
   - Données distantes téléchargées depuis `DATA_SOURCE_URL` si défini

## Utilisation

### Avec Docker Compose

Le script est automatiquement exécuté lors du démarrage du conteneur MongoDB via Docker.

### Variables d'environnement

- `DATA_SOURCE_URL` : URL de téléchargement du dump complet de la base de données
  - Si non défini : utilise les données locales
  - Exemple : `https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz`

### Base de données par défaut

- **Base** : `nutridb`
- **Collection** : `products`

## Notes

- Le script garantit une initialisation unique de la base de données
- L'authentification est configurée parallèlement par Docker lors du démarrage
