const express = require("express");
const {
  deleteConversation,
  deleteMessage,
  getMessages,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:username", protect, getMessages);
router.delete("/delete/:id", protect, deleteMessage);
router.delete("/conversation/:username", protect, deleteConversation);

module.exports = router;