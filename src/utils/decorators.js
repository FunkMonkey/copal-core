import wrappers from "./wrappers";
import _ from "lodash";

function decorateWrapper( wrapperFunc ) {

  return function( target, name, descriptor ) {
    descriptor.value = wrapperFunc( descriptor.initializer() ) ;
    delete descriptor.initializer;
    return descriptor;
  }
}

export default _.mapValues( wrappers, wrapper => decorateWrapper( wrapper ) );
