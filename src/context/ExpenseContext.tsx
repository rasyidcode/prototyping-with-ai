"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TransactionType = "income" | "expense";

export type TransactionCategory = 
  | "Housing" | "Food" | "Transportation" | "Utilities" | "Entertainment" | "Healthcare" | "Other" // Expense categories
  | "Salary" | "Freelance" | "Investment" | "Gift" | "Other Income"; // Income categories

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  date: string;
}

interface ExpenseContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  editTransaction: (id: string, updatedTransaction: Omit<Transaction, "id">) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  isLoading: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("transactions") || localStorage.getItem("expenses"); // fallback to old key
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration for old data
        const migrated = parsed.map((item: any) => ({
          ...item,
          type: item.type || "expense"
        }));
        setTransactions(migrated);
      } catch (e) {
        console.error("Failed to parse transactions from local storage");
      }
    }
    setIsLoading(false);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("transactions", JSON.stringify(transactions));
    }
  }, [transactions, isLoading]);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const editTransaction = (id: string, updatedTransaction: Omit<Transaction, "id">) => {
    setTransactions((prev) => 
      prev.map((t) => (t.id === id ? { ...updatedTransaction, id } : t))
    );
    setEditingTransaction(null);
  };

  return (
    <ExpenseContext.Provider value={{ 
      transactions, 
      addTransaction, 
      deleteTransaction, 
      editTransaction,
      editingTransaction,
      setEditingTransaction,
      isLoading 
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error("useExpenses must be used within an ExpenseProvider");
  }
  return context;
}
