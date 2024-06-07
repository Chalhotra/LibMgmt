CREATE DATABASE library_management;

USE library_management;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    isAdmin BOOLEAN DEFAULT FALSE,
    admin_request_status ENUM('pending', 'approved', 'denied') DEFAULT NULL
);

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    available BOOLEAN GENERATED ALWAYS AS (quantity > 0) STORED
);

CREATE TABLE checkouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    book_id INT,
    checkout_date DATE,
    due_date DATE,
    return_date DATE,
    fine DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
);



INSERT INTO users(username, password, isAdmin) values('admin', '$2b$10$R3.uYf5sgzrG664RYYG86..MOHrTAvCPF7P7GZJrU/1ARsCyECx1m', 1);
