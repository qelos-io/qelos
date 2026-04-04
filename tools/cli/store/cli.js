class CliStore {

  isVerbose = true;

  constructor() {
    this.isVerbose = process.argv.includes('--verbose');
  }
}

let store;

export function getCliStore() {
  if (!store) {
    store = new CliStore();
  }
  return store;
}
