import _ from "lodash";

import ID from "./ID";
import UnitSession from "./unit-session";

export default class CommandSession {

  constructor( core, name ) {
    this.id = ID( "command-session" );
    this.core = core;
    this.name = name;

    this._unitSessions = {};
  }

  initialize() {
    this.config = this.core.getCommandConfig( this.name, true );

    this.createUnitSessions();
    this.connectUnitSessions();
  }

  _createUnitSession( name ) {
    if( !this._unitSessions[ name ] )
      this._unitSessions[ name ] = new UnitSession( this.core, name );
  }

  createUnitSessions() {
    _.forIn( this.config.connections, (dest, src) => {

      // TODO: throw if cannot be split
      const srcUnitName = src.split( ":" )[0];
      const destUnitName = dest.split( ":" )[0];

      this._createUnitSession( srcUnitName );
      this._createUnitSession( destUnitName );
    } );
  }

  connectUnitSessions() {
    _.forIn( this.config.connections, (dest, src) => {

      // TODO: throw if cannot be split
      const srcUnitInfo = src.split( ":" );
      const destUnitInfo = dest.split( ":" );

      const srcStream = this._unitSessions[ srcUnitInfo[0] ].getStreamEnd( srcUnitInfo[1] );
      const destStream = this._unitSessions[ destUnitInfo[0] ].getStreamStart( destUnitInfo[1] );
      srcStream.pipe( destStream );
    } );
  }

  start() {
    _.forIn( this._unitSessions, ( session ) => {
      if( session.config.autostart ) {
        _.forIn( session.config.autostart, ( data, streamName ) => {
          session.pushIntoStream( streamName, data );
        } );
      }
    } );
  }

}
