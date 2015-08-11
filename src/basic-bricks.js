

import dialog from "dialog";
import open from "open";

function getErrorData( error ) {
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
}

function logErrorToConsole( error, dataAndMeta ) {
  var errorData = getErrorData( error );
  console.log( errorData.title + "\n" + errorData.stack );

  return dataAndMeta;
}

function showErrorDialog( error, dataAndMeta ) {
  var errorData = getErrorData( error );

  dialog.showErrorBox( errorData.title, errorData.title + "\n\n" + errorData.stack );

  return dataAndMeta;
}

function executeCommand( error, dataAndMeta ) {
  if( error )
    throw error;

  this.executeCommand( dataAndMeta.data );

  return dataAndMeta;
}

function getCommandInfos( error, dataAndMeta ) {
  if( error ) {
    throw error;
  }

  var query = ( dataAndMeta.data.queryString || "" ).toLowerCase();
  dataAndMeta.data = Object.keys( this.commands ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 && !this.commands[cmd].hidden ).sort();

  return dataAndMeta;
}

function openExternal ( error, dataAndMeta ) {
  if( error )
    throw error;

	open( dataAndMeta.data );

  return dataAndMeta;
}

export default function ( copal ) {
	copal.bricks.addErrorBrick( logErrorToConsole );
	copal.bricks.addErrorBrick( showErrorDialog );

	copal.bricks.addDataBrick( "CoPal.getCommandInfos", getCommandInfos.bind( copal ) );
	copal.bricks.addDataBrick( "CoPal.executeCommand", executeCommand.bind( copal ) );
	copal.bricks.addDataBrick( "Common.open", openExternal );
}