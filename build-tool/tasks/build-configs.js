var gulp = require( "gulp" );

var onError = require( "../utils" ).onError;

// var sourcemaps = require( "gulp-sourcemaps" );

var SRC_GLOB =  "./src/**/*.json";

gulp.task( "build:configs", function() {
  return gulp.src( SRC_GLOB )
             .pipe( gulp.dest( "build" ) );
});

gulp.tasks[ "build:configs" ].SRC_GLOB = SRC_GLOB;
