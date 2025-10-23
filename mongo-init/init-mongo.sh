#!/bin/bash
# 'set -e' garantit que le script s'arrêtera immédiatement si une commande échoue.
set -e

# Définit les noms de la base de données et de la collection pour la cohérence.
DB_NAME="nutridb"
COLLECTION_NAME="products"
LOCAL_DUMP_FILE="/docker-entrypoint-initdb.d/dev-sample.gz"
DOWNLOAD_DUMP_FILE="/tmp/full-dump.gz"

# Le chemin vers un fichier "drapeau" qui indique si l'initialisation a déjà été effectuée.
INIT_FLAG="/data/db/.initialized"

# Vérifie l'existence du fichier drapeau au lieu de compter les documents.
if [ -f "$INIT_FLAG" ]; then
    echo "✅ Initialization flag found. Skipping data restore."
    exit 0
fi

echo "--- Starting database initialization (first run) ---"

# Vérifie si la collection cible existe déjà et contient des données.
# Utilise mongosh pour exécuter une commande simple et obtenir le nombre de documents.
# Note : Nous nous connectons sans authentification au début, car l'initialisation de l'utilisateur se fait en parallèle.
# L'authentification sera requise pour les connexions ultérieures.
COUNT=$(mongosh "$DB_NAME" --quiet --eval "db.getCollection('$COLLECTION_NAME').countDocuments()")

# Si la collection contient déjà des documents, on suppose que la restauration a déjà eu lieu.
if [ "$COUNT" -gt 0 ]; then
    echo "✅ Collection '$COLLECTION_NAME' already exists and contains data. Skipping restore."
    exit 0
fi

echo "Collection is empty. Starting data restore process..."

# Décide quel fichier de dump utiliser en fonction de la variable d'environnement.
if [ -z "${DATA_SOURCE_URL:-}" ]; then
    # Si DATA_SOURCE_URL n'est pas défini, utilise l'échantillon local.
    echo "DATA_SOURCE_URL is not set. Using local sample data."
    DUMP_TO_RESTORE=$LOCAL_DUMP_FILE
else
    # Si DATA_SOURCE_URL est défini, télécharge le fichier complet.
    echo "DATA_SOURCE_URL is set. Downloading full dataset from $DATA_SOURCE_URL..."
    # Utilise curl pour télécharger le fichier. -L gère les redirections, -o spécifie le fichier de sortie.
    curl -L -o "$DOWNLOAD_DUMP_FILE" "$DATA_SOURCE_URL"
    echo "Download complete."
    DUMP_TO_RESTORE=$DOWNLOAD_DUMP_FILE
fi


# Exécute la restauration avec le fichier de dump sélectionné.
echo "Restoring from $DUMP_TO_RESTORE..."
mongorestore \
    --verbose \
    --gzip \
    --archive="$DUMP_TO_RESTORE" \
    --nsFrom="off.products" \
    --nsTo="$DB_NAME.$COLLECTION_NAME" \
    --drop

# Si nous avons téléchargé un fichier, nous le nettoyons pour économiser de l'espace.
if [ -n "${DATA_SOURCE_URL:-}" ]; then
    echo "Cleaning up downloaded file..."
    rm "$DOWNLOAD_DUMP_FILE"
fi

# Crée le fichier drapeau pour empêcher les futures exécutions.
touch "$INIT_FLAG"

echo "--- Database restored successfully and initialization flag created. ---"
