const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const { createServer } = require("http");
const path = require("path");

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/docs", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({ username: String, password: String });
const DocumentSchema = new mongoose.Schema({ title: String, content: Object });

const User = mongoose.model("User", UserSchema);
const Document = mongoose.model("Document", DocumentSchema);

// User Authentication
app.post("/api/signup", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, password: hashedPassword }).save();
    res.json({ message: "User created" });
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
    res.json({ token });
});

// Document API
app.get("/api/documents", async (req, res) => {
    res.json(await Document.find());
});

app.post("/api/documents", async (req, res) => {
    const { title, content } = req.body;
    const doc = await new Document({ title, content }).save();
    res.json(doc);
});

app.get("/api/documents/:id", async (req, res) => {
    res.json(await Document.findById(req.params.id));
});

// Real-time Collaboration with WebSockets
io.on("connection", (socket) => {
    socket.on("edit-document", async ({ docId, content }) => {
        await Document.findByIdAndUpdate(docId, { content });
        io.emit("document-updated", { docId, content });
    });
});

// Serve React Frontend
app.use(express.static(path.join(__dirname, "client/build")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

server.listen(5000, () => console.log("Server running on port 5000"));
