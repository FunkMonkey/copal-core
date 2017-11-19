import R from 'ramda';
import graphlib from 'graphlib';
import { copyGraphInto, getNodeType, getNodeInfo,
         NodeDoesNotExistError, UnknownNodeTypeError } from './graph-utils';



function getUsedSubgraphTemplates( names, templates ) {
  return R.pipe( R.map( graphName => [ graphName, templates[graphName] ] ),
                 R.fromPairs )( names );
}

function graphTemplateToGraph( graphTemplate, graphTemplates ) {
  const graph = new graphlib.Graph();

  // getting and merging subgraphs
  if ( graphTemplate.subgraphs ) {
    const subgraphTemplates = getUsedSubgraphTemplates( graphTemplate.subgraphs, graphTemplates );
    const subgraphs = R.map( graphTemplateToGraph, subgraphTemplates );
    R.forEachObjIndexed( subgraph => copyGraphInto( subgraph, graph ), subgraphs );
  }

  // creating nodes and edges for this graph
  R.forEachObjIndexed(
    ( nodeGroup, nodeGroupName ) => R.reduce( ( info, nodeValue ) => {
      const nodeType = getNodeType( nodeValue );
      const nodeInfo = getNodeInfo( nodeValue, nodeType );

      switch ( nodeType ) {
        case 'from-input': {
          const nodeID = `${graphTemplate.name}::${nodeInfo}`;
          graph.setNode( nodeID, nodeValue );
          info.prevID = nodeID;
          break;
        }
        case 'to-output': {
          const nodeID = `${graphTemplate.name}::${nodeInfo}`;
          graph.setNode( nodeID, nodeValue );
          if ( info.prevID )
            graph.setEdge( info.prevID, nodeID, 0 );
          info.prevID = nodeID;
          break;
        }
        case 'to-subgraph-input': {
          const nodeID = nodeInfo;
          if ( !graph.hasNode( nodeID ) )
            throw new NodeDoesNotExistError( nodeID );
          if ( info.prevID )
            graph.setEdge( info.prevID, nodeID, 0 );
          info.prevID = nodeID;
          break;
        }
        case 'from-subgraph-output': {
          const nodeID = nodeInfo;
          graph.setNode( nodeID, nodeValue );
          if ( !graph.hasNode( nodeID ) )
            throw new NodeDoesNotExistError( nodeID );
          info.prevID = nodeID;
          break;
        }
        case 'operator': {
          const nodeID = `${graphTemplate.name}::${nodeGroupName}-${info.index}`;
          graph.setNode( nodeID, nodeValue );
          if ( info.prevID )
            graph.setEdge( info.prevID, nodeID, 0 );
          info.prevID = nodeID;
          break;
        }
        default: throw new UnknownNodeTypeError( nodeType );
      }

      info.index++;
      return info;
    },
    { prevID: '', index: 0 },
    nodeGroup ), graphTemplate.graph );
  return graph;
}

export default function ( graphTemplate, { graphTemplates } ) {
  return graphTemplateToGraph( graphTemplate, graphTemplates );
}
