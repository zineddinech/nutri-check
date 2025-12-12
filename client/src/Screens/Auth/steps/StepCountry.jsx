import React, { useEffect, useMemo, useRef, useState } from "react";

const BASE_URL = "http://localhost:8000";
const ENDPOINT_COUNTRIES = "/api/profil/getCountriesByName"; // ?query=...

// Thème inline identique à StepRestrictions
const TEXT = "#111";
const BG = "#fff";
const BORDER = "#e5e7eb";
const PLACEHOLDER = "#6b7280";
const DANGER = "#dc2626";

// ---------------- ROW ----------------
function CountryRow({ row, index, onChangeRow, onRemoveRow, takenCountries }) {
  const [draft, setDraft] = useState(row.draft ?? row.value ?? "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // sync si parent change
  useEffect(() => {
    const next = row.draft ?? row.value ?? "";
    setDraft(next);
    if (row.value && next.trim().toLowerCase() === row.value.toLowerCase()) {
      setOpen(false);
      setSuggestions([]);
    }
  }, [row.value, row.draft]);

  // autosuggest
  useEffect(() => {
    if (!focused) return;

    const q = draft.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setErr("");

        const url = `${BASE_URL}${ENDPOINT_COUNTRIES}?query=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, { signal: ctl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const list = await res.json(); // liste de strings
        const uniq = Array.from(new Set(list.filter(Boolean)));
        const filtered = uniq.filter((x) => {
          const lx = x.toLowerCase();
          const curr = row.value?.toLowerCase();
          return !takenCountries.has(lx) || lx === curr;
        });

        if (row.value && q.toLowerCase() === row.value.toLowerCase()) {
          setOpen(false);
        } else {
          setSuggestions(filtered);
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
  }, [draft, focused, row.value, takenCountries]);

  // click extérieur → fermer
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) {
        setFocused(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const invalid =
    !!draft.trim() &&
    (!row.value || draft.trim().toLowerCase() !== row.value.toLowerCase());

  const onInputChange = (val) => {
    setDraft(val);
    const same =
      row.value && val.trim().toLowerCase() === row.value.toLowerCase();
    onChangeRow({
      ...row,
      draft: val,
      value: same ? row.value : "",
    });
    setOpen(!!val.trim() && focused);
  };

  const selectCountry = (c) => {
    onChangeRow({ ...row, value: c, draft: c });
    setDraft(c);
    setSuggestions([]);
    setOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="row" style={{ display: "flex", gap: 12 }} ref={boxRef}>
      {/* Input */}
      <div style={{ flex: 1, position: "relative" }}>
        <style>{`.country-input::placeholder{color:${PLACEHOLDER};}`}</style>
        <input
          ref={inputRef}
          className="input large country-input"
          type="text"
          value={draft}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(!!draft.trim());
          }}
          placeholder="Rechercher un pays…"
          autoComplete="off"
          style={{
            color: TEXT,
            background: BG,
            borderColor: invalid ? DANGER : BORDER,
            outline: invalid ? `1px solid ${DANGER}` : "none",
          }}
        />

        {invalid && (
          <div style={{ marginTop: 6, fontSize: 12, color: DANGER }}>
            Sélectionne un pays dans la liste.
          </div>
        )}

        {open && (
          <div
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
            {loading && (
              <div style={{ padding: 12, color: "#666" }}>Recherche…</div>
            )}
            {!loading && err && (
              <div style={{ padding: 12, color: DANGER }}>{err}</div>
            )}
            {!loading &&
              !err &&
              suggestions.length === 0 &&
              draft.trim() !== "" && (
                <div style={{ padding: 12, color: "#666" }}>
                  Aucun résultat pour « {draft.trim()} ».
                </div>
              )}
            {!loading &&
              !err &&
              suggestions.map((s) => (
                <button
                  key={`${index}-${s}`}
                  type="button"
                  onClick={() => selectCountry(s)}
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
                  {s}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        className="button danger"
        onClick={onRemoveRow}
        title="Supprimer"
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ---------------- MAIN ----------------
export default function StepCountry({
  countries,
  setCountries,
  onPrev,
  onNext,
}) {
  const [rows, setRows] = useState(() =>
    (countries || []).length
      ? countries.map((c) => ({
          id: crypto.randomUUID(),
          value: c,
          draft: c,
        }))
      : [{ id: crypto.randomUUID(), value: "", draft: "" }]
  );

  const takenCountries = useMemo(() => {
    const s = new Set();
    (countries || []).forEach((c) => s.add(c.toLowerCase()));
    return s;
  }, [countries]);

  const addRow = () =>
    setRows((rs) => [...rs, { id: crypto.randomUUID(), value: "", draft: "" }]);

  const removeRow = (idx) => {
    setRows((rs) => {
      const copy = rs.slice();
      const removed = copy.splice(idx, 1)[0];
      if (copy.length === 0)
        copy.push({ id: crypto.randomUUID(), value: "", draft: "" });

      if (removed?.value) {
        setCountries((prev) =>
          prev.filter((x) => x.toLowerCase() !== removed.value.toLowerCase())
        );
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

    setCountries((prev) => {
      let out = prev;
      const old = rows[idx]?.value;
      if (old && old.toLowerCase() !== nextRow.value?.toLowerCase()) {
        out = out.filter((x) => x.toLowerCase() !== old.toLowerCase());
      }
      if (nextRow.value) {
        const exists = out.some(
          (x) => x.toLowerCase() === nextRow.value.toLowerCase()
        );
        if (!exists) out = [...out, nextRow.value];
      }
      return Array.from(new Set(out.map((x) => x.trim()))).filter(Boolean);
    });
  };

  const hasInvalid = rows.some(
    (r) =>
      !!(r.draft && r.draft.trim()) &&
      (!r.value || r.draft.trim().toLowerCase() !== r.value.toLowerCase())
  );

  return (
    <div className="form">
      <p style={{ marginTop: 0, color: "#666" }}>
        (Optionnel) Choisis des <b>pays</b> associés à ton profil. Tu pourras
        ainsi filtrer selon la disponibilité des produits dans ces pays.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {rows.map((row, idx) => (
          <CountryRow
            key={row.id}
            row={row}
            index={idx}
            onChangeRow={(next) => changeRow(idx, next)}
            onRemoveRow={() => removeRow(idx)}
            takenCountries={takenCountries}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          width: "100%",
          display: "flex",
          textAlign: "center",
        }}
      >
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
            margin: "0 auto",
          }}
          title="Ajouter un pays"
        >
          +
        </button>
      </div>

      <div className="form-footer form-footer--narrow" style={{ gap: 12 }}>
        <button className="next-button" onClick={onPrev}>
          Précédent
        </button>
        <button className="next-button" onClick={onNext} disabled={hasInvalid}>
          Suivant
        </button>
      </div>
    </div>
  );
}
