// lib/quizSession.ts
// Tracks which quiz set IDs the user has seen this browser session.
// sessionStorage clears automatically when the tab is closed.

const SESSION_KEY = 'quiz_seen_sets';

export function getSeenSetIds(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markSetAsSeen(setId: string | null) {
  if (!setId) return;
  try {
    const current = getSeenSetIds();
    if (!current.includes(setId)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...current, setId]));
    }
  } catch {
    // sessionStorage unavailable (SSR, private mode) — silently skip
  }
}

export function clearSeenSets() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}
