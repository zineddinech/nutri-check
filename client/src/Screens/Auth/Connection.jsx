import React, { useState } from "react";
import "./../../Screens_CSS/Connection.css";

function Conn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formData = new URLSearchParams();
  formData.append("username", email.trim());
  formData.append("password", password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const BASE_URL = "http://127.0.0.1:8000";
      const ENDPOINT = "/api/users/login";

      const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        console.log(response.body.values);

        throw new Error(`Erreur ${response.status} : ${response.statusText}`);
      }

      const data = await response.json();

      if (data) {
        localStorage.setItem("jwtToken", data.jwt_token);
      }
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
          <label htmlFor="email" className="label">
            Email :
          </label>
          <input
            id="email"
            type="email"
            name="username"
            className="input"
            placeholder="exemple@domaine.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password" className="label">
            Mot de passe :
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="actions">
            <a href="#forgot" className="forgot">
              Mot de passe oublié ?
            </a>
          </div>

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Conn;
