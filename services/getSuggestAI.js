const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const API_KEY = "AIzaSyA4hlexUlxFOosCnEPiwtE--37VKVMOaJo"; // Thay bằng API Key của bạn
const genAI = new GoogleGenerativeAI(API_KEY);

async function listAvailableModels() {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    console.log("Danh sách model:", response.data);
  } catch (error) {
    console.error(
      "Lỗi khi lấy danh sách model:",
      error.response?.data || error.message
    );
  }
}

async function callAI(prompt) {
  const model = genAI.getGenerativeModel({
    model: "models/gemini-1.5-flash",
    temperature: 0.2, // Giảm randomness để trả lời nhanh hơn
    maxTokens: 500, // Giới hạn số token trả về
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text(); // Nếu JSON thì có thể cần .json()
}

module.exports = { callAI, listAvailableModels };
