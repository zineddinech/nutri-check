import React, { useState } from "react";
import "./../../Screens_CSS/Connection.css";

function Conn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

 const handleSubmit = async (e) => {
    try {
      // ✅ IP, port et route facilement modifiables ici
      const BASE_URL = "http://192.168.1.100:8080";
      const ENDPOINT = "/profile/login";

      const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} : ${response.statusText}`);
      }

      const data = await response.json();

      // Exemple de traitement : si le champ est bon on valide on le stocke et on recharge sinon rien
      
    } catch (err) {
      console.error("Erreur lors de la requête :", err);
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="form-card">
        <h1 className="title">Connexion</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="email" className="label">Email :</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="exemple@domaine.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password" className="label">Mot de passe :</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="actions">
            <a href="#forgot" className="forgot">Mot de passe oublié ?</a>
          </div>

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}</button>
        </form>
      </div>
    </div>
  );
}

export default Conn;
