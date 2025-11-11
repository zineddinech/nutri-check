import React, { useState } from "react";
import "./../../styles/Register.css";

import StepPersonal from "./steps/StepPersonal";
import StepRestrictions from "./steps/StepRestrictions";
import StepPassword from "./steps/StepPassword";

const BASE_URL = "http://localhost:8000";

async function apiRegisterUser({ email, first_name, last_name, password }) {
  const payload = {
    email,
    username: email,          // <<--- username = email
    first_name,
    last_name,
    password,
  };

  const res = await fetch(`${BASE_URL}/api/users/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Register failed (HTTP ${res.status}) ${txt}`);
  }
  return res.json(); // { _id, email, username, ... }
}

async function apiAddAllergies(userId, allergies) {
  const res = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(userId)}/allergies`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(allergies), // ex: ["Milk","Sesame seeds"]
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Add allergies failed (HTTP ${res.status}) ${txt}`);
  }
  return res.json();
}

function Register() {
  const [step, setStep] = useState(1);

  // Étape 1
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Étape 2 — deux listes distinctes
  const [allergies, setAllergies] = useState([]); // ex: ["Milk", "Sesame seeds"]
  const [regimes, setRegimes] = useState([]);     // on verra plus tard

  // Étape 3
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const goNext = () => setStep((s) => Math.min(3, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    setSubmitError("");

    // Validation minimale côté mot de passe
    if (password !== confirm || password.length < 8) {
      setSubmitError("Mot de passe invalide (au moins 8 caractères et confirmation identique).");
      return;
    }

    // Validation minimale côté identité
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setSubmitError("Merci de compléter vos informations personnelles.");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      // 1) Register user
      const user = await apiRegisterUser({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      });

      const userId = user?._id || user?.id;
      if (!userId) {
        throw new Error("Register ok mais pas d'_id renvoyé.");
      }

      // 2) Add allergies (si non vide)
      const cleanAllergies = Array.from(
        new Set((allergies || []).map((a) => a && a.toString().trim()).filter(Boolean))
      );
      if (cleanAllergies.length > 0) {
        await apiAddAllergies(userId, cleanAllergies);
      }

      // 3) Stocker l'utilisateur dans le localStorage et notifier l'app
      try {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("user_id", userId);
        localStorage.setItem("user_first_name", user.first_name || "");
        window.dispatchEvent(new Event("auth-changed"));
      } catch {}

      // 4) Success UX
      alert("Inscription terminée");
      // Optionnel: reset du formulaire / retour à l'étape 1
      setStep(1); setEmail(""); setFirstName(""); setLastName("");
      setAllergies([]); setRegimes([]); setPassword(""); setConfirm("");
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      setSubmitError(e.message || "Erreur d’inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="form-card register-card">
        <h1 className="title register-title">
          { step === 1 ? "Inscription" : step === 2 ? "Mes restrictions" : "Mot de passe" }
        </h1>

        {/* Stepper simple */}
        <div className="steps" aria-hidden>
          <div className={`step ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`step ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`step ${step >= 3 ? "active" : ""}`}>3</div>
        </div>

        {step === 1 && (
          <StepPersonal
            lastName={lastName}
            firstName={firstName}
            email={email}
            setLastName={setLastName}
            setFirstName={setFirstName}
            setEmail={setEmail}
            onNext={goNext}
            loading={loading}
          />
        )}

        {step === 2 && (
          <StepRestrictions
            allergies={allergies}
            setAllergies={setAllergies}
            regimes={regimes}
            setRegimes={setRegimes}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === 3 && (
          <StepPassword
            password={password}
            confirm={confirm}
            setPassword={setPassword}
            setConfirm={setConfirm}
            onPrev={goPrev}
            onSubmit={finish}
            loading={loading}
            submitError={submitError}
          />
        )}

        {!!submitError && step === 3 && (
          <div style={{ marginTop: 12, fontSize: 14, color: "#dc2626" }}>{submitError}</div>
        )}
      </div>
    </div>
  );
}

export default Register;
