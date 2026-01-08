import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDirectorySymlink,
  createFileSymlink,
  createSymlink,
  exists,
  isSymlink,
} from "../utils";

describe("Symlink Creation", () => {
  let testDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "symlink-test-"));
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");
    await fs.mkdir(sourceDir);
    await fs.mkdir(targetDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("createSymlink", () => {
    it("should create symlink to existing file", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "content");

      const result = await createSymlink(sourceFile, targetDir, "link.txt");

      expect(result.status).toBe("installed");
      expect(result.message).toBe("created");
      const linkPath = path.join(targetDir, "link.txt");
      expect(await isSymlink(linkPath)).toBe(true);
      expect(await fs.readlink(linkPath)).toBe(sourceFile);
    });

    it("should skip if symlink already points to correct location", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "content");
      await fs.symlink(sourceFile, path.join(targetDir, "link.txt"));

      const result = await createSymlink(sourceFile, targetDir, "link.txt");

      expect(result.status).toBe("skipped");
      expect(result.message).toBe("already linked");
    });

    it("should replace symlink pointing to different location", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      const otherFile = path.join(sourceDir, "other.txt");
      await fs.writeFile(sourceFile, "content");
      await fs.writeFile(otherFile, "other");
      await fs.symlink(otherFile, path.join(targetDir, "link.txt"));

      const result = await createSymlink(sourceFile, targetDir, "link.txt");

      expect(result.status).toBe("installed");
      expect(await fs.readlink(path.join(targetDir, "link.txt"))).toBe(sourceFile);
    });

    it("should backup and replace existing file", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "source content");
      await fs.writeFile(path.join(targetDir, "link.txt"), "existing content");

      const result = await createSymlink(sourceFile, targetDir, "link.txt");

      expect(result.status).toBe("installed");
      expect(await isSymlink(path.join(targetDir, "link.txt"))).toBe(true);
      expect(await exists(path.join(targetDir, "link.txt.bak"))).toBe(true);
    });

    it("should create target directory if it does not exist", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "content");
      const newTargetDir = path.join(testDir, "new-target");

      const result = await createSymlink(sourceFile, newTargetDir, "link.txt");

      expect(result.status).toBe("installed");
      expect(await exists(newTargetDir)).toBe(true);
    });
  });

  describe("createDirectorySymlink", () => {
    it("should create symlink to directory", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir);

      expect(result.status).toBe("installed");
      expect(result.message).toContain("created symlink");
      expect(await isSymlink(path.join(targetDir, "subdir"))).toBe(true);
    });

    it("should skip if source directory does not exist", async () => {
      const result = await createDirectorySymlink("nonexistent", sourceDir, targetDir);

      expect(result.status).toBe("skipped");
      expect(result.message).toBe("source directory does not exist");
    });

    it("should skip if symlink already points to correct location", async () => {
      const subDir = path.join(sourceDir, "subdir");
      await fs.mkdir(subDir);
      await fs.symlink(subDir, path.join(targetDir, "subdir"));

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir);

      expect(result.status).toBe("skipped");
      expect(result.message).toBe("already configured");
    });

    it("should fail if directory exists without force replace", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      await fs.mkdir(path.join(targetDir, "subdir"));

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir);

      expect(result.status).toBe("failed");
      expect(result.message).toContain("directory exists");
    });

    it("should replace directory with force replace", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      const existingDir = path.join(targetDir, "subdir");
      await fs.mkdir(existingDir);
      await fs.writeFile(path.join(existingDir, "file.txt"), "content");

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir, {
        forceReplace: true,
      });

      expect(result.status).toBe("installed");
      expect(await isSymlink(path.join(targetDir, "subdir"))).toBe(true);
    });

    it("should replace symlink pointing to different location", async () => {
      const subDir = path.join(sourceDir, "subdir");
      const otherDir = path.join(sourceDir, "other");
      await fs.mkdir(subDir);
      await fs.mkdir(otherDir);
      await fs.symlink(otherDir, path.join(targetDir, "subdir"));

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir);

      expect(result.status).toBe("installed");
      expect(await fs.readlink(path.join(targetDir, "subdir"))).toBe(subDir);
    });

    it("should fail if path exists but is not a symlink or directory", async () => {
      await fs.mkdir(path.join(sourceDir, "subdir"));
      await fs.writeFile(path.join(targetDir, "subdir"), "content");

      const result = await createDirectorySymlink("subdir", sourceDir, targetDir);

      expect(result.status).toBe("failed");
      expect(result.message).toContain("exists but is not a symlink or directory");
    });
  });

  describe("createFileSymlink", () => {
    it("should create symlink to file", async () => {
      await fs.writeFile(path.join(sourceDir, "file.txt"), "content");

      const result = await createFileSymlink("file.txt", sourceDir, targetDir);

      expect(result.status).toBe("installed");
      expect(result.message).toContain("created symlink");
      expect(await isSymlink(path.join(targetDir, "file.txt"))).toBe(true);
    });

    it("should skip if source file does not exist", async () => {
      const result = await createFileSymlink("nonexistent.txt", sourceDir, targetDir);

      expect(result.status).toBe("skipped");
      expect(result.message).toBe("source file does not exist");
    });

    it("should skip if symlink already points to correct location", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      await fs.writeFile(sourceFile, "content");
      await fs.symlink(sourceFile, path.join(targetDir, "file.txt"));

      const result = await createFileSymlink("file.txt", sourceDir, targetDir);

      expect(result.status).toBe("skipped");
      expect(result.message).toBe("already configured");
    });

    it("should fail if file exists without force replace", async () => {
      await fs.writeFile(path.join(sourceDir, "file.txt"), "source");
      await fs.writeFile(path.join(targetDir, "file.txt"), "existing");

      const result = await createFileSymlink("file.txt", sourceDir, targetDir);

      expect(result.status).toBe("failed");
      expect(result.message).toContain("file exists");
    });

    it("should backup and replace file with force replace", async () => {
      await fs.writeFile(path.join(sourceDir, "file.txt"), "source");
      await fs.writeFile(path.join(targetDir, "file.txt"), "existing");

      const result = await createFileSymlink("file.txt", sourceDir, targetDir, {
        forceReplace: true,
      });

      expect(result.status).toBe("installed");
      expect(await isSymlink(path.join(targetDir, "file.txt"))).toBe(true);
      expect(await exists(path.join(targetDir, "file.txt.bak"))).toBe(true);
    });

    it("should replace symlink pointing to different location", async () => {
      const sourceFile = path.join(sourceDir, "file.txt");
      const otherFile = path.join(sourceDir, "other.txt");
      await fs.writeFile(sourceFile, "source");
      await fs.writeFile(otherFile, "other");
      await fs.symlink(otherFile, path.join(targetDir, "file.txt"));

      const result = await createFileSymlink("file.txt", sourceDir, targetDir);

      expect(result.status).toBe("installed");
      expect(await fs.readlink(path.join(targetDir, "file.txt"))).toBe(sourceFile);
    });
  });
});
