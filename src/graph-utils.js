import R from 'ramda';
import { NodeAlreadyExistsError, NodeDoesNotExistError, EdgeAlreadyExistsError } from './errors';

function propNameIfIn( propName, obj ) {
  return ( propName in obj ) ? propName : null;
}

export function getNodeType( nodeValue ) {
  return propNameIfIn( 'from-input', nodeValue ) ||
         propNameIfIn( 'to-output', nodeValue ) ||
         propNameIfIn( 'to-subgraph-input', nodeValue ) ||
         propNameIfIn( 'from-subgraph-output', nodeValue ) ||
         propNameIfIn( 'operator', nodeValue );
}

export function getNodeInfo( nodeValue, nodeType ) {
  return nodeValue[nodeType];
}

export function copyNodesInto( fromGraph, toGraph ) {
  R.forEachObjIndexed( ( nodeValue, nodeID ) => {
    if ( toGraph.hasNode( nodeID ) )
      throw new NodeAlreadyExistsError( nodeID );
    toGraph.setNode( nodeID, nodeValue );
  }, fromGraph._nodes );
}

export function copyEdgesInto( fromGraph, toGraph ) {
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

export function copyGraphInto( fromGraph, toGraph ) {
  copyNodesInto( fromGraph, toGraph );
  copyEdgesInto( fromGraph, toGraph );
}

// function mergeGraphs( graphs, connections ) {
//   const mergedGraph = new graphlib.Graph();
//   R.forEachObjIndexed( graph => copyGraphInto( graph, mergedGraph ), graphs );
//   R.forEachObjIndexed( ( to, from ) => {
//     if ( !mergedGraph.hasNode( to ) )
//       throw new NodeDoesNotExistError( to );
//
//     if ( !mergedGraph.hasNode( from ) )
//       throw new NodeDoesNotExistError( from );
//
//     if ( mergedGraph.hasEdge( { v: from, w: to } ) )
//       throw new EdgeAlreadyExistsError( from, to );
//
//     mergedGraph.setEdge( from, to );
//   }, connections );
//   return mergedGraph;
// }
