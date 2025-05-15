const axios = require("axios");

const getUserInfoFromGoogle = async (accessToken) => {
  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return data;
  } catch (error) {
    console.error("Full error response:", error.response?.data);
    throw new Error("Failed to get user info from Google");
  }
};

module.exports = {
  getUserInfoFromGoogle,
};
