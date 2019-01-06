import { filter, map, startWith, tap } from 'rxjs/operators';

function makeOperator( rxOp ) {
  return ( [ source$ ], nodeConfig ) => source$.pipe( rxOp( ...( nodeConfig.args || [] ) ) );
}

export default {
  filter: makeOperator( filter ),
  map: makeOperator( map ),
  startWith: makeOperator( startWith ),
  tap: makeOperator( tap )
};
