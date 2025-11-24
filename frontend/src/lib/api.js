const API_BASE = import.meta?.env?.VITE_API_BASE || "";

export async function api(path, { method = "GET", token, body } = {}) {
  const url = (API_BASE || "") + path; // path doit commencer par /
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Réponses sans corps
  if (res.status === 204 || res.status === 205 || res.status === 304) {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return null;
  }

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");

  // Essaie JSON, sinon texte
  let data;
  try {
    data = isJSON ? await res.json() : await res.text();
  } catch {
    data = null; // pas grave, on gère juste après
  }

  if (!res.ok) {
    const msg = isJSON
      ? (data && (data.error?.message || data.error || data.message)) || `${res.status} ${res.statusText}`
      : (typeof data === "string" && data) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return isJSON ? data : { ok: true, data };
}
