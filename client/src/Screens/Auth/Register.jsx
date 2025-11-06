import React, { useState } from "react";
import "./../../styles/Register.css";

import StepPersonal from "./steps/StepPersonal";
import StepRestrictions from "./steps/StepRestrictions";
import StepPassword from "./steps/StepPassword";

function Register() {
  const [step, setStep] = useState(1);

  // Étape 1
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Étape 2
  const [restrictions, setRestrictions] = useState([]); // [{ type: "Allergie"|"Régime", item: "…" }]

  // Étape 3
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);

  const goNext = () => setStep((s) => Math.min(3, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    if (password !== confirm || password.length < 8) return;
    setLoading(true);

    // TODO: remplacer par ton appel d’API d’inscription
    const payload = {
      lastName,
      firstName,
      email,
      restrictions: restrictions.filter(r => r.type && r.item),
      password
    };
    console.log("SUBMIT REGISTER", payload);

    try {
      // ex:
      // const res = await fetch(`${API_URL}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      // if (!res.ok) throw new Error("Bad status");
      alert("Inscription terminée ✅ (TODO: appel API)");
    } catch (e) {
      alert("Erreur d’inscription (à brancher sur l’API).");
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
            restrictions={restrictions}
            setRestrictions={setRestrictions}
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
          />
        )}
      </div>
    </div>
  );
}

export default Register;
