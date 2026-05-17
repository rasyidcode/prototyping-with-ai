"use server";

import pool from "@/lib/db";
import { auth } from "@/auth";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
}

export async function getTransactions(): Promise<Transaction[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id, type, amount, description, category, date FROM transactions WHERE user_id = $1 ORDER BY date DESC",
      [session.user.id]
    );

    // Format the database output
    return res.rows.map(row => ({
      ...row,
      date: new Date(row.date).toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function addTransaction(transaction: Transaction) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO transactions (id, user_id, type, amount, description, category, date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        transaction.id,
        session.user.id,
        transaction.type,
        transaction.amount,
        transaction.description,
        transaction.category,
        transaction.date,
      ]
    );
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw new Error("Failed to add transaction");
  } finally {
    client.release();
  }
}

export async function updateTransaction(id: string, transaction: Transaction) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE transactions SET type = $1, amount = $2, description = $3, category = $4, date = $5 WHERE id = $6 AND user_id = $7",
      [
        transaction.type,
        transaction.amount,
        transaction.description,
        transaction.category,
        transaction.date,
        id,
        session.user.id,
      ]
    );
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new Error("Failed to update transaction");
  } finally {
    client.release();
  }
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const client = await pool.connect();
  try {
    await client.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
      [id, session.user.id]
    );
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw new Error("Failed to delete transaction");
  } finally {
    client.release();
  }
}
