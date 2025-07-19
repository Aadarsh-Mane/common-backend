import express from "express";
import { connectDB } from "./dbConnect.js";
import userRouter from "./routes/users.js";
import receiptionRouter from "./routes/reception.js";
import doctorRouter from "./routes/doctor.js";
import patientRouter from "./routes/patient.js";
import puppeteer from "puppeteer";
import nurseRouter from "./routes/nurse.js";
import cors from "cors";
import labRouter from "./routes/lab.js";
import { getPatientHistory } from "./controllers/doctorController.js";
import { getFcmToken } from "./controllers/notifyController.js";
import { auth } from "./middleware/auth.js";
import { Server } from "socket.io";
import http from "http";
import { socketHandler } from "./socketHandler.js";
import fs from "fs";
import adminRouter from "./routes/admin.js";
import investigateRouter from "./routes/investigation.js";
import pharmaRouter from "./routes/pharma.js";
import chatRouter from "./routes/chats.js";
import masterRouter from "./routes/master.js";
const port = 5001;
//hello saideep v3
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this based on your frontend URL in production
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize socket handler
socketHandler(io);

app.use(express.json());
app.use(cors());
connectDB();
app.use("/users", userRouter);
app.use("/patient", patientRouter);
app.use("/reception", receiptionRouter);
app.use("/admin", adminRouter);
app.use("/doctors", doctorRouter);
app.use("/nurse", nurseRouter);
app.use("/master", masterRouter);
app.use("/chat", chatRouter); // Add chat routes

app.use("/labs", labRouter);
app.use("/investigate", investigateRouter);
app.use("/pharma", pharmaRouter);
app.get("/patientHistory/:patientId", getPatientHistory);

app.get("/", (req, res) => {
  return res
    .status(200)
    .json("Welcome to Ai in HealthCare common backend v3.5");
});
let medicines = {};
fs.readFile("./test.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading JSON file:", err);
    return;
  }
  medicines = JSON.parse(data);
});

// Endpoint for search suggestions
app.get("/search", (req, res) => {
  const query = req.query.q?.toLowerCase(); // Get the query parameter
  const limit = parseInt(req.query.limit) || 3; // Get the limit parameter, default to 1 if not provided

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  // Filter medicines based on query
  const suggestions = Object.values(medicines).filter((medicine) =>
    medicine.toLowerCase().includes(query)
  );

  // Apply the limit to the number of suggestions
  const limitedSuggestions = suggestions.slice(0, limit);

  res.json({ suggestions: limitedSuggestions });
});
app.get("/socket-status", (req, res) => {
  const connectedClients = io.engine.clientsCount;
  res.status(200).json({
    success: true,
    message: "Socket.IO is running",
    connectedClients,
    timestamp: new Date().toISOString(),
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
