import Rx from 'rxjs/Rx';
import { PluginSystem } from 'reactive-plugin-system';

import getBasicOperators from './basic-operators';
import CommandManager from './command-manager';

export default class Core {
  constructor( drivers ) {
    this.drivers = drivers;
    this.settings = null;


    this.commands = new CommandManager();

    const pluginLoader = id => this.drivers.plugins.load( id )
      .map( factory => ( { id, factory } ) );

    this.plugins = new PluginSystem( { data: this, loader: pluginLoader } );
  }

  init() {
    this.commands.connector.addOperators( getBasicOperators( this ) );

    this.settings$ = this._loadSettings().share();
    const plugins$ = this._loadPlugins( this.settings$ );

    // initialization is done once we loaded all plugins
    return plugins$.ignoreElements().share();
  }

  _loadSettings() {
    return this.drivers.profile.settings.get( 'settings' )
      .do( settings => { this.settings = settings; } );
  }

  _loadPlugins( settings$ ) {
    const pluginsToLoad$ = settings$
      .map( settings => settings.plugins.enabled )
      .first()
      .share();

    const initiateLoading$ = pluginsToLoad$
      .do( plugins => plugins.forEach( this.plugins.load.bind( this.plugins ) ) )
      .ignoreElements();

    const waitingForLoadingToFinish$ = pluginsToLoad$
      .flatMap( pluginsToLoad => this.plugins.waitForAll( pluginsToLoad ) );

    return Rx.Observable.concat( initiateLoading$, waitingForLoadingToFinish$ );
  }
}
