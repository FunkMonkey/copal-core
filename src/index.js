import R from 'ramda';
import Rx from 'rxjs/Rx';
import reactiveGraphLib from 'reactive-graph';
import { PluginSystem } from 'reactive-plugin-system';

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

    const pluginLoader = id => this.drivers.plugins.load( id )
      .map( factory => ( { id, factory } ) );

    this.plugins = new PluginSystem( { data: this, loader: pluginLoader } )
  }

  init() {
    this.addOperators( getBasicOperators( this ) );

    const settings$ = this.loadSettings().share();
    const plugins$ = this.loadPlugins( settings$ );

    return plugins$.ignoreElements().share();
  }

  loadSettings() {
    return this.drivers.profile.settings.get( 'settings' )
      .do( settings => { this.settings = settings; } );
  }

  loadPlugins( settings$ ) {
    const pluginsToLoad$ = settings$
      .map( settings => settings.plugins.enabled )
      .first()
      .share();

    const initiateLoading$ = pluginsToLoad$
      .do( plugins => plugins.forEach( this.plugins.load.bind( this.plugins ) ) )
      .ignoreElements();

    const waitingForLoadingToFinish$ = pluginsToLoad$
      .flatMap( pluginsToLoad => this.plugins.waitForAll( pluginsToLoad ) );

    return Rx.Observable.concat( initiateLoading$, waitingForLoadingToFinish$ );
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
  insertOperator( id, operatorConfig, sources, reactiveGraph ) {
    // let operatorName = operatorConfig[0];
    // const args = operatorConfig.splice( 1 );

    let operatorName = operatorConfig.operator;
    const args = operatorConfig.args || [];

    // custom operators
    if ( operatorName in this.operators ) {
      return this.operators[ operatorName ]( sources, operatorConfig, reactiveGraph );

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

  insertNode( reactiveGraph, id, nodeConfig, sources ) {
    const nodeType = getNodeType( nodeConfig );

    switch ( nodeType ) {
      case 'from-input':
      case 'to-output':
      case 'to-subgraph-input':
      case 'from-subgraph-output': {
        return ( sources.length === 1 ) ? sources[0] : Rx.Observable.merge( ...sources );
      }
      case 'operator': {
        return this.insertOperator( id, nodeConfig, sources, reactiveGraph );
      }
      default: throw new UnknownNodeTypeError( nodeType );
    }
  }

  executeGraphTemplate( graphTemplate ) {
    const graph = this.getCommandGraph( graphTemplate );

    const reactiveGraph = {
      template: graphTemplate,
      graph,
      operators: null
    };

    reactiveGraph.data = graphTemplate.data || {};
    reactiveGraph.operators = reactiveGraphLib.run( graph,
      this.insertNode.bind( this, reactiveGraph ) );

    return reactiveGraph;
  }

  executeCommandGraph( commandName ) {
    const graphTemplate = this.graphTemplates[ commandName ];
    return this.executeGraphTemplate( graphTemplate );
  }

  // eslint-disable-next-line class-methods-use-this
  disposeCommandGraph( reactiveGraph ) {
    // TODO: use forEachObjIndexed from new Ramda
    R.forEachObjIndexed( obsOrSub => {
      if ( typeof obsOrSub.unsubscribe === 'function' &&
           typeof obsOrSub.subscribe !== 'function' )
        obsOrSub.unsubscribe();
    }, reactiveGraph.operators );
  }
}
