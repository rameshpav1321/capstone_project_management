module.exports = (sequelize, Sequelize) => {
  const studentProjectMap = sequelize.define("studentProjectMap", {
    studentProjectID: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: Sequelize.DataTypes.INTEGER,
    },
    projectId: {
      type: Sequelize.DataTypes.INTEGER,
    },
    semester: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    year: {
      type: Sequelize.DataTypes.INTEGER,
      defaultValue: new Date().getFullYear(),
      allowNull: true,
    },
    position: {
      type: Sequelize.DataTypes.STRING,
      status: {
        type: Sequelize.ENUM("WAITLIST", "FINALIZED", "ENROLLED", "UNENROLLED"),
        defaultValue: "UNENROLLED",
      },
      defaultValue: "UNENROLLED",
      allowNull: true,
    },
    enrolledAt: {
      type: Sequelize.DataTypes.DATE(6),
      allowNull: true,
    },
    isActive: {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    }
  },{
		paranoid: true
	});
  return studentProjectMap;
};
