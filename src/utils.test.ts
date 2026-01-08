import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BackupInfo,
  type SymlinkResult,
  backupFile,
  checkDirectoryConflict,
  checkFileConflict,
  createDirectorySymlink,
  createFileSymlink,
  createSymlink,
  exists,
  findBackups,
  getBackupPath,
  getMarkdownFiles,
  isDirectory,
  isSymlink,
  logResult,
  printSummary,
  removeDirectory,
  restoreFromBackup,
} from "./utils";

describe("Backup and Restore Functions", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "utils-test-"));
  });

  afterEach(async () => {
    // Clean up the temporary directory after each test
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("getBackupPath", () => {
    it("should generate backup path with .bak extension when backup does not exist", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const backupPath = await getBackupPath(originalPath);

      expect(backupPath).toBe(`${originalPath}.bak`);
    });

    it("should add timestamp when .bak file already exists", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const firstBackup = `${originalPath}.bak`;

      // Create the first backup file
      await fs.writeFile(firstBackup, "backup content");

      const backupPath = await getBackupPath(originalPath);

      expect(backupPath).toMatch(/file\.txt\.bak\.\d{4}-\d{2}-\d{2}T/);
      expect(backupPath).not.toBe(firstBackup);
    });

    it("should handle files with multiple dots in name", async () => {
      const originalPath = path.join(testDir, "my.config.json");
      const backupPath = await getBackupPath(originalPath);

      expect(backupPath).toBe(`${originalPath}.bak`);
    });
  });

  describe("backupFile", () => {
    it("should create a backup copy of a file", async () => {
      const filePath = path.join(testDir, "test.txt");
      const content = "original content";
      await fs.writeFile(filePath, content);

      const backupPath = await backupFile(filePath);

      expect(backupPath).toBe(`${filePath}.bak`);
      expect(await fs.readFile(backupPath, "utf-8")).toBe(content);
      // Original file should still exist
      expect(await fs.readFile(filePath, "utf-8")).toBe(content);
    });

    it("should return null when file does not exist", async () => {
      const nonExistentPath = path.join(testDir, "nonexistent.txt");

      const backupPath = await backupFile(nonExistentPath);

      expect(backupPath).toBeNull();
    });

    it("should return null when path is a symlink", async () => {
      const targetPath = path.join(testDir, "target.txt");
      const symlinkPath = path.join(testDir, "link.txt");
      await fs.writeFile(targetPath, "content");
      await fs.symlink(targetPath, symlinkPath);

      const backupPath = await backupFile(symlinkPath);

      expect(backupPath).toBeNull();
    });

    it("should handle multiple backups with timestamps", async () => {
      const filePath = path.join(testDir, "test.txt");
      await fs.writeFile(filePath, "content 1");

      const backup1 = await backupFile(filePath);
      expect(backup1).toBe(`${filePath}.bak`);

      // Modify and backup again
      await fs.writeFile(filePath, "content 2");
      const backup2 = await backupFile(filePath);

      expect(backup2).toMatch(/test\.txt\.bak\.\d{4}-\d{2}-\d{2}T/);
      expect(backup2).not.toBe(backup1);

      // Both backups should exist
      expect(await fs.readFile(backup1 as string, "utf-8")).toBe("content 1");
      expect(await fs.readFile(backup2 as string, "utf-8")).toBe("content 2");
    });

    it("should preserve file permissions", async () => {
      const filePath = path.join(testDir, "executable.sh");
      await fs.writeFile(filePath, "#!/bin/bash\necho 'test'");
      await fs.chmod(filePath, 0o755);

      const backupPath = await backupFile(filePath);

      const originalStats = await fs.stat(filePath);
      const backupStats = await fs.stat(backupPath as string);
      expect(backupStats.mode).toBe(originalStats.mode);
    });
  });

  describe("removeDirectory", () => {
    it("should remove an empty directory", async () => {
      const dirPath = path.join(testDir, "empty-dir");
      await fs.mkdir(dirPath);

      const result = await removeDirectory(dirPath);

      expect(result).toBe(true);
      await expect(fs.access(dirPath)).rejects.toThrow();
    });

    it("should remove a directory with files", async () => {
      const dirPath = path.join(testDir, "dir-with-files");
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, "file1.txt"), "content1");
      await fs.writeFile(path.join(dirPath, "file2.txt"), "content2");

      const result = await removeDirectory(dirPath);

      expect(result).toBe(true);
      await expect(fs.access(dirPath)).rejects.toThrow();
    });

    it("should remove a nested directory structure", async () => {
      const dirPath = path.join(testDir, "parent");
      const childDir = path.join(dirPath, "child");
      await fs.mkdir(childDir, { recursive: true });
      await fs.writeFile(path.join(childDir, "file.txt"), "content");

      const result = await removeDirectory(dirPath);

      expect(result).toBe(true);
      await expect(fs.access(dirPath)).rejects.toThrow();
    });

    it("should return true when directory does not exist", async () => {
      const nonExistentDir = path.join(testDir, "nonexistent");

      const result = await removeDirectory(nonExistentDir);

      expect(result).toBe(true);
    });

    it("should handle directories with symlinks", async () => {
      const dirPath = path.join(testDir, "dir-with-symlink");
      const targetFile = path.join(testDir, "target.txt");
      await fs.mkdir(dirPath);
      await fs.writeFile(targetFile, "target content");
      await fs.symlink(targetFile, path.join(dirPath, "link.txt"));

      const result = await removeDirectory(dirPath);

      expect(result).toBe(true);
      await expect(fs.access(dirPath)).rejects.toThrow();
      // Target file should still exist
      expect(await fs.readFile(targetFile, "utf-8")).toBe("target content");
    });
  });

  describe("findBackups", () => {
    it("should find all .bak files in a directory", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "content1");
      await fs.writeFile(path.join(testDir, "file1.txt.bak"), "backup1");
      await fs.writeFile(path.join(testDir, "file2.json"), "content2");
      await fs.writeFile(path.join(testDir, "file2.json.bak"), "backup2");
      await fs.writeFile(path.join(testDir, "regular.txt"), "regular");

      const backups = await findBackups(testDir);

      expect(backups).toHaveLength(2);
      expect(backups).toEqual(
        expect.arrayContaining([
          {
            backupPath: path.join(testDir, "file1.txt.bak"),
            originalPath: path.join(testDir, "file1.txt"),
            name: "file1.txt",
          },
          {
            backupPath: path.join(testDir, "file2.json.bak"),
            originalPath: path.join(testDir, "file2.json"),
            name: "file2.json",
          },
        ]),
      );
    });

    it("should find timestamped .bak files", async () => {
      const timestamp = "2024-01-15T10-30-00-123Z";
      await fs.writeFile(
        path.join(testDir, `config.json.bak.${timestamp}`),
        "backup",
      );

      const backups = await findBackups(testDir);

      expect(backups).toHaveLength(1);
      expect(backups[0]).toEqual({
        backupPath: path.join(testDir, `config.json.bak.${timestamp}`),
        originalPath: path.join(testDir, "config.json"),
        name: "config.json",
      });
    });

    it("should return empty array when directory has no backups", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "content1");
      await fs.writeFile(path.join(testDir, "file2.json"), "content2");

      const backups = await findBackups(testDir);

      expect(backups).toEqual([]);
    });

    it("should return empty array when directory does not exist", async () => {
      const nonExistentDir = path.join(testDir, "nonexistent");

      const backups = await findBackups(nonExistentDir);

      expect(backups).toEqual([]);
    });

    it("should handle multiple backups of the same file", async () => {
      await fs.writeFile(path.join(testDir, "file.txt.bak"), "backup1");
      await fs.writeFile(
        path.join(testDir, "file.txt.bak.2024-01-15T10-30-00-123Z"),
        "backup2",
      );
      await fs.writeFile(
        path.join(testDir, "file.txt.bak.2024-01-16T11-45-30-456Z"),
        "backup3",
      );

      const backups = await findBackups(testDir);

      expect(backups).toHaveLength(3);
      expect(backups.every((backup) => backup.name === "file.txt")).toBe(true);
    });

    it("should handle files with multiple dots in name", async () => {
      await fs.writeFile(path.join(testDir, "my.config.json.bak"), "backup");

      const backups = await findBackups(testDir);

      expect(backups[0].name).toBe("my.config.json");
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore a file from its backup", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const backupPath = path.join(testDir, "file.txt.bak");
      const backupContent = "backup content";

      await fs.writeFile(backupPath, backupContent);

      const backup: BackupInfo = {
        backupPath,
        originalPath,
        name: "file.txt",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("installed");
      expect(result.name).toBe("file.txt");
      expect(result.message).toContain("restored from file.txt.bak");

      // Original file should have backup content
      expect(await fs.readFile(originalPath, "utf-8")).toBe(backupContent);

      // Backup file should no longer exist
      await expect(fs.access(backupPath)).rejects.toThrow();
    });

    it("should replace existing file when restoring", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const backupPath = path.join(testDir, "file.txt.bak");

      await fs.writeFile(originalPath, "current content");
      await fs.writeFile(backupPath, "backup content");

      const backup: BackupInfo = {
        backupPath,
        originalPath,
        name: "file.txt",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("installed");
      expect(await fs.readFile(originalPath, "utf-8")).toBe("backup content");
    });

    it("should replace symlink when restoring", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const backupPath = path.join(testDir, "file.txt.bak");
      const targetPath = path.join(testDir, "target.txt");

      await fs.writeFile(targetPath, "target content");
      await fs.symlink(targetPath, originalPath);
      await fs.writeFile(backupPath, "backup content");

      const backup: BackupInfo = {
        backupPath,
        originalPath,
        name: "file.txt",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("installed");

      // Should be a regular file now, not a symlink
      const stats = await fs.lstat(originalPath);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(await fs.readFile(originalPath, "utf-8")).toBe("backup content");
    });

    it("should restore when original does not exist", async () => {
      const originalPath = path.join(testDir, "file.txt");
      const backupPath = path.join(testDir, "file.txt.bak");

      await fs.writeFile(backupPath, "backup content");

      const backup: BackupInfo = {
        backupPath,
        originalPath,
        name: "file.txt",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("installed");
      expect(await fs.readFile(originalPath, "utf-8")).toBe("backup content");
    });

    it("should return failed status when backup does not exist", async () => {
      const backup: BackupInfo = {
        backupPath: path.join(testDir, "nonexistent.bak"),
        originalPath: path.join(testDir, "file.txt"),
        name: "file.txt",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("failed");
      expect(result.message).toContain("failed to restore");
    });

    it("should restore timestamped backup", async () => {
      const originalPath = path.join(testDir, "config.json");
      const timestamp = "2024-01-15T10-30-00-123Z";
      const backupPath = path.join(testDir, `config.json.bak.${timestamp}`);

      await fs.writeFile(backupPath, "timestamped backup");

      const backup: BackupInfo = {
        backupPath,
        originalPath,
        name: "config.json",
      };

      const result = await restoreFromBackup(backup);

      expect(result.status).toBe("installed");
      expect(await fs.readFile(originalPath, "utf-8")).toBe(
        "timestamped backup",
      );
    });
  });

  describe("Integration: Backup and Restore Workflow", () => {
    it("should complete full backup and restore cycle", async () => {
      const filePath = path.join(testDir, "important.txt");
      const originalContent = "important data";
      const modifiedContent = "modified data";

      // Create original file
      await fs.writeFile(filePath, originalContent);

      // Backup the file
      const backupPath = await backupFile(filePath);
      expect(backupPath).toBeTruthy();

      // Modify the original
      await fs.writeFile(filePath, modifiedContent);
      expect(await fs.readFile(filePath, "utf-8")).toBe(modifiedContent);

      // Find the backup
      const backups = await findBackups(testDir);
      expect(backups).toHaveLength(1);

      // Restore from backup
      const result = await restoreFromBackup(backups[0]);
      expect(result.status).toBe("installed");

      // Verify restoration
      expect(await fs.readFile(filePath, "utf-8")).toBe(originalContent);
    });

    it("should handle multiple backups and selective restore", async () => {
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");

      await fs.writeFile(file1, "content1");
      await fs.writeFile(file2, "content2");

      // Backup both files
      await backupFile(file1);
      await backupFile(file2);

      // Modify both files
      await fs.writeFile(file1, "modified1");
      await fs.writeFile(file2, "modified2");

      // Find all backups
      const backups = await findBackups(testDir);
      expect(backups).toHaveLength(2);

      // Restore only file1
      const file1Backup = backups.find((b) => b.name === "file1.txt");
      expect(file1Backup).toBeDefined();
      await restoreFromBackup(file1Backup as BackupInfo);

      // Verify file1 restored, file2 still modified
      expect(await fs.readFile(file1, "utf-8")).toBe("content1");
      expect(await fs.readFile(file2, "utf-8")).toBe("modified2");
    });
  });
});

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

describe("Logging and Summary", () => {
  describe("logResult", () => {
    it("should log installed status", () => {
      const result: SymlinkResult = { name: "test", status: "installed", message: "created" };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log skipped status", () => {
      const result: SymlinkResult = { name: "test", status: "skipped", message: "exists" };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log failed status", () => {
      const result: SymlinkResult = { name: "test", status: "failed", message: "error" };
      expect(() => logResult(result)).not.toThrow();
    });

    it("should log backed_up status", () => {
      const result: SymlinkResult = { name: "test", status: "backed_up", message: "backed up" };
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
      const results: SymlinkResult[] = [{ name: "a", status: "installed", message: "created" }];
      expect(() => printSummary(results)).not.toThrow();
    });
  });
});

describe("getMarkdownFiles", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "md-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should return markdown files without extension", async () => {
    await fs.writeFile(path.join(testDir, "file1.md"), "content");
    await fs.writeFile(path.join(testDir, "file2.md"), "content");
    await fs.writeFile(path.join(testDir, "other.txt"), "content");

    const files = await getMarkdownFiles(testDir);

    expect(files).toHaveLength(2);
    expect(files).toContain("file1");
    expect(files).toContain("file2");
  });

  it("should return empty array for directory with no markdown files", async () => {
    await fs.writeFile(path.join(testDir, "file.txt"), "content");
    const files = await getMarkdownFiles(testDir);
    expect(files).toEqual([]);
  });

  it("should return empty array for non-existent directory", async () => {
    const files = await getMarkdownFiles(path.join(testDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  it("should handle files with multiple dots", async () => {
    await fs.writeFile(path.join(testDir, "my.config.md"), "content");
    const files = await getMarkdownFiles(testDir);
    expect(files).toContain("my.config");
  });
});

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
