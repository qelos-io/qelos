import { start, config, app as getApp } from "@qelos/api-kit";
import cacheManager from "./cache-manager";
import apiProxy from "./server/services/proxy-middleware";

config({ cors: false, bodyParser: false });

const app = getApp();
apiProxy(app, {}, cacheManager);

const port = process.env.PORT || 3000;
const address = process.env.IP || "0.0.0.0";
start("Gateway", port, address)
  .finally(() => {
    if (process.env.NODE_ENV !== 'production') {
      fetch(`http://${address}:${port}`)
        .then(res => res.status < 500 ? console.log('Gateway is running on dev') : process.exit(1))
        .then(require('timers/promises').setTimeout(3000))
        .then(() => {
          console.log('------'); 
          console.log('\n\x1b[32m🚀 Qelos Gateway is running!\x1b[0m');
          console.log('\x1b[36m📍 Admin UI: \x1b[4mhttp://localhost:3000\x1b[0m');
          console.log('\x1b[33m📚 API Documentation: \x1b[4mhttps://docs.qelos.io\x1b[0m');
          console.log('------'); 
        })
    }
  });
