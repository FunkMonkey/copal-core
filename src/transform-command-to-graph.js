import jsoToReactiveGraph from 'jsobject-to-reactive-graph';
const { transformers } = jsoToReactiveGraph;

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
    [transformers.graph.components,
     transformers.graph.componentMacros,
     transformers.graph.pipegroups],
    [transformers.node.valueFromArray,
     transformers.node.appendOperatorToID,
     transformers.node.components,
     transformers.node.pipegroups,
     addMetaInfo ] );

  return graph;
}
