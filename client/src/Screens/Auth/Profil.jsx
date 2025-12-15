import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Profil.css";
import "../../styles/Background.css";
import { getConnectedUser, addAllergy, removeAllergy } from "../../services/authService";
import translations from "../../translations/translations.json";

const CURRENT_LOCALE = "fr";

const t = (englishName) => translations[CURRENT_LOCALE]?.[englishName] || englishName;
const translateAllergy = (englishName) => t(englishName);

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // input affiché (FR)
  const [newAllergy, setNewAllergy] = useState("");

  // suggestions = [{ en, label }]
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [updating, setUpdating] = useState(false);

  const dropdownRef = useRef(null);

  const frToEn = useMemo(() => {
    const map = new Map();
    const dict = translations[CURRENT_LOCALE] || {};
    for (const [en, fr] of Object.entries(dict)) {
      map.set(norm(fr), en);
    }
    return map;
  }, []);

  const localAllergyEntries = useMemo(() => {
    const dict = translations[CURRENT_LOCALE] || {};
    // [{ en: "Eggs", fr: "Œufs" }, ...]
    return Object.entries(dict).map(([en, fr]) => ({ en, fr: fr || en }));
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

  // Suggestions (merge local FR + API EN)
  useEffect(() => {
    if (!user) return;

    const qRaw = newAllergy.trim();
    if (!qRaw) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // si match FR exact -> pas besoin de dropdown
    const exactEn = frToEn.get(norm(qRaw));
    if (exactEn) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);

        const taken = new Set((user.allergies || []).map((a) => (a ?? "").toLowerCase()));

        // --- suggestions locales (match sur FR)
        const qn = norm(qRaw);
        const localSuggestions = localAllergyEntries
          .filter(({ fr }) => norm(fr).includes(qn))
          .filter(({ en }) => !taken.has(en.toLowerCase()))
          .map(({ en }) => ({ en, label: translateAllergy(en) }));

        // --- suggestions API (EN)
        const res = await fetch(
          `http://localhost:8000/api/profil/getAllergiesByName?query=${encodeURIComponent(qRaw)}`,
          { signal: controller.signal }
        );

        let apiSuggestions = [];
        if (res.ok) {
          const data = await res.json();
          let list = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data?.allergies)) list = data.allergies;

          const uniqEn = Array.from(new Set(list.filter(Boolean)));

          apiSuggestions = uniqEn
            .filter((en) => !taken.has(en.toLowerCase()))
            .map((en) => ({ en, label: translateAllergy(en) }));
        }

        // merge + dedup (priorité local)
        const merged = [];
        const seen = new Set();
        for (const s of [...localSuggestions, ...apiSuggestions]) {
          const k = s.en.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(s);
        }

        setSuggestions(merged);
        setShowSuggestions(true);
      } catch (e) {
        // ignore AbortError
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [newAllergy, user, frToEn, localAllergyEntries]);

  // click outside
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

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    navigate("/login");
  };

  const handleAddAllergyEnglish = async (englishName) => {
    if (!user?._id || !englishName) return;
    try {
      setUpdating(true);
      const updatedUser = await addAllergy(user._id, [englishName]); // EN envoyé
      setUser(updatedUser);
      setNewAllergy(""); // input FR reset
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveAllergy = async (englishName) => {
    if (!user?._id || !englishName) return;
    try {
      setUpdating(true);
      const updatedUser = await removeAllergy(user._id, [englishName]); // EN
      setUser(updatedUser);
    } finally {
      setUpdating(false);
    }
  };

  const tryConfirmFromFrench = async () => {
    const q = newAllergy.trim();
    if (!q) return;
    const en = frToEn.get(norm(q));
    if (en) {
      await handleAddAllergyEnglish(en);
    }
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

  if (!user) return null;

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

            {/* Input autosuggest */}
            <div ref={dropdownRef} className="allergy-input-wrapper">
              <input
                type="text"
                className="allergy-input"
                placeholder="Rechercher une allergie…"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onFocus={() => {
                  if (newAllergy.trim()) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tryConfirmFromFrench();
                  }
                }}
                onBlur={() => {
                  // si l'utilisateur a tapé exactement un FR connu -> on ajoute
                  tryConfirmFromFrench();
                }}
                disabled={updating}
              />

              {showSuggestions && newAllergy.trim() && (
                <div className="allergy-dropdown">
                  {loadingSuggestions && <div className="dropdown-item">Recherche…</div>}

                  {!loadingSuggestions &&
                    suggestions.map((s) => (
                      <button
                        key={s.en}
                        className="dropdown-item-btn"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()} // évite blur avant click
                        onClick={() => handleAddAllergyEnglish(s.en)}
                        disabled={updating}
                      >
                        {s.label}
                      </button>
                    ))}

                  {!loadingSuggestions && suggestions.length === 0 && (
                    <div className="dropdown-item">Aucun résultat</div>
                  )}
                </div>
              )}
            </div>

            {/* Liste des allergies (stockées en EN, affichées en FR) */}
            <div className="allergies-list">
              {user.allergies?.map((a) => (
                <div key={a} className="allergy-tag">
                  ⚠️ {translateAllergy(a)}
                  <button className="allergy-remove-btn" onClick={() => handleRemoveAllergy(a)} disabled={updating}>
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* (optionnel) bouton logout si tu en avais un ailleurs */}
          {/* <button onClick={handleLogout}>Déconnexion</button> */}
        </div>
      </div>
    </div>
  );
}

export default Profil;
