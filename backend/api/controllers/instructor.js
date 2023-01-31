const db = require("../models");
const fs = require("fs");
const utils = require("../controllers/utils.js");
const {
  ClientProjectMap,
  studentProjectMap,
  InstructorCourseMap,
  emailLogs,
  project,
} = require("../models");
const { user: User, project: Project } = db;

const Op = db.Sequelize.Op;
const Roles = db.UserRoles;

exports.deleteUser = async (req, res, next) => {
  try {
    const userObjs = await db.sequelize.query(
      `select userId from Users u where u.email IN (:useremails)`,
      {
        replacements: { useremails: req.body.users },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    let user_ids = [];
    userObjs.forEach((userObj) => {
      user_ids.push(userObj.userId);
    });
    await User.update(
      { status: db.ParticipantStatus.Blocked },
      {
        where: {
          userId: {
            [db.Sequelize.Op.in]: user_ids,
          },
        },
      }
    );
    await User.destroy({
      where: {
        userId: {
          [db.Sequelize.Op.in]: user_ids,
        },
      },
      force: false,
    });

    await ClientProjectMap.destroy({
      where: {
        clientId: {
          [db.Sequelize.Op.in]: user_ids,
        },
      },
      force: false,
    });

    await studentProjectMap.destroy({
      where: {
        userId: {
          [db.Sequelize.Op.in]: user_ids,
        },
      },
      force: false,
    });

    await InstructorCourseMap.destroy({
      where: {
        InstructorId: {
          [db.Sequelize.Op.in]: user_ids,
        },
      },
      force: false,
    });

    return res.status(200).json({
      response_str: "Users deleted successfully",
      response_data: {},
    });
  } catch (err) {
    console.log("deleteUser error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    await ClientProjectMap.destroy({
      where: {
        clientId: {
          [db.Sequelize.Op.in]: req.body.userIds,
        },
      },
      force: false,
    });
    return res.status(200).json({
      response_str: "Clients deleted successfully",
      response_data: {},
    });
  } catch (err) {
    console.log("deleteClient error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    await studentProjectMap.destroy({
      where: {
        userId: {
          [db.Sequelize.Op.in]: req.body.userIds,
        },
      },
      force: false,
    });
    return res.status(200).json({
      response_str: "Students deleted successfully",
      response_data: {},
    });
  } catch (err) {
    console.log("deleteStudent error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.manageUsers = async (req, res) => {
  try {
    let data = await db.sequelize.query(
      `select distinct a.userId, a.email,a.firstName, a.lastName, 
      case when b.userId is not null and b.deletedAt is null then 'Student' end as StudentRole ,
      case when c.clientId is not null and c.deletedAt is null then 'Client' end as ClientRole,
      case when d.InstructorId is not null and d.deletedAt is null then 'Instructor' end as InstructorRole,
      case when e.judgeId is not null and e.deletedAt is null then 'Judge' end as JudgeRole
      from users a 
      left outer join studentProjectMaps b on a.userId = b.userId
      left outer join ClientProjectMaps c on a.userId = c.clientId
      left outer join InstructorCourseMaps d on a.userId = d.InstructorId
      left outer join judgeEventMaps e on a.userId = e.judgeId
      where a.deletedAt is null;`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    if (data.length == 0) {
      res.status(400).json({
        error: {
          message: "No Users available",
        },
      });
    } else {
      let response = [];
      for (let i = 0; i < data.length; i++) {
        let roles = [];
        if (data[i]["StudentRole"] != null) {
          roles.push("Student");
        }
        if (data[i]["ClientRole"] != null) {
          roles.push("Client");
        }
        if (data[i]["InstructorRole"] != null) {
          roles.push("Instructor");
        }
        if (data[i]["JudgeRole"] != null) {
          roles.push("Judge");
        }
        // response.push(roles);
        response.push({
          userId: data[i]["userId"],
          firstName: data[i]["firstName"],
          lastName: data[i]["lastName"],
          email: data[i]["email"],
          role: roles,
        });
      }
      return res.status(200).json({
        response_str: "Users retrieved successfully",
        response_data: response,
      });
    }
  } catch (err) {
    console.log("Manage User error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.manageClients = async (req, res) => {
  try {
    let data = await db.sequelize.query(
      `select distinct u.email,u.firstName, u.lastName, cpm.clientId from ClientProjectMaps cpm join users u on u.userId = cpm.clientId where u.deletedAt is null and cpm.deletedAt is null`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    if (data.length == 0) {
      res.status(400).json({
        error: {
          message: "No Clients available",
        },
      });
    } else {
      let response = [];
      for (let i = 0; i < data.length; i++) {
        let projects = await db.sequelize.query(
          `select p.name from projects p join ClientProjectMaps cpm on cpm.projectId = p.projectId where cpm.clientId = :client and p.deletedAt is null and cpm.deletedAt is null;`,
          {
            replacements: { client: data[i]["clientId"] },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        let temp = [];
        for (let j = 0; j < projects.length; j++) {
          temp.push(projects[j]["name"]);
        }

        response.push({
          firstName: data[i]["firstName"],
          lastName: data[i]["lastName"],
          clientId: data[i]["clientId"],
          email: data[i]["email"],
          project: temp,
          clientId: data[i]["clientId"],
        });
      }
      return res.status(200).json({
        response_str: "Users retrieved successfully",
        response_data: response,
      });
    }
  } catch (err) {
    console.log("Manage User error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.deleteInstructor = async (req, res, next) => {
  try {
    await InstructorCourseMap.destroy({
      where: {
        InstructorId: {
          [db.Sequelize.Op.in]: req.body.userIds,
        },
      },
      force: false,
    });
    return res.status(200).json({
      response_str: "Instructors deleted successfully",
      response_data: {},
    });
  } catch (err) {
    console.log("deleteInstructor error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};
exports.getStudents = async (req, res, next) => {
  try {
    const results = await db.sequelize.query(
      `select p.name as projectName, p.projectId , spm.userId, p.courseCodeId, cc.name as courseName, spm.position, spm.semester , spm.year, u.email , u.PrefferedName, u.Github as githubId , u.firstName, u.lastName, u.image  from studentProjectMaps spm 
      left join projects p on p.projectId = spm.projectId 
      left join courseCodes cc on cc.courseCodeId = p.courseCodeId 
      join users u on u.userId = spm.userId
      where p.deletedAt is null;
      `,
      {
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    
    return res.status(200).json({
      response_str: "All students returned successfully",
      response_data: results,
    });
  } catch (err) {
    console.log("getStudent error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};
