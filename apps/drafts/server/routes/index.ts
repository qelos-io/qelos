import { app as getApp, errorHandler } from "@qelos/api-kit";
import draftRoutes from "./drafts";

const app = getApp();
draftRoutes(app);

app.use(errorHandler);
