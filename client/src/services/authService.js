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
