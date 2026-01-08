import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDirectoryConflict, checkFileConflict } from "../utils";

describe("Conflict Checking", () => {
  let testDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "conflict-test-"));
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");
    await fs.mkdir(sourceDir);
    await fs.mkdir(targetDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("checkDirectoryConflict", () => {
    it("should return null when source directory does not exist", async () => {
      const result = await checkDirectoryConflict("nonexistent", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should return null when target does not exist", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      const result = await checkDirectoryConflict("subdir", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should return null when symlink already points to correct location", async () => {
      const subDir = path.join(sourceDir, "subdir");
      await fs.mkdir(subDir);
      await fs.symlink(subDir, path.join(targetDir, "subdir"));

      const result = await checkDirectoryConflict("subdir", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should detect existing symlink pointing elsewhere", async () => {
      const subDir = path.join(sourceDir, "subdir");
      const otherDir = path.join(sourceDir, "other");
      await fs.mkdir(subDir);
      await fs.mkdir(otherDir);
      await fs.symlink(otherDir, path.join(targetDir, "subdir"));

      const result = await checkDirectoryConflict("subdir", sourceDir, targetDir);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe("existing_symlink");
      expect(result?.existingTarget).toBe(otherDir);
    });

    it("should detect existing directory", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      await fs.mkdir(path.join(targetDir, "subdir"));

      const result = await checkDirectoryConflict("subdir", sourceDir, targetDir);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe("existing_directory");
    });

    it("should detect existing file at target", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      await fs.writeFile(path.join(targetDir, "subdir"), "file content");

      const result = await checkDirectoryConflict("subdir", sourceDir, targetDir);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe("existing_file");
    });
  });

  describe("checkFileConflict", () => {
    it("should return null when source file does not exist", async () => {
      const result = await checkFileConflict("nonexistent.txt", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should return null when target does not exist", async () => {
      await fs.writeFile(path.join(sourceDir, "file.txt"), "content");
      const result = await checkFileConflict("file.txt", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should return null when symlink already points to correct location", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "content");
      await fs.symlink(sourceFile, path.join(targetDir, "file.txt"));

      const result = await checkFileConflict("file.txt", sourceDir, targetDir);
      expect(result).toBeNull();
    });

    it("should detect existing symlink pointing elsewhere", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      const otherFile = path.join(sourceDir, "other.txt");
      await fs.writeFile(sourceFile, "source");
      await fs.writeFile(otherFile, "other");
      await fs.symlink(otherFile, path.join(targetDir, "file.txt"));

      const result = await checkFileConflict("file.txt", sourceDir, targetDir);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe("existing_symlink");
      expect(result?.existingTarget).toBe(otherFile);
    });

    it("should detect existing file at target", async () => {
      await fs.writeFile(path.join(sourceDir, "file.txt"), "source");
      await fs.writeFile(path.join(targetDir, "file.txt"), "existing");

      const result = await checkFileConflict("file.txt", sourceDir, targetDir);

      expect(result).not.toBeNull();
      expect(result?.conflictType).toBe("existing_file");
    });
  });
});
