/* eslint-disable */
import React, { useContext, useEffect, useState } from "react";
import {
  Layout,
  Space,
  Avatar,
  Row,
  Col,
  Tooltip,
  Badge,
  Tag,
  Dropdown,
  Menu,
  Button,
  Affix,
} from "antd";
import {
  BellOutlined,
  GitlabOutlined,
  LogoutOutlined,
  RocketOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authDetailsContext } from "../../../App";
import ParticipantProfile from "./ParticipantProfile";
import { getUserProfile } from "../../Participants/Services/PartcipantServices";
import { NotificationHandler } from "../../Common/Notifications/NotificationHandler";
import { getRequestsByType } from "../../Admin/Services/AdminServices";
import { MainContext } from "../../../Context/MainContext";
import axios from "axios";
const { Header } = Layout;

const Appbar = (props) => {
  const [showProfile, setShowProfile] = useState(false);
  const authProps = useContext(authDetailsContext);
  const { setIsLoggedIn } = useContext(MainContext);
  const [imageSrc, setImageSrc] = useState("");

  useEffect(() => {
    axios
      .get(process.env.REACT_APP_LOCAL_DB_URL + "/api/v1/user/profile", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Token": localStorage.getItem("access_token"),
        },
      })
      .then((res) => {
        // if (res.data.response_data.image === "") {
        //   setImageSrc(default_profile_img);
        // } else {

        setImageSrc(res.data.response_data.image);
        // }
      });
  }, []);

  const navigate = useNavigate();
  const logoutFun = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate("/", { replace: true });
    navigate(0);
  };

  const onClickLogo = () => {
    navigate("/home", { replace: true });
  };

  const menu = (
    <Menu
      className="Border-Style"
      items={[
        {
          key: "1",
          label: (
            <div
              onClick={() => navigate("/updateProfile")}
              style={{ fontSize: "22" }}
            >
              My Profile
            </div>
          ),
          icon: <UserOutlined style={{ fontSize: "18px" }} />,
        },
        {
          key: "2",
          label: (
            <div onClick={logoutFun} style={{ fontSize: "22" }}>
              Logout
            </div>
          ),
          icon: <LogoutOutlined style={{ fontSize: "18px" }} />,
        },
      ]}
      style={{ width: 200 }}
    />
  );
  return (
    <Affix>
      <Header>
        {!showProfile ? (
          <Row>
            <Col span={22}>
              <Button
                style={{
                  marginLeft: "-40px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "15px",
                  verticalAlign: "top",
                }}
                onClick={onClickLogo}
                size="large"
              >
                Capstone Project Management
              </Button>
            </Col>
            {localStorage.getItem("access_token") ? (
              <Col span={2}>
                <Space>
                  <Dropdown overlay={menu} placement="bottom" trigger={"click"}>
                    <img
                      src={imageSrc}
                      style={{
                        borderRadius: "50%",
                        border: "1px solid",
                        cursor: "pointer",
                      }}
                      width="50"
                      height="50"
                    />
                  </Dropdown>
                </Space>
              </Col>
            ) : (
              <> </>
            )}
          </Row>
        ) : (
          <ParticipantProfile
            showProfile={showProfile}
            setShowProfile={setShowProfile}
          />
        )}
      </Header>
    </Affix>
  );
};
export default Appbar;
