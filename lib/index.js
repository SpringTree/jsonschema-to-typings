var _ = require( "lodash" );

// Extract a field/schema name from the JSON schema id
//
var extractName = function( id, depth )
{
    return _.upperFirst( _.camelCase( id.split( "/" ).slice( -1 * depth ).join( " " ).replace( ".json", "" ) ) );
};

// This method can be called recursively to convert the schema elements
//
var convertElement = function( schemaName, name, element, required, options )
{
    var output;
    var type, typeName, elementPrefix;
    var exportType = options.export ? "export" : "declare";

    // Default type is assumed to be an object
    //
    switch ( element.type || "object" )
    {
        case "string":
        {
            if ( _.isArray( element.enum ) && !_.isEmpty( element.enum ) && options.noStringLiterals !== true )
            {
                // Output enum
                //
                switch ( options.enumType )
                {
                    case 'enum':
                    {
                        typeName = options.enumPrefix + schemaName + _.upperFirst( _.camelCase( name ) );
                        type     = exportType + " const enum " + typeName + " { " + element.enum.join( ", " ) + " };";
                        output   = name + ( required ? "" : "?" ) + ": " + typeName + ";";
                    } break;

                    case 'string-enum':
                    {
                        // We will generate string values as all uppercase
                        //
                        var enumStringValues = _.map( element.enum, ( enumValue ) => {
                            return enumValue + "= \"" + enumValue.toUpperCase() + "\"";
                        } )
                        typeName = options.enumPrefix + schemaName + _.upperFirst( _.camelCase( name ) );
                        type     = exportType + " const enum " + typeName + " { " + enumStringValues.join( ", " ) + " };";
                        output   = name + ( required ? "" : "?" ) + ": " + typeName + ";";
                    } break;

                    default: // type
                    {
                        typeName = options.typePrefix + schemaName + _.upperFirst( _.camelCase( name ) );
                        type     = exportType + " type " + typeName + " = \"" + element.enum.join( "\" | \"" ) + "\";";
                        output   = name + ( required ? "" : "?" ) + ": " + typeName + ";";
                    }
                    break;
                }
            }
            else if ( element.$ref )
            {
                output = name + ( required ? "" : "?" ) + ": " + options.typePrefix + options.nameMapping( element.$ref, options.pathDepth ) + ";";
            }
            else
            {
                output = name + ( required ? "" : "?" ) + ": string;";
            }
        } break;

        case "boolean":
        {
            output = name + ( required ? "" : "?" ) + ": boolean;";
        } break;

        case "integer":
        case "number":
        case "null":
        {
            output = name + ( required ? "" : "?" ) + ": number;";
        } break;

        case "array":
        {
            // Check the array item type
            //
            if ( _.isObject( element.items ) )
            {
                if ( element.items.$ref )
                {
                    elementPrefix = element.items.type === "string" ? options.typePrefix : options.prefix;
                    output = name + ( required ? "" : "?" ) + ": " + elementPrefix + options.nameMapping( element.items.$ref, options.pathDepth ) + "[];";
                }
                else
                {
                    switch ( element.items.type )
                    {
                        case "string":
                        {
                            output = name + ( required ? "" : "?" ) + ": string[];";
                        } break;

                        case "boolean":
                        {
                            output = name + ( required ? "" : "?" ) + ": boolean[];";
                        } break;

                        case "integer":
                        case "number":
                        case "null":
                        {
                            output = name + ( required ? "" : "?" ) + ": number[];";
                        } break;

                        default:
                        {
                            // Default to array of any
                            //
                            output = name + ( required ? "" : "?" ) + ": any[];";
                        } break;
                    }
                }
            }
            else
            {
                // Array of unknown elements
                //
                output = name + ( required ? "" : "?" ) + ": any[];";
            }

        } break;

        case "object":
        {
            // Check for oneOf
            //
            if ( _.isArray( element.oneOf ) )
            {
                var subElements = [];
                _.each( element.oneOf, function( subElement )
                {
                    // Resursion time
                    //
                    subElements.push( convertElement( schemaName, '', subElement, true, options ) );
                } )

                output = name + ( required ? "" : "?" ) + ": " + _.map( subElements, function( el ) { return el[ 0 ].replace( ": ", "" ).replace( ";", "" ); } ).join( " | " ) + ";";
                type   = _.map( subElements, 1 );
            }
            else if ( _.isArray( element.anyOf ) )
            {
                var subElements = [];
                _.each( element.anyOf, function( subElement )
                {
                    // Resursion time
                    //
                    subElements.push( convertElement( schemaName, '', subElement, true, options ) );
                } )

                output = name + ( required ? "" : "?" ) + ": Array<" + _.map( subElements, function( el ) { return el[ 0 ].replace( ": ", "" ).replace( ";", "" ); } ).join( " | " ) + ">;";
                type   = _.map( subElements, 1 );
            }
            else
            {
                // Check for a $ref
                //
                if ( element.$ref )
                {
                    elementPrefix = element.type === "string" ? options.typePrefix : options.prefix;
                    output = name + ( required ? "" : "?" ) + ": " + elementPrefix + options.nameMapping( element.$ref, options.pathDepth ) + ";";
                }
                else if ( element.properties )
                {
                    // We can't nest unnamed object interfaces in TypeScript
                    //
                    output = name + ( required ? "" : "?" ) + ": any;";
                }
                else
                {
                    // Incomplete object definition
                    //
                    console.warn( "WARNING: Schema element of type object has neither $ref nor properties: " + name, element );
                }
            }
        } break;

        default:
        {
            console.warn( "INVALID: Unknown JSON schema element type: " + element.type, element );
        }
    }

    var descr = element.description ? "/** " + element.description + " */ " : "";

    return [ descr + output, type ];
};

var convertSchema = function( schema, options, debug )
{
    // Since json schema v6 .id is replaced by .$id
    //
    var schemaId   = schema.id || schema.$id;
    var exportType = options.export ? "export" : "declare";

    // Deduce schema name
    //
    if ( schemaId )
    {
        var name = options.prefix + options.nameMapping( schemaId, options.pathDepth );
        debug( "Converting schema:", name, schemaId );

        // Collect allOf schema's we need to extend
        //
        var extend = [];
        if ( _.isArray( schema.allOf ) )
        {
            _.forEach( schema.allOf, function( allOff )
            {
                if ( allOff.$ref )
                {
                    extend.push( options.prefix + options.nameMapping( allOff.$ref, options.pathDepth ) );
                }
            } );
        }

        // Start the interface
        //
        var output  = [];
        var types   = [];

        if ( schema.description )
        {
            output.push( "/** " + schema.description + " */" );
        }

        if ( extend.length )
        {
            output.push( exportType + " interface " + name + " extends " + extend.join( ", " ) + " {" );
        }
        else
        {
            output.push( exportType + " interface " + name + " {" );
        }

        _.forEach( schema.properties, function( value, key )
        {
            // Since json schema v6 .id is replaced by .$id
            //
            var schemaId = schema.id || schema.$id;

            var element = convertElement( options.nameMapping( schemaId, options.pathDepth ), key, value, _.indexOf( schema.required, key ) !== -1, options );
            if ( element[ 0 ] ) { output.push( _.padStart( "", options.indent, " " ) + element[ 0 ] ); }
            if ( element[ 1 ] )
            {
                if ( _.isArray( element[ 1 ] ) )
                {
                    _.each( element[ 1 ], function( subType ) {
                        if ( subType )
                        {
                            types.push( subType );
                        }
                    } )
                }
                else
                {
                    types.push( element[ 1 ] );
                }
            }
        } );

        // End the interface
        //
        output.push( "}\n" );

        // Return concatinated output
        //
        return types.join( "\n" ) + ( types.length ? "\n" : "" ) + output.join( "\n" );
    }
    else
    {
        console.warn( "INVALID: Schema missing id", schema );
        throw "INVALID: Input schema missing id";
    }
};

module.exports = function( schemas, options )
{
    // Debug output to console.log or blackhole function
    //
    var debug = options.debug ? console.log : function(){};
    debug( "Converting " + schemas.length + " schema(s)", options );

    // Apply defaults
    //
    if ( !options.prefix     ) { options.prefix     = "I";    }
    if ( !options.typePrefix ) { options.typePrefix = "T";    }
    if ( !options.enumPrefix ) { options.enumPrefix = "E";    }
    if ( !options.enumType   ) { options.enumPrefix = "type"; }
    if ( !options.depth      ) { options.depth      = 1;      }
    if ( !options.indent     ) { options.indent     = 2;      }
    var exportType = options.export ? "export" : "declare";

    // Sanity check input is an array of objects
    //
    if ( !_.reduce( schemas, function( isObject, schema ) { return isObject && _.isObject( schema ); }, true ) )
    {
        throw "ERROR: Invalid input schemas";
    }

    // Use internal name mapping if one hasn't been supplied
    //
    if ( !_.isFunction( options.nameMapping ) )
    {
        options.nameMapping = extractName;
    }

    // Start module
    //
    var output  = [];

    // Convert all the provided schema's
    //
    _.forEach( schemas, function( schema )
    {
        // Only schema's of type object can create exportable interfaces
        //
        if ( schema.type === "object" )
        {
            output.push( convertSchema( schema, options, debug ) );
        }
        else if ( schema.type === "string" && _.isArray( schema.enum ) && !_.isEmpty( schema.enum ) && options.noStringLiterals !== true )
        {
            // Since json schema v6 .id is replaced by .$id
            //
            var schemaId = schema.id || schema.$id;

            // A String only schema with enum values can be output as a string literal type
            // Omit the interface prefix and let the Type/Enum prefix prevail here
            //
            if ( schemaId )
            {
                var name    = _.upperFirst( _.camelCase( options.nameMapping( schemaId, options.pathDepth ) ) );
                var element = convertElement( "", name, schema, false, options );
                if ( element[ 1 ] ) { output.push( element[ 1 ] + "\n" ); }
            }
            else
            {
                console.warn( "INVALID: String schema missing id", schema );
            }
        }
        else
        {
            debug( "Cannot convert schema of type:", schema.type, schema.id );
        }
    } );

    // Return concatinated output
    //
    return output.join( "\n" );
};

