const bcrypt = require("bcryptjs");
const { pool } = require("../database");

const register = async (username, password, isAdmin) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const [result] = await pool.query(
      "INSERT INTO users (username, password, isadmin) VALUES (?, ?, ?)",
      [username, hashedPassword, isAdmin]
    );
    return { id: result.insertId };
  } catch (err) {
    throw new Error("Registration failed");
  }
};

module.exports = { register };
