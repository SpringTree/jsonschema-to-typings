# jsonschema-to-typings

[![npm version](https://badge.fury.io/js/jsonschema-to-typings.svg)](https://badge.fury.io/js/jsonschema-to-typings)

## :evergreen_tree: Purpose

A command-line utility and module to turn JSON Schemas into TypeScript interface and type declarations.

I wrote this module because I have a set of REST based backends using JSON Schema for their input and output validation.
I wanted to expose this information to clients written in TypeScript and add code hinting/completion during development.
There are certain things that JSON Schema can do that TypeScript can't and vice versa.
With this module you've at least got an automated starting point for converting a large set of schemas.

DISCLAIMER: I wrote this module to fit my specific project needs.
The schemas I work with are very much bound by id's and live within their own eco-system.
I'm not covering the whole JSON Schema specification nor do I fully intend to.
Feel free to fork or file pull requests as you see fit with this in mind.

## :seedling: Getting started

Requires Node.js 22 or later, or Bun.

```bash
# Bun
bun add -d jsonschema-to-typings

# Node.js
npm install --save-dev jsonschema-to-typings
```

### Command-line usage

Supply one or more schema files:

```bash
jsonschema2typings --export -o types.d.ts schemas/*.json
```

Calling with `-h` will provide you with all the possible options:

```text
Usage: jsonschema2typings [options] <file...>

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
  -h, --help                display help for command
```

### Code usage

The package is an ES module. You can use the converter as follows:

```typescript
import { convertSchemas, type JsonSchema } from "jsonschema-to-typings";

const schemas: JsonSchema[] = [
  // Your parsed JSON Schema objects
];

const typescriptCode = convertSchemas(schemas, {
  enumPrefix: "E",
  enumType: "string-enum",
  export: true,
  indent: 2,
  pathDepth: 1,
  prefix: "I",
  typePrefix: "T",
});
```

All options are optional and default to the CLI defaults. `debug: true` logs the conversion steps.

## String literals

Encountering a string/enum type in JSON Schema will add a string literal type:

```typescript
declare type TExampleMyEnum = "MyValue1" | "MyValue2";

declare interface IExample {
  myEnum: TExampleMyEnum;
}
```

Use `--no-string-literals` (`noStringLiterals: true`) to output these properties as a plain `string`.

## Enums

The default is to generate enums as a string literal type (`enumType: "type"`).
With `enum` a `const enum` is generated and with `string-enum` a `const enum` with upper case string values.

## Schema name deduction

The name for a schema is deduced from its `id` (or `$id`). The last path element is extracted and camel-cased.
You can set the path depth to use using the `path-depth`/`pathDepth` option both in code and command-line.
You can provide your own name extraction function using the `nameMapping` option but this option is not available on the command-line.

The name mapping function is called with 2 parameters:

```typescript
const nameMapping = (id: string, pathDepth: number): string => {
  // ...
  return "name";
};
```

The pathDepth contains the configured path depth option which you are free to ignore.
Just ensure the function returns a unique name for your interface and/or type.

## Example

The following JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "https://github.com/Qwerios/jsonschema-to-typings/test/geo.json",
  "properties": {
    "elevation": {
      "description": "The elevation of the geo-coordinates",
      "type": "number"
    },
    "latitude": {
      "description": "The latitude of the geo-coordinates",
      "type": "number"
    },
    "longitude": {
      "description": "The longitude of the geo-coordinates",
      "type": "number"
    }
  },
  "required": ["latitude", "longitude"],
  "type": "object"
}
```

Would look like this as a TypeScript declaration with `--export`:

```typescript
export interface IGeo {
  /** The elevation of the geo-coordinates */ elevation?: number;
  /** The latitude of the geo-coordinates */ latitude: number;
  /** The longitude of the geo-coordinates */ longitude: number;
}
```

## Known limitations

### Default type

If `type` is omitted in a JSON schema property `object` is assumed.

### Arrays

JSON Schema allows arrays to define that they can only contain unique items and what the minimum and maximum item counts are.
TypeScript interfaces only allow us to declare the Array and its containing type.
End result is that the extra validation requirements from the JSON Schema are lost.
Arrays without item type and tuples become `unknown[]`.

### Formatters

Formatters are a runtime option for JSON Schema validators. TypeScript declarations are just static type checks at compile time.
As such the default formatters and custom formatters can not be enforced or declared.

### Nesting objects

We can nest objects in JSON Schema without naming them.
In TypeScript interfaces we only have one level of object interfaces unless we refer to another interface by name.
A nested object becomes `Record<string, unknown>`.
If you find yourself nesting objects a lot in JSON Schema consider moving them to their own schema and linking them via $ref.

## :hammer: Development

```bash
# Install dependencies
bun install

# Run the CLI from source
bun run src/cli.ts test/geo.json

# Build to dist/
bun run build
```

### :test_tube: Testing

```bash
bun run test
```

Every test run reports coverage and fails when a source file drops below 90% of its lines or functions, see `bunfig.toml`.
The generated TypeScript for the schemas in `test/` is compared to the snapshots in `test/__snapshots__`.
Review a snapshot change like a code change, then update the snapshots with `bun test --update-snapshots`.

### :cool: Technology stack

- bun
- typescript

### :twisted_rightwards_arrows: Branch strategy and protection

The `master` branch has protection enabled against direct pushes.
All changes need to be done through a reviewed pull request.

The protection comes from the organization rulesets, enabled by this repository's custom properties:

- `conventional-pr-title`: requires the `pull-request-title / conventional` check from `pull-request-title.yml`
- `reviewer-approval-required`: requires an approving review and squash merges
- `supply-chain-gates`: requires the `supply-chain / secrets`, `licences`, `code` and `quarantine` checks from `compliance.yml`

### :lock: Supply chain

- `.npmrc` and `bunfig.toml` refuse package versions published less than 7 days ago (package quarantine)
- Pull requests run the shared [supply-chain gates](https://github.com/SpringTree/springtree-ci-workflows) (secrets, licences, code and package quarantine) from `compliance.yml`
- Pull request titles are checked as conventional commits by the shared title check in `pull-request-title.yml`
- GitHub Actions are pinned by commit SHA

## :up: Deploying

Releases are fully handled by GitHub Actions; never publish from a laptop.

1. Squash merge pull requests into `master`. The pull request title becomes the commit and must be a [conventional commit](https://www.conventionalcommits.org), checked by `pull-request-title.yml`
2. [release-please](https://github.com/googleapis/release-please-action) opens or updates a release pull request with the version bump and changelog
3. Merging the release pull request creates the tag and GitHub release, and the release workflow publishes to npm using [trusted publishing](https://docs.npmjs.com/trusted-publishers)

One-time setup:

- GitHub: an `npm-publish` environment that only the `master` branch may deploy to (Settings → Environments → Deployment branches). Create it before the first release: GitHub creates a missing environment without that restriction
- npm: trusted publisher for this repository, `release.yml` and the `npm-publish` environment
- GitHub: an organization GitHub App with contents, pull requests and issues write access on this repository; its client id as the `RELEASE_APP_CLIENT_ID` repository variable and its private key as the `RELEASE_APP_PRIVATE_KEY` repository secret

## License

ISC
