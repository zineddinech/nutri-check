import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Profil.css";
import "../../styles/Background.css";
import { getConnectedUser } from "../../services/authService";

function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("jwtToken");

        if (!token) {
          navigate("/login");
          return;
        }

        const userData = await getConnectedUser();
        setUser(userData);
      } catch (error) {
        console.error("Erreur chargement utilisateur:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="background">
        <div className="profil-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Chargement de votre profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="background">
      <div className="profil-container">
        <div className="profil-content">
          {/* Informations personnelles */}
          <div className="profil-section">
            <h2 className="section-title">📋 Informations personnelles</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nom d'utilisateur</span>
                <span className="info-value">{user.username || "—"}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user.email || "—"}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Prénom</span>
                <span className="info-value">{user.first_name || "—"}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Nom</span>
                <span className="info-value">{user.last_name || "—"}</span>
              </div>

              <div className="info-item">
                <span className="info-label">ID Utilisateur</span>
                <span className="info-value info-id">{user._id || "—"}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Membre depuis</span>
                <span className="info-value">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Dernière mise à jour</span>
                <span className="info-value">
                  {user.updated_at
                    ? new Date(user.updated_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="profil-section">
            <h2 className="section-title">🚫 Allergies et intolérances</h2>
            {user.allergies && user.allergies.length > 0 ? (
              <div className="allergies-list">
                {user.allergies.map((allergy, index) => (
                  <div key={index} className="allergy-tag">
                    ⚠️ {allergy}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-allergies">
                <p>Aucune allergie renseignée</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profil;
