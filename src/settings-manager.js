import path from 'path';
import { Observable } from 'rxjs';
import yaml from 'js-yaml';

function getFileLoaders( fs ) {
  const readFile = Observable.bindNodeCallback( fs.readFile );
  const readFileAsText = filePath => readFile( filePath, 'utf8' );

  const jsLoader = filePath => Observable.of( require( filePath ) );
  const jsonLoader = filePath => readFileAsText( filePath )
                                   .map( content => JSON.parse( content ) );

  const yamlLoader = filePath => readFileAsText( filePath )
                                   .map( content => yaml.safeLoad( content ) );

  return {
    js: jsLoader,
    json: jsonLoader,
    yml: yamlLoader,
    yaml: yamlLoader
  };
}

export default class SettingsManager {
  constructor( profile ) {
    this._profile = profile;
    this._fs = profile.fs;
    this._readdir = Observable.bindNodeCallback( this._fs.readdir );
    this._fileLoaders = getFileLoaders( this._fs );
  }

  get( name ) {
    const dirName = path.dirname( name );
    const baseName = path.basename( name );
    const files$ = this._readdir( dirName ) // TODO: filter out directories
      .map( files =>
        files.filter( file =>
          path.basename( file, path.extname( file ) ) === baseName ) );

    const exts$ = files$.map( files => files.map( path.extname )
                                            .map( ext => ext.substring( 1 ) ) )
      .do( exts => {
        if ( exts.length === 0 )
          throw new Error( `Cannot retrieve settings for '${name}'. File does not exist!` );
      } )
      .map( exts => exts.filter( ext => ext in this._fileLoaders ) )
      .do( exts => {
        if ( exts.length === 0 )
          throw new Error( `Cannot retrieve settings for '${name}'. File format not supported!` );
      } );

    return exts$.flatMap( exts => this._fileLoaders[ exts[0] ]( `${name}.${exts[0]}` ) );
  }
}
