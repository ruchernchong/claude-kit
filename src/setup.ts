import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  spinner,
} from "@clack/prompts";
import {
  CLAUDE_DIR,
  createDirectorySymlink,
  createFileSymlink,
  HOME_DIR,
  logResult,
  printSummary,
  ROOT_DIR,
  type SymlinkResult,
} from "./utils.js";

const DIRECTORY_SYMLINKS = ["agents", "commands", "skills"];
const FILE_SYMLINKS = [".mcp.json"];

async function main() {
  intro("Claude Kit Setup");

  const userConfirmedSetup = await confirm({
    message: "This will create symlinks in ~/.claude/ and ~/. Continue?",
  });

  if (isCancel(userConfirmedSetup) || !userConfirmedSetup) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  const loadingSpinner = spinner();
  loadingSpinner.start("Creating symlinks");

  const symlinkResults: SymlinkResult[] = [];

  // Create directory symlinks (agents, commands, skills)
  for (const directoryName of DIRECTORY_SYMLINKS) {
    const result = await createDirectorySymlink(
      directoryName,
      ROOT_DIR,
      CLAUDE_DIR,
    );
    symlinkResults.push(result);
  }

  // Create file symlinks (.mcp.json)
  for (const fileName of FILE_SYMLINKS) {
    const result = await createFileSymlink(fileName, ROOT_DIR, HOME_DIR);
    symlinkResults.push(result);
  }

  loadingSpinner.stop("Symlinks processed");

  // Log individual results
  for (const result of symlinkResults) {
    logResult(result);
  }

  printSummary(symlinkResults);

  const failedCount = symlinkResults.filter(
    (result) => result.status === "failed",
  ).length;

  if (failedCount > 0) {
    outro(`Setup completed with ${failedCount} error(s)`);
    process.exit(1);
  }

  outro("Setup complete!");
}

main().catch(console.error);
