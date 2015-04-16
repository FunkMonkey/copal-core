import CurriedSignal from "./utils/curried-signal";

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
      var signal = this._signals[name] = new CurriedSignal( this );
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
        return brickSequence.map( brickID => {
          var brick = this.bricks.getDataBrick( brickID );
          if( !brick )
            throw new Error("Brick with ID '" + brickID + "' does not exist!" );

          return brick;
          } );
      } );
    } );

    // initialize error handlers
    this.bricks.getErrorBricks().forEach( brick => this.getSignal("error").add( brick ) );

    // TODO: don't rely on "standard-query-input"
    var inputConfig = signalConfigs.input["standard-query-input"];

    // clean outputConfig from non existing output datatype handlers
    var outputConfig = _.pick( signalConfigs.output, ( outputMap, datatype ) => this.bricks.getOutputBricks( datatype ) != null );
    _.forIn( outputConfig, ( outputBricks, datatype ) => {
      outputBricks.push( this.bricks.getOutputBricks( datatype )[0] ); // TODO: don't depend on first output brick
    } );

    // all other signals
    var otherSignals = _.pick( signalConfigs, ( signalMap, signalName ) => signalName !== "input" && signalName !== "output" );

    // TODO: make execSequence more abstract, take callback
    var execSequence = ( sequence, session, data, ...restArgs ) => {
      return sequence.reduce( (curr, next) => {
        return curr.then( intermediateResult => {
          return next( session, intermediateResult, ...restArgs );
        });
      }, Promise.resolve( data ) );
    };

    // input transformations
    this.getSignal( "input" ).add( (session, inputData, metaData) => {

        execSequence( inputConfig, this, inputData, metaData )
          .then( data => {
            this.getSignal("output").dispatch( data );
          } ).catch( this.onError.bind( this ) );

      });

    // output transformations
    this.getSignal( "output" ).add( (session, data) => {

        _.forIn( outputConfig, (sequence, datatype) => {
          var metaData = { datatype: datatype };
          execSequence( sequence, this, data, metaData )
            .catch( this.onError.bind( this ) );
        });

      });

    // create signal handlers for all other signals and call their bricks, when signal emitted
    // TODO: inherited data-types?
    _.forIn( otherSignals, ( signalConfig, signalName ) => {
        this.getSignal( signalName ).add( ( session, data, metaData ) => {

          if( metaData && metaData.datatype ) {
            execSequence( signalConfig[metaData.datatype], this, data, metaData)
              .catch( this.onError.bind( this ) );
          }
          // TODO: what about signals without datatype?

        } );
      } );
  }

  onError( error ) {
    this.getSignal("error").dispatch( error );
  }

  execute() {
    // connecting inputs with this command-session
    var inputPromises = this.bricks.getInputBricks("standard-query-input").map( input => input( this ) );
    return Promise.all( inputPromises )
                  .then( () => {
                    // TODO: maybe just dispatch an init-signal (but if it is not there, dispatch input)
                    this.getSignal("input").dispatch( this.commandConfig.initialData || {}, { sender: "command-session" } );
                  } )
                  .catch( this.onError.bind( this ) );
  }

}
