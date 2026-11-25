#!/usr/bin/env node
import { serve, type ServeHandle } from './serve.js';
import { record } from './record.js';

const argv = process.argv.slice(2);
const run: Promise<ServeHandle> = argv[0] === 'record' ? record(argv) : serve(argv);

run
  .then(({ close }) => {
    const stop = () => close().then(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  });
