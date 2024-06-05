const express = require("express");
const {
  getAvailableBooks,
  checkoutBook,
  checkinBook,
  checkBookHistory,
  searchBooks,
  requestForAdmin,
} = require("../controllers/userControllers");
const validateToken = require("../middleware/validateTokenHandler"); // Adjust the path as needed

const router = express.Router();

router.get("/books/view", validateToken, getAvailableBooks);
router.post("/checkout/:id", validateToken, checkoutBook);
router.post("/checkin/:id", validateToken, checkinBook);
router.get("/history", validateToken, checkBookHistory);
router.get("/books/search", validateToken, searchBooks);
router.post("/request-admin", validateToken, requestForAdmin);
module.exports = router;
