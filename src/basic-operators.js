import R from 'ramda';

export default function ( copal ) {
  return {

    'core.getCommandNames': ( [ query$ ] ) =>
      query$
        .map( query => query.toLowerCase() )
        .map( query => R.values( copal.getGraphTemplates() )
          .filter( template => !template.hidden )
          .filter( template => template.name.toLowerCase().indexOf( query ) > -1 )
          .map( template => template.name ) ),

    'core.executeCommandGraph': ( [ commandName$ ] ) =>
      commandName$.map( commandName => copal.executeCommandGraph( commandName ) )
  };
}
