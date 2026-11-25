// SPDX-License-Identifier: MIT
// Roast Your Own Agent — one fixed entry line, written to $MAKEFUN_OUTPUT_DIR/entry.txt.
// v2 rewrite: entry assembled from word fragments, validated through a rule
// pipeline, written and read back asynchronously. No network, deterministic.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WORDS = [
  "My",
  "agent",
  "remembers",
  "my",
  "2023",
  "pizza",
  "order",
  "but",
  "forgot",
  "the",
  "task",
  "I",
  "gave",
  "it",
  "this",
  "morning.",
] as const;

const MIN_CHARS = 1;
const MAX_CHARS = 200;

type Rule = (text: string) => string | null;

const rules: Rule[] = [
  (t) =>
    Array.from(t).length < MIN_CHARS || Array.from(t).length > MAX_CHARS
      ? `entry must be ${MIN_CHARS}-${MAX_CHARS} characters, got ${Array.from(t).length}`
      : null,
  (t) => (t.trim().length === 0 ? "entry must not be only whitespace" : null),
  (t) => (/[\r\n]/.test(t) ? "entry must be a single line" : null),
  (t) => (t !== t.trim() ? "entry must not have leading or trailing spaces" : null),
];

function buildEntry(): string {
  return WORDS.join(" ");
}

function validateEntry(text: string): void {
  const problems = rules.map((rule) => rule(text)).filter((p) => p !== null);
  if (problems.length > 0) {
    throw new Error(`invalid entry: ${problems.join("; ")}`);
  }
}

function outputPath(): string {
  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  if (dir.length === 0) {
    throw new Error("MAKEFUN_OUTPUT_DIR must not be empty");
  }
  return resolve(dir, "entry.txt");
}

async function main(): Promise<void> {
  const entry = buildEntry();
  validateEntry(entry);
  const target = outputPath();
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, entry, "utf8");
  const written = await readFile(target, "utf8");
  if (written !== entry) {
    throw new Error("round-trip check failed: entry.txt does not match entry");
  }
  if (written.endsWith("\n") || written.endsWith("\r")) {
    throw new Error("entry.txt must not end with a newline");
  }
  if (Buffer.byteLength(written, "utf8") !== Buffer.byteLength(entry, "utf8")) {
    throw new Error("entry.txt byte length mismatch");
  }
  console.log(`wrote ${Array.from(entry).length}-char entry to ${target}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
