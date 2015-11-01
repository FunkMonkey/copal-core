import Rx from "rx";

export default ( source ) => {

  function subscribe ( observer ) {

    var buffer = [];
    var isFlowing = false;
    var error = null;
    var completed = false;

    this.flushBuffer = () => {
      buffer.forEach( val => observer.onNext( val ) );
      error && observer.onError( error );
      completed && observer.onCompleted();
      isFlowing = true;
    };

    const onNext = ( value ) => ( isFlowing ) ? observer.onNext( value )
                                              : buffer.push( value );

    // TODO: handle multiple errors (put into buffer for right sequence)
    const onError = ( err ) => ( isFlowing ) ? observer.onError( err )
                                             : error = err;

    // TODO: dunno if complete should be forwarded (at least for end gates)
    const onCompleted = () => ( isFlowing ) ? observer.onCompleted( ) : completed = true;

    return source.subscribe( onNext, onError, onCompleted );
  }

  const observable = new Rx.AnonymousObservable( subscribe, source );

  // needed, in case no one subscribed to the Observable
  observable.flushBuffer = () => {};

  return observable;

};
