import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const imageCache = useRef(new Map());

  const DEFAULT_IMAGE =
    "https://via.placeholder.com/150/e0e0e0/757575?text=Produit";

  /** ----------- Charger l'utilisateur et ses favoris ----------- */
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        setLoading(true);
        
        // 1. Récupérer l'utilisateur connecté
        const user = await getConnectedUser();
        setCurrentUser(user);

        if (user?._id) {
          // 2. Récupérer les favoris de cet utilisateur
          const userFavs = await getUserFavorites(user._id);
          
          if (Array.isArray(userFavs)) {
            setFavorites(userFavs);
            
            // 3. Pour chaque favori, récupérer les détails du produit via getProductById
            const productsData = {};
            for (const fav of userFavs) {
              try {
                const productData = await getProductById(fav.product_id);
                productsData[fav.product_id] = productData;
              } catch (error) {
                console.error(`Erreur chargement produit ${fav.product_id}:`, error);
                // Fallback sur le snapshot
                if (fav.product_snapshot) {
                  productsData[fav.product_id] = fav.product_snapshot;
                }
              }
            }
            setProducts(productsData);
          }
        }
      } catch (error) {
        console.error("Erreur chargement favoris:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndFavorites();
  }, []);

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
        DEFAULT_IMAGE;

      imageCache.current.set(id, img);
      setImages((prev) => ({ ...prev, [id]: img }));
    } catch (error) {
      imageCache.current.set(id, DEFAULT_IMAGE);
      setImages((prev) => ({ ...prev, [id]: DEFAULT_IMAGE }));
    }
  }, []);

  /** ----------- Chargement batch d'images ----------- */
  useEffect(() => {
    const loadImagesInBatch = async () => {
      const batchSize = 5;
      const productIds = Object.keys(products);
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map((productId) => {
            const product = products[productId];
            const name = product?.product_name || product?.name || "";
            if (productId && name && !imageCache.current.has(productId)) {
              return loadImage(productId, name);
            }
            return Promise.resolve();
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    };

    if (Object.keys(products).length > 0) loadImagesInBatch();
  }, [products, loadImage]);

  /** ----------- Supprimer un favori ----------- */
  const handleRemoveFavorite = async (e, productId) => {
    e.stopPropagation();

    if (!currentUser?._id) return;

    try {
      await removeFavorite(currentUser._id, productId);
      setFavorites((prev) => prev.filter((fav) => fav.product_id !== productId));
      
      // Nettoyer aussi les produits
      setProducts((prev) => {
        const newProducts = { ...prev };
        delete newProducts[productId];
        return newProducts;
      });
    } catch (error) {
      console.error("Erreur suppression favori:", error);
      alert("Erreur lors de la suppression du favori");
    }
  };

  /** ----------- Navigation vers détail produit ----------- */
  const handleProductClick = (productId) => {
    navigate(`/produits/${productId}`);
  };

  /** ----------- Navigation retour ----------- */
  const handleBackToProducts = () => {
    navigate("/produits");
  };

  /** ----------- Rendu JSX ----------- */
  return (
    <div className="background">
      <div className="favorites-container">
        <div className="favorites-header">
          <button onClick={handleBackToProducts} className="back-button">
            ← Retour aux produits
          </button>
          <h1 className="favorites-title">❤️ Mes Favoris</h1>
          <div className="favorites-count">
            {loading ? (
              <span>Chargement...</span>
            ) : (
              <>
                <strong>{favorites.length}</strong>
                {favorites.length > 1 ? " favoris" : " favori"}
              </>
            )}
          </div>
        </div>

        <div className="favorites-main">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Chargement de vos favoris...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">💔</div>
              <div className="empty-state__text">
                Vous n'avez pas encore de favoris
              </div>
              <button
                onClick={handleBackToProducts}
                className="empty-state__button"
              >
                Découvrir des produits
              </button>
            </div>
          ) : (
            <div className="favorites-grid">
              {favorites.map((fav) => {
                const productId = fav.product_id;
                const product = products[productId];
                
                // Si le produit n'est pas encore chargé
                if (!product) {
                  return null;
                }

                const name = product.product_name || product.name || "—";
                const nutri = product.nutriscore_score || product.nutriscore || "—";
                const imageUrl = images[productId];
                const compatibility = product.compatibility || product.compatibility_score || 0;

                return (
                  <div
                    className="favorite-card"
                    key={fav._id || productId}
                    onClick={() => handleProductClick(productId)}
                    style={{ cursor: "pointer" }}
                  >
                    <button
                      className="remove-favorite-button"
                      onClick={(e) => handleRemoveFavorite(e, productId)}
                      aria-label="Retirer des favoris"
                    >
                      ❌
                    </button>

                    <div className="favorite-badge">❤️ Favori</div>

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
                    
                    {product.brands && (
                      <div className="product-brand">{product.brands}</div>
                    )}
                    
                    {fav.created_at && (
                      <div className="favorite-date">
                        Ajouté le {new Date(fav.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Favorites;