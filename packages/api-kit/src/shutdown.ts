import fs from 'node:fs';
import path from 'node:path';

let shutdown = (_code?: number) => {
  process.exit();
};

if (process.env.NODE_ENV !== 'production') {
  console.log('trying to require tmp file...')
  try {
    const cwd = process.cwd();
    const tempFolder = path.join(cwd, 'tmp');
    const tempFile = path.join(tempFolder, 'tmp.js');
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder)
    }
    if (!fs.existsSync(tempFile)) {
      fs.writeFileSync(tempFile, '');
    }
    require(tempFile)

    shutdown = (code?: number | string) => {
      if (code?.toString() === '1') {
        fs.writeFileSync(tempFile, '')
      }
      process.exit();
    }
  } catch (err) {
    console.error(err)
  }

  process.on('exit', shutdown);
}

globalThis.shutdown = shutdown;

export default shutdown;