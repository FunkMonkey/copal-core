
// =====================================================

/**
 * Data-driven commands!
 *
 * - Start Working Session
 *  - Initialize Launcher
 *  - Listen for Command-Start-Event
 *   - Start Command Session
 *     - set queryData to command.defaultQueryData
 *     - initialize queryInputs
 *     - execute dataSource
 *     - execute view decorators and views
 *      - Show Launcher (if not already visible)
 *      - update list
 *     - wait for actions or input
 *
 * TODO: pre-show-events
 */



// TODO: CommandConfig to InternalCommand
// class InternalCommand {
// }

import CommandSession from "./commandsession";
import ExamplePlugin from "./example/example-plugin";
import Bricks from "./bricks";
import Launcher from "copal-launcher";

import dialog from "dialog";


export default class CoPal {

  constructor() {
    this.commands = {};
    this.bricks = new Bricks();
    this.bricks.addErrorBrick( this.logErrorToConsole.bind(this) );
    this.bricks.addErrorBrick( this.showErrorDialog.bind(this) );
  }

  addCommand( name, commandConfig ) {
    this.commands[ name ] = commandConfig;
  }

  executeCommand( name, options ) {
    var command = this.commands[ name ];

    var commandSession = new CommandSession( 1, command, this.bricks );
    commandSession.execute();
  }

  getErrorData( commandSession, error ) {
    if( error.stack )
      return {
        title: error.name + ": " + error.message,
        stack: error.stack
      }
    else
      return {
        title: error,
        stack: ""
      }
  }

  logErrorToConsole( commandSession, error ) {
    var errorData = this.getErrorData( commandSession, error );
    console.log( errorData.title + "\n" + errorData.stack );
  }

  showErrorDialog( commandSession, error ) {
    var errorData = this.getErrorData( commandSession, error );

    dialog.showErrorBox( errorData.title, errorData.title + "\n\n" + errorData.stack );
  }

  init() {
    // testing
    ExamplePlugin.init( this );
    Launcher.init( this );
  }
}
