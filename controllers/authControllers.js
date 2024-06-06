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
  const { username, password, isAdmin = false } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)",
      [username, hashedPassword, isAdmin]
    );

    const id = result.insertId;
    const user = await getUser(id);

    res.redirect("/login");
  } catch (err) {
    const sqlMessage = err.sqlMessage;
    if (sqlMessage.slice(0, 15) === "Duplicate entry") {
      return res.redirect(
        "/error?type=400 Bad Request&message=Username already exists!"
      );
    }

    return res.redirect(
      "/error?type=500 Internal Server Error&message=User registration failed"
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect(
      "/error?type=400 Bad Request&message=All fields are mandatory!"
    );
  }

  try {
    const info = await getUserByName(username);
    const user = info[0][0];
    if (!user) {
      return res.redirect(
        "/error?type=401 Unauthorized&message=Invalid credentials"
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.redirect(
        "/error?type=401 Unauthorized&message=Invalid credentials"
      );
    }

    const accessToken = jwt.sign(
      { user: { id: user.id, isAdmin: user.isAdmin, username: user.username } },
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
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Internal server error"
    );
  }
});

const currentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

module.exports = { registerUser, loginUser, currentUser, logoutUser };
