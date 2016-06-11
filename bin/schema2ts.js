#!/usr/bin/env node

var program   = require( "commander"       );
var pkg       = require( "../package.json" );
var jsonfile  = require( "jsonfile"        );
var fs        = require( "fs"              );
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

// Load the supplied JSON Schema files
//
var inputFiles = [];
program.files.split( "," ).forEach( function( fileName )
{
    inputFiles.push( jsonfile.readFileSync( fileName.trim() ) );
} );

// Run the Schema converter using the provided options
//
if ( program.debug ) { process.stdout.write( "---BEGIN DEBUG---\n" ); }
var typescriptCode = converter( inputFiles,
{
    "no-string-literals": program[ "no-string-literals" ] !== undefined
,   "debug":              program.debug                   !== undefined
} );
if ( program.debug ) { process.stdout.write( "---END DEBUG---\n" ); }

// Output the resulting TypeScript either to console or file
//
if ( program.out )
{
    fs.writeFile( program.out, typescriptCode + "\n", function( error )
    {
        if ( error ) { throw error; }
        process.stdout.write( "File write complete: " + program.out + "\n" );
    } );
}
else
{
    if ( program.debug ) { process.stdout.write( "---BEGIN OUTPUT---\n" ); }
    process.stdout.write( typescriptCode + "\n" );
    if ( program.debug ) { process.stdout.write( "---END OUTPUT---\n" ); }
}
