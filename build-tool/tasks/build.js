var gulp = require("gulp");
var utils = require( "../utils.js" );

require( "./build-configs" );
require( "./build-scripts" );

gulp.task( "build", ["build:configs", "build:scripts"] );

gulp.task("build-and-watch", ["build", "watch:build"]);

gulp.task("watch:build", function ( ) {
	utils.watchTask( "build:configs" );
  utils.watchTask( "build:scripts" );
});
