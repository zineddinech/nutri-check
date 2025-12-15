import React, { useEffect, useMemo, useRef, useState } from "react";
import translations from "../../../translations/translations.json";

const BASE_URL = "http://localhost:8000";
const ENDPOINT_ALLERGIES = "/api/profil/getAllergiesByName"; // ?query=...

const CURRENT_LOCALE = "fr";

const t = (englishName) => translations[CURRENT_LOCALE]?.[englishName] || englishName;
const translateAllergy = (englishName) => t(englishName);

// Pour matcher "Oeufs" vs "Œufs", accents, casse, etc.
const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Thème inline
const TEXT = "#111";
const BG = "#fff";
const BORDER = "#e5e7eb";
const PLACEHOLDER = "#6b7280";
const DANGER = "#dc2626";

// ---- Une ligne (Allergie avec autosuggest | Régime placeholder) ----
function RestrictionRow({
  row,
  index,
  onChangeRow, // ({ id, type, value, draft }) -> parent
  onRemoveRow,
  takenAllergies, // Set lowercased des allergies confirmées ailleurs (EN)
  frToEn,
  localAllergyEntries,
}) {
  const TYPES = ["Allergie", "Régime"];
  const [draft, setDraft] = useState(row.type === "Allergie" ? (row.draft ?? row.value ?? "") : "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]); // [{ en, label }]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const sharedFieldStyle = { color: TEXT, background: BG, borderColor: BORDER };

  const isDraftConfirmed = useMemo(() => {
    if (row.type !== "Allergie") return true;
    const d = draft.trim();
    if (!d) return true;
    if (!row.value) return false;

    const en = row.value;              // valeur confirmée (EN)
    const fr = translateAllergy(en);   // affichage attendu (FR)
    const dn = norm(d);

    return dn === norm(en) || dn === norm(fr);
  }, [row.type, row.value, draft]);

  const invalid = row.type === "Allergie" && !!draft.trim() && !isDraftConfirmed;

  // sync si parent change type/value/draft
  useEffect(() => {
    if (row.type === "Allergie") {
      const next = row.draft ?? (row.value ? translateAllergy(row.value) : "");
      setDraft(next);

      if (row.value) {
        const dn = norm(next);
        if (dn === norm(row.value) || dn === norm(translateAllergy(row.value))) {
          setOpen(false);
          setSuggestions([]);
        }
      }
    } else {
      setDraft("");
      setOpen(false);
      setSuggestions([]);
    }
  }, [row.type, row.value, row.draft]);

  const onTypeChange = (nextType) => {
    onChangeRow({ ...row, type: nextType, value: "", draft: "" });
    setDraft("");
    setOpen(false);
    setSuggestions([]);
  };

  const onInputChange = (val) => {
    setDraft(val);

    // 1) si ça correspond à un FR exact -> on "confirme" en EN
    const maybeEn = frToEn?.get(norm(val));
    if (maybeEn) {
      onChangeRow({ ...row, draft: val, value: maybeEn });
      setOpen(false);
      setSuggestions([]);
      return;
    }

    // 2) si ça correspond à l'EN exact (ou à sa traduction FR), on garde value
    const sameAsEn = row.value && norm(val) === norm(row.value);
    const sameAsFr = row.value && norm(val) === norm(translateAllergy(row.value));
    onChangeRow({ ...row, draft: val, value: (sameAsEn || sameAsFr) ? row.value : "" });

    setOpen(!!val.trim() && focused);
  };

  const selectAllergy = (englishName) => {
    const frLabel = translateAllergy(englishName);
    onChangeRow({ ...row, type: "Allergie", value: englishName, draft: frLabel });
    setDraft(frLabel);
    setSuggestions([]);
    setOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  // fetch suggestions (debounce) uniquement si Allergie + focus
  useEffect(() => {
    if (row.type !== "Allergie" || !focused) return;

    const q = draft.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      setErr("");
      return;
    }

    // si c'est un match FR exact -> on n'a pas besoin d'ouvrir la liste
    const exactEn = frToEn?.get(norm(q));
    if (exactEn) {
      setSuggestions([]);
      setOpen(false);
      setErr("");
      return;
    }

    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setErr("");

        const token = localStorage.getItem("jwtToken") || "";
        const url = `${BASE_URL}${ENDPOINT_ALLERGIES}?query=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: ctl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const pick = (x) => (typeof x === "string" ? x : (x?.name ?? x?.label ?? "")).toString();
        let list = [];
        if (Array.isArray(data)) list = data.map(pick);
        else if (Array.isArray(data?.results)) list = data.results.map(pick);
        else if (Array.isArray(data?.allergies)) list = data.allergies.map(pick);

        const currentEn = (row.value ?? "").toLowerCase();
        const uniqEn = Array.from(new Set(list.filter(Boolean)));

        // API suggestions (EN -> label FR)
        const apiSuggestions = uniqEn
          .filter((en) => {
            const lx = en.toLowerCase();
            return !takenAllergies.has(lx) || lx === currentEn;
          })
          .map((en) => ({ en, label: translateAllergy(en) }));

        // Local suggestions (match sur FR)
        const qn = norm(q);
        const localSuggestions = (localAllergyEntries || [])
          .filter(({ fr }) => norm(fr).includes(qn))
          .filter(({ en }) => {
            const lx = en.toLowerCase();
            return !takenAllergies.has(lx) || lx === currentEn;
          })
          .map(({ en }) => ({ en, label: translateAllergy(en) }));

        // merge + dedup par EN (priorité local)
        const merged = [];
        const seen = new Set();
        for (const s of [...localSuggestions, ...apiSuggestions]) {
          const k = s.en.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(s);
        }

        // si déjà confirmé (draft correspond à value) -> ferme
        if (row.value && (norm(q) === norm(row.value) || norm(q) === norm(translateAllergy(row.value)))) {
          setSuggestions([]);
          setOpen(false);
        } else {
          setSuggestions(merged);
          setOpen(true);
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setErr("Erreur de recherche.");
          setSuggestions([]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [draft, focused, row.type, row.value, takenAllergies, frToEn, localAllergyEntries]);

  // close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="row" style={{ display: "flex", gap: 12, alignItems: "flex-start" }} ref={boxRef}>
      {/* Type */}
      <div style={{ flex: 1 }}>
        <select
          className="input large"
          value={row.type}
          onChange={(e) => onTypeChange(e.target.value)}
          style={sharedFieldStyle}
        >
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
      </div>

      {/* Valeur selon le type */}
      <div style={{ flex: 2, position: "relative" }}>
        {row.type === "Allergie" ? (
          <>
            <style>{`.restrictions-input::placeholder{color:${PLACEHOLDER};}`}</style>
            <input
              ref={inputRef}
              className="input large restrictions-input"
              type="text"
              value={draft}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                const q = draft.trim();
                if (row.value && (norm(q) === norm(row.value) || norm(q) === norm(translateAllergy(row.value)))) {
                  setOpen(false);
                  return;
                }
                setOpen(!!q);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const en = frToEn?.get(norm(draft));
                  if (en) {
                    e.preventDefault();
                    selectAllergy(en);
                  }
                }
              }}
              onBlur={() => {
                const en = frToEn?.get(norm(draft));
                if (en) selectAllergy(en);
              }}
              placeholder="Rechercher une allergie…"
              autoComplete="off"
              style={{
                ...sharedFieldStyle,
                borderColor: invalid ? DANGER : BORDER,
                outline: invalid ? `1px solid ${DANGER}` : "none",
              }}
            />

            {invalid && (
              <div style={{ marginTop: 6, fontSize: 12, color: DANGER }}>
                Sélectionne une allergie dans la liste.
              </div>
            )}

            {open && (
              <div
                role="listbox"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                  zIndex: 20,
                  maxHeight: 280,
                  overflowY: "auto",
                  color: TEXT,
                }}
              >
                {loading && <div style={{ padding: 12, fontSize: 14, color: "#666" }}>Recherche…</div>}
                {!loading && err && <div style={{ padding: 12, fontSize: 14, color: DANGER }}>{err}</div>}

                {!loading && !err && suggestions.length === 0 && draft.trim() !== "" && (
                  <div style={{ padding: 12, fontSize: 14, color: "#666" }}>
                    Aucun résultat pour “{draft.trim()}”.
                  </div>
                )}

                {!loading &&
                  !err &&
                  suggestions.map((s) => (
                    <button
                      key={`${index}-${s.en}`}
                      type="button"
                      onClick={() => selectAllergy(s.en)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "none",
                        background: BG,
                        cursor: "pointer",
                        fontSize: 14,
                        color: TEXT,
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {s.label}
                    </button>
                  ))}
              </div>
            )}
          </>
        ) : (
          <select className="input large" disabled style={sharedFieldStyle}>
            <option>Régime (à venir)</option>
          </select>
        )}
      </div>

      {/* Supprimer */}
      <button
        type="button"
        className="button danger"
        onClick={onRemoveRow}
        title="Supprimer"
        style={{ height: 44, padding: "0 12px" }}
      >
        ✕
      </button>
    </div>
  );
}

// ---- Étape : un seul “+”, mais 2 listes en sortie ----
export default function StepRestrictions({ allergies, setAllergies, regimes, setRegimes, onPrev, onNext }) {
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
    return Object.entries(dict).map(([en, fr]) => ({ en, fr: fr || en }));
  }, []);

  // rows UI unifiées (type choisi par ligne)
  const [rows, setRows] = useState(() => {
    const fromAllergies = (allergies || []).map((v) => ({
      id: crypto.randomUUID(),
      type: "Allergie",
      value: v, // EN
      draft: translateAllergy(v), // FR
    }));
    const fromRegimes = (regimes || []).map((v) => ({ id: crypto.randomUUID(), type: "Régime", value: v, draft: v }));

    return fromAllergies.length || fromRegimes.length
      ? [...fromAllergies, ...fromRegimes]
      : [{ id: crypto.randomUUID(), type: "Allergie", value: "", draft: "" }];
  });

  // allergies confirmées -> Set lowercased EN pour filtrer les doublons dans les suggestions
  const takenAllergies = useMemo(() => {
    const s = new Set();
    (allergies || []).forEach((a) => s.add((a ?? "").toLowerCase()));
    return s;
  }, [allergies]);

  const addRow = () =>
    setRows((rs) => [...rs, { id: crypto.randomUUID(), type: "Allergie", value: "", draft: "" }]);

  const removeRow = (idx) => {
    setRows((rs) => {
      const copy = rs.slice();
      const removed = copy.splice(idx, 1)[0];
      if (copy.length === 0) copy.push({ id: crypto.randomUUID(), type: "Allergie", value: "", draft: "" });

      // purge côté listes
      if (removed?.type === "Allergie" && removed.value) {
        setAllergies((list) => list.filter((x) => (x ?? "").toLowerCase() !== removed.value.toLowerCase()));
      } else if (removed?.type === "Régime" && removed.value) {
        setRegimes((list) => list.filter((x) => (x ?? "").toLowerCase() !== removed.value.toLowerCase()));
      }
      return copy;
    });
  };

  const changeRow = (idx, nextRow) => {
    setRows((rs) => {
      const copy = rs.slice();
      copy[idx] = nextRow;
      return copy;
    });

    // Synchronise les 2 listes de sortie :
    setAllergies((prev) => {
      let out = prev;

      // retirer ancienne valeur si elle était en allergies et qu'on l'a déconfirmée ou changé de type
      if (
        rows[idx]?.type === "Allergie" &&
        rows[idx]?.value &&
        (nextRow.type !== "Allergie" || (nextRow.value ?? "").toLowerCase() !== rows[idx].value.toLowerCase())
      ) {
        out = prev.filter((x) => (x ?? "").toLowerCase() !== rows[idx].value.toLowerCase());
      }

      // ajouter la nouvelle confirmée si Allergie
      if (nextRow.type === "Allergie" && nextRow.value) {
        const exists = out.some((x) => (x ?? "").toLowerCase() === nextRow.value.toLowerCase());
        if (!exists) out = [...out, nextRow.value]; // EN
      }

      // dédup sécurité
      return Array.from(new Set(out.map((x) => (x ?? "").trim()))).filter(Boolean);
    });

    setRegimes((prev) => {
      let out = prev;

      if (
        rows[idx]?.type === "Régime" &&
        rows[idx]?.value &&
        (nextRow.type !== "Régime" || (nextRow.value ?? "").toLowerCase() !== rows[idx].value.toLowerCase())
      ) {
        out = prev.filter((x) => (x ?? "").toLowerCase() !== rows[idx].value.toLowerCase());
      }

      if (nextRow.type === "Régime" && nextRow.value) {
        const exists = out.some((x) => (x ?? "").toLowerCase() === nextRow.value.toLowerCase());
        if (!exists) out = [...out, nextRow.value];
      }

      return Array.from(new Set(out.map((x) => (x ?? "").trim()))).filter(Boolean);
    });
  };

  // Invalid si une ligne Allergie a du texte non confirmé
  const hasInvalid = rows.some((r) => {
    if (r.type !== "Allergie") return false;
    const d = (r.draft ?? "").trim();
    if (!d) return false;
    if (!r.value) return true; // pas confirmé

    const en = r.value;
    const fr = translateAllergy(en);
    const dn = norm(d);
    return !(dn === norm(en) || dn === norm(fr));
  });

  const canNext = !hasInvalid;

  // dédup sécurité globale allergies (EN)
  useEffect(() => {
    if (!allergies?.length) return;
    const seen = new Set();
    const filtered = [];
    let changed = false;
    for (const a of allergies) {
      const k = (a ?? "").toLowerCase();
      if (seen.has(k)) {
        changed = true;
        continue;
      }
      seen.add(k);
      filtered.push(a);
    }
    if (changed) setAllergies(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allergies]);

  return (
    <div className="form">
      <p style={{ marginTop: 0, color: "#666" }}>
        Un seul “+” pour ajouter une ligne. Choisis <b>Allergie</b> ou <b>Régime</b> par ligne. Pour les allergies, tape
        puis sélectionne dans la liste.
      </p>

      <div className="restrictions-list" style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {rows.map((row, idx) => (
          <RestrictionRow
            key={row.id}
            row={row}
            index={idx}
            onChangeRow={(next) => changeRow(idx, next)}
            onRemoveRow={() => removeRow(idx)}
            takenAllergies={takenAllergies}
            frToEn={frToEn}
            localAllergyEntries={localAllergyEntries}
          />
        ))}
      </div>

      <div style={{ marginTop: 12, width: "100%", display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          className="button"
          onClick={addRow}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: "#c8ff95",
            color: "#16be00",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1,
          }}
          title="Ajouter une ligne"
        >
          +
        </button>
      </div>

      <div className="form-footer form-footer--narrow" style={{ gap: 12, marginTop: 20 }}>
        <button type="button" className="next-button" onClick={onPrev}>
          Précédent
        </button>
        <button type="button" className="next-button" onClick={onNext} disabled={!canNext}>
          Suivant
        </button>
      </div>
    </div>
  );
}
