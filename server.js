const express = require("express");
require("dotenv").config();
const errorHandler = require("./middleware/errorHandler");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const validateToken = require("./middleware/validateTokenHandler");

const port = process.env.PORT || 5000;
const app = express();

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Set the views directory

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from 'public' directory

// Before your routes
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

app.use("/api/contacts", require("./routes/contactRoutes"));
app.use("/api/users", require("./routes/loginRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use(errorHandler);

// Home route rendering the login and registration pages
app.get("/login", (req, res) => {
  res.render("loginUser");
});

app.get("/register", (req, res) => {
  res.render("registerUser");
});

app.get("/home", validateToken, (req, res) => {
  if (req.user.isAdmin) {
    res.render("adminHome", { user: req.user, message: "" });
  } else {
    res.render("userHome", { user: req.user, books: [] });
  }
});
app.get("/manage", validateToken, (req, res) => {
  res.render("adminManageBooks", { user: req.user, books: rows });
});

app.get("/view", validateToken, (req, res) => {
  res.render("userViewBooks", { user: req.user, books: rows });
});

app.get("/history", validateToken, (req, res) => {
  res.render("userBorrowingHistory", { user: req.user, books: rows });
});

app.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
