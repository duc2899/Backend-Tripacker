import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: "" });

async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  console.log("Image URL:", response.data[0].url);
  return response.data[0].url;
}

generateImage("a futuristic cyberpunk city at night");
