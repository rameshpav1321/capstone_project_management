const db = require("../models");
const User = db.user;
const UserRoles = db.UserRoles;

checkUserExistence = (req, res, next) => {
	try {
		let query = {};
		let include = [];
		User.findOne({
			where:{
				email: req.body.email
			}
		}).then(user => {
			if(!user){
				res.status(400).json({
					error: {
						message: "Please sign up or contact instructor"
					}
				});
				return;
			}


		if (user.role == UserRoles.Judge) {
			include.push({
				model: db.event,
				through: {
					where: {
						code: req.body.token
					},
				},
				required: true});
		} else {
			query.email = req.body.email.toLowerCase();
		}
		query.email = req.body.email.toLowerCase();
		User.findOne({
			where: query,
			include: include
		}).then(user => {
			if (!user) {
				let errMsg = "Please SignUp!! User is not registered with us.";
				/*if (req.body.role == UserRoles.Admin) {
					errMsg = "Invalid credentials."
				} else if (req.body.role == UserRoles.Judge) {
					errMsg = "Please check your access code."
				}*/
				res.status(400).json({
					error: {
						message: errMsg
					}
				});
				return;
			}
			/*if (user.role != req.body.role) {
				res.status(400).json({
					error: {
						message: `Please login using ${user.role} dashboard.`
					}
				});
				return;
			}*/
			if (user.status == db.ParticipantStatus.Blocked) {
				res.status(400).json({
					error: {
						message: "Invalid your account is currently blocked. Please contact admin."
					}
				});
				return;
			}
			req.user = user;
			console.log("Validation successful");
			next();
		})
		.catch (err => {
			console.log("checkUserExistence-middleware error - ", err);
			res.status(500).json({ 
				error: {
					message: "Internal server error!!"
				}
			});
			return;
		});
	})
	} catch (err) {
		console.log("checkUserExistence-middleware error - ", err);
		res.status(500).json({
			error: {
				message: "Internal server error!!"
			}
		});
		return;
	}
};

mandatoryFields = (req, res, next) => {
	try {
		if (Object.keys(req.body).length === 0) {
			res.status(400).json({
				error: {
					message: "Invalid. Request-Parameters are empty."
				}
			});
			return;
		}
		/*
		if ((req.body.role === "") || !(Object.values(UserRoles).includes(req.body.role))) {
			res.status(400).json({
					error: {
						message: "Invalid user-role given."
					}
				});
			return;
		}
		
		let fields = []
		if (req.body.role === UserRoles.Judge) {
			fields = ["code"];
		} else {
			fields = ["email", "password"];
		}*/
		if (req.body.passwordType == "Password"){
			fields  = ["email","password","passwordType"];
		}
		else {
			fields = ["email", "token","passwordType"]
		}
		for (let i=0; i<fields.length; i++) {
			let item = fields[i];
			if (!req.body[item] || req.body[item] === "") {
				res.status(400).json({
					error: {
						message: `Invalid. Parameter - ${item} is empty.`
					}
				});
				return;
			}
		}
		console.log("Mandatory fields check complete");
		next();
	} catch (err) {
		console.log("user-mandatoryFields-middleware error - ", err);
		res.status(500).json({
			error: {
				message: "Internal server error!!"
			}
		});
		return;
	}
};

checkInputFile = (req,res,next) => {
	
	if (!req.file){
		res.status(400).json({
			error: {
				message: `CSV file not found`
			}
		});
		return;
	}
	if (req.file.mimetype!='text/csv'){
		res.status(400).json({
			error: {
				message: `Invalid File used. Only csv file is accepted`
			}
		});
		return;
		
	}
	next();
};

const validateLogin = {
	checkUserExistence: checkUserExistence,
	mandatoryFields: mandatoryFields,
	checkInputFile: checkInputFile
};

module.exports = validateLogin;