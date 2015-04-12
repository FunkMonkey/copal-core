import _ from "lodash";

export default function merge( a, b, customizer ) {
  var pathMap = new Map();
  pathMap.set( b, "" );
  return _.merge( a, b, ( aValue, bValue, key, obj, src ) => {
    var parentPath = pathMap.get( src );
    var currPath = ( parentPath === "" ) ? parentPath + key : parentPath + "." + key;
    pathMap.set( bValue, currPath );
    return customizer( aValue, bValue, key, obj, src, parentPath, currPath );
  });
}
