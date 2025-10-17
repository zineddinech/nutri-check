import { useState, useEffect } from "react";
import "./../Screens_CSS/Products.css";
import "./../Screens_CSS/Background.css";

function Products() {
  const [sort, setSort] = useState("nutriscore");
  const [filter, setFilter] = useState(true);
  const [images, setImages] = useState({});

  const products = [
    {
      id: 1,
      name: "Grandlait",
      compatibility: 80,
      nutriscore: "A",
      addedAt: "2025-10-10",
      updatedAt: "2025-10-12",
    },
    {
      id: 2,
      name: "Lait demi-écrémé",
      compatibility: 60,
      nutriscore: "B",
      addedAt: "2025-10-11",
      updatedAt: "2025-10-13",
    },
    {
      id: 3,
      name: "Lait entier",
      compatibility: 40,
      nutriscore: "C",
      addedAt: "2025-10-09",
      updatedAt: "2025-10-14",
    },
    {
      id: 4,
      name: "Lait bio",
      compatibility: 90,
      nutriscore: "A",
      addedAt: "2025-10-12",
      updatedAt: "2025-10-15",
    },
    {
      id: 5,
      name: "Lait sans lactose",
      compatibility: 70,
      nutriscore: "B",
      addedAt: "2025-10-08",
      updatedAt: "2025-10-16",
    },
  ];

  // Récupérer les images depuis OpenFoodFacts
  useEffect(() => {
    products.forEach((product) => {
      if (!images[product.id]) {
        fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            product.name
          )}&search_simple=1&action=process&json=1&page_size=1`
        )
          .then((res) => res.json())
          .then((data) => {
            const img =
              data.products && data.products[0]
                ? data.products[0].image_front_url
                : "";
            setImages((prev) => ({ ...prev, [product.id]: img }));
          });
      }
    });
    // eslint-disable-next-line
  }, []);

  // Fonction de tri
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "nutriscore") return a.nutriscore.localeCompare(b.nutriscore);
    if (sort === "added") return new Date(b.addedAt) - new Date(a.addedAt);
    if (sort === "updated")
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    return 0;
  });

  // Filtrage selon restrictions (exemple : compatibilité > 50%)
  const displayedProducts = sortedProducts;

  return (
    <div className="background">
      <div className="home">
        <div className="products-toolbar">
          <div className="toolbar-left">
            <label className="filter-label">
              <input
                type="checkbox"
                checked={filter}
                onChange={() => setFilter(!filter)}
                className="filter-checkbox"
              />
              Trier les produits selon mes restrictions
            </label>
          </div>
          <div className="toolbar-right">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="sort-select"
            >
              <option value="nutriscore">
                Produits avec meilleur Nutri-Score
              </option>
              <option value="added">Produits récemment ajoutés</option>
              <option value="updated">Produits récemment modifiés</option>
            </select>
          </div>
        </div>
        <div className="products-grid">
          {displayedProducts.map((product) => (
            <div className="product-card" key={product.id}>
              <div className="compatibility">
                Compatible à {product.compatibility}%
              </div>
              <img
                src={
                  images[product.id]
                    ? images[product.id]
                    : "https://via.placeholder.com/150"
                }
                alt={product.name}
                style={{ height: 120 }}
              />
              <div className="name">{product.name}</div>
              <div className="product-title">{product.name}</div>
              <div className="nutriscore">
                Nutri-Score: {product.nutriscore}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Products;
