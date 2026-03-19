const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const Message = require("./models/Message");
const { verifySocketToken } = require("./middleware/authMiddleware");
const { createMemoryMessage } = require("./store/memoryStore");

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
  res.json({
    message: "ChatApp backend is running",
    mode: connectDB.databaseReady() ? "mongodb" : "memory",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.use(verifySocketToken);

const onlineUsers = new Set();
const typingPairs = new Map();

const pairKey = (a, b) => [a, b].sort().join("::");
const emitOnlineUsers = () => {
  io.emit("online_users", Array.from(onlineUsers));
};

io.on("connection", (socket) => {
  const userName = socket.user.name;
  socket.join(`user:${userName}`);
  onlineUsers.add(userName);
  emitOnlineUsers();

  socket.on("typing_start", ({ recipient }) => {
    if (!recipient || recipient === userName) {
      return;
    }

    const key = pairKey(userName, recipient);
    if (!typingPairs.has(key)) {
      typingPairs.set(key, new Set());
    }

    typingPairs.get(key).add(userName);
    io.to(`user:${recipient}`).emit("typing_status", {
      from: userName,
      isTyping: true,
    });
  });

  socket.on("typing_stop", ({ recipient }) => {
    if (!recipient || recipient === userName) {
      return;
    }

    const key = pairKey(userName, recipient);
    typingPairs.get(key)?.delete(userName);
    io.to(`user:${recipient}`).emit("typing_status", {
      from: userName,
      isTyping: false,
    });
  });

  socket.on("send_message", async ({ recipient, text }) => {
    if (!recipient || recipient === userName || !text || !text.trim()) {
      return;
    }

    const key = pairKey(userName, recipient);
    typingPairs.get(key)?.delete(userName);
    io.to(`user:${recipient}`).emit("typing_status", {
      from: userName,
      isTyping: false,
    });

    const message = connectDB.databaseReady()
      ? await Message.create({
          sender: userName,
          recipient,
          text: text.trim(),
        })
      : await createMemoryMessage({
          sender: userName,
          recipient,
          text: text.trim(),
        });

    io.to(`user:${userName}`).to(`user:${recipient}`).emit("receive_message", {
      _id: message._id,
      sender: message.sender,
      recipient: message.recipient,
      text: message.text,
      timestamp: message.timestamp,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userName);
    emitOnlineUsers();

    for (const [key, typers] of typingPairs.entries()) {
      if (typers.delete(userName)) {
        const otherUser = key
          .split("::")
          .find((name) => name !== userName);

        if (otherUser) {
          io.to(`user:${otherUser}`).emit("typing_status", {
            from: userName,
            isTyping: false,
          });
        }
      }
    }

    socket.leaveAll();
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});