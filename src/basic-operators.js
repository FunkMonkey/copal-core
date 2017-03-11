export default function ( copal ) {
  return {
    'core.getCommandNames': ( [ query$ ] ) =>
      query$
        .map( query => query.toLowerCase() )
        .map( query => copal.getCommandConfigs()
          .filter( cmd => cmd.name.toLowerCase().indexOf( query ) > -1 )
          .map( cmd => cmd.name ) )
  };
}
