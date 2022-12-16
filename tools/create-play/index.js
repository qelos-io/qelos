#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { cwd } = require('node:process');
const [, , projectName = 'qelos-plugin', ...argv] = process.argv;

function copyFileSync( source, target ) {

  let targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if ( fs.existsSync( target ) ) {
    if ( fs.lstatSync( target ).isDirectory() ) {
      targetFile = path.join( target, path.basename( source ) );
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
  let files = [];

  // Check if folder needs to be created or integrated
  const targetFolder = path.join( target, path.basename( source ) );
  if ( !fs.existsSync( targetFolder ) ) {
    fs.mkdirSync( targetFolder );
  }

  // Copy
  if ( fs.lstatSync( source ).isDirectory() ) {
    files = fs.readdirSync( source );
    files.forEach( function ( file ) {
      const curSource = path.join( source, file );
      if ( fs.lstatSync( curSource ).isDirectory() ) {
        copyFolderRecursiveSync( curSource, targetFolder );
      } else {
        copyFileSync( curSource, targetFolder );
      }
    } );
  }
}

fs.renameSync(path.join(__dirname, 'qelos-plugin'), path.join(__dirname, projectName));
copyFolderRecursiveSync(path.join(__dirname, projectName), cwd());

console.log('Qelos plugin Created');
console.log('Please run: cd ' + projectName + ' && npm install');