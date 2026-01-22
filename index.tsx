
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { AppState, PartnerDetails, TaskRecord } from './types';
import { SYSTEM_INSTRUCTION, STORAGE_KEY } from './constants';

const DEFAULT_STATE: AppState = {
  partnerA: { name: '', personality: '', loveLanguage: '', interests: '' },
  partnerB: { name: '', personality: '', loveLanguage: '', interests: '' },
  history: [],
  currentMoods: { A: 'Neutral', B: 'Neutral' },
};

const App = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(!!state.partnerA.name && !!state.partnerB.name);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const generateActivity = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const prompt = `
Context:
Partner A details: ${JSON.stringify(state.partnerA)}
Partner B details: ${JSON.stringify(state.partnerB)}

Previous tasks: ${state.history.map(h => h.activity).join(', ')}
Recent feedback: ${state.history.filter(h => h.feedback).map(h => h.feedback).join('; ')}
Current emotional signals: Partner A: ${state.currentMoods.A}, Partner B: ${state.currentMoods.B}

Generate today's activity.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const activity = response.text?.trim() || "Share one thing you appreciate about each other's presence today.";
      setCurrentActivity(activity);
    } catch (error) {
      console.error('Error generating activity:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = (feedback?: string) => {
    if (!currentActivity) return;
    
    const newRecord: TaskRecord = {
      id: Date.now().toString(),
      activity: currentActivity,
      date: new Date().toLocaleDateString(),
      feedback,
      moodAtTime: { ...state.currentMoods }
    };

    setState(prev => ({
      ...prev,
      history: [newRecord, ...prev.history].slice(0, 30), // Keep last 30
    }));
    setCurrentActivity(null);
  };

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 border border-rose-100">
          <h1 className="heading text-3xl text-rose-800 mb-6 text-center">Welcome to Bonding Moments</h1>
          <p className="text-slate-600 mb-8 text-center">Tell us a bit about you both so we can create meaningful connections.</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <PartnerForm 
              label="Partner A" 
              details={state.partnerA} 
              onChange={(d) => setState(s => ({ ...s, partnerA: d }))} 
            />
            <PartnerForm 
              label="Partner B" 
              details={state.partnerB} 
              onChange={(d) => setState(s => ({ ...s, partnerB: d }))} 
            />
          </div>
          
          <button 
            onClick={() => setIsSetupComplete(true)}
            className="w-full mt-10 bg-rose-600 text-white py-4 rounded-2xl font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
          >
            Start Our Journey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="heading text-4xl text-rose-900 mb-2">Bonding Moments</h1>
        <p className="text-slate-500 italic">Small steps for lasting closeness.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar: Moods & History */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50">
            <h2 className="font-semibold text-rose-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Daily Mood Check-in
            </h2>
            <div className="space-y-4">
              <MoodPicker 
                name={state.partnerA.name} 
                value={state.currentMoods.A} 
                onChange={(m) => setState(s => ({ ...s, currentMoods: { ...s.currentMoods, A: m } }))} 
              />
              <MoodPicker 
                name={state.partnerB.name} 
                value={state.currentMoods.B} 
                onChange={(m) => setState(s => ({ ...s, currentMoods: { ...s.currentMoods, B: m } }))} 
              />
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50">
            <h2 className="font-semibold text-rose-800 mb-4">Past Moments</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {state.history.length === 0 ? (
                <p className="text-xs text-slate-400">Your journey starts here.</p>
              ) : (
                state.history.map(item => (
                  <div key={item.id} className="text-xs p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-slate-400 mb-1">{item.date}</p>
                    <p className="text-slate-700 line-clamp-2">{item.activity}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <button 
            onClick={() => setIsSetupComplete(false)}
            className="text-xs text-slate-400 hover:text-rose-600 transition-colors underline"
          >
            Edit Partner Profiles
          </button>
        </div>

        {/* Main Content: Activity Generation */}
        <div className="md:col-span-2 space-y-6">
          {!currentActivity ? (
            <div className="bg-white rounded-3xl p-12 shadow-xl border border-rose-100 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h2 className="heading text-2xl text-rose-900 mb-4">Ready for today?</h2>
              <p className="text-slate-600 mb-8 max-w-sm">
                Each day we suggest one simple, meaningful way to connect based on your personalities and how you're feeling right now.
              </p>
              <button 
                onClick={generateActivity}
                disabled={isLoading}
                className="group relative inline-flex items-center justify-center px-10 py-4 font-semibold text-white transition-all duration-200 bg-rose-600 rounded-2xl hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-600 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Creating your moment...
                  </span>
                ) : "Show Today's Activity"}
              </button>
            </div>
          ) : (
            <div className="bg-rose-600 text-white rounded-3xl p-10 shadow-2xl relative overflow-hidden transition-all animate-in fade-in zoom-in duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              
              <div className="relative z-10">
                <span className="inline-block px-4 py-1 bg-rose-500/50 rounded-full text-xs font-bold uppercase tracking-widest mb-6">Today's Bonding Activity</span>
                <p className="heading text-3xl mb-12 leading-relaxed">
                  {currentActivity}
                </p>
                
                <div className="space-y-4 pt-8 border-t border-rose-500/30">
                  <p className="text-sm font-medium text-rose-100 italic">How did it go?</p>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => handleComplete('Wonderful')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors text-sm font-medium"
                    >
                      Wonderful
                    </button>
                    <button 
                      onClick={() => handleComplete('Good')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors text-sm font-medium"
                    >
                      Good
                    </button>
                    <button 
                      onClick={() => handleComplete('Maybe tomorrow')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors text-sm font-medium"
                    >
                      Not for us today
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PartnerForm = ({ label, details, onChange }: { label: string, details: PartnerDetails, onChange: (d: PartnerDetails) => void }) => (
  <div className="space-y-4">
    <h3 className="font-semibold text-rose-800 border-b border-rose-100 pb-2">{label}</h3>
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Name</label>
      <input 
        type="text" 
        value={details.name}
        onChange={(e) => onChange({ ...details, name: e.target.value })}
        placeholder="e.g. Alex"
        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Personality</label>
      <input 
        type="text" 
        value={details.personality}
        onChange={(e) => onChange({ ...details, personality: e.target.value })}
        placeholder="e.g. Introverted, thoughtful"
        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Love Language</label>
      <select 
        value={details.loveLanguage}
        onChange={(e) => onChange({ ...details, loveLanguage: e.target.value })}
        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
      >
        <option value="">Select...</option>
        <option value="Words of Affirmation">Words of Affirmation</option>
        <option value="Acts of Service">Acts of Service</option>
        <option value="Receiving Gifts">Receiving Gifts</option>
        <option value="Quality Time">Quality Time</option>
        <option value="Physical Touch">Physical Touch</option>
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Interests</label>
      <input 
        type="text" 
        value={details.interests}
        onChange={(e) => onChange({ ...details, interests: e.target.value })}
        placeholder="e.g. Cooking, Hiking, Sci-fi"
        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
      />
    </div>
  </div>
);

const MoodPicker = ({ name, value, onChange }: { name: string, value: string, onChange: (m: string) => void }) => {
  const moods = [
    { label: 'Happy', color: 'text-yellow-500' },
    { label: 'Tired', color: 'text-blue-400' },
    { label: 'Neutral', color: 'text-slate-400' },
    { label: 'Stress', color: 'text-rose-400' },
    { label: 'Calm', color: 'text-teal-400' },
  ];

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-2 truncate">{name || 'Partner'}'s Energy</p>
      <div className="flex gap-2">
        {moods.map((m) => (
          <button
            key={m.label}
            onClick={() => onChange(m.label)}
            title={m.label}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
              value === m.label 
                ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
