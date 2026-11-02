# Advanced Expense Tracker

A full-stack expense management application built using **Next.js, TypeScript, FastAPI, and SQLite**.

## Features

- Create expense categories with duplicate-name validation.
- Add expenses with title, amount, category, and timestamp.
- View all expenses with category names and dates.
- Edit and delete existing expenses.
- Display expense counts grouped by category.
- View total spending, transaction count, and average expense.
- Automatically refresh the dashboard after changes.
- Validate invalid or incomplete inputs.

## Technology Stack

**Frontend:** Next.js, React, TypeScript, CSS

**Backend:** Python, FastAPI, Pydantic

**Database:** SQLite with relational foreign keys

## Project Structure

```text
expense-tracker/
├── backend/
│   ├── database.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## Backend Setup

Requires Python 3.12 or another compatible version.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

## Frontend Setup

Requires Node.js and npm.

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the development server:

```powershell
npm run dev
```

Application: http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/categories` | Create a category |
| GET | `/categories` | List categories with expense counts |
| POST | `/expenses` | Create an expense |
| GET | `/expenses` | List expenses |
| PUT | `/expenses/{expense_id}` | Update an expense |
| DELETE | `/expenses/{expense_id}` | Delete an expense |
| GET | `/summary` | Retrieve overall statistics |

## Database Design

The database contains two tables:

**categories:** id, name

**expenses:** id, title, amount, category_id, created_at

The `category_id` field references `categories.id`, ensuring every expense belongs to a valid category.

## Example

Create a category:

```json
{
  "name": "Food"
}
```

Create an expense:

```json
{
  "title": "Lunch",
  "amount": 250.5,
  "category_id": 1
}
```

The dashboard displays updated spending totals and category counts after successful operations.

## Validation

- Category names cannot be empty or duplicated.
- Expense titles cannot be empty.
- Amounts must be positive.
- Expenses must reference existing categories.
- Invalid API requests return appropriate HTTP error responses.

## Notes

SQLite is initialized automatically when the FastAPI backend starts. The database file is excluded from Git so local transaction data is not included in the repository.
