import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import {
  type BackupInfo,
  CLAUDE_DIR,
  type ConflictInfo,
  checkDirectoryConflict,
  checkFileConflict,
  createDirectorySymlink,
  createFileSymlink,
  findBackups,
  getDirectoryItems,
  HOME_DIR,
  logResult,
  printSummary,
  ROOT_DIR,
  restoreFromBackup,
  type SymlinkResult,
} from "./utils.js";

// Directories containing items to symlink individually
const AGENTS_DIR = path.join(ROOT_DIR, "agents");
const SKILLS_DIR = path.join(ROOT_DIR, "skills");
const HOOKS_DIR = path.join(ROOT_DIR, "hooks");

// File symlinks
const FILE_SYMLINKS = [".mcp.json"];

async function detectConflicts(): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  // Check individual agent files (.md files)
  const { files: agentFiles } = await getDirectoryItems(AGENTS_DIR);
  for (const agentFile of agentFiles) {
    const conflict = await checkFileConflict(
      agentFile,
      AGENTS_DIR,
      path.join(CLAUDE_DIR, "agents"),
    );
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check individual skill directories
  const { directories: skillDirs } = await getDirectoryItems(SKILLS_DIR);
  for (const skillDir of skillDirs) {
    const conflict = await checkDirectoryConflict(
      skillDir,
      SKILLS_DIR,
      path.join(CLAUDE_DIR, "skills"),
    );
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check individual hook files (.sh files)
  const { files: hookFiles } = await getDirectoryItems(HOOKS_DIR);
  for (const hookFile of hookFiles) {
    const conflict = await checkFileConflict(
      hookFile,
      HOOKS_DIR,
      path.join(CLAUDE_DIR, "hooks"),
    );
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check file symlinks (.mcp.json)
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

async function runSetup() {
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

  // Create individual agent symlinks (.md files)
  const { files: agentFiles } = await getDirectoryItems(AGENTS_DIR);
  for (const agentFile of agentFiles) {
    const result = await createFileSymlink(
      agentFile,
      AGENTS_DIR,
      path.join(CLAUDE_DIR, "agents"),
      symlinkOptions,
    );
    symlinkResults.push(result);
  }

  // Create individual skill symlinks (directories)
  const { directories: skillDirs } = await getDirectoryItems(SKILLS_DIR);
  for (const skillDir of skillDirs) {
    const result = await createDirectorySymlink(
      skillDir,
      SKILLS_DIR,
      path.join(CLAUDE_DIR, "skills"),
      symlinkOptions,
    );
    symlinkResults.push(result);
  }

  // Create individual hook symlinks (.sh files)
  const { files: hookFiles } = await getDirectoryItems(HOOKS_DIR);
  for (const hookFile of hookFiles) {
    const result = await createFileSymlink(
      hookFile,
      HOOKS_DIR,
      path.join(CLAUDE_DIR, "hooks"),
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

async function runRestore() {
  const loadingSpinner = spinner();
  loadingSpinner.start("Searching for backups");

  // Search for backups in both directories
  const claudeDirBackups = await findBackups(CLAUDE_DIR);
  const homeDirBackups = await findBackups(HOME_DIR);
  const allBackups = [...claudeDirBackups, ...homeDirBackups];

  loadingSpinner.stop("Backup search complete");

  if (allBackups.length === 0) {
    log.info("No backup files found.");
    outro("Nothing to restore");
    return;
  }

  log.info(`Found ${allBackups.length} backup(s):`);
  console.log();

  const backupOptions = allBackups.map((backup) => ({
    value: backup,
    label: path.basename(backup.backupPath),
    hint: `restores to ${backup.originalPath}`,
  }));

  const selectedBackups = await multiselect({
    message: "Select backups to restore:",
    options: backupOptions,
    required: false,
  });

  if (isCancel(selectedBackups)) {
    cancel("Restore cancelled");
    process.exit(0);
  }

  if (!selectedBackups || selectedBackups.length === 0) {
    log.info("No backups selected.");
    outro("Nothing to restore");
    return;
  }

  const userConfirmed = await confirm({
    message: `Restore ${selectedBackups.length} backup(s)? This will replace current files/symlinks.`,
  });

  if (isCancel(userConfirmed) || !userConfirmed) {
    cancel("Restore cancelled");
    process.exit(0);
  }

  loadingSpinner.start("Restoring backups");

  const results: SymlinkResult[] = [];
  for (const backup of selectedBackups as BackupInfo[]) {
    const result = await restoreFromBackup(backup);
    results.push(result);
  }

  loadingSpinner.stop("Restore complete");

  for (const result of results) {
    logResult(result);
  }

  printSummary(results);

  const failedCount = results.filter(
    (result) => result.status === "failed",
  ).length;

  if (failedCount > 0) {
    outro(`Restore completed with ${failedCount} error(s)`);
    process.exit(1);
  }

  outro("Restore complete!");
}

async function main() {
  intro("Claude Kit Setup");

  const action = await select({
    message: "What would you like to do?",
    options: [
      {
        value: "setup",
        label: "Setup",
        hint: "Create symlinks for agents, skills, hooks, and config",
      },
      {
        value: "restore",
        label: "Restore backups",
        hint: "Restore previously backed up files",
      },
    ],
  });

  if (isCancel(action)) {
    cancel("Cancelled");
    process.exit(0);
  }

  if (action === "setup") {
    await runSetup();
  } else if (action === "restore") {
    await runRestore();
  }
}

main().catch(console.error);
