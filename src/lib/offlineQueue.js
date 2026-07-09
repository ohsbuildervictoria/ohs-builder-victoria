// ============================================================================
// Offline submit queue. Construction sites drop signal constantly — a diary
// entry, incident report or fitness declaration written in a dead spot must
// never be silently lost, and must never FAKE success either. When a submit
// fails because the network is down, the record is queued here (localStorage,
// survives reload/battery death) and replayed automatically when the device
// is back online. The user is always told which of the two happened.
// ============================================================================

const KEY = "ohsbv-offline-queue-v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(q) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage full — nothing more we can do */
  }
}

// A submit failure counts as "offline" only for genuine transport errors —
// an RLS rejection or validation error must surface, not queue forever.
export function isNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /failed to fetch|networkerror|load failed|fetch failed|err_internet|err_network/i.test(
    err?.message || ""
  );
}

export function enqueue(type, payload) {
  const q = read();
  q.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    queuedAt: new Date().toISOString(),
  });
  write(q);
  try {
    window.dispatchEvent(new Event("ohsbv-queued")); // sync banner listens
  } catch {
    /* non-browser */
  }
  return q.length;
}

export function pendingCount() {
  return read().length;
}

// Replays queued records in order through the given { type: asyncFn } map.
// Stops at the first network failure (still offline); drops records that fail
// for NON-network reasons (they'd block the queue forever) and reports them.
export async function flushQueue(handlers) {
  let done = 0;
  let dropped = 0;
  for (const item of read()) {
    const handler = handlers[item.type];
    try {
      if (handler) await handler(item.payload);
      else dropped++;
      write(read().filter((i) => i.id !== item.id));
      if (handler) done++;
    } catch (err) {
      if (isNetworkError(err)) break; // still offline — try again later
      write(read().filter((i) => i.id !== item.id));
      dropped++;
    }
  }
  return { done, dropped, remaining: pendingCount() };
}
