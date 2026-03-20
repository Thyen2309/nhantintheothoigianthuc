const Message = require("../models/Message");
const connectDB = require("../config/db");
const {
  deleteMemoryConversation,
  deleteMemoryMessage,
  listMemoryMessagesForPair,
} = require("../store/memoryStore");

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

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (connectDB.databaseReady()) {
      const message = await Message.findById(id);

      if (!message) {
        return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
      }

      if (message.sender !== req.user.name) {
        return res.status(403).json({ message: "Bạn chỉ có thể xóa tin nhắn của mình" });
      }

      await message.deleteOne();
      return res.json({
        message: "Đã xóa tin nhắn",
        deletedMessage: {
          _id: message._id,
          sender: message.sender,
          recipient: message.recipient,
        },
      });
    }

    const result = await deleteMemoryMessage(id, req.user.name);

    if (result.status === "not_found") {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({ message: "Bạn chỉ có thể xóa tin nhắn của mình" });
    }

    return res.json({
      message: "Đã xóa tin nhắn",
      deletedMessage: {
        _id: result.message._id,
        sender: result.message.sender,
        recipient: result.message.recipient,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Không thể xóa tin nhắn" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { username } = req.params;

    if (connectDB.databaseReady()) {
      const result = await Message.deleteMany({
        $or: [
          { sender: req.user.name, recipient: username },
          { sender: username, recipient: req.user.name },
        ],
      });

      return res.json({
        message: "Đã xóa đoạn chat",
        deletedCount: result.deletedCount || 0,
      });
    }

    const result = await deleteMemoryConversation(req.user.name, username);
    return res.json({
      message: "Đã xóa đoạn chat",
      deletedCount: result.deletedCount,
    });
  } catch (_error) {
    res.status(500).json({ message: "Không thể xóa đoạn chat" });
  }
};

module.exports = {
  deleteConversation,
  deleteMessage,
  getMessages,
};