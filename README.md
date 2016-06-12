# json-schema-to-typescript
A command-line utility and module to turn a JSON Schema into a typescript interface definition

## Command-line usage
At the very least you need to supply one schema and the name of the output module:
```
jsonschema2ts -m MyModule schemas/*.json
```

Calling with -h will provide you with all the possible options:
```
  Usage: jsonschema2ts [options] <file...>

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -m, --module <name>         The top level module name to group all output interfaces
    -p, --prefix [prefix]       Interface prefix. Default: 'I'
    -o, --out [file]            Output TypeScript file. Default output is to STDOUT
    -nsl, --no-string-literals  Don't use TypeScript 1.8 string literals for enums
    -d, --path-depth            The number of id/path elements to use for name resolution. Default: 1
    -v, --verbose               Enable debug output
```

## Code usage


## String literals

## Schema name deduction
The name for a schema is deduced from it's `id`. The last path element is extracted and camel-cased.
You can set the path depth to use using the `path-depth` option both in code and command-line.
You can provide your own name extraction function using the `nameMapping` option but this option is not available on the command-line.

The name mapping function is called with 3 parameters:
```
function( id: string, prefix: string, pathDepth: number ): string
{
    ...
    return "name";
}
```

## Known limitations
### Arrays
JSON Schema allows arrays to define that they can only contain unique items and what the minimum and maximum item counts are.
TypeScript interfaces only allow us to declare the Array and it's containing type.
End result is that the extra validation requirements from the JSON Schema is lost

### Formatters
Formatter are interactive with JSON Schema validators. TypeScript declaration are just static type checks.
As such the default formatters and custom formatter can not be enforced or declared.

### Null type
JSON Schema has a `null` type but in TypeScript any type is nullable.
I opted to default to `number` for these properties because `any` felt to open ended.

### Nesting objects
We can nest objects in JSON Schema without naming them.
In TypeScript interfaces we only have one level of objects unless we refer to another interface by name.
If you find yourself nesting object a lot in JSON Schema consider moving them to their own schema and linking them via $ref.
It might be possible to generate on-demand interfaces but the readability of the output will suffer so I opted not to.
I've always found it better to keep my JSON Schema's shallow, focussed and reusable.