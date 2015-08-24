
import dialog from "dialog";
import open from "open";
import through2 from "through2";

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

function executeCommand( ) {

  return through2.obj( (dataAndMeta, enc, done) => {
    this.executeCommand( dataAndMeta.data );
    done( null, dataAndMeta );
  });

}

function getCommandInfos( ) {

  return through2.obj( (dataAndMeta, enc, done) => {

    const query = ( dataAndMeta.data.queryString || "" ).toLowerCase();
    const data = Object.keys( this.commands ).filter( cmd => cmd.toLowerCase().indexOf(query) > -1 && !this.commands[cmd].hidden ).sort();

    done( null, { data } );
  });

}

function openExternal ( ) {
  return through2.obj( (dataAndMeta, enc, done) => {
    open( dataAndMeta.data );
    done( null, dataAndMeta );
  });
}

export default function ( copal ) {
	// copal.bricks.addErrorBrick( logErrorToConsole );
	// copal.bricks.addErrorBrick( showErrorDialog );

	copal.bricks.addTransformBrick( "CoPal.getCommandInfos", getCommandInfos.bind( copal ) );
	copal.bricks.addTransformBrick( "CoPal.executeCommand", executeCommand.bind( copal ) );
	copal.bricks.addTransformBrick( "Common.open", openExternal );
}
