const asyncHandler = require("express-async-handler");
const { pool } = require("../database");
const { search } = require("../routes/loginRoutes");

const viewAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  try {
    const [requests] = await pool.query(`
      SELECT id, username, admin_request_status 
      FROM users 
      WHERE admin_request_status = 'pending'
    `);
    res.render("admin_requests", { requests, user: req.user });
  } catch (err) {
    res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve admin requests"
    );
  }
});

const approveAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const userId = req.params.id;
  let msg;
  try {
    await pool.query(
      'UPDATE users SET admin_request_status = "approved", isAdmin = true WHERE id = ?',
      [userId]
    );
    msg = "Admin request approved";
  } catch (err) {
    msg = "Internal Server Error!! Failed to approve admin request";
  }
  res.render("userRequest", { message: msg });
});

const denyAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const userId = req.params.id;
  let msg;
  try {
    await pool.query(
      'UPDATE users SET admin_request_status = "denied" WHERE id = ?',
      [userId]
    );
    msg = "Admin request denied";
  } catch (err) {
    res.status(500);
    msg = "Internal Server Error!! Failed to deny admin request";
  }
  res.render("userRequest", { message: msg });
});

const adminViewBooks = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const query = `
  SELECT 
  b.id AS book_id,
  b.quantity, 
  b.title,
  b.author,
  CASE 
    WHEN b.quantity > 0 THEN 'Available'
    ELSE 'Not Available'
  END AS borrowing_status
FROM 
  books b;

  `;

  try {
    const [rows] = await pool.query(query);
    res.render("adminManageBooks", {
      user: req.user,
      books: rows,
    });
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve books"
    );
  }
});

// Controller to add a new book
const adminAddBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const { title, author, quantity } = req.body;

  let message;
  try {
    // Check if the book already exists
    const [existingBooks] = await pool.query(
      "SELECT id, quantity FROM books WHERE title = ? AND author = ?",
      [title, author]
    );

    if (existingBooks.length > 0) {
      // Book already exists, update the quantity
      const existingBook = existingBooks[0];
      const newQuantity = existingBook.quantity + parseInt(quantity, 10);
      await pool.query("UPDATE books SET quantity = ? WHERE id = ?", [
        newQuantity,
        existingBook.id,
      ]);
      message = `Book '${title}' quantity updated successfully.`;
    } else {
      // Book does not exist, insert a new record
      await pool.query(
        "INSERT INTO books (title, author, quantity) VALUES (?, ?, ?)",
        [title, author, quantity]
      );
      message = `Book '${title}' added successfully.`;
    }
  } catch (err) {
    message = "Failed to add book";
  }

  res.render("adminHome", {
    user: req.user,
    message,
  });
});
const renderUpdateBookPage = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const bookId = req.params.id;

  try {
    const query = "SELECT * FROM books WHERE id = ?";
    const [rows] = await pool.query(query, [bookId]);
    const book = rows[0];

    res.render("updateBook", {
      user: req.user,
      book: book,
      message: "",
    });
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve book details"
    );
  }
});

const adminUpdateBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const { title, author, quantity } = req.body;
  const queryBook = "SELECT * FROM books WHERE id = ?";
  const [rows] = await pool.query(queryBook, [req.params.id]);
  const book = rows[0];
  const query =
    "UPDATE books SET title = ?, author = ?, quantity = ? WHERE id = ?";
  let message;
  try {
    await pool.query(query, [title, author, quantity, req.params.id]);
    message = `Book '${title}' updated successfully`;
  } catch (err) {
    res.status(500);
    message = "Failed to update book";
  }

  res.render("updateBook", {
    user: req.user,
    book: { ...book, title, author, quantity },
    message: message,
  });
});
const adminDeleteBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );
  }

  const id = req.params.id;
  const viewQuery = "SELECT * FROM books WHERE id = ?";
  const checkBorrowedQuery =
    "SELECT COUNT(*) AS count FROM checkouts WHERE book_id = ? AND return_date IS NULL";
  const deleteQuery = "DELETE FROM books WHERE id = ?";
  const deleteCheckouts = "DELETE FROM checkouts WHERE book_id = ?";

  let deletedBook;
  let success;
  let message = "";

  try {
    const [bookResult] = await pool.query(viewQuery, [id]);
    if (bookResult.length === 0) {
      success = false;
      message = "Book not found";
    } else {
      deletedBook = bookResult[0];
      const [borrowedResult] = await pool.query(checkBorrowedQuery, [id]);
      if (borrowedResult[0].count > 0) {
        success = false;
        message = "Cannot delete book because it is currently borrowed";
      } else {
        await pool.query(deleteCheckouts, [id]);
        await pool.query(deleteQuery, [id]);
        success = true;
        message = "Book successfully deleted";
      }
    }
  } catch (err) {
    res.status(500);
    success = false;
    message = "Failed to delete book due to an internal server error";
  }

  res.render("deleteBooks", {
    user: req.user,
    success: success,
    deletedBook: deletedBook || {},
    message: message,
  });
});

const searchBooks = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const sqlQuery =
    "SELECT * FROM books WHERE title LIKE ? OR author LIKE ? AND available = true";
  try {
    const [results] = await pool.query(sqlQuery, [`%${query}%`, `%${query}%`]);
    if (!results) {
      res.send("No Books found");
    }
    res.json(results);
  } catch (err) {
    res.status(500).send("Failed to search books");
  }
});

module.exports = {
  adminDeleteBook,
  adminAddBook,
  adminUpdateBook,
  adminViewBooks,
  searchBooks,
  renderUpdateBookPage,
  viewAdminRequests,
  approveAdminRequests,
  denyAdminRequests,
};
