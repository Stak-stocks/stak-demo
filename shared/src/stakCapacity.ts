// Single source of truth for how many brands a Stak holds. The backend enforces
// it on write (backend/src/routes/me.ts); the web reads it for the full-Stak
// prompt and the swap picker, and Android for the same check, so the three can't
// drift. It lived in frontend/src/lib/constants.ts alone, which made it a habit of
// one client rather than a rule: Android saved past it freely and the server
// stored whatever it was handed, leaving the web to load a Stak over its own cap.
export const STAK_CAPACITY = 30;
