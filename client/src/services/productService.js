const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export function getProductsByIndex(sort_by = "nutriscore_score_asc", page = 1) {
  const url = `${API_BASE}/api/product/getByIndex?sort_by=${encodeURIComponent(
    sort_by
  )}&page=${Number(page)}`;
  return fetchJson(url);
}

export function getProductsSearched(query = "", page = 1, page_size = 20) {
  const url = `${API_BASE}/api/product/search?query=${encodeURIComponent(
    query
  )}&page=${Number(page)}&page_size=${Number(page_size)}`;
  return fetchJson(url);
}
