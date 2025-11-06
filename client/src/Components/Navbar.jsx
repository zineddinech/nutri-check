import { NavLink } from "react-router-dom";
import "./../styles/Navbar.css";

function Navbar() {
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
          Mes courses
        </NavLink>
      </div>

      <div className="nav-right">
        <NavLink to="/login" className="btn btn-dark">
          Connexion
        </NavLink>
        <NavLink to="/register" className="btn btn-light">
          Inscription
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
