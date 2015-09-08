import CommandSession from "./command-session";
// import ExamplePlugin from "./example/example-plugin";
import Bricks from "./bricks";
import path from "path";
import config from "config-file";
import _ from "lodash";

import initBasicBricks from "./basic-bricks";
import BASIC_COMMANDS from "./basic-commands.json";
import BASIC_UNITS from "./basic-units.json";
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
    this.commandConfigs = {};
    this.unitConfigs = {};
    this.bricks = new Bricks();

    this.startupArgs = startupArgs;
    this.profileDir = startupArgs["profile-dir"];
    this.settings = this.loadProfileConfig( "settings.json") || { };
    this.settings = this.defaultifyOptions( this.settings, DEFAULT_SETTINGS );

    initBasicBricks( this );
    BASIC_UNITS.forEach( unitConfig => this.addUnitConfig( unitConfig ) );
    BASIC_COMMANDS.forEach( commandConfig => this.addCommandConfig( commandConfig ) );

    // TODO: uncomment
    // var loadedCommands = this.loadProfileConfig( "commands.json") || [];
    // loadedCommands.forEach( command => this.addCommand( command ) );

    this.activeCommandSession = null;
  }

  addCommandConfig( commandConfig ) {
    if( this.commandConfigs[ commandConfig.name ] )
      throw new Error( `A command with the name '${commandConfig.name}' already exists!` );

    this.commandConfigs[ commandConfig.name ] = commandConfig;
  }

  getCommandConfig( name, throwIfNotFound ) {

    var commandConfig = this.commandConfigs[ name ];

    if( !commandConfig && throwIfNotFound )
      throw new Error( `Command '${name}' does not exist!` );

    return commandConfig;
  }

  addUnitConfig( unitConfig ) {
    if( this.unitConfigs[ unitConfig.name ] )
      throw new Error( `A unit with the name '${unitConfig.name}' already exists!` );

    this.unitConfigs[ unitConfig.name ] = unitConfig;
  }

  getUnitConfig( name, throwIfNotFound ) {

    var unitConfig = this.unitConfigs[ name ];

    if( !unitConfig && throwIfNotFound )
      throw new Error( `Unit '${name}' does not exist!` );

    return unitConfig;
  }

  /**
   * Executes the given command.
   *
   * @param  {string}   name        Name of the command to execute
   * @param  {Object}   [options]   Options passed to the command
   */
  executeCommand( name /*, options */ ) {
    var commandConfig = this.commandConfigs[ name ];

    if( !commandConfig )
      throw new Error( `Command '${name}' does not exist!` );

    if( this.activeCommandSession )
      this.activeCommandSession.destroy();

    this.activeCommandSession = new CommandSession( this, name );
    this.activeCommandSession.initialize();
    this.activeCommandSession.start();
  }

  /**
   * Initializes CopalCore
   */
  init() {
    // testing
    // ExamplePlugin.init( this );

    return this.loadExtensions()
      .then( () => {
        if( this.settings.startupCommand )
          this.executeCommand( this.settings.startupCommand );
      } )
      .catch( error => console.error( error, error.stack ) );
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
