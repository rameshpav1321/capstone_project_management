module.exports = (sequelize, Sequelize) => {
	const ClientProjectMap = sequelize.define("ClientProjectMap", {
		clientProjectID: {
			type: Sequelize.DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		clientId:{
			type: Sequelize.DataTypes.INTEGER
		},
		projectId:{
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
		isActive:{
			type: Sequelize.DataTypes.INTEGER
		}
		
	},{
		paranoid: true
	});
	ClientProjectMap.add = async function (clientId, projectId, semester, year) {
		const obj = await this.create({
			clientId: clientId,
			projectId: projectId,
			semester: semester,
			year: year
		});
		return obj;
	};

	return ClientProjectMap;
};