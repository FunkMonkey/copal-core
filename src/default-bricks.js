

import dialog from "dialog";
import open from "open";

function getErrorData( commandSession, error ) {
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

function logErrorToConsole( commandSession, error ) {
  var errorData = getErrorData( commandSession, error );
  console.log( errorData.title + "\n" + errorData.stack );
}

function showErrorDialog( commandSession, error ) {
  var errorData = getErrorData( commandSession, error );

  dialog.showErrorBox( errorData.title, errorData.title + "\n\n" + errorData.stack );
}

function executeCommand( cmdSession, commandName, options ) {
  this.executeCommand( commandName, options );
}

function getCommandInfos( cmdSession, query ) {
  query = ( query.queryString || "" ).toLowerCase();
  // TODO: return objects with descriptions
  return Object.keys( this.commands ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 ).sort();
}

function openExternal ( cmdSession, url ) {
	return open( url );
}

export default function initDefaultBricks( copal ) {
	copal.bricks.addErrorBrick( logErrorToConsole );
	copal.bricks.addErrorBrick( showErrorDialog );

	copal.bricks.addDataBrick( "CoPal.getCommandInfos", getCommandInfos.bind( copal ) );
	copal.bricks.addDataBrick( "CoPal.executeCommand", executeCommand.bind( copal ) );
	copal.bricks.addDataBrick( "Common.open", openExternal );
}
