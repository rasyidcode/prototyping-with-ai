"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import { Trash2, TrendingDown, TrendingUp, ArrowRightLeft, Edit2 } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export function ExpenseList() {
  const { transactions, deleteTransaction, setEditingTransaction, isLoading } = useExpenses();
  const { t, language } = useLanguage();
  
  const dateLocale = language === "id" ? idLocale : enUS;
  const dateFormat = language === "id" ? "dd MMM yyyy" : "MMM dd, yyyy";

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 flex justify-center items-center h-64 text-slate-400">
        {t.list.loading}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col justify-center items-center h-64 text-slate-400 text-center">
        <ArrowRightLeft className="w-12 h-12 mb-4 opacity-50" />
        <p>{t.list.noTransactions}</p>
        <p className="text-sm mt-1">{t.list.addFirstTransaction}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 overflow-hidden">
      <h2 className="text-xl font-semibold mb-6">{t.list.recentTransactions}</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 text-sm border-b border-slate-700/50">
              <th className="pb-3 font-medium">{t.list.description}</th>
              <th className="pb-3 font-medium">{t.list.category}</th>
              <th className="pb-3 font-medium">{t.list.date}</th>
              <th className="pb-3 font-medium text-right">{t.list.amount}</th>
              <th className="pb-3 font-medium text-right w-20"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <AnimatePresence initial={false}>
              {transactions.map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      {transaction.type === 'income' ? (
                        <TrendingUp size={14} className="text-blue-400" />
                      ) : (
                        <TrendingDown size={14} className="text-brand-400" />
                      )}
                      {transaction.description}
                    </div>
                  </td>
                  <td className="py-4 text-slate-400">
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded-md text-xs border border-slate-700/50">
                      {t.categories[transaction.category] || transaction.category}
                    </span>
                  </td>
                  <td className="py-4 text-slate-400">
                    {format(new Date(transaction.date), dateFormat, { locale: dateLocale })}
                  </td>
                  <td className={cn(
                    "py-4 text-right font-medium",
                    transaction.type === 'income' ? "text-blue-400" : "text-brand-400"
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, language)}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingTransaction(transaction)}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                        aria-label="Edit transaction"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        aria-label="Delete transaction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
