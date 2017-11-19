import R from 'ramda';
// import * as jsoToReactiveGraph from 'jsobject-to-reactive-graph';
import graphlib from 'graphlib';
import createCustomError from 'custom-error-generator';

// custom-error-generator unfortunately overrides the message if strings or
// numbers are passedas arguments
const NodeAlreadyExistsError = createCustomError( 'NODE_ALREADY_EXISTS', null,
  function construct( id ) { this.message = `Node with id '${id}' already exists`; } );
const NodeDoesNotExistError = createCustomError( 'NODE_DOES_NOT_EXIST', null,
  function construct( id ) { this.message = `Node with id '${id}' does not exist`; } );
const EdgeAlreadyExistsError = createCustomError( 'EDGE_ALREADY_EXISTS', null,
  function construct( from, to ) { this.message = `Edge between '${from}' and '${to}' already exists`; } );

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

function copyNodesInto( fromGraph, toGraph ) {
  R.forEachObjIndexed( ( nodeValue, nodeID ) => {
    if ( toGraph.hasNode( nodeID ) )
      throw new NodeAlreadyExistsError( nodeID );
    toGraph.setNode( nodeID, nodeValue );
  }, fromGraph._nodes );
}

function copyEdgesInto( fromGraph, toGraph ) {
  R.forEachObjIndexed( edgeObj => {
    if ( !toGraph.hasNode( edgeObj.v ) )
      throw new NodeDoesNotExistError( edgeObj.v ); // TODO Error messages

    if ( !toGraph.hasNode( edgeObj.w ) )
      throw new NodeDoesNotExistError( edgeObj.w );

    if ( toGraph.hasEdge( edgeObj ) )
      throw new EdgeAlreadyExistsError( edgeObj.v, edgeObj.w );

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
      throw new NodeDoesNotExistError( to );

    if ( !mergedGraph.hasNode( from ) )
      throw new NodeDoesNotExistError( from );

    if ( mergedGraph.hasEdge( { v: from, w: to } ) )
      throw new EdgeAlreadyExistsError( from, to );

    mergedGraph.setEdge( from, to );
  }, connections );
  return mergedGraph;
}

export default function ( command, { componentConfigs } ) {
  const usedComponents = getUsedComponents( command.components, componentConfigs );
  const componentGraphs = R.map( componentConfigToGraph, usedComponents );
  return mergeGraphs( componentGraphs, command.connections );
}
