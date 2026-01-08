import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../../styles/Connection.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const BASE_URL = "http://127.0.0.1:8000";
      const ENDPOINT = "/api/auth/forgot-password";

      const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de l'envoi du code");
      }

      setMessage("Code envoyé par email !");
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 1500);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="form-card">
        <h1 className="title">Mot de passe oublié</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">Email :</label>
          <input
            type="email"
            className="input"
            placeholder="exemple@domaine.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {message && <p>{message}</p>}

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le code"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
