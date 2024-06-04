const express = require("express");
const validateToken = require("../middleware/validateTokenHandler");
const {
  adminDeleteBook,
  adminAddBook,
  adminUpdateBook,
  adminViewBooks,
  searchBooks,
} = require("../controllers/adminControllers");

const router = express.Router();
router.get("/books/manage", validateToken, adminViewBooks);
router.post("/books", validateToken, adminAddBook);
router.post("/books/update/:id", validateToken, adminUpdateBook);
router.post("/books/delete/:id", validateToken, adminDeleteBook);
router.get("/books/search", validateToken, searchBooks);

module.exports = router;
