const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
router.get(
  "/",
  asyncHandler(async (req, res) => {
    return res.render("../views/home.ejs");
  })
);

router.get("/signup", (req, res) => {
  return res.render("../views/registerUser.ejs");
});
