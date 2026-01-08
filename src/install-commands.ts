import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  spinner,
} from "@clack/prompts";
import {
  CLAUDE_DIR,
  createSymlink,
  getMarkdownFiles,
  logResult,
  printSummary,
  ROOT_DIR,
  type SymlinkResult,
} from "./utils.js";

const COMMANDS_SOURCE_DIR = path.join(ROOT_DIR, "commands");
const COMMANDS_INSTALL_DIR = path.join(CLAUDE_DIR, "commands");

// Parse CLI arguments
const args = process.argv.slice(2);
const ciMode = args.includes("--ci");
const commandArgs = args.filter((arg) => !arg.startsWith("--"));

async function runInteractive(availableCommands: string[]) {
  intro("Claude Code Commands Installer");

  // Let user select which commands to install
  const selectedCommands = await multiselect({
    message: "Select commands to install",
    options: availableCommands.map((command) => ({
      value: command,
      label: `/${command}`,
    })),
    initialValues: availableCommands, // All selected by default
  });

  if (isCancel(selectedCommands)) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  if (selectedCommands.length === 0) {
    log.warning("No commands selected");
    process.exit(0);
  }

  // Warn about overwriting
  log.warning("Existing commands will be overwritten!");
  log.info("Backups will be saved with a .bak extension.");

  const userConfirmedInstall = await confirm({
    message: `Install ${selectedCommands.length} command(s)?`,
  });

  if (isCancel(userConfirmedInstall) || !userConfirmedInstall) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  return selectedCommands;
}

async function runCI(
  availableCommands: string[],
  requestedCommands: string[],
): Promise<string[]> {
  console.log("Installing Claude Code slash commands (CI mode)");
  console.log(`Source: ${COMMANDS_SOURCE_DIR}`);
  console.log(`Target: ${COMMANDS_INSTALL_DIR}`);
  console.log();

  // Warn about overwriting
  console.log("WARNING: Existing commands will be overwritten!");
  console.log("Backups will be saved with a .bak extension.");
  console.log();

  // If specific commands requested, validate and use those
  if (requestedCommands.length > 0) {
    const validCommands: string[] = [];
    for (const cmd of requestedCommands) {
      if (availableCommands.includes(cmd)) {
        validCommands.push(cmd);
      } else {
        console.log(`Skipped: /${cmd} (not found)`);
      }
    }
    return validCommands;
  }

  // Default: install all commands
  return availableCommands;
}

async function main() {
  // Get available commands
  const availableCommands = await getMarkdownFiles(COMMANDS_SOURCE_DIR);

  if (availableCommands.length === 0) {
    const message = "No command files found in commands directory";
    if (ciMode) {
      console.error(message);
    } else {
      log.error(message);
    }
    process.exit(1);
  }

  // Get commands to install based on mode
  const selectedCommands = ciMode
    ? await runCI(availableCommands, commandArgs)
    : await runInteractive(availableCommands);

  if (selectedCommands.length === 0) {
    const message = "No commands to install";
    if (ciMode) {
      console.error(message);
    } else {
      log.warning(message);
    }
    process.exit(1);
  }

  const loadingSpinner = ciMode ? null : spinner();
  loadingSpinner?.start("Installing commands");

  const installResults: SymlinkResult[] = [];

  for (const commandName of selectedCommands) {
    const sourceFile = path.join(COMMANDS_SOURCE_DIR, `${commandName}.md`);
    const result = await createSymlink(
      sourceFile,
      COMMANDS_INSTALL_DIR,
      `${commandName}.md`,
    );
    installResults.push(result);
  }

  loadingSpinner?.stop("Commands processed");

  // Log individual results
  for (const result of installResults) {
    if (ciMode) {
      const symbol =
        result.status === "installed"
          ? "✓"
          : result.status === "skipped"
            ? "⏭"
            : "✗";
      console.log(`${symbol} ${result.name}: ${result.message}`);
    } else {
      logResult(result);
    }
  }

  printSummary(installResults);

  // Show available commands
  const installedCommands = installResults
    .filter(
      (result) => result.status === "installed" || result.status === "skipped",
    )
    .map((result) => result.name.replace(".md", ""));

  if (installedCommands.length > 0) {
    const message = "Available commands (type /command-name):";
    if (ciMode) {
      console.log();
      console.log(message);
    } else {
      log.message(message);
    }
    for (const command of installedCommands) {
      if (ciMode) {
        console.log(`  /${command}`);
      } else {
        log.info(`  /${command}`);
      }
    }
  }

  if (ciMode) {
    console.log();
    console.log("Installation complete!");
  } else {
    outro("Installation complete!");
  }
}

main().catch(console.error);
