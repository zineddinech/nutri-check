import React from "react";

function RestrictionRow({ value, onChange, onRemove }) {
  const TYPES = ["Allergie", "Régime"]; // TODO: venir de l’API plus tard
  const ALLERGIES = ["Arachide", "Lait", "Gluten", "Œuf", "Fruits à coque"];
  const REGIMES   = ["Végétarien", "Vegan", "Sans gluten", "Halal", "Casher"];

  const listForType = value.type === "Allergie" ? ALLERGIES
                    : value.type === "Régime"   ? REGIMES
                    : [];

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    onChange({ ...value, type: nextType, item: "" });
    e.target.blur(); // ⬅️ enlève le focus après sélection
  };

  const handleItemChange = (e) => {
    const nextItem = e.target.value;
    onChange({ ...value, item: nextItem });
    e.target.blur(); // ⬅️ enlève le focus après sélection
  };

  return (
    <div className="row" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <select
          className="input large"
          value={value.type || ""}
          onChange={handleTypeChange}
        >
          <option value="" disabled>Type</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ flex: 2 }}>
        <select
          className="input large"
          value={value.item || ""}
          onChange={handleItemChange}
          disabled={!value.type}
        >
          <option value="" disabled>
            {value.type ? `Sélectionner ${value.type.toLowerCase()}` : "—"}
          </option>
          {listForType.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <button
        type="button"
        className="button danger"
        onClick={onRemove}
        title="Supprimer"
        style={{ height: 44, padding: "0 12px" }}
      >
        ✕
      </button>
    </div>
  );
}

export default function StepRestrictions({ restrictions, setRestrictions, onPrev, onNext }) {
  const addRestriction = () =>
    setRestrictions([...restrictions, { type: "", item: "" }]);

  const updateRestriction = (idx, nextVal) => {
    const copy = restrictions.slice();
    copy[idx] = nextVal;
    setRestrictions(copy);
  };

  const removeRestriction = (idx) => {
    const copy = restrictions.slice();
    copy.splice(idx, 1);
    setRestrictions(copy);
  };

  // Autorise la suite si chaque entrée est vide OU bien complète (type+item)
  const canNext = restrictions.every(r => !r.type || (r.type && r.item));

  return (
    <div className="form">
      <div className="form">
        {/* Colonne commune : liste + bouton + */}
        <div className="restrictions-col">
          {/* Liste des restrictions */}
          <div className="restrictions-list">
            {restrictions.map((r, idx) => (
              <RestrictionRow
                key={idx}
                value={r}
                onChange={(val) => updateRestriction(idx, val)}
                onRemove={() => removeRestriction(idx)}
              />
            ))}
          </div>

          {/* Bouton + */}
          <div className="restrictions-add">
            <button
              type="button"
              className="button"
              onClick={addRestriction}
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
                lineHeight: 1
              }}
              title="Ajouter une restriction"
            >
              +
            </button>
          </div>
        </div>

        <div className="form-footer form-footer--narrow" style={{ gap: 12 }}>
          <button type="button" className="next-button" onClick={onPrev}>Précédent</button>
          <button type="button" className="next-button" onClick={onNext} disabled={!canNext}>Suivant</button>
        </div>
      </div>
    </div>
  );
}
