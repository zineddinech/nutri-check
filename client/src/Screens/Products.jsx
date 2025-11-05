import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./../Screens_CSS/Products.css";
import "./../Screens_CSS/Background.css";
import {
  getProductsByIndex,
  getProductsSearched,
} from "../services/productService";

function Products() {
  const navigate = useNavigate(); // Hook ajouté ici au début du composant
  const [sort, setSort] = useState("nutriscore_score_asc");
  const [filter, setFilter] = useState(false);
  const [images, setImages] = useState({});
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef();
  const loadingRef = useRef(null);
  const imageCache = useRef(new Map());
  const preloadedPages = useRef(new Map());

  /** ----------- Chargement des images avec cache ----------- */
  const loadImage = useCallback(async (id, name) => {
    if (imageCache.current.has(id)) {
      setImages((prev) => ({ ...prev, [id]: imageCache.current.get(id) }));
      return;
    }

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          name
        )}&search_simple=1&action=process&json=1&page_size=1`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const img =
        data?.products?.[0]?.image_front_url ||
        data?.products?.[0]?.image_url ||
        "https://via.placeholder.com/150";

      imageCache.current.set(id, img);
      setImages((prev) => ({ ...prev, [id]: img }));
    } catch (error) {
      const placeholder = "https://via.placeholder.com/150";
      imageCache.current.set(id, placeholder);
      setImages((prev) => ({ ...prev, [id]: placeholder }));
    }
  }, []);

  /** ----------- Chargement batch d'images ----------- */
  useEffect(() => {
    const loadImagesInBatch = async () => {
      const batchSize = 5;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await Promise.all(
          batch.map((product) => {
            const id = product._id ?? product.id;
            const name = product.product_name ?? product.name ?? "";
            if (id && name && !imageCache.current.has(id)) {
              return loadImage(id, name);
            }
            return Promise.resolve();
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    };

    if (products.length > 0) loadImagesInBatch();
  }, [products, loadImage]);

  /** ----------- Chargement de produits (avec préchargement) ----------- */
  const loadMoreProducts = useCallback(
    async (fromPreload = false) => {
      if (loading || !hasMore) return;

      setLoading(true);
      try {
        let data;

        // Utiliser une page préchargée si dispo
        if (fromPreload && preloadedPages.current.has(page)) {
          data = preloadedPages.current.get(page);
          preloadedPages.current.delete(page);
        } else {
          if (activeSearch.trim()) {
            data = await getProductsSearched(activeSearch, page, 100);
          } else {
            data = await getProductsByIndex(sort, page, 100);
          }
        }

        const arr = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];

        if (arr.length === 0) {
          setHasMore(false);
        } else {
          // Éviter les doublons
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id ?? p.id));
            const newProducts = arr.filter((p) => {
              const id = p._id ?? p.id;
              return !existingIds.has(id);
            });
            return [...prev, ...newProducts];
          });
          setPage((prev) => prev + 1);

          // Précharger les 2 pages suivantes
          for (let next = page + 1; next <= page + 2; next++) {
            if (!preloadedPages.current.has(next)) {
              (async () => {
                try {
                  const nextData = activeSearch.trim()
                    ? await getProductsSearched(activeSearch, next, 100)
                    : await getProductsByIndex(sort, next, 100);
                  preloadedPages.current.set(next, nextData);
                } catch {
                  /* silencieux */
                }
              })();
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, activeSearch, page, sort]
  );

  /** ----------- Scroll infini ----------- */
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMoreProducts(true);
      }
    }, options);

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMoreProducts, hasMore, loading]);

  /** ----------- Réinitialisation quand tri/recherche change ----------- */
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    imageCache.current.clear();
    preloadedPages.current.clear();
    setImages({});
  }, [sort, activeSearch]);

  /** ----------- Premier chargement ----------- */
  useEffect(() => {
    if (products.length === 0 && hasMore) {
      loadMoreProducts();
    }
  }, [products.length, hasMore, loadMoreProducts]);

  /** ----------- Gestion recherche ----------- */
  const handleSearch = () => {
    if (searchTerm.trim() !== activeSearch) {
      setActiveSearch(searchTerm.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearch("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  /** ----------- Navigation vers détail produit ----------- */
  const handleProductClick = (productId) => {
    navigate(`/produits/${productId}`);
  };

  /** ----------- Tri et filtrage ----------- */
  const sortedProducts = [...products].sort((a, b) => {
    const getName = (p) => (p.product_name ?? p.name ?? "").toString();
    const getNutriNumber = (p) => {
      const v = p.nutriscore_score ?? p.nutriscore;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
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

    return getName(a).localeCompare(getName(b));
  });

  const displayedProducts = filter
    ? sortedProducts.filter((p) => {
        const comp = p.compatibility ?? p.compatibility_score ?? 0;
        return Number(comp) >= 50;
      })
    : sortedProducts;

  /** ----------- Rendu JSX ----------- */
  return (
    <div className="background">
      <div className="products-container">
        <div className="products-toolbar">
          <div className="toolbar-left">
            <label className="filter-label">
              <input
                type="checkbox"
                checked={filter}
                onChange={() => setFilter((s) => !s)}
                className="filter-checkbox"
              />
              Filtrer par compatibilité
            </label>
          </div>

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
              🔍 Rechercher
            </button>
            {activeSearch && (
              <button onClick={handleClearSearch} className="clear-button">
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-right">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="sort-select"
            >
              <option value="nutriscore_score_asc">Meilleur Nutri-Score</option>
              <option value="added">Récemment ajoutés</option>
              <option value="updated">Récemment modifiés</option>
            </select>
          </div>
        </div>

        <div className="products-main">
          {displayedProducts.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-state__text">
                {activeSearch
                  ? `Aucun résultat pour "${activeSearch}"`
                  : "Aucun produit disponible"}
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
                const imageUrl = images[id];
                const compatibility =
                  product.compatibility ?? product.compatibility_score ?? 0;

                return (
                  <div
                    className="product-card"
                    key={id}
                    onClick={() => handleProductClick(id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="compatibility">
                      Compatible à {compatibility}%
                    </div>
                    <div className="product-image-container">
                      {!imageUrl ? (
                        <div className="image-skeleton"></div>
                      ) : (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="product-image visible"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      )}
                    </div>
                    <div className="product-title">{name}</div>
                    <div className="nutriscore">Nutri-Score: {nutri}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={loadingRef} className="loading-sentinel">
            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Chargement...</p>
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <div className="end-message">
                Tous les produits ont été chargés
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Products;
