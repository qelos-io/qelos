import { start, config, app as getApp } from "@qelos/api-kit";
import cacheManager from "./cache-manager";
import apiProxy from "@qelos/api-proxy-middleware";

config({ cors: false, bodyParser: false });

const app = getApp();
apiProxy(app, {}, cacheManager);

const port = process.env.PORT || 3000;
const address = process.env.IP || "0.0.0.0";
start("Gateway", port, address)
  .finally(() => {
    if (process.env.NODE_ENV !== 'production') {
      fetch(`http://${address}:${port}`)
        .then(res => res.status < 500 ? console.log('Gateway is running on dev') : process.exit(1));
    }
  });
