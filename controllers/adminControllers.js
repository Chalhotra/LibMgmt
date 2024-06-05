const asyncHandler = require("express-async-handler");
const { pool } = require("../database");
const { search } = require("../routes/loginRoutes");

const viewAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  try {
    const [requests] = await pool.query(`
            SELECT ar.id, u.id as user_id, u.username, ar.status 
            FROM admin_requests ar 
            JOIN users u ON ar.user_id = u.id 
            WHERE ar.status = 'pending'
        `);
    res.render("admin_requests", { requests: requests, user: req.user });
  } catch (err) {
    res.status(500).send("Failed to retrieve admin requests");
  }
});

const approveAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

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
    msg = "Failed to approve admin request";
  }
  res.render("userRequest", { message: msg });
});

const denyAdminRequests = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

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
    msg = "Failed to deny admin request";
  }

  res.render("userRequest", { message: msg });
});

// Controller to view all books
const adminViewBooks = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
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
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server Error" });
  }
});

// Controller to add a new book
const adminAddBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
  }

  const { title, author } = req.body;
  const query = "INSERT INTO books (title, author) VALUES (?, ?)";
  let message;
  try {
    await pool.query(query, [title, author]);

    message = `Book ${title} added successfully`;
  } catch (err) {
    console.error(err); // Log the error for debugging

    message = "Failed to add book";
  }
  res.render("adminHome", {
    user: req.user,
    message,
  });
});

// Controller to update a book
const renderUpdateBookPage = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
  }

  const bookId = req.params.id;

  try {
    // Fetch book details from the database
    const query = "SELECT * FROM books WHERE id = ?";
    const [rows] = await pool.query(query, [bookId]);
    const book = rows[0];

    // Render the update book page with book details
    res.render("updateBook", {
      user: req.user,
      book: book,
      message: "",
    });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server Error" });
  }
});

const adminUpdateBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("Non-admins aren't allowed to update books!");
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
    console.error(err); // Log the error for debugging
    res.status(500);
    message = "Failed to update book";
  }
  // Render the update book page with book details
  res.render("updateBook", {
    user: req.user,
    book: book,
    message: message,
  });
});

// Controller to delete a book
// Controller to delete a book
const adminDeleteBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
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
      res.status(404).json({ message: "Book not found" });
      success = false;
      return;
    }

    // Store details of the book before deletion
    deletedBook = result[0];
    await pool.query(deleteCheckouts, [id]);
    await pool.query(deleteQuery, [id]);
    success = true;

    // Render the deleteBooks.ejs page with success and book details
  } catch (err) {
    console.error(err); // Log the error for debugging
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
    console.error(err);
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
