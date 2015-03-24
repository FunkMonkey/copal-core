
import ExampleCommand from "./example-command";

export default {
  init( copal ) {
    copal.bricks.addNormalBrick( "Example.getResults", this.getResults.bind(this) );
    copal.bricks.addNormalBrick( "Example.toURLList", this.toURLList );
    copal.bricks.addNormalBrick( "Example.itemToUrl", this.itemToUrl );
    copal.bricks.addNormalBrick( "Example.openUrlInBrowser", this.openUrlInBrowser );

    copal.addCommand( "test", ExampleCommand );
  },

  results: ["Alpha", "Bravo", "Charlie", "Delta"],

  getResults ( commandSession, queryData ) {
    queryData = queryData.toLowerCase();
    return this.results.filter( res => res.toLowerCase().indexOf(queryData) > -1 );
  },

  toURLList ( commandSession, data) {
    return data;
  },

  itemToUrl ( commandSession, item ) {
    return "url:" + item;
  },

  openUrlInBrowser ( commandSession, url ) {
    console.log( "Opening " + url + " in browser!" );
  }
};
