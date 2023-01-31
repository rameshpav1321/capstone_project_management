const { studentProjectMap } = require("../models");
const { Op } = require("sequelize");
const db = require("../models");
const Project = db.project;
const Event = db.event;
const ScoreCategory = db.scoreCategory;
const EventProjectMap = db.eventProjectMap;

checkProjectByNameExistence = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      where: {
        name: req.body.name.trim(),
      },
    });
    if (project) {
      res.status(400).json({
        error: {
          message: `Invalid. Project - ${req.body.name} is already available.`,
        },
      });
      return;
    }
    next();
  } catch (err) {
    console.log("checkProjectByNameExistence-middleware error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!!",
      },
    });
    return;
  }
};

checkTeamSizeExceed = (req, res, next) => {
  const projectId = req.params.projectId;
  Project.findOne({
    where: {
      projectId: projectId,
    },
    include: [db.user, db.projectType],
  })
    .then(async (project) => {
      if (!project) {
        res.status(400).json({
          error: {
            message: "Invalid ProjectId.",
          },
        });
        return;
      }
      if (project.users.length >= project.teamSize) {
        res.status(400).json({
          error: {
            message:
              "Project team-size full. Please raise a request to Admin to join.",
            code: db.RequestTypes.TeamSize,
          },
        });
        return;
      }
      req.project = project;
      next();
    })
    .catch((err) => {
      console.log("checkTeamSizeExceed-middleware error error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

checkStudentTeamSizeExceed = (req, res, next) => {
  const project = req.project;
  db.studentProjectMap
    .count({
      where: {
        projectId: project.projectId,
        position: {
          [Op.or]: [
            db.StudentEnrollmentPosition.Enrolled,
            db.StudentEnrollmentPosition.Finalised,
          ],
        },
      },
    })
    .then((alloted_students_count) => {
      if (
        alloted_students_count + req.body.students.length >
        project.teamSize
      ) {
        res.status(400).json({
          error: {
            message:
              "Enrollment request failed. Some or all of the team members may get added to the waitlist. Do you wish to proceed?",
            code: db.RequestTypes.TeamSize,
          },
        });
        return;
      }
      next();
    })
    .catch((err) => {
      console.log("checkTeamSizeExceed-middleware error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

checkStudentMultipleProject = async (req, res, next) => {
  try {
    let multipleEnrollmentStudents = []
	for(studentEmailItr= 0; studentEmailItr<req.body.students.length; studentEmailItr++ ){
		
		let studentPosition = await db.sequelize.query(
			`select spm.position from studentProjectMaps spm join projects p on spm.projectId = p.projectId join users u on spm.userId = u.userId 
			where u.email = :userEmail and p.courseCodeId = :courseCodeId and spm.deletedAt is null and p.deletedAt is null;`,
			{
			  replacements: { userEmail: req.body.students[studentEmailItr], courseCodeId: req.project.courseCodeId},
			  type: db.Sequelize.QueryTypes.SELECT
			}
		);
		if(studentPosition[0]?.position === db.StudentEnrollmentPosition.Enrolled || studentPosition[0]?.position === db.StudentEnrollmentPosition.Finalised ||studentPosition[0]?.position === db.StudentEnrollmentPosition.Waitlist  ){
			multipleEnrollmentStudents.push(req.body.students[studentEmailItr]);
		}

	}
  if(multipleEnrollmentStudents.length > 0){
    res.status(400).json({
      error: {
        message: "Enrollment in multiple projects is not allowed. Following students are enrolled elsewhere: " + multipleEnrollmentStudents,
        code: db.RequestTypes.MultipleProject,
      },
      });
    return;

  }
  

    next();
  } catch (err) {
    console.log("checkStudentMultipleProject-middleware error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!!",
      },
    });
    return;
  }
};

checkMultipleProject = async (req, res, next) => {
  try {
    const results = await db.sequelize.query(
      `SELECT pu.projectId, ep.eventId from projectUserMaps pu left join eventProjectMaps ep 
			on pu.projectId = ep.projectId where pu.userId = :userId`,
      {
        replacements: { userId: req.user.userId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    if (results.length > 0) {
      if (results.find((result) => result.eventId === null)) {
        res.status(400).json({
          error: {
            message:
              "Participant cannot join multiple projects. Please raise a request to Admin to join.",
            code: db.RequestTypes.MultipleProject,
          },
        });
        return;
      }
      let eventIds = [];
      results.forEach((result) => eventIds.push(result.eventId));
      const events = await Event.findAll({
        where: {
          eventId: {
            [db.Sequelize.Op.in]: eventIds,
          },
        },
      });
      if (
        events.find((event) => event.endDate.getTime() > new Date().getTime())
      ) {
        res.status(400).json({
          error: {
            message:
              "Participant cannot join multiple projects. Please raise a request to Admin to join.",
            code: db.RequestTypes.MultipleProject,
          },
        });
        return;
      }
    }
    next();
  } catch (err) {
    console.log("checkMultipleProject-middleware error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!!",
      },
    });
    return;
  }
};

checkMultipleProjectCreation = async (req, res, next) => {
  try {
    if (req.user.role == db.UserRoles.Participant) {
      const projectUserObjs = await db.sequelize.query(
        `select projectId from projectUserMaps where userId=:userId`,
        {
          replacements: { userId: req.user.userId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      let projectIds = [];
      projectUserObjs.forEach((obj) => projectIds.push(obj.projectId));
      if (projectIds.length > 0) {
        const projects = await Project.findAll({
          where: {
            projectId: {
              [db.Sequelize.Op.in]: projectIds,
            },
          },
          include: [db.event],
        });
        if (projects.length > 0) {
          for (const project of projects) {
            if (
              project.events.length == 0 ||
              project.events.find(
                (event) => event.endDate.getTime() > new Date().getTime()
              )
            ) {
              res.status(400).json({
                error: {
                  message: "Joining into multiple projects is not allowed.",
                },
              });
              return;
            }
          }
        }
      }
      next();
    } else {
      next();
    }
  } catch (err) {
    console.log("checkMultipleProjectCreation-middleware error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!!",
      },
    });
    return;
  }
};

allowUpdate = (req, res, next) => {
  Project.findByPk(req.body.projectId)
    .then(async (project) => {
      if (!project) {
        res.status(400).json({
          error: {
            message: "Invalid ProjectId.",
          },
        });
        return;
      }
      // if (
      //   req.user.role != db.UserRoles.Admin &&
      //   req.user.userId != project.createdBy
      // ) {
      //   res.status(400).json({
      //     error: {
      //       message:
      //         "Invalid, only creator of the project is allowed to update.",
      //     },
      //   });
      //   return;
      // }
      let names = await db.sequelize.query(
        `select spm.userId,u.firstName, u.lastName from users u join studentProjectMaps spm on u.userId = spm.userId 
        where spm.projectId = :projectId and (spm.position = "FINALIZED" or spm.position = "ENROLLED") and u.deletedAt is null and spm.deletedAt is null;`,
        {
          replacements: { projectId: req.body.projectId},
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      if (names.length>req.body.size){
        return res.status(400).json({
          error: {
            message: `Invalid. Project already has more students enrolled than specified team-size!`,
          },
        });
      }
      if (req.body.name != undefined && req.body.name.trim() != project.name) {
        const existingProject = await Project.findOne({
          where: {
            name: req.body.name.trim(),
          },
        });
        if (existingProject) {
          res.status(400).json({
            error: {
              message: `Invalid. Project - ${req.body.name} is already available.`,
            },
          });
          return;
        }
      }
      req.project = project;
      next();
    })
    .catch((err) => {
      console.log("allowUpdate-middleware error error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

checkProjectExistence = (req, res, next) => {
  const projectId = req.params.projectId;
  Project.findOne({
    where: {
      projectId: projectId,
    },
  })
    .then(async (project) => {
      if (!project) {
        res.status(400).json({
          error: {
            message: "Invalid ProjectId.",
          },
        });
        return;
      }
      req.project = project;
      next();
    })
    .catch((err) => {
      console.log("checkProjectExistence-middleware error error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

addScoringCategory = (req, res, next) => {
  const scoringCategoryIds = req.body.scoring_categories;
  ScoreCategory.findAll({
    where: {
      scoreCategoryId: {
        [db.Sequelize.Op.in]: scoringCategoryIds,
      },
    },
  })
    .then((categories) => {
      if (categories.length != scoringCategoryIds.length) {
        res.status(400).json({
          error: {
            message: "Invalid ScoringCategoryIds passed!!",
          },
        });
        return;
      }
      req.scoreCategories = categories;
      next();
    })
    .catch((err) => {
      console.log("addScoringCategory-middleware error error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

accessProject = (req, res, next) => {
  projectId = req.params.projectId;
  Project.findOne({
    where: {
      projectId: projectId,
    },
  })
    .then((project) => {
      if (!project) {
        res.status(400).json({
          error: {
            message: "Invalid ProjectId.",
          },
        });
        return;
      }
      req.project = project;
      next();
    })
    .catch((err) => {
      console.log("accessProject-middleware error error - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

validateEventProjectExistence = (req, res, next) => {
  EventProjectMap.findOne({
    where: {
      eventId: req.params.eventId,
      projectId: req.params.projectId,
    },
  })
    .then((ep) => {
      if (!ep) {
        res.status(400).json({
          error: {
            message: "Invalid ProjectId.",
          },
        });
        return;
      }
      req.eventProject = ep;
      next();
    })
    .catch((err) => {
      console.log(
        "validateEventProjectExistence-middleware error error - ",
        err
      );
      res.status(500).json({
        error: {
          message: "Internal server error!!",
        },
      });
      return;
    });
};

const validateProject = {
  checkTeamSizeExceed: checkTeamSizeExceed,
  checkStudentTeamSizeExceed: checkStudentTeamSizeExceed,
  checkStudentMultipleProject: checkStudentMultipleProject,
  checkMultipleProject: checkMultipleProject,
  allowUpdate: allowUpdate,
  checkProjectExistence: checkProjectExistence,
  addScoringCategory: addScoringCategory,
  accessProject: accessProject,
  validateEventProjectExistence: validateEventProjectExistence,
  checkMultipleProjectCreation: checkMultipleProjectCreation,
  checkProjectByNameExistence: checkProjectByNameExistence,
};

module.exports = validateProject;
