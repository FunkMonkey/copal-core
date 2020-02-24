import R from 'ramda';
import { map, tap } from 'rxjs/operators';

function commandComparator( a, b ) {
  return a.toLowerCase() > b.toLowerCase();
}

export default function ( copal ) {
  return {
    'core.getCommandNames': ( [ query$ ] ) => (
      query$.pipe(
        map( query => query.toLowerCase() ),
        map( query => R.values( copal.commands.templates.getComponents() )
          .filter( template => !template.hidden
                               && template.name.toLowerCase().indexOf( query ) > -1 )
          .map( template => template.name ) ),
        map( R.sort( commandComparator ) )
      )
    ),

    'core.executeCommandGraph': ( [ commandName$ ] ) => (
      commandName$.pipe( map( commandName => copal.executeCommandGraph( commandName ) ) )
    ),

    'core.log': ( [ source$ ] ) => source$.pipe( tap( val => console.log( val ) ) )
  };
}
