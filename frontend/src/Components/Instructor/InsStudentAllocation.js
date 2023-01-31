import React, { useState, useContext, useEffect } from "react";
import {
  DownloadOutlined,
  CopyOutlined,
  UserAddOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  LoadingOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Space, Table, Card, Button, Tag, Tooltip, Input, Spin } from "antd";
import InsModalComp from "./InsModalComp";
import InsModalWithContent from "./InsModalWithContent";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";
import { CSVDownload } from "react-csv";

const columns = [
  {
    title: "Name",
    dataIndex: "studentName",
    key: "studentName",
    width: "17%",
    sorter: (a, b) =>
      a.studentName &&
      b.studentName &&
      String(a.studentName).localeCompare(String(b.studentName)),
    onFilter: (value, record) =>
      record.studentName &&
      String(record.studentName).toLowerCase().includes(value.toLowerCase()),
    filterIcon: () => <SearchOutlined />,
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
    key: "emails",
    width: "20%",
    sorter: (a, b) => a.email && b.email && a.email.localeCompare(b.email),
    onFilter: (value, record) =>
      record.email && record.email.toLowerCase().includes(value.toLowerCase()),
    filterIcon: () => <SearchOutlined />,
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
  // {
  //   title: "Github",
  //   dataIndex: "githubId",
  //   key: "githubId",
  //   width: "14%",
  //   sorter: (a, b) =>
  //     a.githubId && b.githubId && a.githubId.localeCompare(b.githubId),
  //   onFilter: (value, record) =>
  //     record.githubId &&
  //     record.githubId.toLowerCase().includes(value.toLowerCase()),
  //   filterIcon: () => <SearchOutlined />,
  //   filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
  //     return (
  //       <Input
  //         style={{
  //           border: "1px solid geekblue",
  //           borderRadius: "5px",
  //           width: "250px",
  //         }}
  //         autoFocus
  //         placeholder="Type text to search"
  //         value={selectedKeys[0]}
  //         onChange={(e) => {
  //           setSelectedKeys(e.target.value ? [e.target.value] : []);
  //         }}
  //         onPressEnter={() => {
  //           confirm();
  //         }}
  //         onBlur={() => {
  //           confirm();
  //         }}
  //       />
  //     );
  //   },
  // },
  {
    title: "Project",
    dataIndex: "projectName",
    key: "projectName",
    width: "18%",
    sorter: (a, b) =>
      a.projectName &&
      b.projectName &&
      a.projectName.localeCompare(b.projectName),
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
    filterIcon: () => <SearchOutlined />,
    render: (_, record) => (
      <Tag color={"geekblue"} className="Border-Style">
        {/* {record.projectName} */}
        {record.projectName && record.projectName.length > 20
          ? record.projectName.slice(0, 20) + "..."
          : record.projectName}
      </Tag>
    ),
  },
  {
    title: "Course",
    dataIndex: "courseName",
    key: "courseName",
    width: "18%",
    sorter: (a, b) =>
      a.courseName && b.courseName && a.courseName.localeCompare(b.courseName),
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
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: "12%",
    sorter: (a, b) => a.status && b.status && a.status.localeCompare(b.status),
    onFilter: (value, record) =>
      record.status &&
      record.status.toLowerCase().includes(value.toLowerCase()),
    filterIcon: () => <SearchOutlined />,
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
    render: (_, record) => {
      if (record.status === "FINALIZED") {
        return (
          <Tag color={"green"} className="Border-Style">
            Finalized
          </Tag>
        );
      } else if (record.status === "ENROLLED") {
        return (
          <Tag color={"orange"} className="Border-Style">
            Enrolled
          </Tag>
        );
      } else if (record.status === "UNENROLLED") {
        return (
          <Tag color={"red"} className="Border-Style">
            Unenrolled
          </Tag>
        );
      } else {
        return (
          <Tag color={"yellow"} className="Border-Style">
            Waitlist
          </Tag>
        );
      }
    },
  },
  {
    title: "Action",
    key: "action",
    width: "12%",
    render: (_, record) => (
      <Space size="middle">
        <InsModalWithContent
          buttonText={"Allocate"}
          name={record.studentName}
          email={record.email}
          projectId={record.projectId}
        />
      </Space>
    ),
  },
];

const InsStudentAllocation = () => {
  const navigate = useNavigate();
  let instructorId = localStorage.getItem("userId");
  const [studentData, setStudentData] = useState([]);
  const [download, setDownload] = useState(false);
  const [studentsArr, setStudentsArr] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(
        process.env.REACT_APP_LOCAL_DB_URL +
          `/api/v1/instructor/${instructorId}/students`,
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Token": localStorage.getItem("access_token"),
          },
        }
      )
      .then((res) => {
        setStudentData(
          res.data.response_data.map((obj, index) => {
            return {
              key: index,
              studentName:
                obj.firstName == null || obj.lastName == null ? (
                  <Tag color="gray"></Tag>
                ) : (
                  obj.firstName + " " + obj.lastName
                ),
              projectName: obj.projectName,
              email: obj.email,
              status: obj.position,
              projectId: obj.projectId,
              userId: obj.userId,
              courseName: obj.courseName,
              githubId: obj.githubId,
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

  const deleteApi = async () => {
    for (let i = 0; i < studentsArr.length; i++) {
      await fetch(
        process.env.REACT_APP_LOCAL_DB_URL + `/api/v1/user/deleteAllUser`,
        {
          method: "POST",
          mode: "cors",
          body: JSON.stringify({ users: [{ userId: studentsArr[i].userId }] }),
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
  const unenrollApi = async () => {
    let unenrollBody = [];
    for (let i = 0; i < studentsArr.length; i++) {
      unenrollBody.push({
        projectId: studentsArr[i].projectId,
        students: [studentsArr[i].email],
      });
    }
    await fetch(
      process.env.REACT_APP_LOCAL_DB_URL + `/api/v1/project/unenroll`,
      {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({ unenrollments: unenrollBody }),
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
          "Selected student(s) unenrolled"
        );
        setTimeout(() => {
          navigate(0);
        }, 2000);
      } else {
        NotificationHandler("failure", "Failed", "Unenroll student(s) failed");
      }
    });
    return;
  };

  const finalizeStudentsApi = async (navigate) => {
    for (let i = 0; i < studentsArr.length; i++) {
      if (studentsArr[i].status == "ENROLLED") {
        await fetch(
          process.env.REACT_APP_LOCAL_DB_URL + `/api/v1/project/finalise`,
          {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({
              allocations: [
                {
                  projectId: studentsArr[i].projectId,
                  students: [studentsArr[i].email],
                  year: new Date().getFullYear(),
                },
              ],
            }),

            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Token": localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        ).then((response) => {
          if (response.status === 200) {
            NotificationHandler(
              "success",
              "Success!",
              "Selected student(s) finalized"
            );
            setTimeout(() => {
              navigate(0);
            }, 2000);
          } else {
            NotificationHandler("failure", "Failed!", "Finalizing task failed");
          }
        });
      } else {
        NotificationHandler("failure", "Failed!", "Finalizing task failed");
      }
    }
    return;
  };
  const alternateCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      NotificationHandler("success", "Success!", "Selected email(s) Copied");
    } catch (err) {
      NotificationHandler("failure", "Failed", "No email(s) selected!");
    }
    document.body.removeChild(textArea);
  };

  const copyEmail = () => {
    let copiedEmails = [];
    for (let i = 0; i < studentsArr.length; i++) {
      copiedEmails.push(studentsArr[i].email);
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
  return (
    <>
      <Card
        className="Border-Style"
        hoverable={true}
        title="Manage Students"
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
                  if (studentsArr.length) {
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
                  if (studentsArr.length == 0) {
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
              buttonIcon={<SafetyCertificateOutlined />}
              modalText={"Are you sure you want to finalize?"}
              onOkFunc={() => finalizeStudentsApi(navigate)}
              isDanger={false}
              toolTipText={"Finalize Student(s)"}
              somethingSelected={studentsArr.length == 0}
            />
            <InsModalComp
              buttonIcon={<UndoOutlined />}
              modalText={"Are you sure you want to unenroll?"}
              onOkFunc={() => unenrollApi(navigate)}
              isDanger={false}
              toolTipText={"Unenroll Student(s)"}
              somethingSelected={studentsArr.length == 0}
            />
            <InsModalComp
              buttonIcon={<DeleteOutlined />}
              buttonType={"primary"}
              modalText={"Are you sure you want to delete item(s)?"}
              onOkFunc={deleteApi}
              isDanger={true}
              toolTipText={"Delete Student(s)"}
              somethingSelected={studentsArr.length == 0}
              extraParam={""}
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
            columns={columns}
            dataSource={studentData}
            rowSelection={{
              type: "checkbox",
              onChange: (_, rows) => setStudentsArr(rows),
            }}
            scroll={{
              y: "55vh",
            }}
          />
        )}
      </Card>
      {download && <CSVDownload data={studentsArr} target="_blank" />}
    </>
  );
};

export default InsStudentAllocation;
