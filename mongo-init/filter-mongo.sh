#!/bin/bash
# Script pour filtrer et normaliser les documents MongoDB

DB_NAME="${1:-nutridb}"
COLLECTION_NAME="${2:-products}"
FILTERED_COLLECTION="products_filtered"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧹 FILTRAGE ET NORMALISATION MONGODB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Paramètres: DB=$DB_NAME, Source=$COLLECTION_NAME → Dest=$FILTERED_COLLECTION"
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
const source = db.products;
const filtered = db.products_filtered;

// Map des allergènes et traductions
const allergenMap = {
  "chicken": "Chicken",
  "pork": "Pork",
  "crustaceans": "Crustaceans",
  "gelatin": "Gelatin",
  "banana": "Banana",
  "eggs": "Eggs",
  "beef": "Beef",
  "milk": "Milk",
  "gluten": "Gluten",
  "fish": "Fish",
  "mustard": "Mustard",
  "peach": "Peach",
  "kiwi": "Kiwi",
  "sesame": "Sesame seeds",
  "soy": "Soybeans",
  "apple": "Apple",
  "molluscs": "Molluscs",
  "nuts": "Nuts",
  "peanuts": "Peanuts",
  "celery": "Celery",
  "sulfites": "Sulphur dioxide and sulphites",
  "orange": "Orange",
  "caviar": "Red caviar",
  "lupin": "Lupin",
  "matsutake": "Matsutake",
  "yamaimo": "Yamaimo"
};

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

// Normaliser les allergènes
function normalizeAllergens(allergenStr) {
  if (!allergenStr || allergenStr.trim() === "") return [];
  
  const raw = allergenStr.toLowerCase();
  const normalized = [];
  const seen = new Set();
  
  // Nettoyer et splitter
  const items = raw.split(/[,;]/).map(s => s.trim()).filter(s => s);
  
  items.forEach(item => {
    // Enlever les préfixes comme "en:" ou "fr:"
    let cleaned = item.replace(/^(en|fr):/i, "").trim();
    
    // Essayer de matcher avec la map
    for (const [key, value] of Object.entries(allergenMap)) {
      if (cleaned.includes(key)) {
        if (!seen.has(value)) {
          normalized.push(value);
          seen.add(value);
        }
        return;
      }
    }
    
    // Si pas de match, garder la version nettoyée (première lettre majuscule)
    if (cleaned && !seen.has(cleaned)) {
      normalized.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
      seen.add(cleaned);
    }
  });
  
  return normalized;
}

// Normaliser les pays
function normalizeCountries(countriesStr) {
  if (!countriesStr || countriesStr.trim() === "") return null;
  
  const cleaned = countriesStr.trim();
  return countriesMap[cleaned] || cleaned;
}

// Nettoyer la collection filtrée
try {
  filtered.drop();
} catch(e) {}

const countBefore = source.countDocuments();
print("   Documents avant: " + countBefore);

// Statistiques de filtrage
let stats = {
  no_product_name: 0,
  no_keywords: 0,
  no_brands: 0,
  no_categories: 0,
  no_nutriments: 0,
  nutriscore_not_applicable: 0,
  total_filtered: 0
};

// Appliquer les filtres
const cursor = source.find();
cursor.forEach(doc => {
  // 1. Virer les produits sans product_name
  if (!doc.product_name || doc.product_name.trim() === "") {
    stats.no_product_name++;
    return;
  }

  // 2. Virer les produits sans _keywords (1%)
  if (!doc._keywords || doc._keywords.length === 0) {
    stats.no_keywords++;
    return;
  }

  // 3. Virer les produits sans brands
  if (!doc.brands || doc.brands.trim() === "") {
    stats.no_brands++;
    return;
  }

  // 4. Virer les produits sans categories
  if (!doc.categories || doc.categories.trim() === "" || doc.categories === "undefined") {
    stats.no_categories++;
    return;
  }

  // 5. Virer les produits sans nutriments
  if (!doc.nutriments || Object.keys(doc.nutriments).length === 0) {
    stats.no_nutriments++;
    return;
  }

  // 6. Garder UNIQUEMENT les produits avec un nutriscore valide (pas "unknown", pas vide)
  if (!doc.nutriscore_grade || doc.nutriscore_grade === "unknown" || doc.nutriscore_grade === "") {
    stats.nutriscore_not_applicable++;
    return;
  }

  // Normaliser les allergènes
  doc.allergens_from_ingredients = normalizeAllergens(doc.allergens_from_ingredients);

  // Normaliser les pays
  if (doc.countries) {
    doc.countries = normalizeCountries(doc.countries);
  }

  // Supprimer les champs non pertinents
  delete doc.ingredients_text;

  // Insérer le document filtré et normalisé
  filtered.insertOne(doc);
  stats.total_filtered++;

  if ((stats.total_filtered % 100000) === 0) {
    print("   ✓ " + stats.total_filtered + " produits filtrés...");
  }
});

// Créer les index
print("   📌 Création des index...");
filtered.createIndex({ code: 1 });
filtered.createIndex({ product_name: 1 });
filtered.createIndex({ brands: 1 });
filtered.createIndex({ categories: 1 });
filtered.createIndex({ nutriscore_grade: 1 });

const countAfter = filtered.countDocuments();
const retention = ((countAfter / countBefore) * 100).toFixed(2);

print("");
print("✅ Filtrage et normalisation complétés!");
print("   Documents avant: " + countBefore);
print("   Documents après: " + countAfter);
print("   Rétention: " + retention + "%");
print("");
print("📊 Raisons de suppression:");
print("   ❌ Sans product_name: " + stats.no_product_name);
print("   ❌ Sans _keywords: " + stats.no_keywords);
print("   ❌ Sans brands: " + stats.no_brands);
print("   ❌ Sans categories: " + stats.no_categories);
print("   ❌ Sans nutriments: " + stats.no_nutriments);
print("   ❌ Nutriscore invalide: " + stats.nutriscore_not_applicable);
print("");
print("✨ Normalisations appliquées:");
print("   ✓ Allergènes normalisés");
print("   ✓ Pays normalisés");
print("   ✓ ingredients_text supprimé");
MONGO_CODE

echo "⏳ Filtrage et normalisation en cours..."
echo ""

docker cp "$TEMP_SCRIPT" nutri_mongo:/tmp/filter.js
docker exec nutri_mongo mongosh "$DB_NAME" /tmp/filter.js

rm "$TEMP_SCRIPT"
docker exec nutri_mongo rm /tmp/filter.js 2>/dev/null

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✨ TERMINÉ"
echo "════════════════════════════════════════════════════════════════════════════════"