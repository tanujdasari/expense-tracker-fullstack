
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "expenses.db"


def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_database():
    conn = get_connection()

    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount NUMERIC NOT NULL CHECK(amount > 0),
                category_id INTEGER NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (category_id)
                    REFERENCES categories(id)
            )
        """)

        conn.commit()
    finally:
        conn.close()
