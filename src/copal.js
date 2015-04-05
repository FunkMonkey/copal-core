
// TODO: CommandConfig to InternalCommand
// class InternalCommand {
// }

import CommandSession from "./commandsession";
import ExamplePlugin from "./example/example-plugin";
import Bricks from "./bricks";
import Launcher from "copal-launcher";
import path from "path";
import config from "config-file";
import _ from "lodash";

import initDefaultBricks from "./default-bricks";

// TODO: put default commands into JSON file
import defaultCommands from "./default-commands";

const appDataDir = process.env.APPDATA || ( process.platform === "darwin" ? process.env.HOME + "Library/Preference" : "/var/local" );
const defaultProfileDir = path.join( appDataDir, "copal" );

const DEFAULT_SETTINGS = {
  "extensions": {
    "enabled": []
  }
};

export default class CoPal {

  constructor() {
    this.commands = {};
    this.bricks = new Bricks();

    // TODO: optional profile dir as command-line parameter
    this.profileDir = defaultProfileDir;
    this.settings = this.loadProfileConfig( "settings.json") || { };
    this.defaultifyOptions( this.settings, DEFAULT_SETTINGS, true );
    console.log( this.settings );


    initDefaultBricks( this );
    defaultCommands.forEach( command => this.addCommand( command ) );

    var loadedCommands = this.loadProfileConfig( "commands.json") || [];
    loadedCommands.forEach( command => this.addCommand( command ) );

    // TODO: command aliases

    // TODO: support more than one active command
    //   - but how will we deal with command destruction then?
    //   - when is a command done?
    this.activeCommandSession = null;
  }

  /**
   * Adds the given command configuration with the given name.
   * If no name is given, the name will be taken from the `name` property
   * of the command configuration.
   *
   * @param   {Object}   commandConfig   Command configuration to add
   * @param   {string}   [name]          Name to register this configuration as
   */
  addCommand( commandConfig, name ) {
    if( !name )
      name = commandConfig.name;

    // TODO: throw Error if name already existing
    if( !name )
      throw new Error( `A command with the name '${name}' already exists!` );

    this.commands[ name ] = commandConfig;
  }

  /**
   * Executes the given command.
   *
   * @param  {string}   name        Name of the command to execute
   * @param  {Object}   [options]   Options passed to the command
   */
  executeCommand( name, options ) {
    var command = this.commands[ name ];

    if( !command )
      throw new Error( `Command '${name}' does not exist!` );

    if( this.activeCommandSession )
      this.activeCommandSession.getSignal("destroy").dispatch();

    ++CoPal.lastCommandSessionID;
    this.activeCommandSession = new CommandSession( CoPal.lastCommandSessionID, command, this.bricks );
    this.activeCommandSession.execute();
  }

  /**
   * Initializes CoPal
   */
  init() {
    // testing
    ExamplePlugin.init( this );

    return this.loadExtensions();
  }

  /**
   * Loads a config file (JSON or YAML) relative to the profile directory.
   *    Uses [config-file](https://github.com/jonschlinkert/config-file)
   *
   * @param  {string}   filePath
   * @param  {Object}   options    Options passed to the config-module
   *
   * @return {Object}              Config as JSON
   */
  loadProfileConfig( filePath, options ) {
    return config.load( path.join( this.profileDir, filePath ), options );
  }

  /**
   * Sets default properties for the given options object
   *
   * @param    {Object}    options    Options to set defaults for
   * @param    {Object}    defaults   Defaults to set
   * @param    {boolean}   deep       Set default for properties that are objects
   *
   * @return   {Object}               Options object that was passed in
   */
  defaultifyOptions( options, defaults, deep ) {

    if( deep ) {
      for( var propName in options ) {
        var prop = options[propName];
        var defaultProp = defaults[propName];
        if( typeof prop === "object" && !Array.isArray( prop ) && typeof defaultProp === "object" )
          _.defaults( prop, defaultProp, deep );
      }
    }

    _.defaults( options, defaults );

    return options;
  }

  /**
   * Loads the extensions that were specified in the config
   *
   * @return   {Promise}   Resolves, when extensions have been loaded
   */
  loadExtensions() {
    this.settings.extensions.enabled.forEach( extName => {
      console.log( `Loading extension: '${extName}'` );
      var ext = require( extName );

      // TODO: make init async
      if( ext.init && typeof ext.init === "function" )
        ext.init( this );
    });

    return Promise.resolve( true );
  }
}

// TODO: think about moving session counter somewhere else
CoPal.lastCommandSessionID = 1;
