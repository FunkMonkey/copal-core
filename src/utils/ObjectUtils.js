export function splitPropertyString ( propString ) {
  return propString.split( "." );
}

export function getProperty ( obj, parts ) {
  if( typeof parts === "string" ) {
    parts = splitPropertyString( parts );
  }

  var curr = obj;

  for ( var i = 0, len = parts.length; i < len; ++i ) {
    curr = curr[ parts[i] ];
  }

  return curr;
}

export function setProperty ( obj, parts, value ) {

  if( typeof parts === "string" ) {
    parts = splitPropertyString( parts );
  }

  var curr = obj;

  for ( var i = 0, len = parts.length - 1; i < len; ++i ) {
    curr = curr[ parts[i] ];
  }

  curr[ parts[ len ] ] = value;
}

export function callProperty ( obj, parts, ...params ) {
  if( typeof parts === "string" ) {
    parts = splitPropertyString( parts );
  }

  var curr = obj;
  var prev = null;

  for ( var i = 0, len = parts.length; i < len; ++i ) {
    prev = curr;
    curr = curr[ parts[i] ];
  }

  if( typeof curr !== "function" ) {
    throw new Error( "'" + parts.join(".") + "' is not a function" );
  }

  return curr.apply( prev, params );
}

export function filter( obj, filterFn ) {
  var result = {};
  for( var name in obj ) {
    if( filterFn( obj[name], name, obj ) ) {
      result[name] = obj[name];
    }
  }
  return result;
}

export function map( obj, mapFn ) {
  var result = {};
  for( var name in obj ) {
    result[name] = mapFn( obj[name], name, obj );
  }
  return result;
}

export function forEach( obj, forEachFn ) {
  for( var name in obj ) {
    forEachFn( obj[name], name, obj );
  }
}
