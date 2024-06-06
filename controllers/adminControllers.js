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
            SELECT ar.id, u.id as user_id, u.username, ar.status 
            FROM admin_requests ar 
            JOIN users u ON ar.user_id = u.id 
            WHERE ar.status = 'pending'
        `);
    res.render("admin_requests", { requests: requests, user: req.user });
  } catch (err) {
    res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve admin requests"
    );
  }
});

const approveAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin)
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );

  const requestId = req.params.id;
  let msg;
  try {
    await pool.query(
      'UPDATE admin_requests SET status = "approved" WHERE id = ?',
      [requestId]
    );

    const [results] = await pool.query(
      "SELECT user_id FROM admin_requests WHERE id = ?",
      [requestId]
    );
    const userId = results[0].user_id;

    await pool.query("UPDATE users SET isAdmin = true WHERE id = ?", [userId]);
    msg = "Admin request approved";
  } catch (err) {
    msg = "Internal Server Error!! Failed to approve admin request";
  }
  res.render("userRequest", { message: msg });
});

const denyAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin)
    return res.redirect(
      "/error?type=403 Forbidden&message=You are not authorized to view this page."
    );

  const requestId = req.params.id;
  const [results] = await pool.query(
    "SELECT user_id FROM admin_requests WHERE id = ?",
    [requestId]
  );
  const userId = results[0].user_id;
  let msg;
  try {
    await pool.query(
      'UPDATE admin_requests SET status = "denied" WHERE id = ?',
      [requestId]
    );
    await pool.query("UPDATE users SET isAdmin = false WHERE id = ?", [userId]);
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

  const query = `SELECT 
  b.id AS book_id,
  b.title,
  b.author,
  IF(c.user_id IS NULL, 'Available', CONCAT('Borrowed by ', u.username)) AS borrowing_status
FROM 
  books b
LEFT JOIN 
  checkouts c ON b.id = c.book_id AND c.return_date IS NULL
LEFT JOIN 
  users u ON c.user_id = u.id;
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

  const { title, author } = req.body;
  const query = "INSERT INTO books (title, author) VALUES (?, ?)";
  let message;
  try {
    await pool.query(query, [title, author]);

    message = `Book ${title} added successfully`;
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

  const { title, author } = req.body;
  const queryBook = "SELECT * FROM books WHERE title = ?";
  const [rows] = await pool.query(queryBook, [title]);
  const book = rows[0];
  const query = "UPDATE books SET title = ?, author = ? WHERE id = ?";
  let message;
  try {
    await pool.query(query, [title, author, req.params.id]);
    message = `Book '${title}' updated successfully`;
  } catch (err) {
    res.status(500);
    message = "Failed to update book";
  }

  res.render("updateBook", {
    user: req.user,
    book: book,
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
  const deleteQuery = "DELETE FROM books WHERE id = ?";
  const deleteCheckouts = "DELETE FROM checkouts WHERE book_id = ?";
  let deletedBook;
  let success;
  try {
    const [result] = await pool.query(viewQuery, [id]);
    if (result.length === 0) {
      success = false;
    }
    deletedBook = result[0];
    await pool.query(deleteCheckouts, [id]);
    await pool.query(deleteQuery, [id]);
    success = true;
  } catch (err) {
    res.status(500);
    success = false;
  }
  res.render("deleteBooks", {
    user: req.user,
    success: success,
    deletedBook: deletedBook || {},
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
