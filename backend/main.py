
import sqlite3
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from database import get_connection, initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Expense Tracker API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_methods=["*"],
    allow_headers=["*"]
)


# -------------------------------
# Pydantic Request Models
# -------------------------------

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Category name cannot be empty")
        return value


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0, allow_inf_nan=False)
    category_id: int = Field(gt=0)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Expense title cannot be empty")
        return value


# -------------------------------
# Health Check
# -------------------------------

@app.get("/")
def home():
    return {"message": "Expense Tracker API is running"}


# -------------------------------
# 1. Create Category
# -------------------------------

@app.post("/categories", status_code=201)
def create_category(category: CategoryCreate):
    conn = get_connection()

    try:
        cursor = conn.execute(
            "INSERT INTO categories (name) VALUES (?)",
            (category.name,)
        )
        conn.commit()

        return {
            "id": cursor.lastrowid,
            "name": category.name
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Category already exists"
        )

    finally:
        conn.close()


# -------------------------------
# 2. Get Categories With Counts
# -------------------------------

@app.get("/categories")
def get_categories():
    conn = get_connection()

    try:
        rows = conn.execute("""
            SELECT
                c.id,
                c.name,
                COUNT(e.id) AS total_expenses
            FROM categories c
            LEFT JOIN expenses e
                ON c.id = e.category_id
            GROUP BY c.id, c.name
            ORDER BY c.name
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()


# -------------------------------
# 3. Create Expense
# -------------------------------

@app.post("/expenses", status_code=201)
def create_expense(expense: ExpenseCreate):
    conn = get_connection()

    try:
        category = conn.execute(
            "SELECT id FROM categories WHERE id = ?",
            (expense.category_id,)
        ).fetchone()

        if category is None:
            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

        created_at = datetime.now(timezone.utc).isoformat()

        cursor = conn.execute("""
            INSERT INTO expenses
                (title, amount, category_id, created_at)
            VALUES (?, ?, ?, ?)
        """, (
            expense.title,
            expense.amount,
            expense.category_id,
            created_at
        ))

        conn.commit()

        return {
            "id": cursor.lastrowid,
            "title": expense.title,
            "amount": expense.amount,
            "category_id": expense.category_id,
            "created_at": created_at
        }

    finally:
        conn.close()


# -------------------------------
# 4. Get All Expenses
# -------------------------------

@app.get("/expenses")
def get_expenses():
    conn = get_connection()

    try:
        rows = conn.execute("""
            SELECT
                e.id,
                e.title,
                e.amount,
                e.category_id,
                c.name AS category,
                e.created_at
            FROM expenses e
            INNER JOIN categories c
                ON e.category_id = c.id
            ORDER BY e.created_at DESC, e.id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()


# -------------------------------
# 5. Overall Summary
# -------------------------------

@app.get("/summary")
def get_summary():
    conn = get_connection()

    try:
        row = conn.execute("""
            SELECT
                COALESCE(SUM(amount), 0) AS total,
                COUNT(*) AS count,
                COALESCE(AVG(amount), 0) AS average
            FROM expenses
        """).fetchone()

        return dict(row)

    finally:
        conn.close()


# -------------------------------
# 6. Update Expense
# -------------------------------

@app.put("/expenses/{expense_id}")
def update_expense(expense_id: int, expense: ExpenseCreate):
    conn = get_connection()

    try:
        existing = conn.execute(
            "SELECT id FROM expenses WHERE id = ?",
            (expense_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Expense not found"
            )

        category = conn.execute(
            "SELECT id FROM categories WHERE id = ?",
            (expense.category_id,)
        ).fetchone()

        if category is None:
            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

        conn.execute("""
            UPDATE expenses
            SET title = ?, amount = ?, category_id = ?
            WHERE id = ?
        """, (
            expense.title,
            expense.amount,
            expense.category_id,
            expense_id
        ))

        conn.commit()

        return {"message": "Expense updated successfully"}

    finally:
        conn.close()


# -------------------------------
# 7. Delete Expense
# -------------------------------

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int):
    conn = get_connection()

    try:
        cursor = conn.execute(
            "DELETE FROM expenses WHERE id = ?",
            (expense_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Expense not found"
            )

        conn.commit()

        return {"message": "Expense deleted successfully"}

    finally:
        conn.close()
