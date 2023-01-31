export const getCoursesService = async (year, semester) => {
  let statusCode = null;
  let msg = null;
  let result = null;
  await fetch(
    process.env.REACT_APP_LOCAL_DB_URL +
      "/api/v1/course-code?" +
      "year=" +
      `${year}` +
      "&semester=" +
      `${semester}`,
    {
      method: "GET",
      mode: "cors",
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-Type": "application/json",
        "Access-Token": localStorage.getItem("access_token"),
      },
    }
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.hasOwnProperty("response_data")) {
        statusCode = 200;
        msg = data.response_str;
        result = data.response_data;
      } else {
        statusCode = data.status;
        msg = data.message;
        result = data;
      }
    })
    .catch((e) => {
      console.log("Error - " + e);
    });
  return { status: statusCode, data: result, message: msg };
};

export const setPassword = async (password) => {
  let statusCode = null;
  let msg = null;
  let result = null;
  await fetch(
    process.env.REACT_APP_LOCAL_DB_URL + "/api/v1/user/update-password",
    {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(password),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Access-Token": localStorage.getItem("access_token"),
      },
    }
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.hasOwnProperty("error")) {
        statusCode = 400;
        msg = data.error.message;
        result = data.error;
      } else {
        statusCode = 200;
        msg = data.response_str;
        result = data.response_data;
      }
    })
    .catch((e) => {
      //console.log("Error - " + e);
      statusCode = 400;
      msg = e.message;
      result = e.code;
    });
  return { status: statusCode, data: result, message: msg };
};

export const enrollProject = async (values) => {
  let statusCode = null;
  let msg = null;
  let result = null;
  let id = values.projectId;
  await fetch(
    process.env.REACT_APP_LOCAL_DB_URL +
      "/api/v1/project/" +
      `${id}` +
      "/enroll",
    {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(values),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Access-Token": localStorage.getItem("access_token"),
      },
    }
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.hasOwnProperty("error")) {
        statusCode = 400;
        msg = data.error.message;
        result = data.error;
      } else {
        statusCode = 200;
        msg = data.response_str;
        result = data.response_data;
      }
    })
    .catch((e) => {
      //console.log("Error - " + e);
      statusCode = 400;
      msg = e.message;
      result = e.code;
    });
  return { status: statusCode, data: result, message: msg };
};

export const WaitlistService = async (values) => {
  let statusCode = null;
  let msg = null;
  let result = null;
  let id = values.projectId;
  await fetch(
    process.env.REACT_APP_LOCAL_DB_URL +
      "/api/v1/project/" +
      `${id}` +
      "/waitlist",
    {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(values),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Access-Token": localStorage.getItem("access_token"),
      },
    }
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.hasOwnProperty("response_data")) {
        statusCode = 200;
        msg = data.response_str;
        result = data.response_data;
      } else {
        statusCode = 400;
        msg = data.error.message;
        result = data;
      }
    })
    .catch((e) => {
      //console.log("Error - " + e);
    });
  return { status: statusCode, data: result, message: msg };
};
