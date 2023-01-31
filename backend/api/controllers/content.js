const fs = require('fs');
const path = require('path');
const utils = require("../controllers/utils.js");
const moment = require("moment");
const uuid = require("uuid");
const dotenv = require("dotenv").config().parsed;
const excelJS = require("exceljs");
const db = require("../models");
const { project: Project } = db;

const templates = {
	Judge: {
		name: "JUDGE",
		headers: [
			{
				header: "First Name",
				key: "first_name",
				width: 20,
				mandatory: true
			},
			{
				header: "Middle Name",
				key: "middle_name",
				width: 20,
				mandatory: false
			},
			{
				header: "Last Name",
				key: "last_name",
				width: 20,
				mandatory: true
			},
			{
				header: "Email",
				key: "email",
				width: 25,
				mandatory: true
			}],
		sheetName: "Judges",
		internal: false
	},
	Event: {
		name: 'EVENT',
		headers: [
			{
				header: "Name",
				key: "name",
				width: 20,
				mandatory: true
			},
			{
				header: "Location",
				key: "location",
				width: 30,
				mandatory: false
			},
			{
				header: "Description",
				key: "description",
				width: 30,
				mandatory: false
			},
			{
				header: "StartDate(UTC)",
				key: "start_date",
				width: 30,
				mandatory: true
			},
			{
				header: "EndDate(UTC)",
				key: "end_date",
				width: 30,
				mandatory: true
			}],
		sheetName: "Events",
		internal: false
	},
	Project: {
		name: 'PROJECT',
		headers: [
			{
				header: "Name",
				key: "name",
				width: 30,
				mandatory: true
			},
			{
				header: "Project Type",
				key: "project_type_name",
				width: 15,
				mandatory: true
			},
			{
				header: "Course Code",
				key: "course_code",
				width: 15,
				mandatory: true
			},
			{
				header: "Description",
				key: "description",
				width: 30,
				mandatory: false
			},
			{
				header: "Team Size",
				key: "team_size",
				width: 15,
				mandatory: true
			},
			{
				header: "Team Members",
				key: "team",
				width: 50,
				mandatory: false
			},
			{
				header: "Client Name",
				key: "client_name",
				width: 20,
				mandatory: false
			},
			{
				header: "Client Company",
				key: "client_company",
				width: 20,
				mandatory: false
			},
			{
				header: "Client Email",
				key: "client_email",
				width: 20,
				mandatory: false
			},
			{
				header: "Communication Link",
				key: "communication_Link",
				width: 20,
				mandatory: false
			},
			{
				header: "Scheduler Link",
				key: "scheduler_Link",
				width: 20,
				mandatory: false
			},
			{
				header: "Code Link",
				key: "code_Link",
				width: 20,
				mandatory: false
			},
			{
				header: "Parent Project ID",
				key: "parent_project_id",
				width: 20,
				mandatory: false
			},
			{	
				header: "Year",
				key: "year",
				width: 20,
				mandatory: false
			},
			{	
				header: "Semester",
				key: "semester",
				width: 20,
				mandatory: false
			}],
		sheetName: "Projects",
		internal: false
	},
	Participants: {
		name: "PARTICIPANT",
		headers: [
			{
				header: "First Name",
				key: "first_name",
				width: 20,
				mandatory: true
			},
			{
				header: "Middle Name",
				key: "middle_name",
				width: 20,
				mandatory: false
			},
			{
				header: "Last Name",
				key: "last_name",
				width: 20,
				mandatory: true
			},
			{
				header: "Email",
				key: "email",
				width: 25,
				mandatory: true
			}
		],
		sheetName: "Participants",
		internal: false
	},
	ProjectType: {
		name: "PROJECT_TYPE",
		headers: [
			{
				header: "Project Type",
				key: "project_type",
				width: 25
			}],
		sheetName: "Project Types",
		internal: true
	},
	CourseCode: {
		name: "COURSE_CODE",
		headers: [
			{
				header: "Course Name",
				key: "name",
				width: 30
			},
			{
				header: "Course Code",
				key: "code",
				width: 15
			}
		],
		sheetName: "Course Codes",
		internal: true
	}
};

exports.downloadFile = (req, res) => {
	try {
		res.download(req.query.path, (err) => {
			if (err) {
				console.log("failed to download file - ", err);
				res.status(500).json({
					error: {
						message: "Internal server error!"
					}
				});
			} else if (req.query.path.startsWith(process.env.FILES_UPLOAD_PATH + "/temp")) {
				fs.unlinkSync(req.query.path);
			}
		});
	} catch (err) {
		console.log("downloadFile error - ", err);
		res.status(500).json({
			error: {
				message: "Internal server error!"
			}
		});
		return;
	}
};

async function getData(key) {
	const objs = [];
	switch (key) {
		case templates.Judge.name:
			const users = await db.user.findAll(
				{
					where: {
						role: db.UserRoles.Judge
					}
				}
			);
			users.forEach(user => objs.push(user.getPublicInfo));
			break;
		case templates.Participants.name:
			const participants = await db.user.findAll(
				{
					where: {
						role: db.UserRoles.Participant
					}
				}
			);
			participants.forEach(user => objs.push(user.getPublicInfo));
			break;
		case templates.Event.name:
			const events = await db.event.findAll();
			events.forEach(event => {
				let info = event.getBasicInfo;
				info.start_date = moment(info.date[0]).utc().format();
				info.end_date = moment(info.date[1]).utc().format();
				objs.push(info);
			});
			break;
		case templates.Project.name:
			const projects = await db.project.findAll({ include: [db.courseCode, db.projectType] });
			for await (var project of projects) {
				const participants = await getParticipants(project);
				let info = project.getBasicInfo;
				info.team = participants;
				objs.push(info)
			}
			break;
		default:
			return objs;
	}
	return objs;
};

async function getParticipants(project) {
	const projectUserObjs = await db.sequelize.query(
		`select userId from projectUserMaps where projectId=:projectId`,
		{
			replacements: { projectId: project.projectId },
			type: db.Sequelize.QueryTypes.SELECT
		});

	const ids = [];
	projectUserObjs.forEach(obj => ids.push(obj.userId));
	const users = await db.user.findAll({
		where: {
			userId: {
				[db.Sequelize.Op.in]: ids
			}
		},
		attributes: ['email']
	});
	var list = "";
	for (const user of users) {
		list = list + user.email + ",";
	}
	list = list.slice(0, -1);
	return list;
}

async function generateTemplate(key) {
	const workbook = new excelJS.Workbook();
	const worksheet = workbook.addWorksheet(templates[key].sheetName);
	let headers = templates[key].headers;
	headers.forEach(function (v) { delete v.mandatory });
	worksheet.columns = headers;
	const objs = await getData(templates[key].name);
	let path = utils.generateExcelExport(workbook, worksheet, objs);

	if (templates[key].name === templates.Project.name) {
		const projectTypes = await db.projectType.findAll();
		const projectTypeObjs = [];
		projectTypes.forEach(projectType => projectTypeObjs.push(projectType.getBasicInfo));
		const projectTypeSheet = workbook.addWorksheet(templates.ProjectType.sheetName);
		projectTypeSheet.columns = templates.ProjectType.headers;
		path = utils.generateExcelExport(workbook, projectTypeSheet, projectTypeObjs);

		const courseCodes = await db.courseCode.findAll();
		const courseCodeObjs = [];
		courseCodes.forEach(courseCode => courseCodeObjs.push(courseCode.getBasicInfo));
		const courseCodeSheet = workbook.addWorksheet(templates.CourseCode.sheetName);
		courseCodeSheet.columns = templates.CourseCode.headers;
		path = utils.generateExcelExport(workbook, courseCodeSheet, courseCodeObjs);

	}
	return path;
};

exports.getTemplate = async (req, res) => {
	try {
		let templateType = utils.getdefaultValue(req.query.upload_type, "");
		let found = false
		let templateKey = "";
		for (const key in templates) {
			if (templates[key].name === templateType) {
				templateKey = key;
				found = true;
				break;
			}
		}
		if (!found) {
			res.status(400).json({
				error: {
					message: "Invalid upload-type passed!"
				}
			});
			return;
		}
		const path = await generateTemplate(templateKey)
		res.status(200).json({
			"response_str": "File generated successfully",
			"response_data": {
				"file": path
			}
		});
	} catch (err) {
		console.log("getTemplate error - ", err);
		res.status(500).json({
			error: {
				message: "Internal server error!"
			}
		});
		return;
	}
};

exports.getTemplateTypes = (req, res) => {
	try {
		let templateTypes = [];
		for (const template in templates) {
			if (!templates[template].internal) {
				templateTypes.push({
					upload_type: templates[template].name
				});
			}
		}
		res.status(200).json({
			response_str: "BulkUpload types retrieved successfull!",
			response_data: templateTypes
		});
		return;
	} catch (err) {
		console.log("getTemplateTypes error - ", err);
		res.status(500).json({
			error: {
				message: "Internal server error!"
			}
		});
		return;
	}
};

function checkMandatoryFieldsExistence(obj, headers) {
	let result = "";
	headers.forEach(header => {
		if (header.mandatory) {
			const value = utils.getdefaultValue(obj[header.header], "");
			if (value == "") {
				result += `${header.header} is mandatory. `
			}
		}
	});
	return result;
};

async function createBulkUsers(data, role) {

	const emails = [];
	data.forEach(obj => emails.push(obj.Email.trim()));
	const users = await db.user.findAll({
		where: {
			email: {
				[db.Sequelize.Op.in]: emails
			}
		}
	});

	let existingEmails = {};
	let errorUsers = {};
	users.forEach(user => {
		if (user.role != role) {
			errorUsers[user.email] = user;
		} else {
			existingEmails[user.email] = user;
		}
	});

	let createObjs = [];
	let response = [];
	let idx = 1;
	for (const obj of data) {

		let value = {};
		templates.Judge.headers.forEach(header =>
			value[header.key] = utils.getdefaultValue(obj[header.header], "").trim());
		value.key = idx;

		let result = checkMandatoryFieldsExistence(obj, templates.Judge.headers);
		if (result === "" && (utils.validateEmail(obj["Email"].trim()) === null)) {
			result = `Invalid email-id - ${obj["Email"].trim()}.`;
		}

		if (errorUsers.hasOwnProperty(obj.Email.toLowerCase().trim())) {
			const user = errorUsers[obj.Email.toLowerCase().trim()];
			value.result = `User already available with role ${user.role}`;
			value.status = "FAILED";
			response.push(value);
		} else if (result != "") {
			value.result = result;
			value.status = "FAILED";
			response.push(value);
		} else if (obj.Email in existingEmails) {
			const user = existingEmails[obj.Email];
			user.firstName = obj["First Name"].trim();
			user.lastName = obj["Last Name"].trim();
			user.middleName = utils.getdefaultValue(obj["Middle Name"], "").trim();
			await user.save();
			value.result = "";
			value.status = "UPDATED";
			response.push(value);
		} else {
			if (role == db.UserRoles.Judge) {
				createObjs.push({
					firstName: obj["First Name"].trim(),
					lastName: obj["Last Name"].trim(),
					middleName: utils.getdefaultValue(obj["Middle Name"], "").trim(),
					email: obj["Email"].trim(),
					role: role
				})
			} else {
				const random_password = (Math.random() + 1).toString(36).substring(7);
				createObjs.push({
					firstName: obj["First Name"].trim(),
					lastName: obj["Last Name"].trim(),
					middleName: utils.getdefaultValue(obj["Middle Name"], "").trim(),
					email: obj["Email"].trim(),
					role: role,
					password: random_password
				})
				const content = utils.getEmailContentForNewUser(obj["First Name"].trim(), role, random_password);
				utils.sendEmail(content.subject, content.htmlBody, obj["Email"].trim());
			}

			value.result = "";
			value.status = "CREATED";
			response.push(value);
		}
		idx++;
	}
	if (createObjs.length > 0) {
		await db.user.bulkCreate(createObjs);
	}
	return response;
};

async function createBulkEvents(data) {

	const eventNames = [];
	data.forEach(obj => eventNames.push(obj.Name.trim()));
	const events = await db.event.findAll({
		where: {
			name: {
				[db.Sequelize.Op.in]: eventNames
			}
		}
	});
	let existingEvent = {};
	events.forEach(event => existingEvent[event.name] = event);

	let createObjs = [];
	let response = [];
	let idx = 1;
	for (const obj of data) {

		let value = {};
		templates.Event.headers.forEach(header =>
			value[header.key] = utils.getdefaultValue(obj[header.header], "").trim());
		value.key = idx;

		let result = checkMandatoryFieldsExistence(obj, templates.Event.headers);

		const startDate = new Date(obj["StartDate(UTC)"].trim());
		if (!(startDate instanceof Date && !isNaN(startDate))) {
			result += 'Invalid StartDate(UTC).'
		}

		const endDate = new Date(obj["EndDate(UTC)"].trim());
		if (!(endDate instanceof Date && !isNaN(endDate))) {
			result += 'Invalid EndDate(UTC).'
		}

		if (result == "") {
			if (startDate.getTime() > endDate.getTime()) {
				result += `Invalid StartDate should be less than EndDate.`;
			}
		}

		if (result != "") {
			value.result = result;
			value.status = "FAILED";
			response.push(value);
		} else if (existingEvent.hasOwnProperty(obj.Name.trim())) {
			const event = existingEvent[obj.Name.trim()];
			event.location = utils.getdefaultValue(obj.Location, "").trim();
			event.description = utils.getdefaultValue(obj.Description, "").trim();
			event.startDate = startDate;
			event.endDate = endDate;
			await event.save();
			value.result = "";
			value.status = "UPDATED";
			response.push(value);
		} else {
			createObjs.push({
				name: obj.Name.trim(),
				location: utils.getdefaultValue(obj.Location, "").trim(),
				description: utils.getdefaultValue(obj.Description, "").trim(),
				startDate: startDate,
				endDate: endDate
			})
			value.result = "";
			value.status = "CREATED";
			response.push(value);
		}
		idx++;
	};
	if (createObjs.length > 0) {
		await db.event.bulkCreate(createObjs);
	}
	return response;
};

async function createBulkProjects(data) {
	const projectNames = [];
	data.forEach(obj => projectNames.push(obj.Name.trim()));
	const projects = await db.project.findAll({ include: [db.user] }, {
		where: {
			name: {
				[db.Sequelize.Op.in]: projectNames
			}
		}
	});
	let existingProject = {};
	projects.forEach(project => existingProject[project.name] = project);

	let projectTypeMap = {};
	const projectTypes = await db.projectType.findAll();
	projectTypes.forEach(projectType =>
		projectTypeMap[projectType.projectType] = projectType);

	let courseCodeMap = {};
	const courseCodes = await db.courseCode.findAll();
	courseCodes.forEach(courseCode =>
		courseCodeMap[courseCode.code] = courseCode);

	let createObjs = [];
	let response = [];
	let idx = 1;
	for (const obj of data) {

		let value = {}, list = [];
		templates.Project.headers.forEach(header =>
			value[header.key] = utils.getdefaultValue(obj[header.header], ""));
		value.key = idx;

		let result = checkMandatoryFieldsExistence(obj, templates.Project.headers);
		if (result != "") {
			value.result = result;
			value.status = "FAILED";
			response.push(value);
		} else if (!courseCodeMap.hasOwnProperty(obj["Course Code"].trim())) {
			value.result = "Invalid Course-Code.";
			value.status = "FAILED";
			response.push(value);
		} else if (!projectTypeMap.hasOwnProperty(obj["Project Type"].trim())) {
			value.result = "Invalid Project-Type.";
			value.status = "FAILED";
			response.push(value);
		} else if (existingProject.hasOwnProperty(obj.Name.trim())) {
			const project = existingProject[obj.Name.trim()];
			project.name = obj.Name.trim();
			project.description = utils.getdefaultValue(obj.Description, "").trim();
			project.projectTypeId = projectTypeMap[obj["Project Type"].trim()].projectTypeId;
			project.courseCodeId = courseCodeMap[obj["Course Code"].trim()].courseCodeId;
			project.clientName = utils.getdefaultValue(obj["Client Name"].trim(), project.clientName);
			project.clientCompany = utils.getdefaultValue(obj["Client Company"].trim(), project.clientCompany);
			project.clientEmail = utils.getdefaultValue(obj["Client Email"].trim(), project.clientEmail);
			// project.communicationLink = utils.getdefaultValue(obj["Communication Link"].trim(),project.communicationLink);
			// project.schedulerLink = utils.getdefaultValue(obj["Scheduler Link"].trim(), project.schedulerLink);
			// project.codeLink = utils.getdefaultValue(obj["Code Link"].trim(), project.codeLink);
			list = utils.getdefaultValue(obj["Team Members"], "").trim().split(',');

			project.teamSize = list.length > obj["Team Size"] ? list.length : obj["Team Size"];
			await tagParticipants(list, project);
			await project.save();
			value.result = "";
			value.status = "UPDATED";
			response.push(value);
		} else {
			let item = {} , list =[];
			 list = utils.getdefaultValue(obj["Team Members"], "").trim().split(',');
			

			if (list) {
				item.name = obj.Name.trim();
				item.description = utils.getdefaultValue(obj.Description, "").trim();
				item.projectTypeId = projectTypeMap[obj["Project Type"].trim()].projectTypeId;
				item.courseCodeId = courseCodeMap[obj["Course Code"].trim()].courseCodeId;
				item.teamSize = list.length > obj["Team Size"] ? list.length : obj["Team Size"];
				item.clientName = utils.getdefaultValue(obj["Client Name"], "");
				item.clientCompany = utils.getdefaultValue(obj["Client Company"], "");
				item.clientEmail = utils.getdefaultValue(obj["Client Email"], "");
				// item.communicationLink = utils.getdefaultValue(obj["Communication Link"],"");
				// item.schedulerLink = utils.getdefaultValue(obj["Scheduler Link"],"");
				// item.codeLink = utils.getdefaultValue(obj["Code Link"],"");
				Project.create(item).then(async project => {
					tagParticipants(list,project);
				});
				value.result = "";
				value.status = "CREATED";
				response.push(value);
				
			} else{
				item.name = obj.Name.trim();
				item.description = utils.getdefaultValue(obj.Description, "").trim();
				item.projectTypeId = projectTypeMap[obj["Project Type"].trim()].projectTypeId;
				item.courseCodeId = courseCodeMap[obj["Course Code"].trim()].courseCodeId;
				item.teamSize = list.length > obj["Team Size"] ? list.length : obj["Team Size"];
				item.clientName = utils.getdefaultValue(obj["Client Name"], "");
				item.clientCompany = utils.getdefaultValue(obj["Client Company"], "");
				item.clientEmail = utils.getdefaultValue(obj["Client Email"], "");
				// item.communicationLink = utils.getdefaultValue(obj["Communication Link"],"");
				// item.schedulerLink = utils.getdefaultValue(obj["Scheduler Link"],"");
				// item.codeLink = utils.getdefaultValue(obj["Code Link"],"");
				createObjs.push(item)
				value.result = "";
				value.status = "CREATED";
				response.push(value);
			}

		}
		idx++;
	}

	if (createObjs.length > 0) {
		await db.project.bulkCreate(createObjs);
	}
	return response;
}

async function tagParticipants(listArr, project) {
	var listIds = [], listIdsfromMap = [];

	let newParticipants = {};
	let toAdd = [], toDel = [];

	const users = await db.user.findAll({
		where: { 
			email: { 
				[db.Sequelize.Op.in]: listArr
			},
			role: db.UserRoles.Participant 
		}
	});

	users.forEach(user => newParticipants[user.userId] = user);
	users.forEach(user => listIds.push(user.userId));

	const existingParticipants = await db.sequelize.query(
		`select userId from projectUserMaps where projectId=:projectId`,
		{
			replacements: { projectId: project.projectId },
			type: db.Sequelize.QueryTypes.SELECT
		});
	existingParticipants.forEach(user => listIdsfromMap.push(user.userId));

	toAdd = listIds.filter(x => !listIdsfromMap.includes(x));
	toDel = listIdsfromMap.filter(x => !listIds.includes(x));
	for (const i of toAdd) {
		await project.addUser(newParticipants[i]);
	}

	for (const i of toDel) {
		await db.sequelize.query(
			`delete from projectUserMaps where userId=:userId AND projectId=:projectId`,
			{
				replacements: { projectId: project.projectId, userId: i },
				type: db.Sequelize.QueryTypes.DELETE
			});
	}
}

function validateFile(data, template) {
	if (data.length == 0) {
		throw new Error("Invalid data is empty!");
	}
	const headers = [];
	template.headers.forEach(header => headers.push(header.header));
	if (Object.keys(data[0]).length != headers.length) {
		throw new Error("Invalid excel headers has deleted!");
	}
	Object.keys(data[0]).forEach(key => {
		if (!headers.includes(key)) {
			throw new Error("Invalid excel headers has changed!");
		}
	});
	return;
}

exports.bulkUpload = async (req, res) => {

	try {
		if (!req.file) {
			res.status(400).json({
				error: {
					message: "Invalid, Attachment is required!"
				}
			});
			return
		}

		const workbook = new excelJS.Workbook();
		await workbook.xlsx.readFile(req.file.path);

		const sheets = [];
		workbook.worksheets.forEach(sheet => sheets.push(sheet.name));

		let response = [];
		const uploadType = req.body.upload_type;
		switch (uploadType) {
			case templates.Judge.name:
				if (!sheets.includes(templates.Judge.sheetName)) {
					res.status(400).json({
						error: {
							message: "Invalid excel-sheet passed, check your upload_type selected!"
						}
					});
					return;
				}
				worksheet = workbook.getWorksheet(templates.Judge.sheetName);
				data = utils.convertExcelSheetToJson(worksheet);
				validateFile(data, templates.Judge);
				response = await createBulkUsers(data, db.UserRoles.Judge);
				break;
			case templates.Event.name:
				if (!sheets.includes(templates.Event.sheetName)) {
					res.status(400).json({
						error: {
							message: "Invalid excel-sheet passed, check your upload_type selected!"
						}
					});
					return;
				}
				worksheet = workbook.getWorksheet(templates.Event.sheetName);
				data = utils.convertExcelSheetToJson(worksheet);
				validateFile(data, templates.Event);
				response = await createBulkEvents(data);
				break;
			case templates.Project.name:
				if (!sheets.includes(templates.Project.sheetName)) {
					res.status(400).json({
						error: {
							message: "Invalid excel-sheet passed, check your upload_type selected!"
						}
					});
					return;
				}
				worksheet = workbook.getWorksheet(templates.Project.sheetName);
				data = utils.convertExcelSheetToJson(worksheet);
				validateFile(data, templates.Project);
				response = await createBulkProjects(data);
				break;
			case templates.Participants.name:
				if (!sheets.includes(templates.Participants.sheetName)) {
					res.status(400).json({
						error: {
							message: "Invalid excel-sheet passed, check your upload_type selected!"
						}
					});
					return;
				}
				worksheet = workbook.getWorksheet(templates.Participants.sheetName);
				data = utils.convertExcelSheetToJson(worksheet);
				validateFile(data, templates.Participants);
				response = await createBulkUsers(data, db.UserRoles.Participant);
				break;
			default:
				res.status(400).json({
					error: {
						message: "Invalid upload-type passed!"
					}
				});
				return;
		};
		fs.unlinkSync(req.file.path);
		res.status(200).json({
			response_str: "BulkUpload processed successfully",
			response_data: response
		});
		return;
	} catch (err) {
		console.log("getTemplateTypes error - ", err);
		fs.unlinkSync(req.file.path);
		res.status(400).json({
			error: {
				message: err.message
			}
		});
		return;
	}
};