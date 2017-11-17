import R from 'ramda';
import Rx from 'rxjs/Rx';
import reactiveGraph from 'reactive-graph';
import transformCommandToGraph from './transform-command-to-graph';
import getBasicOperators from './basic-operators';

export default class Core {
  constructor( drivers ) {
    this.drivers = drivers;
    this.settings = null;
    this.operators = {};
    this.componentConfigs = {};
    this.commandConfigs = {};
  }

  init() {
    this.addOperators( getBasicOperators( this ) );

    const settings$ = this.drivers.profile.settings.get( 'settings' )
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

  addComponentConfig( componentConfig ) {
    this.componentConfigs[componentConfig.name] = componentConfig;
  }

  addComponentConfigs( componentConfigs ) {
    componentConfigs.forEach( config => this.addComponentConfig( config ) );
  }

  addCommandConfig( commandConfig ) {
    this.commandConfigs[commandConfig.name] = commandConfig;
  }

  addCommandConfigs( commandConfigs ) {
    commandConfigs.forEach( config => this.addCommandConfig( config ) );
  }

  addOperator( name, operator ) {
    this.operators[ name ] = operator;
  }

  addOperators( operators ) {
    R.pipe(
      R.toPairs,
      R.map( opPair => this.addOperator( opPair[0], opPair[1] ) )
    )( operators );
  }

  getCommand( name ) {

  }

  getCommandConfigs() {
    return this.commandConfigs;
  }

  getCommandGraph( commandConfig ) {
    return transformCommandToGraph( commandConfig, { componentConfigs: this.componentConfigs } );
  }

  // Simple inserter that will be called for every operator.
  // Expects an array with the operator's name as the first element.
  insertOperator( id, operatorConfig, sources ) {
    // let operatorName = operatorConfig[0];
    // const args = operatorConfig.splice( 1 );

    let operatorName = operatorConfig.operator;
    const args = operatorConfig.args || [];

    // custom operators
    if ( operatorName in this.operators ) {
      return this.operators[ operatorName ]( sources, args, operatorConfig );

    // Rx static operators
    } else if ( operatorName.startsWith( 'Observable.' ) ) {
      operatorName = operatorName.substr( 11 );

      // passing the sources (for 'merge', 'concat', etc.)
      return Rx.Observable[ operatorName ]( ...sources, ...args );

    // Rx non-static operators
    } else {
      const source = sources[0];
      const restSources = sources.splice( 1 );
      return source[ operatorName ]( ...restSources, ...args );
    }
  }

  insertNode( id, nodeConfig, sources ) {
    if ( nodeConfig.input || nodeConfig.output )
      return ( sources.length === 1 ) ? sources[0] : Rx.Observable.merge( ...sources );
    else if ( nodeConfig.operator )
      return this.insertOperator( id, nodeConfig, sources );

    // TODO: custom error
    throw new Error( `Node '${id}' has an unknown node type!` );
  }

  executeCommandConfig( commandConfig ) {
    const graph = this.getCommandGraph( commandConfig );

    // const topsortedNodes = reactiveGraph.getTopsortedNodes( graph );
    // reactiveGraph.connectRxOperators( topsortedNodes, insertOperator );
    return {
      config: commandConfig,
      graph,
      operators: reactiveGraph.run( graph, this.insertNode.bind( this ) )
    };
  }

  executeCommand( commandName ) {
    const commandConfig = this.commandConfigs[ commandName ];
    return this.executeCommandConfig( commandConfig );
  }

  disposeCommand( commandGraph ) {
    // TODO: use forEachObjIndexed from new Ramda
    R.map( obsOrSub => {
      if ( typeof obsOrSub.unsubscribe === 'function' &&
           typeof obsOrSub.subscribe !== 'function' )
        obsOrSub.unsubscribe();
    }, commandGraph.operators );
  }
}
