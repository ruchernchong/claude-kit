import fs from "node:fs/promises";
import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import { CLAUDE_DIR, exists, ROOT_DIR } from "./utils.js";

const STATUSLINES_SOURCE_DIR = path.join(ROOT_DIR, "statuslines");
const STATUSLINE_TARGET_PATH = path.join(CLAUDE_DIR, "statusline.sh");
const SETTINGS_PATH = path.join(CLAUDE_DIR, "settings.json");

// Parse CLI arguments
const args = process.argv.slice(2);
const ciMode = args.includes("--ci");
const statuslineArg = args.find((arg) => !arg.startsWith("--"));

interface StatuslineInfo {
  name: string;
  path: string;
  preview: string;
}

interface SettingsJson {
  statusLine?: {
    type: string;
    command: string;
    padding?: number;
  };
  [key: string]: unknown;
}

/**
 * Get all shell scripts from statuslines directory
 */
async function getStatuslines(): Promise<string[]> {
  try {
    const files = await fs.readdir(STATUSLINES_SOURCE_DIR);
    return files
      .filter((file) => file.endsWith(".sh"))
      .map((file) => file.replace(".sh", ""));
  } catch {
    return [];
  }
}

/**
 * Generate a preview of what the statusline would display
 */
function generatePreview(name: string): string {
  switch (name) {
    case "full":
      return `📁 project 🌿 main 🤖 Opus 📟 v1.0.85
🧠 Context: 42% [====------]
💰 $1.23 ($5.50/h) 📊 125K tok`;
    default:
      return "(No preview available)";
  }
}

/**
 * Get statusline information
 */
async function getStatuslineInfo(name: string): Promise<StatuslineInfo> {
  return {
    name,
    path: path.join(STATUSLINES_SOURCE_DIR, `${name}.sh`),
    preview: generatePreview(name),
  };
}

/**
 * Read existing settings.json or return empty object
 */
async function readSettings(): Promise<SettingsJson> {
  try {
    if (await exists(SETTINGS_PATH)) {
      const content = await fs.readFile(SETTINGS_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Ignore parse errors, start fresh
  }
  return {};
}

/**
 * Write settings.json
 */
async function writeSettings(settings: SettingsJson): Promise<void> {
  await fs.mkdir(CLAUDE_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
}

/**
 * Install the statusline script
 */
async function installStatusline(statusline: StatuslineInfo): Promise<boolean> {
  try {
    // Copy script to target location
    await fs.mkdir(CLAUDE_DIR, { recursive: true });
    await fs.copyFile(statusline.path, STATUSLINE_TARGET_PATH);
    await fs.chmod(STATUSLINE_TARGET_PATH, 0o755);

    // Update settings.json
    const settings = await readSettings();
    settings.statusLine = {
      type: "command",
      command: "~/.claude/statusline.sh",
      padding: 0,
    };
    await writeSettings(settings);

    return true;
  } catch (error) {
    if (!ciMode) {
      log.error(
        `Installation failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    return false;
  }
}

async function runInteractive(
  availableStatuslines: string[],
): Promise<string | null> {
  intro("Claude Code Statusline Installer");

  // Let user select a statusline
  const selectedStatusline = await select({
    message: "Select a statusline to install",
    options: availableStatuslines.map((name) => ({
      value: name,
      label: name,
      hint: "3-line display with context, cost, and tokens",
    })),
  });

  if (isCancel(selectedStatusline)) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  // Show preview
  const info = await getStatuslineInfo(selectedStatusline);
  note(info.preview, "Preview");

  // Confirm installation
  log.warning("This will overwrite any existing statusline configuration.");

  const userConfirmed = await confirm({
    message: "Install this statusline?",
  });

  if (isCancel(userConfirmed) || !userConfirmed) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  return selectedStatusline;
}

async function runCI(
  availableStatuslines: string[],
  requestedStatusline?: string,
): Promise<string | null> {
  console.log("Installing Claude Code statusline (CI mode)");
  console.log(`Source: ${STATUSLINES_SOURCE_DIR}`);
  console.log(`Target: ${STATUSLINE_TARGET_PATH}`);
  console.log();

  // Use requested statusline or default to first available
  const statuslineName = requestedStatusline || availableStatuslines[0];

  if (!availableStatuslines.includes(statuslineName)) {
    console.error(`Statusline '${statuslineName}' not found`);
    console.log(`Available: ${availableStatuslines.join(", ")}`);
    return null;
  }

  return statuslineName;
}

async function main() {
  // Get available statuslines
  const availableStatuslines = await getStatuslines();

  if (availableStatuslines.length === 0) {
    const message = "No statusline scripts found in statuslines directory";
    if (ciMode) {
      console.error(message);
    } else {
      log.error(message);
    }
    process.exit(1);
  }

  // Get statusline to install based on mode
  const selectedStatusline = ciMode
    ? await runCI(availableStatuslines, statuslineArg)
    : await runInteractive(availableStatuslines);

  if (!selectedStatusline) {
    process.exit(1);
  }

  const loadingSpinner = ciMode ? null : spinner();
  loadingSpinner?.start("Installing statusline");

  const info = await getStatuslineInfo(selectedStatusline);
  const success = await installStatusline(info);

  loadingSpinner?.stop(
    success ? "Statusline installed" : "Installation failed",
  );

  if (success) {
    if (ciMode) {
      console.log(`✓ Installed: ${selectedStatusline}`);
      console.log(`  Script: ${STATUSLINE_TARGET_PATH}`);
      console.log(`  Settings: ${SETTINGS_PATH}`);
    } else {
      log.success(`Installed: ${selectedStatusline}`);
      log.info(`Script: ${STATUSLINE_TARGET_PATH}`);
      log.info(`Settings: ${SETTINGS_PATH}`);
    }
  } else {
    if (ciMode) {
      console.error(`✗ Failed to install: ${selectedStatusline}`);
    } else {
      log.error(`Failed to install: ${selectedStatusline}`);
    }
    process.exit(1);
  }

  if (ciMode) {
    console.log();
    console.log("Installation complete!");
    console.log("Restart Claude Code to see the statusline.");
  } else {
    outro("Installation complete! Restart Claude Code to see the statusline.");
  }
}

main().catch(console.error);
