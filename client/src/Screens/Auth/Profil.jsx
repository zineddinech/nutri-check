import React, { useState, useRef,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Profil.css";
import "../../styles/Background.css";
import { getConnectedUser,addAllergy, removeAllergy } from "../../services/authService";
import translations from "../../translations/translations.json";

const CURRENT_LOCALE = "fr";

const t = (englishName) => {
  return translations[CURRENT_LOCALE]?.[englishName] || englishName;
};

const translateAllergy = (englishName) => t(englishName);

function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAllergy, setNewAllergy] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [updating, setUpdating] = useState(false);
  const dropdownRef = useRef(null);
useEffect(() => {
  if (!newAllergy.trim()) {
    setSuggestions([]);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(async () => {
    try {
      setLoadingSuggestions(true);

      const res = await fetch(
        `http://localhost:8000/api/profil/getAllergiesByName?query=${encodeURIComponent(newAllergy.trim())}`,
        { signal: controller.signal }
      );

      const data = await res.json();
      let list = [];

      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.allergies)) list = data.allergies;

      const taken = new Set((user.allergies || []).map(a => a.toLowerCase()));

      const filtered = Array.from(new Set(list))
        .filter(Boolean)
        .filter(x => !taken.has(x.toLowerCase()));

      setSuggestions(filtered);
      setShowSuggestions(true);
    } catch {}
    finally {
      setLoadingSuggestions(false);
    }
  }, 250);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [newAllergy, user]);
useEffect(() => {
  function handleClickOutside(event) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowSuggestions(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);
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
const handleAddAllergyFromList = async (name) => {
  const updatedUser = await addAllergy(user._id, [name]);
  setUser(updatedUser);
  setNewAllergy("");
  setSuggestions([]);
  setShowSuggestions(false);
};
const handleRemoveAllergy = async (name) => {
  const updatedUser = await removeAllergy(user._id, [name]);
  setUser(updatedUser);
};
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