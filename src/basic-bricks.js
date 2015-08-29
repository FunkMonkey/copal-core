
import dialog from "dialog";
import open from "open";
import through2 from "through2";
import dec from "./utils/decorators";

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
    var errorData = getErrorData( error );

    dialog.showErrorBox( errorData.title, errorData.title + "\n\n" + errorData.stack );

    return dataAndMeta;
  },

  @dec.wrapInStreamSync
  printErrorToConsole( sessionData, data ) {
    const errorData = this.getErrorData( data );
    console.error( errorData.title, "\n", errorData.stack );
    return data;
  },

  @dec.wrapInStreamSync
  executeCommand( sessionData, data ) {
    this.executeCommand( data );
    return data;
  },

  @dec.wrapInStreamSync
  getCommandInfos( sessionData, data ) {
    const query = ( data.queryString || "" ).toLowerCase();
    return Object.keys( this.commands ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 && !this.commands[cmd].hidden ).sort();
  },

  @dec.wrapInStreamSync
  openExternal ( sessionData, data ) {
    open( data );
    return data;
  }

};

export default function ( copal ) {

  copal.bricks.addErrorBrick( "CoPal.printErrorToConsole", bricks.printErrorToConsole.bind( bricks ) );

  copal.bricks.addTransformBrick( "CoPal.getCommandInfos", bricks.getCommandInfos.bind( copal ) );
  copal.bricks.addTransformBrick( "CoPal.executeCommand", bricks.executeCommand.bind( copal ) );
  copal.bricks.addTransformBrick( "Common.open", bricks.openExternal );
}
