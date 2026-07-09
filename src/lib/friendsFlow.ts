/**
 * Pure state-machine for the friends relationship, shared by the backend handler
 * (`functions/api/friends.ts`) and its unit test. Keeping the branching here — rather
 * than inline in the SQL handler — means the transitions are guarded without a running
 * Worker, and the server can't drift from what's tested.
 *
 * A relationship is a single row stored in the direction it was requested:
 * `user_id` asked, `friend_id` was asked. `status` is 'pending' until accepted.
 */

export interface FriendRow {
  /** The requester (who sent the pending request). */
  user_id: number;
  /** The addressee. */
  friend_id: number;
  status: "pending" | "accepted";
}

/** What sending a request to `targetId` should do, given any existing relationship. */
export type SendOutcome =
  | "self" // can't friend yourself
  | "already-friends" // an accepted row already exists
  | "already-sent" // we already have a pending request out to them
  | "accept-mutual" // they already asked us → this request accepts theirs
  | "new-request"; // no relationship yet → create a pending request

/**
 * Resolve what a friend request from `meId` to `targetId` means. `existing` is the row
 * joining the two accounts in either direction, or null when they're unconnected.
 */
export function resolveSend(
  existing: FriendRow | null,
  meId: number,
  targetId: number,
): SendOutcome {
  if (targetId === meId) return "self";
  if (existing) {
    if (existing.status === "accepted") return "already-friends";
    // A pending row we own is our own outstanding request; one we don't own means
    // they asked us first, so sending back is an acceptance.
    return existing.user_id === meId ? "already-sent" : "accept-mutual";
  }
  return "new-request";
}

/**
 * Whether `meId` may accept the given relationship: it must be a pending request where
 * `meId` is the addressee (you can't accept a request you sent, or an accepted row).
 */
export function canAccept(existing: FriendRow | null, meId: number): boolean {
  return (
    !!existing && existing.status === "pending" && existing.friend_id === meId
  );
}
