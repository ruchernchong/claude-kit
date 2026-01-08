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

async function main() {
  intro("Claude Code Commands Installer");

  // Get available commands
  const availableCommands = await getMarkdownFiles(COMMANDS_SOURCE_DIR);

  if (availableCommands.length === 0) {
    log.error("No command files found in commands directory");
    process.exit(1);
  }

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

  const loadingSpinner = spinner();
  loadingSpinner.start("Installing commands");

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

  loadingSpinner.stop("Commands processed");

  // Log individual results
  for (const result of installResults) {
    logResult(result);
  }

  printSummary(installResults);

  // Show available commands
  const installedCommands = installResults
    .filter(
      (result) => result.status === "installed" || result.status === "skipped",
    )
    .map((result) => result.name.replace(".md", ""));

  if (installedCommands.length > 0) {
    log.message("Available commands (type /command-name):");
    for (const command of installedCommands) {
      log.info(`  /${command}`);
    }
  }

  outro("Installation complete!");
}

main().catch(console.error);
