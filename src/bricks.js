
// TODO: rename to BrickCatalog
export default class Bricks {

  constructor() {
    this.bricks = [];
    this.brickMap = {};
    this.bricksByType = {};
  }

  addBrick( brickInfo ) {
    if( this.brickMap[ brickInfo.id ] )
      throw new Error(`Brick with ID '${brickInfo.id}' already exists!`);

    this.bricks.push( brickInfo );
    this.brickMap[ brickInfo.id ] = brickInfo;

    // type can be a single type as a string or an array
    // if it's the former, we'll create the array
    if( typeof brickInfo.type === "string" )
      brickInfo.type = [ brickInfo.type ];

    brickInfo.type.forEach( type => {
      if( !this.bricksByType[type] )
        this.bricksByType[type] = [brickInfo];
      else
        this.bricksByType[type].push( brickInfo );
    } );
  }

  addBrickSimple( id, type, brickFunc, brickInfo ) {
    brickInfo = brickInfo || {};

    brickInfo.id = brickInfo.id || id;
    brickInfo.exec = brickInfo.exec || brickFunc;

    // TODO: make sure we're not accidentally overriding types
    brickInfo.type = brickInfo.type || type;

    this.addBrick( brickInfo );
  }

  getBrick( id, throwIfNotExists ) {
    const brickInfo = this.brickMap[ id ];

    if( !brickInfo && throwIfNotExists )
      throw new Error(`Brick with ID '${id}' does not exist!`);

    return  brickInfo || null;
  }

  getBricksByType( type ) {
    return this.bricksByType[ type ] || [];
  }

}

// adding functions for different brick-types
const STANDARD_TYPES = ["input", "transform", "output", "error"];

STANDARD_TYPES.forEach( type => {
  const capType = type[0].toUpperCase() + type.slice(1);

  Bricks.prototype[`add${capType}Brick`] = function( id, func, brickInfo ) {
    this.addBrickSimple( id, type, func, brickInfo );
  };

  Bricks.prototype[`get${capType}Bricks`] = function( ) {
    return this.getBricksByType( type );
  };

} );
