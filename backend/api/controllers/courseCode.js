const db = require("../models");
const fs = require("fs");
const { sequelize, InstructorCourseMap } = require("../models");
const { courseCode: CourseCode, user: User } = db;

const Op = db.Sequelize.Op;

exports.createCourseCode = async (req, res, next) => {
  try {
    const body = req.body;
    const code = await CourseCode.create({
      name: body.name,
      code: body.code,
      semester: body.semester,
      year: body.year,
    })
    let instructor = [];
    console.log()
    instructor.push({
      InstructorId: req.user.userId,
      CourseId: code.courseCodeId,
      semester: body.semester,
      year: body.year,
    });
    await InstructorCourseMap.bulkCreate(instructor); 
    return res.status(201).json({
      response_str: "CourseCode added succesfully",
      response_data: {
        id: code.courseCodeId,
      },
    });
  } catch (err) {
    console.log("createCourseCode - ", err);
    if (err.name === db.SequelizeUniqueConstraintError) {
      res.status(400).json({
        error: {
          message: `Invalid. CourseCode - ${req.body.code} is already available.`,
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

exports.getCourseCodes = async (req, res, next) => {
  try {
    instructor = await InstructorCourseMap.findOne({
      where: {
        InstructorId: req.user.userId
      }
    }).then(async user=>{
      if (user){

        allCourses=[];
        
        let response = []
        const codes = await CourseCode.findAll({
          where: {
            semester: req.query.semester,
            year: req.query.year
          },
          attributes: ["courseCodeId", "name", "code"],
          include :[
            {
              model: User,
              where : {
                userId : req.user.userId
              }
            }          
          ]
        });
        codes.forEach(function (code) {
            response.push(code.getBasicInfo);
          });
        
        if (response.length == 0) {
          res.status(400).json({
            error: {
              message: "No courses found!",
            },
          });
          return;
        }
      
        return res.status(200).json({
          response_str: "CourseCode details retrieved successfully",
          response_data: response,
        });
      
      }
      else {
        const code = req.query.code;
        let response = [];
        const codes = await CourseCode.findAll({
          attributes: ["courseCodeId", "name", "code"],
          where: {
            ...(req.query.semester && { semester: req.query.semester }),
            ...(req.query.code && { name: req.query.code }),
            ...(req.query.year && { year: req.query.year })
          },
        });
        codes.forEach(function (code) {
          response.push(code.getBasicInfo);
        });
      
        if (response.length == 0) {
          res.status(400).json({
            error: {
              message: "No courses found!",
            },
          });
          return;
        }
      
        return res.status(200).json({
          response_str: "CourseCode details retrieved successfully",
          response_data: response,
        });
      }
    });
  } catch (err) {
    console.log("getCourseCodes - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.updateCourseCode = async (req, res, next) => {
  try {
    const courseCodeId = req.params.courseCodeId;

    const body = req.body;

    const code = await CourseCode.findOne({
      where: {
        courseCodeId: courseCodeId,
      },
    });
    if (!code) {
      res.status(400).json({
        error: {
          message: "CourseCode not found to Update!",
        },
      });
      return;
    }
    const updatedCode = await CourseCode.update(
      {
        ...(body.name && { name: body.name }),
        ...(body.code && { code: body.code }),
      },
      {
        where: {
          courseCodeId: courseCodeId,
        },
      }
    );

    return res.status(200).json({
      response_str: "CourseCode updated successfully",
      response_data: updatedCode,
    });
  } catch (err) {
    console.log("updateCourseCode - ", err);
    if (err.name === db.SequelizeUniqueConstraintError) {
      res.status(400).json({
        error: {
          message: `Invalid. CourseCode - ${req.body.code} is already available.`,
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

exports.deleteCourseCode = async (req, res, next) => {
  console.log("delete....", req.body);
  try {
    await CourseCode.destroy({
      where: {
        courseCodeId: {
          [db.Sequelize.Op.in]: req.courseCodeIds,
        },
      },
      force: true,
    });
    return res.status(200).json({
      response_str: "CourseCode deleted successfully",
      response_data: {},
    });
  } catch (err) {
    console.log("deleteCourseCode - ", err);
    res.status(500).json({
      error: {
        message: "Internal server error!",
      },
    });
    return;
  }
};

exports.getSemesters = async (req, res, next) => {
    try {
      response = [];
      const semesters = await CourseCode.findAll({
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("semester")), "semester"],
          "year",
        ],
      });

      semesters.forEach(function (semester) {
        response.push(semester);
      });
      return res.status(200).json({
        response_str: "Semester details retrieved successfully",
        response_data: response,
      });
    } catch (err) {
      console.log("getSemesters - ", err);
      res.status(500).json({
        error: {
          message: "Internal server error!",
        },
      });
      return;
    }
  };
