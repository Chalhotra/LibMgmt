const { pool } = require("../database");
const asyncHandler = require("express-async-handler");

const requestForAdmin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  try {
    const [results] = await pool.query(
      'SELECT * FROM admin_requests WHERE user_id = ? AND status = "pending"',
      [userId]
    );
    if (results.length > 0) {
      return res.redirect(
        "/error?type=400 Bad Request&message=Admin request already pending"
      );
    } else {
      await pool.query("INSERT INTO admin_requests (user_id) VALUES (?)", [
        userId,
      ]);
      return res.render("userRequest", { message: "Admin status requested" });
    }
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to request admin status"
    );
  }
});

const getAvailableBooks = asyncHandler(async (req, res) => {
  const query = "SELECT * FROM books WHERE available = true";
  try {
    const [results] = await pool.query(query);
    res.render("userViewBooks", {
      user: req.user,
      books: results,
    });
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve books"
    );
  }
});

const checkoutBook = asyncHandler(async (req, res) => {
  const bookId = req.params.id;
  const userId = req.user.id;
  const checkoutDate = new Date();
  const dueDate = new Date(checkoutDate);
  dueDate.setDate(dueDate.getDate() + 14);

  const insertCheckoutQuery =
    "INSERT INTO checkouts (user_id, book_id, checkout_date, due_date) VALUES (?, ?, ?, ?)";
  const updateBookQuery =
    "UPDATE books SET quantity = quantity - 1 WHERE id = ? AND quantity > 0";
  const bookQuery = "SELECT * FROM books WHERE id = ?";

  try {
    const [bookRows] = await pool.query(bookQuery, [bookId]);
    if (bookRows[0].quantity === 0) {
      return res.redirect(
        "/error?type=400 Bad Request&message=Book is not available for checkout"
      );
    }

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
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to checkout book"
    );
  }
});

const checkinBook = asyncHandler(async (req, res) => {
  const checkoutId = req.params.id; // assuming the ID of the checkout record is passed as a parameter
  const userId = req.user.id;
  const returnDate = new Date();

  // Get the due date and book ID from the checkouts table using the checkout ID
  const selectDueDateQuery = `
    SELECT id, due_date, book_id FROM checkouts 
    WHERE id = ? AND user_id = ? AND return_date IS NULL
  `;

  try {
    const [results] = await pool.query(selectDueDateQuery, [
      checkoutId,
      userId,
    ]);
    if (results.length === 0) {
      return res.redirect(
        "/error?type=404 Not Found&message=Checkout record not found or already returned"
      );
    }

    const { due_date, book_id } = results[0];
    const dueDate = new Date(due_date);
    let fine = 0;

    if (returnDate > dueDate) {
      const daysLate = Math.ceil(
        (returnDate - dueDate) / (1000 * 60 * 60 * 24)
      );
      fine = daysLate * 1;
    }

    // Update the checkout record to set the return date and fine
    const updateCheckoutQuery = `
      UPDATE checkouts SET return_date = ?, fine = ? 
      WHERE id = ? AND user_id = ? AND return_date IS NULL
    `;
    await pool.query(updateCheckoutQuery, [
      returnDate,
      fine,
      checkoutId,
      userId,
    ]);

    // Update the quantity of the book in the books table
    const updateBookQuery =
      "UPDATE books SET quantity = quantity + 1 WHERE id = ?";
    await pool.query(updateBookQuery, [book_id]);

    // Retrieve the book details
    const bookQuery = "SELECT * FROM books WHERE id = ?";
    const [book] = await pool.query(bookQuery, [book_id]);

    res.render("checkoutDetails", {
      user: req.user,
      book: book[0],
      checkoutType: "checkIn",
    });
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to check in book"
    );
  }
});

const checkBookHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const query = `
        SELECT checkouts.id, checkouts.book_id, books.title, books.author, checkouts.checkout_date, checkouts.due_date, checkouts.return_date, checkouts.fine
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
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to retrieve borrowing history"
    );
  }
});

const searchBooks = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const sqlQuery =
    "SELECT * FROM books WHERE title LIKE ? OR author LIKE ? AND available = 1";
  try {
    const [results] = await pool.query(sqlQuery, [`%${query}%`, `%${query}%`]);
    res.render("userHome", { user: req.user, books: results });
  } catch (err) {
    return res.redirect(
      "/error?type=500 Internal Server Error&message=Failed to search books"
    );
  }
});

module.exports = {
  getAvailableBooks,
  checkoutBook,
  checkinBook,
  checkBookHistory,
  searchBooks,
  requestForAdmin,
};
