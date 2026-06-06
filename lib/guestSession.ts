// ── Guest Session Management ──────────────────────────────────────────────────
// All state is in sessionStorage — resets when browser tab is closed.
// No Supabase, no cookies, no persistence across sessions.

const GUEST_KEY = 'bv_guest';

interface GuestState {
  isGuest: boolean;
  ancestryCount: number;   // number of ancestry traces done
  quizLevelsPassed: number; // number of quiz levels passed
}

function getState(): GuestState {
  if (typeof window === 'undefined') return { isGuest: false, ancestryCount: 0, quizLevelsPassed: 0 };
  try {
    const raw = sessionStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : { isGuest: false, ancestryCount: 0, quizLevelsPassed: 0 };
  } catch {
    return { isGuest: false, ancestryCount: 0, quizLevelsPassed: 0 };
  }
}

function setState(state: GuestState) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(GUEST_KEY, JSON.stringify(state));
}

export function initGuestSession() {
  setState({ isGuest: true, ancestryCount: 0, quizLevelsPassed: 0 });
}

export function isGuestSession(): boolean {
  return getState().isGuest;
}

export function clearGuestSession() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
}

// ── Ancestry ──────────────────────────────────────────────────────────────────
export const GUEST_ANCESTRY_LIMIT = 2;

export function getGuestAncestryCount(): number {
  return getState().ancestryCount;
}

export function incrementGuestAncestryCount(): number {
  const state = getState();
  const next = state.ancestryCount + 1;
  setState({ ...state, ancestryCount: next });
  return next;
}

export function hasReachedAncestryLimit(): boolean {
  return getState().ancestryCount >= GUEST_ANCESTRY_LIMIT;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
// Guests can attempt Easy + Medium only (levels 0 and 1)
export const GUEST_MAX_QUIZ_LEVEL = 1; // 0=easy, 1=medium
export const GUEST_QUIZ_NUDGE_AFTER = 1; // nudge after passing this many levels

export function getGuestQuizLevelsPassed(): number {
  return getState().quizLevelsPassed;
}

export function incrementGuestQuizLevelsPassed(): number {
  const state = getState();
  const next = state.quizLevelsPassed + 1;
  setState({ ...state, quizLevelsPassed: next });
  return next;
}

export function isGuestQuizLimitReached(levelIndex: number): boolean {
  return levelIndex > GUEST_MAX_QUIZ_LEVEL;
}
