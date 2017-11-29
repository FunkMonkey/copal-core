import { link } from 'linkfs';

export default class ProfileManager {
  constructor( { directory, fs } ) {
    this.directory = directory;
    this.fs = link( fs, ['/', this.directory] );
  }
}
