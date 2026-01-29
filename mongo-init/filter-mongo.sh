#!/bin/bash
# Script pour filtrer et normaliser les documents MongoDB

DB_NAME="${1:-nutridb}"
COLLECTION_NAME="${2:-products}"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧹 FILTRAGE ET NORMALISATION MONGODB"
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

// Pays à conserver (normalisés en anglais)
const countriesMap = {
  "France": "France",
  "United States": "United States",
  "en:fr": "France",
  "en:france": "France",
  "en:FR": "France",
  "en:us": "United States",
  "en:United States": "United States",
  "en:be": "Belgium",
  "en:ca": "Canada",
  "en:gb": "United Kingdom",
  "en:ch": "Switzerland",
  "en:de": "Germany",
  "Deutschland": "Germany",
  "en:Germany": "Germany",
  "España": "Spain",
  "en:es": "Spain",
  "Spain": "Spain",
  "en:it": "Italy",
  "Italy": "Italy"
};

// Normaliser les pays
function normalizeCountries(countriesStr) {
  if (!countriesStr || countriesStr.trim() === "") return null;
  
  const cleaned = countriesStr.trim();
  return countriesMap[cleaned] || cleaned;
}

// Champs à conserver UNIQUEMENT
const fieldsToKeep = [
  "_id",
  "_keywords",
  "allergens",
  "allergens_from_ingredients",
  "brands",
  "categories",
  "code",
  "countries",
  "ecoscore_tags",
  "ingredients_text",
  "last_modified_t",
  "nutriments",
  "nutriscore_grade",
  "product_name",
  "product_type"
];

const countBefore = collection.countDocuments();
print("   Documents avant: " + countBefore);

let cleanedCount = 0;

// Traiter chaque document
const cursor = collection.find();
cursor.forEach(doc => {
  // Normaliser les pays
  if (doc.countries) {
    doc.countries = normalizeCountries(doc.countries);
  }

  // Créer un nouveau document avec UNIQUEMENT les champs à conserver
  const cleanedDoc = {};
  fieldsToKeep.forEach(field => {
    if (doc.hasOwnProperty(field)) {
      cleanedDoc[field] = doc[field];
    }
  });

  // Remplacer le document
  collection.replaceOne({ _id: doc._id }, cleanedDoc);
  cleanedCount++;

  if ((cleanedCount % 100000) === 0) {
    print("   ✓ " + cleanedCount + " documents nettoyés...");
  }
});

// Créer les index
print("   📌 Création des index...");
collection.createIndex({ product_name: 1 }, { name: 'idx_product_name' });
collection.createIndex({ nutriscore_grade: 1 }, { name: 'idx_nutriscore' });

const countAfter = collection.countDocuments();

print("");
print("✅ Nettoyage et normalisation complétés!");
print("   Documents avant: " + countBefore);
print("   Documents nettoyés: " + cleanedCount);
print("   Champs conservés: " + fieldsToKeep.length);
print("");
print("📋 Champs conservés:");
print("   ✓ _id, _keywords, allergens, allergens_from_ingredients");
print("   ✓ brands, categories, code, countries");
print("   ✓ ecoscore_tags, ingredients_text, last_modified_t");
print("   ✓ nutriments, nutriscore_grade, product_name, product_type");
print("");
MONGO_CODE

echo "⏳ Nettoyage et création d'index en cours..."
echo ""

docker cp "$TEMP_SCRIPT" nutri_mongo:/tmp/filter.js
docker exec nutri_mongo mongosh "$DB_NAME" /tmp/filter.js

rm "$TEMP_SCRIPT"
docker exec nutri_mongo rm /tmp/filter.js 2>/dev/null

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✨ TERMINÉ"
echo "════════════════════════════════════════════════════════════════════════════════"