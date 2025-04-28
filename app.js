// Environment and core dependencies
require("./config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");

// Custom modules
const Database = require("./config/database");
const errorHandler = require("./middlewares/errorHandeler");
const requestLogger = require("./middlewares/requestLogger");
const rateLimiter = require("./middlewares/rateLimiter");
const { checkOverLoad } = require("./helpers/check.connect");

// Initialize database connection
const database = Database.getInstance();
database.connect();

// Create Express app
const app = express();

// Environment check
const isDevelopment = process.env.NODE_ENV === "development";

// Basic middleware configuration
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Check overload database connection
checkOverLoad();

// Security middleware
app.use(helmet());
app.set("trust proxy", 1);

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Custom middleware
app.use(requestLogger);
app.use(rateLimiter);
app.use(compression());

// Routes
app.use("/v1/api", require("./routers/index"));

// Error handling
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server is running on port ${PORT}`);
});
