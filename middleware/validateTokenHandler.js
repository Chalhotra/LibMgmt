const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const validateToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) return res.redirect("/login");

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = validateToken;
