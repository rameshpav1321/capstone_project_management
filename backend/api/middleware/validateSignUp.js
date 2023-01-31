const db = require("../models");
const User = db.user;
const bcrypt = require("bcrypt");

checkEmailExistence = (req, res, next) => {
	User.findOne({
		where: {
			email: req.body.email
		}
	}).then(user => {
		if (user) {
			res.status(400).json({
				error: {
					message: "Email already in use. Proceed to Login"
				}
			});
			return;
		}
		next();
	})
	.catch (err => {
		console.log("checkEmailExistence-middleware error - ", err);
		res.status(500).json({ 
			error: {
				message: "Internal server error!!"
			}
		});
		return;
	});
};

accessUser = (req, res, next) => {
	User.findOne({
		where: {
			userId: req.params.userId
		}
	}).then(user => {
		if (!user) {
			res.status(400).json({
				error: {
					message: "User not found!"
				}
			});
			return;
		}
		if (req.body.status == db.ParticipantStatus.Blocked && user.role != db.UserRoles.Participant) {
			res.status(400).json({
				error: {
					message: "Invalid. Only Participant users can be blocked from accessing the dashboard!!"
				}
			});
			return;
		}
		req.user = user;
		next();
	})
	.catch (err => {
		console.log("checkEmailExistence-middleware error - ", err);
		res.status(500).json({ 
			error: {
				message: "Internal server error!!"
			}
		});
		return;
	});
};

checkUserExistence = (req,res,next) => {
	let body = req.body;
	User.findOne({
		where: {
			email: body.email
		}
	}).then(user => {
		if (!user) {
			res.status(400).json({
				error: {
					message: `No user with email-id: ${body.email}. Please sign-up or contact instructor.`
				}
			});
			return;
		}
		req.user = user;
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
}

validateUserPassword = (req,res,next) => {
	try{
		let body = req.body;
		let user = req.user;
		const passwordIsValid = bcrypt.compareSync(
			body.password,
			user.password
		);
		if(!passwordIsValid){
			res.status(400).json({
				error: {
					message: "Password is Incorrect."
				}
			});
			return;
		}
		next();
	}
	catch(err){
		console.log("validateUserPassword-middleware error - ", err);
		res.status(500).json({ 
			error: {
				message: "Internal server error!!"
			}
		});
		return;
	}
	
}

const validateSignUp = {
	checkEmailExistence: checkEmailExistence,
	checkUserExistence: checkUserExistence,
	accessUser: accessUser,
	validateUserPassword : validateUserPassword
};

module.exports = validateSignUp;