var hookUtils = require("copal-git-hook-utils");

// Only on these branches
var CHECKED_BRANCHES = ["master", "dev", "development", "devel"];
hookUtils.branches.exitIfCurrentBranchIsNot( CHECKED_BRANCHES, 0 );

// Bump, if necessary
var lastCommits = hookUtils.commits.getCommitSubjectsSince( hookUtils.version.getLastVersionTag() );

if( lastCommits.length === 0 || hookUtils.commitMessage.hasType( lastCommits[0], "VERSION" ) )
  process.exit( 0 );

var biggest = hookUtils.version.getBiggestVersionType( lastCommits );
if( biggest !== "version" ) {
  var newVersion = hookUtils.version.bumpVersion( biggest );
  console.log( "Bumped to version: " + newVersion );
}
