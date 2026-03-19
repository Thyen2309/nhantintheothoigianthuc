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

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.use(verifySocketToken);

const roomTypers = new Map();
const roomOnlineUsers = new Map();

const emitOnlineUsers = (room) => {
  const users = roomOnlineUsers.has(room) ? Array.from(roomOnlineUsers.get(room)) : [];
  io.to(room).emit("online_users", users);
};

io.on("connection", (socket) => {
  socket.on("join_room", (room = "general") => {
    socket.join(room);
    socket.currentRoom = room;

    if (!roomOnlineUsers.has(room)) {
      roomOnlineUsers.set(room, new Set());
    }

    roomOnlineUsers.get(room).add(socket.user.name);
    emitOnlineUsers(room);
  });

  socket.on("typing_start", ({ room = "general" }) => {
    if (!roomTypers.has(room)) {
      roomTypers.set(room, new Set());
    }

    roomTypers.get(room).add(socket.user.name);
    socket.to(room).emit("typing_users", Array.from(roomTypers.get(room)));
  });

  socket.on("typing_stop", ({ room = "general" }) => {
    if (!roomTypers.has(room)) {
      return;
    }

    roomTypers.get(room).delete(socket.user.name);
    socket.to(room).emit("typing_users", Array.from(roomTypers.get(room)));
  });

  socket.on("send_message", async ({ room = "general", text }) => {
    if (!text || !text.trim()) {
      return;
    }

    if (roomTypers.has(room)) {
      roomTypers.get(room).delete(socket.user.name);
      socket.to(room).emit("typing_users", Array.from(roomTypers.get(room)));
    }

    const message = connectDB.databaseReady()
      ? await Message.create({
          sender: socket.user.name,
          text: text.trim(),
        })
      : await createMemoryMessage({
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
    for (const [room, typers] of roomTypers.entries()) {
      if (typers.delete(socket.user.name)) {
        socket.to(room).emit("typing_users", Array.from(typers));
      }
    }

    for (const [room, onlineUsers] of roomOnlineUsers.entries()) {
      if (onlineUsers.delete(socket.user.name)) {
        emitOnlineUsers(room);
      }
    }

    socket.leaveAll();
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
