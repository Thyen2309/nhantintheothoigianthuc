const bcrypt = require("bcryptjs");

const users = [];
const messages = [];

const createMemoryUser = async ({ name, password }) => {
  const trimmedName = name.trim();
  const existingUser = users.find((user) => user.name === trimmedName);

  if (existingUser) {
    return null;
  }

  const user = {
    _id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    password: await bcrypt.hash(password, 10),
  };

  users.push(user);
  return user;
};

const findMemoryUserByName = async (name) => {
  const trimmedName = name.trim();
  return users.find((user) => user.name === trimmedName) || null;
};

const createMemoryMessage = async ({ sender, text }) => {
  const message = {
    _id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text: text.trim(),
    timestamp: new Date(),
  };

  messages.push(message);
  return message;
};

const listMemoryMessages = async () => messages.slice(-200);

module.exports = {
  createMemoryMessage,
  createMemoryUser,
  findMemoryUserByName,
  listMemoryMessages,
};
