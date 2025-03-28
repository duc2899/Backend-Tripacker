require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/database");
const errorHandler = require("./middlewares/errorHandeler");
const requestLogger = require("./middlewares/requestLogger");
const rateLimiter = require("./middlewares/rateLimiter");

connectDB();

const app = express();

app.use(express.json({ limit: "10mb" })); // Giới hạn request body tối đa 10MB
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
app.use(
  cors({
    credentials: true,
  })
);

// Kết nối MongoDB
app.use(express.json());

app.set("trust proxy", 1);

app.use(requestLogger);
app.use(rateLimiter);

app.use("/v1/api", require("./routers/index"));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server is running on port ${PORT}`);
});
