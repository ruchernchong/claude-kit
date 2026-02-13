import { describe, expect, it } from "vitest";
import { type SymlinkResult, logResult, printSummary } from "../utils";

describe("Logging and Summary", () => {
  describe("logResult", () => {
    it("should log installed status", () => {
      const result: SymlinkResult = {
        name: "test",
        status: "installed",
        message: "created",
      };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log skipped status", () => {
      const result: SymlinkResult = {
        name: "test",
        status: "skipped",
        message: "exists",
      };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log failed status", () => {
      const result: SymlinkResult = {
        name: "test",
        status: "failed",
        message: "error",
      };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log backed_up status", () => {
      const result: SymlinkResult = {
        name: "test",
        status: "backed_up",
        message: "backed up",
      };
      expect(() => logResult(result)).not.toThrow();
    });
  });

  describe("printSummary", () => {
    it("should print summary with all statuses", () => {
      const results: SymlinkResult[] = [
        { name: "a", status: "installed", message: "created" },
        { name: "b", status: "installed", message: "created" },
        { name: "c", status: "skipped", message: "exists" },
        { name: "d", status: "failed", message: "error" },
      ];
      expect(() => printSummary(results)).not.toThrow();
    });

    it("should handle empty results", () => {
      expect(() => printSummary([])).not.toThrow();
    });

    it("should handle only installed results", () => {
      const results: SymlinkResult[] = [
        { name: "a", status: "installed", message: "created" },
      ];
      expect(() => printSummary(results)).not.toThrow();
    });
  });
});
