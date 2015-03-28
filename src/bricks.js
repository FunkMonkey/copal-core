export default class Bricks {

  constructor() {
    this.inputBricks = {};
    this.outputBricks = {};
    this.dataBricks = {};
    this.errorBricks = {};
  }

  addInputBrick( inputDatatype, brickID, brick ) {
    // TODO: check arguments
    var inputBricksByDatatype = this.inputBricks[ inputDatatype ];

    if( !inputBricksByDatatype )
      inputBricksByDatatype = this.inputBricks[ inputDatatype ] = [];

    inputBricksByDatatype.push( brick );
  }

  getInputBricks( datatype ) {
    return this.inputBricks[ datatype ];
  }

  addOutputBrick( outputDatatype, brickID, brick ) {
    var outputBricksByDatatype = this.outputBricks[ outputDatatype ];

    if( !outputBricksByDatatype )
      outputBricksByDatatype = this.outputBricks[ outputDatatype ] = [];

    outputBricksByDatatype.push( brick );
  }

  getOutputBricks( datatype ) {
    return this.outputBricks[ datatype ];
  }

  addDataBrick( brickID, brick ) {
    if( this.dataBricks[ brickID ] )
      throw new Error("Brick with ID '" + brickID + "' already existing!");

    this.dataBricks[ brickID ] = brick;
  }

  getDataBrick( brickID ) {
    return this.dataBricks[ brickID ];
  }



}
