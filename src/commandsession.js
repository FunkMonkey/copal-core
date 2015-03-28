import * as ObjectUtils from "./utils/ObjectUtils";
import signals from "signals";

export default class CommandSession {
  constructor(sessionID, commandConfig, bricks ) {

    this.sessionID = sessionID;
    this.commandConfig = commandConfig;
    this.bricks = bricks;

    this._signals = {};

    this.create();
  }

  getSignal( name ) {
    if( !this._signals[name] )
      return this._signals[name] = new signals.Signal();
    else
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

    // TODO: don't rely on "standard-query-input"
    var inputConfig = signalConfigs.input["standard-query-input"];
    
    // clean outputConfig from non existing output datatype handlers
    var outputConfig = ObjectUtils.filter( signalConfigs.output, ( outputMap, datatype ) => this.bricks.getOutputBricks( datatype ) != null );
    ObjectUtils.forEach( outputConfig, ( outputBricks, datatype ) => {
      outputBricks.push( this.bricks.getOutputBricks( datatype )[0] ); // TODO: don't depend on first output brick
    } );

    // all other signals
    var otherSignals = ObjectUtils.filter( signalConfigs, ( signalMap, signalName ) => signalName !== "input" && signalName !== "output" );

    var execSequence = ( sequence, session, data ) => {
      return sequence.reduce( (curr, next) => {
        return curr.then( intermediateResult => {
          return next( session, intermediateResult );
        });
      }, Promise.resolve( data ) );
    };

    // input transformations
    this.getSignal( "input" ).add( (session, query) => {
        
        execSequence( inputConfig, this, query )
          .then( data => {
            this.getSignal("output").dispatch( this, data )
          } ).catch( this.onError );

      });

    // output transformations
    this.getSignal( "output" ).add( (session, data) => {

        ObjectUtils.forEach( outputConfig, sequence => {
          execSequence( sequence, this, data )
            .catch( this.onError );
        })

      });

    // create signal handlers for all other signals and call their bricks, when signal emitted
    ObjectUtils.forEach( otherSignals, ( signalConfig, signalName ) => {
        this.getSignal( signalName ).add( ( session, dataType, signalData ) => {
          execSequence( signalConfig[dataType], this, signalData)
            .catch( this.onError );
        } );
      } );
    
    

  }

  onError( error ) {
    console.log( error.stack );
  }

  execute() {
    // connecting inputs with this command-session
    this.bricks.getInputBricks("standard-query-input").forEach( input => input( this ) );
    this.getSignal("input").dispatch( this, this.commandConfig.query );
  }

}