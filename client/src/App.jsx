import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Home from "./Screens/Home";
import Connection from "./Screens/Auth/Connection";
import Products from "./Screens/Products";
import "./Screens_CSS/Background.css";
import ProductDetail from "./Screens/ProductDetail";

function App() {
  return (
    <div className="background">
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Connection />} />
          <Route path="/produits" element={<Products />} />
          <Route path="/produits/:id" element={<ProductDetail />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
