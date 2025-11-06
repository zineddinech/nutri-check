import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductById } from "../services/productService";
import "./../styles/ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        const data = await getProductById(id);
        setProduct(data);

        if (data.product_name) {
          loadProductImage(data.product_name);
        }
      } catch (err) {
        console.error("Erreur lors du chargement du produit:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const loadProductImage = async (name) => {
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            name
          )}&search_simple=1&action=process&json=1&page_size=1`
        );

        if (!response.ok) throw new Error("Image non disponible");

        const data = await response.json();
        const img =
          data?.products?.[0]?.image_front_url ||
          data?.products?.[0]?.image_url ||
          "https://via.placeholder.com/400/e0e0e0/757575?text=Image+non+disponible";

        setImage(img);
      } catch {
        setImage(
          "https://via.placeholder.com/400/e0e0e0/757575?text=Image+non+disponible"
        );
      }
    };

    fetchProductDetail();
  }, [id]);

  const getNutriscoreColor = (grade) => {
    const colors = {
      a: "#038141",
      b: "#85bb2f",
      c: "#fecb02",
      d: "#ee8100",
      e: "#e63e11",
    };
    return colors[grade?.toLowerCase()] || "#ccc";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2 className="error-title">Oups!</h2>
          <p className="error-text">{error || "Produit introuvable"}</p>
          <button className="back-button-error" onClick={() => navigate(-1)}>
            <span className="button-icon">←</span>
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button className="back-button-top" onClick={() => navigate(-1)}>
        <span className="button-icon">←</span>
        Retour aux produits
      </button>

      <div className="product-detail-content">
        {/* Header avec image et infos principales */}
        <div className="product-header">
          <div className="image-wrapper">
            {!imageLoaded && (
              <div className="image-skeleton">
                <div className="skeleton-pulse"></div>
              </div>
            )}
            <img
              src={
                image ||
                "https://via.placeholder.com/400/e0e0e0/757575?text=Image+non+disponible"
              }
              alt={product.product_name}
              className={`product-image ${imageLoaded ? "loaded" : ""}`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/400/e0e0e0/757575?text=Image+non+disponible";
                setImageLoaded(true);
              }}
            />
          </div>

          <div className="product-info">
            <h1 className="product-name">{product.product_name || "—"}</h1>

            {product.brands && (
              <div className="info-badge brand-badge">
                <span className="badge-icon">🏷️</span>
                <span className="badge-text">{product.brands}</span>
              </div>
            )}

            {product.code && (
              <div className="info-item">
                <span className="info-icon">📦</span>
                <div className="info-content">
                  <span className="info-label">Code-barres</span>
                  <span className="info-value code-value">{product.code}</span>
                </div>
              </div>
            )}

            {product.last_modified_t && (
              <div className="info-item">
                <span className="info-icon">🕒</span>
                <div className="info-content">
                  <span className="info-label">Dernière modification</span>
                  <span className="info-value">
                    {formatDate(product.last_modified_t)}
                  </span>
                </div>
              </div>
            )}

            {product.nutriscore_grade && (
              <div className="nutriscore-container">
                <span className="nutriscore-label">Nutri-Score</span>
                <div
                  className="nutriscore-badge"
                  style={{
                    backgroundColor: getNutriscoreColor(
                      product.nutriscore_grade
                    ),
                  }}
                >
                  {product.nutriscore_grade.toUpperCase()}
                </div>
              </div>
            )}

            {product.categories && (
              <div className="categories-container">
                <span className="categories-label">
                  <span className="categories-icon">🏷️</span>
                  Catégories
                </span>
                <div className="categories-list">
                  {product.categories
                    .split(",")
                    .slice(0, 5)
                    .map((cat, idx) => (
                      <span key={idx} className="category-tag">
                        {cat.trim()}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section Valeurs Nutritionnelles */}
        <div className="nutrition-section">
          <div className="section-header">
            <h2 className="section-title">
              Valeurs nutritionnelles
              <span className="subtitle">(pour 100g)</span>
            </h2>
          </div>

          <div className="nutrition-grid">
            <NutritionCard
              icon="⚡"
              label="Énergie"
              value={product.energy_100g}
              unit="kJ"
              color="#ff6b6b"
              gradient="linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)"
            />
            <NutritionCard
              icon="🧈"
              label="Matières grasses"
              value={product.fat_100g}
              unit="g"
              color="#ffd93d"
              gradient="linear-gradient(135deg, #ffd93d 0%, #fcbf49 100%)"
            />
            <NutritionCard
              icon="🍬"
              label="Sucres"
              value={product.sugars_100g}
              unit="g"
              color="#6bcf7f"
              gradient="linear-gradient(135deg, #6bcf7f 0%, #4ecdc4 100%)"
            />
            <NutritionCard
              icon="💪"
              label="Protéines"
              value={product.proteins_100g}
              unit="g"
              color="#4d96ff"
              gradient="linear-gradient(135deg, #4d96ff 0%, #6c63ff 100%)"
            />
            <NutritionCard
              icon="🧂"
              label="Sel"
              value={product.salt_100g}
              unit="g"
              color="#a29bfe"
              gradient="linear-gradient(135deg, #a29bfe 0%, #8e82fe 100%)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NutritionCard({ icon, label, value, unit, gradient }) {
  return (
    <div className="nutrition-card">
      <div className="nutrition-icon" style={{ background: gradient }}>
        <span className="icon-emoji">{icon}</span>
      </div>
      <div className="nutrition-details">
        <span className="nutrition-label">{label}</span>
        <div className="nutrition-value">
          {value !== null && value !== undefined ? (
            <>
              <span className="value-number">{value}</span>
              <span className="value-unit">{unit}</span>
            </>
          ) : (
            <span className="not-available">Non disponible</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
