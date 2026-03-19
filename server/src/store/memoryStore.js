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

const listMemoryUsers = async () =>
  users.map((user) => ({
    _id: user._id,
    name: user.name,
  }));

const createMemoryMessage = async ({ sender, recipient, text }) => {
  const message = {
    _id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    recipient,
    text: text.trim(),
    timestamp: new Date(),
  };

  messages.push(message);
  return message;
};

const listMemoryMessagesForPair = async (currentUser, otherUser) =>
  messages
    .filter(
      (message) =>
        (message.sender === currentUser && message.recipient === otherUser) ||
        (message.sender === otherUser && message.recipient === currentUser)
    )
    .slice(-200);

module.exports = {
  createMemoryMessage,
  createMemoryUser,
  findMemoryUserByName,
  listMemoryMessagesForPair,
  listMemoryUsers,
};