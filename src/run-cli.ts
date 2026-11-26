import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { version } from "../package.json";
import { convertSchemas, type EnumType, type JsonSchema } from "./convert-schemas.js";

const enumTypes: EnumType[] = ["enum", "string-enum", "type"];

const helpText = `Usage: jsonschema2typings [options] <file...>

Options:
  -V, --version             output the version number
  -p, --prefix <prefix>     Interface prefix. Default: 'I'
  --type-prefix <prefix>    Type prefix. Default: 'T'
  --enum-prefix <prefix>    Enum prefix. Default: 'E'
  --enum-type <type>        Type of enum to generate: 'type', 'enum' or 'string-enum'. Default: 'type'
  -o, --out <file>          Output TypeScript file. Default output is to STDOUT
  --no-string-literals      Don't use string literal types for enums
  -d, --path-depth <depth>  The number of id/path elements to use for name resolution. Default: 1
  -i, --indent <size>       The indent size in spaces. Default: 2
  -v, --verbose             Enable debug output
  -e, --export              Generate export instead of declare statements
  -h, --help                display help for command`;

// Parses the command-line arguments. parseArgs is built into Node.js and Bun and throws on
// unknown options. Short options are single letters only
//
function parseCliOptions(cliArguments: string[]) {
  return parseArgs({
    allowPositionals: true,
    args: cliArguments,
    options: {
      "enum-prefix": { type: "string" },
      "enum-type": { type: "string" },
      export: { type: "boolean", short: "e" },
      help: { type: "boolean", short: "h" },
      indent: { type: "string", short: "i" },
      "no-string-literals": { type: "boolean" },
      out: { type: "string", short: "o" },
      "path-depth": { type: "string", short: "d" },
      prefix: { type: "string", short: "p" },
      "type-prefix": { type: "string" },
      verbose: { type: "boolean", short: "v" },
      version: { type: "boolean", short: "V" },
    },
  });
}

// Converts an optional option value to a positive integer, undefined when it is not one
//
function parsePositiveInteger(optionValue: string | undefined, defaultValue: number) {
  const parsedValue = optionValue === undefined ? defaultValue : Number(optionValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

// Runs the command-line utility and returns the process exit code
//
export function runCli(cliArguments: string[]): number {
  let parsedArguments: ReturnType<typeof parseCliOptions>;
  try {
    parsedArguments = parseCliOptions(cliArguments);
  } catch (error) {
    console.error("ERROR: %s\n\n%s", (error as Error).message, helpText);
    return 1;
  }
  const { positionals: fileNames, values: options } = parsedArguments;

  if (options.version) {
    console.log(version);
    return 0;
  }
  if (options.help) {
    console.log(helpText);
    return 0;
  }

  // Check mandatory parameters and option values
  //
  if (fileNames.length === 0) {
    console.error("ERROR: Missing input files\n\n%s", helpText);
    return 1;
  }
  const enumType = (options["enum-type"] ?? "type") as EnumType;
  if (!enumTypes.includes(enumType)) {
    console.error("ERROR: Invalid --enum-type: %s", enumType);
    return 1;
  }
  const indent = parsePositiveInteger(options.indent, 2);
  if (indent === undefined) {
    console.error("ERROR: --indent must be a positive integer");
    return 1;
  }
  const pathDepth = parsePositiveInteger(options["path-depth"], 1);
  if (pathDepth === undefined) {
    console.error("ERROR: --path-depth must be a positive integer");
    return 1;
  }

  if (options.verbose) {
    console.log("---BEGIN DEBUG---");
  }

  // Load the supplied JSON Schema files
  //
  const schemas: JsonSchema[] = [];
  for (const fileName of fileNames) {
    try {
      schemas.push(JSON.parse(readFileSync(fileName.trim(), "utf8")) as JsonSchema);
    } catch (error) {
      // The file name is an argument, not part of the format string, so a % in it is printed as is
      //
      console.error("ERROR: Cannot read schema file %s: %s", fileName, (error as Error).message);
      return 1;
    }
  }

  // Run the Schema converter using the provided options
  //
  let typescriptCode: string;
  try {
    typescriptCode = convertSchemas(schemas, {
      debug: options.verbose ?? false,
      enumPrefix: options["enum-prefix"] ?? "E",
      enumType,
      export: options.export ?? false,
      indent,
      noStringLiterals: options["no-string-literals"] ?? false,
      pathDepth,
      prefix: options.prefix ?? "I",
      typePrefix: options["type-prefix"] ?? "T",
    });
  } catch (error) {
    console.error("ERROR: %s", (error as Error).message);
    return 1;
  }

  if (options.verbose) {
    console.log("---END DEBUG---");
  }

  // Output the resulting TypeScript either to console or file
  //
  if (options.out) {
    writeFileSync(options.out, typescriptCode);
    console.log("File write complete: %s\n", options.out);
  } else {
    if (options.verbose) {
      console.log("---BEGIN OUTPUT---");
    }
    console.log(typescriptCode);
    if (options.verbose) {
      console.log("---END OUTPUT---");
    }
  }

  return 0;
}

//
