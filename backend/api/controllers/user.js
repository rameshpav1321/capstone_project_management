const fs = require("fs");
const bcrypt = require("bcrypt");
const db = require("../models");
const config = require("../config/jwt.js");
const utils = require("../controllers/utils.js");
const {
  user: User,
  refreshToken: RefreshToken,
  project: Project,
  event: Event,
} = db;

const Op = db.Sequelize.Op;
const Roles = db.UserRoles;
const jwt = require("jsonwebtoken");
const {
  user,
  studentProjectMap,
  ClientProjectMap,
  InstructorCourseMap,
  courseCode,
  UserRoles,
  judgeEventMap,
} = require("../models");

exports.signup = async (req, res) => {
  try {
    let imagePath = "";
    if (req.file) {
      let fileType = "." + req.file.originalname.split(".").pop().trim();
      imagePath = utils.uploadFile(req.file.path, fileType);
    }

    User.create({
      email: req.body.email,
      password: req.body.password,
      role: UserRoles.Participant,
      //image: imagePath
    })
      .then(async (user) => {
        req.user = user;
        let jwtObj = {
          userId: user.userId,
          email: req.body.email,
          role: req.body.role,
        };
        if (req.body.role == Roles.Judge) {
          jwtObj.eventId = req.user.events[0].eventId;
        }
        const accessToken = jwt.sign(jwtObj, config.secret, {
          expiresIn: config.jwtExpiration,
        });
        let refreshToken = await RefreshToken.createToken(req.user);

        let { semester, year } = utils.getSemester(new Date());

        if (req.body.role == "Student") {
          studentProjectMap.create({
            userId: user.userId,
            year: new Date().getFullYear(),
            semester: semester,
          });
        }
        if (req.body.role == "Client") {
          ClientProjectMap.create({
            clientId: user.userId,
            year: year,
            semester: semester,
          });
        }

        res.status(200).json({
          response_str: "User registered successfully!",
          response_data: {
            user_id: user.userId,
            email: req.body.email,
            access_token: accessToken,
            refresh_token: refreshToken,
            role: req.body.role,
            semester: semester,
          },
        });
        return;
      })
      .catch((err) => {
        console.log("signup error - ", err);
        if (err.name === db.SequelizeValidationErrorItem) {
          res.status(400).json({
            error: {
              message: `Invalid email-id given.`,
            },
          });
          return;
        }
        res.status(500).json({
          error: {
            message: "Internal server error!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("signup error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.signupAdmin = (req, res) => {
  try {
    if (req.headers["admin-creation-code"] != process.env.ADMIN_CREATION_CODE) {
      res.status(400).json({
        error: {
          message: `Invalid Access-Code, cannot create admin.`,
        },
      });
      return;
    }
    User.create({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      middleName: utils.getdefaultValue(req.body.middle_name, ""),
      role: Roles.Admin,
      image: "",
    })
      .then((user) => {
        let {semester, year} = utils.getSemester(new Date());
        if(user){
          InstructorCourseMap.create({
            InstructorId: user.userId,
            semester: semester,
            year: year
          })
        }
        res.status(201).json({
          response_str: "User registered successfully!",
          response_data: {
            user_id: user.userId,
            role: user.Role,
          },
        });
        return;
      })
      .catch((err) => {
        console.log("signup error - ", err);
        res.status(500).json({
          error: {
            message: "Internal server error!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("signup error - ", err);
    if (err.name === db.SequelizeValidationErrorItem) {
      res.status(400).json({
        error: {
          message: `Invalid email-id given.`,
        },
      });
      return;
    }
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.login = async (req, res) => {
  try {
    let roles = [];
    if (req.body.passwordType == "Password") {
      const passwordIsValid = bcrypt.compareSync(
        req.body.password,
        req.user.password
      );
      if (!passwordIsValid) {
        res.status(401).json({
          error: {
            message: "UnAuthorized! Wrong password.",
          },
        });
        return;
      }
    } else {
      /*const tokenIsValid = bcrypt.compareSync(
				req.body.token, req.user.token);*/
      const tokenIsValid = req.body.token === req.user.tokenNo;
      if (!tokenIsValid && req.user.role != UserRoles.Judge) {
        res.status(401).json({
          error: {
            message: "UnAuthorized! Token is invalid. Check with instructor.",
          },
        });
        return;
      }
      /*console.log(new Date(String(req.user.tokenEnd)), new Date(), new Date(String(req.user.tokenStart)));
      console.log(new Date() <= new Date(String(req.user.tokenEnd))), 
      console.log(new Date(String(req.user.tokenStart)) >= new Date());*/
      if (
        !(
          new Date() <= new Date(String(req.user.tokenEnd)) ||
          new Date(String(req.user.tokenStart)) <= new Date()
        ) &&
        req.user.role != UserRoles.Judge
      ) {
        //
        res.status(401).json({
          error: {
            message: "UnAuthorized! Token expired. Check with instructor",
          },
        });
        return;
      }
    }
    const users = await User.findAll({
      attributes: ["userId", "role", "image"],
      where: {
        email: req.body.email,
        deletedAt: null,
      },
    });

    if (users.length == 0) {
      res.status(401).json({
        error: {
          message:
            "UnAuthorized! User Account is Blocked. Check with instructor",
        },
      });
      return;
    }
    let userId = users[0].dataValues.userId;
    let role = users[0].dataValues.role;

    const allocation = await studentProjectMap.findAll({
      where: {
        userId: userId,
      },
    });

    const client = await ClientProjectMap.findAll({
      where: {
        ClientId: userId,
      },
    });

    const instructor = await InstructorCourseMap.findAll({
      where: {
        instructorId: userId,
      },
    });

    const judge = await judgeEventMap.findAll({
      where:{
        judgeId: userId
      }
    });

    if (allocation[0]) {
      roles.push("Student");
    }

    if (client[0]) {
      roles.push("Client");
    }
    if (judge[0]) {
      roles.push("Judge");
    }
    if (instructor[0]) {
      roles.push("Instructor");
    }

    let jwtObj = {
      userId: userId,
      email: req.body.email,
      role: role,
      total_roles: roles,
    };
    if (role == Roles.Judge) {
      if (req.user?.events) jwtObj.eventId = req.user.events[0]?.eventId;
    }
    const accessToken = jwt.sign(jwtObj, config.secret, {
      expiresIn: config.jwtExpiration,
    });
    if (req.user.image != null)
      imageLink = req.user.image.replace(
        "./db",
        "http://localhost:" + process.env.PORT + "/images"
      );
    else imageLink = "";

    let refreshToken = await RefreshToken.createToken(req.user);

    response_data = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: userId,
      role: role,
      email: req.user.email,
      roles: roles,
      image: imageLink,
    };
    if (req.user.events != null)
      response_data["eventId"] = req.user.events[0]?.eventId;
    res.status(200).json({
      response_str: "User successfully loggedIn!",
      response_data: response_data,
    });
    return;
  } catch (err) {
    console.log("login error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.refreshToken = async (req, res) => {
  const requestToken = req.query.refresh_token;
  try {
    let refreshToken = await RefreshToken.findOne({
      where: {
        token: requestToken,
      },
    });

    if (!refreshToken) {
      res.status(403).json({
        error: {
          message:
            "Refresh token was expired. Please make a new signin request",
        },
      });
      return;
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.destroy({
        where: {
          refreshTokenId: refreshToken.refreshTokenId,
        },
      });
      res.status(403).json({
        error: {
          message:
            "Refresh token was expired. Please make a new signin request",
        },
      });
      return;
    }

    const user = await refreshToken.getUser();
    let jwtObj = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
    if (user.role == Roles.Judge) {
      jwtObj.eventId = refreshToken.eventId;
    }

    let newAccessToken = jwt.sign(jwtObj, config.secret, {
      expiresIn: config.jwtExpiration,
    });
    res.status(200).json({
      response_str: "RefreshToken generated successfully!",
      response_data: {
        access_token: newAccessToken,
        refresh_token: refreshToken.token,
        user_id: user.userId,
        role: user.role,
        email: user.email,
      },
    });
    return;
  } catch (err) {
    console.log("refreshToken error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.getProfile = (req, res) => {
  try {
    if (req.user.image != null)
      imageLink = req.user.image.replace(
        "./db",
        `http://${process.env.MYSQL_HOST}:${process.env.PORT}/images/`
      );
    else imageLink = "";

    res.status(200).json({
      response_str: "Profile retrieved successfully!",
      response_data: {
        body: req.user.getBasicInfo,
        image: utils.getdefaultValue(
          imageLink,

          `http://${process.env.MYSQL_HOST}:${process.env.PORT}/images/default_profile_img.png`
        ),
      },
    });
    return;
  } catch (err) {
    console.log("getProfile error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updateProfile = async (req, res) => {
  try {
    let user = req.user;
    user.firstName = utils.getdefaultValue(req.body.first_name, "");
    user.lastName = utils.getdefaultValue(req.body.last_name, "");
    user.middleName = utils.getdefaultValue(req.body.middle_name, "");
    user.PrefferedName = utils.getdefaultValue(req.body.PrefferedName, "");
    user.Github = utils.getdefaultValue(req.body.Github, user.Github);
    user.SocialLinks = utils.getdefaultValue(req.body.SocialLinks, "");
    user.Phone = utils.getdefaultValue(req.body.Phone, "");
    // lines 400-405
    let tempFilePath = "";
    if (req.file) {
      console.log("got file: ", req.file);
      tempFilePath = user.image;
      let fileType = "." + req.file.originalname.split(".").pop().trim();
      user.image = utils.uploadFile(req.file.path, fileType);
    }

    if (user.image != null)
      imageLink = user.image.replace(
        "./db",
        "http://localhost:" + process.env.PORT + "/images"
      );
    else imageLink = "";

    user
      .save()
      .then((user) => {
        // lines 433-441
        if (tempFilePath != "") {
          try {
            fs.unlinkSync(tempFilePath); //remove old file from server
          } catch (err) {
            console.log(
              `Failed to delete file from folder - ${tempFilePath} - ${err}`
            );
          }
        }
        res.status(200).json({
          response_str: "Profile updated successfully!",
          response_data: {
            user_id: user.userId,
            first_name: user.firstName,
            middle_name: user.middleName,
            last_name: user.lastName,
            email: user.email,
            image: user.image,
            imageLink: imageLink,
          },
        });
        return;
      })
      .catch((err) => {
        console.log("updateProfile error - ", err);
        res.status(500).json({
          error: {
            message: "Internal server error!",
          },
        });
        return;
      });
  } catch (err) {
    console.log("updateProfile error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.createUser = async (req, res) => {
  try {
    const body = req.body;
    const password = utils.generateRandomString(12);
    const today = new Date();
    let tomorrow =  new Date();
    tomorrow.setDate(today.getDate() + 1);
    const exists = await User.findOne({
      where: {
        email: body.email,
      },
      paranoid: false,
    }).then(async (found) => {
      if (found) {
        res.status(400).json({
          error: {
            message: `User is already registered.`,
          },
        });
        return;
      } else {
        let user = null;
        
        let { semester, year } = utils.getSemester(new Date());
        
        const roles = body.roles;
        user = await User.create({
          email: body.email,
          tokenNo: password,
          tokenStart: today,
          tokenEnd: tomorrow,
          role: db.UserRoles.Participant,
        }).then(async (newuser) => {
          if (!(roles[0] == db.UserRoles.Judge && roles.length == 1)) {
            const content =
              "Hello " +
              body.email +
              ",<br>Your account has been created on Capstone Project Management. <br><br> Please use credentials: <br>Email: " +
              body.email +
              "<br>Token: " +
              password +
              "<br><br>Thanks and Regards, <br>Capstone Team";
            utils.sendEmail(
              "Welcome to Capstone Project Management",
              content,
              body.email
            );
          }
          if (roles.includes(db.UserRoles.Instructor)) {
            newuser.role = db.UserRoles.Admin;
            await newuser.save();
              await InstructorCourseMap.create({
                InstructorId: newuser.userId,
                year: year,
                semester: semester
              });            
          }

          if (roles.includes(db.UserRoles.Student)) {
            await studentProjectMap.create({
              userId: newuser.userId,
              semester: semester,
              year: year,
            });
          }
          if (roles.includes(db.UserRoles.Client)) {
            await ClientProjectMap.create({
              clientId: newuser.userId,
              year: year,
              semester: semester,
            });
          }
          if (roles.includes(db.UserRoles.Judge)) {
            if(!roles.includes(db.UserRoles.Instructor)){
              newuser.role = db.UserRoles.Judge;
              await newuser.save();
            }            
            await judgeEventMap.create({
              judgeId: newuser.userId
            });
          }
        });
      }
    });
    return res.status(201).json({
      response_str: "User added succesfully",
      response_data: {
        email: body.email,
        role: body.roles,
      },
    });
  } catch (err) {
    console.log("error while creating user - ", err);
    if (err.name === db.SequelizeUniqueConstraintError) {
      res.status(400).json({
        error: {
          message: `Invalid. User - ${req.body.email} is already available.`,
        },
      });
      return;
    }
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.getUser = async (req, res) => {
  try {
    await User.findAll({
      where: {
        role: {
          [db.Sequelize.Op.in]: [db.UserRoles.Admin, db.UserRoles.Participant],
        },
      },
      order: [["createdAt", "DESC"]],
    }).then(async (users) => {
      const projects = await Project.findAll({
        include: [db.event, db.user],
      });
      let userProjectMap = {};
      projects.forEach((project) => {
        project.users.forEach((user) => {
          if (!userProjectMap.hasOwnProperty(user.userId)) {
            userProjectMap[user.userId] = [];
          }
          userProjectMap[user.userId].push(project);
        });
      });

      result = [];
      users.forEach((user) => {
        if (user.userId != req.user.userId) {
          let info = user.getParticipantInfo;
          if (userProjectMap.hasOwnProperty(user.userId)) {
            info.enrollment_status = db.EnrollmentStatus.Completed;
            for (const project of userProjectMap[user.userId]) {
              if (
                project.events.length == 0 ||
                project.events.find(
                  (event) => event.endDate.getTime() > new Date().getTime()
                )
              ) {
                info.enrollment_status = db.EnrollmentStatus.Ongoing;
                break;
              }
            }
          } else {
            info.enrollment_status =
              user.role == db.UserRoles.Admin
                ? ""
                : db.EnrollmentStatus.Unenrolled;
          }
          result.push(info);
        }
      });

      res.status(200).json({
        response_str: "Users retrieved successfully!",
        response_data: result,
      });
      return;
    });
  } catch (err) {
    console.log("error while retrieving users - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updateUser = async (req, res) => {
  try {
    let user = req.user;
    user.status = req.body.status;
    user.firstName = utils.getdefaultValue(req.body.first_name, user.firstName);
    user.lastName = utils.getdefaultValue(req.body.last_name, user.lastName);
    user.middleName = utils.getdefaultValue(
      req.body.middle_name,
      user.middleName
    );
    user.email = utils.getdefaultValue(req.body.email, user.email);
    await user.save();
    res.status(200).json({
      response_str: "User status updated successfully!",
      response_data: {
        user_id: user.userId,
        updated_status: user.status,
      },
    });
    return;
  } catch (err) {
    if (err.name === db.SequelizeValidationErrorItem) {
      res.status(400).json({
        error: {
          message: `Invalid email-id given.`,
        },
      });
      return;
    }
    if (err.name === db.SequelizeUniqueConstraintError) {
      res.status(400).json({
        error: {
          message: `Invalid. User - ${req.body.email} is already available.`,
        },
      });
      return;
    }
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updatePassword = async (req, res) => {
  try {
    let user = req.user;
    user.password = req.body.confirmPassword;
    await user.save();
    res.status(200).json({
      response_str: "User Password updated successfully!",
      response_data: {
        user_id: user.userId,
      },
    });
    return;
  } catch (err) {
    console.log("error while updating password - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.processCSV = async (req, res) => {
  console.log("Processing starts here");
  const today = new Date();
  let tomorrow =  new Date();
  tomorrow.setDate(today.getDate() + 1);
  //let fileType = "." + req.file.originalname.split('.').pop().trim();
  //await utils.uploadFileSync(req.file.path, fileType).then(file=>{
  console.log("File processing starts here");
  console.log(req.body.fileName);
  if (req.body.deleteFile) {
    fs.unlinkSync(req.body.fileName);
    res.status(200).json({
      response_str: "Deletion is done",
    });
    return;
  }
  fs.readFile(req.body.fileName, "utf-8", async (err, data) => {
    if (err) {
      console.log(err);
      res.status(400).json({
        error: {
          message: `Could not read csv`,
        },
      });
      return;
    } else {
      const rows = data.split("\n");

      if (rows.length == 1) {
        console.log(err);
        res.status(400).json({
          error: {
            message: `No fields in CSV to process`,
          },
        });
        return;
      }

      checkHeaders = rows[0].replace("\r", "").split(",");
      if (
        checkHeaders[0] != "Role" ||
        checkHeaders[1] != "Email" ||
        checkHeaders[3] != "Semester" ||
        checkHeaders[4] != "Year" ||
        checkHeaders[5] != "First Name" ||
        checkHeaders[6] != "Last Name"
      ) {
        res.status(400).json({
          error: {
            message: `Headers are inconsistent. Make sure that first column is Role and Second column is Email`,
          },
        });
        return;
      }

      columns = rows[1].replace("\r", "").split(",");
      console.log(columns);
      course = await courseCode.findOne({
        where: {
          code: columns[2],
        },
      });
      if (!course) {
        res.status(400).json({
          error: {
            message:
              `Course does not exist. Please create the create the course ` +
              columns[3],
          },
        });
        return;
      }
      console.log(course.courseCodeId);
      await db.sequelize.query(
        "update " +
          process.env.MYSQL_DB +
          ".studentProjectMaps set isActive = 0 where (projectId,semester,year) in (select projectId, semester, year from  " +
          process.env.MYSQL_DB +
          ".projects where courseCodeId = ?) ",
        {
          replacements: [course.courseCodeId],
        }
      );

      await db.sequelize.query(
        "update " +
          process.env.MYSQL_DB +
          ".ClientProjectMaps set isActive = 0 where (projectId,semester,year) in (select projectId, semester, year from  " +
          process.env.MYSQL_DB +
          ".projects where courseCodeId = ?) ",
        {
          replacements: [course.courseCodeId],
        }
      );

      await db.sequelize.query(
        "update " +
          process.env.MYSQL_DB +
          ".InstructorCourseMaps set isActive = 0 where CourseId = ? ",
        {
          replacements: [course.courseCodeId],
        }
      );

      for (let i = 1; i < rows.length; i++) {
        console.log(rows[i]);
        //if (rows[i] =='') continue;
        columns = rows[i].replace("\r", "").split(",");
        if (columns.length == 1) continue;
        await User.findOne({
          where: {
            email: columns[1],
          },
        }).then(async (user) => {
          if (user) {
            console.log("User already exists" + user.dataValues.userId);
            if (columns[0] == "Student") {
              const student = await studentProjectMap.findOne({
                where: {
                  userId: user.dataValues.userId,
                },
              });

              if (!student) {
                studentProjectMap.create({
                  userId: user.dataValues.userId,
                  year: columns[4],
                  semester: columns[3],
                });
              } else {
                await db.sequelize.query(
                  "update " +
                    process.env.MYSQL_DB +
                    ".studentProjectMaps set isActive = 1 where (projectId,semester,year) in (select projectId, semester, year from  " +
                    process.env.MYSQL_DB +
                    ".projects where courseCodeId = :courseCode) and userId = :userId ",
                  {
                    replacements: {
                      courseCode: course.courseCodeId,
                      userId: user.dataValues.userId,
                    },
                  }
                );
              }
            }

            if (columns[0] == "Instructor") {
              const instructor = await InstructorCourseMap.findOne({
                where: {
                  InstructorId: user.dataValues.userId,
                  year: columns[4],
                  semester: columns[3],
                  CourseId: course.courseCodeId,
                },
              });

              if (!instructor) {
                InstructorCourseMap.create({
                  InstructorId: user.dataValues.userId,
                  year: columns[4],
                  semester: columns[3],
                  CourseId: course.courseCodeId,
                  isActive: 1,
                }).then(async ins=>{
                  await User.findByPk(user.dataValues.userId).then(async found=>{
                    found.role = db.UserRoles.Admin;
                    await found.save();
                  });
                });
              } else {
                await db.sequelize.query(
                  "update " +
                    process.env.MYSQL_DB +
                    ".InstructorCourseMaps set isActive = 1 where CourseId = :course and  InstructorId = :instructor ",
                  {
                    replacements: {
                      course: course.courseCodeId,
                      instructor: user.dataValues.userId,
                    },
                  }
                );
              }
            }

            if (columns[0] == "Client") {
              const client = await ClientProjectMap.findOne({
                where: {
                  clientId: user.dataValues.userId,
                },
              });

              if (!client) {
                ClientProjectMap.create({
                  clientId: user.dataValues.userId,
                  year: columns[4],
                  semester: columns[3],
                });
              } else {
                await db.sequelize.query(
                  "update " +
                    process.env.MYSQL_DB +
                    ".ClientProjectMaps set isActive = 1 where (projectId,semester,year) in (select projectId, semester, year from  " +
                    process.env.MYSQL_DB +
                    ".projects where courseCodeId = :courseCode) and clientId = :userId ",
                  {
                    replacements: {
                      courseCode: course.courseCodeId,
                      userId: user.dataValues.userId,
                    },
                  }
                );
              }
            }
            if (columns[0] == "Judge") {
              if (user.dataValues.role != db.UserRoles.Judge) {
                const judgeuser = await User.findByPk(
                  user.dataValues.userId
                ).then(async (found) => {
                  found.role = db.UserRoles.Judge;
                  await found.save();
                  const judge = await judgeEventMap.findOne({
                    where: {
                      judgeId: user.dataValues.userId
                    }
                  });
                  if (!judge){
                    await judgeEventMap.create({
                      judgeId: user.dataValues.userId
                    });
                  }
                });
              }
            }
          } else {
            try {
              console.log("Processing " + columns[1]);
              if (columns[0] == "Student" || columns[0] == "Instructor") {
                const password = utils.generateRandomString(12);
                console.log("Password: " + password);
                const user = await User.create({
                  email: columns[1],
                  tokenNo: password,
                  tokenStart: today,
                  tokenEnd: tomorrow,
                  firstName: columns[5],
                  lastName: columns[6],
                  role: db.UserRoles.Participant,
                }).then((user) => {
                  const content =
                    "Hello " +
                    user.email +
                    ",<br>The instructor has added your account to the Project Management Tool. <br><br> Please use credentials: <br>Email: " +
                    user.email +
                    "<br>Token: " +
                    password +
                    "<br><br>Thanks and Regards, <br>PM Tool Team";
                  utils.sendEmail(
                    "Project Management Tool Credentials",
                    content,
                    user.email
                  );
                });
              } else {
                const token = utils.generateRandomString(12);
                const user = await User.create({
                  email: columns[1],
                  tokenNo: token,
                  tokenStart: today,
                  tokenEnd: tomorrow,
                  firstName: columns[5],
                  lastName: columns[6],
                  role: db.UserRoles.Participant,
                }).then((user) => {
                  if (columns[0] == "Client") {
                    const content =
                      "Hello " +
                      user.email +
                      ",<br>The instructor has added your account to the Project Management Tool. <br><br> Please use credentials: <br>Email: " +
                      user.email +
                      "<br>Token: " +
                      token +
                      "<br> Your token will expire at " +
                      (new Date() + 1) +
                      "<br><br>Thanks and Regards, <br>PM Tool Team";
                    utils.sendEmail(
                      "Project Management Tool Credentials",
                      content,
                      user.email
                    );
                  }
                });
              }
              const retUser = await User.findOne({
                where: {
                  email: columns[1],
                },
              });
              console.log("Intermediate search " + columns[1]);

              if (columns[0] == "Student") {
                await studentProjectMap.create({
                  userId: retUser.userId,
                  year: columns[4],
                  semester: columns[3],
                });
              }

              if (columns[0] == "Instructor") {
                await InstructorCourseMap.create({
                  InstructorId: retUser.userId,
                  year: columns[4],
                  semester: columns[3],
                  CourseId: course.courseCodeId,
                  isActive: 1,
                }).then(async ins=>{
                  await User.findByPk(retUser.userId).then(async found=>{
                    found.role = db.UserRoles.Admin;
                    await found.save();
                  })
                });
              }

              if (columns[0] == "Client") {
                await ClientProjectMap.create({
                  clientId: retUser.userId,
                  year: columns[4],
                  semester: columns[3],
                });
              }

              if (columns[0] == "Judge") {
                retUser.role = db.UserRoles.Judge;
                await retUser.save();
                await judgeEventMap.create({
                  judgeId:retUser.userId
                });
              }
            } catch (err) {
              console.log("error while processing csv - ", err);
              res.status(500).json({
                error: {
                  message: "Internal server error!",
                },
              });
              return;
            }
          }
        });
      }

      console.log(course.courseCodeId);
      /*await db.sequelize.query(
              'delete from '+process.env.MYSQL_DB+'.InstructorCourseMaps where isActive = 0 and CourseId = :course',
              {
                replacements: {course: course.courseCodeId}
              }
            );*/

      await InstructorCourseMap.destroy({
        where: {
          isActive: 0,
        },
      });

      /*await db.sequelize.query(
              'delete from '+process.env.MYSQL_DB+'.ClientProjectMaps where isActive = 0 and (projectId,semester,year) in (select projectId, semester, year from  '+process.env.MYSQL_DB+'.projects where courseCodeId = :courseCode)',
              {
                replacements:{courseCode: course.courseCodeId}
              }
            );*/
      await ClientProjectMap.destroy({
        where: {
          isActive: 0,
        },
      });

      /*await db.sequelize.query(
              'delete from '+process.env.MYSQL_DB+'.studentProjectMaps where isActive = 0 and (projectId,semester,year) in (select projectId, semester, year from  '+process.env.MYSQL_DB+'.projects where courseCodeId = :courseCode)',
              {
                replacements:{courseCode: course.courseCodeId}
              }
            );*/

      await studentProjectMap.destroy({
        where: {
          isActive: 0,
        },
      });

      fs.unlinkSync(req.body.fileName);

      res.status(200).json({
        response_str: "CSV File processed successfully",
      });
      return;
    }
  });

  //fs.unlinkSync(filePath);
};

exports.deleteUser = async (req, res) => {
  let { semester, year } = utils.getSemester(new Date());
  for (var i = 0; i < req.body.users.length; i++) {
    let email = req.body.users[i].email;
    let role = req.body.users[i].role;
    if (role == "Student") {
      results = await db.sequelize.query(
        `select d.userId, c.semester,c.year,c.ProjectId from ` +
          process.env.MYSQL_DB +
          `.InstructorCourseMaps a 
        inner join ` +
          process.env.MYSQL_DB +
          `.projects b on a.CourseId = b.courseCodeId
        inner join ` +
          process.env.MYSQL_DB +
          `.studentProjectMaps c on b.ProjectId = c.ProjectId
        inner join ` +
          process.env.MYSQL_DB +
          `.users d on c.userId = d.userId 
        where instructorId = :instructor and d.email = :email`,
        {
          replacements: { instructor: req.user.userId, email: email },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      await studentProjectMap.destroy({
        where: {
          userId: results[0].userId,
          semester: results[0].semester,
          year: new Date().getFullYear(),
          projectId: results[0].ProjectId,
        },
      });
    } else if (role == "Client") {
      results = await db.sequelize.query(
        `select d.userId, c.semester,c.year,c.ProjectId from ` +
          process.env.MYSQL_DB +
          `.InstructorCourseMaps a 
        inner join ` +
          process.env.MYSQL_DB +
          `.projects b on a.CourseId = b.courseCodeId
        inner join ` +
          process.env.MYSQL_DB +
          `.ClientProjectMaps c on b.projectId = c.ProjectId
        inner join ` +
          process.env.MYSQL_DB +
          `.users d on c.clientId = d.userId 
        where instructorId = :instructor and d.email = :email`,
        {
          replacements: { instructor: req.user.userId, email: email },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      await ClientProjectMap.destroy({
        where: {
          clientId: results[0].userId,
          semester: results[0].semester,
          year: new Date().getFullYear(),
          projectId: results[0].ProjectId,
        },
      });
    } else if (role == "Instructor") {
      let instructor = await User.findOne({
        where: {
          email: email,
        },
      });

      await InstructorCourseMap.destroy({
        where: {
          InstructorId: instructor.userId,
        },
      });
    } else {
      await User.destroy({
        where: {
          email: email,
        },
      });
    }
  }

  res.status(200).json({
    response_str: "Users are deleted successfully!",
    response_data: {
      user_id: user.userId,
    },
  });
  return;
};

exports.deleteAllUser = async (req, res) => {
  console.log(req.body);
  for (var i = 0; i < req.body.users.length; i++) {
    let userId = req.body.users[i].userId;
    //let delUser = await User.findByPk(userId);

    await studentProjectMap.destroy({
      where: {
        userId: userId,
      },
    });
    await ClientProjectMap.destroy({
      where: {
        clientId: userId,
      },
    });
    await InstructorCourseMap.destroy({
      where: {
        InstructorId: userId,
      },
    });
    await judgeEventMap.destroy({
      where: {
        judgeId: userId
      }
    });

    await User.destroy({
      where: {
        userId: userId,
      },
    });
  }
  res.status(200).json({
    response_str: "Users are deleted successfully!",
    response_data: {
      user_id: user.userId,
    },
  });
  return;
};

exports.generateToken = async (req, res) => {
  let users = req.body.users;
  const today = new Date();
  let tomorrow =  new Date();
  tomorrow.setDate(today.getDate() + 1);
  for (var i = 0; i < users.length; i++) {
    console.log(typeof users[i].userId);
    let user = await User.findByPk(users[i].userId);

    if (user.role == "Judge") {
      console.log(user.email + " is a Judge");
      const password = utils.generateRandomString(12);
      user.tokenNo = password;
      user.tokenStart = today;
      user.tokenEnd = tomorrow;
      user.save();
      /*const content =
        "Hello " +
        user.email +
        ",<br>The instructor has regenerated your token for the Project Management Tool. <br><br> Please use credentials: <br>Email: " +
        user.email +
        "<br>Token: " +
        password +
        "<br> Your token will expire at " +
        (new Date() + 1) +
        "<br><br>Thanks and Regards, <br>PM Tool Team";
      utils.sendEmail(
        "Project Management Tool Credentials",
        content,
        user.email
      );*/
    } else {
      await ClientProjectMap.findOne({
        where: {
          clientId: user.userId,
        },
      }).then((clientUser) => {
        if (clientUser) {
          const password = utils.generateRandomString(12);
          user.tokenNo = password;
          user.tokenStart = today;
          user.tokenEnd = tomorrow;
          user.save();
          const content =
            "Hello " +
            user.email +
            ",<br>The instructor has regenerated your token for the Project Management Tool. <br><br> Please use credentials: <br>Email: " +
            user.email +
            "<br>Token: " +
            password +
            "<br> Your token will expire at " +
            (new Date() + 1) +
            "<br><br>Thanks and Regards, <br>PM Tool Team";
          utils.sendEmail(
            "Project Management Tool Credentials",
            content,
            user.email
          );
        }
      });
    }
  }

  return res.status(201).json({
    response_str: "User Tokens added succesfully",
  });
};

exports.uploadCSV = async (req, res) => {
  let fileType = "." + req.file.originalname.split(".").pop().trim();
  await utils.uploadFileSync(req.file.path, fileType).then((file) => {
    if (!file) {
      return res.status(400).json({
        error: {
          message: `Could not read csv`,
        },
      });
    } else {
      StudentRole = [];
      NewUsers = [];
      ClientRole = [];
      JudgeRole = [];
      InstructorRole = [];
      DeletedRole = [];
      AddedUsers = [];

      console.log("Processing starts here");
      //let fileType = "." + req.file.originalname.split('.').pop().trim();
      //await utils.uploadFileSync(req.file.path, fileType).then(file=>{
      console.log("File processing starts here");
      //console.log(req.body.fileName);
      fs.readFile(file, "utf-8", async (err, data) => {
        if (err) {
          console.log(err);
          res.status(400).json({
            error: {
              message: `Could not read csv`,
            },
          });
          return;
        } else {
          const rows = data.split("\n");

          if (rows.length == 1) {
            console.log(err);
            res.status(400).json({
              error: {
                message: `No fields in CSV to process`,
              },
            });
            return;
          }

          checkHeaders = rows[0].replace("\r", "").split(",");
          if (checkHeaders[0] != "Role") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that first column is Role`,
              },
            });
            return;
          }

          if (checkHeaders[1] != "Email") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that Second column is Email`,
              },
            });
            return;
          }
          if (checkHeaders[3] != "Semester") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that third column is Semester`,
              },
            });
            return;
          }
          if (checkHeaders[4] != "Year") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that fourth column is Year`,
              },
            });
            return;
          }
          if (checkHeaders[5] != "First Name") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that fifth column is First Name`,
              },
            });
            return;
          }
          if (checkHeaders[6] != "Last Name") {
            res.status(400).json({
              error: {
                message: `Headers are inconsistent. Make sure that sixth column is Last Name`,
              },
            });
            return;
          }
          columns = rows[1].replace("\r", "").split(",");
          //console.log(columns);
          course = await courseCode.findOne({
            where: {
              code: columns[2],
            },
          });
          if (!course) {
            res.status(400).json({
              error: {
                message:
                  `Course does not exist. Please create the create the course ` +
                  columns[3],
              },
            });
            return;
          }
          console.log(course.courseCodeId);
          await db.sequelize.query(
            "update " +
              process.env.MYSQL_DB +
              ".studentProjectMaps set isActive = 0 where (projectId,semester,year) in (select projectId, semester, year from  " +
              process.env.MYSQL_DB +
              ".projects where courseCodeId = ?) ",
            {
              replacements: [course.courseCodeId],
            }
          );

          await db.sequelize.query(
            "update " +
              process.env.MYSQL_DB +
              ".ClientProjectMaps set isActive = 0 where (projectId,semester,year) in (select projectId, semester, year from  " +
              process.env.MYSQL_DB +
              ".projects where courseCodeId = ?) ",
            {
              replacements: [course.courseCodeId],
            }
          );

          await db.sequelize.query(
            "update " +
              process.env.MYSQL_DB +
              ".InstructorCourseMaps set isActive = 0 where CourseId = ? ",
            {
              replacements: [course.courseCodeId],
            }
          );

          for (let i = 1; i < rows.length; i++) {
            console.log(rows[i]);
            //if (rows[i] =='') continue;
            columns = rows[i].replace("\r", "").split(",");
            if (columns.length == 1) continue;
            await User.findOne({
              where: {
                email: columns[1],
              },
            }).then(async (user) => {
              if (user) {
                console.log("User already exists" + user.dataValues.userId);
                if (columns[0] == "Student") {
                  const student = await studentProjectMap.findOne({
                    where: {
                      userId: user.dataValues.userId,
                    },
                  });

                  if (!student) {
                    StudentRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Student" });
                  } else {
                    await db.sequelize.query(
                      "update " +
                        process.env.MYSQL_DB +
                        ".studentProjectMaps set isActive = 1 where (projectId,semester,year) in (select projectId, semester, year from  " +
                        process.env.MYSQL_DB +
                        ".projects where courseCodeId = :courseCode) and userId = :userId ",
                      {
                        replacements: {
                          courseCode: course.courseCodeId,
                          userId: user.dataValues.userId,
                        },
                      }
                    );
                  }
                }

                if (columns[0] == "Instructor") {
                  const instructor = await InstructorCourseMap.findOne({
                    where: {
                      InstructorId: user.dataValues.userId,
                      year: columns[4],
                      semester: columns[3],
                      CourseId: course.courseCodeId,
                    },
                  });

                  if (!instructor) {
                    InstructorRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Instructor" });
                  } else {
                    await db.sequelize.query(
                      "update " +
                        process.env.MYSQL_DB +
                        ".InstructorCourseMaps set isActive = 1 where CourseId = :course and  InstructorId = :instructor ",
                      {
                        replacements: {
                          course: course.courseCodeId,
                          instructor: user.dataValues.userId,
                        },
                      }
                    );
                  }
                }

                if (columns[0] == "Client") {
                  const client = await ClientProjectMap.findOne({
                    where: {
                      clientId: user.dataValues.userId,
                    },
                  });

                  if (!client) {
                    ClientRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Client" });
                  } else {
                    await db.sequelize.query(
                      "update " +
                        process.env.MYSQL_DB +
                        ".ClientProjectMaps set isActive = 1 where (projectId,semester,year) in (select projectId, semester, year from  " +
                        process.env.MYSQL_DB +
                        ".projects where courseCodeId = :courseCode) and clientId = :userId ",
                      {
                        replacements: {
                          courseCode: course.courseCodeId,
                          userId: user.dataValues.userId,
                        },
                      }
                    );
                  }
                }
                if (columns[0] == "Judge") {
                  const judge = await judgeEventMap.findOne({
                    where: {
                      judgeId: user.dataValues.userId
                    }
                  });
                  if(!judge){
                    AddedUsers.push({ email: columns[1], role: "Judge" });
                  }
                }
              } else {
                try {
                  console.log("Processing " + columns[1]);
                  NewUsers.push(columns[1]);
                  const retUser = await User.findOne({
                    where: {
                      email: columns[1],
                    },
                  });
                  console.log("Intermediate search " + columns[1]);

                  if (columns[0] == "Student") {
                    StudentRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Student" });
                  }

                  if (columns[0] == "Instructor") {
                    InstructorRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Instructor" });
                  }

                  if (columns[0] == "Client") {
                    ClientRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Client" });
                  }

                  if (columns[0] == "Judge") {
                    JudgeRole.push(columns[1]);
                    AddedUsers.push({ email: columns[1], role: "Judge" });
                  }
                } catch (err) {
                  console.log("error while processing csv - ", err);
                  res.status(500).json({
                    error: {
                      message: "Internal server error!",
                    },
                  });
                  return;
                }
              }
            });
          }

          let results = await db.sequelize.query(
            `select a.email, 'Student' as Role from ` +
              process.env.MYSQL_DB +
              `.users a 
              inner join ` +
              process.env.MYSQL_DB +
              `.studentProjectMaps b on a.userId = b.userId 
              where isActive = 0 and b.deletedAt is null
            union 
            select a.email, 'Client' as Role from ` +
              process.env.MYSQL_DB +
              `.users a 
              inner join ` +
              process.env.MYSQL_DB +
              `.ClientProjectMaps b on a.userId = b.clientId 
              where isActive = 0 and b.deletedAt is null
            union 
            select a.email, 'Instructor' as Role from ` +
              process.env.MYSQL_DB +
              `.users a 
              inner join ` +
              process.env.MYSQL_DB +
              `.InstructorCourseMaps b on a.userId = b.InstructorId 
              where isActive = 0 and b.deletedAt is null`
          );

          await db.sequelize.query(
            `update ` +
              process.env.MYSQL_DB +
              `.studentProjectMaps set isActive = null`
          );
          await db.sequelize.query(
            `update ` +
              process.env.MYSQL_DB +
              `.ClientProjectMaps set isActive = null`
          );
          await db.sequelize.query(
            `update ` +
              process.env.MYSQL_DB +
              `.InstructorCourseMaps set isActive = null`
          );

          var AddedMap = new Map();
          //console.log(AddedUsers);
          for (var i = 0; i < AddedUsers.length; i++) {
            if (!AddedMap.get(AddedUsers[i]["email"])) {
              AddedMap.set(AddedUsers[i]["email"], [AddedUsers[i]["role"]]);
            } else {
              newRole = AddedMap.get(AddedUsers[i]["email"]);
              newRole.push(AddedUsers[i]["role"]);
              console.log(newRole);
              AddedMap.set(AddedUsers[i]["email"], newRole);
            }
          }
          AddedUsers = [];
          for (var [key, value] of AddedMap) {
            AddedUsers.push({ email: key, role: value });
          }

          DeletedUsers = results[0];
          console.log(DeletedUsers);
          var DeletedMap = new Map();
          for (var i = 0; i < DeletedUsers.length; i++) {
            if (!DeletedMap.get(DeletedUsers[i]["email"])) {
              DeletedMap.set(DeletedUsers[i]["email"], [
                DeletedUsers[i]["Role"],
              ]);
            } else {
              newRole = DeletedMap.get(DeletedUsers[i]["email"]);
              newRole.push(DeletedUsers[i]["Role"]);
              DeletedMap.set(DeletedUsers[i]["email"], newRole);
            }
          }

          console.log(DeletedMap);

          DeletedUsers = [];
          for (var [key, value] of DeletedMap) {
            DeletedUsers.push({ email: key, role: value });
          }

          //console.log(AddedMap);

          res.status(200).json({
            response_str: "CSV File processed successfully",
            response_data: {
              Coursecode: course.name,
              DeletedRole: DeletedUsers,
              //NewClientRoles: ClientRole,
              //NewJudgeRoles: JudgeRole,
              //NewInstructorRoles: InstructorRole,
              //NewStudentRoles: StudentRole,
              //NewUsers: NewUsers,
              AddedUsers: AddedUsers,
              file: file,
            },
          });
          return;
        }
      });
    }
  });
};

exports.editRole = async (req, res) => {
  // const month = new Date().getMonth();
  // let semester="";
  // if (month>=0 && month<=3)
  //   semester="Spring";
  // else if(month>3 && month<=6)
  //   semester="Summer";
  // else
  //   semester="Fall";
  let { semester, year } = utils.getSemester(new Date());

  let userDet = req.body;
  await studentProjectMap
    .destroy({
      where: {
        userId: userDet.userId,
      },
    })
    .then(async (destroyed) => {
      if (userDet.roles.includes("Student")) {
        await studentProjectMap
          .findOne({
            where: {
              userId: userDet.userId,
            },
            paranoid: false,
          })
          .then(async (student) => {
            if (!student) {
              await studentProjectMap.create({
                userId: userDet.userId,
                semester: semester,
                year: new Date().getFullYear(),
              });
            } else {
              await studentProjectMap.restore({
                where: {
                  userId: userDet.userId,
                },
              });
            }
          });
      }
    });

  await ClientProjectMap.destroy({
    where: {
      clientId: userDet.userId,
    },
  }).then(async (client) => {
    if (userDet.roles.includes("Client")) {
      await ClientProjectMap.findOne({
        where: {
          clientId: userDet.userId,
        },
        paranoid: false,
      }).then(async (found) => {
        if (!found) {
          await ClientProjectMap.create({
            clientId: userDet.userId,
            semester: semester,
            year: new Date().getFullYear(),
          });
        } else {
          ClientProjectMap.restore({
            where: {
              clientId: userDet.userId,
            },
          });
        }
      });
    }
  });

  InstructorCourseMap.destroy({
    where: {
      InstructorId: userDet.userId,
    },
  }).then(async (instructor) => {
    if (userDet.roles.includes("Instructor")) {
      await InstructorCourseMap.findOne({
        where: {
          instructorId: userDet.userId,
        },
        paranoid: false,
      }).then(async (found) => {
        if (found) {
          InstructorCourseMap.restore({
            where: {
              InstructorId: userDet.userId,
            },
          });
        } else {
          await InstructorCourseMap.create({
            InstructorId: userDet.userId,
            semester: semester,
            year: new Date().getFullYear(),
          });
        }
      });
    }
  });

  await judgeEventMap.destroy({
    where: {
      judgeId: userDet.userId
    }
  }).then(async judge=>{
    if(userDet.roles.includes("Judge")){
      await judgeEventMap.findOne({
        where:{
          judgeId:userDet.userId
        },
        paranoid:false
      }).then(async (found) => {
        if (found){
          judgeEventMap.restore({
            where: {
              judgeId: userDet.userId
            }
          });
        }
        else {
          await judgeEventMap.create({
            judgeId: userDet.userId
          });
        }
      });
    }
  });

  await User.findByPk(userDet.userId).then(async (user) => {
    //console.log(user);
    user.role = UserRoles.Participant;
    await user.save().then(async (judge) => {
      if (userDet.roles.includes("Judge")) {
        judge.role = UserRoles.Judge;
        await judge.save();
      }
    });
  });
  res.status(200).json({
    response_str: "All entries processed",
  });
};

exports.reactivate = async (req, res) => {
  try {
    let users = req.body.users;
    //console.log(users);
    for (var i = 0; i < users.length; i++) {
      found = await User.findByPk(users[i].userId, { paranoid: false }).then(
        async (user) => {
          if (user) {
            //console.log(user);
            //let password = (Math.random() + 1).toString(36).substring(12);
            //user.password = password;
            await user.save().then(async (commit) => {
              /*const content =
                "Hello " +
                user.email +
                ",<br>The instructor has permanently added your account to the Project Management Tool. <br><br> Please use credentials: <br>Email: " +
                user.email +
                "<br>Password: " +
                password +
                "<br><br>Thanks and Regards, <br>PM Tool Team";
              utils.sendEmail(
                "Project Management Tool Credentials",
                content,
                user.email
              );*/
              await user.restore();
              console.log(user.userId);
              await studentProjectMap.restore({
                where: {
                  userId: user.userId,
                },
              });
              await InstructorCourseMap.restore({
                where: {
                  InstructorId: user.userId,
                },
              });
              await ClientProjectMap.restore({
                where: {
                  clientId: user.userId,
                },
              });
              await judgeEventMap.restore({
                where:{
                  judgeId:user.userId
                }
              });
            });
          }
        }
      );
    }
    res.status(200).json({
      response_str: "Account reactivated",
    });
  } catch (err) {
    console.log("reactivate error - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.resetPassword = async (req, res) => {
  try {
    let user = req.user;
    const tempPassword = utils.generateRandomString(7);;
    user.password = tempPassword;
    await user.save();

    const emailSubject = "Reset Password";
    const emailBody = `Hello ${user.userName}, A request to reset password was receieved. Please use the following temporary password: <h3> ${tempPassword} </h3> to login using this same email-id. For safety reasons, please update your password once logged-in.` ;
    console.log(emailBody);
    utils.sendEmail(emailSubject, emailBody, user.email );

    res.status(200).json({
      response_str: "User Password reset. Check Email and login using the password sent.",
      response_data: {
        user_id: user.userId,
      },
    });
    return;
  } catch (err) {
    console.log("error while resetting password - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

