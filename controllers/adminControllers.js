const asyncHandler = require("express-async-handler");
const { pool } = require("../database");
const { search } = require("../routes/loginRoutes");

// Controller to view all books
const adminViewBooks = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
  }

  const query = "SELECT * FROM books";

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
const adminUpdateBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("Non-admins aren't allowed to update books!");
  }

  const { title, author } = req.body;
  const query = "UPDATE books SET title = ?, author = ? WHERE id = ?";

  try {
    await pool.query(query, [title, author, req.params.id]);
    res.json({ message: `Book '${title}' updated successfully` });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Failed to update book" });
  }
});

// Controller to delete a book
const adminDeleteBook = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.sendStatus(403);
    throw new Error("You are not an admin!"); // Forbidden
  }

  const id = req.params.id;
  const viewQuery = "SELECT * FROM books WHERE id = ?";
  const deleteQuery = "DELETE FROM books WHERE id = ?";

  try {
    const [result] = await pool.query(viewQuery, [id]);
    if (result.length === 0) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    await pool.query(deleteQuery, [id]);
    res.json({ message: "Book deleted successfully", details: result[0] });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Failed to delete book" });
  }
  res.redirect("/books/manage");
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
};
