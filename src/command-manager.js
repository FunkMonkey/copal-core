import R from 'ramda';
import { merge, Observable } from 'rxjs';
import { ReactiveCommand, BasicConnector, BasicTemplateCreator } from 'reactive-commands';

export default class CommandManager {
  constructor( core ) {
    this.core = core;
    this.connector = new BasicConnector( { Observable, merge } );
    this.templates = new BasicTemplateCreator();
  }

  instantiate( name, data ) {
    const template = this.templates.createTemplate( name );
    const mergedData = ( data == null ) ? template.data : R.merge( template.data, data );
    const command = new ReactiveCommand( template.graph, mergedData, this.connector );
    command.core = this.core;
    command.instantiate();
    return command;
  }

  // eslint-disable-next-line class-methods-use-this
  destroy( command ) {
    return command.destroy();
  }
}
