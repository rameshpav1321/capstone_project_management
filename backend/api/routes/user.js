const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../models");
const upload = multer({ dest: process.env.FILES_UPLOAD_PATH });

const {
  validateSignUp,
  validateLogin,
  auth,
  accessValidator,
} = require("../middleware");
const controller = require("../controllers/user.js");
const { mandatoryFields } = require("../middleware/validateLogin");

router.post(
  "/signup",
  upload.single("image"),
  [
    accessValidator.mandatoryFields(["email", "password"]),
    validateSignUp.checkEmailExistence,
  ],
  controller.signup
);

router.post("/signup-admin", upload.single("image"), controller.signupAdmin);

router.post(
  "/login",
  [validateLogin.mandatoryFields, validateLogin.checkUserExistence],
  controller.login
);

router.get("/refresh-token", controller.refreshToken);
router.get("/profile", [auth.verifyToken], controller.getProfile);

/*router.post("/batch-csv",upload.single("csvfile"),
	[auth.verifyToken, accessValidator.accessInstructor(), validateLogin.checkInputFile]
  ,controller.processCSV);*/

router.post(
  "/batch-csv",
  upload.single("csvfile"),
  [
    auth.verifyToken,
    accessValidator.accessInstructor(),
    accessValidator.mandatoryFields(["fileName"]),
  ],
  controller.processCSV
);

/*
  router.post("/preview-csv",upload.single("csvfile"),
	[auth.verifyToken, accessValidator.accessInstructor(), accessValidator.mandatoryFields(["fileName"])]
  ,controller.previewCSV);*/

/*router.put('/profile', upload.single("image"), 
	[auth.verifyToken], controller.updateProfile);*/

router.post(
  "/profile",
  upload.single("image"),
  [auth.verifyToken],
  controller.updateProfile
);

router.post("/update-password", 
// [auth.verifyToken],
accessValidator.mandatoryFields(["email", "password", "confirmPassword"]),
validateSignUp.checkUserExistence,
validateSignUp.validateUserPassword,
controller.updatePassword);

/*router.get('/profile/:userId', upload.single("image"),
	controller.getProfile);*/

router.post(
  "/addUser",
  [
    auth.verifyToken,
    accessValidator.accessInstructor(),
    accessValidator.mandatoryFields(["email", "roles"]),
  ],
  controller.createUser
);

router.get(
  "/",
  [auth.verifyToken, accessValidator.access(db.UserRoles.Admin)],
  controller.getUser
);

router.put(
  "/update/:userId",
  [
    auth.verifyToken,
    accessValidator.access(db.UserRoles.Admin),
    accessValidator.mandatoryFields(["status"]),
    accessValidator.validKey("status", db.ParticipantStatus),
    validateSignUp.accessUser,
  ],
  controller.updateUser
);

router.post(
  "/deleteUser",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.deleteUser
);

router.post(
  "/deleteAllUser",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.deleteAllUser
);

router.post(
  "/generateToken",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.generateToken
);

router.post(
  "/upload-csv",
  upload.single("csvfile"),
  [
    auth.verifyToken,
    accessValidator.accessInstructor(),
    validateLogin.checkInputFile,
  ],
  controller.uploadCSV
);

router.post(
  "/edit-role",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.editRole
);

router.post("/reactivate", [auth.verifyToken, accessValidator.accessInstructor()], controller.reactivate);

router.post("/reset-password",
accessValidator.mandatoryFields(["email"]),
validateSignUp.checkUserExistence,
controller.resetPassword);

module.exports = router;
