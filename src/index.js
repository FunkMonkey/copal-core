import Rx from 'rxjs/Rx';
import { PluginSystem } from 'reactive-plugin-system';

import getBasicOperators from './basic-operators';
import ProfileManager from './profile-manager';
import SettingsManager from './settings-manager';
import CommandManager from './command-manager';

export default class Core {
  constructor( options ) {
    this.profile = new ProfileManager( options.profile );
    this.settings = new SettingsManager( this.profile );
    this.coreSettings = null;
    this.commands = new CommandManager();

    const pluginLoader = id => options.getPluginFactory( id )
      .map( factory => ( { id, factory } ) );

    this.plugins = new PluginSystem( { data: this, loader: pluginLoader } );
  }

  init() {
    this.commands.connector.addOperators( getBasicOperators( this ) );

    this.coreSettings$ = this._loadMainSettings().share();
    const plugins$ = this._loadPlugins( this.coreSettings$ );

    // initialization is done once we loaded all plugins
    return plugins$.ignoreElements().share();
  }

  _loadMainSettings() {
    return this.settings.get( '/settings' )
      .do( coreSettings => { this.coreSettings = coreSettings; } );
  }

  _loadPlugins( coreSettings$ ) {
    const pluginsToLoad$ = coreSettings$
      .map( coreSettings => coreSettings.plugins.enabled )
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
