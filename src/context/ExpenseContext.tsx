"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getTransactions, addTransaction as addTransactionAction, updateTransaction as updateTransactionAction, deleteTransaction as deleteTransactionAction } from "@/actions/transactions";

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
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  editTransaction: (id: string, updatedTransaction: Omit<Transaction, "id">) => Promise<void>;
  editingTransaction: Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  isLoading: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTransactions();
        setTransactions(data as Transaction[]);
      } catch (e) {
        console.error("Failed to fetch transactions", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    
    // Optimistic update
    setTransactions((prev) => [newTransaction as Transaction, ...prev]);
    
    // Persist to DB
    try {
      await addTransactionAction(newTransaction as Transaction);
    } catch (error) {
      console.error("Failed to add transaction to DB", error);
      // Revert optimistic update on error
      setTransactions((prev) => prev.filter(t => t.id !== newTransaction.id));
    }
  };

  const deleteTransaction = async (id: string) => {
    // Keep a backup for rollback
    const previousTransactions = [...transactions];
    
    // Optimistic update
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
    
    // Persist to DB
    try {
      await deleteTransactionAction(id);
    } catch (error) {
      console.error("Failed to delete transaction from DB", error);
      // Revert optimistic update
      setTransactions(previousTransactions);
    }
  };

  const editTransaction = async (id: string, updatedTransaction: Omit<Transaction, "id">) => {
    const previousTransactions = [...transactions];
    const newTx = { ...updatedTransaction, id };
    
    // Optimistic update
    setTransactions((prev) => 
      prev.map((t) => (t.id === id ? newTx as Transaction : t))
    );
    setEditingTransaction(null);
    
    // Persist to DB
    try {
      await updateTransactionAction(id, newTx as Transaction);
    } catch (error) {
      console.error("Failed to update transaction in DB", error);
      // Revert optimistic update
      setTransactions(previousTransactions);
    }
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
