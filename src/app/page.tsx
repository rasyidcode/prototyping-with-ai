"use client";

import { DashboardSummary } from "@/components/DashboardSummary";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { Activity, Globe, LogOut } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background gradients for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-900/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500/20 p-2 rounded-xl text-brand-400 border border-brand-500/30">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {t.app.title}
              </h1>
              <p className="text-sm text-slate-500">{t.app.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl border border-slate-700/50 p-1">
              <Globe size={16} className="text-slate-400 ml-2" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "id")}
                className="bg-transparent text-sm text-slate-200 outline-none appearance-none px-2 py-1 cursor-pointer"
              >
                <option value="id" className="bg-slate-900">ID</option>
                <option value="en" className="bg-slate-900">EN</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl border border-slate-700/50 p-1 pr-3">
              <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/30 overflow-hidden flex items-center justify-center text-brand-400 font-medium text-sm">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <span className="text-sm font-medium text-slate-300 hidden md:inline-block">
                {session?.user?.name || "User"}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-2"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <DashboardSummary />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-1">
            <ExpenseForm />
          </div>
          <div className="lg:col-span-2">
            <ExpenseList />
          </div>
        </div>
      </main>
    </div>
  );
}
