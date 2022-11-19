import { port, ip } from "./config";

require("./server/routes");

require("@qelos/api-kit")
  .start("Drafts Service", port, ip);
