/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Sparkles, 
  RefreshCw, 
  Download, 
  History, 
  Zap, 
  Maximize2,
  ChevronRight,
  Shield,
  Dumbbell,
  Sword,
  Camera,
  Moon
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "./lib/utils";
import { transformImage } from "@/src/services/ai";
import { StandAura, JojoTransformation } from "@/src/types/jojo";
import { AuraEffect, SoundEffectOverlay } from "@/src/components/Effects";

export default function App() {
  const [step, setStep] = useState<"upload" | "config" | "processing" | "result">("upload");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [standName, setStandName] = useState("STAR PLATINUM");
  const [aura, setAura] = useState<StandAura>("shimmer");
  const [muscularity, setMuscularity] = useState(8);
  const [sharpness, setSharpness] = useState(7);
  const [history, setHistory] = useState<JojoTransformation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setStep("config");
      };
      reader.readAsDataURL(file);
    }
  };

  const startTransformation = async () => {
    if (!originalImage) return;
    setStep("processing");
    setError(null);

    try {
      const result = await transformImage(originalImage, {
        standName,
        muscularity,
        sharpness,
      });
      
      setTransformedImage(result);
      setStep("result");
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6D28D9', '#FACC15', '#DB2777']
      });

      const newEntry: JojoTransformation = {
        id: Math.random().toString(36).substr(2, 9),
        originalImage,
        transformedImage: result,
        standName,
        standAura: aura,
        metadata: { sharpness, muscularity, celShading: 10 },
        createdAt: Date.now(),
      };
      setHistory(prev => [newEntry, ...prev]);
    } catch (err) {
      setError("The transformation was interrupted by an enemy Stand! (AI Error)");
      setStep("config");
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setTransformedImage(null);
    setStep("upload");
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-jojo-yellow selection:text-zinc-900 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 speed-lines opacity-20 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-50 p-6 border-b-4 border-jojo-purple bg-zinc-950/80 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-jojo-purple rounded-lg flex items-center justify-center transform rotate-12 shadow-[4px_4px_0_#FACC15]">
            <Sparkles className="text-jojo-yellow" />
          </div>
          <div>
            <h1 className="font-display text-3xl italic tracking-tighter leading-none">
              JO<span className="text-jojo-pink">JO</span> TRANSFORMER
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
              Dimensional Rift Character Engine
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-2 border-zinc-800 rounded-full text-xs font-bold hover:border-jojo-purple transition-all"
        >
          <History size={16} /> HISTORY
        </button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-4 md:p-12">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center mb-12">
                <motion.h2 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-display text-6xl md:text-8xl mb-4 italic tracking-tighter"
                >
                  TRANSCEND <br /> 
                  <span className="text-jojo-yellow">HUMANITY</span>
                </motion.h2>
                <p className="text-zinc-400 font-medium max-w-lg mx-auto">
                  Upload a photo to be reborn as a Stand User with high-contrast cel-shading and dramatic muscularity.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer"
              >
                <div className="absolute -inset-4 bg-jojo-purple/20 blur-3xl group-hover:bg-jojo-purple/40 transition-all rounded-full" />
                <div className="relative w-72 h-72 md:w-96 md:h-96 border-4 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-4 bg-zinc-900/50 hover:border-jojo-yellow transition-all overflow-hidden">
                  <Upload size={64} className="text-zinc-600 group-hover:text-jojo-yellow transition-all group-hover:scale-110" />
                  <div className="text-center">
                    <p className="font-bold text-zinc-400 group-hover:text-zinc-200">DROP YOUR PHOTO</p>
                    <p className="text-xs text-zinc-600">OR CLICK TO BROWSE</p>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute bottom-4 right-4">
                    <span className="menacing-text text-2xl">ゴ</span>
                    <span className="menacing-text text-xl ml-2 delay-100">ゴ</span>
                    <span className="menacing-text text-3xl ml-2 delay-200">ゴ</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.div>
          )}

          {step === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="grid gap-12 md:grid-cols-[1fr_400px]"
            >
              {/* Preview */}
              <div className="jojo-card aspect-[3/4] relative group">
                <div className="absolute inset-0 bg-jojo-purple/10 pointer-events-none" />
                {originalImage && (
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="w-full h-full object-cover grayscale brightness-75 contrast-125"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 border-[16px] border-zinc-950/20" />
                <div className="absolute top-8 left-8 flex flex-col gap-2">
                   <div className="bg-jojo-yellow text-zinc-950 font-display px-3 py-1 -rotate-2 shadow-lg">TARGET IDENTIFIED</div>
                   <div className="bg-zinc-950 text-white text-[10px] font-bold px-2 py-0.5 w-max tracking-widest uppercase">Biological Scan Active</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-8">
                <div className="space-y-4">
                  <h3 className="font-display text-2xl text-jojo-yellow flex items-center gap-2">
                    <Shield size={24} /> STAND USER CONFIG
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stand Name</label>
                    <input 
                      value={standName}
                      onChange={(e) => setStandName(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-900 border-2 border-zinc-800 p-4 font-display text-2xl focus:border-jojo-pink outline-none transition-all uppercase tracking-tight"
                      placeholder="ENTER STAND NAME..."
                    />
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Dumbbell size={14} /> Muscularity
                      </label>
                      <span className="text-jojo-yellow font-display">{muscularity}/10</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" value={muscularity} 
                      onChange={(e) => setMuscularity(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-jojo-pink"
                    />

                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Sword size={14} /> Sharpness
                      </label>
                      <span className="text-jojo-yellow font-display">{sharpness}/10</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" value={sharpness} 
                      onChange={(e) => setSharpness(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-jojo-purple"
                    />
                  </div>

                  <div className="space-y-2 pt-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Select Aura</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(["none", "electric", "flame", "shimmer", "darkness"] as StandAura[]).map((a) => (
                        <button
                          key={a}
                          onClick={() => setAura(a)}
                          className={cn(
                            "aspect-square rounded-lg border-2 transition-all flex items-center justify-center bg-zinc-900",
                            aura === a ? "border-jojo-yellow shadow-[0_0_10px_#FACC15]" : "border-zinc-800 hover:border-zinc-600"
                          )}
                        >
                          {a === "electric" && <Zap size={16} />}
                          {a === "flame" && <RefreshCw size={16} />}
                          {a === "shimmer" && <Sparkles size={16} />}
                          {a === "darkness" && <Moon size={16} />}
                          {a === "none" && <div className="w-2 h-2 rounded-full bg-zinc-700" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  {error && <p className="text-red-500 text-[10px] font-bold bg-red-500/10 p-2 border border-red-500/20">{error}</p>}
                  <button 
                    onClick={startTransformation}
                    className="jojo-button w-full bg-jojo-purple text-white relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-jojo-pink to-jojo-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      MANIFEST STAND <ChevronRight size={20} />
                    </span>
                  </button>
                  <button 
                    onClick={reset}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    CANCEL & RE-UPLOAD
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="relative mb-12">
                <motion.div 
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-48 h-48 border-8 border-jojo-purple border-t-jojo-yellow rounded-full shadow-[0_0_50px_rgba(109,40,217,0.5)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={48} className="text-jojo-yellow animate-shake" />
                </div>
                <div className="absolute -top-4 -right-12">
                   <span className="menacing-text text-5xl">ゴ</span>
                </div>
                <div className="absolute -bottom-8 -left-8">
                   <span className="menacing-text text-4xl delay-200">ゴ</span>
                </div>
              </div>
              <h2 className="font-display text-4xl mb-2 tracking-tight">DIMENSIONAL RIFT OPENING...</h2>
              <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
                Calculating Muscular Displacement & Ink Thickness
              </p>
              
              <div className="mt-12 max-w-sm w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-jojo-purple via-jojo-pink to-jojo-yellow"
                />
              </div>
            </motion.div>
          )}

          {step === "result" && transformedImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12"
            >
              <div className="grid gap-12 md:grid-cols-[1fr_400px]">
                <div className="relative group">
                  <div className="jojo-card relative overflow-hidden aspect-[3/4] shadow-[0_0_80px_rgba(109,40,217,0.3)]">
                    <img 
                      src={transformedImage} 
                      alt="Transformed" 
                      className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Effects Layer */}
                    <AuraEffect type={aura} />
                    
                    {/* Overlays */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-10 left-10">
                        <SoundEffectOverlay text="MENACING" rotation={-15} />
                      </div>
                      <div className="absolute bottom-20 right-10">
                        <SoundEffectOverlay text="ドドド" rotation={5} />
                      </div>
                    </div>

                    {/* Frame Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-20">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-black tracking-[0.5em] text-jojo-yellow uppercase mb-1">Stand Master</p>
                          <h2 className="font-display text-5xl italic leading-none">{standName}</h2>
                        </div>
                        <div className="text-right">
                           <div className="flex gap-1 justify-end mb-2">
                             {[...Array(5)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-jojo-pink rotate-45" />)}
                           </div>
                           <p className="font-mono text-[10px] text-zinc-500">REV: 02-ARAKI-GEN</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Before/After Toggle Bubble */}
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
                    <button 
                      onClick={() => {
                        const temp = transformedImage;
                        setTransformedImage(originalImage);
                        setTimeout(() => setTransformedImage(temp), 1500);
                      }}
                      className="w-12 h-12 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                      <RefreshCw size={20} />
                    </button>
                    <button 
                       onClick={() => window.open(transformedImage, '_blank')}
                      className="w-12 h-12 bg-jojo-yellow text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="jojo-card p-8 bg-zinc-900 border-jojo-yellow/20">
                    <h3 className="font-display text-xl mb-6 text-jojo-yellow">CHARACTER DATA</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center font-display text-2xl text-jojo-pink">A</div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Power Output</p>
                          <p className="font-bold text-sm tracking-widest">DESTRUCTIVE POTENTIAL</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center font-display text-2xl text-jojo-purple">B+</div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Precision</p>
                          <p className="font-bold text-sm tracking-widest">DIMENSIONAL FOCUS</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center font-display text-2xl text-jojo-yellow">S</div>
                         <div>
                           <p className="text-[10px] font-bold text-zinc-500 uppercase">Style</p>
                           <p className="font-bold text-sm tracking-widest">ARAKI-GRADE AESTHETIC</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={reset}
                    className="jojo-button bg-white text-black hover:bg-jojo-yellow"
                  >
                    NEW TRANSFORMATION
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Section */}
        <section id="history-section" className="mt-32 pt-24 border-t-2 border-zinc-900">
           <div className="flex justify-between items-center mb-12">
             <h2 className="font-display text-5xl">RIFT <span className="text-jojo-purple">HISTORY</span></h2>
             <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">Last 10 Manifestations</span>
           </div>
           
           {history.length === 0 ? (
             <div className="h-64 border-2 border-dashed border-zinc-900 rounded-3xl flex items-center justify-center text-zinc-700 font-bold uppercase tracking-widest italic">
               NO PREVIOUS USERS DETECTED
             </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {history.map((entry) => (
                 <motion.div 
                   key={entry.id}
                   whileHover={{ y: -10 }}
                   className="jojo-card aspect-[3/4] group relative cursor-pointer"
                 >
                   <img src={entry.transformedImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                      <p className="font-display text-lg leading-none truncate">{entry.standName}</p>
                      <p className="text-[8px] font-bold text-jojo-yellow">{new Date(entry.createdAt).toLocaleDateString()}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           )}
        </section>
      </main>

      <footer className="mt-32 p-12 bg-zinc-950 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
           <p className="font-display text-2xl tracking-tighter opacity-20">JOJO TRANSFORMER v1.0</p>
           <p className="text-[10px] font-bold text-zinc-600 uppercase mt-1">Inspired by the works of Hirohiko Araki</p>
        </div>
        <div className="flex gap-4">
           {['TWITTER', 'INSTAGRAM', 'GITHUB'].map(link => (
             <a key={link} href="#" className="text-[10px] font-black tracking-widest hover:text-jojo-yellow transition-colors">{link}</a>
           ))}
        </div>
      </footer>
    </div>
  );
}

