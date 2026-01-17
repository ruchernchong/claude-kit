import { execFileSync } from "node:child_process";
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

interface Skill {
  repo: string;
  skill: string;
  label: string;
}

interface InstallResult {
  label: string;
  success: boolean;
  message: string;
}

const SKILLS: Skill[] = [
  {
    repo: "better-auth/skills",
    skill: "Better Auth Best Practices",
    label: "Better Auth",
  },
];

const args = process.argv.slice(2);
const ciMode = args.includes("--ci");

function installSkill(skill: Skill): InstallResult {
  try {
    execFileSync("bunx", ["skills", "i", skill.repo, "--skill", skill.skill], {
      stdio: "pipe",
    });
    return {
      label: skill.label,
      success: true,
      message: "Installed successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      label: skill.label,
      success: false,
      message: errorMessage,
    };
  }
}

async function runInteractive(): Promise<Skill[]> {
  intro("Claude Code Skills Installer");

  const selectedSkills = await multiselect({
    message: "Select skills to install",
    options: SKILLS.map((skill) => ({
      value: skill,
      label: skill.label,
      hint: `${skill.repo} → ${skill.skill}`,
    })),
    initialValues: SKILLS,
  });

  if (isCancel(selectedSkills)) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  if (selectedSkills.length === 0) {
    log.warning("No skills selected");
    process.exit(0);
  }

  const userConfirmed = await confirm({
    message: `Install ${selectedSkills.length} skill(s)?`,
  });

  if (isCancel(userConfirmed) || !userConfirmed) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  return selectedSkills;
}

async function runCI(): Promise<Skill[]> {
  console.log("Installing Claude Code skills (CI mode)");
  console.log(`Installing ${SKILLS.length} skill(s)`);
  console.log();
  return SKILLS;
}

async function main() {
  const selectedSkills = ciMode ? await runCI() : await runInteractive();

  const loadingSpinner = ciMode ? null : spinner();
  loadingSpinner?.start("Installing skills");

  const results: InstallResult[] = [];

  for (const skill of selectedSkills) {
    const result = installSkill(skill);
    results.push(result);
  }

  loadingSpinner?.stop("Skills processed");

  for (const result of results) {
    const symbol = result.success ? "✓" : "✗";
    const message = `${symbol} ${result.label}: ${result.message}`;
    if (ciMode) {
      console.log(message);
    } else {
      if (result.success) {
        log.success(message);
      } else {
        log.error(message);
      }
    }
  }

  const successCount = results.filter((result) => result.success).length;
  const failCount = results.filter((result) => !result.success).length;

  console.log();
  const summary = `Installed: ${successCount}, Failed: ${failCount}`;
  if (ciMode) {
    console.log(summary);
  } else {
    log.info(summary);
  }

  if (ciMode) {
    console.log();
    console.log("Installation complete!");
  } else {
    outro("Installation complete!");
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
