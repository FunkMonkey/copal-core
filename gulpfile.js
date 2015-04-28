var gulp = require( "gulp" );
var babel = require( "gulp-babel" );
var gutil = require( "gulp-util" );
var sourcemaps = require( "gulp-sourcemaps" );

function onError ( err ) {
  var displayErr = gutil.colors.red( err );
  gutil.log( displayErr );
  gutil.beep();
  this.emit( "end" );
}

function logWatchEvent( event ) {
  console.log( "File " + event.path + " was " + event.type + ", running tasks..." );
}

var GLOB_SCRIPTS =  "./src/**/*.js";

gulp.task( "build:scripts", function() {
  return gulp.src( GLOB_SCRIPTS )
             .pipe( sourcemaps.init() )
             .pipe( babel() )
             .on( "error", onError )
             .pipe( sourcemaps.write( "." ) )
             .pipe( gulp.dest( "build" ) );
});

gulp.task( "build", ["build:scripts"] );

gulp.task( "watch:build", function ( ) {
  gulp.watch( GLOB_SCRIPTS, ["build:scripts"] )
      .on( "change", logWatchEvent );
});
