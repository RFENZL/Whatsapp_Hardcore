const API_BASE = import.meta?.env?.VITE_API_BASE || "";

export async function api(path, { method = "GET", token, body } = {}) {
  const url = (API_BASE || "") + path; // path doit commencer par /
  const headers = {
    "Content-Type": "application/json"
  };
  
  // Support optionnel du token via Authorization header pour compatibilité
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Force no-cache / no-store on API calls to avoid 304 responses from browser caches
  // which break the app flow (we expect fresh JSON each request).
  headers['Cache-Control'] = 'no-store';

  const fetchOpts = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Envoyer les cookies automatiquement
    // ensure the browser does not serve a cached response
    cache: 'no-store'
  };

  const res = await fetch(url, fetchOpts);

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
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include', // Envoyer les cookies
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

// === Groups API ===
export async function getGroup(token, groupId) {
  return api(`/api/groups/${groupId}`, { token });
}

export async function getConversation(token, conversationId) {
  return api(`/api/conversations/${conversationId}`, { token });
}

export async function updateGroup(token, groupId, body) {
  return api(`/api/groups/${groupId}`, { method: 'PUT', token, body });
}

export async function addGroupMembers(token, groupId, memberIds) {
  return api(`/api/groups/${groupId}/members`, { method: 'POST', token, body: { memberIds } });
}

export async function removeGroupMember(token, groupId, memberId) {
  return api(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE', token });
}

export async function promoteGroupMember(token, groupId, memberId) {
  return api(`/api/groups/${groupId}/members/${memberId}/promote`, { method: 'POST', token });
}

export async function leaveGroup(token, groupId) {
  return api(`/api/groups/${groupId}/leave`, { method: 'POST', token });
}
