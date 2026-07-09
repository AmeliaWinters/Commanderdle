
export interface FriendRow {
  user_id: number;
  friend_id: number;
  status: "pending" | "accepted";
}

export type SendOutcome =
  | "self"
  | "already-friends"
  | "already-sent"
  | "accept-mutual"
  | "new-request";

export function resolveSend(
  existing: FriendRow | null,
  meId: number,
  targetId: number,
): SendOutcome {
  if (targetId === meId) return "self";
  if (existing) {
    if (existing.status === "accepted") return "already-friends";
    return existing.user_id === meId ? "already-sent" : "accept-mutual";
  }
  return "new-request";
}

export function canAccept(existing: FriendRow | null, meId: number): boolean {
  return (
    !!existing && existing.status === "pending" && existing.friend_id === meId
  );
}
