const Message = require("../models/Message");
const connectDB = require("../config/db");
const { listMemoryMessagesForPair } = require("../store/memoryStore");

const getMessages = async (req, res) => {
  try {
    const { username } = req.params;

    const messages = connectDB.databaseReady()
      ? await Message.find({
          $or: [
            { sender: req.user.name, recipient: username },
            { sender: username, recipient: req.user.name },
          ],
        })
          .sort({ timestamp: 1 })
          .limit(200)
      : await listMemoryMessagesForPair(req.user.name, username);

    res.json(messages);
  } catch (_error) {
    res.status(500).json({ message: "Không thể tải tin nhắn" });
  }
};

module.exports = {
  getMessages,
};