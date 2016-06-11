var _ = require( "lodash" );

// Extract a field/schema name from the JSON schema id
//
var extractName = function( schema, prefix )
{
    if ( !prefix ) { prefix = "I"; }
    return prefix + _.upperFirst( _.camelCase( schema.id.split( "/" ).pop().replace( ".json", "" ) ) );
};

// This method can be called recursively to convert the schema elements
//
var convertElement = function( name, element, required )
{
    switch ( element.type )
    {
        case "string":
        {
            if ( _.isArray( element.enum ) && !_.isEmpty( element.enum ) )
            {
                // Output string literal
                //
                // **TODO**
            }
            else
            {
                return name + ( required ? "" : "?" ) + ": string;";
            }
        } break;

        case "boolean":
        {
            return name + ( required ? "" : "?" ) + ": boolean;";
        } break;

        case "integer":
        case "number":
        case "null":
        {
            return name + ( required ? "" : "?" ) + ": number;";
        } break;

        case "array":
        {

        } break;

        case "object":
        {

        } break;

        default:
        {
            debug( "Unknown schema element type", element.type );
        }
    }
};

var convertSchema = function( schema, options, debug )
{
    // Deduce schema name
    //
    var name = extractName( schema, options.prefix );
    debug( "Converting schema:", name, schema.id );

    // Start the interface
    //
    var output = [ "interface " + name + " {" ];

    _.forEach( schema.properties, function( value, key )
    {
        output.push( convertElement() );
    } );

    // End the interface
    //
    output.push( "}" );

    // Return concatinated output
    //
    return output.join( "\n" );
};

module.exports = function( schemas, options )
{
    // Debug output to console.log or blackhole function
    //
    var debug = options.debug ? console.log : function(){};
    debug( "Converting " + schemas.length + " schema(s)", options  );

    // Sanity check input in an array of objects
    //
    if ( _.reduce( schemas, function( isObject, schema ) { return isObject && _.isObject( schema ); }, true ) )
    {
        throw "ERROR: Invalid input schemas";
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
            // String schema can be output as a string literal type
            //
            var name = extractName( schema, options.prefix );
            output.push( convertElement( name, schema ) );
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

