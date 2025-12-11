import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Favorites.css";
import "./../styles/Background.css";
import { getConnectedUser } from "../services/authService";
import { getUserFavorites, removeFavorite } from "../services/favoritesService";
import { getProductById } from "../services/productService";

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const DEFAULT_IMAGE =
    "https://via.placeholder.com/150/e0e0e0/757575?text=Produit";

  const API_BASE = "http://localhost:8000";
  const getLocalImage = (code) => `${API_BASE}/images/${code}.jpg`;

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

  /** ----------- Navigation vers détail produit ----------- */
  const handleProductClick = (productId) => {
    navigate(`/produits/${productId}`);
  };

  return (
    <div className="favorites-container background">
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
              const nutri =
                product.nutriscore_score || product.nutriscore || "—";
              const code =
                product.code ?? product._id ?? product.id ?? productId;
              const imageUrl = code ? getLocalImage(code) : null;
              const compatibility =
                product.compatibility || product.compatibility_score || 0;

              return (
                <div
                  className="favorite-card"
                  key={fav._id || productId}
                  onClick={() => handleProductClick(productId)}
                >
                  <div className="card-header">
                    <div className="favorite-badge">❤️</div>
                    <button
                      className="remove-button"
                      onClick={(e) => handleRemoveFavorite(e, productId)}
                      title="Retirer des favoris"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="card-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = DEFAULT_IMAGE;
                        }}
                      />
                    ) : (
                      <div className="image-placeholder">No image</div>
                    )}
                  </div>

                  <div className="card-content">
                    <h3 className="product-name">{name}</h3>

                    {product.brands && (
                      <p className="product-brand">{product.brands}</p>
                    )}

                    <div className="card-meta">
                      <span className="nutriscore-badge">
                        Nutri-Score: {nutri}
                      </span>
                      {compatibility > 0 && (
                        <span className="compatibility-badge">
                          {compatibility}% compatible
                        </span>
                      )}
                    </div>

                    {fav.created_at && (
                      <p className="favorite-date">
                        Ajouté le{" "}
                        {new Date(fav.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
