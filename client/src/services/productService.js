const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson(url, sendAuth = false, opts = {}) {
  const headers = { Accept: "application/json", ...(opts.headers || {}) };

  if (sendAuth) {
    const token = localStorage.getItem("jwtToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export function getProductsByIndex(
  sort_by = "nutriscore_score_desc",
  page = 1,
  page_size = 100,
  filterCompatibility = false
) {
  const url = `${API_BASE}/api/product/getByIndex?sort_by=${encodeURIComponent(
    sort_by
  )}&page=${Number(page)}&page_size=${Number(page_size)}`;
  return fetchJson(url, filterCompatibility);
}

export function getProductsSearched(
  query = "",
  page = 1,
  page_size = 100,
  filterCompatibility = false
) {
  const url = `${API_BASE}/api/product/search?query=${encodeURIComponent(
    query
  )}&page=${Number(page)}&page_size=${Number(page_size)}`;
  return fetchJson(url, filterCompatibility);
}

export function getProductsSearchedByCategory(
  query = "",
  page = 1,
  page_size = 100,
  filterCompatibility = false
) {
  const url = `${API_BASE}/api/product/search/byCategory?query=${encodeURIComponent(
    query
  )}&page=${Number(page)}&page_size=${Number(page_size)}`;
  return fetchJson(url, filterCompatibility);
}

export function getProductById(product_id) {
  const url = `${API_BASE}/api/product/getById/${encodeURIComponent(
    product_id
  )}`;
  return fetchJson(url, false);
}
