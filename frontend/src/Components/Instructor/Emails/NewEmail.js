import { Card, Form, Input, Select, Button, Image, Col, Row } from "antd";
import TextArea from "antd/lib/input/TextArea";
import React, { useState, useEffect } from "react";
import DynamicTags from "../../Common/DynamicTags";
import { getRoutes } from "../../Common/Services/Projects/routes";
import { getAPIResponse } from "../../Common/Services/Projects/ProjectServices";
import { NotificationHandler } from "../../Common/Notifications/NotificationHandler";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const NewEmailForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [tags, setTags] = useState([]);
  const [templates, setEmailTemplates] = useState();
  const [templateDetails, setTemplateDetails] = useState();
  const [selectedKeyword, setSelectedKeyword] = useState();

  const onFinish = async (values) => {
    let url = getRoutes("sendNewEmail");
    let body = values;
    body.emailIds = tags;
    let res = await getAPIResponse(url, "POST", body);
    if (res.status == 200) {
      NotificationHandler("success", "Success!", res.message);
      form.resetFields();
      setTags([]);
      navigate("/ins/emailLogs");
    } else {
      NotificationHandler("failure", "Failed!", res.message);
    }
  };

  const getEmailTemplates = async () => {
    let url = getRoutes("getEmailTemplates");
    let res = await getAPIResponse(url, "GET");
    if (res.status == 200) {
      let responseData = res.data.response;
      let temp = [];
      responseData.forEach((data) => {
        temp.push(data.title);
      });
      setEmailTemplates(temp);
      setTemplateDetails(responseData);
    } else {
      NotificationHandler("failure", "Failed!", res.message);
    }
  };

  const showTemplateDetails = (e) => {
    for (let i = 0; i < templateDetails.length; i++) {
      if (templateDetails[i].title == e) {
        form.setFieldsValue({
          emailSubject: templateDetails[i].emailSubject,
          emailBody: templateDetails[i].emailBody,
        });
        break;
      }
    }
  };
  const alternateCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.log(err);
    }
    document.body.removeChild(textArea);
  };

  const copy = () => {
    if (selectedKeyword !== "" && window.isSecureContext) {
      navigator.clipboard.writeText(String(selectedKeyword));
    } else {
      alternateCopy(selectedKeyword);
    }
  };

  useEffect(() => {
    getEmailTemplates();
  }, []);

  return (
    <div>
      <Card title="New Email" className="Border-Style" hoverable={true}>
        <Col>
          <Form
            name="new-email-form"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 12 }}
            labelAlign="left"
            autoComplete="off"
            onFinish={onFinish}
            form={form}
          >
            <Row>
              <Col span={8}>
                <Form.Item
                  label={<label style={{ fontWeight: 400 }}>Keyword</label>}
                  name="keyword"
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 16 }}
                  rules={[
                    {
                      message: "Please select the keyword",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select keyword"
                    onChange={(e) => setSelectedKeyword(e)}
                    popupClassName="Border-Style"
                  >
                    <Option value="{~User Name~}">User Name</Option>
                    <Option value="{~User Details~}">User Details</Option>
                    <Option value="{~Token~}">Token</Option>
                    <Option value="{~User Roles~}">User Roles</Option>
                    <Option value="{~Student Projects~}">
                      Student Projects
                    </Option>
                    <Option value="{~Client Projects~}">Client Projects</Option>
                    <Option value="{~Events~}">Events</Option>
                    <Option value="{~Judge Events~}">Judge Events</Option>
                    <Option value="{~Judge Projects~}">Judge Projects</Option>
                    <Option value="{~Instructor Details~}">
                      Instructor Details
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Button onClick={copy}>Copy to clipboard</Button>
              </Col>
            </Row>
            <Row>
              <Col span={8}>
                <Form.Item
                  label={<label style={{ fontWeight: 400 }}>Template</label>}
                  name="template"
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 16 }}
                  rules={[
                    {
                      message: "Please select the template",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select template"
                    onChange={showTemplateDetails}
                    popupClassName="Border-Style"
                  >
                    {templates &&
                      templates.map((template) => {
                        return <Option value={template}> {template} </Option>;
                      })}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Form.Item
                  label={<label style={{ fontWeight: 400 }}>To</label>}
                  name="recipent"
                  wrapperCol={{ span: 20 }}
                >
                  <DynamicTags
                    tagText={"Add Recipient(s)"}
                    tagFunc={setTags}
                    tagCont={tags}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Form.Item
                  label={<label style={{ fontWeight: 400 }}>Subject</label>}
                  name="emailSubject"
                  wrapperCol={{ span: 20 }}
                >
                  <Input className="Border-Style" />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Form.Item
                  label={<label style={{ fontWeight: 400 }}>Body</label>}
                  style={{ color: "red" }}
                  name="emailBody"
                  wrapperCol={{ span: 20 }}
                >
                  <TextArea className="Border-Style" rows={6} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Form.Item
                  label=" "
                  colon={false}
                  name="send"
                  wrapperCol={{ span: 20 }}
                >
                  <Button htmlType="submit" type="primary">
                    {" "}
                    Send{" "}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Col>
      </Card>
    </div>
  );
};

export default NewEmailForm;
