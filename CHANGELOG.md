# Changelog

## [1.0.0](https://github.com/SpringTree/jsonschema-to-typings/compare/v0.2.14...v1.0.0) (2026-11-26)


### ⚠ BREAKING CHANGES

* the package is an ES module. Import { convertSchemas } instead of calling the CommonJS default export. The converter throws Error objects instead of strings
* **cli:** -tp is replaced by --type-prefix and -nsl by --no-string-literals
* **converter:** emit null for the json schema null type
* **converter:** emit unknown[] for array items without a type
* **converter:** emit Record<string, unknown> for nested objects
* **converter:** emit a union instead of an array for anyOf
* **converter:** default pathDepth to 1 when calling the module
* **deps:** require node.js 22 or later

### Features

* **cli:** replace the -tp and -nsl options with long options ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* publish as an es module with the named export convertSchemas ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))


### Bug Fixes

* **cli:** print an error and exit with code 1 on invalid options, missing or unreadable files ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** default enumType instead of overwriting enumPrefix ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** default pathDepth to 1 when calling the module ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** emit a union instead of an array for anyOf ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** emit null for the json schema null type ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** emit Record&lt;string, unknown&gt; for nested objects ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** emit unknown[] for array items without a type ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **converter:** emit valid types for objects without properties and unknown types ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **deps:** replace commander, jsonfile and lodash with built-in code ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
* **deps:** require node.js 22 or later ([33f3487](https://github.com/SpringTree/jsonschema-to-typings/commit/33f34870bb4c89dca8edfb33b6d32a700be9eb56))
