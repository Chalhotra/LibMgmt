const bcrypt = require("bcryptjs");
const { pool } = require("../database"); // Import the database pool

const register = async (username, password, isAdmin) => {
  const salt = await bcrypt.genSalt(10); // Generate a random salt for password hashing
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const [result] = await pool.query(
      "INSERT INTO users (username, password, isadmin) VALUES (?, ?, ?)",
      [username, hashedPassword, isAdmin]
    );
    return { id: result.insertId };
  } catch (err) {
    console.error(err);
    throw new Error("Registration failed");
  }
};

module.exports = { register };
