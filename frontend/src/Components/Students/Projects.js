import React, { useContext, useEffect, useState } from "react";
import { Tabs, Layout, Spin, Col } from "antd";
import ProjectCard from "./ProjectCard";
import { getAPIResponse } from "../Common/Services/Projects/ProjectServices";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";
import { getRoutes } from "../Common/Services/Projects/routes";
import { useParams } from "react-router-dom";
import { getUserActions } from "../Common/Utils/userFunctions";
import { MainContext } from "../../Context/MainContext";
import { LoadingOutlined } from "@ant-design/icons";

const Projects = () => {
  const params = useParams();

  const { studentActions } = getUserActions(params.courseId);
  const { setActions } = useContext(MainContext);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState();

  let courseId = params.courseId;
  const [projectData, setProjectData] = useState({
    currentProjects: [],
    pastProjects: [],
  });

  const getProjectData = async () => {
    let url = getRoutes("allProjects", { courseCodeId: courseId });
    let result = await getAPIResponse(url, "GET");
    if (result.status == 200) {
      setProjectData({
        currentProjects: result.data.currentProjects,
        pastProjects: result.data.pastProjects,
      });
      setStatus(result.data.status);
      setLoading(false);
      localStorage.setItem("projectId", result.data.enrolledProjectId);
      localStorage.setItem("status", result.data.status);
    } else {
      setLoading(false);
      NotificationHandler("failure", "Failed", result.message);
    }
  };

  useEffect(() => {
    setActions((prev) => [
      ...prev.filter((item) => item.key !== "studentActions"),
      ...studentActions,
    ]);
    getProjectData();
  }, [params.courseId]);

  let viewToDisplay = (type) => {
    let projects = [];
    if (type === "current") {
      projects = projectData.currentProjects;
    } else {
      projects = projectData.pastProjects;
    }

    if (projects.length === 0) {
      return (
        <div className="text-center mt-4">
          <h4>No projects available</h4>
        </div>
      );
    }
    return projects.map((project, index) => {
      if (project.hasOwnProperty("name")) {
        let desc =
          project.description && project.description.length > 44
            ? project.description.slice(0, 44) + "..."
            : project.description;

        return (
          <Col span={24}>
            <ProjectCard
              key={String(index)}
              type={type}
              title={project.name}
              projectType={project.project_type_name}
              projectId={project.project_id}
              courseCodeId={courseId}
              currentlyEnrolled={project.teams.length}
              teamSize={project.team_size}
              desc={desc ? desc : "-"}
              status={status}
              semester={project.semester}
            />
          </Col>
        );
      }
    });
  };

  return (
    <div>
      <Tabs
        defaultActiveKey="1"
        type="line"
        items={[
          {
            label: "Current Projects",
            key: "1",
            children: loading ? (
              <div style={{ textAlign: "center" }}>
                <Spin
                  size="large"
                  indicator={<LoadingOutlined />}
                  tip="Loading..."
                />
              </div>
            ) : (
              <div
                style={{
                  overflowY: "scroll",
                  height: "80vh",
                }}
              >
                {viewToDisplay("current")}
              </div>
            ),
          },
          {
            label: "Past Projects",
            key: "2",
            children: (
              <div
                style={{
                  overflowY: "scroll",
                  height: "100vh",
                }}
              >
                {viewToDisplay("past")}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Projects;
