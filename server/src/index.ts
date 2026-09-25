import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { db } from "./lib/db.js";
import authRouter from "./routes/auth.js";
import taskRouter from "./routes/tasks.js";
import userRouter from "./routes/users.js";
import employeeRouter from "./routes/employees.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/users", userRouter);
app.use("/api/employees", employeeRouter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Prorich Delegation API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    application: "Prorich Delegation Management",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db-health", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS departmentCount FROM Department"
    );

    const result = rows as Array<{ departmentCount: number }>;

    res.json({
      success: true,
      database: "CONNECTED",
      departmentCount: result[0]?.departmentCount ?? 0,
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    res.status(500).json({
      success: false,
      database: "ERROR",
    });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name
      FROM Department
      WHERE isActive = true
      ORDER BY name
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET DEPARTMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load departments",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});