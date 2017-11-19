import R from 'ramda';
import graphlib from 'graphlib';
import { copyGraphInto, getNodeType, getNodeInfo } from './graph-utils';
import { NodeDoesNotExistError, UnknownNodeTypeError, GraphTemplateDoesNotExistError } from './errors';



function getUsedSubgraphTemplates( names, templates ) {
  return R.pipe( R.map( graphName => [ graphName, templates[graphName] ] ),
                 R.fromPairs )( names );
}

function graphTemplateToGraph( graphTemplate, graphTemplates ) {
  const graph = new graphlib.Graph();

  let extGraphTemplate = graphTemplate;
  if ( graphTemplate.extends ) {
    const gTemplateToExtend = graphTemplates[ graphTemplate.extends ];
    if ( gTemplateToExtend == null )
      throw new GraphTemplateDoesNotExistError( graphTemplate.extends );
    extGraphTemplate = R.merge( gTemplateToExtend, graphTemplate );
  }

  // getting and merging subgraphs
  if ( extGraphTemplate.subgraphs ) {
    const subgraphTemplates = getUsedSubgraphTemplates( extGraphTemplate.subgraphs,
                                                        graphTemplates );
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
          const nodeID = `${extGraphTemplate.name}::${nodeInfo}`;
          graph.setNode( nodeID, nodeValue );
          info.prevID = nodeID;
          break;
        }
        case 'to-output': {
          const nodeID = `${extGraphTemplate.name}::${nodeInfo}`;
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
          const nodeID = `${extGraphTemplate.name}::${nodeGroupName}-${info.index}`;
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
    nodeGroup ), extGraphTemplate.graph );
  return graph;
}

export default function ( graphTemplate, { graphTemplates } ) {
  return graphTemplateToGraph( graphTemplate, graphTemplates );
}
