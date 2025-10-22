import React, { useState, useEffect } from "react";
import "./../Screens_CSS/Products.css";
import "./../Screens_CSS/Background.css";
import { getProductsByIndex } from "../services/productService";

function Products() {
  const [sort, setSort] = useState("nutriscore_score_asc");
  const [filter, setFilter] = useState(false);
  const [images, setImages] = useState({});
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1); // nouvel état pour l'index/page

  // Récupérer les produits depuis l'API (pagination côté serveur)
  useEffect(() => {
    async function load() {
      try {
        const data = await getProductsByIndex(sort, page);
        const arr = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];
        setProducts(arr);
      } catch {
        setProducts([]);
      }
    }
    load();
  }, [sort, page]);

  // Récupérer les images depuis OpenFoodFacts (indexées par id réel)
  useEffect(() => {
    products.forEach((product) => {
      const id = product._id ?? product.id; // clé unique renvoyée par l'API
      const name = product.product_name ?? product.name ?? "";
      if (!id || images[id] || !name) return;

      fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          name
        )}&search_simple=1&action=process&json=1&page_size=1`
      )
        .then((res) => res.json())
        .then((data) => {
          const img =
            data?.products && data.products[0]
              ? data.products[0].image_front_url || ""
              : "";
          setImages((prev) => ({ ...prev, [id]: img }));
        })
        .catch(() => {
          setImages((prev) => ({ ...prev, [id]: "" }));
        });
    });
  }, [products, images]);

  // Tri robuste : tient compte des champs numériques/texte et valeurs manquantes
  const sortedProducts = [...products].sort((a, b) => {
    // helper getters
    const getName = (p) => (p.product_name ?? p.name ?? "").toString();
    const getNutriNumber = (p) => {
      const v = p.nutriscore_score ?? p.nutriscore;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const getDate = (
      p,
      keyCandidates = ["addedAt", "added_at", "createdAt"]
    ) => {
      for (const k of keyCandidates) if (p[k]) return new Date(p[k]);
      return null;
    };

    if (sort.includes("nutriscore")) {
      const na = getNutriNumber(a);
      const nb = getNutriNumber(b);
      if (na === null && nb === null)
        return getName(a).localeCompare(getName(b));
      if (na === null) return 1;
      if (nb === null) return -1;
      return na - nb; // asc -> meilleur (plus petit) en premier
    }

    if (sort === "added") {
      const da = getDate(a, ["addedAt", "added_at", "createdAt"]);
      const db = getDate(b, ["addedAt", "added_at", "createdAt"]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da; // plus récent d'abord
    }

    if (sort === "updated") {
      const da = getDate(a, ["updatedAt", "updated_at"]);
      const db = getDate(b, ["updatedAt", "updated_at"]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    }

    // fallback : tri par nom
    return getName(a).localeCompare(getName(b));
  });

  // Filtrage sécurisé (compatibility peut ne pas exister)
  const displayedProducts = filter
    ? sortedProducts.filter((p) => {
        const comp = p.compatibility ?? p.compatibility_score ?? 0;
        return Number(comp) >= 50;
      })
    : sortedProducts;

  return (
    <div className="background">
      <div className="products-container">
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__text">Aucun produit disponible</div>
          </div>
        ) : (
          <>
            <div className="products-toolbar">
              <div className="toolbar-left">
                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={filter}
                    onChange={() => setFilter((s) => !s)}
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
                  <option value="nutriscore_score_asc">
                    Produits avec meilleur Nutri-Score
                  </option>
                  <option value="added">Produits récemment ajoutés</option>
                  <option value="updated">Produits récemment modifiés</option>
                </select>
              </div>
            </div>

            {/* zone scrollable contenant la grille */}
            <div className="products-main">
              {displayedProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__text">
                    Aucun produit disponible
                  </div>
                </div>
              ) : (
                <div className="products-grid">
                  {displayedProducts.map((product) => {
                    const id =
                      product._id ??
                      product.id ??
                      Math.random().toString(36).slice(2);
                    const name = product.product_name ?? product.name ?? "—";
                    const nutri =
                      product.nutriscore_score ?? product.nutriscore ?? "—";
                    const imageUrl =
                      images[id] ??
                      product.image ??
                      "https://via.placeholder.com/150";

                    return (
                      <div className="product-card" key={id}>
                        <div className="compatibility">
                          Compatible à{" "}
                          {product.compatibility ??
                            product.compatibility_score ??
                            "—"}
                          %
                        </div>
                        <img
                          src={imageUrl}
                          alt={name}
                          className="product-image"
                        />
                        <div className="product-title">{name}</div>
                        <div className="nutriscore">Nutri-Score: {nutri}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Boutons page : précédent (<-) à gauche et suivant (->) à droite */}
      <button
        className="page-arrow page-arrow-prev"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        aria-label="Page précédente"
        title="Page précédente"
      >
        {"<"}
      </button>

      <button
        className="page-arrow page-arrow-next"
        onClick={() => setPage((p) => p + 1)}
        aria-label="Page suivante"
        title="Page suivante"
      >
        {">"}
      </button>
    </div>
  );
}

export default Products;
