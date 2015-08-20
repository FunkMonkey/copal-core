export default class Bricks {

  constructor() {
    this.inputBricks = {};
    this.outputBricks = {};
    this.transformBricks = {};
    this.errorBricks = [];
  }

  addInputBrick( brickID, brick ) {
    if( this.inputBricks[ brickID ] )
      throw new Error(`Input-Brick with ID '${brickID}' already exists!`);

    this.inputBricks[ brickID ] = brick;
  }

  getInputBrick( brickID ) {
    return this.inputBricks[ brickID ];
  }

  addOutputBrick( brickID, brick ) {
    if( this.outputBricks[ brickID ] )
      throw new Error(`Output-Brick with ID '${brickID}' already exists!`);

    this.outputBricks[ brickID ] = brick;
  }

  getOutputBrick( brickID ) {
    return this.outputBricks[ brickID ];
  }

  addTransformBrick( brickID, brick ) {
    if( this.transformBricks[ brickID ] )
      throw new Error(`Transform-Brick with ID '${brickID}' already exists!`);

    this.transformBricks[ brickID ] = brick;
  }

  getTransformBrick( brickID ) {
    return this.transformBricks[ brickID ];
  }

}
