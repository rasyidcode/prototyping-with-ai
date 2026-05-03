"use client";

import { useActionState } from "react";
import { registerUser } from "./actions";
import { Activity, UserPlus, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function RegisterPage() {
  const { t, language, setLanguage } = useLanguage();
  const [errorMessage, formAction, isPending] = useActionState(
    registerUser,
    undefined,
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background gradients for premium feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
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
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex bg-brand-500/20 p-3 rounded-2xl text-brand-400 border border-brand-500/30 mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            {t.register.title}
          </h1>
          <p className="text-slate-400 mt-2">{t.register.subtitle}</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <form action={formAction} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="name">
                {t.register.nameLabel}
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="John Doe"
                required
                className={cn(
                  "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
                  "text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="email">
                {t.register.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="user@example.com"
                required
                className={cn(
                  "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
                  "text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="password">
                {t.register.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                className={cn(
                  "w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3",
                  "text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                )}
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 text-center">
                  {errorMessage === "errorEmailTaken" 
                    ? t.register.errorEmailTaken 
                    : t.register.somethingWentWrong}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full bg-brand-500 hover:bg-brand-400 text-white font-medium py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2",
                isPending ? "opacity-70 cursor-not-allowed" : ""
              )}
            >
              {isPending ? t.register.signingUpText : (
                <>
                  <UserPlus size={18} />
                  {t.register.signUpButton}
                </>
              )}
            </button>
            
            <p className="text-sm text-center text-slate-500 mt-4">
              <Link href="/login" className="hover:text-brand-400 transition-colors">
                {t.register.alreadyHaveAccount}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
