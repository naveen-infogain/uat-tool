// Thin fetch wrapper that attaches the JWT access token to every request and
// transparently refreshes it (via the httpOnly refresh cookie) on a 401.

export const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Called once by App.jsx to know when a refresh attempt has failed and the
// user needs to be sent back to the login screen.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function refreshAccessToken() {
  const resp = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  accessToken = data.access_token;
  return data;
}

export async function apiFetch(url, options = {}) {
  const withAuth = () => fetch(url, {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  let resp = await withAuth();

  if (resp.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      resp = await withAuth();
    } else {
      accessToken = null;
      if (onUnauthorized) onUnauthorized();
    }
  }

  return resp;
}
