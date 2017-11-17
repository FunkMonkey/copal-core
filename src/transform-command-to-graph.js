import R from 'ramda';
// import * as jsoToReactiveGraph from 'jsobject-to-reactive-graph';
import graphlib from 'graphlib';

/*
const { transformers, utils } = jsoToReactiveGraph;

function digestGraph( graph ) {
  if ( graph.components ) {
    graph.components = R.map( comp => {
      const newComp = utils.ensureTransformLayer( comp );
      newComp.pipegroups = comp;
      return newComp;
    }, graph.components );
  }
}

function digestNode( node ) {
  if ( node.sources == null )
    node.sources = [];
  else if ( typeof node.sources === 'string' )
    node.sources = [ node.sources ];
  else
    node.sources = node.sources.slice( 0 );

  node.value = {
    operator: node.operator,
    args: node.args || []
  };
}

function addMetaInfo( node ) {
  const pipegroup = node._pipegroupData.pipegroup;
  const component = pipegroup._componentData.component;

  node.value.component = component.id;
  node.value.pipegroup = pipegroup.shortID;
  node.value.pipegroupID = pipegroup.id;
  node.value.context = component.id;
} */

function getUsedComponents( names, components ) {
  return R.pipe( R.map( compName => [ compName, components[compName] ] ),
                 R.fromPairs )( names );
}

function propNameIfIn( propName, obj ) {
  return ( propName in obj ) ? propName : null;
}

function getNodeType( nodeValue ) {
  return propNameIfIn( 'input', nodeValue ) ||
         propNameIfIn( 'output', nodeValue ) ||
         propNameIfIn( 'operator', nodeValue );
}

function componentConfigToGraph( component ) {
  const graph = new graphlib.Graph();

  R.forEachObjIndexed(
    ( nodeGroup, nodeGroupName ) => R.reduce( ( info, nodeValue ) => {
      if ( nodeValue.input ) {
        const nodeID = `${component.name}::${nodeValue.input}`;
        graph.setNode( nodeID, nodeValue );
        info.prevID = nodeID;
      } else if ( nodeValue.output ) {
        const nodeID = `${component.name}::${nodeValue.output}`;
        graph.setNode( nodeID, nodeValue );
        if ( info.prevID )
          graph.setEdge( info.prevID, nodeID, 0 );
        info.prevID = nodeID;
      } else if ( nodeValue.operator ) {
        const nodeID = `${component.name}::${nodeGroupName}-${info.index}`;
        graph.setNode( nodeID, nodeValue );
        if ( info.prevID )
          graph.setEdge( info.prevID, nodeID, 0 );
        info.prevID = nodeID;
      }

      info.index++;
      return info;
    },
    { prevID: '', index: 0 },
    nodeGroup ), component.graph );
  return graph;
}

// TODO: custom Errors using custom-error-generator
class NodeAlreadyExistsError {}
class NodeDoesNotExistError {}
class EdgeAlreadyExistsError {}


function copyNodesInto( fromGraph, toGraph ) {
  R.forEachObjIndexed( ( nodeValue, nodeID ) => {
    if ( toGraph.hasNode( nodeID ) )
      throw new NodeAlreadyExistsError();
    toGraph.setNode( nodeID, nodeValue );
  }, fromGraph._nodes );
}

function copyEdgesInto( fromGraph, toGraph ) {
  R.forEachObjIndexed( edgeObj => {
    if ( !toGraph.hasNode( edgeObj.v ) )
      throw new NodeDoesNotExistError(); // TODO Error messages

    if ( !toGraph.hasNode( edgeObj.w ) )
      throw new NodeDoesNotExistError();

    if ( toGraph.hasEdge( edgeObj ) )
      throw new EdgeAlreadyExistsError();

    toGraph.setEdge( edgeObj, fromGraph.edge( edgeObj ) );
  }, fromGraph._edgeObjs );
}

function copyGraphInto( fromGraph, toGraph ) {
  copyNodesInto( fromGraph, toGraph );
  copyEdgesInto( fromGraph, toGraph );
}

function mergeGraphs( graphs, connections ) {
  const mergedGraph = new graphlib.Graph();
  R.forEachObjIndexed( graph => copyGraphInto( graph, mergedGraph ), graphs );
  R.forEachObjIndexed( ( to, from ) => {
    if ( !mergedGraph.hasNode( to ) )
      throw new NodeDoesNotExistError(); // TODO Error messages

    if ( !mergedGraph.hasNode( from ) )
      throw new NodeDoesNotExistError();

    mergedGraph.setEdge( from, to );
  }, connections );
  return mergedGraph;
}

export default function ( command, { componentConfigs } ) {
  const usedComponents = getUsedComponents( command.components, componentConfigs );
  const componentGraphs = R.map( componentConfigToGraph, usedComponents );
  return mergeGraphs( componentGraphs, command.connections );

  // const graph = jsoToReactiveGraph.convertToGraph( command,
  //   [ digestGraph,
  //     transformers.graph.components,
  //     transformers.graph.componentMacros,
  //     transformers.graph.pipegroups],
  //   [ digestNode,
  //     transformers.node.appendOperatorToID,
  //     transformers.node.components,
  //     transformers.node.pipegroups,
  //     addMetaInfo ] );

  // return graph;
}
