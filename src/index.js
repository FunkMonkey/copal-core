import R from 'ramda';
import Rx from 'rxjs/Rx';
import reactiveGraph from 'reactive-graph';
import transformTemplatesToGraph from './transform-templates-to-graph';
import getBasicOperators from './basic-operators';
import { getNodeType } from './graph-utils';
import { UnknownNodeTypeError } from './errors';


export default class Core {
  constructor( drivers ) {
    this.drivers = drivers;
    this.settings = null;
    this.operators = {};
    this.graphTemplates = {};
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

  addGraphTemplate( graphTemplate ) {
    this.graphTemplates[graphTemplate.name] = graphTemplate;
  }

  addGraphTemplates( graphTemplates ) {
    graphTemplates.forEach( config => this.addGraphTemplate( config ) );
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

  getGraphTemplates() {
    return this.graphTemplates;
  }

  getCommandGraph( graphTemplate ) {
    return transformTemplatesToGraph( graphTemplate, { graphTemplates: this.graphTemplates } );
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
    }

    const source = sources[0];
    const restSources = sources.splice( 1 );
    return source[ operatorName ]( ...restSources, ...args );
  }

  insertNode( id, nodeConfig, sources ) {
    const nodeType = getNodeType( nodeConfig );

    switch ( nodeType ) {
      case 'from-input':
      case 'to-output':
      case 'to-subgraph-input':
      case 'from-subgraph-output': {
        return ( sources.length === 1 ) ? sources[0] : Rx.Observable.merge( ...sources );
      }
      case 'operator': {
        return this.insertOperator( id, nodeConfig, sources );
      }
      default: throw new UnknownNodeTypeError( nodeType );
    }
  }

  executeGraphTemplate( graphTemplate ) {
    const graph = this.getCommandGraph( graphTemplate );

    // const topsortedNodes = reactiveGraph.getTopsortedNodes( graph );
    // reactiveGraph.connectRxOperators( topsortedNodes, insertOperator );
    return {
      config: graphTemplate,
      graph,
      operators: reactiveGraph.run( graph, this.insertNode.bind( this ) )
    };
  }

  executeCommandGraph( commandName ) {
    const graphTemplate = this.graphTemplates[ commandName ];
    return this.executeGraphTemplate( graphTemplate );
  }

  // eslint-disable-next-line class-methods-use-this
  disposeCommandGraph( aReactiveGraph ) {
    // TODO: use forEachObjIndexed from new Ramda
    R.forEachObjIndexed( obsOrSub => {
      if ( typeof obsOrSub.unsubscribe === 'function' &&
           typeof obsOrSub.subscribe !== 'function' )
        obsOrSub.unsubscribe();
    }, aReactiveGraph.operators );
  }
}
