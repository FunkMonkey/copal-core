// import CurriedSignal from "./utils/curried-signal";
import _ from "lodash";
import {PassThrough} from "stream";
import CommandConfig from "./command-config";


const RESERVED_STREAM_NAMES = [ "output" ];

// TODO: make EventEmitter
export default class CommandSession {

  constructor(core, sessionID, origCommandConfig, bricks ) {

    this.sessionID = sessionID;
    this.originalCommandConfig = origCommandConfig;
    this.bricks = bricks;

    this.create( core );
  }

  getStream( name ) {
    const stream = this._streams[name];

    if( !stream )
      throw new Error( `Stream '${name}' does not exist!` );

    return stream;
  }

  setNameAndErrorHandler( stream, name ) {
    stream.streamName = name;
    stream.on("error", error => console.error(name, error, error.stack));
    // stream.on("data", (data) => console.log(name, data));
    // stream.on("unpipe", (data) => console.log("UNPIPE", name, data));
    // stream.on("pipe", (data) => console.log("PIPE", name, data));
  }

  create( core ) {
    // this.commandConfig = this.resolveExtendedCommand( core, this.commandConfig );
    this.commandConfig = CommandConfig.create( core, this.originalCommandConfig );

    // setting up streams
    this._streams = Object.create( null );

    const outputStream = this._streams[ "output" ] = new PassThrough( {objectMode: true} );
    this.setNameAndErrorHandler( outputStream, "output" );

    // first pass: create the streams (necessary for cross-references)
    _.forIn( this.commandConfig.streamsWithArgs, (streamConfig, streamName) => {
      if( RESERVED_STREAM_NAMES.indexOf( streamName ) !== -1 )
        throw new Error( `Stream name '${streamName}' is not allowed as the following stream names are reserved: ${RESERVED_STREAM_NAMES.join(",")}. ` );

      const stream = new PassThrough( {objectMode: true} );
      this.setNameAndErrorHandler( stream, streamName );

      this._streams[streamName] = stream;
    } );

    // second pass
    _.forIn( this.commandConfig.streamsWithArgs, (streamConfig, streamName) => {
      var currStream = this._streams[streamName];

      streamConfig.forEach( ( brickConfig, index ) => {
        // check for pipe bricks
        if( brickConfig.isPipe) {
          currStream = this._handlePipeBrick( currStream, brickConfig, index, streamConfig, streamName );
        } else {
          currStream = this._handleTransformBrick( currStream, brickConfig, index, streamConfig, streamName );
        }
      } );
    } );

    // connect to outputs
    _.forIn( this.bricks.outputBricks, (outBrick, outName) => {
      var lastOutput = outBrick( { session: this } );
      this.setNameAndErrorHandler( lastOutput, outName );

      outputStream.pipe( lastOutput );
    });
  }

  _handlePipeBrick( currStream, brickConfig, index, streamConfig /*, streamName */ ) {
    if( index !== streamConfig.length - 1 )
      throw new Error( `Pipe-bricks like '${brickConfig.longID}' must be the last element of a brick sequence!` );

    const pipeStream = this._streams[ brickConfig.id ];

    if( !pipeStream )
      throw new Error( `Pipe-brick'${brickConfig.longID}' does not resolve to an existing stream!` );

    currStream.pipe( pipeStream );

    return pipeStream;
  }

  _handleTransformBrick( currStream, brickConfig /*, index, streamConfig, streamName */ ) {
    const brick = this.bricks.getTransformBrick( brickConfig.id );
    if( !brick )
      throw new Error(`Brick '${brickConfig.longID}' does not exist!` );

    // TODO: handle errors and pipe them into the error stream
    const sessionData = { session: this };
    const brickStreams = brick( sessionData, ...brickConfig.args );

    // do we get back a single stream or a sequence of streams?
    if( Array.isArray( brickStreams ) ) {
      if( brickStreams.length < 2 )
        throw new Error("Stream-Sequence needs at least two streams"); // TODO: better message

      // pipe into the start of the sequence, use the last stream for later piping
      const firstBrickStream = brickStreams[0];
      this.setNameAndErrorHandler( firstBrickStream, brickConfig.id + "[first]" );
      const lastBrickStream = brickStreams[ brickStreams.length - 1 ];
      this.setNameAndErrorHandler( lastBrickStream, brickConfig.id + "[last]" );

      currStream.pipe( firstBrickStream );
      return lastBrickStream;

    } else {
      this.setNameAndErrorHandler( brickStreams, brickConfig.id );
      currStream.pipe( brickStreams );
      return brickStreams;
    }
  }

  destroy() {

  }

  execute() {

    const mainInputStream = this._streams[ "input" ];
    // mainInputStream.on("pipe", (data) => console.log("INPUT got piped"));

    // inform inputs of this session
    _.forIn( this.bricks.inputBricks, input => input( { session: this } ).pipe( mainInputStream ) );

    const initialData = this.commandConfig.initialData;

    if( initialData ) {
      mainInputStream.push( initialData );
    }
  }

}
