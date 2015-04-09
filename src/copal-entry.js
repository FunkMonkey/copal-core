import app from "app";
import CoPal from "./copal";

app.on( "ready", () => {
  var copal = new CoPal();
  copal.init().then( () => {
    console.log( "CoPal initialized" );
  } );
});
