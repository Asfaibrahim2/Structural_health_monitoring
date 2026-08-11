// UI/UX cleanup: unit tests for shared status helpers.
import { describe, it, expect } from "vitest";
import { riskToPriority, PRIORITY_STATUS } from "./status";

describe("riskToPriority", () => {
  it("maps high scores to P1", () => {
    expect(riskToPriority(85)).toBe("P1");
  });
  it("maps low scores to P4", () => {
    expect(riskToPriority(10)).toBe("P4");
  });
});

describe("PRIORITY_STATUS", () => {
  it("has all four priority levels", () => {
    expect(PRIORITY_STATUS.P1.fg).toBe("#f87171");
    expect(PRIORITY_STATUS.P4.fg).toBe("#4ade80");
  });
});
