import React, { useRef } from "react";

export default function StepPersonal({
  lastName, firstName, email,
  setLastName, setFirstName, setEmail,
  onNext, loading
}) {
  const formRef = useRef(null);

  const onSubmit = (e) => {
    e.preventDefault();         // ne s’exécutera que si le form est valide
    onNext();
  };

  return (
    <form ref={formRef} className="form" onSubmit={onSubmit}>
      <label htmlFor="lastName" className="label">Nom :</label>
      <input
        id="lastName"
        type="text"
        className="input large"
        placeholder="Votre nom"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
      />

      <label htmlFor="firstName" className="label">Prénom :</label>
      <input
        id="firstName"
        type="text"
        className="input large"
        placeholder="Votre prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
      />

      <label htmlFor="email" className="label">Email :</label>
      <input
        id="email"
        type="email"
        className="input large"
        placeholder="exemple@domaine.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <div className="form-footer">
        {/* IMPORTANT : type="submit" et PAS disabled */}
        <button type="submit" className="next-button" aria-busy={loading}>
          {loading ? "..." : "Suivant"}
        </button>
      </div>
    </form>
  );
}
