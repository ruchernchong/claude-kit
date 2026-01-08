import { execSync, spawn } from "node:child_process";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
} from "@clack/prompts";

const AVAILABLE_TESTS = [
  { value: "all", label: "All tests", hint: "Run complete test suite" },
  {
    value: "claude",
    label: "Claude installation",
    hint: "Test Claude Code setup",
  },
  {
    value: "idempotent",
    label: "Idempotent",
    hint: "Test running installer twice",
  },
  {
    value: "symlinks",
    label: "Symlink integrity",
    hint: "Verify symlinks are correct",
  },
  {
    value: "warnings",
    label: "Warning messages",
    hint: "Test installer warnings",
  },
  {
    value: "backup",
    label: "Backup functionality",
    hint: "Test .bak file creation",
  },
  {
    value: "interactive",
    label: "Interactive shell",
    hint: "Start test environment",
  },
] as const;

type TestTarget = (typeof AVAILABLE_TESTS)[number]["value"];

function getComposeCommand(): string {
  try {
    execSync("docker compose version", { stdio: "ignore" });
    return "docker compose";
  } catch {
    return "docker-compose";
  }
}

function checkDockerInstalled(): boolean {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkDockerComposeInstalled(): boolean {
  try {
    execSync("docker compose version", { stdio: "ignore" });
    return true;
  } catch {
    try {
      execSync("docker-compose --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

async function runTest(
  composeCommand: string,
  testName: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const [command, ...args] = composeCommand.split(" ");
    const childProcess = spawn(command, [...args, "run", "--rm", testName], {
      cwd: "tests",
      stdio: "inherit",
    });

    childProcess.on("close", (exitCode) => {
      resolve(exitCode === 0);
    });

    childProcess.on("error", () => {
      resolve(false);
    });
  });
}

async function runAllTests(composeCommand: string): Promise<void> {
  const testNames = ["claude", "idempotent", "symlinks", "warnings", "backup"];
  const failedTests: string[] = [];

  for (const testName of testNames) {
    log.info(`Running: ${testName}`);

    const testPassed = await runTest(composeCommand, testName);

    if (testPassed) {
      log.success(`${testName} passed`);
    } else {
      log.error(`${testName} failed`);
      failedTests.push(testName);
    }
  }

  // Summary
  const totalTests = testNames.length;
  const passedTests = totalTests - failedTests.length;

  console.log();
  log.success(`Passed: ${passedTests}/${totalTests}`);

  if (failedTests.length > 0) {
    log.error(`Failed: ${failedTests.length}/${totalTests}`);
    log.error(`Failed tests: ${failedTests.join(", ")}`);
    process.exit(1);
  }

  log.success("All tests passed!");
}

async function main() {
  intro("Claude Code Powertools - Test Suite");

  // Check Docker is installed
  if (!checkDockerInstalled()) {
    log.error("Docker is not installed or not in PATH");
    log.info("Please install Docker from https://docker.com/get-started");
    process.exit(1);
  }

  if (!checkDockerComposeInstalled()) {
    log.error("Docker Compose is not installed");
    process.exit(1);
  }

  const composeCommand = getComposeCommand();

  // Ask if user wants to rebuild
  const shouldRebuild = await confirm({
    message: "Rebuild Docker image before running tests?",
    initialValue: false,
  });

  if (isCancel(shouldRebuild)) {
    cancel("Test run cancelled");
    process.exit(0);
  }

  if (shouldRebuild) {
    const buildSpinner = spinner();
    buildSpinner.start("Building Docker image");

    try {
      execSync(`${composeCommand} build`, { cwd: "tests", stdio: "ignore" });
      buildSpinner.stop("Docker image built");
    } catch {
      buildSpinner.stop("Build failed");
      log.error("Failed to build Docker image");
      process.exit(1);
    }
  }

  // Select test to run
  const selectedTest = await select({
    message: "Which test to run?",
    options: AVAILABLE_TESTS.map((test) => ({
      value: test.value,
      label: test.label,
      hint: test.hint,
    })),
  });

  if (isCancel(selectedTest)) {
    cancel("Test run cancelled");
    process.exit(0);
  }

  const testTarget = selectedTest as TestTarget;

  if (testTarget === "all") {
    await runAllTests(composeCommand);
  } else if (testTarget === "interactive") {
    log.info("Starting interactive test environment...");
    log.info("Available commands:");
    log.info("  - bash scripts/install-claude.sh");
    log.info("  - ls ~/.claude/commands/");
    log.info("  - exit (to leave)");
    console.log();

    await runTest(composeCommand, "interactive");
  } else {
    const testSpinner = spinner();
    testSpinner.start(`Running ${testTarget} test`);

    const testPassed = await runTest(composeCommand, testTarget);

    if (testPassed) {
      testSpinner.stop(`${testTarget} passed`);
    } else {
      testSpinner.stop(`${testTarget} failed`);
      process.exit(1);
    }
  }

  outro("Done!");
}

main().catch(console.error);
