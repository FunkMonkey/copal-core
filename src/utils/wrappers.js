import through2 from "through2";

export default {

  wrapInStreamSync( funcToWrap ) {

    return function ( session ) {
      return through2.obj( (dataAndMeta, enc, done) => {

        var result = funcToWrap.call( this, session, dataAndMeta );

        done( null, result );
      });
    };
  },

  wrapInStreamAsync( funcToWrap ) {

    return function ( session ) {
      return through2.obj( (dataAndMeta, enc, done) => {
        funcToWrap.call( this, session, dataAndMeta, done );
      });
    };
  },

  wrapInStreamPromise( funcToWrap ) {
    return function ( session ) {
      return through2.obj( (dataAndMeta, enc, done) => {
        funcToWrap.call( this, session, dataAndMeta )
          .then( result => done( null, result), error => done( error ) );
      });
    };
  }

};
