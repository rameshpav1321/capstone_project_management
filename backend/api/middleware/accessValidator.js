
const { InstructorCourseMap } = require('../models');


access = (roles) => {
	return function(req, res, next) {
		try {
			if (!(roles.includes(req.user.role))) {
				res.status(400).json({
					error: {
						message: "Invalid Access!"
					}
				});
				return;
			}
			next();
		} catch (err) {
			console.log("access-middleware error - ", err);
			res.status(500).json({
				error: {
					message: "Internal server error!!"
				}
			});
			return;
		}
	}
};

mandatoryFields = (fields) => {
	return function(req, res, next) {
		try {
			const reqBody = req.fields || req.body;
			
			if (Object.keys(reqBody).length === 0) {
				res.status(400).json({
					error: {
						message: "Invalid. Request-Parameters are empty."
					}
				});
				return;
			}
			
			for (let i=0; i<fields.length; i++) {
				let item = fields[i];
				if (!reqBody[item] || reqBody[item] === "") {
					res.status(400).json({
						error: {
							message: `Invalid. Parameter - ${item} is empty.`
						}
					});
					return;
				}
			}
			next();
		} catch (err) {
			console.log("mandatoryFields-middleware error - ", err);
			res.status(500).json({
				error: {
					message: "Internal server error!!"
				}
			});
			return;
		}
	}
};

validKey = (key, obj) => {
	return function(req, res, next) {
		try {
			const reqBody = req.fields || req.body;
			if (!(Object.values(obj).includes(reqBody[key]))) {
				res.status(400).json({
					error: {
						message: `Invalid request-parameter ${reqBody[key]}`
					}
				});
				return;
			}
			next();
		} catch (err) {
			console.log("validKey-middleware error - ", err);
			res.status(500).json({
				error: {
					message: "Internal server error!!"
				}
			});
			return;
		}
	}
};

accessInstructor = (roles) => {
	return async function(req, res, next) {
		try {
			const instructor = await InstructorCourseMap.findAll({
				where:{
					instructorId: req.user.userId
				}
			});

			if (!instructor[0]){
				res.status(400).json({
					error: {
						message: "Invalid Access!"
					}
				});
				return;
			}
		next();
		}
		catch (err) {
			console.log("access-middleware error - ", err);
			res.status(500).json({
				error: {
					message: "Internal server error!!"
				}
			});
			return;
		}	
	}
}

const accessValidator = {
	access: access,
	mandatoryFields: mandatoryFields,
	validKey: validKey,
	accessInstructor: accessInstructor
};

module.exports = accessValidator;