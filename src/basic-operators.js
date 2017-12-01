import R from 'ramda';

function commandComparator( a, b ) {
  return a.toLowerCase() > b.toLowerCase();
}

export default function ( copal ) {
  return {

    'core.getCommandNames': ( [ query$ ] ) =>
      query$
        .map( query => query.toLowerCase() )
        .map( query => R.values( copal.commands.templates.getComponents() )
          .filter( template => !template.hidden &&
                               template.name.toLowerCase().indexOf( query ) > -1 )
          .map( template => template.name ) )
        .map( R.sort( commandComparator ) ),

    'core.executeCommandGraph': ( [ commandName$ ] ) =>
      commandName$.map( commandName => copal.executeCommandGraph( commandName ) ),

    'core.log': ( [ source$ ] ) => source$.do( val => console.log( val ) )
  };
}
