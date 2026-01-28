import React, { useState, useEffect } from "react";
import "./../styles/Recipes.css";
import "./../styles/Background.css";
import { getProductsSearched } from "../services/productService";
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

function Recipes() {
  const [recipeInput, setRecipeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipeResult, setRecipeResult] = useState(null);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState({}); // index -> product or null
  const [notFoundIngredients, setNotFoundIngredients] = useState([]);
  const [infoMessage, setInfoMessage] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const DEFAULT_IMAGE =
    "https://via.placeholder.com/150/e0e0e0/757575?text=Produit";

  // Composant ImageWithLoader identique à Products.jsx et favorites.jsx
  const ImageWithLoader = ({ code, alt, productName }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      let cancelled = false;
      setIsLoading(true);
      setHasError(false);
      setImage(null);
      setIsLoaded(false);

      const loadImage = async () => {
        // 1. Vérifier le cache d'abord
        if (code) {
          const cachedImg = ImageCache.getImage(code);
          if (cachedImg) {
            if (!cancelled) {
              setImage(cachedImg);
              setIsLoading(false);
            }
            return;
          }

          // Vérifier si marqué comme sans image
          if (ImageCache.hasNoImage(code)) {
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

      if (code || productName) {
        loadImage();
      } else {
        setHasError(true);
        setIsLoading(false);
      }

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

  // Appeler l'IA pour analyser la recette
  const analyzeRecipe = async (recipe) => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/recipes/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipe }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Extraire le message d'erreur détaillé
        const errorMessage =
          errorData?.detail || "Erreur lors de l'analyse de la recette";

        throw {
          statusCode: response.status,
          message: errorMessage,
          isDetailError:
            typeof errorMessage === "string" &&
            errorMessage.includes("Réponse brute"),
        };
      }

      const data = await response.json();

      return {
        success: true,
        recipeName: data.recipeName || recipe.split("\n")[0] || "Ma recette",
        totalCalories: data.totalCalories || 0,
        ingredients: data.ingredients || [],
        steps: data.steps || [],
      };
    } catch (err) {
      console.error("Erreur analyse recette:", err);

      if (err.statusCode === 502) {
        return {
          success: false,
          error: {
            title: "Erreur serveur LLM",
            message:
              "Le serveur d'IA n'a pas pu générer une réponse valide. Vérifiez que votre recette est bien formatée et réessayez.",
            details: err.message,
          },
        };
      }

      if (err.statusCode === 500) {
        return {
          success: false,
          error: {
            title: "Erreur de traitement",
            message:
              "Une erreur s'est produite lors du traitement. Vérifiez votre connexion et réessayez.",
            details: err.message,
          },
        };
      }

      return {
        success: false,
        error: {
          title: "Erreur de connexion",
          message:
            "Impossible de se connecter au serveur. Vérifiez que le serveur est en ligne.",
          details: err.message || "Erreur inconnue",
        },
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recipeInput.trim()) {
      setError("Veuillez entrer une description de recette");
      setErrorDetails(null);
      return;
    }

    if (recipeInput.trim().length < 10) {
      setError("La recette doit contenir au moins 10 caractères");
      setErrorDetails(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setRecipeResult(null);

    try {
      const result = await analyzeRecipe(recipeInput);

      if (result.success) {
        setRecipeResult(result);
        setInfoMessage(null);
        // lancer la recherche de produits pour les ingrédients retournés
        findProductsForIngredients(result.ingredients || []);
        setError(null);
      } else {
        // Cas fallback : si l'erreur vient du LLM (ex: Gemini 503), on tente
        // une extraction heuristique locale des ingrédients et on continue
        const details = result.error?.details || "";
        const isLlm503 =
          result.error?.title === "Erreur serveur LLM" ||
          /503|gemini|service unavailable/i.test(details);

        if (isLlm503) {
          // extraction locale
          const parsed = parseIngredientsFromText(recipeInput);
          const fallbackResult = {
            success: true,
            recipeName: recipeInput.split("\n")[0] || "Ma recette",
            totalCalories: 0,
            ingredients: parsed,
            steps: [],
          };

          setRecipeResult(fallbackResult);
          setInfoMessage(
            "Le service d'analyse (LLM) est indisponible — affichage basé sur une extraction heuristique locale."
          );
          findProductsForIngredients(parsed || []);
          setError(null);
          setErrorDetails(result.error);
        } else {
          setError(result.error.message);
          setErrorDetails(result.error);
          setRecipeResult(null);
        }
      }
    } catch (err) {
      setError("Erreur inattendue lors du traitement");
      setErrorDetails(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  function normalizeIngredientName(name) {
    if (!name) return "";
    // enlever quantités, parenthèses, ponctuation basique
    let s = name.toString().toLowerCase();
    // enlever contenu entre parenthèses
    s = s.replace(/\([^)]*\)/g, "");
    // enlever chiffres et pourcentages
    s = s.replace(
      /\d+[\.,]?\d*\s*(g|kg|ml|l|cl|mg|tsp|tbsp|cuillere[s]?|cuillère[s]?|slice[s]?|tranche[s]?|grammes?)?/g,
      ""
    );
    // enlever unités courantes isolées
    s = s.replace(
      /\b(g|kg|ml|l|cl|mg|tsp|tbsp|cuillere|cuillères|cuillère|cuilleres)\b/g,
      ""
    );
    // garder seulement lettres, espaces et -
    s = s.replace(/[^a-z\-\s]/g, "");
    s = s.trim();
    return s;
  }

  function parseIngredientsFromText(text) {
    if (!text || !text.trim()) return [];

    // Split by newlines and commas and common bullet separators
    const parts = text
      .split(/\n|,|•|-|;/)
      .map((p) => p.trim())
      .filter(Boolean);

    const verbs = [
      "cuire",
      "mélanger",
      "ajouter",
      "faire",
      "porter",
      "laisser",
      "préchauffer",
      "verser",
      "incorporer",
      "placer",
      "servir",
    ];

    const candidates = [];
    for (let p of parts) {
      // skip lines that look like instructions (start with a verb)
      const firstWord = p.split(/\s+/)[0]?.toLowerCase() || "";
      if (verbs.includes(firstWord)) continue;

      // remove parenthesis and quantities
      let cleaned = p.replace(/\([^)]*\)/g, "");
      cleaned = normalizeIngredientName(cleaned);
      if (!cleaned) continue;

      // remove very short tokens
      if (cleaned.length < 2) continue;

      candidates.push({ name: cleaned });
    }

    // Deduplicate by name
    const uniq = [];
    const seen = new Set();
    for (const c of candidates) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        uniq.push(c);
      }
    }

    return uniq;
  }

  function scoreProductMatch(ingredientName, productName) {
    const ing = ingredientName.toLowerCase().trim();
    const prod = (productName || "").toLowerCase().trim();

    if (!ing || !prod) return 0;

    // Exact match (très bon)
    if (ing === prod) return 100;

    // Ingredient is a substring of product (ex: "sel" in "sel fin") - bon
    if (prod.includes(ing)) return 80;

    // Product starts with ingredient - très bon
    if (prod.startsWith(ing)) return 85;

    // Token-based matching: comparer les mots
    const ingTokens = ing.split(/\s+/).filter(Boolean);
    const prodTokens = prod.split(/\s+/).filter(Boolean);

    if (ingTokens.length === 0) return 0;

    // Si ingredient a plusieurs tokens (ex: "sel fin")
    if (ingTokens.length > 1) {
      // Vérifier si tous les tokens de l'ingrédient sont dans le produit
      const allTokensMatch = ingTokens.every((t) =>
        prodTokens.some((pt) => pt.startsWith(t) || pt === t)
      );
      if (allTokensMatch) return 90;

      // Au moins 2 tokens sur 3 match
      const matchCount = ingTokens.filter((t) =>
        prodTokens.some((pt) => pt.startsWith(t) || pt === t)
      ).length;
      if (matchCount >= 2) return 70;
    }

    // Single token: vérifier si le token est un mot complet du produit
    if (ingTokens.length === 1) {
      const token = ingTokens[0];
      const isCompleteWord = prodTokens.some(
        (pt) =>
          pt === token ||
          (pt.length > 3 &&
            pt.startsWith(token) &&
            pt.length - token.length <= 2)
      );
      if (isCompleteWord) return 75;

      // Éviter les faux positifs : le token ne doit pas être qu'une partie d'un mot
      // Ex: "fin" ne doit pas matcher "muffin"
      const isBadPartialMatch = prodTokens.some(
        (pt) =>
          pt.includes(token) &&
          pt !== token &&
          !pt.startsWith(token) &&
          token.length < 4
      );
      if (isBadPartialMatch) return 10; // très faible score

      // Partial match acceptable (si token est au début)
      if (prodTokens.some((pt) => pt.startsWith(token))) return 60;
    }

    return 0;
  }

  async function findProductsForIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) {
      setMatchedProducts({});
      setNotFoundIngredients([]);
      return;
    }

    setMatchesLoading(true);
    setMatchedProducts({});
    setNotFoundIngredients([]);

    let completedCount = 0;
    const totalCount = ingredients.length;

    const promises = ingredients.map(async (ing, idx) => {
      const rawName = ing?.name || ing || "";
      const query = normalizeIngredientName(rawName) || rawName;

      const updateProduct = (product) => {
        setMatchedProducts((prev) => ({ ...prev, [idx]: product }));
      };

      const markNotFound = () => {
        setMatchedProducts((prev) => ({ ...prev, [idx]: null }));
        setNotFoundIngredients((prev) => [...prev, rawName]);
      };

      try {
        // recherche floue : on demande 3 résultats et on score chacun
        const data = await getProductsSearched(query, 1, 3);
        if (Array.isArray(data) && data.length > 0) {
          // scorer les résultats et prendre le meilleur
          const scored = data.map((prod) => ({
            product: prod,
            score: scoreProductMatch(rawName, prod.product_name),
          }));

          scored.sort((a, b) => b.score - a.score);

          // Si le meilleur score est trop faible, on considère qu'on n'a pas trouvé
          if (scored[0].score >= 50) {
            updateProduct(scored[0].product);
          } else {
            // Essayer une recherche par tokens
            const tokens = query.split(/\s+/).filter(Boolean);
            let found = null;
            for (let t of tokens.slice(-2).reverse()) {
              try {
                const d2 = await getProductsSearched(t, 1, 3);
                if (Array.isArray(d2) && d2.length > 0) {
                  const scored2 = d2.map((prod) => ({
                    product: prod,
                    score: scoreProductMatch(t, prod.product_name),
                  }));
                  scored2.sort((a, b) => b.score - a.score);
                  if (scored2[0].score >= 50) {
                    found = scored2[0].product;
                    break;
                  }
                }
              } catch (e) {
                // ignore
              }
            }
            if (found) updateProduct(found);
            else markNotFound();
          }
        } else {
          // si rien, tenter une recherche par token (dernier mot)
          const tokens = query.split(/\s+/).filter(Boolean);
          let found = null;
          for (let t of tokens.slice(-2).reverse()) {
            try {
              const d2 = await getProductsSearched(t, 1, 3);
              if (Array.isArray(d2) && d2.length > 0) {
                const scored2 = d2.map((prod) => ({
                  product: prod,
                  score: scoreProductMatch(t, prod.product_name),
                }));
                scored2.sort((a, b) => b.score - a.score);
                if (scored2[0].score >= 50) {
                  found = scored2[0].product;
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }

          if (found) updateProduct(found);
          else markNotFound();
        }
      } catch (e) {
        markNotFound();
      } finally {
        completedCount++;
        if (completedCount === totalCount) {
          setMatchesLoading(false);
        }
      }
    });

    await Promise.all(promises);
  }

  const handleClear = () => {
    setRecipeInput("");
    setRecipeResult(null);
    setError(null);
    setErrorDetails(null);
    setInfoMessage(null);
    setMatchedProducts({});
    setNotFoundIngredients([]);
  };

  const handleRetry = () => {
    setError(null);
    setErrorDetails(null);
    setLoading(false);
  };

  return (
    <div className="recipes-container">
      <div className="recipes-wrapper">
        {/* En-tête */}
        <div className="recipes-header">
          <h1>🍳 Créateur de Recettes</h1>
          <p className="recipes-subtitle">
            Analysez votre recette avec l'IA et obtenez les calories et
            ingrédients détaillés
          </p>
        </div>

        {/* Formulaire de recette */}
        <form onSubmit={handleSubmit} className="recipe-form">
          <div className="form-group">
            <label htmlFor="recipe-input">Décrivez votre recette</label>
            <textarea
              id="recipe-input"
              className="recipe-textarea"
              placeholder="Exemple: Poulet rôti avec riz complet et tomates fraîches cuites à l'huile d'olive. Cuire au four 45 min à 200°C..."
              value={recipeInput}
              onChange={(e) => setRecipeInput(e.target.value)}
              rows={5}
              disabled={loading}
            />
            <span className="char-count">
              {recipeInput.length} caractères
              {recipeInput.length < 10 && recipeInput.length > 0 && (
                <span className="char-warning"> (minimum 10)</span>
              )}
            </span>
          </div>

          {/* Boutons */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || recipeInput.trim().length === 0}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyse en cours...
                </>
              ) : (
                "🔍 Analyser la recette"
              )}
            </button>
            {recipeInput && (
              <button
                type="button"
                className="btn-clear"
                onClick={handleClear}
                disabled={loading}
              >
                Effacer
              </button>
            )}
          </div>

          {/* Messages d'erreur */}
          {error && (
            <div className="error-container">
              <div className="error-message">
                <div className="error-header">
                  ⚠️ {errorDetails?.title || "Erreur"}
                </div>
                <div className="error-text">{error}</div>
                {errorDetails?.details && (
                  <details className="error-details">
                    <summary>Détails techniques</summary>
                    <pre className="error-code">{errorDetails.details}</pre>
                  </details>
                )}
                <button
                  type="button"
                  className="btn-error-retry"
                  onClick={handleRetry}
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Résultats */}
        {recipeResult && !error && (
          <div className="recipe-results">
            <div className="results-card">
              {/* En-tête de la recette */}
              <div className="recipe-header-result">
                <div>
                  <h2 className="recipe-name">{recipeResult.recipeName}</h2>
                  {recipeResult.ingredients.length > 0 && (
                    <p className="recipe-meta">
                      {recipeResult.ingredients.length} ingrédient
                      {recipeResult.ingredients.length > 1 ? "s" : ""} •{" "}
                      {recipeResult.steps.length} étape
                      {recipeResult.steps.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="calories-badge">
                  {recipeResult.totalCalories} cal
                </div>
              </div>

              {/* Ingrédients */}
              <div className="recipe-section">
                <h3 className="section-title">Ingrédients</h3>

                {infoMessage && (
                  <div className="info-banner">
                    <strong>Info:</strong> {infoMessage}
                  </div>
                )}

                {matchesLoading && (
                  <p className="muted">
                    Recherche des produits correspondants...
                  </p>
                )}

                {!matchesLoading && notFoundIngredients.length > 0 && (
                  <div className="not-found-list">
                    <strong>Non trouvés :</strong>
                    <span> {notFoundIngredients.join(", ")}</span>
                  </div>
                )}

                {recipeResult.ingredients.length > 0 ? (
                  <div className="ingredients-grid">
                    {recipeResult.ingredients.map((ingredient, index) => {
                      const prod = matchedProducts[index];
                      const isSearching = matchesLoading && prod === undefined;

                      if (prod) {
                        const code = prod.code ?? prod._id ?? prod.id;
                        const productId = prod._id || prod.id;
                        const nutriscoreLetter = getNutriscoreLetter(prod);
                        const nutriscoreColor = getNutriscoreColor(nutriscoreLetter);

                        return (
                          <div
                            key={index}
                            className="product-card-recipe"
                            onClick={() => setSelectedProductId(productId)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="card-header-recipe">
                              <div
                                className="nutriscore-circle"
                                style={{ backgroundColor: nutriscoreColor }}
                                title={`Nutri-Score ${nutriscoreLetter}`}
                              >
                                {nutriscoreLetter}
                              </div>
                            </div>

                            <div className="product-image-container">
                              <ImageWithLoader
                                code={code}
                                alt={prod.product_name || "produit"}
                                productName={prod.product_name}
                              />
                            </div>

                            <div className="product-info-recipe">
                              <div className="ingredient-tag">
                                {ingredient.name}
                              </div>
                              <div className="product-title">
                                {prod.product_name || prod.name || "—"}
                              </div>
                              {prod.brands && (
                                <div className="product-brand">
                                  {prod.brands}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Affichage pendant le chargement
                      if (isSearching) {
                        return (
                          <div
                            key={index}
                            className="product-card-recipe loading-card"
                          >
                            <div className="loading-content">
                              <div className="image-skeleton"></div>
                              <div className="ingredient-tag">
                                {ingredient.name}
                              </div>
                              <div className="product-title skeleton-text"></div>
                              <div className="product-brand skeleton-text skeleton-short"></div>
                            </div>
                          </div>
                        );
                      }

                      // Affichage pour ingrédients non trouvés après la recherche
                      return (
                        <div
                          key={index}
                          className="product-card-recipe not-found-card"
                        >
                          <div className="not-found-content">
                            <div className="not-found-icon">❌</div>
                            <div className="not-found-text">
                              <strong>{ingredient.name}</strong>
                              <span className="not-found-note">
                                Non trouvé localement
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-data">Aucun ingrédient détecté</p>
                )}
              </div>

              {/* Étapes */}
              {recipeResult.steps.length > 0 ? (
                <div className="recipe-section">
                  <h3 className="section-title">Étapes à suivre</h3>
                  <ol className="steps-list">
                    {recipeResult.steps.map((step, index) => (
                      <li key={index} className="step-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="recipe-section">
                  <h3 className="section-title">Étapes à suivre</h3>
                  <p className="no-data">Aucune étape détectée</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* État vide */}
        {!recipeResult && !loading && !error && (
          <div className="empty-state-main">
            <div className="empty-icon">🥘</div>
            <p className="empty-title">Aucune recette analysée</p>
            <p className="empty-description">
              Entrez une description de recette pour commencer l'analyse
            </p>
          </div>
        )}

        {/* État de chargement */}
        {loading && !recipeResult && (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Analyse de votre recette en cours...</p>
            <p className="loading-subtext">
              L'IA analyse les ingrédients et les calories
            </p>
          </div>
        )}
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
}

export default Recipes;
