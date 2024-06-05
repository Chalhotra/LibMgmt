const express = require("express");
const validateToken = require("../middleware/validateTokenHandler");
const {
  adminDeleteBook,
  adminAddBook,
  adminUpdateBook,
  adminViewBooks,
  searchBooks,
  renderUpdateBookPage,
  viewAdminRequests,
  approveAdminRequests,
  denyAdminRequests,
} = require("../controllers/adminControllers");

const router = express.Router();
router.get("/books/manage", validateToken, adminViewBooks);
router.post("/books", validateToken, adminAddBook);
router.post("/books/update/:id", validateToken, adminUpdateBook);
router.post("/books/delete/:id", validateToken, adminDeleteBook);
router.get("/books/search", validateToken, searchBooks);
router.get("/books/update/:id", validateToken, renderUpdateBookPage);
router.get("/requests", validateToken, viewAdminRequests);
router.post("/requests/approve/:id", validateToken, approveAdminRequests);
router.post("/requests/deny/:id", validateToken, denyAdminRequests);

module.exports = router;
