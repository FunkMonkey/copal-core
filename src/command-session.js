import ID from "./ID";
import Rx from "rx";
import R from "ramda";
import CommandConfig from "./command-config";
import bufferUntil from "./utils/buffer-until";

// TODO: move to utils/fp.js
const isNotNull = x => x !== null;
const mapIndexed = R.addIndex( R.map );

// TODO: move to utils/debugging.js
const debug = ( val ) => {
  console.log( val );
  return val;
}

// TODO: move to command-config.js
const extractCommandNameFromLongStreamName = ( longStreamName ) => {
  const split = longStreamName.split("::");
  return ( split.length === 1 ) ? null : split[0];
};

// TODO: move to command-config.js
const commandAndStreamNameToPair = ( longStreamName ) => {
  const split = longStreamName.split("::");
  return ( split.length === 1 ) ? ["", split[0]] : split;
}

// TODO: move to utils/fp.js
const throwIfUndefined = R.curry( ( err, value ) => {
  if( value !== undefined )
    return value;

  if( typeof err === "string" )
    throw new Error( err );
  else
    throw err;
} );


// ================================================================
// CommandSession: Creation
// ================================================================

const createSession = ( parent, core, origConfig ) => {
  return {
    id: ID( "command-session" ),
    parent,
    core,
    originalConfig: origConfig,
    config: null,
    _childCommandSessions: null,
    _streams: null
  };
}

// ================================================================
// CommandSession: Initialization
// ================================================================

const initializeSession = ( session ) => {
  session.config = CommandConfig.create( session.core, session.originalConfig );
  session._childCommandSessions = createChildCommandSessions( session );
  session._streams = createStreams( session );
  connectStreams( session );
};

const createChildCommandSessions = ( session ) => {

  const isNotMe = name => name !== session.config.name;

  const createFromStreamMap = R.pipe( // TODO: extract, make independet of session, make ignore list
    R.toPairs,
    R.flatten,
    R.map( getStreamOverride( session ) ), // TODO pass in override map directly
    getCommandNamesFromStreamList,
    R.filter( isNotMe ),
    R.map( createCommandSessionFromName( session ) ), // TODO pass in library directly
    R.fromPairs );

  return createFromStreamMap( session.config["stream-connections"] );
}

const getCommandNamesFromStreamList = R.pipe(
  R.map( extractCommandNameFromLongStreamName ),
  R.uniq,
  R.filter( isNotNull ) );

const createCommandSessionFromName = R.curry( ( parent, commandName ) => {
  const config = getCommandConfig( parent, commandName );
  const cmdSession = createSession( parent, parent.core, config );
  initializeSession( cmdSession );
  return [ commandName, cmdSession ];
} );

// ================================================================
// CommandSession: Creation of streams
// ================================================================

const createStreams = ( session ) => {
  // TODO: error stream
  // TODO: filter reserved stream names

  const createBrickForSession = createStreamBrick( session );

  const createStreamBricks = ( streamBeginning, streamName, brickConfigs ) => {
    // create all the streams and connect them in sequence
    return R.mapAccum( createBrickForSession( streamName ),
                       streamBeginning )( brickConfigs )[1];
  }

  const createStream = ( configPair ) => {
    const beginning = createStreamStartGate( session.config.name, configPair[0] );
    const bricks = createStreamBricks( beginning, ...configPair );
    const end = createStreamEndGate( R.last( bricks ) || beginning, session.config.name, configPair[0] );
    return [ configPair[0],
             R.flatten( [beginning, bricks, end] )];
  }

  return R.pipe( R.toPairs,
                 R.map( createStream ),
                 R.fromPairs )( session.config.streamsWithArgs );
}

const createStreamStartGate = ( cmdName, name ) => {
  const gate = new Rx.Subject();
  setStreamDebugInfo( gate, cmdName, name, "start-gate" );
  return gate;
};

const createStreamEndGate = ( prevStream, cmdName, name ) => {
  // const gate = bufferUntil( prevStream );
  const gate = bufferUntil( prevStream ).publish();
  setStreamDebugInfo( gate, cmdName, name, "end-gate" );
  return gate;
};

// const createStreamGate = ( cmdName, name, isStart ) => {
//   const stream = new Rx.Subject().publish();
//   // if( name === "log" )
//   // stream.subscribe( (data) => console.log( "GATE", name, data ) );
//   setStreamDebugInfo( stream, cmdName, name, isStart ? "start-gate" : "end-gate" );
//   stream._oldConnect = stream.connect;
//   stream.connect = function() {
//     console.log( "Hot " + getStreamDebugFullName( this ) );
//     this._oldConnect( ...arguments );
//   }
//   stream.subscribe( data => console.log(data) );
//   return stream;
// };

const createStreamBrick = R.curry( ( session, streamName, prevBrickStream, brickConfig ) => {
  const brick = getBrickFromConfig( session, brickConfig );

  // TODO: handle errors and pipe them into the error stream
  const sessionData = { session, streamName };
  // console.log("Creating Stream", brickConfig.longID );

  const brickStream = brick.exec( prevBrickStream, sessionData, ...brickConfig.args );
  setStreamDebugInfo( brickStream, session.config.name, streamName, brickConfig.id );

  return [ brickStream, brickStream ];
});

// ================================================================
// CommandSession: Connection of streams
// ================================================================

const connectStreams = ( session ) => {

  const mapCommandNameToSession = mapIndexed( ( val, i ) => i === 0 ? getChildCommandOrSelf( session, val ) : val );

  const connectStreamPair = ( pair ) => {
    pair = R.map( R.pipe( getStreamOverride( session ),
                          commandAndStreamNameToPair,
                          mapCommandNameToSession ) ) ( pair );

    const srcStream = getStreamEnd( pair[0][0], pair[0][1] );
    const destStream = getStreamStart( pair[1][0], pair[1][1] );

    console.log( `Connecting ${getStreamDebugFullName(srcStream)} to ${getStreamDebugFullName(destStream)}` );
    srcStream.subscribe( destStream );
  }

  return R.pipe( R.toPairs,
                 R.forEach( connectStreamPair ) )( session.config["stream-connections"] );
}

// ================================================================
// CommandSession: Starting
// ================================================================

// const openGate = ( gate ) => gate.connect();
//
// const openStartGates = ( session ) => {
//   R.pipe( R.values, R.forEach( R.pipe( R.head, openGate ) ) ) ( session._streams );
//   R.pipe( R.values, R.forEach( openStartGates ) )( session._childCommandSessions );
// }

const openGate = ( gate ) => {
  gate.connect();
}

const flushGate = ( gate ) => {
  gate.source.flushBuffer();
}

// const suckGate = ( gate ) => {
//   gate.subscribe( ( data ) => console.log("EMTPY", data), ( data ) => console.log("ERROR", data), ( data ) => console.log("COMPLETED") );
// }

const openEndGates = ( session ) => {
  R.pipe( R.values, R.forEach( R.pipe( R.last, openGate ) ) ) ( session._streams );
  R.pipe( R.values, R.forEach( openEndGates ) )( session._childCommandSessions );
}

const flushEndGates = ( session ) => {
  R.pipe( R.values, R.forEach( R.pipe( R.last, flushGate ) ) ) ( session._streams );
  R.pipe( R.values, R.forEach( flushEndGates ) )( session._childCommandSessions );
}

// const suckEndGates = ( session ) => {
//   R.pipe( R.values, R.forEach( R.pipe( R.last, suckGate ) ) ) ( session._streams );
//   R.pipe( R.values, R.forEach( suckEndGates ) )( session._childCommandSessions );
// }

const start = ( session ) => {
  // openStartGates( session );
  openEndGates( session );
  flushEndGates( session );
  // suckEndGates( session );
}

// ================================================================
// CommandSession: Utility functions
// ================================================================

// TODO: replace with library
const getBrickFromConfig = ( session, brickConfig ) => {
  const brick = session.core.bricks.getBrick( brickConfig.id, true );
  if( !brick )
    throw new Error(`Brick '${brickConfig.longID}' does not exist!` );

  return brick;
}

// TODO: replace with library
const getCommandConfig = ( session, commandName ) => {
  return session.core.getCommandConfig( commandName );
}

const getStream = ( session, name ) => R.prop( name, session._streams );
const getStreamOrThrow = (session, name) => R.pipe( getStream, throwIfUndefined( `Stream '${name}' does not exist!` ) )( session, name );

const getStreamStart = R.pipe( getStreamOrThrow, R.head );
const getStreamEnd = R.pipe( getStreamOrThrow, R.last );

const setStreamDebugInfo = ( stream, commandName, streamName, brickName ) => {
  stream._debugInfo = {
    commandName,
    streamName,
    brickName
  };
}

const getStreamDebugFullName = ( stream ) => {
  const info = stream._debugInfo;
  return `${info.commandName}::${info.streamName}::${info.brickName}`;
}

const getStreamOverride = R.curry( ( session, cmdAndStreamName ) => {
  return cmdAndStreamName;
});

const getChildCommandOrSelf = R.curry( ( session, cmdName ) => {
  return ( cmdName ) ? session._childCommandSessions[ cmdName ] : session ;
} );

// ================================================================
// CommandSession: API
// ================================================================

export default {
  create: createSession,
  initialize: initializeSession,
  start: start,
  getStreamStart: getStreamStart,
  getStreamEnd: getStreamEnd,
  getStreamDebugFullName
};
