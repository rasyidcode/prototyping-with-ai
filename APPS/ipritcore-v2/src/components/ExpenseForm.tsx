"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, Save, X } from "lucide-react";
import { useExpenses, TransactionCategory, TransactionType } from "@/context/ExpenseContext";
import { cn, EXCHANGE_RATE_USD_IDR } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

const expenseCategories: TransactionCategory[] = [
  "Housing", "Food", "Transportation", "Utilities", 
  "Entertainment", "Healthcare", "Other"
];

const incomeCategories: TransactionCategory[] = [
  "Salary", "Freelance", "Investment", "Gift", "Other Income"
];

export function ExpenseForm() {
  const { addTransaction, editTransaction, editingTransaction, setEditingTransaction } = useExpenses();
  const { t, language } = useLanguage();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("Food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Populate form when editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      
      // If language is English, convert IDR amount to USD for display
      const displayAmount = language === "en" 
        ? editingTransaction.amount / EXCHANGE_RATE_USD_IDR 
        : editingTransaction.amount;
        
      setAmount(displayAmount.toString());
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
    } else {
      // Only reset amount and description, keep type and date
      setAmount("");
      setDescription("");
    }
  }, [editingTransaction, language]);

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  // Handle type change and reset category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === "expense" ? "Food" : "Salary");
  };

  const handleCancel = () => {
    setEditingTransaction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !description) return;

    // Convert input back to IDR if user is in English mode
    let baseAmount = Number(amount);
    if (language === "en") {
      baseAmount = baseAmount * EXCHANGE_RATE_USD_IDR;
    }

    if (editingTransaction) {
      editTransaction(editingTransaction.id, {
        type,
        amount: baseAmount,
        description,
        category,
        date,
      });
    } else {
      addTransaction({
        type,
        amount: baseAmount,
        description,
        category,
        date,
      });
      setAmount("");
      setDescription("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {editingTransaction ? (
            <>
              <Save className="text-amber-400" />
              {t.form.editTransaction}
            </>
          ) : (
            <>
              <PlusCircle className={type === "expense" ? "text-brand-400" : "text-blue-400"} />
              {t.form.addTransaction}
            </>
          )}
        </h2>

        {editingTransaction && (
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Cancel editing"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              type === "expense"
                ? "bg-slate-800 text-brand-400 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ArrowDownCircle size={16} /> {t.form.expense}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              type === "income"
                ? "bg-slate-800 text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ArrowUpCircle size={16} /> {t.form.income}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            {t.form.amount} {language === "en" ? "($)" : "(Rp)"}
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(
              "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
              "text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            )}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{t.form.description}</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(
              "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
              "text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            )}
            placeholder={type === "expense" ? t.form.placeholderLunch : t.form.placeholderSalary}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t.form.category}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className={cn(
                "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
                "text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all appearance-none"
              )}
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-slate-100">
                  {t.categories[c] || c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t.form.date}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
                "text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all [color-scheme:dark]"
              )}
            />
          </div>
        </div>

        <button
          type="submit"
          className={cn(
            "w-full mt-6 text-white font-medium py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2",
            editingTransaction
              ? "bg-amber-500 hover:bg-amber-400"
              : type === "expense" ? "bg-brand-500 hover:bg-brand-400" : "bg-blue-500 hover:bg-blue-400"
          )}
        >
          {editingTransaction ? (
            <>
              <Save size={18} />
              {t.form.updateTransaction}
            </>
          ) : (
            <>
              <PlusCircle size={18} />
              {type === "expense" ? t.form.addExpense : t.form.addIncome}
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
