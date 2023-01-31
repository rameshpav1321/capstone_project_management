const express = require("express");
const router = express.Router();
const controller = require("./../controllers/instructor");
const { auth, accessValidator, validateReference } = require("../middleware");
const db = require("../models");

router.delete(
  "/:instructorId/users/delete",
  [
    accessValidator.mandatoryFields(["users"]),
    validateReference.validateUserExistence,
  ],
  controller.deleteUser
);

router.delete(
  "/:instructorId/clients/delete",
  [
    accessValidator.mandatoryFields(["userIds"]),
    validateReference.validateUserExistence,
  ],
  controller.deleteClient
);

router.delete(
  "/:instructorId/instructors/delete",
  [
    accessValidator.mandatoryFields(["userIds"]),
    validateReference.validateUserExistence,
  ],
  controller.deleteInstructor
);

router.delete(
  "/:instructorId/students/delete",
  [
    accessValidator.mandatoryFields(["userIds"]),
    validateReference.validateUserExistence,
  ],
  controller.deleteStudent
);

router.get(
  "/:instructorId/students",
  // [accessValidator.mandatoryFields(["userIds"]),
  // validateReference.validateUserExistence],
  controller.getStudents
);

router.get(
  "/manageUsers",
  [auth.verifyToken],
  controller.manageUsers
);

router.get(
  "/manageClients",
  [auth.verifyToken],
  controller.manageClients
);

module.exports = router;
