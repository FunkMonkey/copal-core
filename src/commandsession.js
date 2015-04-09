import * as ObjectUtils from "./utils/ObjectUtils";
import CurriedSignal from "./utils/curried-signal";

export default class CommandSession {

  constructor(sessionID, commandConfig, bricks ) {

    this.sessionID = sessionID;
    this.commandConfig = commandConfig;
    this.initialData = commandConfig.initialData || {};
    this.bricks = bricks;

    this._signals = {};

    this.create();
  }

  getSignal( name ) {
    if( !this._signals[name] ) {
      // first argument of a signal will always be the command-session
      var signal = this._signals[name] = new CurriedSignal( this );
      return signal;
    } else
      return this._signals[name];
  }

  create() {

    // get bricks by their ids
    var signalConfigs = ObjectUtils.map( this.commandConfig.signals, (signalMap, signalName) => {
      return ObjectUtils.map( signalMap, ( brickSequence ) => {
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
    var outputConfig = ObjectUtils.filter( signalConfigs.output, ( outputMap, datatype ) => this.bricks.getOutputBricks( datatype ) != null );
    ObjectUtils.forEach( outputConfig, ( outputBricks, datatype ) => {
      outputBricks.push( this.bricks.getOutputBricks( datatype )[0] ); // TODO: don't depend on first output brick
    } );

    // all other signals
    var otherSignals = ObjectUtils.filter( signalConfigs, ( signalMap, signalName ) => signalName !== "input" && signalName !== "output" );

    // TODO: make execSequence more abstract, take callback
    var execSequence = ( sequence, session, data, ...restArgs ) => {
      return sequence.reduce( (curr, next) => {
        return curr.then( intermediateResult => {
          return next( session, intermediateResult, ...restArgs );
        });
      }, Promise.resolve( data ) );
    };

    // input transformations
    this.getSignal( "input" ).add( (session, inputData) => {

        execSequence( inputConfig, this, inputData )
          .then( data => {
            this.getSignal("output").dispatch( data );
          } ).catch( this.onError.bind( this ) );

      });

    // output transformations
    this.getSignal( "output" ).add( (session, data) => {

        ObjectUtils.forEach( outputConfig, (sequence, datatype) => {
          execSequence( sequence, this, data, datatype )
            .catch( this.onError.bind( this ) );
        });

      });

    // create signal handlers for all other signals and call their bricks, when signal emitted
    // TODO: inherited data-types?
    ObjectUtils.forEach( otherSignals, ( signalConfig, signalName ) => {
        this.getSignal( signalName ).add( ( session, dataType, signalData ) => {
          execSequence( signalConfig[dataType], this, signalData)
            .catch( this.onError.bind( this ) );
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
                    this.getSignal("input").dispatch( this.initialData || {} );
                  } )
                  .catch( this.onError.bind( this ) );
  }

}
