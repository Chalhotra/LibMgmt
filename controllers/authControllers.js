const express = require("express");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  getUsers,
  getUser,
  createUser,
  updateUserName,
  deleteUser,
  pool,
  getUserByName,
} = require("../database");

const registerUser = asyncHandler(async (req, res) => {
  const { username, password, isAdmin = false } = req.body; // Set isAdmin to false by default

  // Input Validation (not shown in original code)
  // Validate username, password length, and other constraints

  try {
    // Secure password hashing with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepared statement for secure database insertion
    const [result] = await pool.query(
      "INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)",
      [username, hashedPassword, isAdmin]
    );

    const id = result.insertId;
    const user = await getUser(id);

    res.redirect("/login");
    // Return the created user object
  } catch (err) {
    const sqlMessage = err.sqlMessage;
    if (sqlMessage.slice(0, 15) == "Duplicate entry") {
      res.status(400);
      throw new Error("Username already exists!");
    }
    // Log the error for debugging
    res.status(500).json({ message: "User registration failed" }); // Send a generic error message to the client (consider improving error handling in production)
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are mandatory!" });
  }

  try {
    const info = await getUserByName(username);
    const user = info[0][0];
    if (!user) {
      // Handle non-existent username with a generic message
      // (Avoid revealing if the username exists for security)
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate and send JWT access token
    const accessToken = jwt.sign(
      { user: { id: user.id, isAdmin: user.isAdmin, username: user.username } }, // Include only necessary user data
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000,
    });

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" }); // Generic error for client
  }
});

const currentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("jwt"); // Clear any JWT tokens stored in cookies
  res.redirect("/login"); // Redirect to the login page
});

module.exports = { registerUser, loginUser, currentUser, logoutUser };
