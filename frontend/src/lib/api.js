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

export async function uploadFile(token, file) {
  const url = (API_BASE || "") + "/api/upload";
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  const isJSON = res.headers.get("content-type")?.includes("application/json");
  let data;
  try {
    data = isJSON ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = isJSON
      ? (data && (data.error?.message || data.error || data.message)) || `${res.status} ${res.statusText}`
      : (typeof data === "string" && data) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

// === Gestion des contacts ===
export async function getContacts(token) {
  return api("/api/contacts", { token });
}

export async function addContact(token, contactId) {
  return api("/api/contacts", { method: "POST", token, body: { contact_id: contactId } });
}

export async function removeContact(token, contactId) {
  return api(`/api/contacts/${contactId}`, { method: "DELETE", token });
}

export async function blockContact(token, contactId) {
  return api(`/api/contacts/${contactId}/block`, { method: "POST", token });
}

export async function unblockContact(token, contactId) {
  return api(`/api/contacts/${contactId}/unblock`, { method: "POST", token });
}

// === Gestion des sessions ===
export async function getSessions(token) {
  return api("/api/users/sessions", { token });
}

export async function deleteSession(token, sessionId) {
  return api(`/api/users/sessions/${sessionId}`, { method: "DELETE", token });
}

// === Suppression de compte ===
export async function deleteAccount(token) {
  return api("/api/users/account", { method: "DELETE", token });
}
