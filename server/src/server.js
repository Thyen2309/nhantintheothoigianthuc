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
const {
  createMemoryMessage,
  deleteMemoryConversation,
  deleteMemoryMessage,
} = require("./store/memoryStore");

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
    methods: ["GET", "POST", "DELETE"],
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

  socket.on("delete_message", async ({ messageId }) => {
    if (!messageId) {
      return;
    }

    let deletedMessage;

    if (connectDB.databaseReady()) {
      const message = await Message.findById(messageId);
      if (!message || message.sender !== userName) {
        return;
      }

      deletedMessage = {
        _id: message._id,
        sender: message.sender,
        recipient: message.recipient,
      };
      await message.deleteOne();
    } else {
      const result = await deleteMemoryMessage(messageId, userName);
      if (result.status !== "deleted") {
        return;
      }

      deletedMessage = {
        _id: result.message._id,
        sender: result.message.sender,
        recipient: result.message.recipient,
      };
    }

    io.to(`user:${deletedMessage.sender}`)
      .to(`user:${deletedMessage.recipient}`)
      .emit("message_deleted", { messageId: deletedMessage._id });
  });

  socket.on("delete_conversation", async ({ recipient }) => {
    if (!recipient || recipient === userName) {
      return;
    }

    if (connectDB.databaseReady()) {
      await Message.deleteMany({
        $or: [
          { sender: userName, recipient },
          { sender: recipient, recipient: userName },
        ],
      });
    } else {
      await deleteMemoryConversation(userName, recipient);
    }

    io.to(`user:${userName}`)
      .to(`user:${recipient}`)
      .emit("conversation_deleted", {
        users: [userName, recipient],
      });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userName);
    emitOnlineUsers();

    for (const [key, typers] of typingPairs.entries()) {
      if (typers.delete(userName)) {
        const otherUser = key.split("::").find((name) => name !== userName);

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