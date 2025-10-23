import React, { useState, useEffect, useCallback, useRef } from "react";
import "./../Screens_CSS/Products.css";
import "./../Screens_CSS/Background.css";
import {
  getProductsByIndex,
  getProductsSearched,
} from "../services/productService";

function Products() {
  const [sort, setSort] = useState("nutriscore_score_asc");
  const [filter, setFilter] = useState(false);
  const [images, setImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const abortControllersRef = useRef({});

  // Récupérer les produits depuis l'API (pagination côté serveur)
  useEffect(() => {
    async function load() {
      try {
        let data;
        if (activeSearch.trim()) {
          data = await getProductsSearched(activeSearch, page, 10);
        } else {
          data = await getProductsByIndex(sort, page);
        }

        const arr = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];
        setProducts(arr);
      } catch {
        setProducts([]);
      }
    }
    load();
  }, [sort, page, activeSearch]);

  // Fonction pour charger une image - une seule tentative
  const loadImage = useCallback(
    async (id, name) => {
      if (!id || !name || images[id] || loadingImages[id]) return;

      setLoadingImages((prev) => ({ ...prev, [id]: true }));

      // Créer un AbortController pour cette requête
      const controller = new AbortController();
      abortControllersRef.current[id] = controller;

      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            name
          )}&search_simple=1&action=process&json=1&page_size=1`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Vérifier si une image a été trouvée
        const img =
          data?.products?.[0]?.image_front_url ||
          data?.products?.[0]?.image_url ||
          "";

        if (img) {
          // Image trouvée
          setImages((prev) => ({ ...prev, [id]: img }));
        } else {
          // Pas d'image trouvée - utiliser le placeholder immédiatement
          console.warn(`No image found for ${name}`);
          setImages((prev) => ({ ...prev, [id]: "" }));
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.warn(`Image loading aborted for ${name}`);
        } else {
          console.warn(`Failed to load image for ${name}:`, error.message);
        }
        // En cas d'erreur, utiliser le placeholder
        setImages((prev) => ({ ...prev, [id]: "" }));
      } finally {
        setLoadingImages((prev) => ({ ...prev, [id]: false }));
        delete abortControllersRef.current[id];
      }
    },
    [images, loadingImages]
  );

  // Charger les images par batch avec délai pour éviter la surcharge
  useEffect(() => {
    const loadImagesSequentially = async () => {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const id = product._id ?? product.id;
        const name = product.product_name ?? product.name ?? "";

        if (id && name && !images[id] && !loadingImages[id]) {
          await loadImage(id, name);
          // Petit délai entre chaque requête pour éviter le rate limiting
          if (i < products.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
    };

    if (products.length > 0) {
      loadImagesSequentially();
    }
  }, [products, loadImage, images, loadingImages]);

  // Réinitialiser les images et annuler les requêtes en cours quand on change de page
  useEffect(() => {
    // Annuler toutes les requêtes en cours
    Object.values(abortControllersRef.current).forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current = {};

    setImages({});
    setLoadingImages({});
  }, [page, activeSearch]);

  // Cleanup: annuler toutes les requêtes lors du démontage du composant
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) => {
        controller.abort();
      });
    };
  }, []);

  // Gérer la recherche
  const handleSearch = () => {
    setActiveSearch(searchTerm);
    setPage(1);
  };

  // Réinitialiser la recherche
  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearch("");
    setPage(1);
  };

  // Gérer la touche "Entrée" dans le champ de recherche
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Tri robuste
  const sortedProducts = [...products].sort((a, b) => {
    const getName = (p) => (p.product_name ?? p.name ?? "").toString();
    const getNutriNumber = (p) => {
      const v = p.nutriscore_score ?? p.nutriscore;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const getDate = (
      p,
      keyCandidates = ["addedAt", "added_at", "createdAt"]
    ) => {
      for (const k of keyCandidates) if (p[k]) return new Date(p[k]);
      return null;
    };

    if (sort.includes("nutriscore")) {
      const na = getNutriNumber(a);
      const nb = getNutriNumber(b);
      if (na === null && nb === null)
        return getName(a).localeCompare(getName(b));
      if (na === null) return 1;
      if (nb === null) return -1;
      return na - nb;
    }

    if (sort === "added") {
      const da = getDate(a, ["addedAt", "added_at", "createdAt"]);
      const db = getDate(b, ["addedAt", "added_at", "createdAt"]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    }

    if (sort === "updated") {
      const da = getDate(a, ["updatedAt", "updated_at"]);
      const db = getDate(b, ["updatedAt", "updated_at"]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    }

    return getName(a).localeCompare(getName(b));
  });

  // Filtrage sécurisé
  const displayedProducts = filter
    ? sortedProducts.filter((p) => {
        const comp = p.compatibility ?? p.compatibility_score ?? 0;
        return Number(comp) >= 50;
      })
    : sortedProducts;

  return (
    <div className="background">
      <div className="products-container">
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__text">Aucun produit disponible</div>
          </div>
        ) : (
          <>
            <div className="products-toolbar">
              <div className="toolbar-left">
                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={filter}
                    onChange={() => setFilter((s) => !s)}
                    className="filter-checkbox"
                  />
                  Trier les produits selon mes restrictions
                </label>
              </div>
              {/* Barre de recherche */}
              <div className="search-bar">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Rechercher un produit..."
                  className="search-input"
                />
                <button onClick={handleSearch} className="search-button">
                  Rechercher
                </button>
                {activeSearch && (
                  <button onClick={handleClearSearch} className="clear-button">
                    ✕ Effacer
                  </button>
                )}
              </div>
              <div className="toolbar-right">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="sort-select"
                >
                  <option value="nutriscore_score_asc">
                    Produits avec meilleur Nutri-Score
                  </option>
                  <option value="added">Produits récemment ajoutés</option>
                  <option value="updated">Produits récemment modifiés</option>
                </select>
              </div>
            </div>

            <div className="products-main">
              {displayedProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__text">
                    Aucun produit disponible
                  </div>
                </div>
              ) : (
                <div className="products-grid">
                  {displayedProducts.map((product) => {
                    const id =
                      product._id ??
                      product.id ??
                      Math.random().toString(36).slice(2);
                    const name = product.product_name ?? product.name ?? "—";
                    const nutri =
                      product.nutriscore_score ?? product.nutriscore ?? "—";
                    const imageUrl =
                      images[id] ??
                      product.image ??
                      "https://via.placeholder.com/150";
                    const isLoadingImage = loadingImages[id];

                    return (
                      <div className="product-card" key={id}>
                        <div className="compatibility">
                          Compatible à{" "}
                          {product.compatibility ??
                            product.compatibility_score ??
                            "—"}
                          %
                        </div>
                        <div className="product-image-container">
                          {isLoadingImage && (
                            <div className="image-loader">Chargement...</div>
                          )}
                          <img
                            src={imageUrl}
                            alt={name}
                            className={`product-image ${
                              isLoadingImage ? "loading" : ""
                            }`}
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/150";
                            }}
                          />
                        </div>
                        <div className="product-title">{name}</div>
                        <div className="nutriscore">Nutri-Score: {nutri}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <button
        className="page-arrow page-arrow-prev"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        aria-label="Page précédente"
        title="Page précédente"
      >
        {"<"}
      </button>

      <button
        className="page-arrow page-arrow-next"
        onClick={() => setPage((p) => p + 1)}
        aria-label="Page suivante"
        title="Page suivante"
      >
        {">"}
      </button>
    </div>
  );
}

export default Products;
