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

    // Default type is assumed to be an object
    //
    switch ( element.type || "object" )
    {
        case "string":
        {
            if ( _.isArray( element.enum ) && !_.isEmpty( element.enum ) && options.noStringLiterals !== true )
            {
                // Output string literal
                //
                typeName = options.typePrefix + schemaName + _.upperFirst( name );
                type     = "declare type " + typeName + " = \"" + element.enum.join( "\" | \"" ) + "\";";
                output   = name + ( required ? "" : "?" ) + ": " + typeName + ";";
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
        } break;

        default:
        {
            console.warn( "INVALID: Unknown JSON schema element type: " + element.type, element );
        }
    }

    return [ output, type ];
};

var convertSchema = function( schema, options, debug )
{
    // Deduce schema name
    //
    if ( schema.id )
    {
        var name = options.prefix + options.nameMapping( schema.id, options.pathDepth );
        debug( "Converting schema:", name, schema.id );

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

        if ( extend.length )
        {
            output.push( "declare interface " + name + " extends " + extend.join( ", " ) + " {" );
        }
        else
        {
            output.push( "declare interface " + name + " {" );
        }

        _.forEach( schema.properties, function( value, key )
        {
            var element = convertElement( options.nameMapping( schema.id, options.pathDepth ), key, value, _.indexOf( schema.required, key ) !== -1, options );
            if ( element[ 0 ] ) { output.push( _.padStart( "", options.indent, " " ) + element[ 0 ] ); }
            if ( element[ 1 ] ) { types.push( element[ 1 ] ); }
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
    if ( !options.prefix     ) { options.prefix     = "I"; }
    if ( !options.typePrefix ) { options.typePrefix = "T"; }
    if ( !options.depth      ) { options.depth      = 1;   }
    if ( !options.indent     ) { options.indent     = 2;   }

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
            // A String only schema with enum values can be output as a string literal type
            // Omit the interface prefix and let the Type prefix prevail here
            //
            if ( schema.id )
            {
                var name    = _.upperFirst( options.nameMapping( schema.id, options.pathDepth ) );
                var element = convertElement( "", name, schema, false, options );
                if ( element[ 1 ] ) { output.push( "export " +  element[ 1 ] + "\n" ); }
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

