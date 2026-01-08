import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMarkdownFiles } from "../utils";

describe("getMarkdownFiles", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "md-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should return markdown files without extension", async () => {
    await fs.writeFile(path.join(testDir, "file1.md"), "content");
    await fs.writeFile(path.join(testDir, "file2.md"), "content");
    await fs.writeFile(path.join(testDir, "other.txt"), "content");

    const files = await getMarkdownFiles(testDir);

    expect(files).toHaveLength(2);
    expect(files).toContain("file1");
    expect(files).toContain("file2");
  });

  it("should return empty array for directory with no markdown files", async () => {
    await fs.writeFile(path.join(testDir, "file.txt"), "content");
    const files = await getMarkdownFiles(testDir);
    expect(files).toEqual([]);
  });

  it("should return empty array for non-existent directory", async () => {
    const files = await getMarkdownFiles(path.join(testDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  it("should handle files with multiple dots", async () => {
    await fs.writeFile(path.join(testDir, "my.config.md"), "content");
    const files = await getMarkdownFiles(testDir);
    expect(files).toContain("my.config");
  });
});
