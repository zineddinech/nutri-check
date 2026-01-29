import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Products.css";
import "./../styles/Background.css";
import "./../styles/ProductDetailModal.css";
import {
  getProductsByIndex,
  getProductsSearched,
  getProductsSearchedByCategory,
} from "../services/productService";
import { getConnectedUser } from "../services/authService";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  getFavoriteCount,
} from "../services/favoritesService";
import ImageCache from "../services/imageCache";
import {
  fetchImageFromOFF,
  fetchImageByProductName,
} from "../services/imageService";
import ProductDetailModal from "./ProductDetailModal";

// Fonction pour obtenir la couleur du Nutriscore (couleurs flashy)
const getNutriscoreColor = (grade) => {
  const colors = {
    a: "#00C853", // Vert flashy
    b: "#76FF03", // Vert lime vif
    c: "#FFD600", // Jaune vif
    d: "#FF9100", // Orange vif
    e: "#FF1744", // Rouge vif
  };
  return colors[grade?.toLowerCase()] || "#78909C"; // Gris bleuté par défaut
};

// Fonction pour obtenir la lettre du Nutriscore
const getNutriscoreLetter = (product) => {
  const grade = product.nutrition_grade_fr || product.nutriscore_grade;
  if (grade && ["a", "b", "c", "d", "e"].includes(grade.toLowerCase())) {
    return grade.toUpperCase();
  }
  return "?";
};

// Composant pour afficher le nombre de favoris
const FavoriteCount = ({ productId, isFavorite }) => {
  const [count, setCount] = useState(null);
  const [initialFavorite, setInitialFavorite] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getFavoriteCount(productId)
      .then((data) => {
        if (!cancelled) {
          setCount(data.favorite_count);
          setInitialFavorite(isFavorite);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCount(0);
          setInitialFavorite(isFavorite);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Ajuster le count quand isFavorite change
  useEffect(() => {
    if (count === null || initialFavorite === null) return;

    if (isFavorite && !initialFavorite) {
      setCount((c) => c + 1);
      setInitialFavorite(true);
    } else if (!isFavorite && initialFavorite) {
      setCount((c) => Math.max(0, c - 1));
      setInitialFavorite(false);
    }
  }, [isFavorite]);

  if (count === null) {
    return <div className="favorite-count-display">-</div>;
  }

  return (
    <div className="favorite-count-display">
      <span className="favorite-count-heart">♥</span>
      <span className="favorite-count-number">{count}</span>
    </div>
  );
};

const ImageWithLoader = ({ code, alt, productName }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    setIsLoading(true);
    setHasError(false);
    setImage(null);
    setIsLoaded(false);

    const handleTimeout = () => {
      if (!cancelled && !image) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    const loadImage = async () => {
      // 1. Vérifier le cache d'abord
      if (code) {
        const cachedImg = ImageCache.getImage(code);
        if (cachedImg) {
          if (timeoutId) clearTimeout(timeoutId);
          if (!cancelled) {
            setImage(cachedImg);
            setIsLoading(false);
          }
          return;
        }

        // Vérifier si marqué comme sans image
        if (ImageCache.hasNoImage(code)) {
          if (timeoutId) clearTimeout(timeoutId);
          if (!cancelled) {
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }
      }

      // 2. Charger depuis OFF par code
      if (code) {
        const img = await fetchImageFromOFF(code);
        if (!cancelled) {
          if (img) {
            if (timeoutId) clearTimeout(timeoutId);
            ImageCache.setImage(code, img);
            setHasError(false);
            setImage(img);
            setIsLoading(false);
            return;
          }
        }
      }

      // 3. Fallback: chercher par nom
      if (productName) {
        const img = await fetchImageByProductName(productName);
        if (!cancelled) {
          if (img) {
            if (timeoutId) clearTimeout(timeoutId);
            if (code) ImageCache.setImage(code, img);
            setHasError(false);
            setImage(img);
            setIsLoading(false);
            return;
          }
        }
      }

      // 4. Aucune image trouvée
      if (!cancelled) {
        if (code) ImageCache.setNoImage(code);
        setHasError(true);
        if (timeoutId) clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    if (code || productName) {
      timeoutId = setTimeout(handleTimeout, 5000);
      loadImage();
    } else {
      setHasError(true);
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [code, productName]);

  if (hasError || (!isLoading && !image)) {
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
        src={image}
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
  const [searchByCategory, setSearchByCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const observerRef = useRef();
  const loadingRef = useRef(null);
  const preloadedPages = useRef(new Map());
  const loadingStateRef = useRef(loading);
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);

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
            const searchFn = searchByCategory
              ? getProductsSearchedByCategory
              : getProductsSearched;
            data = await searchFn(activeSearch, targetPage, 100, filter);
          } else {
            data = await getProductsByIndex(sort, targetPage, 100, filter);
          }
        }

        const arr = Array.isArray(data)
          ? data
          : (data?.data ?? data?.items ?? []);

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
                  let nextData;
                  if (activeSearch.trim()) {
                    const searchFn = searchByCategory
                      ? getProductsSearchedByCategory
                      : getProductsSearched;
                    nextData = await searchFn(activeSearch, next, 100, filter);
                  } else {
                    nextData = await getProductsByIndex(
                      sort,
                      next,
                      100,
                      filter,
                    );
                  }
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
    [activeSearch, sortField, sortOrder, filter, searchByCategory],
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
    setIsSearchLoading(true);
    loadMoreProducts(false, true, 1);
  }, [sort, activeSearch, filter, searchByCategory, loadMoreProducts]);

  /** ----------- Premier chargement ----------- */
  useEffect(() => {
    if (products.length === 0 && hasMore) {
      loadMoreProducts();
    }
  }, [products.length, hasMore, loadMoreProducts]);

  /** ----------- Gestion recherche ----------- */
  const handleSearch = async () => {
    if (searchTerm.trim() !== activeSearch) {
      setIsSearchLoading(true);
      setActiveSearch(searchTerm.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearch("");
    setIsSearchLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  /** ----------- Désactiver le loading de recherche quand le chargement est terminé ----------- */
  useEffect(() => {
    if (!loading && isSearchLoading) {
      // Délai court pour montrer le spinner brièvement (200ms min)
      const timer = setTimeout(() => {
        setIsSearchLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, isSearchLoading]);

  /** ----------- Navigation vers détail produit ----------- */
  const handleProductClick = (productId) => {
    setSelectedProductId(productId);
  };

  const handleCloseModal = () => {
    setSelectedProductId(null);
  };

  /** ----------- Tri et filtrage ----------- */
  const sortedProducts = [...products]
    // Filtrer les produits sans nutriscore si on trie par nutriscore
    .filter((p) => {
      if (sortField.includes("nutriscore")) {
        const grade = p.nutrition_grade_fr || p.nutriscore_grade;
        return grade && ["a", "b", "c", "d", "e"].includes(grade.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      const getName = (p) => (p.product_name ?? p.name ?? "").toString();
      const getNutriGrade = (p) => {
        const grade = p.nutrition_grade_fr || p.nutriscore_grade;
        if (grade && ["a", "b", "c", "d", "e"].includes(grade.toLowerCase())) {
          return grade.toLowerCase();
        }
        return null;
      };

      let comparison = 0;

      if (
        sortField.includes("nutriscore") ||
        sortField.includes("product_name")
      ) {
        if (sortField.includes("nutriscore")) {
          const ga = getNutriGrade(a);
          const gb = getNutriGrade(b);
          if (ga === null && gb === null) {
            comparison = getName(a).localeCompare(getName(b));
          } else if (ga === null) {
            comparison = 1;
          } else if (gb === null) {
            comparison = -1;
          } else {
            comparison = ga.localeCompare(gb);
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
                disabled={isSearchLoading}
              />
              Filtrer selon profil
              {isSearchLoading && <span className="mini-spinner"></span>}
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
            <div className="search-bar-row">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Rechercher un produit..."
                className="search-input"
              />
              <button
                onClick={handleSearch}
                className="search-button"
                title="Rechercher"
                disabled={isSearchLoading}
              >
                {isSearchLoading ? (
                  <span className="search-spinner"></span>
                ) : (
                  "🔍"
                )}
              </button>
              <button
                className={`search-mode-button ${searchByCategory ? "category-mode" : ""}`}
                onClick={() => setSearchByCategory(!searchByCategory)}
                disabled={isSearchLoading}
              >
                {isSearchLoading ? (
                  <span className="mini-spinner"></span>
                ) : searchByCategory ? (
                  "Par catégorie"
                ) : (
                  "Par pertinence"
                )}
              </button>
              {activeSearch && (
                <button onClick={handleClearSearch} className="clear-button">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="toolbar-right">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="sort-select"
              disabled={isSearchLoading}
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
              disabled={isSearchLoading}
            >
              {isSearchLoading ? (
                <span className="mini-spinner"></span>
              ) : sortOrder === "asc" ? (
                "↑ Ascendant"
              ) : (
                "↓ Descendant"
              )}
            </button>
          </div>
        </div>

        <div className="products-main">
          {loading && products.length === 0 ? (
            <div className="search-loading-state">
              <div className="spinner"></div>
              <p className="search-loading-text">
                {activeSearch
                  ? `Recherche de "${activeSearch}" en cours...`
                  : "Chargement des produits..."}
              </p>
            </div>
          ) : displayedProducts.length === 0 ? (
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

                const nutriscoreLetter = getNutriscoreLetter(product);
                const nutriscoreColor = getNutriscoreColor(nutriscoreLetter);

                return (
                  <div
                    className="product-card"
                    key={code}
                    onClick={() => handleProductClick(code)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-header">
                      <div
                        className="nutriscore-circle"
                        style={{ backgroundColor: nutriscoreColor }}
                        title={`Nutri-Score ${nutriscoreLetter}`}
                      >
                        {nutriscoreLetter}
                      </div>
                      <button
                        className={`favorite-button-top ${
                          isFavorite ? "favorite-active" : ""
                        }`}
                        onClick={(e) => handleToggleFavorite(e, code)}
                      >
                        {isFavorite ? "❤️" : "🤍"}
                      </button>
                    </div>

                    <div className="product-image-container">
                      <ImageWithLoader
                        code={code}
                        alt={name}
                        productName={name}
                      />
                    </div>

                    <div className="card-footer-anchored">
                      <div className="product-title">{name}</div>
                      <FavoriteCount productId={code} isFavorite={isFavorite} />
                    </div>
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

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default Products;
