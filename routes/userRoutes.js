const express = require("express");
const {
  getAvailableBooks,
  checkoutBook,
  checkinBook,
  checkBookHistory,
  searchBooks,
} = require("../controllers/userControllers");
const validateToken = require("../middleware/validateTokenHandler"); // Adjust the path as needed

const router = express.Router();

router.get("/books/view", validateToken, getAvailableBooks);
router.post("/checkout/:id", validateToken, checkoutBook);
router.post("/checkin/:id", validateToken, checkinBook);
router.get("/history", validateToken, checkBookHistory);
router.get("/books/search", validateToken, searchBooks);

module.exports = router;
