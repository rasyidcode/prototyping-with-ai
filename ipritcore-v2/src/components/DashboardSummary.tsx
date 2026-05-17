"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useExpenses } from "@/context/ExpenseContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

const COLORS = [
  '#34d399', '#f87171', '#60a5fa', '#fbbf24', 
  '#c084fc', '#f472b6', '#94a3b8'
];

export function DashboardSummary() {
  const { transactions } = useExpenses();
  const { t, language } = useLanguage();

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expenses += t.amount;
    });
    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses
    };
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(e => {
      if (e.type === 'expense') {
        const catName = t.categories[e.category] || e.category;
        data[catName] = (data[catName] || 0) + e.amount;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions, t]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    })
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="glass-card rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
            <Wallet size={18} /> {t.dashboard.netBalance}
          </h3>
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            balance >= 0 ? "text-white" : "text-red-400"
          )}>
            {formatCurrency(balance, language)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{t.dashboard.allTimeBalance}</p>
        </motion.div>

        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="glass-card rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
            <TrendingUp size={80} />
          </div>
          <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-400" /> {t.dashboard.totalIncome}
          </h3>
          <p className="text-3xl font-bold text-blue-400 tracking-tight">
            {formatCurrency(totalIncome, language)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{t.dashboard.totalEarnings}</p>
        </motion.div>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="glass-card rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-brand-400">
            <TrendingDown size={80} />
          </div>
          <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
            <TrendingDown size={18} className="text-brand-400" /> {t.dashboard.totalExpenses}
          </h3>
          <p className="text-3xl font-bold text-brand-400 tracking-tight">
            {formatCurrency(totalExpenses, language)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{t.dashboard.totalSpending}</p>
        </motion.div>
      </div>

      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2">
          <PieChart size={18} /> {t.dashboard.spendingByCategory}
        </h3>
        
        <div className="h-48 w-full">
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value), language)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t.dashboard.noExpenses}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
