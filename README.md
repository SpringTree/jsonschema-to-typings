# jsonschema-to-typings

[![NPM version](https://badge.fury.io/js/jsonschema-to-typings.png)](http://badge.fury.io/js/jsonschema-to-typings)

[![Npm Downloads](https://nodei.co/npm/jsonschema-to-typings.png?downloads=true&stars=true)](https://nodei.co/npm/jsonschema-to-typings.png?downloads=true&stars=true)

A command-line utility and module to turn a JSON Schema into a typescript interface definition

I wrote this module because I have a set of REST based backends using JSON Schema for their input and output validation.
I wanted to expose this information to clients written in TypeScript and add code hinting/completion during development.
There are certain things that JSON Schema can do that TypeScript can't and visa versa.
With this module you've at least got an automated starting point for converting a large set of schemas.

DISCLAIMER: I wrote this module to fit my specific project needs.
The schemas I work with are very much bound by id's and live within their own eco-system.
I'm not covering the whole JSON Schema specification nor do I fully intend to.
Feel free to fork or file pull requests as you see fit with this in mind.

UPDATE: I have released version 0.2.0 which changes the following:

* No more top level module name
* Using 'export interface ...' for all outputed interfaces
* Using preferred simple array notation 'string[]' instead of 'Array\<string\>'

I bumped the minor version because this is a pretty structural change in the output format

## Command-line usage

At the very least you need to supply one schema and the name of the output module:

```javascript
jsonschema2typings -m MyModule schemas/*.json
```

Calling with -h will provide you with all the possible options:

```text
  Usage: jsonschema2typings [options] <file...>

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -p, --prefix [prefix]       Interface prefix. Default: 'I'
    -tp, --type-prefix [prefix] Type prefix. Default: 'T'
    --enum-prefix [prefix]      Enum prefix. Default: 'E'
    --enum-type [type]          Type of enum to generate: 'type', 'enum' or 'string-enum. Default: type
    -o, --out [file]            Output TypeScript file. Default output is to STDOUT
    -nsl, --no-string-literals  Don not use TypeScript 1.8 string literals for enums
    -d, --path-depth            The number of id/path elements to use for name resolution. Default: 1
    -v, --verbose               Enable debug output
```

## Code usage

You can use the schema converter module as follows:

```javascript
var converter = require( "jsonschema-to-typings" );

var mySchemas = [
    require( "schema1.json" ),
    require( "schema2.json" ),
    ...
];

var typescriptCode = converter( mySchemas,
{
    "noStringLiterals": false
,   "debug":            false
,   "prefix":           "I"
,   "typePrefix":       "T"
,   "enumPrefix":       "E"
,   "enumType":         "string-enum"
,   "pathDepth":        1
} );
```

## String literals

TypeScript has added support for string literal types since version 1.8. These are really nice to use for string based enumerations.
If you're working with an older version of typescript you can disable this feature and your properties will revert to a normal string.

Encountering a string/enum type in JSON Schema will add a type to your module like this:

```javascript
type TMyEnum = "MyValue1" | "MyValue2";

interface IExample {
    myStringEnum: TMyEnum;
}
```

## Enums

This tool predates the proper support for string enums so the default is to generate enums as a `Type`.
You van now use the new

## Schema name deduction

The name for a schema is deduced from it's `id`. The last path element is extracted and camel-cased.
You can set the path depth to use using the `path-depth`/`pathDepth` option both in code and command-line.
You can provide your own name extraction function using the `nameMapping` option but this option is not available on the command-line.

The name mapping function is called with 2 parameters:

```javascript
function( id: string, pathDepth: number ): string
{
    ...
    return "name";
}

```

The pathDepth contains the configured path depth option which you are free to ignore.
Just ensure the function returns a unique name for your interface and/or type.

## Example

The following JSON Schema:

```javascript
{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "id": "https://github.com/Qwerios/jsonschema-to-typings/test/geo.json",
    "properties": {
        "elevation": {
            "description": "The elevation of the geo-coordinates",
            "id": "https://github.com/Qwerios/jsonschema-to-typings/test/geo.json/elevation",
            "type": "number"
        },
        "latitude": {
            "description": "The latitude of the geo-coordinates",
            "id": "https://github.com/Qwerios/jsonschema-to-typings/test/geo.json/latitude",
            "type": "number"
        },
        "longitude": {
            "description": "The longitude of the geo-coordinates",
            "id": "https://github.com/Qwerios/jsonschema-to-typings/test/geo.json/longitude",
            "type": "number"
        }
    },
    "required": [
        "latitude",
        "longitude"
    ],
    "type": "object"
}
```

Would look like this as a typescript declaration:

```javascript
export interface IGeo {
    elevation?: number;
    latitude: number;
    longitude: number;
}
```

## Known limitations

### Default type

If `type` is omitted in a JSON schema property `object` is assumed. This will lead to an `any` type property in TypeScript.

### Arrays

JSON Schema allows arrays to define that they can only contain unique items and what the minimum and maximum item counts are.
TypeScript interfaces only allow us to declare the Array and it's containing type.
End result is that the extra validation requirements from the JSON Schema are lost

### Formatters

Formatter are a runtime option for JSON Schema validators. TypeScript declarations are just static type checks at compile time.
As such the default formatters and custom formatters can not be enforced or declared.

### Null type

JSON Schema has a `null` type but in TypeScript any type is nullable.
I opted to default to `number` for these properties because `any` felt too open ended.

### Nesting objects

We can nest objects in JSON Schema without naming them.
In TypeScript interfaces we only have one level of object interfaces unless we refer to another interface by name.
If you find yourself nesting objects a lot in JSON Schema consider moving them to their own schema and linking them via $ref.
It might be possible to generate on-demand interfaces but the readability of the output will suffer so I opted not to.
I've always found it better to keep my JSON Schema's shallow, focussed and reusable.
