// import CurriedSignal from "./utils/curried-signal";
import signals from "signals";


import _ from "lodash";
import merge from "./utils/object-merge";

export default class CommandSession {

  constructor(core, sessionID, commandConfig, bricks ) {

    this.sessionID = sessionID;
    this.commandConfig = commandConfig;
    this.bricks = bricks;

    this._signals = {};

    this.create( core );
  }

  getSignal( name ) {
    if( !this._signals[name] ) {
      // first argument of a signal will always be the command-session
      var signal = this._signals[name] = new signals.Signal( );
      return signal;
    } else
      return this._signals[name];
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

  create( core ) {
    this.commandConfig = this.resolveExtendedCommand( core, this.commandConfig );

    // get bricks by their ids
    var signalConfigs = _.mapValues( this.commandConfig.signals, (signalMap, signalName) => {
      return _.mapValues( signalMap, ( brickSequence ) => {
        return brickSequence.map( ( brickID, index ) => {

          // check for signal bricks
          if( brickID.indexOf( "::" ) === 0 ) {
            if( index !== brickSequence.length - 1 )
              throw new Error( `Signal bricks like '${brickID}' must be the last element of a brick sequence!` );

            var signalID = brickID.substr( 2 );
            // TODO: verify signal id

            return ( error, dataAndMeta ) => this.getSignal( signalID ).dispatch( error, dataAndMeta );
          }

          var brick = this.bricks.getDataBrick( brickID );
          if( !brick )
            throw new Error("Brick with ID '" + brickID + "' does not exist!" );

          return brick;
          } );
      } );
    } );

    // initialize error handlers
    this.bricks.getErrorBricks().forEach( brick => this.getSignal("error").add( brick ) );

    // setup input signal
    // var inputConfig = signalConfigs.input["standard-query-input"];
    this.getSignal( "input" ).add( ( error, dataAndMeta ) => {
        if( dataAndMeta ) {
          dataAndMeta.session = this;
          dataAndMeta.datatype = "standard-query-input"; // TODO: make independent from this datatype
        }

        var nextSignal = ( "post-input" in signalConfigs ) ? "post-input" : "output";
        this.getSignal( nextSignal ).dispatch( error, dataAndMeta );
      });

    // setup output signal
    this.getSignal( "output" ).add( (error, dataAndMeta) => {

      if( dataAndMeta )
        dataAndMeta.session = this;

      // TODO: don't rely on this datatype
      // TODO: don't depend on first output brick
      var outputBrick = this.bricks.getOutputBricks( "list-title-url-icon" )[0];
      this._executeBrickSequence( [outputBrick], error, dataAndMeta )
              .catch( this.onError.bind( this ) );
      });

    // setup other signals
    var otherSignals = _.pick( signalConfigs, ( signalMap, signalName ) => signalName !== "input" && signalName !== "output" );
    _.forIn( otherSignals, ( signalConfig, signalName ) => {
        this.getSignal( signalName ).add( ( error, dataAndMeta ) => {
          if( dataAndMeta.datatype ) {
            this._executeBrickSequence( signalConfig[dataAndMeta.datatype], error, dataAndMeta )
              .catch( this.onError.bind( this ) );
          }
          // TODO: what about signals without datatype?

        } );
      } );
  }


  _executeBrickSequence( sequence, error, dataAndMeta ) {
    var currPromise = ( error == null ) ? Promise.resolve( dataAndMeta.data ) : Promise.reject( error );

    sequence.forEach( brick => {
      currPromise = currPromise.then( 
        currResult => {
          dataAndMeta.data = currResult;
          return brick( null, dataAndMeta );
        },
        err => {
          return brick( err, dataAndMeta );
        });
    } );

    return currPromise;
  }


  onError( error ) {
    this.getSignal("error").dispatch( error, { session: this } );
  }

  execute() {
    // connecting inputs with this command-session
    var inputPromises = this.bricks.getInputBricks("standard-query-input").map( input => input( null, { session: this } ) );
    return Promise.all( inputPromises )
                  .then( () => {
                    // TODO: maybe just dispatch an init-signal (but if it is not there, dispatch input)
                    var dataAndMeta = {
                      data: this.commandConfig.initialData || {},
                      sender: "command-session",
                      session: this
                    }
                    this.getSignal("input").dispatch( null, dataAndMeta );
                  } )
                  .catch( this.onError.bind( this ) );
  }

}
