import { splitCentsEqually, hashToken, isLockExpired } from "./crypto.util";

describe("crypto.util", () => {
  describe("splitCentsEqually", () => {
    it("splits evenly when divisible", () => {
      expect(splitCentsEqually(300, 3)).toEqual([100, 100, 100]);
    });

    it("distributes remainder cents", () => {
      const parts = splitCentsEqually(100, 3);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
      expect(parts).toEqual([34, 33, 33]);
    });

    it("preserves total for meze-style split", () => {
      const total = 28000;
      const parts = splitCentsEqually(total, 3);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    });
  });

  describe("hashToken", () => {
    it("produces deterministic hash", () => {
      expect(hashToken("abc")).toBe(hashToken("abc"));
      expect(hashToken("abc")).not.toBe(hashToken("def"));
    });
  });

  describe("isLockExpired", () => {
    it("returns true for null", () => {
      expect(isLockExpired(null)).toBe(true);
    });

    it("returns false for future lock", () => {
      expect(isLockExpired(new Date(Date.now() + 60_000))).toBe(false);
    });

    it("returns true for past lock", () => {
      expect(isLockExpired(new Date(Date.now() - 1000))).toBe(true);
    });
  });
});
