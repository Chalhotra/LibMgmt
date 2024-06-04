const express = require("express");
const {
  registerUser,
  loginUser,
  currentUser,
} = require("../controllers/authControllers.js");
const validateToken = require("../middleware/validateTokenHandler");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/current", validateToken, currentUser);

module.exports = router;
