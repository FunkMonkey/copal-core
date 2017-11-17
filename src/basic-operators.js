import R from 'ramda';

export default function ( copal ) {
  return {

    'core.getCommandNames': ( [ query$ ] ) =>
      query$
        .map( query => query.toLowerCase() )
        .map( query => R.values( copal.getCommandConfigs() )
          .filter( cmd => cmd.name.toLowerCase().indexOf( query ) > -1 )
          .map( cmd => cmd.name ) ),

    'core.executeCommand': ( [ commandName$ ] ) =>
      commandName$.map( commandName => copal.executeCommand( commandName ) )
  };
}
