const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const app = express();
const port = process.env.PORT || 5000;
const dotenv = require("dotenv");

//  load environment variables
dotenv.config();

// initialize express
app.use(express.json());
app.use(morgan("tiny"));

// Allow requests from specified origins
const allowedOrigins = [
  "*",
  "http://localhost:5173",
  "https://task-management-41de0.web.app",
  "https://task-management-41de0.web.app/dashboard",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

// innitialize firebase admin
// // console.log('MONGO_URI from env:', JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Mongodb connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    console.log(`Connected to MongoDB atlas (database: task-management)`)
  )
  .catch((error) => {
    // console.log(`Mongodb connection error ${error}`);
    process.exit(1);
  });

// user schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  displayName: String,
  role: String,
});
const User = mongoose.model("User", userSchema);

// task schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 50 },
  description: { type: String, maxlength: 200 },
  category: {
    type: String,
    enum: ["To-Do", "In Progress", "Done"],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  order: { type: Number, default: 0 },
});
const Task = mongoose.model("Task", taskSchema);

// JWT middleware
const tokenVerify = (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res.status(401).send({ error: "Access forbidden" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ error: "Unauthorized access" });
    req.user = decoded;
    next();
  });
};

// login endpoint
app.post("/login", async (req, res) => {
  const { idToken, role } = req.body;
  // // console.log("Login Request Body:", req.body); //returned data
  if (!idToken) {
    return res.status(400).send({ error: "idToken missing in request" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    // // console.log("Decoded Token:", decoded); //returned data

    let user = await User.findOne({ userId: decoded.uid });
    // // console.log("user from db", { user }); //returned data expected
    if (!user) {
      user = new User({
        userId: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
        role: role || "user",
      });
      // // console.log("New User Before Save:", user);
      await user.save();
      // // console.log("New User After Save:", user);
    }
    //generate jwt token
    const jwtToken = jwt.sign(
      { userId: decoded.uid, email: decoded.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );
    // // console.log("Sending Response:", { token: jwtToken }); //no return why
    res.send({ token: jwtToken });
    // // console.log("Response Sent Successfully!"); //no return
  } catch (error) {
    // // console.error("Token verification failed:", error.message);
    res
      .status(401)
      .send({ error: "Invalid Firebase token", details: error.message });
  }
});

// CRUD Endpoints
app.post("/tasks", tokenVerify, async (req, res) => {
  // console.log("Posted task", { ...req.body, userId: req.user.userId });
  try {
    const task = new Task({ ...req.body, userId: req.user.userId });
    await task.save();
    res.status(201).send(task);
  } catch (error) {
    res
      .status(400)
      .send({ error: "Failed to create task", details: error.message });
  }
});

app.get("/tasks", tokenVerify, async (req, res) => {
  try {
    const task = await Task.find({ userId: req.user.userId }).sort({
      order: 1,
    });
    res.send(task);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to fetch tasks", details: error.message });
  }
});

app.put("/tasks/:id", tokenVerify, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).send({ error: "Task not found" });
    res.send(task);
  } catch (error) {
    res
      .status(400)
      .send({ error: "Failed to update task", details: error.message });
  }
});

app.delete("/tasks/:id", tokenVerify, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!task) return res.status(404).send({ error: "Task not found" });
    res.send({ message: "Task has been deleted!" });
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to delete task", details: error.message });
  }
});

app.get("/", async (req, res) => {
  res.send(`Your favorite task management server running on ${port}`);
});

app.listen(port, () => {
  // console.log(`Task management server is running on port ${port}`);
});
