const db = require("../models");
const { Op } = require("sequelize");
const utils = require("../controllers/utils.js");
const { project } = require("../models");

const {
  project: Project,
  judgeProjectMap: JudgeProjectMap,
  projectContent: ProjectContent,
  eventProjectMap: EventProjectMap,
  score: Score,
  winnerCategory: WinnerCategory,
  studentProjectMap: studentProjectMap,
  ClientProjectMap: ClientProjectMap,
  user: User,
  InstructorCourseMap: InstructorCourseMap,
  courseCode: CourseCode,
} = db;


exports.addProject = async (req, res) => {
  try {
    let { semester, year } = utils.getSemester(new Date());
    const clients_emails = req.body.clients.map(Email => Email.trim());
    let other_users = []
    let non_users = []
    
    let non_clients = []
    let clients = []
    // user existence validation for client representatives
    for (let userItr = 0; userItr < clients_emails.length; userItr++) {
      await User.findOne({where: {email: clients_emails[userItr]}})
      .then(async user => {
        if(!user){
          non_users.push(clients_emails[userItr]);
        }
        else{
          other_users.push(user);
          
          await ClientProjectMap.findOne({
            where:{
              clientId: user.userId
            }
          })
          .then( cpm => {
            if(!cpm){
              non_clients.push(user.email);
            }
            clients.push(user);
          } );
        }

      })
    }

    
    if (non_users.length > 0){
      non_users = non_users.map(Email => " " + Email);
      return res.status(400).json({
        error: {
          message: "User(s) not in system: " + non_users.toString(),
          response: non_users,
        },
      });
    }
    if(non_clients.length > 0){
      non_clients = non_clients.map(Email => " " + Email);
      return res.status(400).json({
        error: {
          message: "User(s) is not registered as a client: " + non_clients.toString(),
          response: non_clients,
        },
      });
    }
    
    // project add
    Project.add(
      req.body.name,
      utils.getdefaultValue(req.body.description, "N/A"),
      utils.getdefaultValue(req.body.courseCodeId, null),
      parseInt(req.body.projectType),
      req.user.userId,
      utils.getdefaultValue(parseInt(req.body.size), 4),
      utils.getdefaultValue(parseInt(req.body.year), parseInt(year)),
      utils.getdefaultValue(parseInt(req.body.semester), semester),
      utils.getdefaultValue(parseInt(req.body.parent_project_id), null)
    )
      .then(async (project) => {
        
        // if project added by client, add mapping in clientprojectmap
        if (req.body.role) {
          let role = req.body.role;
          if (role == "Clients") {
            let client_data = [];
            client_data.push({
              clientId: req.user.userId,
              projectId: project.projectId,
              semester: project.semester,
              year: project.year,
            });
            await ClientProjectMap.bulkCreate(client_data);
          }
        }

        // add links for that project
        if (req.body.links) {
          let link = req.body.links;
          let all_links = [];
          for (const key in link) {
            all_links.push({
              projectId: project.projectId,
              name: key,
              contentType: "LINKS",
              content: link[key],
              uploadedBy: req.user.userId,
            });
          }

          await ProjectContent.bulkCreate(all_links);
        }

        // add client representatives
        all_clients = []
        if (clients) {
          
          for (let client of clients) {
            // console.log("clientemail=", client.userId, client.email);
            all_clients.push({
              clientId: client.userId,
              projectId: project.projectId,
              semester: project.semester,
              year: project.year,
            });
          }
          await ClientProjectMap.bulkCreate(all_clients);
        }
        
        
        res.status(201).json({
          response_str: "Project added successfully !",
          response_data: {
            project_id: project.projectId,
          },
        });
        return;
      })
      .catch((err) => {
        console.log("addProject Project Add error - ", err);
        res.status(500).json({
          error: {
            message: "Internal server error ",
          },
        });
        return;
      });
  } catch (err) {
    console.log("addProject Project-Client-Link error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

// get a user {instructor/client} all projects
exports.getUserProject = async (req, res) => {
  const role = req.params.role;
  const id = req.user.userId;
  // let role = "Instructor";
  if (role === "Instructor") {
    let i = await db.sequelize.query(
      `select * from InstructorCourseMaps where InstructorId = :id and deletedAt is null;`,
      {
        replacements: { id: id },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    if (Object.keys(i).length != 0) {
      let response = {};
      response.currentProjects = [];
      response.pastProjects = [];

      const project_details = await db.sequelize.query(
        `select p.name, c.code, p.projectId, p.year, p.semester, p.courseCodeId from projects p left join InstructorCourseMaps i on i.CourseId = p.courseCodeId left join courseCodes c on i.CourseId = c.courseCodeId where (InstructorId = :id  and p.deletedAt is NULL and c.deletedAt is null and i.deletedAt is null) or (p.courseCodeId is null and p.deletedAt is NULL and c.deletedAt is null and i.deletedAt is null);`,
        {
          replacements: { id: id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      for (var t = 0; t < project_details.length; t++) {
        let client = await db.sequelize.query(
          `select u.userId, u.firstName, u.lastName, u.middleName from users u join ClientProjectMaps cpm on u.userId = cpm.clientId where cpm.projectId = :projId and cpm.deletedAt is null and u.deletedAt is null;`,
          {
            replacements: { projId: project_details[t].projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        project_details[t]["Clients"] = client;
        let courseName = "";
          if (project_details[t]["courseCodeId"] != null) {
            courseName = await db.sequelize.query(
              ` select name from courseCodes where courseCodeId = :id;`,
              {
                replacements: { id: project_details[t].courseCodeId },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            courseName = courseName[0].name;
          }
        project_details[t]["course_name"] = courseName;
        let link = await db.sequelize.query(
          `select name,content from projectContents where projectId = :id`,
          {
            replacements: { id: project_details[t].projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        project_details[t]["Links"] = link;
        let currentSemester = utils.getSemester(new Date());
        if (project_details[t].year > currentSemester.year) {
          response.currentProjects.push(project_details[t]);
        } else if (project_details[t].year === currentSemester.year) {
          if (
            db.Semesters[project_details[t].semester] >=
            db.Semesters[currentSemester.semester]
          ) {
            response.currentProjects.push(project_details[t]);
          } else {
            response.pastProjects.push(project_details[t]);
          }
        } else {
          response.pastProjects.push(project_details[t]);
        }
      }

      res.status(200).json({
        response_str: "Projects retrieved successfully for Instructor!",
        response_data: response,
      });
      return;
    } else {
      res.status(400).json({
        error: {
          message: "Invalid Instructor ID.",
        },
      });
      return;
    }
  } else {
    if (role === "Clients") {
      let c = await db.sequelize.query(
        `select * from ClientProjectMaps where clientId = :id and deletedAt is null;`,
        {
          replacements: { id: id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      if (Object.keys(c).length != 0) {
        let response = {};
        response.currentProjects = [];
        response.pastProjects = [];
        const project_details = await db.sequelize
          .query(
            `select p.name, p.year, p.semester, p.projectId, p.courseCodeId from projects p join ClientProjectMaps cpm on cpm.projectId = p.projectId  where cpm.clientId = :id and p.deletedAt is null and cpm.deletedAt is null; `,
            {
              replacements: { id: id },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          )
          .then(async (resp) => {
            if (resp) {
              let res1 = await addOtherUsers(resp, id);

              let currentSemester = utils.getSemester(new Date());
              for (let prj of res1) {
                if (prj.year > currentSemester.year) {
                  response.currentProjects.push(prj);
                } else if (prj.year === currentSemester.year) {
                  if (
                    db.Semesters[prj.semester] >=
                    db.Semesters[currentSemester.semester]
                  ) {
                    response.currentProjects.push(prj);
                  } else {
                    response.pastProjects.push(prj);
                  }
                } else {
                  response.pastProjects.push(prj);
                }
              }
              res.status(200).json({
                response_str: "Projects retrieved successfully for Client!",
                response_data: response,
              });
              return;
            }
          });
      } else {
        res.status(400).json({
          error: {
            message: "Invalid Client ID.",
          },
        });
        return;
      }
    } else {
      res.status(400).json({
        error: {
          message: "Invalid Role.",
        },
      });
      return;
    }
  }
};

async function addOtherUsers(project_details, id) {
  for (var i = 0; i < project_details.length; i++) {
    let res2 = await db.sequelize.query(
      `select u.firstName, u.lastName from ClientProjectMaps cpm inner join users u on cpm.clientId = u.userId where cpm.projectId = :projId and cpm.deletedAt is null and u.deletedAt is null; `,
      {
        replacements: { projId: project_details[i].projectId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    project_details[i]["Clients"] = res2;
    let courseName = "";
    if (project_details[i]["courseCodeId"] != null) {
      courseName = await db.sequelize.query(
        ` select name from courseCodes where courseCodeId = :id;`,
        {
          replacements: { id: project_details[i].courseCodeId },
          type: db.Sequelize.QueryTypes.SELECT,
        });
      courseName = courseName[0].name;
    }
    project_details[i]["course_name"] = courseName;
    let link = await db.sequelize.query(
      `select name,content from projectContents where projectId = :id`,
      {
        replacements: { id: project_details[i].projectId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    project_details[i]["Links"] = link;
  }

  return project_details;
}
exports.joinProject = (req, res) => {
  try {
    req.project.addUser(req.user);
    res.status(200).json({
      response_str: "Project joined successfully!",
      response_data: {
        project_id: req.project.ProjectId,
      },
    });
    return;
  } catch (err) {
    console.log("joinProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};
// req is body :{"projectId": 1}
exports.deleteProject = (req, res) => {
  try {
    Project.destroy({
      where: {
        projectId: req.body.projectId,
      },
      force: false,
    }).then(() => {
      res.status(200).json({
        response_str: "Project deleted successfully!",
        response_data: {},
      });
      return;
    });
  } catch (err) {
    console.log("deleteProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};
// req should be {projectId: 1, students:[email1, email2, email3], courseCodeId: 1, year: 2022}
exports.enrollProject = async (req, res, next) => {
  try {
    let project = req.project;
    if (req.body.students.length != 0) {
    const studentsEmails = req.body.students.map(Email => Email.trim());
    let { semester, year } = utils.getSemester(new Date());
    console.log("studentsEmails= ", studentsEmails);
    let other_users = []
    let non_users = []
    
    let non_students = []
    let students = []
    // user existence validation for client representatives
    for (let userItr = 0; userItr < studentsEmails.length; userItr++) {
      await User.findOne({where: {email: studentsEmails[userItr]}})
      .then(async user => {
        if(!user){
          non_users.push(studentsEmails[userItr]);
        }
        else{
          other_users.push(user);
          
          await studentProjectMap.findOne({
            where:{
              userId: user.userId
            }
          })
          .then( spm => {
            if(!spm){
              non_students.push(user.email);
            }
            students.push(user);
          } );
        }

      })
    }

    
    if (non_users.length > 0){
      non_users = non_users.map(Email => " " + Email);
      return res.status(400).json({
        error: {
          message: "User(s) not in system: " + non_users.toString(),
          response: non_users,
        }
      });
    }
    if(non_students.length > 0){
      non_students = non_students.map(Email => " " + Email);
      return res.status(400).json({
        error: {
          message: "User(s) is not registered as a client: " + non_students.toString(),
          response: non_students,
        }
      });
    }
    console.log("project=", project);
    students.forEach(async (studentID) => {
      await studentProjectMap
        .update(
          {
            projectId: project.projectId,
            position: db.StudentEnrollmentPosition.Enrolled,
            enrolledAt: new Date().toISOString().replace("T", " "),
          },
          {
            where: {
              userId: studentID.userId,
              position: db.StudentEnrollmentPosition.Unenrolled,
              projectID: null,
              year: year,
              semester: semester,
            },
            limit: 1           
          }
        )
        .then((result) => {
          console.log("result", result, " type:", typeof result);
          if (result[0] === 0) {
            // update was unsuccessfull
            studentProjectMap.create({
              projectId: project.projectId,
              position: db.StudentEnrollmentPosition.Enrolled,
              enrolledAt: new Date().toISOString().replace("T", " "),
              userId: studentID.dataValues.userId,
              year: year,
              semester: semester,
            });
          }
          let projectName = project.name;
          let name = utils.getdefaultValue(studentID.PrefferedName, studentID.userName) ;
          sendEmailProjectStatus(studentID.dataValues.email,"Enrolled",projectName, name);

        }).catch(err=>{
          console.log("update enrollment err-", err);
        })
    });
      
      res.status(200).json({
        response_str: "Project enrolled successfully!",
        response_data: {
          project_id: project.projectId,
        },
      });
      return;
    } else {
      console.log("Student length error - ");
      res.status(500).json({
        error: {
          message: "Zero students were requested.",
        },
      });
      return;
    }
  } catch (err) {
    console.log("enrollProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

async function sendEmailProjectStatus(email,position, project, name){
  let content = "Hello "+name+",<br> you have been "+position+" for project " + project + ". If you have any questions, please contact your instructor. <br><br> Thank you, <br> PM Tool Team";
  utils.sendEmail(
    "Update Regarding Project Status",
    content,
    email
  );
  return;
}

// req should be {"unenrollments": [
//									{projectId, students:{array of emails}, year},
//									{projectId:1, students:[email1, email2, email3]},
//                  {projectId: 1, students:[email1]}
// 									]}
exports.unenrollProject = async (req, res, next) => {
  try {
    
    const unenrollments = req.body.unenrollments;
    let { semester, year } = utils.getSemester(new Date());
    for (let itr = 0; itr < unenrollments.length; itr++) {
      let studentsEmails = unenrollments[itr].students;
      let projectID = unenrollments[itr].projectId;
      let project = await Project.findByPk(projectID).then(p => p.getBasicInfo);
      if (studentsEmails.length != 0) {
        // unenrolls every student given in array
        await User.findAll({
          where: {
            email: { [Op.or]: studentsEmails },
          },
        }).then((student_users) => {
          student_users.forEach(async (studentID) => {

            // unenrolls this student
            await studentProjectMap.update(
              {
                projectId: null,
                position: db.StudentEnrollmentPosition.Unenrolled,
              },
              {
                where: {
                  userId: studentID.dataValues.userId,
                  year: year,
                  semester: semester,
                  projectId: projectID,
                },
              }
            );
            //unenroll notification
            sendEmailProjectStatus(studentID.dataValues.email, "Unenrolled", project.name, utils.getdefaultValue(studentID.PrefferedName, studentID.userName));
          });
        });
        let unenrolls = studentsEmails.length;
        // enrolls student from waitlist for that project
        await studentProjectMap.findAll({
          where: {
            projectId: projectID,
            semester: semester,
            year: year,
            position: db.StudentEnrollmentPosition.Waitlist 
          },
          limit: unenrolls,
          order:[['enrolledAt', 'ASC']]
        }).then(waitListStudents => {
          waitListStudents.forEach(student=>{
            console.log("student= ", student.userName);
            student.position = db.StudentEnrollmentPosition.Enrolled;
            student.enrolledAt = new Date().toISOString().replace("T", " ");
            student.save();
            //enrolled notification
          sendEmailProjectStatus(student.email, "Enrolled", project.name, utils.getdefaultValue(student.PrefferedName, student.userName));
          })
        })
      } else {
        console.log("Student length error - ");
        res.status(400).json({
          error: {
            message: "Zero students were requested.",
          },
        });
        return;
      }
    }
    //check if it has any other property than unenrollments
    //i.e. we need to call enroll next()
    if (req.body.hasOwnProperty("students")) {
      next();
      return;
    }
    res.status(200).json({
      response_str: "Projects unenrolled successfully!",
      response_data: {
        project_id: req.body.projectId,
      },
    });
    return;
  } catch (err) {
    console.log("unenrollProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

// req should be {projectId: 1, students:[email1, email2, email3], year: 2022}
exports.waitlistProject = async (req, res) => {
  try {
    const project = req.project;
    const studentsEmails = req.body.students;
    
    if (studentsEmails.length != 0) {
      const alloted_students_count = await db.studentProjectMap.count({
          where: {
            projectId: project.projectId,
            position: {
              [Op.or]: [
                db.StudentEnrollmentPosition.Enrolled,
                db.StudentEnrollmentPosition.Finalised,
              ],
            },
          },
        });
        
      let avaliable_seats = project.teamSize - alloted_students_count;
      console.log("avaliable_seats=", avaliable_seats);
      console.log("project.teamSize=", project.teamSize);
      console.log("alloted_students_count=", alloted_students_count);
      User.findAll({
        where: {
          email: { [Op.or]: studentsEmails },
        },
      }).then((student_users) => {
        for(let studentID of student_users){
          if (avaliable_seats > 0) {
            studentProjectMap.update(
              {
                projectId: req.body.projectId,
                position: db.StudentEnrollmentPosition.Enrolled,
                enrolledAt: new Date().toISOString().replace("T", " "),
              },
              {
                where: {
                  userId: studentID.dataValues.userId,
                  position: db.StudentEnrollmentPosition.Unenrolled,
                  year: new Date().getFullYear(),
                },
              }
            );
            // enrolled notification
            sendEmailProjectStatus(studentID.dataValues.email, "Enrolled", req.project.name, utils.getdefaultValue(studentID.PrefferedName, studentID.userName));
            avaliable_seats -= 1;
          } else {
            console.log("Here");
            studentProjectMap.update(
              {
                projectId: req.body.projectId,
                position: db.StudentEnrollmentPosition.Waitlist,
                enrolledAt: new Date().toISOString().replace("T", " "),
              },
              {
                where: {
                  userId: studentID.dataValues.userId,
                  position: db.StudentEnrollmentPosition.Unenrolled,
                  year: new Date().getFullYear(),
                },
              }
            ).then(result=>{
              console.log("result=", result);
              if (result[0] === 0) {
                // update was unsuccessfull
                studentProjectMap.create({
                  projectId: project.projectId,
                  position: db.StudentEnrollmentPosition.Waitlist,
                  enrolledAt: new Date().toISOString().replace("T", " "),
                  userId: studentID.dataValues.userId,
                  year: project.year,
                  semester: project.semester,
                });
                sendEmailProjectStatus(studentID.dataValues.email, "Waitlisted", req.project.name, utils.getdefaultValue(studentID.PrefferedName, studentID.userName));
          }
            })
          }
        }
        
      });
      res.status(200).json({
        response_str: "Project waitlisted successfully !",
        response_data: {
          project_id: project.projectId,
        },
      });
      return;
    } else {
      console.log("Student length error - ", err);
      res.status(400).json({
        error: {
          message: "Zero students were requested.",
        },
      });
      return;
    }
  } catch (err) {
    console.log("waitListProject error - ");
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

// req should be {"allocations": [
//									{projectId, students:{array of emails}, year},
//									{projectId:1, students:[email1, email2, email3], year:2022}
// 									]}
exports.finaliseProject = async (req, res) => {
  try {
    const allocations = req.body.allocations;
    let response = {};
    response.successfulUpdate = [];
    response.failedUpdate = [];
    for (let itr = 0; itr < allocations.length; itr++) {
      let studentsEmails = allocations[itr].students;
      let projectID = allocations[itr].projectId;
      let project = await Project.findByPk(projectID).then(p => p.getBasicInfo);
      if (studentsEmails.length != 0) {
        await User.findAll({
          where: {
            email: { [Op.or]: studentsEmails },
          },
        }).then(async (student_users) => {
          for (
            let studentID = 0;
            studentID < student_users.length;
            studentID++
          ) {
            let result_check = await studentProjectMap.update(
              {
                position: db.StudentEnrollmentPosition.Finalised,
              },
              {
                where: {
                  userId: student_users[studentID]["userId"],
                  position: db.StudentEnrollmentPosition.Enrolled,
                  projectId: projectID,
                },
              }
            );
            if (result_check[0] == 0) {
              response.failedUpdate.push(student_users[studentID]["userId"]);
            }
            if (result_check[0] == 1) {
              response.successfulUpdate.push(
                student_users[studentID]["userId"]
              );

              sendEmailProjectStatus(student_users[studentID]["email"], "Finalized", project.name, utils.getdefaultValue(student_users[studentID]["PrefferedName"], student_users[studentID]["userName"]));
            }
          }
        });
      } else {
        console.log("Student length error - ");
        res.status(500).json({
          error: {
            message: "Zero students were requested.",
          },
        });
        return;
      }
    }

    res.status(200).json({
      response_str: "Projects finalised successfully!",
      response_data: response,
    });
    return;
  } catch (err) {
    console.log("finaliseProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.uploadContent = async (req, res) => {
  try {
    const projectId = utils.getdefaultValue(req.params.projectId, "");
    if (req.body.links) {
      let link = req.body.links;
      let all_links = [];
      for (const key in link) {
        all_links.push({
          projectId: projectId,
          name: key,
          contentType: "LINKS",
          content: link[key],
          uploadedBy: req.user.userId,
        });
      }

      await ProjectContent.bulkCreate(all_links);
      res.status(201).json({
        response_str: "Content posted successfully!",
        // response_data: cont,
      });
      return;
    } else {
      if (!req.file) {
        res.status(400).json({
          error: {
            message: "Invalid content cannot be empty!",
          },
        });
        return;
      }
      let fileType = "." + req.file.originalname.split(".").pop().trim();
      ProjectContent.add(
        projectId,
        req.file.originalname,
        req.body.content_type,
        utils.uploadFile(req.file.path, fileType),
        req.user.userId
      )
        .then(() => {
          res.status(201).json({
            response_str: "Content posted successfully!",
            response_data: {},
          });
          return;
        })
        .catch((err) => {
          console.log("uploadContent error - ", err);
          res.status(500).json({
            error: {
              message: "Internal server error!",
            },
          });
          return;
        });
    }
  } catch (err) {
    console.log("uploadContent error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updateProject = async (req, res) => {
  try {
    let clients_emails = req.body.clients.map(Email => Email.trim());
    let other_users = []
    let non_users = []
    
    let non_clients = []
    let clients = []
    // user existence validation for client representatives
    for (let userItr = 0; userItr < clients_emails.length; userItr++) {
      await User.findOne({where: {email: clients_emails[userItr]}})
      .then(async user => {
        if(!user){
          non_users.push(clients_emails[userItr]);
        }
        else{
          other_users.push(user);
          
          await ClientProjectMap.findOne({
            where:{
              clientId: user.userId
            }
          })
          .then( cpm => {
            if(!cpm){
              non_clients.push(user.email);
            }
            clients.push(user);
          } );
        }

      })
    }

    
    if (non_users.length > 0){
      non_users = non_users.map(Email => " " + Email);
      return res.status(400).json({
        error: {
          message: "User(s) not in system: " + non_users.toString(),
          response: non_users,
        },
      });
    }
    if(non_clients.length > 0){
      non_clients = non_clients.map(Email => " " + Email);

      return res.status(400).json({
        error: {
          message: "User(s) is not registered as a client: " + non_clients.toString(),
          response: non_clients,
        },
      });
    }

    let project = req.project;

    project.name = utils.getdefaultValue(req.body.name, project.name);
    project.description = utils.getdefaultValue(
      req.body.description,
      project.description
    );
    project.projectTypeId = utils.getdefaultValue(
      req.body.projectType,
      project.projectTypeId
    );
    project.courseCodeId = utils.getdefaultValue(
      req.body.course_code_id,
      project.courseCodeId
    );
    project.teamSize = utils.getdefaultValue(req.body.size, project.teamSize);
    project.parentProjectID = utils.getdefaultValue(
      req.body.parent_project_id,
      project.parentProjectID
    );
    project.year = utils.getdefaultValue(req.body.year, project.year);
    project.semester = utils.getdefaultValue(
      req.body.semester,
      project.semester
    );
    project
      .save()
      .then(async () => {
        if (req.body.links) {
          await db.sequelize.query(
            `delete from projectContents where projectId = :projId;`,
            {
              replacements: { projId: project.dataValues.projectId },
              type: db.Sequelize.QueryTypes.DELETE,
            }
          );
          let link = req.body.links;
          let all_links = [];
          for (const key in link) {
            all_links.push({
              projectId: project.dataValues.projectId,
              name: key,
              contentType: "LINKS",
              content: link[key],
              uploadedBy: req.user.userId,
            });
          }

          let cont = await ProjectContent.bulkCreate(all_links);
        }
        if (clients) {
          clients_emails = clients.map(client => client.email);
          let temp = await db.sequelize.query(
            `select clientId from ClientProjectMaps where projectId=:projectId and deletedAt is null;`,
            {
              replacements: { projectId: project.dataValues.projectId },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );
          let prev_clients = [];
          for (let user = 0; user < temp.length; user++) {
            prev_clients.push(temp[user]["clientId"]);
          }
          let new_clients = [];
          for (let user = 0; user < clients_emails.length; user++) {
            let client_id = await db.sequelize.query(
              `select userId from users where email = :email;`,
              {
                replacements: { email: clients_emails[user] },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            let presence = await db.sequelize.query(
              ` select clientId from ClientProjectMaps where clientId = :id and deletedAt is null;`,
              {
                replacements: { id: client_id[0].userId },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            if (presence.length != 0) {
              new_clients.push(client_id[0].userId);
            } else {
              return res.status(400).json({
                error: {
                  message: "User is not a client!",
                  response: clients_emails[user],
                },
              });
            }
          }
          let difference = prev_clients.filter((x) => !new_clients.includes(x));
          for (let i = 0; i < difference.length; i++) {
            ClientProjectMap.destroy({
              where: {
                clientId: difference[i],
                projectId: project.dataValues.projectId,
              },
              force: false,
            });
          }
          difference = new_clients.filter((x) => !prev_clients.includes(x));
          let all_clients = [];
          for (let user = 0; user < difference.length; user++) {
            all_clients.push({
              clientId: difference[user],
              projectId: project.dataValues.projectId,
              semester: project.dataValues.semester,
              year: project.dataValues.year,
            });
          }
          await ClientProjectMap.bulkCreate(all_clients);
        }
        if (req.files) {
          let projectContents = [];
          req.files.forEach((file) => {
            let fileType = "." + file.originalname.split(".").pop().trim();
            projectContents.push({
              projectId: project.projectId,
              name: file.originalname,
              contentType: db.ContentTypes.ProjectFile,
              content: utils.uploadFile(file.path, fileType),
              uploadedBy: req.user.userId,
            });
          });
          let test = await ClientProjectMap.bulkCreate(all_clients);
        }
        res.status(200).json({
          response_str: "Project updated successfully!",
          response_data: {
            project_id: project.projectId,
          },
        });
        return;
      })
      .catch((err) => {
        console.log("updateProject error - ", err);
        res.status(500).json({
          error: {
            message: "Internal server error!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("updateProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.getProjects = (req, res) => {
  try {
    // filter on project's name
    const name = utils.getdefaultValue(req.query.name, "");
    let query = {};
    if (name != "") {
      query.name = {
        [db.Sequelize.Op.like]: `%${name}%`,
      };
    }

    // filters on event-detail page to get projects that are attached n not-attached to event
    let excludeEventId = "";
    let includeEventId = "";
    if (req.query.event_id != undefined) {
      if (
        req.query.event_filter == undefined ||
        ![db.EventFilters.Include, db.EventFilters.Exclude].includes(
          req.query.event_filter
        )
      ) {
        res.status(400).json({
          error: {
            message: "Invalid filters passed!",
          },
        });
        return;
      }
      if (req.query.event_filter === db.EventFilters.Include) {
        includeEventId = req.query.event_id;
      } else {
        excludeEventId = req.query.event_id;
      }
    }

    // filter using course-ids on project
    let courseCodeIds = utils.getdefaultValue(req.query.course_codes, []);
    courseCodeIds =
      courseCodeIds instanceof Array
        ? courseCodeIds
        : JSON.parse(courseCodeIds);
    if (courseCodeIds.length > 0) {
      query.courseCodeId = {
        [db.Sequelize.Op.in]: courseCodeIds,
      };
    }

    Project.findAll({
      where: query,
      include: [
        {
          model: db.projectType,
        },
        {
          model: db.courseCode,
        },
        {
          model: db.user,
        },
        {
          model: db.projectContent,
        },
        {
          model: db.event,
          where: includeEventId ? { eventId: includeEventId } : {},
          required: includeEventId ? true : false, //make inner join if include query is used
        },
      ],
      order: [["createdAt", "DESC"]],
    })
      .then(async (projects) => {
        let response = {
          ongoing_projects: [],
          all_projects: [],
          my_projects: [],
        };
        if (req.user.role == db.UserRoles.Participant) {
          projects.forEach(function (project) {
            if (project.users.find((user) => user.userId === req.user.userId)) {
              response.my_projects.push(project.getBasicInfo);
            } else if (
              project.events.length == 0 ||
              project.events.find(
                (event) => event.endDate.getTime() > new Date().getTime()
              )
            ) {
              response.ongoing_projects.push(project.getBasicInfo);
            }
          });
        } else if (req.user.role == db.UserRoles.Admin) {
          if (includeEventId && projects.length > 0) {
            // identify all projects that are attached to a judge
            let eventProjectIds = [];
            projects.forEach((project) =>
              eventProjectIds.push(
                project.events[0].eventProjectMap.eventProjectId
              )
            );
            const results = await db.sequelize.query(
              `select ep.projectId, jp.judgeId, jp.judgeProjectId from eventProjectMaps ep  
						join judgeProjectMaps jp on jp.eventProjectId = ep.eventProjectId 
						where ep.eventProjectId IN (:eventProjectIds)`,
              {
                replacements: { eventProjectIds },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );

            const winnerMap = await EventProjectMap.getWinners(eventProjectIds);
            let projectWinnerMap = {};
            for (const key in winnerMap) {
              winnerMap[key].forEach((winner) => {
                if (!projectWinnerMap.hasOwnProperty(winner.project_id)) {
                  projectWinnerMap[winner.project_id] = [];
                }
                projectWinnerMap[winner.project_id].push({
                  winner_category_id: winner.winner_category_id,
                  winner_category_name: winner.winner_category_name,
                });
              });
            }

            // check if atleast one of the project is attached to judge
            if (results.length > 0) {
              // maintain relationship between project and judge
              let projectMap = {};
              let judgeIds = new Set();
              results.forEach((result) => {
                judgeIds.add(result.judgeId);
                if (!projectMap.hasOwnProperty(result.projectId)) {
                  projectMap[result.projectId] = [];
                }
                projectMap[result.projectId].push({
                  judgeProjectId: result.judgeProjectId,
                  judgeId: result.judgeId,
                });
              });

              // maintain map b/w judge_id and its objs
              let judgeMap = {};
              const judges = await User.findAll({
                where: {
                  userId: {
                    [db.Sequelize.Op.in]: Array.from(judgeIds),
                  },
                },
              });
              judges.forEach((judge) => (judgeMap[judge.userId] = judge));

              let projectObjMap = {};
              // get aggregated scores of the projects evaluated
              const scores = await Score.getAggScores(includeEventId);
              if (scores.length > 0) {
                projects.forEach(
                  (project) => (projectObjMap[project.projectId] = project)
                );
              }

              // give priority for the projects for which score has been given
              let scoredProjectIds = [];
              scores.forEach((score) => {
                const project = projectObjMap[score.projectId];
                scoredProjectIds.push(score.projectId);
                let projectInfo = project.getBasicInfo;
                projectInfo.winners =
                  projectWinnerMap[project.projectId] != undefined
                    ? projectWinnerMap[project.projectId]
                    : [];
                projectInfo.judges = [];
                if (projectMap.hasOwnProperty(project.projectId)) {
                  let projJudgeIds = new Set();
                  projectMap[project.projectId].forEach((obj) =>
                    projJudgeIds.add(obj.judgeId)
                  );
                  Array.from(projJudgeIds).forEach((judgeId) =>
                    projectInfo.judges.push(judgeMap[judgeId].getBasicInfo)
                  );
                }
                projectInfo.table_number =
                  project.events[0].eventProjectMap.tableNumber;
                projectInfo.avg_score = +score.avg_score.toFixed(2);
                response.ongoing_projects.push(projectInfo);
              });
              projects.forEach((project) => {
                if (!scoredProjectIds.includes(project.projectId)) {
                  let projectInfo = project.getBasicInfo;
                  projectInfo.judges = [];
                  if (projectMap.hasOwnProperty(project.projectId)) {
                    let projJudgeIds = new Set();
                    projectMap[project.projectId].forEach((obj) =>
                      projJudgeIds.add(obj.judgeId)
                    );
                    Array.from(projJudgeIds).forEach((judgeId) =>
                      projectInfo.judges.push(judgeMap[judgeId].getBasicInfo)
                    );
                  }
                  projectInfo.winners =
                    projectWinnerMap[project.projectId] != undefined
                      ? projectWinnerMap[project.projectId]
                      : [];
                  projectInfo.table_number =
                    project.events[0].eventProjectMap.tableNumber;
                  projectInfo.avg_score = 0;
                  response.ongoing_projects.push(projectInfo);
                }
              });
            } else {
              // no projects are attached to judges
              projects.forEach((project) => {
                let projectInfo = project.getBasicInfo;
                projectInfo.judges = [];
                projectInfo.table_number =
                  project.events[0].eventProjectMap.tableNumber;
                projectInfo.avg_score = 0;
                projectInfo.winners =
                  projectWinnerMap[project.projectId] != undefined
                    ? projectWinnerMap[project.projectId]
                    : [];
                response.ongoing_projects.push(projectInfo);
              });
            }
          } else {
            projects.forEach(function (project) {
              if (
                project.events.length == 0 ||
                (project.events.find(
                  (event) => event.endDate.getTime() > new Date().getTime()
                ) &&
                  (!excludeEventId ||
                    !project.events.find(
                      (event) => event.eventId == excludeEventId
                    )))
              ) {
                response.ongoing_projects.push(project.getBasicInfo);
              } else {
                response.all_projects.push(project.getBasicInfo);
              }
            });
          }
        }
        let downloadPath = "";
        if (req.query.download_excel === "TRUE") {
          exportProjectData = [];
          excelInput = {};
          ongoingProjects = [];
          all_projects = [];
          excelInput.ongoingProjects = response.ongoing_projects;
          excelInput.allProjects = response.all_projects;
          if (excelInput.ongoingProjects.length > 0) {
            excelInput.ongoingProjects.map((project) => {
              project.judge_list = extractEmail(
                req.query.event_id ? project.judges : []
              );
              project.team_list = extractEmail(project.team);
            });
          }
          if (excelInput.allProjects.length > 0) {
            excelInput.allProjects.map((project) => {
              project.judge_list = extractEmail(
                req.query.event_id ? project.judges : []
              );
              project.team_list = extractEmail(project.team);
            });
          }
          const eventName = req.query.event_id
            ? projects.length > 0
              ? projects[0].events[0].name
              : "All Projects"
            : null;
          const eventId = req.query.event_id ? req.query.event_id : null;
          downloadPath = utils.exportProjectData(
            excelInput.ongoingProjects,
            excelInput.allProjects,
            eventId,
            eventName
          );
        }
        res.status(200).json({
          response_str: "Projects retrieved successfully!",
          response_data: response,
          download_path: downloadPath,
        });
        return;
      })
      .catch((err) => {
        console.log("getProjects error - ", err);
        res.status(400).json({
          error: {
            message: "No projects available!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("getProjects error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error",
      },
    });
    return;
  }
};

exports.getProjectLineage = async (req, res) => {
  try {
    let current_project = req.project;

    let response = {
      project_history: [],
    };
    
    while (current_project != null) {
      let data = current_project.getBasicInfo;
      if(data.project_type_id){
        const typeName = await db.sequelize.query(
          `select projectType from projectTypes where projectTypeId=:id;`,
          {
            replacements: { id: data.project_type_id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        data["project_type_name"] = typeName[0]?.projectType;
      }else{
        data["project_type_name"] = "";
      }
      response.project_history.push(data);
      current_project = await Project.findOne({
        where: { projectId: current_project.parentProjectID },
      });
    }

    res.status(200).json({
      response_str: "Project Lineage retrieved successfully!",
      response_data: response,
    });
    return;
  } catch (err) {
    console.log("getProjectLineage error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

function extractEmail(project) {
  emails = "";
  project.forEach((obj) => {
    emails = emails + obj.email + ", ";
  });
  return emails;
}

exports.getProjectDetail = (req, res) => {
  try {
    const projectId = utils.getdefaultValue(req.params.projectId, "");
    if (projectId == "") {
      res.status(500).json({
        error: {
          message: "Invalid Project ID!",
        },
      });
      return;
    }
    Project.findOne({
      where: {
        projectId: projectId,
      },
      include: [
        {
          model: db.user,
        },
        {
          model: db.projectContent,
          include: [
            {
              model: db.user,
            },
          ],
        },
        {
          model: db.event,
          include: [
            {
              model: db.sponsor,
            },
            {
              model: db.winnerCategory,
            },
            {
              model: db.user,
            },
          ],
        },
      ],
    })
      .then(async (project) => {
        if (project == null || project.length == 0) {
          return res.status(400).json({
            error: {
              message: "Hello Invalid Project ID!",
            },
          });
        }
        let response = [];
        if (req.user.role == db.UserRoles.Participant) {
          const stat = await db.sequelize.query(
            `select position from studentProjectMaps where userId = :userId and projectId = :projId and deletedAt is null;`,
            {
              replacements: { userId: req.user.userId, projId: projectId },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );
          if (stat.length == 0) {
            response = project.getBasicInfo;
          } else {
            if (stat[0].position == db.StudentEnrollmentPosition.Finalised) {
              response = project.getBasicInfo;
            } else {
              response = project.getPublicInfo;
            }
          }
        } else {
          response = project.getBasicInfo;
        }
        const names = await db.sequelize.query(
          `select spm.userId,u.firstName, u.lastName,u.image from users u join studentProjectMaps spm on u.userId = spm.userId 
          where spm.projectId = :projectId and (spm.position = "FINALIZED" or spm.position = "ENROLLED") and u.deletedAt is null and spm.deletedAt is null;`,
          {
            replacements: { projectId: project.projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        for(let itr = 0;itr<names.length;itr++){
          if (names[itr].image != null)
            names[itr].image = names[itr].image.replace(
              "./db",
              `http://${process.env.MYSQL_HOST}:${process.env.PORT}/images/`);
              else
                names[itr].image = `http://${process.env.MYSQL_HOST}:${process.env.PORT}/images/default_profile_img.png`;
          }
        response["teams"] = names;
        let courseName = "";
          if (project["courseCodeId"] != null) {
            courseName = await db.sequelize.query(
              ` select name from courseCodes where courseCodeId = :id;`,
              {
                replacements: { id: project.courseCodeId },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            courseName = courseName[0].name;
          }
          response["course_name"] = courseName;
        let client = await db.sequelize.query(
          `select u.email from users u join ClientProjectMaps cpm on cpm.clientId = u.userId where cpm.projectId = :projId and cpm.deletedAt is null and u.deletedAt is null;`,
          {
            replacements: { projId: projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        
        let clients = [];

        client.forEach((c) => {
          clients.push(c.email);
        });
        response["Clients"] = clients;
        const typeName = await db.sequelize.query(
          `select projectType from projectTypes where projectTypeId=:id;`,
          {
            replacements: { id: response.project_type_id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        response["project_type_name"] = typeName[0].projectType;
        let eventIds = [];
        project.events.forEach((event) => eventIds.push(event.eventId));
        const eventProjMaps = await EventProjectMap.findAll({
          where: {
            eventId: {
              [db.Sequelize.Op.in]: eventIds,
            },
          },
        });
        let eventProjectIds = [];
        eventProjMaps.forEach((ep) => eventProjectIds.push(ep.eventProjectId));
        const eventWinnerMap = await EventProjectMap.getWinners(
          eventProjectIds
        );
        response.events = [];
        project.events.forEach((event) => {
          let eventResp = event.getDetail;
          eventResp.judges = [];
          eventResp.table_number = event.eventProjectMap.tableNumber;
          event.users.forEach((judge) =>
            eventResp.judges.push(judge.getBasicInfo)
          );
          eventResp.winners =
            eventWinnerMap[event.eventId] != undefined
              ? eventWinnerMap[event.eventId]
              : [];
          response.events.push(eventResp);
        });

        res.status(200).json({
          response_str: "Projects retrieved successfully!",
          response_data: response,
        });
        return;
      })
      .catch((err) => {
        console.log("getProjectDetail error - ", err);
        res.status(400).json({
          error: {
            message: "Invalid Project ID!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("getProjectDetail error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

// for students
exports.getCourseProjects = (req, res) => {
  try {
    const courseCodeId = utils.getdefaultValue(req.params.coursecodeId, "");
    Project.findAll({
      where: {
        courseCodeId: courseCodeId,
      },
      include: [
        {
          model: db.user,
        },
        {
          model: db.projectContent,
          include: [
            {
              model: db.user,
            },
          ],
        },
        {
          model: db.event,
          include: [
            {
              model: db.sponsor,
            },
            {
              model: db.winnerCategory,
            },
            {
              model: db.user,
            },
          ],
        },
      ],
    })
      .then(async (projects) => {
        if (projects == null || projects.length == 0) {
          return res.status(400).json({
            error: {
              message: "No Projects for given Course!",
            },
          });
        }
        let response = {};
        response.currentProjects = [];
        response.pastProjects = [];
        let currentSemester = utils.getSemester(new Date());
        for (let projId = 0; projId < projects.length; projId++) {
          let details = projects[projId].getDetail;
          const names = await db.sequelize.query(
            `select spm.userId,u.firstName, u.lastName from users u join studentProjectMaps spm on u.userId = spm.userId 
          where spm.projectId = :projectId and (spm.position = "FINALIZED" or spm.position = "ENROLLED") and spm.deletedAt is null and u.deletedAt is null;`,
            {
              replacements: { projectId: projects[projId].projectId },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );
          details["teams"] = names.length ? names : [];
          const typeName = await db.sequelize.query(
            `select projectType from projectTypes where projectTypeId=:id;`,
            {
              replacements: { id: details.project_type_id },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );
          details["project_type_name"] = typeName[0].projectType;
          let courseName = "";
          if (projects[projId]["courseCodeId"] != null) {
            courseName = await db.sequelize.query(
              ` select name from courseCodes where courseCodeId = :id;`,
              {
                replacements: { id: projects[projId].courseCodeId },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            courseName = courseName[0].name;
          }
          details["course_name"] = courseName;
          if (projects[projId].year === currentSemester.year) {
            if (
              db.Semesters[projects[projId].semester] ===
              db.Semesters[currentSemester.semester]
            ) {
              response.currentProjects.push(details);
            } else if (
              db.Semesters[projects[projId].semester] <
              db.Semesters[currentSemester.semester]
            ) {
              response.pastProjects.push(details);
            }
          } else if (projects[projId].year < currentSemester.year) {
            response.pastProjects.push(details);
          }
        }
        const stat = await db.sequelize.query(
          `select p.projectId, spm.position from projects p join studentProjectMaps spm on p.projectId = spm.projectId 
          where spm.userId = :id and p.courseCodeId = :courseCodeId and p.deletedAt is null and spm.deletedAt is null;`,
          {
            replacements: { id: req.user.userId, courseCodeId: courseCodeId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        response.enrolledProjectId = stat.length ? stat[0]?.projectId : 0;
        response.status = stat.length ? stat[0]?.position : null;
        res.status(200).json({
          response_str: "Projects retrieved successfully!",
          response_data: response,
        });
        return;
      })
      .catch((err) => {
        console.log("getCourseProjects error - ", err);
        res.status(500).json({
          error: {
            message: "Internal server error!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("getCourseProjects error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

// get projects through a course
exports.getUserCourseProject = async (req, res) => {
  const courseid = req.params.courseId;
  const id = req.user.userId;
  let i = await db.sequelize.query(
    `select * from InstructorCourseMaps where InstructorId = :id and deletedAt is null;`,
    {
      replacements: { id: id },
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  if (Object.keys(i).length != 0) {
    const project_details = await db.sequelize.query(
      `select p.name, c.code, p.projectId, p.semester, p.year, p.courseCodeId from projects p join InstructorCourseMaps i on i.CourseId = p.courseCodeId join courseCodes c on i.CourseId = c.courseCodeId where InstructorId = :id and p.courseCodeId=:courseId and p.deletedAt is null and c.deletedAt is null and i.deletedAt is null;`,
      {
        replacements: { id: id, courseId: courseid },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    let response = {};
    response.currentProjects = [];
    response.pastProjects = [];

    if (project_details.length == 0) {
      res.status(400).json({
        error: {
          message: "No Projects in Course",
        },
      });
      return;
    } else {
      for (var t = 0; t < project_details.length; t++) {
        let client = await db.sequelize.query(
          `select u.userId, u.firstName, u.lastName, u.middleName from users u join ClientProjectMaps cpm on u.userId = cpm.clientId where cpm.projectId = :projId and cpm.deletedAt is null and u.deletedAt is null;`,
          {
            replacements: { projId: project_details[t].projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        project_details[t]["Clients"] = client;
        let courseName = "";
          if (project_details[t]["courseCodeId"] != null) {
            courseName = await db.sequelize.query(
              ` select name from courseCodes where courseCodeId = :id;`,
              {
                replacements: { id: project_details[t].courseCodeId },
                type: db.Sequelize.QueryTypes.SELECT,
              }
            );
            courseName = courseName[0].name;
          }
        project_details[t]["course_name"] = courseName;
        let link = await db.sequelize.query(
          `select name,content from projectContents where projectId = :id`,
          {
            replacements: { id: project_details[t].projectId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        project_details[t]["Links"] = link;
        const codes = await CourseCode.findByPk(req.params.courseId, {
          attributes: ["semester", "year"],
        });

        const currentSemester = codes.dataValues;

        if (project_details[t].year > currentSemester.year) {
          response.currentProjects.push(project_details[t]);
        } else if (project_details[t].year == currentSemester.year) {
          if (
            db.Semesters[project_details[t].semester] >=
            db.Semesters[currentSemester.semester]
          ) {
            response.currentProjects.push(project_details[t]);
          } else {
            response.pastProjects.push(project_details[t]);
          }
        } else {
          response.pastProjects.push(project_details[t]);
        }
      }

      res.status(200).json({
        response_str: "Projects retrieved successfully for Course!",
        response_data: response,
      });
      return;
    }
  } else {
    res.status(400).json({
      error: {
        message: "User is not the Instructor for Given Course!",
      },
    });
    return;
  }
};
exports.exportStudentData = async (req, res) => {
  let data = await db.sequelize.query(
    `select u.firstName, u.middleName, u.lastName, u.email from users u join studentProjectMaps spm on spm.userId = u.userId and spm.userId in (select distinct userId from studentProjectMaps);`,
    {
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  if (data.length != 0) {
    let downloadPath = "";
    downloadPath = utils.studentData(data);
    res.status(200).json({
      response_str: "Student Details retrieved successfully!",
      response_data: data,
      download_path: downloadPath,
    });
    return;
  } else {
    res.status(400).json({
      error: {
        message: "No Students Available",
      },
    });
    return;
  }
};
exports.exportStudentAllocationData = async (req, res) => {
  let data = await db.sequelize.query(
    `select u.firstName, u.middleName, u.lastName, u.email, p.name, p.description from users u join studentProjectMaps spm on spm.userId = u.userId join projects p on p.projectId = spm.projectId where spm.deletedAt is null and u.deletedAt is null and p.deletedAt is null;`,
    {
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  if (data.length != 0) {
    let downloadPath = "";
    downloadPath = utils.studentProjectData(data);
    res.status(200).json({
      response_str: "Student Project Allocation retrieved successfully!",
      response_data: data,
      download_path: downloadPath,
    });
    return;
  } else {
    res.status(400).json({
      error: {
        message: "No Students Available",
      },
    });
    return;
  }
};
exports.exportClientData = async (req, res) => {
  let data = await db.sequelize.query(
    `select u.firstName, u.middleName, u.lastName, u.email from users u join ClientProjectMaps cpm on cpm.clientId = u.userId and cpm.clientId in (select distinct clientId from ClientProjectMaps) where cpm.deletedAt is null and u.deletedAt is null;`,
    {
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  if (data.length != 0) {
    let downloadPath = "";
    downloadPath = utils.clientData(data);
    res.status(200).json({
      response_str: "Client Details retrieved successfully!",
      response_data: data,
      download_path: downloadPath,
    });
    return;
  } else {
    res.status(400).json({
      error: {
        message: "No clients Available",
      },
    });
    return;
  }
};
exports.exportInstructorData = async (req, res) => {
  let data = await db.sequelize.query(
    `select u.firstName, u.middleName, u.lastName, u.email from users u join InstructorCourseMaps icm on icm.InstructorId = u.userId and icm.InstructorId in (select distinct InstructorId from InstructorCourseMaps);`,
    {
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  if (data.length != 0) {
    let downloadPath = "";
    downloadPath = utils.instructorData(data);
    res.status(200).json({
      response_str: "Instructor Details retrieved successfully!",
      response_data: data,
      download_path: downloadPath,
    });
    return;
  } else {
    res.status(400).json({
      error: {
        message: "No Instructor Available",
      },
    });
    return;
  }
};

async function addOtherUsers(project_details, id) {
  for (var i = 0; i < project_details.length; i++) {
    let res2 = await db.sequelize.query(
      `select u.firstName, u.lastName from ClientProjectMaps cpm inner join users u on cpm.clientId = u.userId where cpm.projectId = :projId and cpm.deletedAt is null and u.deletedAt is null; `,
      {
        replacements: { projId: project_details[i].projectId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    project_details[i]["Clients"] = res2;
    let courseName = "";
    if (project_details[i]["courseCodeId"] != null) {
      courseName = await db.sequelize.query(
        ` select name from courseCodes where courseCodeId = :id;`,
        {
          replacements: { id: project_details[i].courseCodeId },
          type: db.Sequelize.QueryTypes.SELECT,
        });
      courseName = courseName[0].name;
    }
    project_details[i]["course_name"] = courseName;
    let link = await db.sequelize.query(
      `select name,content from projectContents where projectId = :id`,
      {
        replacements: { id: project_details[i].projectId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    project_details[i]["Links"] = link;
  }

  return project_details;
}

//  required semester and year in body with key semester and year
// exports.getSemProjects = (req, res) => {
//   try {
//     const year = utils.getdefaultValue(req.body.year, "");
//     const semester = utils.getdefaultValue(req.body.semester, "");
//     Project.findAll({
//       where: {
//         semester: semester,
//         year: year,
//       },
//       include: [
//         {
//           model: db.user,
//         },
//         {
//           model: db.projectContent,
//           include: [
//             {
//               model: db.user,
//             },
//           ],
//         },
//         {
//           model: db.event,
//           include: [
//             {
//               model: db.sponsor,
//             },
//             {
//               model: db.winnerCategory,
//             },
//             {
//               model: db.user,
//             },
//           ],
//         },
//       ],
//     })
//       .then(async (projects) => {
//         let response = [];

//         for (let projId = 0; projId < projects.length; projId++) {
//           let details = projects[projId].getDetail;
//           let currentSemester = utils.getSemester(new Date());
//           const names = await db.sequelize.query(
//             `select spm.userId,u.firstName, u.lastName from users u join studentProjectMaps spm on u.userId = spm.userId 
//             where spm.projectId = :projectId and (spm.position = "FINALIZED" or spm.position = "ENROLLED") and spm.deletedAt is null and u.deletedAt is null;`,
//             {
//               replacements: { projectId: projects[projId].projectId },
//               type: db.Sequelize.QueryTypes.SELECT,
//             }
//           );
//           details["teams"] = names;
//           const typeName = await db.sequelize.query(
//             `select projectType from projectTypes where projectTypeId=:id;`,
//             {
//               replacements: { id: details.project_type_id },
//               type: db.Sequelize.QueryTypes.SELECT,
//             }
//           );
//           details["project_type_name"] = typeName[0].projectType;
//           response.push(details);
//         }

//         res.status(200).json({
//           response_str: "Projects retrieved successfully!!",
//           response_data: response,
//         });
//         return;
//       })
//       .catch((err) => {
//         console.log("getSemProjects error - ", err);
//         res.status(500).json({
//           error: {
//             message: "Internal server error!!",
//           },
//         });
//         return;
//       });
//   } catch (err) {
//     console.log("getSemProjects error - ", err);
//     res.status(500).json({
//       error: {
//         message: "Internal server error!!",
//       },
//     });
//     return;
//   }
// };

exports.getProjectEventScores = async (req, res) => {
  try {
    const judgeScoreMap = await Score.getByEventProject(
      req.params.eventId,
      req.params.projectId
    );

    let response = [];
    if (Object.keys(judgeScoreMap).length > 0) {
      const users = await User.findAll({
        where: {
          userId: {
            [db.Sequelize.Op.in]: Object.keys(judgeScoreMap),
          },
        },
      });
      let judgeMap = {};
      users.forEach((user) => (judgeMap[user.userId] = user));

      for (const judgeId in judgeScoreMap) {
        let scoreDetail = judgeMap[judgeId].getBasicInfo;
        scoreDetail.scores = judgeScoreMap[judgeId];
        scoreDetail.key = judgeId;
        response.push(scoreDetail);
      }
    }

    res.status(200).json({
      response_str: "Scores retrieved successfully!",
      response_data: response,
    });
    return;
  } catch (err) {
    console.log("getProjectEventScores error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.assignJudgesProject = async (req, res) => {
  try {
    const event = await db.event.findByPk(req.params.eventId);
    if (event.endDate.getTime() < new Date().getTime()) {
      res.status(400).json({
        error: {
          message:
            "Invalid. Event is already completed, cannot assign judges now.",
        },
      });
      return;
    }
    const judgeProjects = await JudgeProjectMap.findAll({
      where: {
        eventProjectId: req.eventProject.eventProjectId,
      },
    });

    let existingJudges = [];
    judgeProjects.forEach(async (jp) => {
      if (!req.body.judges.includes(jp.judgeId)) {
        await jp.destroy();
      } else {
        existingJudges.push(jp.judgeId);
      }
    });

    let judgeProjectObjs = [];
    req.judges.forEach((judge) => {
      if (!existingJudges.includes(judge.userId)) {
        judgeProjectObjs.push({
          eventProjectId: req.eventProject.eventProjectId,
          judgeId: judge.userId,
        });
      }
    });

    await JudgeProjectMap.bulkCreate(judgeProjectObjs);

    res.status(201).json({
      response_str: "Judges assigned successfully!",
      response_data: {},
    });
    return;
  } catch (err) {
    console.log("assignJudgesProject error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updateProjectEvent = async (req, res) => {
  try {
    const event = await db.event.findByPk(req.params.eventId);
    if (event.endDate.getTime() < new Date().getTime()) {
      res.status(400).json({
        error: {
          message:
            "Invalid. Event is already completed, cannot update table-number now.",
        },
      });
      return;
    }
    req.body.table_number = utils.getdefaultValue(req.body.table_number, 0);
    if (req.body.table_number != 0) {
      const ep = await EventProjectMap.findOne({
        where: {
          tableNumber: req.body.table_number,
          eventId: req.params.eventId,
        },
      });
      if (ep && ep.eventProjectId != req.eventProject.eventProjectId) {
        const project = await Project.findByPk(ep.projectId);
        const tableNumberStr = req.body.table_number.toString();
        res.status(400).json({
          error: {
            message: `TableNumber - ${tableNumberStr} is already assigned to ${project.name}`,
          },
        });
        return;
      }
    }
    req.eventProject.tableNumber = req.body.table_number;
    await req.eventProject.save();
    res.status(200).json({
      response_str: "EventProject updated successfully!",
      response_data: {},
    });
    return;
  } catch (err) {
    console.log("updateProjectEvent error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.assignWinner = async (req, res) => {
  try {
    const winnerCategory = await WinnerCategory.findOne({
      where: {
        winnerCategoryId: req.body.winner_category_id,
      },
      include: [
        {
          model: db.event,
          where: {
            eventId: req.params.eventId,
          },
          required: true,
        },
      ],
    });

    if (!winnerCategory) {
      res.status(400).json({
        error: {
          message: "Invalid winner-category-id for event!",
        },
      });
      return;
    }

    const result = await db.sequelize.query(
      `select projects.name from winners join eventProjectMaps as ep on winners.eventProjectId = ep.eventProjectId 
			join projects on ep.projectId = projects.projectId 
			where ep.eventId = :eventId and winners.winnerCategoryId = :winnerCategoryId`,
      {
        replacements: {
          eventId: req.params.eventId,
          winnerCategoryId: req.body.winner_category_id,
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
    if (result.length > 0) {
      res.status(400).json({
        error: {
          message: `${winnerCategory.name} is already assigned to ${result[0].name}!`,
        },
      });
      return;
    }

    await req.eventProject.addWinnerCategory(winnerCategory);

    res.status(201).json({
      response_str: "Winner posted successfully!",
      response_data: {},
    });
    return;
  } catch (err) {
    console.log("assignWinner error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.deleteWinner = async (req, res) => {
  try {
    const result = await db.sequelize.query(
      `DELETE FROM winners where eventProjectId = :eventProjectId`,
      {
        replacements: { eventProjectId: req.eventProject.eventProjectId },
        type: db.Sequelize.QueryTypes.DELETE,
      }
    );
    res.status(200).json({
      response_str: "Winner deleted successfully!",
      response_data: {},
    });
    return;
  } catch (err) {
    console.log("deleteWinner error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.assignProject = async (req, res) => {
  try {
    let { semester, year } = utils.getSemester(new Date());
    await User.findOne({
      where: {
        email: req.body.email,
      },
    }).then(async (user) => {
      if (!user) {
        res.status(400).json({
          error: {
            message: "User Not yet Registered",
          },
        });
        return;
      } else {
        console.log(user.userId);
        let projectDet = await Project.findOne({
          attributes: ["teamSize", "projectId"],
          where: {
            name: req.body.projectName,
          },
        });
        console.log(projectDet.teamSize);

        let projectCount = await studentProjectMap.count({
          where: {
            projectId: projectDet.projectId,
          },
        });
        let userDet = await studentProjectMap.findOne({
          where: {
            userId: user.userId,
            projectId: projectDet.projectId,
            semester: semester,
            year: year,
          },
        });
        if (projectCount < projectDet.teamSize) {
          if (!userDet) {
            await studentProjectMap.create({
              userId: user.userId,
              projectId: projectDet.projectId,
              semester: semester,
              year: year,
            });
          } else {
            res.status(400).json({
              error: {
                message: "User has been already registered for the project",
              },
            });
            return;
          }
        } else {
          if (!userDet) {
            let projectDetails = await project.findByPk(projectDet.projectId);
            projectDetails.teamSize = projectDet.teamSize + 1;
            await projectDetails.save();
            console.log("Now course is full");
            await studentProjectMap.create({
              userId: user.userId,
              projectId: projectDet.projectId,
              semester: semester,
              year: year,
            });
          } else {
            res.status(400).json({
              error: {
                message: "User has been already registered in the project",
              },
            });
            return;
          }
        }
        console.log(projectCount);
        res.status(200).json({
          response_str: "User assigned successfully!",
          response_data: {},
        });
        return;
      }
    });
  } catch (err) {
    console.log("Assign Project to User error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.getUnallocatedProjects = async (req, res) => {
  semester = req.query.semester;
  year = req.query.year;

  results = await db.sequelize.query(
    `select distinct b.projectId, b.name from (
      select projectId, count(1) as CurrentTeamCount from ` +
      process.env.MYSQL_DB +
      `.studentProjectMaps a 
      where a.projectId is not null
      group by projectId) a 
      inner join ` +
      process.env.MYSQL_DB +
      `.projects b 
      on a.projectId = b.projectId
      where a.CurrentTeamCount < b.teamSize and b.semester = '` +
      semester +
      `' and b.year = ` +
      year
  );

  console.log(results[0]);

  res.status(200).json({
    response_str: "Fetched Results",
    response_data: results[0],
  });
  return;
};
