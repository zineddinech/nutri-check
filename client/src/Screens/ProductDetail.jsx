import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./../Screens_CSS/ProductDetail.css";
import "./../Screens_CSS/Background.css";
import { getProductById } from "../services/productService";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        setLoading(true);

        const response = await getProductById(id);
        if (!response.ok) throw new Error("Produit non trouvé");

        const data = await response.json();
        setProduct(data);

        // Charger l'image
        if (data.product_name) {
          loadProductImage(data.product_name);
        }
      } catch (err) {
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
          "https://via.placeholder.com/400";

        setImage(img);
      } catch {
        setImage("https://via.placeholder.com/400");
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
          <h2 className="error-title">❌ Erreur</h2>
          <p className="error-text">{error || "Produit introuvable"}</p>
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button className="back-button-top" onClick={() => navigate(-1)}>
        ← Retour aux produits
      </button>

      <div className="product-detail-content">
        {/* Section Image et Informations principales */}
        <div className="main-section">
          <div className="image-section">
            {!image ? (
              <div className="image-skeleton"></div>
            ) : (
              <img
                src={image}
                alt={product.product_name}
                className="product-detail-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/400";
                }}
              />
            )}
          </div>

          <div className="info-section">
            <h1 className="product-detail-name">
              {product.product_name || "—"}
            </h1>

            {product.brands && (
              <div className="info-row">
                <span className="info-label">Marque:</span>
                <span className="brand-value">{product.brands}</span>
              </div>
            )}

            {product.code && (
              <div className="info-row">
                <span className="info-label">Code-barres:</span>
                <span className="code-value">{product.code}</span>
              </div>
            )}

            {product.categories && (
              <div className="categories-section">
                <span className="info-label">Catégories:</span>
                <div className="categories-list">
                  {product.categories.split(",").map((cat, idx) => (
                    <span key={idx} className="category-tag">
                      {cat.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.nutriscore_grade && (
              <div className="info-row">
                <span className="info-label">Nutri-Score:</span>
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

            {product.last_modified_t && (
              <div className="info-row">
                <span className="info-label">Dernière modification:</span>
                <span className="date-value">
                  {formatDate(product.last_modified_t)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section Valeurs Nutritionnelles */}
        <div className="nutrition-section">
          <h2 className="section-title">
            📊 Valeurs nutritionnelles (pour 100g)
          </h2>
          <div className="nutrition-grid">
            <NutritionCard
              icon="⚡"
              label="Énergie"
              value={product.energy_100g}
              unit="kJ"
              color="#ff6b6b"
            />
            <NutritionCard
              icon="🧈"
              label="Matières grasses"
              value={product.fat_100g}
              unit="g"
              color="#ffd93d"
            />
            <NutritionCard
              icon="🍬"
              label="Sucres"
              value={product.sugars_100g}
              unit="g"
              color="#6bcf7f"
            />
            <NutritionCard
              icon="💪"
              label="Protéines"
              value={product.proteins_100g}
              unit="g"
              color="#4d96ff"
            />
            <NutritionCard
              icon="🧂"
              label="Sel"
              value={product.salt_100g}
              unit="g"
              color="#a29bfe"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour afficher une carte nutritionnelle
function NutritionCard({ icon, label, value, unit, color }) {
  return (
    <div className="nutrition-card">
      <div className="nutrition-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="nutrition-info">
        <div className="nutrition-label">{label}</div>
        <div className="nutrition-value">
          {value !== null && value !== undefined ? (
            <>
              <strong>{value}</strong> {unit}
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
