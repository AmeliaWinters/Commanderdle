import { describe, it, expect } from "vitest";
import { containsProfanity } from "./profanity";

describe("containsProfanity", () => {
  it("blocks obvious slurs and profanity", () => {
    for (const bad of ["nigger", "faggot", "cunt", "fuck you", "xXniggerXx"])
      expect(containsProfanity(bad)).toBe(true);
  });

  it("blocks leet-speak spellings", () => {
    for (const bad of ["n1gg3r", "f4gg0t", "$h1t"])
      expect(containsProfanity(bad)).toBe(true);
  });

  it("blocks a soft word standing on its own or padded by punctuation", () => {
    for (const bad of ["cunt", "coon_lover", "big.dick", "shit-head"])
      expect(containsProfanity(bad)).toBe(true);
  });

  it("does not flag innocent names that merely contain a rude substring", () => {
    for (const ok of [
      "Scunthorpe",
      "RaccoonKing",
      "Tycoon",
      "Cockpit",
      "Peacock",
      "Hancock",
      "Therapist",
      "Grapefruit",
      "Pussycat",
      "FlameRetardant",
      "Despicable",
      "Assassin",
    ])
      expect(containsProfanity(ok)).toBe(false);
  });
});
