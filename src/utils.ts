import fs from "node:fs/promises";
import path from "node:path";
import { log } from "@clack/prompts";

export const ROOT_DIR = path.resolve(import.meta.dirname, "..");
export const HOME_DIR = process.env.HOME || "";
export const CLAUDE_DIR = path.join(HOME_DIR, ".claude");

export interface SymlinkResult {
  name: string;
  status: "installed" | "skipped" | "failed" | "backed_up";
  message: string;
}

/**
 * Check if a path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a symlink
 */
export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    return stats.isSymbolicLink();
  } catch (err) {
    // Handle ELOOP (symlink loop) errors
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ELOOP"
    ) {
      return true; // It is a symlink, just broken
    }
    return false;
  }
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Generate a backup path with optional timestamp (same directory as original)
 */
export async function getBackupPath(originalPath: string): Promise<string> {
  let backupPath = `${originalPath}.bak`;

  if (await exists(backupPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = `${originalPath}.bak.${timestamp}`;
  }

  return backupPath;
}

/**
 * Backup a file by adding .bak extension (same directory as original)
 */
export async function backupFile(filePath: string): Promise<string | null> {
  if (!(await exists(filePath))) return null;
  if (await isSymlink(filePath)) return null;

  const backupPath = await getBackupPath(filePath);

  try {
    await fs.copyFile(filePath, backupPath);
    log.info(
      `Backed up: ${path.basename(filePath)} → ${path.basename(backupPath)}`,
    );
    return backupPath;
  } catch {
    log.warning(`Could not backup ${path.basename(filePath)}`);
    return null;
  }
}

/**
 * Remove a directory recursively
 */
export async function removeDirectory(dirPath: string): Promise<boolean> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a symlink, handling existing files/symlinks
 */
export async function createSymlink(
  source: string,
  targetDir: string,
  linkName: string,
): Promise<SymlinkResult> {
  const targetPath = path.join(targetDir, linkName);

  // Ensure target directory exists
  await fs.mkdir(targetDir, { recursive: true });

  // Check if symlink already exists and points to correct location
  if (await isSymlink(targetPath)) {
    const existingTarget = await fs.readlink(targetPath);
    if (existingTarget === source) {
      return { name: linkName, status: "skipped", message: "already linked" };
    }
    await fs.unlink(targetPath);
  } else if (await exists(targetPath)) {
    await backupFile(targetPath);
    await fs.unlink(targetPath);
  }

  try {
    await fs.symlink(source, targetPath);
    return { name: linkName, status: "installed", message: "created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { name: linkName, status: "failed", message };
  }
}

export interface SymlinkOptions {
  forceReplace?: boolean;
}

/**
 * Create a directory symlink using relative paths
 */
export async function createDirectorySymlink(
  name: string,
  sourceDir: string,
  targetDir: string,
  options: SymlinkOptions = {},
): Promise<SymlinkResult> {
  const { forceReplace = false } = options;
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await isDirectory(source))) {
    return {
      name,
      status: "skipped",
      message: "source directory does not exist",
    };
  }

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(target), { recursive: true });

  // Calculate relative path from target's directory to source
  const relativePath = path.relative(path.dirname(target), source);

  if (await isSymlink(target)) {
    try {
      const existingTarget = await fs.readlink(target);
      // Resolve to absolute for comparison (handles both relative and absolute symlinks)
      const resolvedExisting = path.resolve(
        path.dirname(target),
        existingTarget,
      );
      if (resolvedExisting === path.resolve(source)) {
        return { name, status: "skipped", message: "already configured" };
      }
    } catch {
      // ELOOP or other error - remove the broken symlink
    }
    // Remove symlink pointing elsewhere
    await fs.rm(target, { force: true });
  } else if (await isDirectory(target)) {
    // Remove existing directory (no backup for directories)
    if (!forceReplace) {
      return {
        name,
        status: "failed",
        message: `directory exists at ${target}. Use force replace to remove it.`,
      };
    }
    const removed = await removeDirectory(target);
    if (!removed) {
      return {
        name,
        status: "failed",
        message: `failed to remove existing directory at ${target}`,
      };
    }
    log.info(`Removed existing directory: ${target}`);
  } else if (await exists(target)) {
    return {
      name,
      status: "failed",
      message: `${target} exists but is not a symlink or directory.`,
    };
  }

  try {
    await fs.symlink(relativePath, target);
    return {
      name,
      status: "installed",
      message: `created symlink → ${relativePath}`,
    };
  } catch {
    return { name, status: "failed", message: "failed to create symlink" };
  }
}

/**
 * Create a file symlink using relative paths
 */
export async function createFileSymlink(
  name: string,
  sourceDir: string,
  targetDir: string,
  options: SymlinkOptions = {},
): Promise<SymlinkResult> {
  const { forceReplace = false } = options;
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await exists(source))) {
    return { name, status: "skipped", message: "source file does not exist" };
  }

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(target), { recursive: true });

  // Calculate relative path from target's directory to source
  const relativePath = path.relative(path.dirname(target), source);

  if (await isSymlink(target)) {
    try {
      const existingTarget = await fs.readlink(target);
      // Resolve to absolute for comparison (handles both relative and absolute symlinks)
      const resolvedExisting = path.resolve(
        path.dirname(target),
        existingTarget,
      );
      if (resolvedExisting === path.resolve(source)) {
        return { name, status: "skipped", message: "already configured" };
      }
    } catch {
      // ELOOP or other error - remove the broken symlink
    }
    // Remove symlink pointing elsewhere
    await fs.rm(target, { force: true });
  } else if (await exists(target)) {
    // Backup existing file before replacing
    if (!forceReplace) {
      return {
        name,
        status: "failed",
        message: `file exists at ${target}. Use force replace to backup and replace it.`,
      };
    }
    const backupPath = await backupFile(target);
    if (backupPath) {
      await fs.unlink(target);
    } else {
      return {
        name,
        status: "failed",
        message: `failed to backup existing file at ${target}`,
      };
    }
  }

  try {
    await fs.symlink(relativePath, target);
    return {
      name,
      status: "installed",
      message: `created symlink → ${relativePath}`,
    };
  } catch {
    return { name, status: "failed", message: "failed to create symlink" };
  }
}

/**
 * Log a symlink result with appropriate styling
 */
export function logResult(result: SymlinkResult): void {
  switch (result.status) {
    case "installed":
      log.success(`${result.name}: ${result.message}`);
      break;
    case "skipped":
      log.info(`${result.name}: ${result.message}`);
      break;
    case "failed":
      log.error(`${result.name}: ${result.message}`);
      break;
    case "backed_up":
      log.info(`${result.name}: ${result.message}`);
      break;
  }
}

/**
 * Print summary of results
 */
export function printSummary(results: SymlinkResult[]): void {
  const installed = results.filter(
    (result) => result.status === "installed",
  ).length;
  const skipped = results.filter(
    (result) => result.status === "skipped",
  ).length;
  const failed = results.filter((result) => result.status === "failed").length;

  console.log();
  if (installed > 0) log.success(`Installed: ${installed}`);
  if (skipped > 0) log.info(`Skipped: ${skipped}`);
  if (failed > 0) log.error(`Failed: ${failed}`);
}

/**
 * Get all markdown files from a directory
 */
export async function getMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(".md", ""));
  } catch {
    return [];
  }
}

/**
 * Get all items (files and directories) in a directory
 * Excludes backup files (.bak) and hidden files (starting with .)
 */
export async function getDirectoryItems(
  dir: string,
): Promise<{ files: string[]; directories: string[] }> {
  const files: string[] = [];
  const directories: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden files and backup files
      if (entry.name.startsWith(".") || entry.name.includes(".bak")) {
        continue;
      }
      if (entry.isDirectory()) {
        directories.push(entry.name);
      } else if (entry.isFile()) {
        files.push(entry.name);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return { files, directories };
}

export interface ConflictInfo {
  name: string;
  targetPath: string;
  sourcePath: string;
  type: "directory" | "file";
  conflictType: "existing_symlink" | "existing_file" | "existing_directory";
  existingTarget?: string;
}

/**
 * Check for conflicts before creating symlinks
 */
export async function checkDirectoryConflict(
  name: string,
  sourceDir: string,
  targetDir: string,
): Promise<ConflictInfo | null> {
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await isDirectory(source))) {
    return null;
  }

  if (await isSymlink(target)) {
    const existingTarget = await fs.readlink(target);
    if (existingTarget === source) {
      return null; // Already correctly configured
    }
    return {
      name,
      targetPath: target,
      sourcePath: source,
      type: "directory",
      conflictType: "existing_symlink",
      existingTarget,
    };
  }

  if (await isDirectory(target)) {
    return {
      name,
      targetPath: target,
      sourcePath: source,
      type: "directory",
      conflictType: "existing_directory",
    };
  }

  if (await exists(target)) {
    return {
      name,
      targetPath: target,
      sourcePath: source,
      type: "directory",
      conflictType: "existing_file",
    };
  }

  return null;
}

/**
 * Check for file conflicts before creating symlinks
 */
export async function checkFileConflict(
  name: string,
  sourceDir: string,
  targetDir: string,
): Promise<ConflictInfo | null> {
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await exists(source))) {
    return null;
  }

  if (await isSymlink(target)) {
    const existingTarget = await fs.readlink(target);
    if (existingTarget === source) {
      return null; // Already correctly configured
    }
    return {
      name,
      targetPath: target,
      sourcePath: source,
      type: "file",
      conflictType: "existing_symlink",
      existingTarget,
    };
  }

  if (await exists(target)) {
    return {
      name,
      targetPath: target,
      sourcePath: source,
      type: "file",
      conflictType: "existing_file",
    };
  }

  return null;
}

export interface BackupInfo {
  backupPath: string;
  originalPath: string;
  name: string;
}

/**
 * Find all .bak files in a directory
 */
export async function findBackups(directory: string): Promise<BackupInfo[]> {
  const backups: BackupInfo[] = [];

  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      if (file.includes(".bak")) {
        const backupPath = path.join(directory, file);
        // Extract original name (remove .bak and any timestamp suffix)
        const originalName = file.replace(
          /\.bak(\.\d{4}-\d{2}-\d{2}T.*)?$/,
          "",
        );
        const originalPath = path.join(directory, originalName);
        backups.push({
          backupPath,
          originalPath,
          name: originalName,
        });
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return backups;
}

/**
 * Restore a file from its backup
 */
export async function restoreFromBackup(
  backup: BackupInfo,
): Promise<SymlinkResult> {
  const { backupPath, originalPath, name } = backup;

  try {
    // Remove existing file/symlink at original path
    if (await isSymlink(originalPath)) {
      await fs.unlink(originalPath);
    } else if (await exists(originalPath)) {
      await fs.unlink(originalPath);
    }

    // Move backup to original location
    await fs.rename(backupPath, originalPath);

    return {
      name,
      status: "installed",
      message: `restored from ${path.basename(backupPath)}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      name,
      status: "failed",
      message: `failed to restore: ${message}`,
    };
  }
}
