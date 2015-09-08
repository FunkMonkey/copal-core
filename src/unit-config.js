import _ from "lodash";
import merge from "./utils/object-merge";
import jsonic from "jsonic";

export default {
  _mergeUnits( a, b, noMergeList ) {
    return merge( a, b, ( aValue, bValue, key, obj, src, parentPath, fullPath ) => {
      if( Array.isArray( bValue ) )
        return bValue;

      if( noMergeList && noMergeList.indexOf( fullPath ) !== -1 )
        return bValue;
    } );
  },

  _resolveExtendedUnit( core, simpleConfig ) {
    // TODO: optimize, avoid unnecessary cloning

    if( !simpleConfig.extends )
      return _.cloneDeep( simpleConfig );

    var base = null;

    // extending the given unit
    if( typeof simpleConfig.extends === "string" ) {
      base = this._resolveExtendedUnit( core, core.getUnitConfig( simpleConfig.extends, true ) );
      return this._mergeUnits( _.cloneDeep( base ), simpleConfig );
    }

    // extending the given unit, while not merging the members from the "noMerge"-list
    if( typeof simpleConfig.extends === "object" ) {
      base = this._resolveExtendedUnit( core, core.getUnitConfig( simpleConfig.extends.unit, true ) );
      return this._mergeUnits( _.cloneDeep( base ), simpleConfig, simpleConfig.extends.noMerge );
    }

    return simpleConfig;
  },


  _parseStreams( core, unitConfig ) {
    unitConfig.streamsWithArgs = _.mapValues( unitConfig.streams, ( brickSequence, streamName ) => {
      return brickSequence.map( brickString => this._parseBrickString( brickString, unitConfig.name, streamName ) );
    } );
  },

  _parseBrickString( brickString, baseName, streamName ) {

    const longID = `${baseName}:${streamName}:${brickString}`;

    const brickConfig = { longID, origString: brickString };

    // checking if we have a pipe brick; id currently still contains arguments
    if( brickString.indexOf( ">" ) === 0 ) {
      brickConfig.id = brickString.substr( 1 ).trim();
      brickConfig.isPipe = true;
    } else {
      brickConfig.id = brickString;
    }

    this._parseBrickArguments( brickConfig, baseName, streamName );

    return brickConfig;
  },

  _parseBrickArguments( brickConfig, baseName, streamName ) {

    // no parentheses, no arguments
    const openParenPos = brickConfig.id.indexOf( "(" );
    if( openParenPos !== -1 ) {

      if( brickConfig.isPipe )
        throw new Error( `Pipe-Bricks like '${baseName}:${streamName}:${brickConfig.origString}' cannot have arguments` );

      const closeParenPos = brickConfig.id.lastIndexOf( ")" );

      if( closeParenPos < 0 )
        throw new Error( `Brick '${baseName}:${streamName}:${brickConfig.origString}' misses a closing parentheses!` );

      brickConfig.args = jsonic( `[${brickConfig.id.substring( openParenPos + 1, closeParenPos )}]` );
      brickConfig.id = brickConfig.id.substring(0, openParenPos);
    } else {
      brickConfig.args = [];
    }
  },

  create( core, simpleConfig ) {

    // create extended unit
    var extendedConfig = this._resolveExtendedUnit( core, simpleConfig );

    this._parseStreams( core, extendedConfig );

    return extendedConfig;
  }


}
