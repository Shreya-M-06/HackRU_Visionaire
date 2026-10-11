'use client';

import React, { useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([
    { id: 'start', position: { x: 350, y: 150 }, data: { label: '💡 Type a concept in the sidebar to map your layout!' } }
  ]);
  const [edges, setEdges] = useState([]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const generatedNodes = [];
      const generatedEdges = [];

      // LAYER 1: MACRO SYSTEM TITLES (Large Bold Overview Cards)
      data.level_1_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 400, y: 50 },
          data: { 
            label: (
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">🏢 System Layer</div>
                <h3 className="text-base font-extrabold text-white mb-2">{node.label}</h3>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">{node.summary}</p>
              </div>
            )
          },
          style: { background: '#1e293b', border: '2px solid #38bdf8', padding: '16px', borderRadius: '12px', width: '300px', boxShadow: '0 10px 15px -3px rgba(56, 189, 248, 0.2)' }
        });
      });

      // LAYER 2: SUBSYSTEM BREAKDOWNS (Functional System Details)
      data.level_2_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 350, y: 280 },
          data: { 
            label: (
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">⚙️ Subsystem</div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{node.label}</h4>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">{node.summary}</p>
              </div>
            )
          },
          style: { background: '#0f172a', border: '2px solid #a855f7', padding: '14px', borderRadius: '10px', width: '250px' }
        });
        generatedEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } });
      });

      // LAYER 3: GRANULAR TECHNICAL SPECS (Deepest Tech Specs & Databases)
      data.level_3_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 320, y: 500 },
          data: { 
            label: (
              <div className="text-left font-mono">
                <div className="text-[9px] font-bold uppercase tracking-wider text-pink-400 mb-1">🛠️ Technical Implementation</div>
                <h5 className="text-xs font-bold text-slate-300 mb-2">{node.label}</h5>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px] text-slate-400 leading-normal whitespace-pre-wrap">
                  {node.detail}
                </div>
              </div>
            )
          },
          style: { background: '#020617', border: '1px dashed #ec4899', padding: '12px', borderRadius: '8px', width: '260px' }
        });
        generatedEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, style: { stroke: '#ec4899', strokeWidth: 1.5 } });
      });

      setNodes(generatedNodes);
      setEdges(generatedEdges);

    } catch (err) {
      console.error(err);
      alert('Make sure your GEMINI_API_KEY is saved inside your local .env.local configuration file and your directory structure is perfectly aligned.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      
      {/* SIDEBAR INTERFACE */}
      <section className="w-80 border-r border-slate-800 bg-slate-900 p-6 flex flex-col justify-between text-slate-100 z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Visionaire Canvas AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">HackRU 2026 Interactive Concept Map</p>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ask an Architecture Concept
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., How does Netflix manage movie asset rendering and user authentications?"
                className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Mapping Layers...' : 'Visualize'}
            </button>
          </form>
        </div>
        
        <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-4">
          Pro-Tip: Pinch trackpad or scroll wheel to scale semantic-zoom tiers dynamically.
        </div>
      </section>

      {/* INFINITE ZOOMABLE CANVAS */}
      <section className="flex-1 relative h-full w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#334155" gap={20} size={1} />
          <Controls className="bg-slate-900 border border-slate-800 text-white rounded [&_button]:border-slate-800" />
          <MiniMap nodeColor="#38bdf8" maskColor="rgba(15, 23, 42, 0.7)" className="bg-slate-900 border border-slate-800 rounded hidden md:block" />
        </ReactFlow>
      </section>

    </main>
  );
}
