#!/usr/bin/env node

var program   = require( "commander"       );
var pkg       = require( "../package.json" );
var jsonfile  = require( "jsonfile"        );
var fs        = require( "fs"              );
var glob      = require( "glob"            );
var converter = require( "../lib/index"    );

// Declare our command-line options
//
program
    .version( pkg.version )
    .option( "-f, --files <files>",         "Input JSON Schema files"                             )
    .option( "-o, --out [file]",            "Output TypeScript file. Default output is to STDOUT" )
    .option( "-nsl, --no-string-literals",  "Don't use TypeScript 1.8 string literals for enums"  )
    .option( "-d, --debug",                 "Enable debug output"                                 )
    .parse( process.argv );

if ( !program.files )
{
    program.help();
}

if ( program.debug ) { console.log( "---BEGIN DEBUG---" ); }

// Load the supplied JSON Schema files
//
var schemas = [];
glob( program.files, function( error, fileNames )
{
    if ( error ) { throw error; }
    if ( program.debug ) { console.log( "Input files", fileNames ); }
    fileNames.forEach( function( fileName )
    {
        schemas.push( jsonfile.readFileSync( fileName.trim() ) );
    } );
} );

// Run the Schema converter using the provided options
//
var typescriptCode = converter( schemas,
{
    "no-string-literals": program[ "no-string-literals" ] !== undefined
,   "debug":              program.debug                   !== undefined
} );
if ( program.debug ) { console.log( "---END DEBUG--" ); }

// Output the resulting TypeScript either to console or file
//
if ( program.out )
{
    fs.writeFile( program.out, typescriptCode + "\n", function( error )
    {
        if ( error ) { throw error; }
        console.log( "File write complete: " + program.out + "\n" );
    } );
}
else
{
    if ( program.debug ) { console.log( "---BEGIN OUTPUT---" ); }
    console.log( typescriptCode );
    if ( program.debug ) { console.log( "---END OUTPUT---" ); }
}
