var _ = require( "lodash" );

// Extract a field/schema name from the JSON schema id
//
var extractName = function( id, prefix, depth )
{
    if ( !prefix ) { prefix = "I"; }
    if ( !depth  ) { depth  = 1;   }

    return prefix + _.upperFirst( _.camelCase( id.split( "/" ).slice( -1 * depth ).join( " " ).replace( ".json", "" ) ) );
};

// This method can be called recursively to convert the schema elements
//
var convertElement = function( name, element, required, options )
{
    var output;
    var type;

    switch ( element.type )
    {
        case "string":
        {
            if ( _.isArray( element.enum ) && !_.isEmpty( element.enum ) && options[ "no-string-literals" ] !== true )
            {
                // Output string literal
                //
                type   = "type T" + name + " = " + element.enum.join( " | " ) + ";";
                output = name + ( required ? "" : "?" ) + ": T" + name + ";";
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
                    output = name + ( required ? "" : "?" ) + ": Array<" + options.nameMapping( element.$ref, options.prefix, options[ "path-depth" ] ) + ">;";
                }
                else
                {
                    switch ( element.items.type )
                    {
                        case "string":
                        {
                            output = name + ( required ? "" : "?" ) + ": Array<string>;";
                        } break;

                        case "boolean":
                        {
                            output = name + ( required ? "" : "?" ) + ": Array<boolean>;";
                        } break;

                        case "integer":
                        case "number":
                        case "null":
                        {
                            output = name + ( required ? "" : "?" ) + ": Array<number>;";
                        } break;

                        default:
                        {
                            // Default to array of any
                            //
                            output = name + ( required ? "" : "?" ) + ": Array<any>;";
                        } break;
                    }
                }
            }
            else
            {
                // Array of unknown elements
                //
                output = name + ( required ? "" : "?" ) + ": Array<any>;";
            }

        } break;

        case "object":
        {
            // Check for a $ref
            //
            if ( element.$ref )
            {
                output = name + ( required ? "" : "?" ) + ": " + options.nameMapping( element.$ref, options.prefix, options[ "path-depth" ] ) + ";";
            }
            else if ( element.properties )
            {
                // We can't nest unnamed object interfaces in TypeScript
                //
                output = name + ( required ? "" : "?" ) + ": any;";
            }
            else
            {
                // Invalid object definition
                //
                console.warn( "INVALID: Invalid JSON schema element of type object: " + name );
            }
        } break;

        default:
        {
            console.warn( "INVALID: Unknown JSON schema element type: " + element.type );
        }
    }

    return [ output, type ];
};

var convertSchema = function( schema, options, debug )
{
    // Deduce schema name
    //
    var name = options.nameMapping( schema.id, options.prefix, options[ "path-depth" ] );
    debug( "Converting schema:", name, schema.id );

    // Start the interface
    //
    var output = [ "interface " + name + " {" ];
    var types  = [];

    _.forEach( schema.properties, function( value, key )
    {
        var element = convertElement( key, value, _.indexOf( schema.required, key ) !== -1, options );
        if ( element[ 0 ] ) { output.push( element[ 0 ] ); }
        if ( element[ 1 ] ) { types.push( element[ 1 ] ); }
    } );

    // End the interface
    //
    output.push( "}" );

    // Return concatinated output
    //
    return types.join( "\n" ) + output.join( "\n" );
};

module.exports = function( schemas, options )
{
    // Debug output to console.log or blackhole function
    //
    var debug = options.debug ? console.log : function(){};
    debug( "Converting " + schemas.length + " schema(s)", options );

    // Sanity check input in an array of objects
    //
    if ( !_.reduce( schemas, function( isObject, schema ) { return isObject && _.isObject( schema ); }, true ) )
    {
        throw "ERROR: Invalid input schemas";
    }

    // Use internal name mapping one hasn't been supplied
    //
    if ( !_.isFunction( options.nameMapping ) )
    {
        options.nameMapping = extractName;
    }

    // Start module
    //
    var output = [];
    output.push( "declare module " + options.module + "{" );

    // Convert all the provided schema's
    //
    schemas.forEach( function( schema )
    {
        // Only schema's of type object can create exportable interfaces
        //
        if ( schema.type === "object" )
        {
            output.push( convertSchema( schema, options, debug ) );
        }
        else if ( schema.type === "string" && _.isArray( schema.enum ) && !_.isEmpty( schema.enum ) && options[ "no-string-literals" ] !== true )
        {
            // A String only schema with enum values can be output as a string literal type
            //
            var name    = options.nameMapping( schema.id, options.prefix, options[ "path-depth" ] );
            var element = convertElement( name, schema );
            if ( element[ 1 ] ) { output.push( element[ 1 ] ); }
        }
        else
        {
            debug( "Cannot convert schema of type:", schema.type, schema.id );
        }
    } );

    // End module
    //
    output.push( "}" );

    // Return concatinated output
    //
    return output.join( "\n" );
};

