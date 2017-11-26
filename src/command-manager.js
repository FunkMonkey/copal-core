import { Observable } from 'rxjs';
import { ReactiveCommand, BasicConnector, BasicTemplateCreator } from 'reactive-commands';

export default class CommandManager {
  constructor() {
    this.connector = new BasicConnector( { Observable } );
    this.templates = new BasicTemplateCreator();
  }

  instantiate( name ) {
    const template = this.templates.createTemplate( name );
    return new ReactiveCommand( template, this.connector ).instantiate();
  }

  // eslint-disable-next-line class-methods-use-this
  destroy( command ) {
    return command.destroy();
  }
}
