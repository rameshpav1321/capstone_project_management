import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Layout,
  Table,
  Modal,
  Divider,
  Space,
  Tag,
} from "antd";
import { getUploadResponse } from "../Common/Services/Projects/ProjectServices";
import { NotificationHandler } from "../Common/Notifications/NotificationHandler";
import React, { useState } from "react";
import { getRoutes } from "../Common/Services/Projects/routes";
import { getAPIResponse } from "../Common/Services/Projects/ProjectServices";
import { GetTitle } from "../Common/Utils/GetTitle";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const InsAddUsers = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [uploadPreview, showUploadPreview] = useState(false);
  const [insertPreviewData, setInsertPreviewData] = useState([]);
  const [deletePreviewData, setDeletePreviewData] = useState([]);
  const [selectedFile, setSelectedFile] = useState();

  const [fileName, setFileName] = useState();

  const changeHandler = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const showCSVPreview = async () => {
    if (!selectedFile) {
      NotificationHandler("failure", "Failed", "Please upload a file");
      return;
    }
    const url = getRoutes("previewCSV");
    const formData = new FormData();
    formData.append("csvfile", selectedFile);

    let body = formData;
    let result = await getUploadResponse(url, "POST", body);

    if (result.status === 200) {
      setFileName(result.data.file);
      if (result.data.AddedUsers.length || result.data.DeletedRole.length) {
        setInsertPreviewData(result.data.AddedUsers);
        setDeletePreviewData(result.data.DeletedRole);
        showUploadPreview(true);
      } else {
        setSelectedFile();
        NotificationHandler("success", "Success!", "No changes to update.");
      }
    } else {
      setSelectedFile();
      NotificationHandler("failure", "Failed!", "Preview failed.");
    }
  };

  const uploadCSV = async () => {
    const url = getRoutes("uploadCSV");
    let body = {
      fileName: fileName,
      deleteFile: false,
    };
    let result = await getAPIResponse(url, "POST", body);

    if (result.status === 200) {
      showUploadPreview(false);
      NotificationHandler("success", "Success!", result.message);
      setSelectedFile();
    } else {
      NotificationHandler("failure", "Failed!", result.message);
    }
  };

  const removeCSV = async () => {
    showUploadPreview(false);
    const url = getRoutes("uploadCSV");
    let body = {
      fileName: fileName,
      deleteFile: true,
    };
    let result = await getAPIResponse(url, "POST", body);
    setSelectedFile();
  };

  const columns = [
    {
      title: "Emails",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Roles",
      dataIndex: "role",
      key: "role",
      render: (_, { role, index }) => (
        <>
          {role.map((rol) => {
            let color = "geekblue";
            return (
              <Tag
                color={color}
                key={index}
                className="Border-Style"
                style={{ margin: "2px" }}
              >
                {rol}
              </Tag>
            );
          })}
        </>
      ),
    },
  ];

  const onFinish = async (values) => {
    let url = getRoutes("addUser");
    let result = await getAPIResponse(url, "POST", values);
    if (result.status == 200) {
      NotificationHandler("success", "Success!", result.message);
      form.resetFields();
    } else {
      NotificationHandler("failure", "Failed!", result.message);
    }
  };

  return (
    <>
      <Modal
        title="Upload Preview"
        open={uploadPreview}
        onCancel={removeCSV}
        footer={[
          <Button key="back" onClick={removeCSV}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={uploadCSV}>
            Proceed with upload
          </Button>,
        ]}
        width={850}
      >
        <Space align="start">
          <div>
            {" "}
            <Divider>Add users</Divider>
            <Table
              bordered
              columns={columns}
              dataSource={insertPreviewData}
              pagination={false}
              scroll={{ y: 300 }}
            />{" "}
          </div>
          <div>
            {" "}
            <Divider>Delete users</Divider>
            <Table
              bordered
              columns={columns}
              dataSource={deletePreviewData}
              pagination={false}
              scroll={{ y: 300 }}
            />{" "}
          </div>
        </Space>
      </Modal>

      <Card
        title={<GetTitle title={"Add New User"} onClick={navigate} />}
        className="Border-Style"
      >
        <Form
          name="addUser"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 8 }}
          labelAlign="left"
          autoComplete="off"
          onFinish={onFinish}
          form={form}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: "Please enter user's email",
              },
            ]}
          >
            <Input className="Border-Style" />
          </Form.Item>
          <Form.Item
            label="Role(s)"
            name="roles"
            rules={[
              {
                required: true,
                message: "Please select role",
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select role(s)"
              popupClassName="Border-Style"
            >
              <Option value="INSTRUCTOR">Instructor</Option>
              <Option value="STUDENT">Student</Option>
              <Option value="CLIENT">Client</Option>
              <Option value="JUDGE">Judge</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" className="Border-Style" type="primary">
              Add User
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Bulk Uploads"
        className="Border-Style"
        style={{ marginTop: "5px" }}
      >
        <Space>
          <input type="file" name="file" onChange={changeHandler} />
          <div style={{ marginLeft: "-45px" }}>
            <Button
              onClick={showCSVPreview}
              className="Border-Style"
              type="primary"
            >
              Upload Preview
            </Button>
          </div>
        </Space>
      </Card>
    </>
  );
};

export default InsAddUsers;
