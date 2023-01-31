import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Space,
  Table,
  Card,
  Button,
  Tabs,
  Tag,
  Tooltip,
  Input,
  Spin,
} from "antd";
import axios from "axios";
import {
  GithubOutlined,
  SlackOutlined,
  VideoCameraAddOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import InsModalComp from "./InsModalComp";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";

const InsProjectsTable = () => {
  const [currProjectData, setCurrProjectData] = useState([]);
  const [pastProjectData, setPastProjectData] = useState([]);
  const [deleteIds, setDeleteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  let location = useLocation();
  let courseCodeId = location.state && location.state.courseCode;
  let courseName = location.state && location.state.courseName;

  useEffect(() => {
    let url = "";
    if (courseCodeId) {
      url = `/api/v1/project/${courseCodeId}/userCourseProject`;
    } else {
      const role = "Instructor";
      url = `/api/v1/project/${role}/UserProject`;
    }
    axios
      .get(process.env.REACT_APP_LOCAL_DB_URL + url, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Token": localStorage.getItem("access_token"),
        },
      })
      .then((res) => {
        console.log("res data", res);
        setCurrProjectData(
          res.data.response_data.currentProjects.map((obj, index) => {
            let clients = [];
            if (obj.Clients) {
              obj.Clients.forEach((client) => {
                // if (client.firstName != null && client.lastName != null)
                clients.push(client.firstName + " " + client.lastName);
              });
            }

            let linksObj = {};
            if (obj.Links) {
              obj.Links.forEach((link) => {
                linksObj[link.name] = link.content;
              });
            }

            return {
              key: index,
              projectId: obj.projectId,
              projectName: obj.name,
              semester: obj.semester,
              courseName: obj.course_name,
              year: obj.year,
              clientName: clients,
              gitHub: linksObj["Repo"],
              slack: linksObj["Slack"],
              zoom: linksObj["Zoom"],
            };
          })
        );
        setPastProjectData(
          res.data.response_data.pastProjects.map((obj, index) => {
            let clients = [];
            if (obj.Clients) {
              obj.Clients.forEach((client) => {
                clients.push(client.firstName + " " + client.lastName);
              });
            }

            let linksObj = {};
            if (obj.Links) {
              obj.Links.forEach((link) => {
                linksObj[link.name] = link.content;
              });
            }

            return {
              key: index,
              projectId: obj.projectId,
              projectName: obj.name,
              semester: obj.semester,
              courseName: obj.course_name,
              year: obj.year,
              clientName: clients,
              gitHub: linksObj["Repo"],
              slack: linksObj["Slack"],
              zoom: linksObj["Zoom"],
            };
          })
        );
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        NotificationHandler("failure", "Failed", "No Projects Found");
      });
  }, []);

  const currProjectsColumns = [
    {
      title: "Name",
      dataIndex: "projectName",
      key: "projectName",
      width: "14%",
      sorter: (a, b) =>
        a.projectName &&
        b.projectName &&
        a.projectName.localeCompare(b.projectName),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.projectName &&
        record.projectName.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
      width: "16%",
      sorter: (a, b) =>
        a.courseName &&
        b.courseName &&
        a.courseName.localeCompare(b.courseName),
      onFilter: (value, record) =>
        record.courseName &&
        record.courseName.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
      filterIcon: () => <SearchOutlined />,
      render: (_, record) => (
        <Tag color={"blue"} className="Border-Style">
          {record.courseName && record.courseName.length > 20
            ? record.courseName.slice(0, 20) + "..."
            : record.courseName}
        </Tag>
      ),
    },

    {
      title: "Semester",
      dataIndex: "semester",
      key: "semester",
      sorter: (a, b) =>
        a.semester && b.semester && a.semester.localeCompare(b.semester),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.semester &&
        record.semester.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      sorter: (a, b) =>
        a.year && b.year && String(a.year).localeCompare(String(b.year)),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.year && String(record.year) === String(value),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Clients",
      dataIndex: "clientName",
      key: "clientName",
      width: "14%",
      onFilter: (value, record) => {
        let tmp = record.clientName.map(
          (item) => item && item.toLowerCase().includes(value.toLowerCase())
        );
        return tmp.includes(true) ? true : false;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
      filterIcon: () => <SearchOutlined />,
      render: (_, { clientName }) => (
        <>
          {clientName.map((client) => {
            let color = "geekblue";
            return (
              <Tag
                color={color}
                key={client}
                className="Border-Style"
                style={{ margin: "2px" }}
              >
                {client}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: "Links",
      key: "links",
      width: "14%",
      render: (_, record) => (
        <Space size="middle">
          {record.gitHub && (
            <a href={record.gitHub} target="_blank">
              <Button icon={<GithubOutlined />} shape="circle"></Button>
            </a>
          )}
          {record.slack && (
            <a href={record.slack} target="_blank">
              <Button icon={<SlackOutlined />} shape="circle"></Button>
            </a>
          )}
          {record.zoom && (
            <a href={record.zoom} target="_blank">
              <Button icon={<VideoCameraAddOutlined />} shape="circle"></Button>
            </a>
          )}
        </Space>
      ),
    },

    {
      title: "Actions",
      key: "actions",
      width: "7%",
      render: (_, record) => (
        <Space size="middle">
          <Button
            className="Border-Style"
            onClick={() => {
              navigate("/project/insclidetails", {
                state: {
                  projectId: record.projectId,
                },
              });
            }}
          >
            View
          </Button>
          <Button
            className="Border-Style"
            onClick={() =>
              navigate("/ins/project/update", {
                state: {
                  projectId: record.projectId,
                  title: "Edit Project",
                  formType: "Edit",
                  role: "Instructor",
                  courseCode: courseCodeId,
                  // courseName: courseName,
                },
              })
            }
          >
            Edit
          </Button>
        </Space>
      ),
      width: "20%",
    },
  ];
  const pastProjectsColumns = [
    {
      title: "Name",
      dataIndex: "projectName",
      key: "projectName",
      width: "14%",
      sorter: (a, b) =>
        a.projectName &&
        b.projectName &&
        a.projectName.localeCompare(b.projectName),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.projectName &&
        record.projectName.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
      width: "16%",
      sorter: (a, b) =>
        a.courseName &&
        b.courseName &&
        a.courseName.localeCompare(b.courseName),
      onFilter: (value, record) =>
        record.courseName &&
        record.courseName.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
      filterIcon: () => <SearchOutlined />,
      render: (_, record) => (
        <Tag color={"blue"} className="Border-Style">
          {record.courseName && record.courseName.length > 20
            ? record.courseName.slice(0, 20) + "..."
            : record.courseName}
        </Tag>
      ),
    },
    {
      title: "Semester",
      dataIndex: "semester",
      key: "semester",
      sorter: (a, b) =>
        a.semester && b.semester && a.semester.localeCompare(b.semester),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.semester &&
        record.semester.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      sorter: (a, b) =>
        a.year && b.year && String(a.year).localeCompare(String(b.year)),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) =>
        record.year && String(record.year) === String(value),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
    },
    {
      title: "Clients",
      dataIndex: "clients",
      key: "clients",
      width: "14%",
      onFilter: (value, record) => {
        let tmp = record.clients.map(
          (item) => item && item.toLowerCase().includes(value.toLowerCase())
        );
        return tmp.includes(true) ? true : false;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
        return (
          <Input
            style={{
              border: "1px solid geekblue",
              borderRadius: "5px",
              width: "250px",
            }}
            autoFocus
            placeholder="Type text to search"
            value={selectedKeys[0]}
            onChange={(e) => {
              setSelectedKeys(e.target.value ? [e.target.value] : []);
            }}
            onPressEnter={() => {
              confirm();
            }}
            onBlur={() => {
              confirm();
            }}
          />
        );
      },
      filterIcon: () => <SearchOutlined />,
      render: (_, { clientName }) => (
        <>
          {clientName.map((client) => {
            let color = "geekblue";
            return (
              <Tag
                color={color}
                key={client}
                className="Border-Style"
                style={{ margin: "2px" }}
              >
                {client}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: "Links",
      key: "links",
      width: "14%",

      render: (_, record) => (
        <Space size="middle">
          {record.gitHub && (
            <a href={record.gitHub}>
              <Button icon={<GithubOutlined />} shape="circle"></Button>{" "}
            </a>
          )}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "action",
      width: "7%",
      render: (_, record) => (
        <Space size="middle">
          <Button
            className="Border-Style"
            onClick={() =>
              navigate("/project/insclidetails", {
                state: {
                  projectId: record.projectId,
                },
              })
            }
          >
            View
          </Button>
          <Button
            className="Border-Style"
            onClick={() =>
              navigate("/ins/project/update", {
                state: {
                  projectId: record.projectId,
                  title: "Extend Project",
                  formType: "Extend",
                  role: "Instructor",
                },
              })
            }
          >
            Extend
          </Button>
        </Space>
      ),
      width: "20%",
    },
  ];
  const deleteApi = async () => {
    for (let i = 0; i < deleteIds.length; i++) {
      await fetch(
        process.env.REACT_APP_LOCAL_DB_URL +
          `/api/v1/project/${deleteIds[i]}/delete`,
        {
          method: "DELETE",
          mode: "cors",
          body: JSON.stringify({ projectId: deleteIds[i] }),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Token": localStorage.getItem("access_token"),
            "Content-Type": "application/json",
          },
        }
      ).then((response) => {
        if (response.ok) {
          NotificationHandler(
            "success",
            "Success!",
            "Selected project(s) deleted"
          );
          setTimeout(() => {
            navigate(0);
          }, 2000);
        } else {
          NotificationHandler("failure", "Failed!", "Delete project(s) failed");
        }
      });
    }

    return;
  };

  return (
    <Tabs
      tabBarStyle={{ borderRadius: "10px" }}
      defaultActiveKey="1"
      type="line"
      items={[
        {
          label: "Current Projects",
          key: "1",
          children: (
            <Card
              className="Border-Style"
              title="Manage Projects"
              hoverable={true}
              style={{ cursor: "default !important" }}
              extra={
                <Space>
                  <Tooltip title="Add Project" placement="bottom">
                    <Button
                      icon={<PlusOutlined />}
                      shape="circle"
                      onClick={() =>
                        navigate("/ins/project/add", {
                          state: {
                            role: "Instructor",
                            courseCode: courseCodeId,
                            courseName: courseName,
                          },
                        })
                      }
                    ></Button>
                  </Tooltip>
                  <InsModalComp
                    buttonIcon={<DeleteOutlined />}
                    buttonType={"primary"}
                    modalText={"Are you sure you want to delete item(s)?"}
                    onOkFunc={deleteApi}
                    isDanger={true}
                    toolTipText={"Delete Project(s)"}
                    buttonShape={"circle"}
                    somethingSelected={deleteIds.length == 0}
                  />
                </Space>
              }
            >
              {loading ? (
                <div style={{ textAlign: "center" }}>
                  <Spin
                    size="large"
                    indicator={<LoadingOutlined />}
                    tip="Loading..."
                  />
                </div>
              ) : (
                <Table
                  columns={currProjectsColumns}
                  dataSource={currProjectData}
                  rowSelection={{
                    type: "checkbox",
                    onChange: (_, rows) =>
                      setDeleteIds(rows.map((obj) => obj.projectId)),
                  }}
                  scroll={{
                    y: "50vh",
                  }}
                />
              )}
            </Card>
          ),
        },
        {
          label: "Past Projects",
          key: "2",
          children: (
            <Card
              className="Border-Style"
              title="Manage Projects"
              hoverable={true}
              extra={
                <Space>
                  <InsModalComp
                    buttonIcon={<DeleteOutlined />}
                    buttonType={"primary"}
                    modalText={"Are you sure you want to delete item(s)?"}
                    onOkFunc={deleteApi}
                    isDanger={true}
                    toolTipText={"Delete Project(s)"}
                    buttonShape={"circle"}
                    somethingSelected={deleteIds.length == 0}
                  />
                </Space>
              }
            >
              <Table
                columns={pastProjectsColumns}
                dataSource={pastProjectData}
                rowSelection={{
                  type: "checkbox",
                  onChange: (_, rows) =>
                    setDeleteIds(rows.map((obj) => obj.projectId)),
                }}
                scroll={{
                  y: "50vh",
                }}
              />
            </Card>
          ),
        },
      ]}
    />
  );
};

export default InsProjectsTable;
