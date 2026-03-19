const User = require("../models/User");
const connectDB = require("../config/db");
const { listMemoryUsers } = require("../store/memoryStore");

const getUsers = async (req, res) => {
  try {
    const users = connectDB.databaseReady()
      ? await User.find({ name: { $ne: req.user.name } }).select("name").sort({ name: 1 })
      : (await listMemoryUsers()).filter((user) => user.name !== req.user.name);

    res.json(users);
  } catch (_error) {
    res.status(500).json({ message: "Không thể tải danh sách người dùng" });
  }
};

module.exports = {
  getUsers,
};