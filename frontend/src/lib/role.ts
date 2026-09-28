// The console will have an admin view and a user view. Until identities
// exist, everyone is admin; the gestures that change governance (policy
// edits, pin acceptance) already ask this hook, so the user view is one
// place to change, not a hunt through the pages.
export type ConsoleRole = "admin" | "user";

export function useConsoleRole(): ConsoleRole {
  return "admin";
}
