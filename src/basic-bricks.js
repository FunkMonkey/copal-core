import Rx from "rx";
import dialog from "dialog";
import open from "open";
import dec from "./utils/decorators";
import R from "ramda";

import { getStreamDebugFullName } from "./command-session";

const bricks = {


  getErrorData( error ) {
    if( error.stack )
      return {
        title: error.name + ": " + error.message,
        stack: error.stack
      };
    else
      return {
        title: error,
        stack: ""
      };
  },

  showErrorDialog( error, dataAndMeta ) {
    var errorData = this.getErrorData( error );

    dialog.showErrorBox( errorData.title, errorData.title + "\n\n" + errorData.stack );

    return dataAndMeta;
  },

  // @dec.wrapInStreamSync
  // printErrorToConsole( sessionData, data ) {
  //   const errorData = this.getErrorData( data );
  //   console.error( errorData.title, "\n", errorData.stack );
  //   return data;
  // },

  printErrorToConsole( prevStream ) {
    // prevStream.subscribe( (data) => console.log("subscribe") );

    return prevStream.do( data => {
      const errorData = this.getErrorData( data );
      console.error( errorData.title, "\n", errorData.stack );
    } );
  },

  // @dec.wrapInStreamSync
  // executeCommand( sessionData, data ) {
  //   this.executeCommand( data );
  //   return data;
  // },

  executeCommand( prevStream ) {
    return prevStream.do( data => this.executeCommand( data ) );
  },

  // @dec.wrapInStreamSync
  // getCommandInfos( sessionData, data ) {
  //   const query = ( data.queryString || "" ).toLowerCase();
  //   return Object.keys( this.commandConfigs ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 && !this.commandConfigs[cmd].hidden ).sort();
  // },

  getCommandInfos( prevStream ) {
    return prevStream.map( data => {
      const query = ( data.queryString || "" ).toLowerCase();
      return Object.keys( this.commandConfigs ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 && !this.commandConfigs[cmd].hidden ).sort();
    } );
  },

  // @dec.wrapInStreamSync
  // openExternal ( sessionData, data ) {
  //   open( data );
  //   return data;
  // },

  openExternal ( prevStream ) {
    return prevStream.do( data => open( data ) );
  },

  subscribeLog ( prevStream ) {
    prevStream.subscribe( ( data ) => console.log( "Data", data ),
                          ( data ) => console.log( "Error", data ),
                          ( data ) => console.log( "Completed", data ) );
    return prevStream;
  },

  debug( prevStream, sessionData, verbose ) {
    const stream = prevStream.do( (data) => console.log( "DEBUG", getStreamDebugFullName( prevStream ), data ) );
    return stream;
  },

  startWith( prevStream, sessionData, path ) {
    return prevStream.startWith( R.path( path.split("."), sessionData.session.config ) );
  },

  autostart( prevStream, sessionData, value ) {
    return prevStream.startWith( value );
  },

  getFromConfig( prevStream, sessionData, path ) {
    return prevStream.map( () => R.path( path.split("."), sessionData.session.config ) );
  }

};

export default function ( copal ) {

  copal.bricks.addErrorBrick( "CoPal.printErrorToConsole", bricks.printErrorToConsole.bind( bricks ) );

  copal.bricks.addTransformBrick( "CoPal.getCommandInfos", bricks.getCommandInfos.bind( copal ) );
  copal.bricks.addTransformBrick( "CoPal.executeCommand", bricks.executeCommand.bind( copal ) );
  copal.bricks.addTransformBrick( "Common.open", bricks.openExternal );
  copal.bricks.addTransformBrick( "Common.useInitialData", bricks.useInitialData );
  // copal.bricks.addTransformBrick( "Common.subscribeLog", bricks.subscribeLog );
  copal.bricks.addTransformBrick( "Common.debug", bricks.debug );
  copal.bricks.addTransformBrick( "Common.startWith", bricks.startWith );
  copal.bricks.addTransformBrick( "Common.autostart", bricks.autostart );
  copal.bricks.addTransformBrick( "Common.getFromConfig", bricks.getFromConfig );

}
