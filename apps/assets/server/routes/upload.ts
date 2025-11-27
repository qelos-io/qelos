import { getRouter, populateUser, verifyUser } from "@qelos/api-kit";

import { uploadFile } from "../controllers/upload";
import upload from "../middleware/upload";

const AUTH_MIDDLEWARES = [populateUser, verifyUser];

const router = getRouter();

router.post("/api/upload", AUTH_MIDDLEWARES, (req, res, next) => {
  if (req.get('content-type')?.startsWith('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, uploadFile);

module.exports = router;
