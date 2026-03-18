const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
      return res.status(400).json({ message: "Name and password are required" });
    }

    const existingUser = await User.findOne({ name: name.trim() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      password: hashedPassword,
    });

    res.status(201).json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "Name and password are required" });
    }

    const user = await User.findOne({ name: name.trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};

module.exports = {
  register,
  login,
};
