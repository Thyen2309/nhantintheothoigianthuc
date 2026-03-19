const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const connectDB = require("../config/db");
const { createMemoryUser, findMemoryUserByName } = require("../store/memoryStore");

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const register = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "Tên và mật khẩu là bắt buộc" });
    }

    const existingUser = connectDB.databaseReady()
      ? await User.findOne({ name: name.trim() })
      : await findMemoryUserByName(name);

    if (existingUser) {
      return res.status(409).json({ message: "Tên người dùng đã tồn tại" });
    }

    const user = connectDB.databaseReady()
      ? await User.create({
          name: name.trim(),
          password: await bcrypt.hash(password, 10),
        })
      : await createMemoryUser({ name, password });

    res.status(201).json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Đăng ký thất bại" });
  }
};

const login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "Tên và mật khẩu là bắt buộc" });
    }

    const user = connectDB.databaseReady()
      ? await User.findOne({ name: name.trim() })
      : await findMemoryUserByName(name);

    if (!user) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng" });
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Đăng nhập thất bại" });
  }
};

module.exports = {
  register,
  login,
};