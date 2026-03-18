const jwt = require("jsonwebtoken");

const getTokenFromHeaders = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const protect = (req, res, next) => {
  try {
    const token = getTokenFromHeaders(req);

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const verifySocketToken = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
};

module.exports = {
  protect,
  verifySocketToken,
};
