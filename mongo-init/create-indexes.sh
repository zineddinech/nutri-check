#!/bin/bash
# Script pour créer les index MongoDB sur les champs de filtrage

DB_NAME="${1:-nutridb}"
COLLECTION_NAME="${2:-products}"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "📊 CRÉATION DES INDEX MONGODB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📌 Paramètres: DB=$DB_NAME, Collection=$COLLECTION_NAME"
echo ""

docker exec nutri_mongo mongosh "$DB_NAME" << 'MONGODB_INDEX'
const collection = db.products;

print("🔍 Vérification des index existants...");
const indexes = collection.getIndexes();
print("   Index actuels: " + indexes.length);
indexes.forEach(idx => {
  print("   • " + JSON.stringify(idx.key));
});

print("");
print("⏳ Création des index de filtrage...");

try {
  print("   • Index sur 'countries'...");
  collection.createIndex({ countries: 1 });
  print("     ✅ Créé");
} catch(e) {
  print("     ⚠️  Existe déjà");
}

try {
  print("   • Index sur 'allergens_from_ingredients'...");
  collection.createIndex({ allergens_from_ingredients: 1 });
  print("     ✅ Créé");
} catch(e) {
  print("     ⚠️  Existe déjà");
}

try {
  print("   • Index sur 'product_name' (recherche)...");
  collection.createIndex({ product_name: 1 });
  print("     ✅ Créé");
} catch(e) {
  print("     ⚠️  Existe déjà");
}

try {
  print("   • Index sur 'nutriscore_grade' (tri)...");
  collection.createIndex({ nutriscore_grade: 1 });
  print("     ✅ Créé");
} catch(e) {
  print("     ⚠️  Existe déjà");
}

print("");
print("📊 Index créés:");
const newIndexes = collection.getIndexes();
newIndexes.forEach(idx => {
  print("   • " + JSON.stringify(idx.key));
});

print("");
print("✅ Création des index terminée!");
MONGODB_INDEX

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✨ Les filtres par pays/allergens seront maintenant beaucoup plus rapides!"
echo "════════════════════════════════════════════════════════════════════════════════"
