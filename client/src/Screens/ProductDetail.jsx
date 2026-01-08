import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductById } from "../services/productService";
import "./../styles/ProductDetail.css";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const OFF_PRODUCT_BY_CODE = "https://world.openfoodfacts.org/api/v2/product/";
const FALLBACK_IMG =
  "https://via.placeholder.com/400/e0e0e0/757575?text=Image+non+disponible";

// DONNÉES D'EXEMPLE POUR LA CARTE (10 Points autour de Paris)
const VENDOR_LOCATIONS = [
  {
    id: 1,
    name: "Supermarché Saint-Honoré (75001)",
    coords: [48.863, 2.337],
  },

  {
    id: 2,
    name: "Épicerie Saint-Sulpice (75006)",
    coords: [48.851, 2.333],
  },

  { id: 3, name: "Hyper Clichy (75018)", coords: [48.887, 2.33] },

  { id: 4, name: "Marché Italie 2 (75013)", coords: [48.828, 2.358] },

  {
    id: 5,
    name: "Carrefour Billancourt (92100)",
    coords: [48.835, 2.228],
  },

  { id: 6, name: "Monop' Château (94300)", coords: [48.847, 2.438] },

  {
    id: 7,
    name: "Super U Stade de France (93200)",
    coords: [48.92, 2.361],
  },

  {
    id: 8,
    name: "Market Versailles Rive Droite (78000)",
    coords: [48.805, 2.12],
  },

  {
    id: 9,
    name: "Grande Surface Puteaux (92800)",
    coords: [48.891, 2.238],
  },

  {
    id: 10,
    name: "Boutique Aéroport Orly (94310)",
    coords: [48.73, 2.37],
  },
];

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true); // → uniquement pour le produit
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const defaultCenter = [48.8566, 2.3522];
  // 1) Charger le produit (backend Nutri-Check)
  useEffect(() => {
    let cancelled = false;

    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setImage(null);
        setImageLoaded(false);

        const data = await getProductById(id);
        if (cancelled) return;

        setProduct(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Erreur lors du chargement du produit:", err);
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false); // ✅ on arrête le spinner dès que le produit est là
      }
    };

    fetchProductDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2) Charger l’image OFF *après* que le produit soit là (en parallèle)
  useEffect(() => {
    if (!product) return;

    let cancelled = false;

    const loadImageByCode = async (code) => {
      try {
        const resp = await fetch(`${OFF_PRODUCT_BY_CODE}${code}.json`);
        if (!resp.ok) throw new Error("Image non disponible");

        const data = await resp.json();
        const prod = data.product || {};

        const img =
          prod.image_front_url ||
          prod.image_front_small_url ||
          prod.image_url ||
          FALLBACK_IMG;

        if (!cancelled) setImage(img);
      } catch (e) {
        if (!cancelled) setImage(FALLBACK_IMG);
      }
    };

    const loadImageByName = async (name) => {
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
          FALLBACK_IMG;

        if (!cancelled) setImage(img);
      } catch {
        if (!cancelled) setImage(FALLBACK_IMG);
      }
    };

    const code = product?.code;
    const name = product?.product_name;

    // on reset l’état image à chaque nouveau produit
    setImage(null);
    setImageLoaded(false);

    if (code) {
      loadImageByCode(code);
    } else if (name) {
      loadImageByName(name);
    } else {
      setImage(FALLBACK_IMG);
    }

    return () => {
      cancelled = true;
    };
  }, [product]);

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
    <div className="product-detail-container" style={{ overflowY: "scroll" }}>
      <button className="back-button-top" onClick={() => navigate(-1)}>
        <span className="button-icon">←</span>
        Retour aux produits
      </button>

      <div className="product-detail-content">
        {/* Section gauche: Header + Nutrition */}
        <div className="product-detail-left">
          <div className="product-header">
            <div className="image-wrapper">
              {!imageLoaded && (
                <div className="image-skeleton">
                  <div className="skeleton-pulse"></div>
                </div>
              )}
              <img
                src={image || FALLBACK_IMG}
                alt={product.product_name}
                className={`product-image ${imageLoaded ? "loaded" : ""}`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.target.src = FALLBACK_IMG;
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
                    <span className="info-value code-value">
                      {product.code}
                    </span>
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

        {/* Section droite: Carte */}
        <div className="product-detail-right">
          <ProductMap countries={product.countries} />
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

function ProductMap({ countries }) {
  // Parse countries si c'est une string (comma-separated)
  const countryList = countries
    ? (typeof countries === "string" ? countries.split(",") : countries)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  // Mapping simplifié pays -> coordonnées
  const countryCoordinates = {
    France: [46.2276, 2.2137],
    "United Kingdom": [55.3781, -3.436],
    Germany: [51.1657, 10.4515],
    Spain: [40.463667, -3.74922],
    Italy: [41.8719, 12.5674],
    Belgium: [50.5039, 4.4699],
    Netherlands: [52.1326, 5.2913],
    Poland: [51.9194, 19.1451],
    Sweden: [60.1282, 18.6435],
    Denmark: [56.26, 9.5018],
    Portugal: [39.3999, -8.224],
    Greece: [39.074, 21.824],
    Austria: [47.5162, 14.5501],
    Switzerland: [46.8182, 8.2275],
    Czechia: [49.8175, 15.473],
    Hungary: [47.1625, 19.5033],
    Romania: [45.9432, 24.9668],
    Bulgaria: [42.7339, 25.4858],
    Canada: [56.1304, -106.346],
    USA: [37.0902, -95.7129],
    Mexico: [23.6345, -102.5528],
    Brazil: [-14.235, -51.9253],
    Japan: [36.2048, 138.2529],
    China: [35.8617, 104.1954],
    India: [20.5937, 78.9629],
    Australia: [-25.2744, 133.7751],
  };

  // Mapping pays -> code ISO pour récupérer les GeoJSON
  const countryISO = {
    France: "FRA",
    "United Kingdom": "GBR",
    Germany: "DEU",
    Spain: "ESP",
    Italy: "ITA",
    Belgium: "BEL",
    Netherlands: "NLD",
    Poland: "POL",
    Sweden: "SWE",
    Denmark: "DNK",
    Portugal: "PRT",
    Greece: "GRC",
    Austria: "AUT",
    Switzerland: "CHE",
    Czechia: "CZE",
    Hungary: "HUN",
    Romania: "ROU",
    Bulgaria: "BGR",
    Canada: "CAN",
    USA: "USA",
    Mexico: "MEX",
    Brazil: "BRA",
    Japan: "JPN",
    China: "CHN",
    India: "IND",
    Australia: "AUS",
  };

  // State pour stocker les GeoJSON chargés
  const [geoJsonData, setGeoJsonData] = useState({});
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Charger les GeoJSON pour les pays
  useEffect(() => {
    if (countryList.length === 0) return;

    setLoadingGeo(true);
    const loadGeoJson = async () => {
      const data = {};
      for (const country of countryList) {
        const isoCode = countryISO[country];
        if (!isoCode) continue;

        try {
          const response = await fetch(
            `https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json`
          );
          const geojson = await response.json();
          // Filtrer par le pays
          const countryGeo = geojson.features.find(
            (f) => f.properties.name === country
          );
          if (countryGeo) {
            data[country] = countryGeo;
          }
        } catch (e) {
          console.warn(`Impossible de charger GeoJSON pour ${country}:`, e);
        }
      }
      setGeoJsonData(data);
      setLoadingGeo(false);
    };

    loadGeoJson();
  }, [countryList]);

  // Créer les marqueurs pour chaque pays (fallback si pas de GeoJSON)
  const countryMarkers = countryList
    .map((country) => {
      const coords = countryCoordinates[country];
      if (coords) {
        return {
          name: country,
          coords: coords,
        };
      }
      return null;
    })
    .filter(Boolean);

  // Calculer le centre de la carte basé sur les pays disponibles
  let centerCoords = [48.8566, 2.3522]; // Paris par défaut
  if (countryMarkers.length > 0) {
    const avgLat =
      countryMarkers.reduce((sum, m) => sum + m.coords[0], 0) /
      countryMarkers.length;
    const avgLng =
      countryMarkers.reduce((sum, m) => sum + m.coords[1], 0) /
      countryMarkers.length;
    centerCoords = [avgLat, avgLng];
  }

  const onEachCountry = (feature, layer) => {
    layer.setStyle({
      color: "#667eea",
      weight: 2,
      opacity: 0.7,
      fillColor: "#764ba2",
      fillOpacity: 0.3,
    });

    layer.bindPopup(
      `<div style="font-weight: bold;">${feature.properties.name}</div>`
    );
  };

  return (
    <div className="product-map-section">
      <h3 className="map-section-title">🌍 Pays d'origine</h3>

      {countryList.length > 0 ? (
        <>
          <div className="countries-list">
            {countryList.map((country, idx) => (
              <span key={idx} className="country-tag">
                🗺️ {country}
              </span>
            ))}
          </div>

          <div
            className="map-container"
            style={{
              height: "350px",
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              marginTop: "16px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <MapContainer
              center={centerCoords}
              zoom={3}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Afficher les GeoJSON (frontières) si disponibles */}
              {Object.entries(geoJsonData).map(([country, feature]) => (
                <GeoJSON
                  key={country}
                  data={feature}
                  onEachFeature={onEachCountry}
                />
              ))}

              {/* Afficher les marqueurs pour les pays sans GeoJSON */}
              {countryMarkers
                .filter((marker) => !geoJsonData[marker.name])
                .map((marker, idx) => (
                  <Marker key={idx} position={marker.coords}>
                    <Popup>
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: "14px",
                          color: "#2c3e50",
                        }}
                      >
                        {marker.name}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </>
      ) : (
        <div className="no-countries">
          <p>Aucun pays d'origine disponible</p>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;
