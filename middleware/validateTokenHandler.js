const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const validateToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.jwt; // Changed from req.headers.authorization

  if (!token) return res.sendStatus(401);

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    // console.log(decoded.user);
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" }); // Generic error message
  }
});

module.exports = validateToken;
