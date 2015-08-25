import through2 from "through2";

export default {

  wrapInStreamSync( funcToWrap ) {

    return function ( session, ...restArgs ) {
      return through2.obj( (dataAndMeta, enc, done) => {

        var result = funcToWrap.call( this, session, dataAndMeta, ...restArgs );

        done( null, result );
      });
    };
  },

  wrapInStreamAsync( funcToWrap ) {

    return function ( session, ...restArgs ) {
      return through2.obj( (dataAndMeta, enc, done) => {
        funcToWrap.call( this, session, dataAndMeta, done, ...restArgs );
      });
    };
  },

  wrapInStreamPromise( funcToWrap ) {
    return function ( session, ...restArgs ) {
      return through2.obj( (dataAndMeta, enc, done) => {
        funcToWrap.call( this, session, dataAndMeta, ...restArgs )
          .then( result => done( null, result), error => done( error ) );
      });
    };
  }

};
