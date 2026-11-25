#!/usr/bin/env node
import { serve } from './serve.js';

serve(process.argv.slice(2))
  .then(({ close }) => {
    const stop = () => close().then(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  });
