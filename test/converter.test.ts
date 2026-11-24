import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import converter from "../lib/index.js";

// Golden-output tests: the snapshots in __snapshots__ record the generated TypeScript,
// so any change in output shows up as a snapshot diff. Update them with `bun test -u`
// only when an output change is intended
//

const fixtureDirectory = import.meta.dir;
const fixtureFiles = [
  "acp-region.json",
  "all-types.json",
  "geo.json",
  "one-of-any-of.json",
  "place.json",
  "postal-address.json",
  "translatable-string.json",
  "eva/bundle-product.json",
  "eva/get-potentialbundle-for-products-for-order-response.json",
  "eva/service-error.json",
];

const loadFixtures = () =>
  fixtureFiles.map((fixtureFile) => JSON.parse(readFileSync(join(fixtureDirectory, fixtureFile), "utf8")));

// The options the CLI passes when called without flags
//
const cliDefaultOptions = {
  debug: false,
  enumPrefix: "E",
  enumType: "type",
  indent: 2,
  noStringLiterals: false,
  pathDepth: 1,
  prefix: "I",
  typePrefix: "T",
};

describe("converter", () => {
  // Incomplete and unknown elements log a warning, keep the test output clean
  //
  let warnSpy: ReturnType<typeof spyOn>;
  beforeAll(() => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });
  afterAll(() => {
    warnSpy.mockRestore();
  });

  test.each([
    ["CLI defaults", {}],
    ["custom prefixes", { enumPrefix: "Enum", prefix: "Interface", typePrefix: "Type" }],
    ["enumType enum", { enumType: "enum" }],
    ["enumType string-enum", { enumType: "string-enum" }],
    ["export", { export: true }],
    ["indent 4", { indent: 4 }],
    ["noStringLiterals", { noStringLiterals: true }],
    ["pathDepth 2", { pathDepth: 2 }],
  ])("%s", (_name, overrides) => {
    expect(converter(loadFixtures(), { ...cliDefaultOptions, ...overrides })).toMatchSnapshot();
  });

  test("module defaults with an empty options object", () => {
    expect(converter(loadFixtures(), {})).toMatchSnapshot();
  });

  test("custom nameMapping", () => {
    const nameMapping = (id: string, pathDepth: number) => `Mapped${pathDepth}${id.length}`;
    expect(converter(loadFixtures(), { ...cliDefaultOptions, nameMapping })).toMatchSnapshot();
  });

  test("throws on an object schema without id", () => {
    expect(() => converter([{ type: "object", properties: {} }], { ...cliDefaultOptions })).toThrow();
  });

  test("throws on input that is not an array of objects", () => {
    expect(() => converter(["not a schema"], { ...cliDefaultOptions })).toThrow();
  });
});

describe("CLI", () => {
  const cliPath = join(fixtureDirectory, "..", "bin", "schema2ts.js");
  const fixturePaths = fixtureFiles.map((fixtureFile) => join(fixtureDirectory, fixtureFile));

  // Run under Node, the runtime consumers use
  //
  const runCli = (cliArguments: string[]) => spawnSync("node", [cliPath, ...cliArguments], { encoding: "utf8" });

  test("defaults", () => {
    const cliResult = runCli(fixturePaths);
    expect(cliResult.status).toBe(0);
    expect(cliResult.stdout).toMatchSnapshot();
  });

  test("long options", () => {
    const cliResult = runCli([
      "--prefix",
      "Interface",
      "--type-prefix",
      "Type",
      "--enum-prefix",
      "Enum",
      "--enum-type",
      "enum",
      "--export",
      ...fixturePaths,
    ]);
    expect(cliResult.status).toBe(0);
    expect(cliResult.stdout).toMatchSnapshot();
  });
});

