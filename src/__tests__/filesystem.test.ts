import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exists, isDirectory, isSymlink } from "../utils";

describe("File System Utilities", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "utils-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      const filePath = path.join(testDir, "file.txt");
      await fs.writeFile(filePath, "content");
      expect(await exists(filePath)).toBe(true);
    });

    it("should return true for existing directory", async () => {
      const dirPath = path.join(testDir, "subdir");
      await fs.mkdir(dirPath);
      expect(await exists(dirPath)).toBe(true);
    });

    it("should return false for non-existent path", async () => {
      expect(await exists(path.join(testDir, "nonexistent"))).toBe(false);
    });

    it("should return true for symlink", async () => {
      const target = path.join(testDir, "target.txt");
      const link = path.join(testDir, "link.txt");
      await fs.writeFile(target, "content");
      await fs.symlink(target, link);
      expect(await exists(link)).toBe(true);
    });
  });

  describe("isSymlink", () => {
    it("should return true for symlink", async () => {
      const target = path.join(testDir, "target.txt");
      const link = path.join(testDir, "link.txt");
      await fs.writeFile(target, "content");
      await fs.symlink(target, link);
      expect(await isSymlink(link)).toBe(true);
    });

    it("should return false for regular file", async () => {
      const filePath = path.join(testDir, "file.txt");
      await fs.writeFile(filePath, "content");
      expect(await isSymlink(filePath)).toBe(false);
    });

    it("should return false for directory", async () => {
      const dirPath = path.join(testDir, "subdir");
      await fs.mkdir(dirPath);
      expect(await isSymlink(dirPath)).toBe(false);
    });

    it("should return false for non-existent path", async () => {
      expect(await isSymlink(path.join(testDir, "nonexistent"))).toBe(false);
    });
  });

  describe("isDirectory", () => {
    it("should return true for directory", async () => {
      const dirPath = path.join(testDir, "subdir");
      await fs.mkdir(dirPath);
      expect(await isDirectory(dirPath)).toBe(true);
    });

    it("should return false for file", async () => {
      const filePath = path.join(testDir, "file.txt");
      await fs.writeFile(filePath, "content");
      expect(await isDirectory(filePath)).toBe(false);
    });

    it("should return false for non-existent path", async () => {
      expect(await isDirectory(path.join(testDir, "nonexistent"))).toBe(false);
    });

    it("should follow symlinks to directories", async () => {
      const targetDir = path.join(testDir, "targetdir");
      const link = path.join(testDir, "linkdir");
      await fs.mkdir(targetDir);
      await fs.symlink(targetDir, link);
      expect(await isDirectory(link)).toBe(true);
    });
  });
});
