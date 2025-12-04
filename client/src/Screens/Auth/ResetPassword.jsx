import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "./../../styles/Connection.css";

function ResetPassword() {
  const navigate = useNavigate();

  const location = useLocation();
  const email = location.state?.email;
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const BASE_URL = "http://127.0.0.1:8000";
      const ENDPOINT = "/api/auth/reset-password";

      const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          code: code,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erreur de réinitialisation");
      }

      setMessage("Mot de passe modifié avec succès !");
      setTimeout(() => {
        navigate("/login");
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
        <h1 className="title">Nouveau mot de passe</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">Code reçu par email :</label>
          <input
            type="text"
            className="input"
            placeholder="Ex: 845921"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />

          <label className="label">Nouveau mot de passe :</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {message && <p>{message}</p>}

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Validation..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
