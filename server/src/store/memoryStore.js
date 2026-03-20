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

const deleteMemoryMessage = async (messageId, currentUser) => {
  const index = messages.findIndex((message) => message._id === messageId);
  if (index === -1) {
    return { status: "not_found" };
  }

  if (messages[index].sender !== currentUser) {
    return { status: "forbidden" };
  }

  const [deletedMessage] = messages.splice(index, 1);
  return { status: "deleted", message: deletedMessage };
};

const deleteMemoryConversation = async (currentUser, otherUser) => {
  const beforeCount = messages.length;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const isPair =
      (message.sender === currentUser && message.recipient === otherUser) ||
      (message.sender === otherUser && message.recipient === currentUser);

    if (isPair) {
      messages.splice(index, 1);
    }
  }

  return {
    deletedCount: beforeCount - messages.length,
  };
};

module.exports = {
  createMemoryMessage,
  createMemoryUser,
  deleteMemoryConversation,
  deleteMemoryMessage,
  findMemoryUserByName,
  listMemoryMessagesForPair,
  listMemoryUsers,
};