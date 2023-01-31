const express = require('express');
const router = express.Router();
const formidableMiddleware = require('express-formidable');

const db = require("../models");
const { auth, accessValidator, validateProject } = require("../middleware");
const controller = require("../controllers/request.js");
const validateRequest = require('../middleware/validateRequest');

router.post('/:projectId/request',
    [auth.verifyToken,
    accessValidator.access([db.UserRoles.Participant]),
    accessValidator.validKey("request_type", db.RequestTypes),
    validateProject.checkProjectExistence,
    validateRequest.checkForAnyRequestExistence],
    controller.addRequest);

router.put('/:requestId',
    [auth.verifyToken,
    accessValidator.access([db.UserRoles.Admin]),
    validateRequest.checkRequestExistence,
    validateRequest.accessProject],
    controller.updateRequest);

router.get('',
    [auth.verifyToken],
    accessValidator.access([db.UserRoles.Admin, db.UserRoles.Participant]),
    controller.getRequest)

module.exports = router;
