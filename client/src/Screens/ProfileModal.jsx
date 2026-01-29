import React, { useState, useRef, useEffect } from "react";
import "./../styles/ProfileModal.css";
import "./../styles/ProductDetailModal.css";
import {
  getConnectedUser,
  addAllergy,
  removeAllergy,
  addCountry,
  removeCountry,
} from "../services/authService";
import translations from "../translations/translations.json";

const CURRENT_LOCALE = "fr";
const translateAllergy = (englishName) =>
  translations[CURRENT_LOCALE]?.[englishName] || englishName;

function ProfileModal({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allergies
  const [newAllergy, setNewAllergy] = useState("");
  const [allergySuggestions, setAllergySuggestions] = useState([]);
  const [showAllergyDropdown, setShowAllergyDropdown] = useState(false);
  const [loadingAllergySuggestions, setLoadingAllergySuggestions] = useState(false);
  const allergyDropdownRef = useRef(null);

  // Countries
  const [newCountry, setNewCountry] = useState("");
  const [countrySuggestions, setCountrySuggestions] = useState([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountrySuggestions, setLoadingCountrySuggestions] = useState(false);
  const countryDropdownRef = useRef(null);

  // Charger l'utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userData = await getConnectedUser();
        setUser(userData);
      } catch (error) {
        console.error("Erreur chargement utilisateur:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Recherche d'allergies
  useEffect(() => {
    if (!newAllergy.trim()) {
      setAllergySuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoadingAllergySuggestions(true);
        const res = await fetch(
          `http://localhost:8000/api/profil/getAllergiesByName?query=${encodeURIComponent(
            newAllergy.trim()
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        let list = Array.isArray(data)
          ? data
          : Array.isArray(data?.allergies)
          ? data.allergies
          : [];
        const taken = new Set(
          (user?.allergies || []).map((a) => a.toLowerCase())
        );
        const filtered = Array.from(new Set(list))
          .filter(Boolean)
          .filter((x) => !taken.has(x.toLowerCase()));
        setAllergySuggestions(filtered);
        setShowAllergyDropdown(true);
      } catch (e) {
        // silencieux si abort ou erreur
      } finally {
        setLoadingAllergySuggestions(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [newAllergy, user]);

  // Recherche de pays
  useEffect(() => {
    if (!newCountry.trim()) {
      setCountrySuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoadingCountrySuggestions(true);
        const res = await fetch(
          `http://localhost:8000/api/profil/getCountriesByName?query=${encodeURIComponent(
            newCountry.trim()
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const taken = new Set(
          (user?.countries || []).map((c) => c.toLowerCase())
        );
        const filtered = Array.from(new Set(list))
          .filter(Boolean)
          .filter((x) => !taken.has(x.toLowerCase()));
        setCountrySuggestions(filtered);
        setShowCountryDropdown(true);
      } catch (e) {
        // silencieux si abort ou erreur
      } finally {
        setLoadingCountrySuggestions(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [newCountry, user]);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    function onDocClick(e) {
      if (
        allergyDropdownRef.current &&
        !allergyDropdownRef.current.contains(e.target)
      )
        setShowAllergyDropdown(false);
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target)
      )
        setShowCountryDropdown(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handlers allergies
  const handleAddAllergyFromList = async (name) => {
    const updatedUser = await addAllergy(user._id, [name]);
    setUser(updatedUser);
    setNewAllergy("");
    setAllergySuggestions([]);
    setShowAllergyDropdown(false);
  };

  const handleRemoveAllergy = async (name) => {
    const updatedUser = await removeAllergy(user._id, [name]);
    setUser(updatedUser);
  };

  // Handlers pays
  const handleAddCountry = async (name) => {
    const updatedUser = await addCountry(user._id, [name]);
    setUser(updatedUser);
    setNewCountry("");
    setCountrySuggestions([]);
    setShowCountryDropdown(false);
  };

  const handleRemoveCountry = async (name) => {
    const updatedUser = await removeCountry(user._id, [name]);
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="modal-content profile-modal">
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="modal-content profile-modal">
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h2 className="error-title">Erreur</h2>
            <p className="error-text">Impossible de charger le profil</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content profile-modal">
        <button className="modal-close-button" onClick={onClose}>
          ✕
        </button>

        <div className="profile-modal-content">
          {/* En-tête du profil */}
          <div className="profile-header">
            <div className="profile-avatar">
              👤
            </div>
            <div className="profile-title-section">
              <h1 className="profile-name">{user.username || "Utilisateur"}</h1>
              <p className="profile-email">{user.email || ""}</p>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="profile-section">
            <h2 className="section-title">📋 Informations personnelles</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Prénom</span>
                <span className="info-value">{user.first_name || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Nom</span>
                <span className="info-value">{user.last_name || "—"}</span>
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
            </div>
          </div>

          {/* Allergies */}
          <div className="profile-section">
            <h2 className="section-title">🚫 Allergies et intolérances</h2>

            <div ref={allergyDropdownRef} className="input-wrapper">
              <input
                type="text"
                className="profile-input"
                placeholder="Rechercher une allergie…"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onFocus={() => setShowAllergyDropdown(true)}
              />

              {showAllergyDropdown && newAllergy.trim() && (
                <div className="dropdown">
                  {loadingAllergySuggestions && (
                    <div className="dropdown-item">Recherche…</div>
                  )}
                  {!loadingAllergySuggestions &&
                    allergySuggestions.map((s) => (
                      <button
                        key={s}
                        className="dropdown-item-btn"
                        onClick={() => handleAddAllergyFromList(s)}
                      >
                        {translateAllergy(s)}
                      </button>
                    ))}
                  {!loadingAllergySuggestions &&
                    allergySuggestions.length === 0 && (
                      <div className="dropdown-item">Aucun résultat</div>
                    )}
                </div>
              )}
            </div>

            <div className="tags-list">
              {user.allergies?.length > 0 ? (
                user.allergies.map((a) => (
                  <div key={a} className="tag">
                    ⚠️ {translateAllergy(a)}
                    <button
                      className="tag-remove-btn"
                      onClick={() => handleRemoveAllergy(a)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-items">Aucune allergie enregistrée</p>
              )}
            </div>
          </div>

          {/* Pays */}
          <div className="profile-section">
            <h2 className="section-title">🌍 Pays associés</h2>

            <div ref={countryDropdownRef} className="input-wrapper">
              <input
                type="text"
                className="profile-input"
                placeholder="Rechercher un pays…"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                onFocus={() => setShowCountryDropdown(true)}
              />

              {showCountryDropdown && newCountry.trim() && (
                <div className="dropdown">
                  {loadingCountrySuggestions && (
                    <div className="dropdown-item">Recherche…</div>
                  )}
                  {!loadingCountrySuggestions &&
                    countrySuggestions.map((c) => (
                      <button
                        key={c}
                        className="dropdown-item-btn"
                        onClick={() => handleAddCountry(c)}
                      >
                        {c}
                      </button>
                    ))}
                  {!loadingCountrySuggestions &&
                    countrySuggestions.length === 0 && (
                      <div className="dropdown-item">Aucun résultat</div>
                    )}
                </div>
              )}
            </div>

            <div className="tags-list">
              {user.countries?.length > 0 ? (
                user.countries.map((c) => (
                  <div key={c} className="tag country">
                    🌎 {c}
                    <button
                      className="tag-remove-btn"
                      onClick={() => handleRemoveCountry(c)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-items">Aucun pays enregistré</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
