import through2 from "through2";

export default {

  wrapInStreamSync( funcToWrap ) {

    return function ( sessionData, ...restArgs ) {
      return through2.obj( (data, enc, done) => {

        var result = funcToWrap.call( this, sessionData, data, ...restArgs );

        done( null, result );
      });
    };
  },

  wrapInStreamAsync( funcToWrap ) {

    return function ( sessionData, ...restArgs ) {
      return through2.obj( (data, enc, done) => {
        funcToWrap.call( this, sessionData, data, done, ...restArgs );
      });
    };
  },

  wrapInStreamPromise( funcToWrap ) {
    return function ( sessionData, ...restArgs ) {
      return through2.obj( (data, enc, done) => {
        funcToWrap.call( this, sessionData, data, ...restArgs )
          .then( result => done( null, result), error => done( error ) );
      });
    };
  }

};
