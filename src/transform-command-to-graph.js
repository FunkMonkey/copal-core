import jsoToReactiveGraph from 'jsobject-to-reactive-graph';

const { transformers } = jsoToReactiveGraph;

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
}

export default function ( command ) {
  const graph = jsoToReactiveGraph.convertToGraph( command,
    [ transformers.graph.components,
      transformers.graph.componentMacros,
      transformers.graph.pipegroups],
    [ digestNode,
      transformers.node.appendOperatorToID,
      transformers.node.components,
      transformers.node.pipegroups,
      addMetaInfo ] );

  return graph;
}
