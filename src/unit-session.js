// import CurriedSignal from "./utils/curried-signal";
import _ from "lodash";
import {PassThrough} from "stream";
import UnitConfig from "./unit-config";
import ID from "./ID";

const RESERVED_STREAM_NAMES = [ "error" ];

// TODO: make EventEmitter
export default class UnitSession {

  constructor( core, name ) {

    this.id = ID( "unit-session" );
    this.originalConfig = core.getUnitConfig( name, true );

    this.bricks = core.bricks;

    this.config = UnitConfig.create( core, this.originalConfig );

    this.createStreams( );
  }

  getStreamStart( name ) {
    const stream = this._streams[name];

    if( !stream )
      throw new Error( `Stream '${name}' does not exist!` );

    return stream[0];
  }

  getStreamEnd( name ) {
    const stream = this._streams[name];

    if( !stream )
      throw new Error( `Stream '${name}' does not exist!` );

    return stream[ stream.length - 1 ];
  }

  setNameAndErrorHandler( stream, name ) {
    stream.streamName = name;
    stream.on("error", error => {
      this._streams["error"].push( error );
    });

    // stream.on("data", (data) => console.log(name, data));
    // stream.on("unpipe", (data) => console.log("UNPIPE", name, data));
    // stream.on("pipe", (data) => console.log("PIPE", name, data));
  }

  createStreams( ) {

    // setting up streams
    this._streams = Object.create( null );

    // connect to errors
    this._streams[ "error" ] = [new PassThrough( {objectMode: true} )];
    const errorStream = this._streams[ "error" ][0];
    _.forIn( this.bricks.getErrorBricks(), (errorBrick) => {
      const errStream = errorBrick.exec( { session: this } );

      // TODO: what if there is an error in the error brick??
      errorStream.pipe( errStream );
    });

    // first pass: create the streams (necessary for cross-references)
    _.forIn( this.config.streamsWithArgs, (streamConfig, streamName) => {
      if( RESERVED_STREAM_NAMES.indexOf( streamName ) !== -1 )
        throw new Error( `Stream name '${streamName}' is not allowed as the following stream names are reserved: ${RESERVED_STREAM_NAMES.join(",")}. ` );

      const stream = new PassThrough( {objectMode: true} );
      this.setNameAndErrorHandler( stream, streamName );

      this._streams[streamName] = [stream];
    } );

    // second pass
    _.forIn( this.config.streamsWithArgs, (streamConfig, streamName) => {
      var currStream = this._streams[streamName][0];

      streamConfig.forEach( ( brickConfig, index ) => {
        // check for pipe bricks
        if( brickConfig.isPipe) {
          currStream = this._handlePipeBrick( currStream, brickConfig, index, streamConfig, streamName );
        } else {
          currStream = this._handleTransformBrick( currStream, brickConfig, index, streamConfig, streamName );
        }

        this._streams[streamName].push( currStream );
      } );
    } );
  }

  _handlePipeBrick( currStream, brickConfig, index, streamConfig /*, streamName */ ) {
    if( index !== streamConfig.length - 1 )
      throw new Error( `Pipe-bricks like '${brickConfig.longID}' must be the last element of a brick sequence!` );

    const pipeStream = this._streams[ brickConfig.id ][0];

    if( !pipeStream )
      throw new Error( `Pipe-brick'${brickConfig.longID}' does not resolve to an existing stream!` );

    currStream.pipe( pipeStream );

    return pipeStream;
  }

  _handleTransformBrick( currStream, brickConfig /*, index, streamConfig, streamName */ ) {
    const brick = this.bricks.getBrick( brickConfig.id, true );
    if( !brick )
      throw new Error(`Brick '${brickConfig.longID}' does not exist!` );

    // TODO: handle errors and pipe them into the error stream
    const sessionData = { session: this };
    const brickStreams = brick.exec( sessionData, ...brickConfig.args );

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

  pushIntoStream( streamName, data ) {
    const stream = this.getStreamStart( streamName );

    try {
      stream.push( data );
    } catch( error ) {
      stream.emit( "error", error );
    }
  }

  // execute() {
  //
  //   const mainInputStream = this._streams[ "input" ];
  //   // mainInputStream.on("pipe", (data) => console.log("INPUT got piped"));
  //
  //   // inform inputs of this session
  //   _.forIn( this.bricks.getInputBricks(), input => input.exec( { session: this } ).pipe( mainInputStream ) );
  //
  //   const initialData = this.config.initialData;
  //
  //   if( initialData ) {
  //     this.pushIntoStream( "input", initialData );
  //   }
  // }

}
