import R from 'ramda';
import Rx from 'rx';
import reactiveGraph from 'reactive-graph';
import transformCommandToGraph from './transform-command-to-graph';
import getBasicOperators from './basic-operators';
import BASIC_COMMANDS from './basic-commands.json';

export default class Core {
  constructor( drivers ) {
    this.drivers = drivers;
    this.settings = null;
    this.operators = {};
    this.commandConfigs = [];
  }

  init() {
    this.addOperators( getBasicOperators( this ) );
    this.commandConfigs = R.unnest( [ this.commandConfigs, BASIC_COMMANDS ] );

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

  addCommandConfig( commandConfig ) {
    this.commandConfigs.push( commandConfig );
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
    return transformCommandToGraph( commandConfig );
  }

  // Simple inserter that will be called for every operator.
  // Expects an array with the operator's name as the first element.
  insertOperator( id, operatorConfig, sources ) {
    // let operatorName = operatorConfig[0];
    // const args = operatorConfig.splice( 1 );

    let operatorName = operatorConfig.operator;
    const args = operatorConfig.args;

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

  executeCommand( commandName ) {
    const commandConfig = R.find( R.propEq( 'name', commandName ) )( this.commandConfigs );
    return this.executeCommandConfig( commandConfig );
  }

  disposeCommand( commandGraph ) {
    // TODO: use forEachObjIndexed from new Ramda
    R.map( obs => {
      if ( !Rx.Observable.isObservable( obs ) && Rx.Disposable.isDisposable( obs ) )
        obs.dispose();
    }, commandGraph.operators );
  }
}
