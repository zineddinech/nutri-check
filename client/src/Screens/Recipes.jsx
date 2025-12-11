import React, { useState } from "react";
import "./../styles/Recipes.css";
import "./../styles/Background.css";

function Recipes() {
  const [recipeInput, setRecipeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipeResult, setRecipeResult] = useState(null);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

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
        setError(null);
      } else {
        setError(result.error.message);
        setErrorDetails(result.error);
        setRecipeResult(null);
      }
    } catch (err) {
      setError("Erreur inattendue lors du traitement");
      setErrorDetails(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRecipeInput("");
    setRecipeResult(null);
    setError(null);
    setErrorDetails(null);
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
                  <h2 className="recipe-name">🍲 {recipeResult.recipeName}</h2>
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
              {recipeResult.ingredients.length > 0 ? (
                <div className="recipe-section">
                  <h3 className="section-title">📦 Ingrédients</h3>
                  <div className="ingredients-list">
                    {recipeResult.ingredients.map((ingredient, index) => (
                      <div key={index} className="ingredient-item">
                        <span className="ingredient-name">
                          {ingredient.name}
                        </span>
                        <span className="ingredient-quantity">
                          {ingredient.quantity}
                        </span>
                        <span className="ingredient-calories">
                          {ingredient.calories} cal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="recipe-section">
                  <h3 className="section-title">📦 Ingrédients</h3>
                  <p className="no-data">Aucun ingrédient détecté</p>
                </div>
              )}

              {/* Étapes */}
              {recipeResult.steps.length > 0 ? (
                <div className="recipe-section">
                  <h3 className="section-title">👨‍🍳 Étapes à suivre</h3>
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
                  <h3 className="section-title">👨‍🍳 Étapes à suivre</h3>
                  <p className="no-data">Aucune étape détectée</p>
                </div>
              )}

              {/* Bouton d'action */}
              <div className="recipe-actions">
                <button
                  className="btn-save-recipe"
                  onClick={() => alert("Fonctionnalité à venir")}
                >
                  💾 Sauvegarder la recette
                </button>
                <button
                  className="btn-share-recipe"
                  onClick={() => alert("Fonctionnalité à venir")}
                >
                  📤 Partager
                </button>
              </div>
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
    </div>
  );
}

export default Recipes;
