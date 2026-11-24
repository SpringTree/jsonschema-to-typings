import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { format } from "node:util";
import { version } from "../package.json";
import { runCli } from "../src/run-cli";

const geoSchemaPath = join(import.meta.dir, "geo.json");
const temporaryFolder = mkdtempSync(join(tmpdir(), "jsonschema-to-typings-"));

// Console spies are created per file and restored afterwards, so they don't collect the
// console calls of other test files
//
type ConsoleSpy = ReturnType<typeof spyOn<Console, "log">>;
let consoleLogSpy: ConsoleSpy;
let consoleErrorSpy: ConsoleSpy;
let consoleWarnSpy: ConsoleSpy;

// Joins the formatted console calls of a spy, the way they would show in the terminal
//
const spyOutput = (consoleSpy: ConsoleSpy) =>
  consoleSpy.mock.calls.map((logArguments) => format(...logArguments)).join("\n");

beforeAll(() => {
  consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
});

beforeEach(() => {
  consoleLogSpy.mockClear();
  consoleErrorSpy.mockClear();
  consoleWarnSpy.mockClear();
});

afterAll(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  rmSync(temporaryFolder, { force: true, recursive: true });
});

describe("runCli", () => {
  test("prints the version", () => {
    expect(runCli(["--version"])).toBe(0);
    expect(spyOutput(consoleLogSpy)).toBe(version);
  });

  test("prints the help", () => {
    expect(runCli(["-h"])).toBe(0);
    expect(spyOutput(consoleLogSpy)).toContain("Usage: jsonschema2typings [options] <file...>");
  });

  test.each([
    ["an unknown option", ["--unknown", geoSchemaPath], "Unknown option '--unknown'"],
    ["missing input files", [], "ERROR: Missing input files"],
    ["an invalid enum type", ["--enum-type", "union", geoSchemaPath], "Invalid --enum-type: union"],
    ["an invalid indent", ["--indent", "two", geoSchemaPath], "--indent must be a positive"],
    ["an invalid path depth", ["-d", "0", geoSchemaPath], "--path-depth must be a positive"],
    ["a missing schema file", ["missing.json"], "Cannot read schema file missing.json"],
  ])("fails on %s", (_name, cliArguments, expectedError) => {
    expect(runCli(cliArguments)).toBe(1);
    expect(spyOutput(consoleErrorSpy)).toContain(expectedError);
  });

  test("fails on a schema the converter rejects", () => {
    const schemaPath = join(temporaryFolder, "missing-id.json");
    writeFileSync(schemaPath, JSON.stringify({ properties: {}, type: "object" }));

    expect(runCli([schemaPath])).toBe(1);
    expect(spyOutput(consoleErrorSpy)).toBe("ERROR: INVALID: Input schema missing id");
  });

  test("writes the output to a file", () => {
    const outputPath = join(temporaryFolder, "geo.d.ts");

    expect(runCli(["--out", outputPath, "--indent", "4", geoSchemaPath])).toBe(0);
    expect(readFileSync(outputPath, "utf8")).toContain(
      "\n    /** The latitude of the geo-coordinates */ latitude: number;",
    );
    expect(spyOutput(consoleLogSpy)).toBe(`File write complete: ${outputPath}\n`);
  });

  test("surrounds debug and code output with markers when verbose", () => {
    expect(runCli(["--verbose", geoSchemaPath])).toBe(0);

    const markers = consoleLogSpy.mock.calls
      .map((logArguments) => logArguments[0])
      .filter((logLine) => typeof logLine === "string" && logLine.startsWith("---"));
    expect(markers).toEqual([
      "---BEGIN DEBUG---",
      "---END DEBUG---",
      "---BEGIN OUTPUT---",
      "---END OUTPUT---",
    ]);
  });
});

//
