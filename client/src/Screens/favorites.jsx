import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Favorites.css";
import "./../styles/Background.css";
import "./../styles/ProductDetailModal.css";
import { getConnectedUser } from "../services/authService";
import { getUserFavorites, removeFavorite, getFavoriteCount } from "../services/favoritesService";
import { getProductById } from "../services/productService";
import ImageCache from "../services/imageCache";
import { fetchImageFromOFF, fetchImageByProductName } from "../services/imageService";
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
const FavoriteCount = ({ productId }) => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getFavoriteCount(productId)
      .then((data) => {
        if (!cancelled) {
          setCount(data.favorite_count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setImage(null);
    setIsLoaded(false);

    const loadImage = async () => {
      // 1. Vérifier le cache d'abord
      const cachedImg = ImageCache.getImage(code);
      if (cachedImg) {
        if (!cancelled) {
          setImage(cachedImg);
          setIsLoading(false);
        }
        return;
      }

      // 2. Charger depuis OFF par code
      if (code) {
        const img = await fetchImageFromOFF(code);
        if (!cancelled) {
          if (img) {
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
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
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

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  
  /** ----------- Charger l'utilisateur et ses favoris ----------- */
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Récupérer l'utilisateur connecté
        const user = await getConnectedUser();
        setCurrentUser(user);

        if (!user?._id) {
          setError("Vous devez être connecté pour voir vos favoris");
          setFavorites([]);
          return;
        }

        // 2. Récupérer les favoris
        const userFavs = await getUserFavorites(user._id);

        if (!Array.isArray(userFavs)) {
          throw new Error("Format de données invalide");
        }

        setFavorites(userFavs);

        // 3. Pour chaque favori, récupérer les détails du produit
        const productsData = {};
        for (const fav of userFavs) {
          try {
            const productData = await getProductById(fav.product_id);
            productsData[fav.product_id] = productData;
          } catch (err) {
            console.error(`Erreur chargement produit ${fav.product_id}:`, err);
            if (fav.product_snapshot) {
              productsData[fav.product_id] = fav.product_snapshot;
            }
          }
        }
        setProducts(productsData);
      } catch (err) {
        console.error("Erreur chargement favoris:", err);
        setError(
          "Erreur lors du chargement de vos favoris. Veuillez réessayer."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUserAndFavorites();
  }, []);

  /** ----------- Supprimer un favori ----------- */
  const handleRemoveFavorite = async (e, productId) => {
    e.stopPropagation();

    if (!currentUser?._id) return;

    try {
      await removeFavorite(currentUser._id, productId);
      setFavorites((prev) =>
        prev.filter((fav) => fav.product_id !== productId)
      );
      setProducts((prev) => {
        const newProducts = { ...prev };
        delete newProducts[productId];
        return newProducts;
      });
    } catch (err) {
      console.error("Erreur suppression favori:", err);
      setError("Erreur lors de la suppression du favori");
    }
  };

  /** ----------- Ouvrir/Fermer la popup produit ----------- */
  const handleProductClick = (productId) => {
    setSelectedProductId(productId);
  };

  const handleCloseModal = () => {
    setSelectedProductId(null);
  };

  return (
    <div className="favorites-container">
      <div className="favorites-wrapper">
        {/* En-tête */}
        <div className="favorites-header">
          <h1 className="favorites-title">❤️ Mes Favoris</h1>
          <p className="favorites-subtitle">
            {loading
              ? "Chargement..."
              : `${favorites.length} favori${
                  favorites.length !== 1 ? "s" : ""
                }`}
          </p>
        </div>

        {/* Contenu principal */}
        {loading ? (
          // État de chargement
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement de vos favoris...</p>
          </div>
        ) : error ? (
          // État d'erreur
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error}</p>
            <button
              className="btn-retry"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        ) : favorites.length === 0 ? (
          // État vide
          <div className="empty-state-main">
            <div className="empty-icon">💔</div>
            <p className="empty-title">Aucun favori</p>
            <p className="empty-description">
              Commencez à ajouter vos produits préférés
            </p>
            <button
              className="btn-explore"
              onClick={() => navigate("/produits")}
            >
              Explorer les produits →
            </button>
          </div>
        ) : (
          // Grille de favoris
          <div className="favorites-grid">
            {favorites.map((fav) => {
              const productId = fav.product_id;
              const product = products[productId];

              if (!product) return null;

              const name = product.product_name || product.name || "—";
              const nutriscoreLetter = getNutriscoreLetter(product);
              const nutriscoreColor = getNutriscoreColor(nutriscoreLetter);
              const code =
                product.code ?? product._id ?? product.id ?? productId;
              const compatibility =
                product.compatibility || product.compatibility_score || 0;

              return (
                <div
                  className="favorite-card"
                  key={fav._id || productId}
                  onClick={() => handleProductClick(productId)}
                >
                  <div className="card-floating-header">

                    {/* 1. NutriScore à Gauche */}
                    <div
                      className="floating-score"
                      style={{ backgroundColor: nutriscoreColor }}
                      title={`Nutri-Score ${nutriscoreLetter}`}
                    >
                      {nutriscoreLetter}
                    </div>

                    {/* 2. Cœur au Centre */}
                    <div className="floating-heart">
                      ❤️
                    </div>

                    {/* 3. Croix à Droite */}
                    <button
                      className="floating-remove"
                      onClick={(e) => handleRemoveFavorite(e, productId)}
                      title="Retirer des favoris"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="product-image-container">
                      <ImageWithLoader
                        code={code}
                        alt={name}
                        productName={name}
                      />
                    </div>

                  <div className="card-content">
                    <h3 className="product-title">{name}</h3>
                    
                    {product.brands && (
                      <p className="product-brand">{product.brands}</p>
                    )}

                    {/* On garde la compatibilité en bas si besoin, mais on a enlevé le nutriscore d'ici car il est en haut */}
                    {compatibility > 0 && (
                      <div className="compatibility" style={{marginTop: '10px'}}>
                        {compatibility}% compatible
                      </div>
                    )}
                  </div>

                  {/* Bloc ancré en bas : date + compteur favoris */}
                  <div className="card-footer-anchored">
                    {fav.created_at && (
                      <p className="favorite-date">
                        Ajouté le {new Date(fav.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    <FavoriteCount productId={code} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

export default Favorites;
