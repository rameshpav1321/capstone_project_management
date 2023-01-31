import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, Col, Row, Button, Spin, Tag, Image } from "antd";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";
import { getAPIResponse } from "./Services/Projects/ProjectServices";
import { getRoutes } from "./Services/Projects/routes";
import { getUserActions } from "./Utils/userFunctions";
import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import { GetTitle } from "./Utils/GetTitle";

const ProjectDetails = () => {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState([]);
  const [primaryAttachments, setPrimaryAttachments] = useState();
  const [attachments, setAttachments] = useState();
  const navigate = useNavigate();
  let state = useLocation();
  let projectId = state.state.projectId;

  const getProjectData = async () => {
    let url = getRoutes("projectDetails", { projectId: projectId });
    let res = await getAPIResponse(url, "GET");
    if (res.status == 200) {
      setProject(res.data);
      setPrimaryAttachments(res.data.primary_attachments);
      setAttachments(res.data.attachments);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } else {
      setProject();
      setTimeout(() => {
        setLoading(false);
      }, 1000);
      console.log("No project data found");
    }
  };

  useEffect(() => {
    getProjectData();
  }, [projectId]);

  return (
    <div>
      {loading ? (
        <Spin
          size="large"
          style={{ display: "block", marginTop: "250px" }}
          indicator={<LoadingOutlined />}
          tip="Loading..."
        />
      ) : (
        <>
          {project && (
            <div>
              <Card
                title={
                  <GetTitle title={"Project Details"} onClick={navigate} />
                }
                className="Border-Style"
              >
                <Row>
                  <Col span={16}>
                    <p>
                      <span className="fw-600">Name: </span>
                      {project.name}
                    </p>
                    <p>
                      <span className="fw-600">Team Size: </span>
                      {project.team_size}
                    </p>
                    <p>
                      <span className="fw-600">Type: </span>
                      <Tag
                        color="geekblue"
                        className="Border-Style"
                        style={{ fontSize: "14px" }}
                      >
                        {project.project_type_name}
                      </Tag>
                    </p>
                    <p>
                      <span className="fw-600">Client Representative: </span>
                      {project.Clients.map((client) => (
                        <Tag
                          color="geekblue"
                          className="Border-Style"
                          style={{ fontSize: "14px" }}
                        >
                          {client}
                        </Tag>
                      ))}
                    </p>
                    <p>
                      <span className="fw-600">Enrolled Students: </span>
                      {project.teams.map((member) => (
                        <>
                          <Image
                            src={member.image}
                            style={{
                              borderRadius: "50%",
                              border: "1px solid white",
                            }}
                            width={50}
                          />
                          <Tag
                            color="geekblue"
                            className="Border-Style"
                            style={{ fontSize: "14px" }}
                          >
                            {member.firstName + " " + member.lastName}
                          </Tag>
                        </>
                      ))}
                    </p>
                    <p>
                      <span className="fw-600">Description:</span>
                    </p>
                    <p>{project.description}</p>

                    <div className="fw-600">Links :</div>
                    <div className="mt-2">
                      {primaryAttachments &&
                        primaryAttachments.map((attachment) => (
                          <p>
                            {attachment.name} :{" "}
                            <a href={attachment.content} target="_blank">
                              {attachment.content}
                            </a>
                          </p>
                        ))}
                      {attachments &&
                        attachments.map((attachment) => (
                          <p>
                            {attachment.name} :{" "}
                            <a href={attachment.content} target="_blank">
                              {attachment.content}
                            </a>
                          </p>
                        ))}
                      <Button
                        type="primary"
                        onClick={() =>
                          navigate("/project/lineage", {
                            state: {
                              user: "ins",
                              projectId: projectId,
                            },
                          })
                        }
                      >
                        View History
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectDetails;
