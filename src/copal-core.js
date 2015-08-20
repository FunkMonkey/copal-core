import CommandSession from "./commandsession";
// import ExamplePlugin from "./example/example-plugin";
import Bricks from "./bricks";
import path from "path";
import config from "config-file";
import _ from "lodash";

import initBasicBricks from "./basic-bricks";
import BASIC_COMMANDS from "./basic-commands.json";
import DEFAULT_SETTINGS from "./default-settings.json";

export default class CopalCore {

  /**
   * Creates a new core and runs it
   *
   * @return   {CopalCore}   The newly created core
   */
  static run( startupArgs ) {
    var core = new CopalCore( startupArgs );
    return core.init()
               .then( () => core );
  }

  /**
   * Constructs a new CopalCore
   */
  constructor( startupArgs ) {
    this.commands = {};
    this.bricks = new Bricks();

    this.startupArgs = startupArgs;
    this.profileDir = startupArgs["profile-dir"];
    this.settings = this.loadProfileConfig( "settings.json") || { };
    this.settings = this.defaultifyOptions( this.settings, DEFAULT_SETTINGS );

    initBasicBricks( this );
    BASIC_COMMANDS.forEach( command => this.addCommand( command ) );

    var loadedCommands = this.loadProfileConfig( "commands.json") || [];
    loadedCommands.forEach( command => this.addCommand( command ) );

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

    if( !name )
      throw new Error( `A command with the name '${name}' already exists!` );

    this.commands[ name ] = commandConfig;
  }

  getCommand( name ) {

    var command = this.commands[ name ];

    if( !command )
      throw new Error( `Command '${name}' does not exist!` );

    return command;
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
      this.activeCommandSession.destroy();

    ++CopalCore.lastCommandSessionID;
    this.activeCommandSession = new CommandSession( this, CopalCore.lastCommandSessionID, command, this.bricks );
    this.activeCommandSession.execute();
  }

  /**
   * Initializes CopalCore
   */
  init() {
    // testing
    // ExamplePlugin.init( this );

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
   *
   * @return   {Object}               Options object that was passed in
   */
  defaultifyOptions( options, defaults ) {
    return _.merge( _.cloneDeep(defaults), options, ( a, b ) => {
      if( Array.isArray( b ) )
        return b;
    } );
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

      if( ext.init && typeof ext.init === "function" )
        ext.init( this );
    });

    return Promise.resolve( true );
  }
}

CopalCore.lastCommandSessionID = 1;
