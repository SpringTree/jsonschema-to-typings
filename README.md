# json-schema-to-typescript
A command-line utility and module to turn a JSON Schema into a typescript interface definition

## Command-line usage

## Code usage

## String literals


## Known limitations

### null type
JSON Schema has a 'null' type but in TypeScript any type is nullable. I opted to default to 'number' for these properties because 'any' felt to open ended.
