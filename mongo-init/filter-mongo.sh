#!/bin/bash
# Script pour nettoyer les documents MongoDB et ne garder que les champs autorisés

DB_NAME="${1:-nutridb}"
COLLECTION_NAME="${2:-products}"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧹 NETTOYAGE DES CHAMPS MONGODB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Paramètres: DB=$DB_NAME, Collection=$COLLECTION_NAME"
echo ""

# Vérifier la connexion à MongoDB
echo "🔍 Vérification de la connexion à MongoDB..."
COUNT=$(docker exec nutri_mongo mongosh "$DB_NAME" --quiet --eval "db.getCollection('$COLLECTION_NAME').countDocuments()" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ ERREUR: Impossible de se connecter à MongoDB"
    exit 1
fi

echo "✅ Connecté - Documents à traiter: $COUNT"
echo ""

if [ "$COUNT" -eq 0 ]; then
    echo "⚠️  Collection vide"
    exit 0
fi

# Créer un fichier temporaire pour le script MongoDB
TEMP_SCRIPT=$(mktemp)

cat > "$TEMP_SCRIPT" << 'MONGO_CODE'
const collection = db.products;
const allowedFields = [
    "_id", "_keywords", "allergens_from_ingredients", "brands",
    "categories", "code", "countries", "ecoscore_tags",
    "ingredients_text", "last_modified_t", "nutriments",
    "nutriscore_grade", "product_name", "product_type"
];

const countBefore = collection.countDocuments();
print("   Documents avant: " + countBefore);

const projection = { _id: 1 };
allowedFields.forEach(field => {
  if (field !== "_id") {
    projection[field] = 1;
  }
});

const tempName = "products_temp";
try {
  db.getCollection(tempName).drop();
} catch(e) {}

print("   Création de la collection filtrée...");
db.products.aggregate([
  { $project: projection }
]).forEach(doc => {
  db[tempName].insertOne(doc);
});

print("   Remplacement de l'ancienne collection...");
db.products.drop();
db[tempName].renameCollection("products");

const countAfter = collection.countDocuments();
const sample = collection.findOne();
const fieldsCount = Object.keys(sample).length;

print("");
print("✅ Nettoyage complété!");
print("   Documents après: " + countAfter);
print("   Champs par document: " + fieldsCount);
print("   Champs attendus: " + allowedFields.length);
MONGO_CODE

echo "⏳ Nettoyage en cours..."
echo ""

docker cp "$TEMP_SCRIPT" nutri_mongo:/tmp/filter.js
docker exec nutri_mongo mongosh "$DB_NAME" /tmp/filter.js

rm "$TEMP_SCRIPT"
docker exec nutri_mongo rm /tmp/filter.js 2>/dev/null

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✨ TERMINÉ"
echo "════════════════════════════════════════════════════════════════════════════════"
