const Message = require("../models/Message");
const connectDB = require("../config/db");
const { listMemoryMessages } = require("../store/memoryStore");

const getMessages = async (_req, res) => {
  try {
    const messages = connectDB.databaseReady()
      ? await Message.find().sort({ timestamp: 1 }).limit(200)
      : await listMemoryMessages();

    res.json(messages);
  } catch (_error) {
    res.status(500).json({ message: "Could not fetch messages" });
  }
};

module.exports = {
  getMessages,
};
