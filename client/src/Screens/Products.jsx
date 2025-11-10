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

function Products() {
  const navigate = useNavigate();
  const [sort, setSort] = useState("nutriscore_score_asc");
  const [filter, setFilter] = useState(false);
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
    async (fromPreload = false) => {
      if (loading || !hasMore) return;

      setLoading(true);
      try {
        let data;

        if (fromPreload && preloadedPages.current.has(page)) {
          data = preloadedPages.current.get(page);
          preloadedPages.current.delete(page);
        } else {
          if (activeSearch.trim()) {
            data = await getProductsSearched(activeSearch, page, 100, filter);
          } else {
            data = await getProductsByIndex(sort, page, 100, filter);
          }
        }

        const arr = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];

        if (arr.length === 0) {
          setHasMore(false);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id ?? p.id));
            const newProducts = arr.filter((p) => {
              const id = p._id ?? p.id;
              return !existingIds.has(id);
            });
            return [...prev, ...newProducts];
          });
          setPage((prev) => prev + 1);

          for (let next = page + 1; next <= page + 2; next++) {
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
    preloadedPages.current.clear();
    setImages({});
  }, [sort, activeSearch, filter]);

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
                  {filter && ` (compatible)`}
                  {activeSearch && ` pour "${activeSearch}"`}
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
                const code = product.code ?? product._id ?? product.id;
                const name = product.product_name ?? product.name ?? "—";
                const nutri =
                  product.nutriscore_score ?? product.nutriscore ?? "—";
                const compatibility =
                  product.compatibility ?? product.compatibility_score ?? 0;
                const isFavorite = favorites.has(code);

                const imageUrl = getLocalImage(code);

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

                    <div className="compatibility">
                      Compatible à {compatibility}%
                    </div>

                    <div className="product-image-container">
                      <img
                        src={imageUrl}
                        alt={name}
                        className="product-image visible"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = DEFAULT_IMAGE;
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
