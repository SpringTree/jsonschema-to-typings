# json-schema-to-typescript
A command-line utility and module to turn a JSON Schema into a typescript interface definition

## Command-line usage


## Code usage


## String literals


## Known limitations
### Arrays
JSON Schema allows arrays to define that they can only contain unique items and what the minimum and maximum item counts are.
TypeScript interfaces only allow us to declare the Array and it's containing type.
End result is that the extra validation requirements from the JSON Schema is lost

### Formatters
Formatter are interactive with JSON Schema validators. TypeScript declaration are just static type checks.
As such the default formatters and custom formatter can not be enforced or declared.

### Null type
JSON Schema has a 'null' type but in TypeScript any type is nullable.
I opted to default to 'number' for these properties because 'any' felt to open ended.
