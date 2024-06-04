const { pool } = require("../database"); // Adjust the path as needed
const asyncHandler = require("express-async-handler"); // Assuming you use asyncHandler for cleaner code

// Controller to get available books
const getAvailableBooks = asyncHandler(async (req, res) => {
  const query = "SELECT * FROM books WHERE available = true";

  try {
    const [results] = await pool.query(query);
    res.render("userViewBooks", {
      user: req.user,
      books: results,
    });
  } catch (err) {
    res.status(500).send("Failed to retrieve books");
  }
});

// Controller to checkout a book
const checkoutBook = asyncHandler(async (req, res) => {
  const bookId = req.params.id;
  const userId = req.user.id;
  const checkoutDate = new Date();
  const dueDate = new Date(checkoutDate);
  dueDate.setDate(dueDate.getDate() + 14);

  const insertCheckoutQuery =
    "INSERT INTO checkouts (user_id, book_id, checkout_date, due_date) VALUES (?, ?, ?, ?)";
  const updateBookQuery = "UPDATE books SET available = false WHERE id = ?";
  const bookQuery = "SELECT * FROM books WHERE id = ?";

  try {
    await pool.query(insertCheckoutQuery, [
      userId,
      bookId,
      checkoutDate,
      dueDate,
    ]);
    await pool.query(updateBookQuery, [bookId]);
    const [book] = await pool.query(bookQuery, [bookId]);
    res.render("checkoutDetails", {
      user: req.user,
      book: book[0],
      checkoutType: "checkOut",
    });
    console.log(book);
  } catch (err) {
    res.status(500).send("Failed to checkout book");
  }
});

// Controller to check in a book
const checkinBook = asyncHandler(async (req, res) => {
  const bookId = req.params.id;
  const userId = req.user.id;
  const returnDate = new Date();

  const selectDueDateQuery =
    "SELECT due_date FROM checkouts WHERE user_id = ? AND book_id = ? AND return_date IS NULL";
  try {
    const [results] = await pool.query(selectDueDateQuery, [userId, bookId]);
    const dueDate = new Date(results[0].due_date);
    let fine = 0;
    if (returnDate > dueDate) {
      const daysLate = Math.ceil(
        (returnDate - dueDate) / (1000 * 60 * 60 * 24)
      );
      fine = daysLate * 1;
    }

    const updateCheckoutQuery =
      "UPDATE checkouts SET return_date = ?, fine = ? WHERE user_id = ? AND book_id = ? AND return_date IS NULL";
    await pool.query(updateCheckoutQuery, [returnDate, fine, userId, bookId]);

    const updateBookQuery = "UPDATE books SET available = true WHERE id = ?";
    const bookQuery = "SELECT * FROM books WHERE id = ?";
    await pool.query(updateBookQuery, [bookId]);
    const [book] = await pool.query(bookQuery, [bookId]);
    res.render("checkoutDetails", {
      user: req.user,
      book: book[0],
      checkoutType: "checkIn",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to check in book");
  }
});

const checkBookHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const query = `
        SELECT checkouts.book_id, books.title, books.author, checkouts.checkout_date, checkouts.due_date, checkouts.return_date, checkouts.fine
        FROM checkouts
        JOIN books ON checkouts.book_id = books.id
        WHERE checkouts.user_id = ?
    `;
  try {
    const [results] = await pool.query(query, [userId]);
    res.render("userBorrowingHistory", {
      user: req.user,
      books: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to retrieve borrowing history");
  }
});
const searchBooks = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const sqlQuery =
    "SELECT * FROM books WHERE title LIKE ? OR author LIKE ? AND available = true";
  try {
    const [results] = await pool.query(sqlQuery, [`%${query}%`, `%${query}%`]);

    res.render("userHome", { user: req.user, books: results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to search books");
  }
});

module.exports = {
  getAvailableBooks,
  checkoutBook,
  checkinBook,
  checkBookHistory,
  searchBooks,
};
