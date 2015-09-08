
const contexts = {};

export default function ID( contextName ) {

  if( !contextName )
    contextName = "__default";

  contexts[ contextName ] = contexts[ contextName ] || 0;

  return ++contexts[contextName];
}
