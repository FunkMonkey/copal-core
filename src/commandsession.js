// import CurriedSignal from "./utils/curried-signal";
import {PassThrough} from "stream";

const RESERVED_STREAM_NAMES = [ "output" ];

import _ from "lodash";
import merge from "./utils/object-merge";

// TODO: make EventEmitter
export default class CommandSession {

  constructor(core, sessionID, commandConfig, bricks ) {

    this.sessionID = sessionID;
    this.commandConfig = commandConfig;
    this.bricks = bricks;

    this.create( core );
  }

  getStream( name ) {
    const stream = this._streams[name];

    if( !stream )
      throw new Error( `Stream '${name}' does not exist!` );

    return stream;
  }

  _mergeCommands( a, b, noMergeList ) {
    return merge( a, b, ( aValue, bValue, key, obj, src, parentPath, fullPath ) => {
      if( Array.isArray( bValue ) )
        return bValue;

      if( noMergeList && noMergeList.indexOf( fullPath ) !== -1 )
        return bValue;
    } );
  }

  resolveExtendedCommand( core, commandConfig ) {
    if( !commandConfig.extends )
      return commandConfig;

    var base = null;

    if( typeof commandConfig.extends === "string" ) {
      base = this.resolveExtendedCommand( core, core.getCommand( commandConfig.extends ) );
      return this._mergeCommands( _.cloneDeep( base ), commandConfig );
    }

    if( typeof commandConfig.extends === "object" ) {
      base = this.resolveExtendedCommand( core, core.getCommand( commandConfig.extends.command ) );
      return this._mergeCommands( _.cloneDeep( base ), commandConfig, commandConfig.extends.noMerge );
    }
    return commandConfig;
  }

  setNameAndErrorHandler( stream, name ) {
    stream.streamName = name;
    stream.on("error", error => console.error(name, error, error.stack));
    // stream.on("data", (data) => console.log(name, data));
    // stream.on("unpipe", (data) => console.log("UNPIPE", name, data));
    // stream.on("pipe", (data) => console.log("PIPE", name, data));
  }

  create( core ) {
    this.commandConfig = this.resolveExtendedCommand( core, this.commandConfig );

    // setting up streams
    this._streams = Object.create( null );

    const outputStream = this._streams[ "output" ] = new PassThrough( {objectMode: true} );
    this.setNameAndErrorHandler( outputStream, "output" );

    // first pass: create the streams (necessary for cross-references)
    _.mapValues( this.commandConfig.streams, (streamConfig, streamName) => {
      if( RESERVED_STREAM_NAMES.indexOf( streamName ) !== -1 )
        throw new Error( `Stream name '${streamName}' is not allowed as the following stream names are reserved: ${RESERVED_STREAM_NAMES.join(",")}. ` );

      const stream = new PassThrough( {objectMode: true} );
      this.setNameAndErrorHandler( stream, streamName );

      this._streams[streamName] = stream;
    } );

    // second pass
    _.mapValues( this.commandConfig.streams, (streamConfig, streamName) => {
      var currStream = this._streams[streamName];

      // var prevStream = streamName;

      streamConfig.forEach( ( brickID, index ) => {
        // console.log(`connecting ${prevStream} > ${brickID}`);
        // prevStream = brickID;

        // check for pipe bricks
        if( brickID.indexOf( ">" ) === 0 ) {
          if( index !== streamConfig.length - 1 )
            throw new Error( `Pipe bricks like '${brickID}' must be the last element of a brick sequence!` );

          const streamID = brickID.substr( 1 ).trim();

          const pipeStream = this._streams[ streamID ];

          if( !pipeStream )
            throw new Error( `Pipe bricks '${brickID}' does not resolve to an existing stream!` );

          currStream.pipe( pipeStream );
          currStream = pipeStream;
        } else {
          const brick = this.bricks.getTransformBrick( brickID );
          if( !brick )
            throw new Error(`Brick '${brickID}' does not exist!` );

          // TODO: handle errors and pipe them into the error stream
          const brickStreams = brick( this ); // TODO pass parsed brick parameters

          // do we get back a single stream or a sequence of streams?
          if( Array.isArray( brickStreams ) ) {
            if( brickStreams.length < 2 )
              throw new Error("Stream-Sequence needs at least two streams"); // TODO: better message

            // pipe into the start of the sequence, use the last stream for later piping
            const firstBrickStream = brickStreams[0];
            this.setNameAndErrorHandler( firstBrickStream, brickID + "[first]" );
            const lastBrickStream = brickStreams[ brickStreams.length - 1 ];
            this.setNameAndErrorHandler( lastBrickStream, brickID + "[last]" );

            currStream.pipe( firstBrickStream );
            currStream = lastBrickStream;

          } else {
            this.setNameAndErrorHandler( brickStreams, brickID );
            currStream.pipe( brickStreams );
            currStream = brickStreams;
          }
        }
      } );
    } );

    // connect to outputs
    _.mapValues( this.bricks.outputBricks, (outBrick, outName) => {
      var lastOutput = outBrick( this );
      this.setNameAndErrorHandler( lastOutput, outName );

      outputStream.pipe( lastOutput );
    });
  }

  destroy() {

  }

  execute() {

    var mainInputStream = this._streams[ "input" ];
    // mainInputStream.on("pipe", (data) => console.log("INPUT got piped"));

    // inform inputs of this session
    _.mapValues( this.bricks.inputBricks, input => input( this ).pipe( mainInputStream ) );

    // push our first data: TODO only do if initialData exists
    var dataAndMeta = {
      data: this.commandConfig.initialData || {},
      sender: "command-session"
    }

    mainInputStream.push( dataAndMeta );
  }

}
