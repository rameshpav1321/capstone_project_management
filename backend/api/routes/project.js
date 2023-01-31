const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: process.env.FILES_UPLOAD_PATH });

const db = require("../models");
const {
  auth,
  accessValidator,
  validateProject,
  validateEvent,
} = require("../middleware");
const controller = require("../controllers/project.js");
const { access } = require("../middleware/accessValidator");

router.post(
  "/add",
  upload.array("attachments"),
  [
    auth.verifyToken,
    // accessValidator.access([db.UserRoles.Admin, db.UserRoles.Participant]),
    accessValidator.mandatoryFields(["name", "projectType"]),
    validateProject.checkProjectByNameExistence,
    // validateProject.checkMultipleProjectCreation,
  ],
  controller.addProject
);

router.get(
  "",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin, db.UserRoles.Participant]),
  ],
  controller.getProjects
);

router.get("/:projectId/history", 
validateProject.checkProjectExistence,
controller.getProjectLineage);

router.get(
  "/:projectId/detail",
  [auth.verifyToken],
  controller.getProjectDetail
);

router.get(
  "/:projectId/event/:eventId/scores",
  [auth.verifyToken, accessValidator.access([db.UserRoles.Admin])],
  controller.getProjectEventScores
);

router.post(
  "/update",
  upload.array("attachments"),
  [
    auth.verifyToken,
    // accessValidator.access([db.UserRoles.Admin, db.UserRoles.Participant]),
    validateProject.allowUpdate,
  ],
  controller.updateProject
);

router.post(
  "/:projectId/join",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Participant]),
    validateProject.checkMultipleProject,
    validateProject.checkTeamSizeExceed,
  ],
  controller.joinProject
);

router.post(
  "/:projectId/enroll",
  [
    auth.verifyToken,
    accessValidator.mandatoryFields(["students"]),
    validateProject.checkProjectExistence,
    validateProject.checkStudentTeamSizeExceed,
    validateProject.checkStudentMultipleProject,
  ],
  controller.enrollProject
);

router.post(
  "/:projectId/allocate",
  [
    auth.verifyToken,
    accessValidator.mandatoryFields([
      "students",
      "courseCodeId",
      "unenrollments",
    ]),
    validateProject.checkProjectExistence,
    validateProject.checkStudentTeamSizeExceed,
  ],
  controller.unenrollProject,
  controller.enrollProject
);

router.delete(
  "/:projectId/delete",
  [auth.verifyToken],
  validateProject.checkProjectExistence,
  controller.deleteProject
);

router.post(
  "/unenroll",
  [auth.verifyToken],
  accessValidator.mandatoryFields(["unenrollments"]),
  controller.unenrollProject
);

router.post(
  "/finalise",
  [auth.verifyToken],
  accessValidator.mandatoryFields(["allocations"]),
  controller.finaliseProject
);

router.get("/:role/UserProject", [auth.verifyToken], controller.getUserProject);

router.get(
  "/:courseId/userCourseProject",
  [auth.verifyToken],
  controller.getUserCourseProject
);

router.post(
  "/:projectId/waitlist",
  [auth.verifyToken],
  accessValidator.mandatoryFields(["students"]),
  validateProject.checkProjectExistence,
  validateProject.checkStudentMultipleProject,
  controller.waitlistProject
);

router.post(
  "/:projectId/upload-content",
  upload.single("content"),
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin, db.UserRoles.Participant]),
    validateProject.checkProjectExistence,
  ],
  controller.uploadContent
);

router.post(
  "/:projectId/event/:eventId/assign-judges",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin]),
    accessValidator.mandatoryFields(["judges"]),
    validateProject.validateEventProjectExistence,
    validateEvent.validateJudges,
  ],
  controller.assignJudgesProject
);

router.post(
  "/:projectId/event/:eventId/winner",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin]),
    accessValidator.mandatoryFields(["winner_category_id"]),
    validateProject.validateEventProjectExistence,
  ],
  controller.assignWinner
);

router.delete(
  "/:projectId/event/:eventId/winner",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin]),
    validateProject.validateEventProjectExistence,
  ],
  controller.deleteWinner
);

router.put(
  "/:projectId/event/:eventId",
  [
    auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin]),
    validateProject.validateEventProjectExistence,
  ],
  controller.updateProjectEvent
);

router.get(
  "/:coursecodeId/projects",
  [auth.verifyToken],
  controller.getCourseProjects
);

// router.get("/semesterProject", [auth.verifyToken], controller.getSemProjects);

router.get(
  "/exportStudentData",
  [auth.verifyToken],
  controller.exportStudentData
);

router.get(
  "/exportClientData",
  [auth.verifyToken],
  controller.exportClientData
);

router.get(
  "/exportInstructorData",
  [auth.verifyToken],
  controller.exportInstructorData
);

router.get(
  "/exportStudentAllocationData",
  [auth.verifyToken],
  controller.exportStudentAllocationData
);

router.get(
  "/:courseId/userCourseProject",
  [auth.verifyToken],
  controller.getUserCourseProject
);

router.get(
  "/unAllocatedProjects",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.getUnallocatedProjects
);

router.post(
  "/assignProject",
  [auth.verifyToken, accessValidator.accessInstructor()],
  controller.assignProject
);
module.exports = router;
