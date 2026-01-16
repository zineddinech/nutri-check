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
echo "════════════════════════════════════════════════════════════════════════════════"
echo "🚀 INITIALISATION DE LA BASE DE DONNÉES MONGODB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "[1/6] Vérification du drapeau d'initialisation..."

# Vérifie si la collection cible existe déjà et contient des données.
# Utilise mongosh pour exécuter une commande simple et obtenir le nombre de documents.
# Note : Nous nous connectons sans authentification au début, car l'initialisation de l'utilisateur se fait en parallèle.
# L'authentification sera requise pour les connexions ultérieures.
echo "[2/6] Connexion à MongoDB et vérification de la collection..."
COUNT=$(mongosh "$DB_NAME" --quiet --eval "db.getCollection('$COLLECTION_NAME').countDocuments()")

# Si la collection contient déjà des documents, on suppose que la restauration a déjà eu lieu.
if [ "$COUNT" -gt 0 ]; then
    echo "✅ Collection '$COLLECTION_NAME' already exists and contains data."
    echo "   └─ Nombre de documents: $COUNT"
    echo ""
    exit 0
fi

echo "Collection is empty. Starting data restore process..."
echo "[3/6] Détermination de la source de données..."
echo ""

# Accepte l'URL comme argument de ligne de commande ou variable d'environnement
DATA_SOURCE_URL="${1:-${DATA_SOURCE_URL:-}}"

# Décide quel fichier de dump utiliser en fonction de la variable d'environnement.
if [ -z "$DATA_SOURCE_URL" ]; then
    # Si DATA_SOURCE_URL n'est pas défini, utilise l'échantillon local.
    echo "📂 Source: Utilisation des données locales (dev-sample.gz)"
    DUMP_TO_RESTORE=$LOCAL_DUMP_FILE
elif [ -f "$DATA_SOURCE_URL" ]; then
    # Si c'est un chemin de fichier local qui existe
    echo "📂 Source: Utilisation du fichier local ($DATA_SOURCE_URL)"
    DUMP_TO_RESTORE="$DATA_SOURCE_URL"
elif [[ "$DATA_SOURCE_URL" =~ ^https?:// ]]; then
    # Si c'est une URL (commence par http:// ou https://)
    echo "📡 Source: Téléchargement du dump complet depuis $DATA_SOURCE_URL"
    echo "[4/6] Téléchargement du dump complet (cette étape peut prendre plusieurs minutes)..."
    # Utilise curl pour télécharger le fichier. -L gère les redirections, -o spécifie le fichier de sortie.
    curl -L -o "$DOWNLOAD_DUMP_FILE" "$DATA_SOURCE_URL"
    echo "✅ Téléchargement complété."
    DUMP_TO_RESTORE=$DOWNLOAD_DUMP_FILE
else
    # Si le fichier n'existe pas et ce n'est pas une URL valide
    echo "❌ ERREUR: Le fichier '$DATA_SOURCE_URL' n'existe pas et ce n'est pas une URL valide."
    echo "   Usage: ./init-mongo.sh [chemin/local/fichier.gz | https://url/vers/fichier.gz]"
    exit 1
fi

echo ""


# Exécute la restauration avec le fichier de dump sélectionné.
echo "Restoring from $DUMP_TO_RESTORE..."
echo "[5/6] Restauration des données dans MongoDB (cette étape peut prendre plusieurs minutes)..."
echo ""
echo "📊 Informations du fichier :"
ls -lh "$DUMP_TO_RESTORE" | awk '{printf "   └─ Taille: %s (%s)\n", $5, $NF}'
echo ""
echo "⏳ Restauration en cours..."
echo ""

mongorestore \
    --verbose \
    --gzip \
    --archive="$DUMP_TO_RESTORE" \
    --nsFrom="off.products" \
    --nsTo="$DB_NAME.$COLLECTION_NAME" \
    --drop

echo ""
echo "[6/6] Vérification et affichage des données chargées..."
# Compte les documents restaurés
RESTORED_COUNT=$(mongosh "$DB_NAME" --quiet --eval "db.getCollection('$COLLECTION_NAME').countDocuments()")
echo ""
echo "✅ Restauration des données terminée!"
echo "   └─ Nombre total de documents chargés: $RESTORED_COUNT"
echo ""

# Filtre les produits invalides (ceux qui n'ont pas les champs requis)
echo "[6/6] Filtrage des produits invalides..."
echo "   Champs requis: product_name, categories, nutriments, code"
echo ""

# Supprime les documents qui ne répondent pas aux critères
mongosh "$DB_NAME" --quiet --eval "
  const collection = db.getCollection('$COLLECTION_NAME');
  
  // Compte les documents avant suppression
  const countBefore = collection.countDocuments();
  
  // Supprime les documents sans les champs requis
  const result = collection.deleteMany({
    \$or: [
      { product_name: { \$exists: false } },
      { product_name: { \$eq: '' } },
      { categories: { \$exists: false } },
      { categories: { \$eq: '' } },
      { nutriments: { \$exists: false } },
      { nutriments: { \$eq: {} } },
      { code: { \$exists: false } },
      { code: { \$eq: '' } }
    ]
  });
  
  // Compte les documents après suppression
  const countAfter = collection.countDocuments();
  const deletedCount = countBefore - countAfter;
  
  print('   • Documents avant filtrage: ' + countBefore);
  print('   • Documents supprimés (invalides): ' + deletedCount);
  print('   • Documents valides conservés: ' + countAfter);
"

VALID_COUNT=$(mongosh "$DB_NAME" --quiet --eval "db.getCollection('$COLLECTION_NAME').countDocuments()")
echo ""

# Si nous avons téléchargé un fichier, nous le nettoyons pour économiser de l'espace.
if [ -n "${DATA_SOURCE_URL:-}" ]; then
    echo "🧹 Nettoyage du fichier téléchargé..."
    rm "$DOWNLOAD_DUMP_FILE"
    echo "✅ Fichier supprimé."
fi

# Crée le fichier drapeau pour empêcher les futures exécutions.
touch "$INIT_FLAG"
echo "✅ Fichier drapeau d'initialisation créé: $INIT_FLAG"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✨ L'initialisation de la base de données est TERMINÉE avec succès!"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 RÉSUMÉ:"
echo "   • Base de données: $DB_NAME"
echo "   • Collection: $COLLECTION_NAME"
echo "   • Documents initialement chargés: $RESTORED_COUNT"
echo "   • Documents VALIDES (avec tous les champs requis): $VALID_COUNT"
if [ "$RESTORED_COUNT" -gt 0 ]; then
    PERCENTAGE=$((VALID_COUNT * 100 / RESTORED_COUNT))
    INVALID=$((RESTORED_COUNT - VALID_COUNT))
    echo "   • Documents invalides supprimés: $INVALID ($((100 - PERCENTAGE))%)"
fi
echo ""
