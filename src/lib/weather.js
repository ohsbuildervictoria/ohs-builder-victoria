// ============================================================================
// Weather auto-fill for the Site Diary (Open-Meteo — free, no API key).
//
// Strictly an ENHANCEMENT: every function here resolves to null (or a typed
// miss) on any failure — timeout, rate limit, unknown postcode, API down —
// so a diary entry can always be written by hand and is never blocked.
// Today's entries use current conditions; backdated entries use the daily
// history (forecast API covers ~3 months back, the archive API beyond that).
// ============================================================================

// WMO weather codes → plain site language.
function conditionLabel(code) {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Storm";
  return "Cloudy";
}

// Last 4-digit group in the address is the Australian postcode.
export function postcodeFrom(address) {
  const m = String(address || "").match(/\b(\d{4})\b/g);
  return m ? m[m.length - 1] : null;
}

// Locality ("Northcote") parsed from the address. Open-Meteo's geocoder
// resolves suburb/town names but NOT bare Australian postcodes, so the
// suburb is the primary lookup key and the postcode only a fallback term.
export function localityFrom(address) {
  const s = String(address || "");
  const m = s.match(/([A-Za-z][A-Za-z' -]*?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b[^,]*$/i);
  if (m && m[1]) return m[1].trim();
  const seg = (s.split(",").pop() || "")
    .replace(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/[^A-Za-z' -]/g, " ")
    .trim();
  return seg || null;
}

async function getJson(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const geoCache = new Map();
async function geocodeAu(name) {
  if (!name) return null;
  if (geoCache.has(name)) return geoCache.get(name);
  const j = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`
  );
  const hit = (j?.results || []).find((r) => r.country_code === "AU");
  const loc = hit ? { lat: hit.latitude, lon: hit.longitude } : null;
  if (loc) geoCache.set(name, loc);
  return loc;
}

function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// → { summary:"22°C · Partly cloudy", wind:"18 km/h", place } | { miss } | null
// miss: 'no-location' (address unparseable) | 'no-data' (nothing for that day)
export async function fetchWeatherFor(address, dateStr) {
  try {
    const locality = localityFrom(address);
    const pc = postcodeFrom(address);
    if (!locality && !pc) return { miss: "no-location" };
    const loc = (await geocodeAu(locality)) || (await geocodeAu(pc));
    if (!loc) return { miss: "no-data" };
    const place = locality || pc;

    const today = localToday();
    if (!dateStr || dateStr === today) {
      const j = await getJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      const c = j?.current;
      if (!c || c.temperature_2m == null) return { miss: "no-data" };
      return {
        summary: `${Math.round(c.temperature_2m)}°C · ${conditionLabel(c.weather_code)}`,
        wind: `${Math.round(c.wind_speed_10m)} km/h`,
        place,
      };
    }

    // Backdated entry → daily history. Forecast API reaches ~92 days back;
    // anything older comes from the archive API (which lags a few days).
    const daysAgo = (Date.parse(today) - Date.parse(dateStr)) / 86_400_000;
    const base =
      daysAgo <= 90
        ? "https://api.open-meteo.com/v1/forecast"
        : "https://archive-api.open-meteo.com/v1/archive";
    const j = await getJson(
      `${base}?latitude=${loc.lat}&longitude=${loc.lon}&daily=temperature_2m_max,weather_code,wind_speed_10m_max&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
    );
    const d = j?.daily;
    if (!d?.temperature_2m_max?.length || d.temperature_2m_max[0] == null) {
      return { miss: "no-data" };
    }
    return {
      summary: `${Math.round(d.temperature_2m_max[0])}°C · ${conditionLabel(d.weather_code?.[0])}`,
      wind: `${Math.round(d.wind_speed_10m_max?.[0] ?? 0)} km/h`,
      place,
    };
  } catch {
    return null;
  }
}
