import { app as getApp } from "@qelos/api-kit";
import draftRoutes from "./drafts";

const app = getApp();
draftRoutes(app);
