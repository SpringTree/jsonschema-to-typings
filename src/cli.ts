#!/usr/bin/env node
import { runCli } from "./run-cli.js";

// Command-line entry point, see run-cli.ts for the implementation
//
process.exitCode = runCli(process.argv.slice(2));

//
