const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Message = require("./models/Message");
const { verifySocketToken } = require("./middleware/authMiddleware");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
connectDB();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "ChatApp backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.use(verifySocketToken);

io.on("connection", (socket) => {
  socket.on("join_room", (room = "general") => {
    socket.join(room);
  });

  socket.on("send_message", async ({ room = "general", text }) => {
    if (!text || !text.trim()) {
      return;
    }

    const message = await Message.create({
      sender: socket.user.name,
      text: text.trim(),
    });

    io.to(room).emit("receive_message", {
      _id: message._id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
    });
  });

  socket.on("disconnect", () => {
    socket.leaveAll();
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
