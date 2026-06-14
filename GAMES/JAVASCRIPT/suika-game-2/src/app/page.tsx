"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Team, TEAMS } from "@/app/teams";
import { soundEffects } from "@/components/SoundEffects";

// Dynamically load Phaser component with no SSR to avoid window/canvas node compiling errors
const SuikaGame = dynamic(() => import("@/components/SuikaGame"), {
  ssr: false,
});

// Load Sticker Album dynamically
const StickerAlbum = dynamic(() => import("@/components/StickerAlbum"), {
  ssr: false,
});

export default function Home() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [unlockedRanks, setUnlockedRanks] = useState<number[]>([1, 2, 3, 4, 5]); // default unlocked (ranks 1-5)
  const [nextTeam, setNextTeam] = useState<Team | null>(null);
  const [inDanger, setInDanger] = useState(false);
  const [dangerProgress, setDangerProgress] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [highestTeam, setHighestTeam] = useState<Team | null>(null);
  const [restartTrigger, setRestartTrigger] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAlbum, setShowAlbum] = useState(false);

  // Load High Score and Unlocked stickers on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHighScore = localStorage.getItem("mundial_merge_high_score");
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10));
      }

      const savedUnlocked = localStorage.getItem("mundial_merge_unlocked_ranks");
      if (savedUnlocked) {
        try {
          const parsed = JSON.parse(savedUnlocked) as number[];
          // Combine defaults and saved, then get unique ranks
          const combined = Array.from(new Set([1, 2, 3, 4, 5, ...parsed]));
          setUnlockedRanks(combined);
        } catch (e) {
          console.error("Error parsing unlocked ranks", e);
        }
      }
    }
  }, []);

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("mundial_merge_high_score", newScore.toString());
    }
  };

  const handleTeamUnlocked = (rank: number) => {
    setUnlockedRanks((prev) => {
      if (prev.includes(rank)) return prev;
      const updated = [...prev, rank].sort((a, b) => a - b);
      localStorage.setItem("mundial_merge_unlocked_ranks", JSON.stringify(updated));
      return updated;
    });
  };

  const handleGameOver = (finalScore: number, finalHighestTeam: Team) => {
    setIsGameOver(true);
    setHighestTeam(finalHighestTeam);
  };

  const handleRestart = () => {
    setScore(0);
    setIsGameOver(false);
    setHighestTeam(null);
    setInDanger(false);
    setDangerProgress(0);
    setRestartTrigger((prev) => prev + 1);
  };

  const handleSoundToggle = () => {
    const nextState = soundEffects.toggleSound();
    setSoundEnabled(nextState);
  };

  const handleShare = () => {
    if (!highestTeam) return;
    const text = `I reached team ${highestTeam.name} (Rank ${highestTeam.rank}) and scored ${score} points in Mundial Merge 2026! Can you unify the 48 World Cup teams? 🏆⚽`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <main className="flex-1 bg-[#09071a] bg-gradient-to-b from-[#060412] via-[#0b0826] to-[#040309] text-white flex flex-col items-center justify-start p-4 md:p-8 relative min-h-screen overflow-x-hidden">
      
      {/* Stadium lights top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* SEO Friendly Heading and Header Section */}
      <header className="w-full max-w-5xl flex flex-col items-center text-center mb-6 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/50 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-3 tracking-widest uppercase font-mono">
          ⚽ FIFA World Cup 2026 Edition ⚽
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase font-sans leading-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 drop-shadow-md">
            Mundial Merge
          </span>{" "}
          <span className="text-indigo-200">2026</span>
        </h1>
        <p className="text-sm text-indigo-300/70 max-w-md mt-2 leading-relaxed">
          Drop national teams, merge identical badges, and conquer the progression chain. Can you reach Argentina at Rank 48?
        </p>
      </header>

      {/* Game Layout Grid */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center z-10 flex-1">
        
        {/* Left Panel: Scores & Control (Glassmorphic) */}
        <section className="w-full lg:w-64 flex flex-row lg:flex-col gap-4 justify-between lg:justify-start">
          
          {/* High Score Panel */}
          <div className="flex-1 lg:flex-initial p-4 rounded-2xl bg-[#131135]/40 border border-indigo-500/20 backdrop-blur-md flex flex-col justify-center min-h-[90px]">
            <h2 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
              High Score
            </h2>
            <div className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400 font-mono mt-1">
              {highScore.toLocaleString()}
            </div>
          </div>

          {/* Current Score Panel */}
          <div className="flex-1 lg:flex-initial p-4 rounded-2xl bg-[#131135]/40 border border-indigo-500/20 backdrop-blur-md flex flex-col justify-center min-h-[90px]">
            <h2 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
              Current Score
            </h2>
            <div className="text-2xl md:text-3xl font-black text-indigo-100 font-mono mt-1">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Action Menu (Sound & Album) */}
          <div className="hidden lg:flex flex-col gap-2.5 mt-2">
            <button
              onClick={() => setShowAlbum(true)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-xs font-bold text-white tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              🏆 Sticker Album ({unlockedRanks.length}/48)
            </button>
            <button
              onClick={handleRestart}
              className="w-full py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-indigo-500/10 text-xs font-bold text-slate-300 tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              🔄 Restart Match
            </button>
            <button
              onClick={handleSoundToggle}
              className="w-full py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-indigo-500/10 text-xs font-bold text-slate-300 tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {soundEnabled ? "🔊 Sound On" : "🔇 Sound Muted"}
            </button>
          </div>
        </section>

        {/* Center Panel: Phaser Sandbox Container */}
        <section className="relative flex flex-col items-center">
          
          {/* Danger Warning Alert Bar */}
          {inDanger && (
            <div 
              className="absolute top-16 left-1/2 -translate-x-1/2 w-80 py-2 px-4 rounded-xl border border-red-500/40 bg-red-950/80 backdrop-blur-md flex items-center justify-center gap-2 text-red-200 text-xs font-bold tracking-wider uppercase animate-pulse z-40 transition-all duration-300"
              style={{
                boxShadow: `0 0 ${dangerProgress * 20}px rgba(239, 68, 68, 0.4)`
              }}
            >
              ⚠️ DANGER ZONE! {Math.ceil((1 - dangerProgress) * 2)}s LEFT ⚠️
            </div>
          )}

          <SuikaGame
            onScoreChange={handleScoreChange}
            onGameOver={handleGameOver}
            onTeamUnlocked={handleTeamUnlocked}
            onNextBallChange={setNextTeam}
            onDangerChange={(danger, progress) => {
              setInDanger(danger);
              setDangerProgress(progress);
            }}
            restartTrigger={restartTrigger}
            soundEnabled={soundEnabled}
          />
        </section>

        {/* Right Panel: Next Preview & Quick Rules */}
        <section className="w-full lg:w-64 flex flex-col gap-4">
          
          {/* Next Preview Ball */}
          <div className="p-4 rounded-2xl bg-[#131135]/40 border border-indigo-500/20 backdrop-blur-md flex flex-col items-center justify-center min-h-[140px]">
            <h2 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono mb-3 text-center">
              Next Up
            </h2>
            {nextTeam ? (
              <div className="flex flex-col items-center">
                <div 
                  className="w-14 h-14 rounded-full overflow-hidden shadow-lg flex items-center justify-center border-4"
                  style={{ borderColor: nextTeam.color }}
                >
                  <img
                    src={`/flags/${nextTeam.code}.png`}
                    alt={`${nextTeam.name} Flag`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs font-extrabold text-slate-200 mt-2 font-mono text-center">
                  {nextTeam.name}
                </div>
                <span className="text-[9px] text-indigo-400 uppercase tracking-widest mt-0.5">
                  Rank {nextTeam.rank}
                </span>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-950/30 animate-pulse border-4 border-indigo-900" />
            )}
          </div>

          {/* Quick instructions / Progression snippet */}
          <div className="p-4 rounded-2xl bg-[#131135]/20 border border-indigo-500/10 backdrop-blur-md flex flex-col justify-center">
            <h2 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono mb-2">
              Progression Chain
            </h2>
            <div className="text-xs text-indigo-300/70 space-y-1.5 leading-normal">
              <p>⚽ Only the smallest 5 teams (Curaçao to Jordan) are droppable.</p>
              <p>🔀 Merging two of the same team promotes it to the next rank.</p>
              <p>🏆 Rank 48 is Argentina! Try to unlock all 48 in your Album.</p>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex lg:hidden w-full gap-2.5 mt-2">
            <button
              onClick={() => setShowAlbum(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white tracking-wider uppercase transition-all shadow-lg flex items-center justify-center cursor-pointer"
            >
              🏆 Album ({unlockedRanks.length}/48)
            </button>
            <button
              onClick={handleRestart}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-indigo-500/10 text-xs font-bold text-slate-300 tracking-wider uppercase transition-all flex items-center justify-center cursor-pointer"
            >
              🔄 Restart
            </button>
            <button
              onClick={handleSoundToggle}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-indigo-500/10 text-xs font-bold text-slate-300 uppercase transition-all flex items-center justify-center cursor-pointer"
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
          </div>
        </section>

      </div>

      {/* SEO Footer */}
      <footer className="w-full max-w-5xl text-center text-xs text-indigo-400/30 mt-12 py-4 border-t border-indigo-500/5 font-mono z-10">
        Mundial Merge 2026 © PROTOTYPING WITH AI. All flag copyrights belong to their respective national football federations.
      </footer>

      {/* STICKER ALBUM MODAL */}
      {showAlbum && (
        <StickerAlbum
          unlockedRanks={unlockedRanks}
          onClose={() => setShowAlbum(false)}
        />
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 bg-gradient-to-b from-[#131135] to-[#0c0a21] border-2 border-red-500/40 rounded-3xl overflow-hidden shadow-2xl text-center flex flex-col items-center">
            
            <span className="text-5xl mb-2 animate-bounce">🚨</span>
            
            <h2 className="text-3xl font-black text-red-500 tracking-wider uppercase">
              Full Time!
            </h2>
            <p className="text-xs text-indigo-300/80 mt-1 uppercase tracking-widest font-mono">
              Game Over
            </p>

            {/* Score Showcase */}
            <div className="my-5 p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/20 w-full">
              <span className="text-xs text-indigo-400 uppercase tracking-widest font-mono">Final Score</span>
              <div className="text-4xl font-black text-indigo-100 font-mono mt-1">
                {score.toLocaleString()}
              </div>
            </div>

            {/* Highest Team Reached card */}
            {highestTeam && (
              <div className="flex flex-col items-center p-4 rounded-2xl bg-gradient-to-r from-indigo-900/20 via-indigo-900/40 to-indigo-900/20 border border-indigo-500/20 w-full mb-6">
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono mb-2">
                  Best Team Achieved
                </span>
                <div 
                  className="w-16 h-16 rounded-full overflow-hidden shadow-lg flex items-center justify-center border-4"
                  style={{ borderColor: highestTeam.color }}
                >
                  <img
                    src={`/flags/${highestTeam.code}.png`}
                    alt={`${highestTeam.name} Flag`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-sm font-black text-slate-100 mt-2 font-sans">
                  {highestTeam.name}
                </div>
                <span className="text-[10px] text-indigo-300 font-mono uppercase tracking-wider mt-0.5">
                  Rank {highestTeam.rank} of 48
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleRestart}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                🎮 Play Again
              </button>
              <button
                onClick={handleShare}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1DA1F2] hover:bg-[#1a91da] text-xs font-bold text-white tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                🐦 Share Score
              </button>
              <button
                onClick={() => {
                  setIsGameOver(false);
                  setShowAlbum(true);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 tracking-widest uppercase transition-all border border-indigo-500/10 cursor-pointer"
              >
                🏆 View Album
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
