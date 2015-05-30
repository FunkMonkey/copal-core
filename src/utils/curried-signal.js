// import signals from "signals";

// export default class CurriedSignal extends signals.Signal {
  
//   constructor( ...argsToCurry ) {

//     // cannot use super() due to a bug in signals
//     signals.Signal.call( this );

//     var origDispatch = this.dispatch.bind( this );
//     this.dispatch = function( ...args ) {
//       origDispatch( ...argsToCurry, ...args );
//     }
//   }
// }