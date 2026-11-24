import lodash from "lodash";

// A JSON Schema, limited to the keywords the converter reads
//
export type JsonSchema = {
  $id?: string;
  $ref?: string;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  description?: string;
  enum?: string[];
  id?: string;
  items?: JsonSchema | JsonSchema[];
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: string;
};

export type EnumType = "enum" | "string-enum" | "type";

// Turns a schema id or $ref into a type name. pathDepth is the configured path depth option
//
export type NameMapping = (id: string, pathDepth: number) => string;

export type ConverterOptions = {
  debug?: boolean;
  enumPrefix?: string;
  enumType?: EnumType;
  export?: boolean;
  indent?: number;
  nameMapping?: NameMapping;
  noStringLiterals?: boolean;
  pathDepth?: number;
  prefix?: string;
  typePrefix?: string;
};

type ResolvedConverterOptions = Required<Omit<ConverterOptions, "debug">>;

// The result of converting one schema element:
// - description: a JSDoc comment with a trailing space, or an empty string
// - typeExpression: the TypeScript type of the element (string, IPlace, TStatus, ...)
// - typeDeclarations: named types the element needs, declared before the interface
//
type ConvertedElement = {
  description: string;
  typeDeclarations: string[];
  typeExpression: string;
};

// Extracts a type name from the last pathDepth path elements of a schema id:
// https://example.com/schemas/postal-address.json -> PostalAddress
//
function extractName(id: string, pathDepth: number): string {
  return lodash.upperFirst(
    lodash.camelCase(
      id
        .split("/")
        .slice(-1 * pathDepth)
        .join(" ")
        .replace(".json", ""),
    ),
  );
}

// Converts a schema element to a TypeScript type, recursing into oneOf and anyOf
//
function convertElement(
  schemaName: string,
  name: string,
  element: JsonSchema,
  options: ResolvedConverterOptions,
): ConvertedElement {
  const exportType = options.export ? "export" : "declare";
  const typeDeclarations: string[] = [];
  let typeExpression: string;

  // Default type is assumed to be an object
  //
  switch (element.type ?? "object") {
    case "string": {
      if (
        Array.isArray(element.enum) &&
        element.enum.length > 0 &&
        options.noStringLiterals !== true
      ) {
        switch (options.enumType) {
          case "enum": {
            typeExpression =
              options.enumPrefix + schemaName + lodash.upperFirst(lodash.camelCase(name));
            typeDeclarations.push(
              `${exportType} const enum ${typeExpression} { ${element.enum.join(", ")} };`,
            );
            break;
          }

          case "string-enum": {
            // We will generate string values as all uppercase
            //
            const enumStringValues = element.enum.map(
              (enumValue) => `${enumValue}= "${enumValue.toUpperCase()}"`,
            );
            typeExpression =
              options.enumPrefix + schemaName + lodash.upperFirst(lodash.camelCase(name));
            typeDeclarations.push(
              `${exportType} const enum ${typeExpression} { ${enumStringValues.join(", ")} };`,
            );
            break;
          }

          default: {
            typeExpression =
              options.typePrefix + schemaName + lodash.upperFirst(lodash.camelCase(name));
            typeDeclarations.push(
              `${exportType} type ${typeExpression} = "${element.enum.join('" | "')}";`,
            );
            break;
          }
        }
      } else if (element.$ref) {
        typeExpression = options.typePrefix + options.nameMapping(element.$ref, options.pathDepth);
      } else {
        typeExpression = "string";
      }
      break;
    }

    case "boolean": {
      typeExpression = "boolean";
      break;
    }

    case "integer":
    case "number": {
      typeExpression = "number";
      break;
    }

    case "null": {
      typeExpression = "null";
      break;
    }

    case "array": {
      // Check the array item type. Tuple items (an array of schemas) are not supported
      //
      const items = Array.isArray(element.items) ? undefined : element.items;
      if (items?.$ref) {
        const elementPrefix = items.type === "string" ? options.typePrefix : options.prefix;
        typeExpression = `${elementPrefix}${options.nameMapping(items.$ref, options.pathDepth)}[]`;
      } else {
        switch (items?.type) {
          case "string": {
            typeExpression = "string[]";
            break;
          }

          case "boolean": {
            typeExpression = "boolean[]";
            break;
          }

          case "integer":
          case "number": {
            typeExpression = "number[]";
            break;
          }

          case "null": {
            typeExpression = "null[]";
            break;
          }

          default: {
            // Default to array of unknown
            //
            typeExpression = "unknown[]";
            break;
          }
        }
      }
      break;
    }

    case "object": {
      // oneOf and anyOf become a union of their sub elements, each with its own description
      //
      const unionElements = Array.isArray(element.oneOf)
        ? element.oneOf
        : Array.isArray(element.anyOf)
          ? element.anyOf
          : undefined;

      if (unionElements) {
        const unionMembers = unionElements.map((unionElement) => {
          // Recursion time
          //
          const convertedElement = convertElement(schemaName, "", unionElement, options);
          typeDeclarations.push(...convertedElement.typeDeclarations);
          return convertedElement.description + convertedElement.typeExpression;
        });
        typeExpression = unionMembers.join(" | ");
      } else if (element.$ref) {
        const elementPrefix = element.type === "string" ? options.typePrefix : options.prefix;
        typeExpression = elementPrefix + options.nameMapping(element.$ref, options.pathDepth);
      } else {
        // We can't nest unnamed object interfaces in TypeScript. An object without
        // properties allows any object
        //
        typeExpression = "Record<string, unknown>";
      }
      break;
    }

    default: {
      console.warn("INVALID: Unknown JSON schema element type:", element.type, element);
      typeExpression = "unknown";
    }
  }

  const description = element.description ? `/** ${element.description} */ ` : "";

  return { description, typeDeclarations, typeExpression };
}

// Converts an object schema to an interface, preceded by the named types its properties need
//
function convertSchema(
  schema: JsonSchema,
  options: ResolvedConverterOptions,
  debug: (...values: unknown[]) => void,
): string {
  // Since json schema v6 .id is replaced by .$id
  //
  const schemaId = schema.id || schema.$id;
  if (!schemaId) {
    console.warn("INVALID: Schema missing id", schema);
    throw new Error("INVALID: Input schema missing id");
  }

  const exportType = options.export ? "export" : "declare";
  const schemaName = options.nameMapping(schemaId, options.pathDepth);
  const interfaceName = options.prefix + schemaName;
  debug("Converting schema:", interfaceName, schemaId);

  // Collect allOf schema's we need to extend
  //
  const extendedInterfaces = (schema.allOf ?? [])
    .filter((allOfElement) => allOfElement.$ref)
    .map(
      (allOfElement) =>
        options.prefix + options.nameMapping(allOfElement.$ref as string, options.pathDepth),
    );

  const output: string[] = [];
  const typeDeclarations: string[] = [];

  if (schema.description) {
    output.push(`/** ${schema.description} */`);
  }

  // Start the interface
  //
  if (extendedInterfaces.length > 0) {
    output.push(
      `${exportType} interface ${interfaceName} extends ${extendedInterfaces.join(", ")} {`,
    );
  } else {
    output.push(`${exportType} interface ${interfaceName} {`);
  }

  const indentation = " ".repeat(options.indent);
  for (const [propertyName, propertyElement] of Object.entries(schema.properties ?? {})) {
    const required = schema.required?.includes(propertyName) ?? false;
    const convertedElement = convertElement(schemaName, propertyName, propertyElement, options);
    output.push(
      `${indentation}${convertedElement.description}${propertyName}${required ? "" : "?"}: ${convertedElement.typeExpression};`,
    );
    typeDeclarations.push(...convertedElement.typeDeclarations);
  }

  // End the interface
  //
  output.push("}\n");

  // Return concatenated output
  //
  return (
    typeDeclarations.join("\n") + (typeDeclarations.length > 0 ? "\n" : "") + output.join("\n")
  );
}

// Converts JSON schemas to TypeScript declarations:
// - an object schema becomes an interface
// - a string schema with enum values becomes a string literal type or enum
// Other schemas are skipped
//
export function convertSchemas(schemas: JsonSchema[], options: ConverterOptions = {}): string {
  // Debug output to console.log or black hole function
  //
  const debug = options.debug ? console.log : () => {};
  debug("Converting %d schema(s)", schemas.length, options);

  // Apply defaults. Empty values fall back to the default as well
  //
  const resolvedOptions: ResolvedConverterOptions = {
    enumPrefix: options.enumPrefix || "E",
    enumType: options.enumType || "type",
    export: options.export ?? false,
    indent: options.indent || 2,
    nameMapping: options.nameMapping ?? extractName,
    noStringLiterals: options.noStringLiterals ?? false,
    pathDepth: options.pathDepth || 1,
    prefix: options.prefix || "I",
    typePrefix: options.typePrefix || "T",
  };

  // Sanity check input is an array of objects
  //
  if (
    !Array.isArray(schemas) ||
    !schemas.every((schema) => typeof schema === "object" && schema !== null)
  ) {
    throw new Error("ERROR: Invalid input schemas");
  }

  const output: string[] = [];
  for (const schema of schemas) {
    // Only schema's of type object can create exportable interfaces
    //
    if (schema.type === "object") {
      output.push(convertSchema(schema, resolvedOptions, debug));
    } else if (
      schema.type === "string" &&
      Array.isArray(schema.enum) &&
      schema.enum.length > 0 &&
      !resolvedOptions.noStringLiterals
    ) {
      // Since json schema v6 .id is replaced by .$id
      //
      const schemaId = schema.id || schema.$id;

      // A String only schema with enum values can be output as a string literal type
      // Omit the interface prefix and let the Type/Enum prefix prevail here
      //
      if (schemaId) {
        const name = lodash.upperFirst(
          lodash.camelCase(resolvedOptions.nameMapping(schemaId, resolvedOptions.pathDepth)),
        );
        const convertedElement = convertElement("", name, schema, resolvedOptions);
        output.push(`${convertedElement.typeDeclarations.join("\n")}\n`);
      } else {
        console.warn("INVALID: String schema missing id", schema);
      }
    } else {
      debug("Cannot convert schema of type:", schema.type, schema.id);
    }
  }

  // Return concatenated output
  //
  return output.join("\n");
}

//
