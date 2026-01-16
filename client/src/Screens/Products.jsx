import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Products.css";
import "./../styles/Background.css";
import {
  getProductsByIndex,
  getProductsSearched,
} from "../services/productService";
import { getConnectedUser } from "../services/authService";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
} from "../services/favoritesService";

const ImageWithLoader = ({ src, alt, fallbackIcon, productName }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fallbackImage, setFallbackImage] = useState(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);

  const loadImageByName = async () => {
    if (isLoadingFallback || !productName) return;

    setIsLoadingFallback(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          productName
        )}&search_simple=1&action=process&json=1&page_size=1`
      );

      if (!response.ok) throw new Error("Image non disponible");

      const data = await response.json();
      const img =
        data?.products?.[0]?.image_front_url ||
        data?.products?.[0]?.image_url ||
        null;

      if (img) {
        setFallbackImage(img);
      }
    } catch {
      // Silencieux - utiliser le placeholder
    } finally {
      setIsLoadingFallback(false);
    }
  };

  if (!src && !fallbackImage) {
    return (
      <div className="no-image-placeholder">
        <span className="no-image-icon">📷</span>
        <span>Pas d'image</span>
      </div>
    );
  }

  if (hasError && !fallbackImage) {
    // Essayer de charger l'image depuis OpenFoodFacts
    if (!isLoadingFallback) {
      loadImageByName();
    }
  }

  const currentSrc = fallbackImage || src;

  if (hasError && !fallbackImage) {
    return (
      <div className="no-image-placeholder">
        <span className="no-image-icon">📷</span>
        <span>Pas d'image</span>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && <div className="image-skeleton"></div>}

      <img
        src={currentSrc}
        alt={alt}
        className={`product-image ${isLoaded ? "visible" : ""}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </>
  );
};

function Products() {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState("product_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filter, setFilter] = useState(false);

  // Construire la valeur sort complète à partir du champ et de l'ordre
  const sort = `${sortField}_${sortOrder}`;
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  const observerRef = useRef();
  const loadingRef = useRef(null);
  const preloadedPages = useRef(new Map());
  const loadingStateRef = useRef(loading);
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);

  const DEFAULT_IMAGE =
    "https://via.placeholder.com/150/e0e0e0/757575?text=Produit";

  const API_BASE = "http://localhost:8000";
  const getLocalImage = (code) => `${API_BASE}/images/${code}.jpg`;

  /** ----------- Charger l'utilisateur et ses favoris ----------- */
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        const user = await getConnectedUser();
        setCurrentUser(user);

        if (user?._id) {
          const userFavs = await getUserFavorites(user._id);
          const favSet = new Set(userFavs.map((fav) => fav.product_id));
          setFavorites(favSet);
        }
      } catch (error) {
        console.error("Erreur chargement utilisateur/favoris:", error);
      }
    };

    loadUserAndFavorites();
  }, []);

  /** ----------- Toggle favori ----------- */
  const handleToggleFavorite = async (e, productId) => {
    e.stopPropagation(); // Empêcher navigation vers détail

    if (!currentUser?._id) {
      alert("Vous devez être connecté pour ajouter des favoris");
      return;
    }

    try {
      if (favorites.has(productId)) {
        await removeFavorite(currentUser._id, productId);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        await addFavorite(currentUser._id, productId);
        setFavorites((prev) => new Set(prev).add(productId));
      }
    } catch (error) {
      console.error("Erreur toggle favori:", error);
      alert("Erreur lors de la modification du favori");
    }
  };

  /** ----------- Chargement de produits (avec préchargement) ----------- */
  const loadMoreProducts = useCallback(
    async (fromPreload = false, reset = false, pageToLoad = null) => {
      if (loadingStateRef.current || !hasMoreRef.current) return;

      const targetPage = pageToLoad ?? pageRef.current;

      setLoading(true);
      loadingStateRef.current = true;
      try {
        let data;

        if (fromPreload && preloadedPages.current.has(targetPage)) {
          data = preloadedPages.current.get(targetPage);
          preloadedPages.current.delete(targetPage);
        } else {
          if (activeSearch.trim()) {
            data = await getProductsSearched(
              activeSearch,
              targetPage,
              100,
              filter
            );
          } else {
            data = await getProductsByIndex(sort, targetPage, 100, filter);
          }
        }

        const arr = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];

        if (arr.length === 0) {
          setHasMore(false);
          hasMoreRef.current = false;
          if (reset) {
            setProducts([]);
          }
        } else {
          if (reset) {
            const normalized = arr.map((p) => p);
            setProducts(normalized);
            setPage(targetPage + 1);
            pageRef.current = targetPage + 1;
          } else {
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p._id ?? p.id));
              const newProducts = arr.filter((p) => {
                const id = p._id ?? p.id;
                return !existingIds.has(id);
              });
              return [...prev, ...newProducts];
            });
            const newPage = pageRef.current + 1;
            setPage(newPage);
            pageRef.current = newPage;
          }

          for (let next = targetPage + 1; next <= targetPage + 2; next++) {
            if (!preloadedPages.current.has(next)) {
              (async () => {
                try {
                  const nextData = activeSearch.trim()
                    ? await getProductsSearched(activeSearch, next, 100, filter)
                    : await getProductsByIndex(sort, next, 100, filter);
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
        hasMoreRef.current = false;
      } finally {
        setLoading(false);
        loadingStateRef.current = false;
      }
    },
    [activeSearch, sortField, sortOrder, filter]
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
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    preloadedPages.current.clear();
    loadMoreProducts(false, true, 1);
  }, [sort, activeSearch, filter, loadMoreProducts]);

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
  const sortedProducts = [...products]
    // Filtrer les produits sans nutriscore si on trie par nutriscore
    .filter((p) => {
      if (sortField.includes("nutriscore")) {
        const v = p.nutriscore_score ?? p.nutriscore;
        const n = Number(v);
        return Number.isFinite(n);
      }
      return true;
    })
    .sort((a, b) => {
      const getName = (p) => (p.product_name ?? p.name ?? "").toString();
      const getNutriNumber = (p) => {
        const v = p.nutriscore_score ?? p.nutriscore;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      let comparison = 0;

      if (
        sortField.includes("nutriscore") ||
        sortField.includes("product_name")
      ) {
        if (sortField.includes("nutriscore")) {
          const na = getNutriNumber(a);
          const nb = getNutriNumber(b);
          if (na === null && nb === null) {
            comparison = getName(a).localeCompare(getName(b));
          } else if (na === null) {
            comparison = 1;
          } else if (nb === null) {
            comparison = -1;
          } else {
            comparison = na - nb;
          }
        } else if (sortField.includes("product_name")) {
          comparison = getName(a).localeCompare(getName(b));
        }
      } else {
        // Pour les autres champs (added, updated), tri par nom par défaut
        comparison = getName(a).localeCompare(getName(b));
      }

      // Inverser si descending
      return sortOrder === "desc" ? -comparison : comparison;
    });

  const displayedProducts = sortedProducts;

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
              Filtrer selon profil
            </label>

            <div className="product-count">
              {loading && products.length === 0 ? (
                <span>Chargement...</span>
              ) : (
                <>
                  <strong>{displayedProducts.length}</strong>
                  {displayedProducts.length > 1 ? " produits" : " produit"}
                  {filter}
                </>
              )}
            </div>
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
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="sort-select"
            >
              <option value="nutriscore_score">Nutri-Score</option>
              <option value="product_name">Nom du produit</option>
              <option value="added">Date ajout</option>
              <option value="updated">Date modification</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="sort-direction-button"
              title={sortOrder === "asc" ? "Ascendant" : "Descendant"}
            >
              {sortOrder === "asc" ? "↑ Ascendant" : "↓ Descendant"}
            </button>
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
                const code = product.code ?? product._id ?? product.id;
                const name = product.product_name ?? product.name ?? "—";
                const rawNutri =
                  product.nutrition_grade_fr ?? product.nutriscore_score;

                const nutri =
                  !rawNutri ||
                  rawNutri === "unknown" ||
                  rawNutri === "not-applicable"
                    ? "—"
                    : rawNutri;
                const compatibility =
                  product.compatibility ?? product.compatibility_score ?? 0;
                const isFavorite = favorites.has(code);

                const imageUrl = code ? getLocalImage(code) : null;

                return (
                  <div
                    className="product-card"
                    key={code}
                    onClick={() => handleProductClick(code)}
                    style={{ cursor: "pointer" }}
                  >
                    <button
                      className={`favorite-button ${
                        isFavorite ? "favorite-active" : ""
                      }`}
                      onClick={(e) => handleToggleFavorite(e, code)}
                    >
                      {isFavorite ? "❤️" : "🤍"}
                    </button>

                    <div className="compatibility">Nutriscore {nutri}</div>

                    <div className="product-image-container">
                      <ImageWithLoader
                        src={imageUrl}
                        alt={name}
                        productName={name}
                      />
                    </div>

                    <div className="product-title">{name}</div>
                    <div className="nutriscore">Favorites: 10 fois</div>
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
