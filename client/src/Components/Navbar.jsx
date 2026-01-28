import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./../styles/Navbar.css";
import { getConnectedUser } from "../services/authService";
import ProfileModal from "../Screens/ProfileModal";

function Navbar() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      const token = localStorage.getItem("jwtToken");
      if (token) {
        try {
          const userData = await getConnectedUser();
          setUser(userData);
          setIsConnected(true);
        } catch (error) {
          console.error("Erreur récupération utilisateur:", error);
          setIsConnected(false);
          setUser(null);
        }
      } else {
        setIsConnected(false);
        setUser(null);
      }
    };

    checkConnection();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    setIsConnected(false);
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-center">
        <NavLink
          to="/"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Accueil
        </NavLink>

        <NavLink
          to="/produits"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Produits
        </NavLink>

        <NavLink
          to="/favorites"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Mes favoris
        </NavLink>

        <NavLink
          to="/recipes"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Recettes
        </NavLink>
      </div>

      <div className="nav-right">
        {isConnected ? (
          <>
            <button
              onClick={() => setShowProfileModal(true)}
              className="nav-link profil-link"
            >
              👤 {user?.username || "Profil"}
            </button>
            <button onClick={handleLogout} className="btn btn-logout">
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn-dark">
              Connexion
            </NavLink>
            <NavLink to="/register" className="btn btn-light">
              Inscription
            </NavLink>
          </>
        )}
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </nav>
  );
}

export default Navbar;
