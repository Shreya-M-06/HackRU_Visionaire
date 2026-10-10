'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // React Flow state managing active rendering maps
  const [nodes, setNodes] = useState([
    { id: 'start', position: { x: 250, y: 150 }, data: { label: 'Type an architecture concept in the sidebar to generate your canvas!' } }
  ]);
  const [edges, setEdges] = useState([]);

  // Triggered when a user clicks 'Generate Map' in your sidebar panel
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

      // Level 1: Macro Nodes (Positioned horizontally at the top layer)
      data.level_1_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 350, y: 50 },
          data: { label: `${node.label}\n\n${node.summary}` },
          style: { background: '#1e293b', color: '#fff', border: '2px solid #38bdf8', padding: '15px', borderRadius: '8px', width: '250px' }
        });
      });

      // Level 2: Subsystems (Positioned lower on the y-axis, mapped below parents)
      data.level_2_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 300, y: 250 },
          data: { label: `${node.label}\n\n${node.summary}` },
          style: { background: '#0f172a', color: '#cbd5e1', border: '2px solid #a855f7', padding: '15px', borderRadius: '8px', width: '220px' }
        });
        generatedEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, animated: true, style: { stroke: '#a855f7' } });
      });

      // Level 3: Granular Code Implementation Specs (Positioned at the deep tier)
      data.level_3_nodes.forEach((node, i) => {
        generatedNodes.push({
          id: node.id,
          position: { x: 100 + i * 280, y: 480 },
          data: { label: `${node.label}\n\n${node.detail}` },
          style: { background: '#020617', color: '#94a3b8', border: '1px dashed #ec4899', padding: '12px', borderRadius: '6px', width: '200px', fontSize: '12px' }
        });
        generatedEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, style: { stroke: '#ec4899' } });
      });

      setNodes(generatedNodes);
      setEdges(generatedEdges);

    } catch (err) {
      console.error(err);
      alert('Failed to generate flow map architecture. Is your GEMINI_API_KEY running inside your local server configurations? Check the logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      
      {/* SIDEBAR PANEL UI */}
      <section className="w-80 border-r border-slate-800 bg-slate-900 p-6 flex flex-col justify-between text-slate-100 z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Visionaire Canvas AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">HackRU 2026 Architectural Knowledge Tool</p>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ask Architecture Concept
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., How does Netflix process movie uploads or auth logs?"
                className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Mapping out Nodes...' : 'Generate Interactive Map'}
            </button>
          </form>
        </div>
        
        <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-4">
          Pro-Tip: Pinch trackpad or roll wheel to semantic-zoom into structural layers.
        </div>
      </section>

      {/* INFINITE CANVAS AREA */}
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