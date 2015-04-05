
import ExampleCommand from "./example-command";

var sourceData = {
  "Bing": "http://bing.com",
  "Google": "http://google.com",
  "Wikipedia": "http://wikipedia.org",
  "Yahoo": "http://yahoo.com"
};

export default {
  init( copal ) {
    copal.bricks.addDataBrick( "Example.getResults", this.getResults.bind(this) );
    copal.bricks.addDataBrick( "Example.toURLList", this.toURLList );
    copal.bricks.addDataBrick( "Example.itemToUrl", this.itemToUrl );

    copal.addCommand( ExampleCommand, "example" );
  },

  // results: ["Alpha", "Bravo", "Charlie", "Delta"],

  getResults ( commandSession, queryData ) {
    queryData = ( queryData.queryString || "" ).toLowerCase();
    return Object.keys(sourceData).filter( res => res.toLowerCase().indexOf(queryData) > -1 );
  },

  toURLList ( commandSession, data) {
    return data;
  },

  itemToUrl ( commandSession, item ) {
    return sourceData[item];
  }

};
