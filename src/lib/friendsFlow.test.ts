import { describe, it, expect } from "vitest";
import { resolveSend, canAccept, type FriendRow } from "./friendsFlow";

const ME = 1;
const THEM = 2;

const row = (
  requester: number,
  addressee: number,
  status: FriendRow["status"],
): FriendRow => ({ user_id: requester, friend_id: addressee, status });

describe("resolveSend", () => {
  it("creates a new request when the two are unconnected", () => {
    expect(resolveSend(null, ME, THEM)).toBe("new-request");
  });

  it("refuses to friend yourself", () => {
    expect(resolveSend(null, ME, ME)).toBe("self");
  });

  it("rejects a duplicate of a request you already sent", () => {
    expect(resolveSend(row(ME, THEM, "pending"), ME, THEM)).toBe("already-sent");
  });

  it("accepts in place when the target already asked you (mutual request)", () => {
    expect(resolveSend(row(THEM, ME, "pending"), ME, THEM)).toBe(
      "accept-mutual",
    );
  });

  it("no-ops as already-friends once accepted, regardless of who asked", () => {
    expect(resolveSend(row(ME, THEM, "accepted"), ME, THEM)).toBe(
      "already-friends",
    );
    expect(resolveSend(row(THEM, ME, "accepted"), ME, THEM)).toBe(
      "already-friends",
    );
  });

  it("prefers the self guard even if a stale row somehow exists", () => {
    expect(resolveSend(row(ME, ME, "pending"), ME, ME)).toBe("self");
  });
});

describe("canAccept", () => {
  it("lets the addressee accept a pending request", () => {
    expect(canAccept(row(THEM, ME, "pending"), ME)).toBe(true);
  });

  it("won't let the requester accept their own outgoing request", () => {
    expect(canAccept(row(ME, THEM, "pending"), ME)).toBe(false);
  });

  it("won't re-accept an already-accepted relationship", () => {
    expect(canAccept(row(THEM, ME, "accepted"), ME)).toBe(false);
  });

  it("is false when there's no relationship at all", () => {
    expect(canAccept(null, ME)).toBe(false);
  });
});
