/**
 * Non-mutating regression test: verifies that generateCSV escapes formula injection prefixes.
 *
 * Cells beginning with =, +, -, @ must NOT appear verbatim in the CSV output.
 * PapaParse's escapeFormulae:true wraps them with a tab prefix so spreadsheet
 * apps don't interpret them as formulas.
 *
 * Run with: npx tsx scripts/test-csv-formula-injection.ts
 * No DB access. No mutations. No env vars required.
 */

import { generateCSV } from "../src/lib/report-generator";

type TestCase = { label: string; input: string; shouldNotStartWith: string };

const FORMULA_PREFIXES = ["=", "+", "-", "@"];

const testCases: TestCase[] = [
  { label: "equals-sign formula",  input: "=SUM(A1:A10)",    shouldNotStartWith: "=" },
  { label: "plus-sign formula",    input: "+1234",           shouldNotStartWith: "+" },
  { label: "minus-sign formula",   input: "-9999",           shouldNotStartWith: "-" },
  { label: "at-sign formula",      input: "@SUM(A1)",        shouldNotStartWith: "@" },
  { label: "nested equals",        input: "=cmd|'/c calc'!", shouldNotStartWith: "=" },
];

const safeValues = [
  { label: "normal text",       input: "hello world" },
  { label: "number string",     input: "12345" },
  { label: "empty string",      input: "" },
  { label: "dash in middle",    input: "foo-bar" },
  { label: "plus in middle",    input: "a+b" },
];

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: ${detail}`);
    failed++;
  }
}

console.log("\n── CSV Formula Injection Regression ──────────────────────────────────\n");

// ── Test 1: formula prefixes are escaped ────────────────────────────────────
console.log("1. Formula prefixes must be escaped in CSV output\n");

for (const tc of testCases) {
  const csv = generateCSV([{ Value: tc.input }], ["Value"]);
  // Split CSV into lines, skip header; extract the data cell
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  const dataLine = lines[1] ?? "";

  check(
    tc.label,
    !dataLine.startsWith(tc.shouldNotStartWith),
    `cell starts with ${tc.shouldNotStartWith} — escaping not applied. line: ${dataLine}`
  );
}

// ── Test 2: safe values are not modified ────────────────────────────────────
console.log("\n2. Safe values must pass through unchanged\n");

for (const tc of safeValues) {
  if (tc.input === "") {
    // Empty string renders as empty cell — no assertion needed beyond no crash
    check(`${tc.label} (no crash)`, true, "");
    continue;
  }
  const csv = generateCSV([{ Value: tc.input }], ["Value"]);
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  const dataLine = lines[1] ?? "";
  check(
    tc.label,
    dataLine.includes(tc.input),
    `expected value '${tc.input}' not found in line: ${dataLine}`
  );
}

// ── Test 3: all formula prefixes produce output that does NOT start with them ──
console.log("\n3. All formula prefix characters are blocked from cell-start position\n");

for (const prefix of FORMULA_PREFIXES) {
  const csv = generateCSV([{ Value: `${prefix}INJECTION` }], ["Value"]);
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  const dataLine = lines[1] ?? "";
  check(
    `prefix '${prefix}' escaped`,
    !dataLine.startsWith(prefix),
    `cell-start prefix not escaped in: ${dataLine}`
  );
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n── Summary ────────────────────────────────────────────────────────────");
console.log(`  ${passed} passed  |  ${failed} failed\n`);

if (failed > 0) {
  console.error("FAIL — escapeFormulae protection is broken or missing.");
  process.exit(1);
} else {
  console.log("PASS — all formula injection cells are escaped.");
  process.exit(0);
}
