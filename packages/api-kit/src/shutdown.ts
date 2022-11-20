let shutdown = () => {
  process.exit();
};

if (process.env.NODE_ENV !== 'production') {
  shutdown = () => {
    const fs = require('fs');
    const cwd = process.cwd();
    fs.readdirSync(cwd).forEach(filename => {
      if (filename.includes('index.') || filename.includes('server.')) {
        const filePath = require('path').join(cwd, filename);
        fs.writeFileSync(filePath, fs.readFileSync(filePath))
      }
    })
    process.exit();
  }

  process.on('exit', shutdown);
}

globalThis.shutdown = shutdown;

export default shutdown;