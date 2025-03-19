import multer from 'multer';
import { getRouter, populateUser, verifyUser } from "@qelos/api-kit";

import { uploadFile } from "../controllers/upload";

const AUTH_MIDDLEWARES = [populateUser, verifyUser];

const router = getRouter();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post("/api/upload", AUTH_MIDDLEWARES, upload.single('file'), uploadFile);

module.exports = router;
