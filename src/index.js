import R from 'ramda';
import Rx from 'rxjs';
import { PluginSystem } from 'reactive-plugin-system';

import getBasicOperators from './basic-operators';
import ProfileManager from './profile-manager';
import SettingsManager from './settings-manager';
import CommandManager from './command-manager';

export default class Core {
  constructor( options ) {
    this._options = options;
    this.profile = new ProfileManager( options.profile );
    this.settings = new SettingsManager( this.profile );
    this.coreSettings = null;
    this.commands = new CommandManager( this );

    this.plugins = new PluginSystem( { data: this, getFactory: options.getPluginFactory } );
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
      .map( enabledPlugins => R.concat( enabledPlugins, this._options.additionalPlugins || [] ) )
      .first()
      .share();

    return pluginsToLoad$
      .flatMap( pluginsToLoad => this.plugins.loadAndWaitForAll( pluginsToLoad ) )
      .ignoreElements();
  }
}
