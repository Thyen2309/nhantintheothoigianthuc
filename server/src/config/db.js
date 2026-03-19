const mongoose = require("mongoose");

let isDatabaseConnected = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn("MONGODB_URI is missing. Running in memory mode.");
      return false;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isDatabaseConnected = true;
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.warn("Falling back to in-memory storage.");
    isDatabaseConnected = false;
    return false;
  }
};

const databaseReady = () => isDatabaseConnected && mongoose.connection.readyState === 1;

mongoose.connection.on("connected", () => {
  isDatabaseConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isDatabaseConnected = false;
});

connectDB.databaseReady = databaseReady;

module.exports = connectDB;
