import React from "react";

export default function StepPassword({
  password, confirm, setPassword, setConfirm,
  onPrev, onSubmit, loading
}) {
  const match = password.length >= 8 && password === confirm;

  const submit = (e) => {
    e.preventDefault();
    if (match) onSubmit();
  };

  return (
    <form className="form" onSubmit={submit}>
      {/* Bloc centré */}
      <div className="form-stack">
        <label htmlFor="password" className="label">Mot de passe :</label>
        <input
          id="password"
          type="password"
          className="input input--fixed"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div style={{ fontSize: 13, minHeight: 18, color: match ? "var(--ok, #3c763d)" : "#b71c1c" }}>
          {password.length > 0 && password.length < 8 && "Les mots de passe ne correspondent pas (min. 8 caractères)."}
        </div>

        <label htmlFor="confirm" className="label">Confirmer le mot de passe :</label>
        <input
          id="confirm"
          type="password"
          className="input input--fixed"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div style={{ fontSize: 13, minHeight: 18, color: match ? "var(--ok, #3c763d)" : "#b71c1c" }}>
          {password.length > 0 && (match ? "OK" : "Les mots de passe ne correspondent pas.")}
        </div>
      </div>

        <div
            className="form-footer form-footer--narrow"
            style={{ gap: 12 }}   // tu peux laisser seulement le gap ici ou tout passer en CSS
            >
            <button type="button" className="next-button" onClick={onPrev}>Précédent</button>
            <button type="submit" className="next-button" disabled={!match || loading}>
                {loading ? "..." : "Terminer"}
            </button>
        </div>

    </form>
  );
}
