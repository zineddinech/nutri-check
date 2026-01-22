/**
 * Service de cache pour les images de produits
 * - Stockage en mémoire pour les performances
 * - Stockage localStorage pour la persistance entre sessions
 * - Gestion des produits sans image
 */

const CACHE_KEY = "nutri_check_image_cache";
const NO_IMAGE_KEY = "nutri_check_no_image_products";
const MEMORY_CACHE = new Map();
const NO_IMAGE_CACHE = new Set();
const MAX_MEMORY_ITEMS = 500; // Limiter la mémoire
const MAX_NO_IMAGE_ITEMS = 500; // Limiter les produits sans image
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 jours en ms

class ImageCache {
  /**
   * Récupère l'URL d'une image en cache
   * @param {string} key - Clé unique (code produit)
   * @returns {string|null} URL de l'image ou null
   */
  static getImage(key) {
    // 1. Vérifier si le produit est marqué comme "sans image"
    if (this.hasNoImage(key)) {
      return null;
    }

    // 2. Vérifier le cache mémoire d'abord (plus rapide)
    if (MEMORY_CACHE.has(key)) {
      const cachedData = MEMORY_CACHE.get(key);
      if (this._isValid(cachedData)) {
        return cachedData.url;
      } else {
        MEMORY_CACHE.delete(key);
      }
    }

    // 3. Vérifier localStorage
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const cache = JSON.parse(stored);
        if (cache[key] && this._isValid(cache[key])) {
          const cachedData = cache[key];
          // Remettre en cache mémoire
          this._setMemoryCache(key, cachedData.url, cachedData.timestamp);
          return cachedData.url;
        }
      }
    } catch (e) {
      console.warn("Erreur lecture cache localStorage:", e);
    }

    return null;
  }

  /**
   * Sauvegarde l'URL d'une image en cache
   * @param {string} key - Clé unique (code produit)
   * @param {string} url - URL de l'image
   */
  static setImage(key, url) {
    if (!key || !url) return;

    const timestamp = Date.now();

    // Retirer de la liste "pas d'image" si elle y était
    this._removeFromNoImageCache(key);

    // Ajouter au cache mémoire
    this._setMemoryCache(key, url, timestamp);

    // Ajouter au localStorage
    try {
      let cache = {};
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        cache = JSON.parse(stored);
      }

      cache[key] = { url, timestamp };

      // Garder que les 1000 entrées les plus récentes pour éviter saturation
      if (Object.keys(cache).length > 1000) {
        const sorted = Object.entries(cache)
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 1000);
        cache = Object.fromEntries(sorted);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Erreur écriture cache localStorage:", e);
    }
  }

  /**
   * Marque un produit comme n'ayant pas d'image
   * @param {string} key - Clé unique (code produit)
   */
  static setNoImage(key) {
    if (!key) return;

    // Ajouter au cache mémoire
    NO_IMAGE_CACHE.add(key);

    // Sauvegarder en localStorage
    try {
      let noImageList = [];
      const stored = localStorage.getItem(NO_IMAGE_KEY);
      if (stored) {
        noImageList = JSON.parse(stored);
      }

      if (!noImageList.includes(key)) {
        noImageList.push(key);
      }

      // Limiter à MAX_NO_IMAGE_ITEMS pour éviter saturation
      if (noImageList.length > MAX_NO_IMAGE_ITEMS) {
        noImageList = noImageList.slice(-MAX_NO_IMAGE_ITEMS);
      }

      localStorage.setItem(NO_IMAGE_KEY, JSON.stringify(noImageList));
    } catch (e) {
      console.warn("Erreur écriture cache sans image:", e);
    }
  }

  /**
   * Vérifie si un produit est marqué comme sans image
   * @param {string} key - Clé unique (code produit)
   * @returns {boolean}
   */
  static hasNoImage(key) {
    if (!key) return false;

    // Vérifier le cache mémoire d'abord
    if (NO_IMAGE_CACHE.has(key)) {
      return true;
    }

    // Vérifier localStorage
    try {
      const stored = localStorage.getItem(NO_IMAGE_KEY);
      if (stored) {
        const noImageList = JSON.parse(stored);
        if (noImageList.includes(key)) {
          NO_IMAGE_CACHE.add(key); // Ajouter au cache mémoire
          return true;
        }
      }
    } catch (e) {
      console.warn("Erreur lecture cache sans image:", e);
    }

    return false;
  }

  /**
   * Retire un produit de la liste "pas d'image"
   */
  static _removeFromNoImageCache(key) {
    NO_IMAGE_CACHE.delete(key);

    try {
      let noImageList = [];
      const stored = localStorage.getItem(NO_IMAGE_KEY);
      if (stored) {
        noImageList = JSON.parse(stored);
        noImageList = noImageList.filter((k) => k !== key);
        localStorage.setItem(NO_IMAGE_KEY, JSON.stringify(noImageList));
      }
    } catch (e) {
      console.warn("Erreur suppression du cache sans image:", e);
    }
  }

  /**
   * Ajoute au cache mémoire avec limite de taille
   */
  static _setMemoryCache(key, url, timestamp) {
    // Si on dépasse la limite, supprimer l'item le plus ancien
    if (MEMORY_CACHE.size >= MAX_MEMORY_ITEMS) {
      const firstKey = MEMORY_CACHE.keys().next().value;
      MEMORY_CACHE.delete(firstKey);
    }
    MEMORY_CACHE.set(key, { url, timestamp });
  }

  /**
   * Vérifie si une entrée cache est valide (pas expirée)
   */
  static _isValid(cachedData) {
    if (!cachedData || !cachedData.timestamp) return false;
    return Date.now() - cachedData.timestamp < CACHE_EXPIRY;
  }

  /**
   * Vide tout le cache
   */
  static clearAll() {
    MEMORY_CACHE.clear();
    NO_IMAGE_CACHE.clear();
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(NO_IMAGE_KEY);
    } catch (e) {
      console.warn("Erreur suppression cache:", e);
    }
  }

  /**
   * Retourne les stats du cache
   */
  static getStats() {
    return {
      memoryItems: MEMORY_CACHE.size,
      maxMemoryItems: MAX_MEMORY_ITEMS,
      noImageProducts: NO_IMAGE_CACHE.size,
      maxNoImageProducts: MAX_NO_IMAGE_ITEMS,
      localStorageSize: this._getLocalStorageSize(),
    };
  }

  /**
   * Estime la taille du cache localStorage
   */
  static _getLocalStorageSize() {
    try {
      const imageCache = localStorage.getItem(CACHE_KEY) || "";
      const noImageCache = localStorage.getItem(NO_IMAGE_KEY) || "";
      const total = ((imageCache.length + noImageCache.length) / 1024).toFixed(
        2,
      );
      return total + " KB";
    } catch (e) {
      return "N/A";
    }
  }
}

export default ImageCache;
