import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Profil.css";
import "../../styles/Background.css";
import {
  getConnectedUser,
  addAllergy,
  removeAllergy,
  addCountry,
  removeCountry,
} from "../../services/authService";
import translations from "../../translations/translations.json";

const CURRENT_LOCALE = "fr";
const translateAllergy = (englishName) =>
  translations[CURRENT_LOCALE]?.[englishName] || englishName;

function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allergies
  const [newAllergy, setNewAllergy] = useState("");
  const [allergySuggestions, setAllergySuggestions] = useState([]);
  const [showAllergyDropdown, setShowAllergyDropdown] = useState(false);
  const [loadingAllergySuggestions, setLoadingAllergySuggestions] =
    useState(false);
  const allergyDropdownRef = useRef(null);

  // Countries
  const [newCountry, setNewCountry] = useState("");
  const [countrySuggestions, setCountrySuggestions] = useState([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountrySuggestions, setLoadingCountrySuggestions] =
    useState(false);
  const countryDropdownRef = useRef(null);

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
  if (!user) return null;

  // allergies handlers
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

  // countries handlers
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

            <div ref={allergyDropdownRef} className="input-wrapper">
              <input
                type="text"
                className="input"
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
              {user.allergies?.map((a) => (
                <div key={a} className="tag">
                  ⚠️ {translateAllergy(a)}
                  <button
                    className="tag-remove-btn"
                    onClick={() => handleRemoveAllergy(a)}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div className="profil-section">
            <h2 className="section-title">🌍 Pays associés</h2>

            <div ref={countryDropdownRef} className="input-wrapper">
              <input
                type="text"
                className="input"
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
              {user.countries?.map((c) => (
                <div key={c} className="tag country">
                  🌎 {c}
                  <button
                    className="tag-remove-btn"
                    onClick={() => handleRemoveCountry(c)}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profil;
