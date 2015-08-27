import _ from "lodash";
import merge from "./utils/object-merge";
import jsonic from "jsonic";

export default {
  _mergeCommands( a, b, noMergeList ) {
    return merge( a, b, ( aValue, bValue, key, obj, src, parentPath, fullPath ) => {
      if( Array.isArray( bValue ) )
        return bValue;

      if( noMergeList && noMergeList.indexOf( fullPath ) !== -1 )
        return bValue;
    } );
  },

  _resolveExtendedCommand( core, simpleCmdConfig ) {
    // TODO: optimize, avoid unnecessary cloning

    if( !simpleCmdConfig.extends )
      return _.cloneDeep( simpleCmdConfig );

    var base = null;

    // extending the given command
    if( typeof simpleCmdConfig.extends === "string" ) {
      base = this._resolveExtendedCommand( core, core.getCommand( simpleCmdConfig.extends ) );
      return this._mergeCommands( _.cloneDeep( base ), simpleCmdConfig );
    }

    // extending the given command, while not merging the members from the "noMerge"-list
    if( typeof simpleCmdConfig.extends === "object" ) {
      base = this._resolveExtendedCommand( core, core.getCommand( simpleCmdConfig.extends.command ) );
      return this._mergeCommands( _.cloneDeep( base ), simpleCmdConfig, simpleCmdConfig.extends.noMerge );
    }

    return simpleCmdConfig;
  },


  _parseStreams( core, cmdConfig ) {
    cmdConfig.streamsWithArgs = _.mapValues( cmdConfig.streams, ( brickSequence, streamName ) => {
      return brickSequence.map( brickString => this._parseBrickString( brickString, cmdConfig.name, streamName ) );
    } );
  },

  _parseBrickString( brickString, cmdName, streamName ) {

    const longID = `${cmdName}:${streamName}:${brickString}`;

    const brickConfig = { longID, origString: brickString };

    // checking if we have a pipe brick; id currently still contains arguments
    if( brickString.indexOf( ">" ) === 0 ) {
      brickConfig.id = brickString.substr( 1 ).trim();
      brickConfig.isPipe = true;
    } else {
      brickConfig.id = brickString;
    }

    this._parseBrickArguments( brickConfig, cmdName, streamName );

    return brickConfig;
  },

  _parseBrickArguments( brickConfig, cmdName, streamName ) {

    // no parentheses, no arguments
    const openParenPos = brickConfig.id.indexOf( "(" );
    if( openParenPos !== -1 ) {

      if( brickConfig.isPipe )
        throw new Error( `Pipe-Bricks like '${cmdName}:${streamName}:${brickConfig.origString}' cannot have arguments` );

      const closeParenPos = brickConfig.id.lastIndexOf( ")" );

      if( closeParenPos < 0 )
        throw new Error( `Brick '${cmdName}:${streamName}:${brickConfig.origString}' misses a closing parentheses!` );

      brickConfig.args = jsonic( `[${brickConfig.id.substring( openParenPos + 1, closeParenPos )}]` );
      brickConfig.id = brickConfig.id.substring(0, openParenPos);
    } else {
      brickConfig.args = [];
    }
  },

  create( core, simpleCmdConfig ) {

    // create extended command
    var exCmdConfig = this._resolveExtendedCommand( core, simpleCmdConfig );

    this._parseStreams( core, exCmdConfig );

    return exCmdConfig;
  }


}
