"use client";

import { useState } from "react";
import { TEAMS, Team } from "@/app/teams";
import { getRadiusForRank } from "./SuikaGame";

interface StickerAlbumProps {
  unlockedRanks: number[];
  onClose: () => void;
}

export default function StickerAlbum({ unlockedRanks, onClose }: StickerAlbumProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Grouping mapping
  const confederations = [
    { id: "ALL", name: "All Teams" },
    { id: "HOST", name: "Hosts" },
    { id: "UEFA", name: "Europe (UEFA)" },
    { id: "CONMEBOL", name: "S. America (CONMEBOL)" },
    { id: "CAF", name: "Africa (CAF)" },
    { id: "AFC", name: "Asia (AFC)" },
    { id: "CONCACAF", name: "N. America & OFC" },
  ];

  // Helper to determine team confederation
  const getConfederation = (team: Team): string => {
    const code = team.code;
    
    // Hosts
    if (code === "us" || code === "mx" || code === "ca") return "HOST";
    
    // UEFA
    const uefaCodes = ["de", "fr", "es", "gb-eng", "pt", "be", "nl", "hr", "ch", "at", "se", "tr", "cz", "gb-sct", "no", "ba"];
    if (uefaCodes.includes(code)) return "UEFA";
    
    // CONMEBOL
    const conmebolCodes = ["ar", "br", "uy", "co", "ec", "py"];
    if (conmebolCodes.includes(code)) return "CONMEBOL";
    
    // CAF
    const cafCodes = ["ma", "sn", "ci", "dz", "eg", "tn", "gh", "za", "cd", "cv"];
    if (cafCodes.includes(code)) return "CAF";
    
    // AFC
    const afcCodes = ["jp", "kr", "au", "ir", "sa", "qa", "iq", "jo", "uz"];
    if (afcCodes.includes(code)) return "AFC";
    
    // CONCACAF (remaining) & OFC
    if (code === "pa" || code === "ht" || code === "cw" || code === "nz") return "CONCACAF";
    
    return "ALL";
  };

  const filteredTeams = TEAMS.filter((team) => {
    if (activeTab === "ALL") return true;
    return getConfederation(team) === activeTab;
  });

  const unlockedCount = TEAMS.filter((t) => unlockedRanks.includes(t.rank)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-[#0c0a21] border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album Cover Styling / Banner */}
        <div className="relative p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 uppercase font-sans">
                World Cup 2026 Sticker Album
              </h2>
            </div>
            <p className="text-xs text-indigo-300/80 mt-1">
              Merge teams in the game to unlock stickers and complete your World Cup collection!
            </p>
          </div>

          {/* Progress gauge */}
          <div className="flex items-center gap-4 bg-indigo-900/30 px-4 py-2 border border-indigo-500/20 rounded-2xl">
            <div className="text-right">
              <div className="text-xs text-indigo-300/60 uppercase tracking-widest font-mono">Unlocked</div>
              <div className="text-xl font-black text-indigo-200 font-mono">
                {unlockedCount} <span className="text-xs text-indigo-400">/ 48</span>
              </div>
            </div>
            <div className="w-24 h-2.5 bg-indigo-950 rounded-full overflow-hidden border border-indigo-500/20">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
                style={{ width: `${(unlockedCount / 48) * 100}%` }}
              />
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:static p-2 text-indigo-300/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Confederation Tabs */}
        <div className="flex gap-1 overflow-x-auto px-6 py-3 bg-[#080616] border-b border-indigo-500/10 scrollbar-none">
          {confederations.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-indigo-300/60 hover:text-indigo-200 hover:bg-indigo-950/40"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Sticker Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-[#0a081a]/40">
          {filteredTeams.map((team) => {
            const isUnlocked = unlockedRanks.includes(team.rank);
            const radius = getRadiusForRank(team.rank);
            
            return (
              <div
                key={team.id}
                className={`group relative flex flex-col items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                  isUnlocked
                    ? "bg-[#131135]/60 hover:bg-[#1a174a]/80 border-indigo-500/30 shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/10"
                    : "bg-slate-950/40 border-slate-900 opacity-60"
                }`}
              >
                {/* Holographic shiny stripe for unlocked stickers */}
                {isUnlocked && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none group-hover:animate-shine" />
                )}

                {/* Sticker Rank Badge */}
                <div className="absolute top-2 left-2 flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-indigo-500/30 text-[9px] font-bold text-indigo-300 font-mono">
                  {team.rank}
                </div>

                {/* Flag Display */}
                <div className="my-3 flex items-center justify-center">
                  {isUnlocked ? (
                    <div 
                      className="relative rounded-full overflow-hidden shadow-inner flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ 
                        width: `${Math.min(75, radius * 1.1)}px`, 
                        height: `${Math.min(75, radius * 1.1)}px`,
                        border: `3px solid ${team.color}`
                      }}
                    >
                      <img
                        src={`/flags/${team.code}.png`}
                        alt={`${team.name} Flag`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div 
                      className="rounded-full bg-indigo-950/20 border-2 border-indigo-900/50 flex items-center justify-center select-none"
                      style={{ 
                        width: `${Math.min(75, radius * 1.1)}px`, 
                        height: `${Math.min(75, radius * 1.1)}px` 
                      }}
                    >
                      <span className="text-lg text-indigo-500/50">🔒</span>
                    </div>
                  )}
                </div>

                {/* Sticker Details */}
                <div className="w-full text-center">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {isUnlocked ? team.name : "???"}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono mt-0.5 uppercase tracking-wider">
                    {isUnlocked ? team.code.toUpperCase() : "LOCKED"}
                  </div>
                </div>

                {/* Info Overlay (Hover details) */}
                {isUnlocked && (
                  <div className="absolute inset-0 bg-indigo-950/95 rounded-2xl flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="text-lg">⚽</span>
                    <span className="text-xs font-bold text-slate-200 mt-1">{team.name}</span>
                    <span className="text-[10px] text-indigo-300 mt-1 font-mono text-center">
                      Merges at Rank {team.rank}
                    </span>
                    <span className="text-[9px] text-indigo-400/80 mt-1 font-mono">
                      Radius: {radius}px
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Album Footer Stats */}
        <div className="p-4 bg-[#080616] border-t border-indigo-500/15 text-center text-xs text-indigo-400/60 font-mono">
          © FIFA World Cup 2026 Unified Merge Championship
        </div>
      </div>
    </div>
  );
}
