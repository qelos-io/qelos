import { getRouter, populateUser, verifyUser } from "@qelos/api-kit";

import { uploadFile } from "../controllers/upload";
import upload from "../middleware/upload";

const AUTH_MIDDLEWARES = [populateUser, verifyUser];

const router = getRouter();

router.post("/api/upload", AUTH_MIDDLEWARES, upload.single('file'), uploadFile);

module.exports = router;
