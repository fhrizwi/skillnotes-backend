-- Courses Table (D1/SQLite Optimized)
CREATE TABLE courses (
    courseid INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL,                      -- SQLite uses REAL for decimal numbers
    offer REAL,                      -- e.g., 20.50 (% or flat)
    category TEXT,
    banner TEXT,
    images TEXT,                     -- JSON stored as TEXT in SQLite
    createdAt TEXT DEFAULT (datetime('now')),  -- SQLite datetime function
    hidden INTEGER NOT NULL DEFAULT 0
);

-- File Info Table (1-to-1 with courses)
CREATE TABLE fileinfo (
    fileid INTEGER PRIMARY KEY,
    filetype TEXT,
    filesize TEXT,
    downloadlink TEXT,
    FOREIGN KEY (fileid) REFERENCES courses(courseid) ON DELETE CASCADE
);

-- Users Table
CREATE TABLE users (
    userid INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobileno TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profilepic TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Purchased Table
CREATE TABLE purchased (
    pid INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    courseid INTEGER NOT NULL,
    purchaseddate TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (courseid) REFERENCES courses(courseid) ON DELETE CASCADE
);

-- Course Reviews Table
CREATE TABLE coursereviews (
    reviewid INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    courseid INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),  -- 1-5 star rating
    review TEXT,                                                   -- Optional text review
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (courseid) REFERENCES courses(courseid) ON DELETE CASCADE,
    UNIQUE(userid, courseid)  -- One review per user per course
);

-- Note: Run indexes.sql after creating all tables for better performance

-- Indexes for better performance in D1
-- Run this AFTER creating all tables

-- Course indexes
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_hidden ON courses(hidden);
CREATE INDEX idx_courses_created ON courses(createdAt);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mobile ON users(mobileno);

-- Purchase indexes
CREATE INDEX idx_purchased_userid ON purchased(userid);
CREATE INDEX idx_purchased_courseid ON purchased(courseid);
CREATE INDEX idx_purchased_date ON purchased(purchaseddate);

-- Review indexes
CREATE INDEX idx_reviews_courseid ON coursereviews(courseid);
CREATE INDEX idx_reviews_userid ON coursereviews(userid);
CREATE INDEX idx_reviews_rating ON coursereviews(rating);
CREATE INDEX idx_reviews_created ON coursereviews(createdAt);
