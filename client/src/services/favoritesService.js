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

export function addFavorite(user_id, product_id) {
  const url = `${API_BASE}/api/favorites/`;
  const body = {
    user_id,
    product_id,
  };
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getUserFavorites(user_id) {
  const url = `${API_BASE}/api/favorites/user/${encodeURIComponent(user_id)}`;
  console.log("Appel getUserFavorites avec URL:", url);
  return fetchJson(url).then(data => {
    console.log("Réponse getUserFavorites:", data);
    return data;
  });
}

export function removeFavorite(user_id, product_id) {
  const url = `${API_BASE}/api/favorites/${encodeURIComponent(
    user_id
  )}/${encodeURIComponent(product_id)}`;
  fetchJson(url, {
    method: "DELETE",
  });
}