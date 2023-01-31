import React, { useContext, useState, useEffect } from "react";
import {
  DownloadOutlined,
  FileTextOutlined,
  CopyOutlined,
  UserAddOutlined,
  DeleteOutlined,
  SearchOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Space, Table, Card, Button, Tag, Tooltip, Input, Spin } from "antd";
import InsModalComp from "./InsModalComp";
import { useNavigate } from "react-router-dom";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";
import { CSVDownload } from "react-csv";
import axios from "axios";

const InsClientTable = () => {
  const navigate = useNavigate();
  const [download, setDownload] = useState(false);
  const [clientData, setClientData] = useState([]);
  const [clientsArr, setClientsArr] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios
      .get(
        process.env.REACT_APP_LOCAL_DB_URL + `/api/v1/instructor/manageClients`,
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Token": localStorage.getItem("access_token"),
          },
        }
      )
      .then((res) => {
        setClientData(
          res.data.response_data.map((obj, index) => {
            return {
              key: index,
              id: obj.clientId,
              clientName:
                obj.firstName == null || obj.lastName == null ? (
                  <Tag color="gray"></Tag>
                ) : (
                  obj.firstName + " " + obj.lastName
                ),
              projects: obj.project,
              email: obj.email,
              id: obj.clientId,
            };
          })
        );
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        NotificationHandler("failure", err.message, "Please try again");
      });
  }, []);
  const getColumns = () => {
    const columns = [
      {
        title: "Name",
        dataIndex: "clientName",
        key: "client name",
        width: "18%",
        sorter: (a, b) =>
          a.clientName &&
          b.clientName &&
          String(a.clientName).localeCompare(String(b.clientName)),
        filterIcon: () => <SearchOutlined />,
        onFilter: (value, record) =>
          record.clientName &&
          String(record.clientName).toLowerCase().includes(value.toLowerCase()),
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
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: "22%",
        sorter: (a, b) => a.email && b.email && a.email.localeCompare(b.email),
        filterIcon: () => <SearchOutlined />,
        onFilter: (value, record) =>
          record.email &&
          record.email.toLowerCase().includes(value.toLowerCase()),
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
        title: "Project(s)",
        dataIndex: "projects",
        key: "projects",
        width: "35%",
        onFilter: (value, record) => {
          let tmp = record.projects.map(
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
        render: (_, { projects }) => (
          <>
            {projects.map((project) => {
              let color = "geekblue";
              return (
                <Tag
                  color={color}
                  key={projects}
                  className="Border-Style"
                  style={{ margin: "2px" }}
                >
                  {project && project.length > 20
                    ? project.slice(0, 20) + "..."
                    : project}
                </Tag>
              );
            })}
          </>
        ),
      },

      {
        title: "Notes",
        key: "notes",
        render: (_, record) => (
          <Space size="middle">
            <Button
              icon={<FileTextOutlined />}
              onClick={() => {
                navigate("/ins/notes/", {
                  state: {
                    clientName: record.clientName,
                    clientId: record.id,
                  },
                });
              }}
            ></Button>
          </Space>
        ),
        width: "20%",
      },
    ];
    return columns;
  };

  const alternateCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      NotificationHandler(
        "success",
        "Success!",
        "Selected email(s) Copied",
        ""
      );
    } catch (err) {
      NotificationHandler("failure", "Failed!", "No email(s) selected!");
    }
    document.body.removeChild(textArea);
  };

  const copyEmail = () => {
    let copiedEmails = [];
    for (let i = 0; i < clientsArr.length; i++) {
      copiedEmails.push(clientsArr[i].email);
    }
    if (copiedEmails.length && window.isSecureContext) {
      navigator.clipboard
        .writeText(String(copiedEmails))
        .then(
          NotificationHandler("success", "Success!", "Selected email(s) Copied")
        );
    } else {
      alternateCopy(copiedEmails);
    }
  };
  const deleteApi = async () => {
    for (let i = 0; i < clientsArr.length; i++) {
      await fetch(
        process.env.REACT_APP_LOCAL_DB_URL + `/api/v1/user/deleteAllUser`,
        {
          method: "POST",
          mode: "cors",
          body: JSON.stringify({
            users: [{ userId: clientsArr[i].id }],
          }),
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
            "Selected user(s) deleted"
          );
          setTimeout(() => {
            navigate(0);
          }, 2000);
        } else {
          NotificationHandler("failure", "Failed", "Delete user(s) failed");
        }
      });
    }
    return;
  };
  return (
    <>
      <Card
        title="Manage Clients"
        hoverable={true}
        extra={
          <Space>
            <Tooltip title="Add User(s)" placement="bottom">
              <Button
                shape="circle"
                icon={<UserAddOutlined />}
                onClick={() => navigate("/ins/addUser")}
              ></Button>
            </Tooltip>
            <Tooltip title="Download Data" placement="bottom">
              <Button
                shape="circle"
                icon={<DownloadOutlined />}
                onClick={() => {
                  if (clientsArr.length) {
                    setDownload(true);
                    setTimeout(() => setDownload(false), 2000);
                    NotificationHandler(
                      "success",
                      "Success!",
                      "Downloading data..."
                    );
                  } else {
                    NotificationHandler(
                      "info",
                      "Information!",
                      "Select row(s) to proceed with the action"
                    );
                  }
                }}
              ></Button>
            </Tooltip>
            <Tooltip title="Copy Email(s)" placement="bottom">
              <Button
                shape="circle"
                icon={<CopyOutlined />}
                onClick={() => {
                  if (clientsArr.length == 0) {
                    NotificationHandler(
                      "info",
                      "Information!",
                      "Select row(s) to proceed with the action"
                    );
                  } else {
                    copyEmail();
                  }
                }}
              ></Button>
            </Tooltip>

            <InsModalComp
              buttonIcon={<DeleteOutlined />}
              buttonType={"primary"}
              modalText={"Are you sure you want to delete item(s)?"}
              onOkFunc={deleteApi}
              isDanger={true}
              toolTipText={"Delete Client(s)"}
              somethingSelected={clientsArr.length == 0}
            />
          </Space>
        }
        className="Border-Style"
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
            columns={getColumns()}
            dataSource={clientData}
            rowSelection={{
              type: "checkbox",
              onChange: (_, rows) => setClientsArr(rows),
            }}
            scroll={{
              y: "55vh",
            }}
          />
        )}
      </Card>
      {download && <CSVDownload data={clientsArr} target="_blank" />}
    </>
  );
};

export default InsClientTable;
