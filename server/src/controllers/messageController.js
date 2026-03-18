const Message = require("../models/Message");

const getMessages = async (_req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(200);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch messages" });
  }
};

module.exports = {
  getMessages,
};
