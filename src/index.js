import Rx from 'rx';
import reactiveGraph from 'reactive-graph';
import transformCommandToGraph from './transform-command-to-graph';

export default class Core {
  constructor( drivers ) {
    this.drivers = drivers;
  }

  init() {
    const settings$ = this.drivers.profileSettings.get( 'settings' )
      .do( settings => { this.settings = settings; } );


    const extensions$ = settings$
      .flatMap( () => this.loadExtensions() );

    return extensions$.ignoreElements().share();
  }

  loadExtensions() {
    return Rx.Observable.from( this.settings.extensions.enabled )
      .map( extName => this.drivers.extensions.get( extName ) )
      .concatAll()
      .map( extFunc => extFunc( this ) );
  }

  addCommand( command ) {

  }

  addOperator( operator ) {

  }

  getCommand( name ) {

  }

  getCommandGraph( commandConfig ) {
    return transformCommandToGraph( commandConfig );
  }

  // Simple inserter that will be called for every operator.
  // Expects an array with the operator's name as the first element.
  insertOperator( id, operatorConfig, sources ) {
    // let operatorName = operatorConfig[0];
    // const args = operatorConfig.splice( 1 );

    let operatorName = operatorConfig.operator;
    const args = operatorConfig.args;

    // differentiate between static and instance operators
    if ( operatorName.startsWith( 'Observable.' ) ) {
      operatorName = operatorName.substr( 11 );

      // passing the sources (for 'merge', 'concat', etc.)
      return Rx.Observable[ operatorName ]( ...sources, ...args );
    } else {
      const source = sources[0];
      const restSources = sources.splice( 1 );
      return source[ operatorName ]( ...restSources, ...args );
    }
  }

  executeCommandConfig( commandConfig ) {
    const graph = this.getCommandGraph( commandConfig );

    // const topsortedNodes = reactiveGraph.getTopsortedNodes( graph );
    // reactiveGraph.connectRxOperators( topsortedNodes, insertOperator );
    return {
      config: commandConfig,
      graph,
      operators: reactiveGraph.run( graph, this.insertOperator.bind( this ) )
    };
  }
}
