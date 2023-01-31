module.exports = (sequelize, Sequelize) => {
	const InstructorCourseMap = sequelize.define("InstructorCourseMap", {
		InstructorCourseId: {
			type: Sequelize.DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		InstructorId:{
			type: Sequelize.DataTypes.INTEGER
		},
		CourseId:{
			type: Sequelize.DataTypes.INTEGER
		},
        semester:{
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        year:{
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
        },
		isActive: {
			type: Sequelize.DataTypes.INTEGER
		}
	},{
		paranoid: true
	});
	return InstructorCourseMap;
};