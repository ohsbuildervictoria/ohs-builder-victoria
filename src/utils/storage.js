const APP_KEY = "ohs-builder-victoria-state";
const AUTH_KEY = "ohs-builder-victoria-auth";

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — prototype continues in memory.
  }
}

export function loadAppState(fallback) {
  return loadJson(APP_KEY, fallback);
}

export function saveAppState(state) {
  saveJson(APP_KEY, state);
}

export function loadAuthUser() {
  return loadJson(AUTH_KEY, null);
}

export function saveAuthUser(user) {
  if (user) saveJson(AUTH_KEY, user);
  else localStorage.removeItem(AUTH_KEY);
}

export function clearPrototypeData() {
  localStorage.removeItem(APP_KEY);
  localStorage.removeItem(AUTH_KEY);
}
