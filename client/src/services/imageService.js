/**
 * Service pour construire les URLs des images Open Food Facts
 * Basé sur la documentation: https://world.openfoodfacts.org/
 */

const BASE_URL = "https://images.openfoodfacts.org/images/products";

/**
 * Construit le chemin du dossier produit à partir du code-barres
 * Format: 343/566/076/8163 pour le code 3435660768163
 *
 * @param {string} barcode - Le code-barres du produit
 * @returns {string} - Le chemin du dossier formaté
 */
function getFolderPath(barcode) {
  if (!barcode) return null;

  // Convertir en string et padder avec des 0 si moins de 13 chiffres
  let code = String(barcode).padStart(13, "0");

  // Utiliser la regex pour splitter en 4 groupes: 3/3/3/reste
  const match = code.match(/^(...)(...)(...)(.*)$/);
  if (!match) return null;

  return `${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
}

/**
 * Obtient l'URL d'une image brute (raw) du produit
 *
 * @param {string} barcode - Le code-barres du produit
 * @param {string|number} imageId - L'ID de l'image (numérique)
 * @param {string} resolution - La résolution: "full", "400", "200", "100" (défaut: "400")
 * @returns {string|null} - L'URL complète de l'image ou null
 */
export function getRawImageUrl(barcode, imageId, resolution = "400") {
  const folderPath = getFolderPath(barcode);
  if (!folderPath) return null;

  const resolutionSuffix = resolution === "full" ? "" : `.${resolution}`;
  const filename = `${imageId}${resolutionSuffix}.jpg`;

  return `${BASE_URL}/${folderPath}/${filename}`;
}

/**
 * Obtient l'URL d'une image sélectionnée (front, ingredients, nutrition, packaging)
 *
 * @param {string} barcode - Le code-barres du produit
 * @param {string} imageName - Le nom de l'image (ex: "front_fr", "ingredients_en")
 * @param {string|number} revision - Le numéro de révision
 * @param {string} resolution - La résolution: "full", "400", "200", "100" (défaut: "400")
 * @returns {string|null} - L'URL complète de l'image ou null
 */
export function getSelectedImageUrl(
  barcode,
  imageName,
  revision,
  resolution = "400"
) {
  const folderPath = getFolderPath(barcode);
  if (!folderPath) return null;

  const filename = `${imageName}.${revision}.${resolution}.jpg`;
  return `${BASE_URL}/${folderPath}/${filename}`;
}

/**
 * Extrait l'URL de la meilleure image disponible à partir des données du produit
 * Essaie d'abord les images sélectionnées (front, ingredients), puis les images brutes
 *
 * @param {object} productData - Les données du produit depuis l'API
 * @param {string} imageType - Le type d'image: "front", "ingredients", "nutrition", "packaging" (défaut: "front")
 * @param {string} language - Le code langue ISO (défaut: "fr")
 * @param {string} resolution - La résolution souhaitée: "full", "400", "200", "100" (défaut: "400")
 * @returns {string|null} - L'URL de l'image ou null si non disponible
 */
export function getImageUrl(
  productData,
  imageType = "front",
  language = "fr",
  resolution = "400"
) {
  if (!productData || !productData.code || !productData.images) {
    return null;
  }

  const barcode = productData.code;
  const images = productData.images;

  // Chercher d'abord l'image sélectionnée avec la langue
  const selectedImageKey = `${imageType}_${language}`;
  if (images[selectedImageKey]) {
    const imageData = images[selectedImageKey];
    if (imageData.rev && imageData.imgid) {
      return getSelectedImageUrl(
        barcode,
        selectedImageKey,
        imageData.rev,
        resolution
      );
    }
  }

  // Essayer l'image sélectionnée sans langue spécifique
  if (images[imageType]) {
    const imageData = images[imageType];
    if (imageData.rev && imageData.imgid) {
      return getSelectedImageUrl(barcode, imageType, imageData.rev, resolution);
    }
  }

  // Sinon, chercher la première image brute disponible
  for (const key in images) {
    if (/^\d+$/.test(key)) {
      // C'est une image brute (clé numérique)
      return getRawImageUrl(barcode, key, resolution);
    }
  }

  return null;
}

/**
 * Extrait toutes les images disponibles du produit avec leurs URLs
 * Idéal pour un carousel ou galerie d'images
 *
 * @param {object} productData - Les données du produit depuis l'API
 * @param {string} resolution - La résolution souhaitée (défaut: "400")
 * @returns {array} - Tableau des images disponibles avec leurs URLs
 */
export function getAllImageUrls(productData, resolution = "400") {
  if (!productData || !productData.code || !productData.images) {
    return [];
  }

  const barcode = productData.code;
  const images = productData.images;
  const imageUrls = [];

  // D'abord ajouter les images sélectionnées (front, ingredients, nutrition, packaging)
  const selectedImageTypes = ["front", "ingredients", "nutrition", "packaging"];
  const languages = ["fr", "en", "es", "de", "it"];

  for (const imageType of selectedImageTypes) {
    for (const lang of languages) {
      const key = `${imageType}_${lang}`;
      if (images[key]) {
        const imageData = images[key];
        if (imageData.rev && imageData.imgid) {
          const url = getSelectedImageUrl(
            barcode,
            key,
            imageData.rev,
            resolution
          );
          if (url) {
            imageUrls.push({
              type: imageType,
              language: lang,
              url: url,
              isSelected: true,
            });
          }
        }
      }
    }
  }

  // Ensuite ajouter les images brutes (raw)
  for (const key in images) {
    if (/^\d+$/.test(key)) {
      const url = getRawImageUrl(barcode, key, resolution);
      if (url) {
        imageUrls.push({
          type: "raw",
          id: key,
          url: url,
          isSelected: false,
        });
      }
    }
  }

  return imageUrls;
}

/**
 * Cherche l'image d'un produit depuis Open Food Facts API
 * Utile pour les produits sans données images locales
 *
 * @param {string} barcode - Le code-barres du produit
 * @returns {Promise<string|null>} - L'URL de l'image ou null
 */
export async function fetchImageFromOFF(barcode) {
  if (!barcode) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const product = data.product || {};

    // Essayer les différents champs d'image disponibles
    return (
      product.image_front_url ||
      product.image_front_small_url ||
      product.image_url ||
      null
    );
  } catch (error) {
    console.error(
      `Erreur lors de la recherche d'image pour ${barcode}:`,
      error
    );
    return null;
  }
}

/**
 * Cherche l'image d'un produit par son nom
 * Utile pour les produits sans code-barres
 *
 * @param {string} productName - Le nom du produit
 * @returns {Promise<string|null>} - L'URL de l'image ou null
 */
export async function fetchImageByProductName(productName) {
  if (!productName) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        productName
      )}&search_simple=1&action=process&json=1&page_size=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const product = data?.products?.[0];

    if (!product) return null;

    return product.image_front_url || product.image_url || null;
  } catch (error) {
    console.error(
      `Erreur lors de la recherche d'image pour "${productName}":`,
      error
    );
    return null;
  }
}
