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
  } catch {
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
 * Backup a file by adding .bak extension
 */
export async function backupFile(filePath: string): Promise<boolean> {
  if (!(await exists(filePath))) return true;
  if (await isSymlink(filePath)) return true;

  let backupPath = `${filePath}.bak`;

  if (await exists(backupPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = `${filePath}.bak.${timestamp}`;
  }

  try {
    await fs.copyFile(filePath, backupPath);
    log.info(
      `Backed up: ${path.basename(filePath)} → ${path.basename(backupPath)}`,
    );
    return true;
  } catch {
    log.warning(`Could not backup ${path.basename(filePath)}`);
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

/**
 * Create a directory symlink
 */
export async function createDirectorySymlink(
  name: string,
  sourceDir: string,
  targetDir: string,
): Promise<SymlinkResult> {
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await isDirectory(source))) {
    return {
      name,
      status: "skipped",
      message: "source directory does not exist",
    };
  }

  if (await isSymlink(target)) {
    const existingTarget = await fs.readlink(target);
    if (existingTarget === source) {
      return { name, status: "skipped", message: "already configured" };
    }
    return {
      name,
      status: "failed",
      message: `symlink exists but points to: ${existingTarget}`,
    };
  }

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(target), { recursive: true });

  // Handle existing directory
  if (await isDirectory(target)) {
    try {
      await fs.rmdir(target);
    } catch {
      return {
        name,
        status: "failed",
        message: `${target} is not empty. Please remove it manually.`,
      };
    }
  }

  if (await exists(target)) {
    return {
      name,
      status: "failed",
      message: `${target} exists but is not a symlink or directory.`,
    };
  }

  try {
    await fs.symlink(source, target);
    return {
      name,
      status: "installed",
      message: `created symlink → ${source}`,
    };
  } catch {
    return { name, status: "failed", message: "failed to create symlink" };
  }
}

/**
 * Create a file symlink
 */
export async function createFileSymlink(
  name: string,
  sourceDir: string,
  targetDir: string,
): Promise<SymlinkResult> {
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);

  if (!(await exists(source))) {
    return { name, status: "skipped", message: "source file does not exist" };
  }

  if (await isSymlink(target)) {
    const existingTarget = await fs.readlink(target);
    if (existingTarget === source) {
      return { name, status: "skipped", message: "already configured" };
    }
    return {
      name,
      status: "failed",
      message: `symlink exists but points to: ${existingTarget}`,
    };
  }

  if (await exists(target)) {
    return {
      name,
      status: "failed",
      message: `${target} exists but is not a symlink. Please remove it manually.`,
    };
  }

  try {
    await fs.symlink(source, target);
    return {
      name,
      status: "installed",
      message: `created symlink → ${source}`,
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
