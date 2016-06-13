# jsonschema-to-typings
A command-line utility and module to turn a JSON Schema into a typescript interface definition

I wrote this module because I have a set of REST based backends using JSON Schema for their input and output validation.
I wanted to expose this information to clients written in TypeScript and add code hinting during development.
There are certain things that JSON Schema can do that TypeScript can't and visa versa.
But with this module you've at least got an automated starting point for converting a large set of schemas.

DISCLAIMER: Due to time constraint I wrote this module to fit my schema needs.
I'm not covering the whole JSON Schema specification (yet)

## Command-line usage
At the very least you need to supply one schema and the name of the output module:
```
jsonschema2typings -m MyModule schemas/*.json
```

Calling with -h will provide you with all the possible options:
```
  Usage: jsonschema2typings [options] <file...>

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -m, --module <name>         The top level module name to group all output interfaces
    -p, --prefix [prefix]       Interface prefix. Default: 'I'
    -tp, --type-prefix [prefix] Type prefix. Default: 'T'
    -o, --out [file]            Output TypeScript file. Default output is to STDOUT
    -nsl, --no-string-literals  Don't use TypeScript 1.8 string literals for enums
    -d, --path-depth            The number of id/path elements to use for name resolution. Default: 1
    -v, --verbose               Enable debug output
```

## Code usage
You can use the schema converter module as follows:

```
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
,   "module":           "MyModule"
,   "prefix":           "I"
,   "typePrefix":       "T"
,   "pathDepth":        1
} );
```

## String literals
TypeScript has added support for string literal types since version 1.8. These are really nice to use for string based enumerations.
If you're working with an older version of typescript you can disable this feature and your properties will revert to a normal string.

Encountering a string/enum type in JSON Schema will add a type to your module like this:
```
type TMyEnum = "MyValue1" | "MyValue2";

interface IExample {
    myStringEnum: TMyEnum;
}
```

## Schema name deduction
The name for a schema is deduced from it's `id`. The last path element is extracted and camel-cased.
You can set the path depth to use using the `path-depth` option both in code and command-line.
You can provide your own name extraction function using the `nameMapping` option but this option is not available on the command-line.

The name mapping function is called with 2 parameters:
```
function( id: string, pathDepth: number ): string
{
    ...
    return "name";
}
```
The pathDepth contains the configured path depth option which you are free to ignore ofcourse.
Just ensure the function return a unique name for your interface and/or type.

## Example
The following JSON Schema:
```
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
```
declare module "MyModule" {
  interface IGeo {
    elevation?: number;
    latitude: number;
    longitude: number;
  }
}
```

## Known limitations
## Default type
If `type` is omitted in a JSON schema property `object` is assumed. This will lead to an `any` property in TypeScript.

### Arrays
JSON Schema allows arrays to define that they can only contain unique items and what the minimum and maximum item counts are.
TypeScript interfaces only allow us to declare the Array and it's containing type.
End result is that the extra validation requirements from the JSON Schema are lost

### Formatters
Formatter are a runtime option for JSON Schema validators. TypeScript declarations are just static type checks at compile time.
As such the default formatters and custom formatter can not be enforced or declared.

### Null type
JSON Schema has a `null` type but in TypeScript any type is nullable.
I opted to default to `number` for these properties because `any` felt to open ended.

### Nesting objects
We can nest objects in JSON Schema without naming them.
In TypeScript interfaces we only have one level of objects unless we refer to another interface by name.
If you find yourself nesting objects a lot in JSON Schema consider moving them to their own schema and linking them via $ref.
It might be possible to generate on-demand interfaces but the readability of the output will suffer so I opted not to.
I've always found it better to keep my JSON Schema's shallow, focussed and reusable.
