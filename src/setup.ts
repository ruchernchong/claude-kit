import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  spinner,
} from "@clack/prompts";
import {
  CLAUDE_DIR,
  type ConflictInfo,
  checkDirectoryConflict,
  checkFileConflict,
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

async function detectConflicts(): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  // Check directory symlinks
  for (const directoryName of DIRECTORY_SYMLINKS) {
    const conflict = await checkDirectoryConflict(
      directoryName,
      ROOT_DIR,
      CLAUDE_DIR,
    );
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check file symlinks
  for (const fileName of FILE_SYMLINKS) {
    const conflict = await checkFileConflict(fileName, ROOT_DIR, HOME_DIR);
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check memory symlink
  const memoryConflict = await checkFileConflict(
    "CLAUDE.md",
    path.join(ROOT_DIR, "memory"),
    CLAUDE_DIR,
  );
  if (memoryConflict) {
    conflicts.push(memoryConflict);
  }

  return conflicts;
}

function describeConflict(conflict: ConflictInfo): string {
  switch (conflict.conflictType) {
    case "existing_symlink":
      return `${conflict.targetPath} is a symlink pointing to: ${conflict.existingTarget}`;
    case "existing_directory":
      return `${conflict.targetPath} is an existing directory`;
    case "existing_file":
      return `${conflict.targetPath} is an existing file`;
  }
}

function describeAction(conflict: ConflictInfo): string {
  if (conflict.conflictType === "existing_symlink") {
    return "Will remove old symlink and create new one";
  }
  if (conflict.type === "directory") {
    return "Will remove directory and create symlink";
  }
  return "Will backup file and create symlink";
}

async function main() {
  intro("Claude Kit Setup");

  const loadingSpinner = spinner();
  loadingSpinner.start("Checking for conflicts");

  const conflicts = await detectConflicts();

  loadingSpinner.stop("Conflict check complete");

  let forceReplace = false;

  if (conflicts.length > 0) {
    log.warning(`Found ${conflicts.length} conflict(s):`);
    console.log();

    for (const conflict of conflicts) {
      log.info(`  ${conflict.name}:`);
      log.info(`    ${describeConflict(conflict)}`);
      log.info(`    ${describeAction(conflict)}`);
      console.log();
    }

    const userConfirmedReplace = await confirm({
      message:
        "Do you want to proceed? (Symlinks will be replaced, existing files will be backed up, directories will be removed)",
    });

    if (isCancel(userConfirmedReplace) || !userConfirmedReplace) {
      cancel("Setup cancelled");
      process.exit(0);
    }

    forceReplace = true;
  } else {
    const userConfirmedSetup = await confirm({
      message: "This will create symlinks in ~/.claude/ and ~/. Continue?",
    });

    if (isCancel(userConfirmedSetup) || !userConfirmedSetup) {
      cancel("Setup cancelled");
      process.exit(0);
    }
  }

  loadingSpinner.start("Creating symlinks");

  const symlinkResults: SymlinkResult[] = [];
  const symlinkOptions = { forceReplace };

  // Create directory symlinks (agents, commands, skills)
  for (const directoryName of DIRECTORY_SYMLINKS) {
    const result = await createDirectorySymlink(
      directoryName,
      ROOT_DIR,
      CLAUDE_DIR,
      symlinkOptions,
    );
    symlinkResults.push(result);
  }

  // Create file symlinks (.mcp.json)
  for (const fileName of FILE_SYMLINKS) {
    const result = await createFileSymlink(
      fileName,
      ROOT_DIR,
      HOME_DIR,
      symlinkOptions,
    );
    symlinkResults.push(result);
  }

  // Create memory symlink (memory/CLAUDE.md -> ~/.claude/CLAUDE.md)
  const memoryResult = await createFileSymlink(
    "CLAUDE.md",
    path.join(ROOT_DIR, "memory"),
    CLAUDE_DIR,
    symlinkOptions,
  );
  symlinkResults.push(memoryResult);

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
