
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


export default class CoPal {

  constructor() {
    this.commands = {};
    this.bricks = new Bricks();
  }

  addCommand( name, commandConfig ) {
    this.commands[ name ] = commandConfig;
  }

  executeCommand( name, options ) {
    var command = this.commands[ name ];

    var commandSession = new CommandSession( 1, command, this.bricks );
    commandSession.execute();

    // var commandSession = { id: 1 };

    // var onAction = ( actionName, actionData ) => {
    //   console.log( actionData );
    //   command.actions[actionName].reduce( (currResult, nextBlock) => {
    //     return this.executeBuildingBlock( nextBlock, commandSession, currResult );
    //   }, actionData );
    // };

    // var onInput = queryData => {
    //   commandSession.query = queryData;
    //   commandSession.data = this.executeBuildingBlock( command.dataSource[0], commandSession, queryData );

    //   // views
    //   Object.keys( command.views ).forEach( viewName => {
    //     var viewAdapterResult = this.executeBuildingBlock(command.views[viewName][0], commandSession, commandSession.data );

    //     this.executeBuildingBlock( viewName, commandSession, viewAdapterResult, onAction);
    //   });
    // };

    // command.queryInputs.forEach( input => this.executeBuildingBlock(input, commandSession, onInput ) );

    // onInput("First");
  }

  init() {
    // testing
    ExamplePlugin.init( this );
    Launcher.init( this );
  }
}
