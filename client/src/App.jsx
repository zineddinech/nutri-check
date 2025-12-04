import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Home from "./Screens/Home";
import Connection from "./Screens/Auth/Connection";
import Products from "./Screens/Products";
import "./styles/Background.css";
import ProductDetail from "./Screens/ProductDetail";
import Register from "./Screens/Auth/Register";
import Favorites from "./Screens/favorites";
import Profil from "./Screens/Auth/Profil";
import ForgotPassword from "./Screens/Auth/ForgotPassword";
import ResetPassword from "./Screens/Auth/ResetPassword";

function App() {
  return (
    <div className="background">
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Connection />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/produits" element={<Products />} />
          <Route path="/produits/:id" element={<ProductDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/Profil" element={<Profil />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
