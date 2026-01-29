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

export function getConnectedUser() {
  const url = `${API_BASE}/api/auth?token=${
    localStorage.getItem("jwtToken") || ""
  }`;
  return fetchJson(url);
}
export function addAllergy(userId, allergies) {
  const url = `${API_BASE}/api/users/${userId}/allergies`;

  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwtToken") || ""}`,
    },
    body: JSON.stringify(allergies), // Ex: ["gluten"]
  });
}
export function removeAllergy(userId, allergies) {
  const url = `${API_BASE}/api/users/${userId}/allergies`;

  return fetchJson(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwtToken") || ""}`,
    },
    body: JSON.stringify(allergies), // Ex: ["gluten"]
  });
}

export function addCountry(userId, countries) {
  const url = `${API_BASE}/api/users/${userId}/countries`;

  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwtToken") || ""}`,
    },
    body: JSON.stringify(countries),
  });
}
export function removeCountry(userId, countries) {
  const url = `${API_BASE}/api/users/${userId}/countries`;

  return fetchJson(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwtToken") || ""}`,
    },
    body: JSON.stringify(countries),
  });
}
