
"use client";

import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Category = {
  id: number;
  name: string;
  total_expenses: number;
};

type Expense = {
  id: number;
  title: string;
  amount: number;
  category_id: number;
  category: string;
  created_at: string;
};

type Summary = {
  total: number;
  count: number;
  average: number;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg).join(", ")
          : "Something went wrong"
    );
  }

  return response.json();
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    count: 0,
    average: 0
  });

  const [categoryName, setCategoryName] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [c, e, s] = await Promise.all([
      apiRequest<Category[]>("/categories"),
      apiRequest<Expense[]>("/expenses"),
      apiRequest<Summary>("/summary")
    ]);

    setCategories(c);
    setExpenses(e);
    setSummary(s);
  }, []);

  useEffect(() => {
    loadData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadData]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!categoryName.trim()) {
      setError("Enter a category name.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName.trim() })
      });

      setCategoryName("");
      await loadData();
      setMessage("Category added successfully!");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError("Expense title is required.");
      return;
    }

    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        editingId !== null ? `/expenses/${editingId}` : "/expenses",
        {
          method: editingId !== null ? "PUT" : "POST",
          body: JSON.stringify({
            title: title.trim(),
            amount: numericAmount,
            category_id: Number(categoryId)
          })
        }
      );

      const wasEditing = editingId !== null;
      resetForm();
      await loadData();

      setMessage(
        wasEditing
          ? "Expense updated successfully!"
          : "Expense added successfully!"
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTitle("");
    setAmount("");
    setCategoryId("");
    setEditingId(null);
  }

  function editExpense(expense: Expense) {
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setCategoryId(String(expense.category_id));
    setEditingId(expense.id);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id: number) {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });

      if (editingId === id) resetForm();

      await loadData();
      setMessage("Expense deleted successfully!");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <span className="eyebrow">PERSONAL FINANCE</span>
          <h1>Expense Tracker</h1>
          <p>Track, organize, and manage your spending.</p>
        </div>
        <span className="status">● Expense Dashboard</span>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <section className="stats">
        <div className="statCard">
          <span>Total Spending</span>
          <strong>{currency(summary.total)}</strong>
          <small>All expenses combined</small>
        </div>
        <div className="statCard">
          <span>Total Transactions</span>
          <strong>{summary.count}</strong>
          <small>Recorded expenses</small>
        </div>
        <div className="statCard">
          <span>Average Expense</span>
          <strong>{currency(summary.average)}</strong>
          <small>Average per transaction</small>
        </div>
      </section>

      <div className="columns">
        <section className="panel">
          <div className="panelHeader">
            <h2>Categories</h2>
            <span className="pill">{categories.length} categories</span>
          </div>

          <form onSubmit={addCategory} className="inlineForm">
            <input
              placeholder="New category name"
              aria-label="New category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
            <button type="submit" disabled={saving}>
              + Add
            </button>
          </form>

          <div className="categoryList">
            {categories.length === 0 ? (
              <p className="empty">No categories yet.</p>
            ) : (
              categories.map((category) => (
                <div className="categoryRow" key={category.id}>
                  <span>{category.name}</span>
                  <span className="pill">
                    {category.total_expenses} expenses
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>{editingId !== null ? "Edit Expense" : "Add Expense"}</h2>
          </div>

          <form onSubmit={saveExpense} className="expenseForm">
            <label>
              Expense Title
              <input
                placeholder="e.g. Lunch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <div className="formGrid">
              <label>
                Amount ($)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="formActions">
              <button
                type="submit"
                disabled={saving || categories.length === 0}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "+ Add Expense"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <h2>Expense History</h2>
          <span className="pill">{expenses.length} records</span>
        </div>

        {loading ? (
          <p className="empty">Loading...</p>
        ) : expenses.length === 0 ? (
          <div className="emptyState">
            <h3>No expenses yet</h3>
            <p>Create your first expense to get started.</p>
          </div>
        ) : (
          <div className="tableWrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="expenseTitle">{expense.title}</td>
                    <td>
                      <span className="categoryTag">
                        {expense.category}
                      </span>
                    </td>
                    <td>
                      {new Date(expense.created_at).toLocaleDateString()}
                    </td>
                    <td className="amount">{currency(expense.amount)}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="linkButton"
                          onClick={() => editExpense(expense)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="linkButton danger"
                          disabled={saving}
                          onClick={() => deleteExpense(expense.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>Expense Tracker · Next.js + FastAPI + SQLite</footer>
    </main>
  );
}
