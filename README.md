# Nutri-Check

Application web pour consulter et gérer des produits alimentaires avec leurs informations nutritionnelles.

## Configuration

### 1. Créer un fichier `.env`

Avant de lancer le projet, créez un fichier `.env` à la racine du serveur avec les informations suivantes :

```env
EMAIL_ADDRESS=nutri.check.gpstl@gmail.com
EMAIL_PASSWORD=djcy stnr kgyt vfvk
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
GOOGLE_API_KEY=
```

## Lancer le projet

Pour démarrer l'application avec Docker :

```bash
docker-compose up --build -d
```

L'application sera accessible à `localhost:5157`

## Documentation détaillée

Pour plus d'informations sur le développement et l'interaction avec la base de données, consultez [DEVELOPMENT.md](DEVELOPMENT.md).

## Peupler la base de données

### Télécharger les données

Téléchargez le fichier MongoDB dump contenant tous les produits :
[https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz](https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz)

### Prérequis

Pour exécuter les scripts, vous devez avoir installés sur votre PC :
- `mongosh`
- `mongorestore`
- `python`

### Importer les produits

Dans le dossier `mongo-init`, lancez :

```bash
./init-mongo.sh fichier_telecherge.gz
```

Vous pouvez arrêter l'exécution du script dès que vous avez importé le nombre de GB de produits souhaité.

### Nettoyer et optimiser la base de données

Exécutez ensuite le script de filtrage :

```bash
./filter-mongo.sh
```

Ce script va :
- Réduire le nombre de colonnes
- Enlever les doublons
- Supprimer les lignes sans intérêt
- Ajouter les index à la base de données

## Accès à l'application

Une fois la base de données peuplée et le serveur lancé, rendez-vous à :

```
http://localhost:5157
```
