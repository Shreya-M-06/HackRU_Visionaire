'use client';

import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAncestorPath, getDescendantSummaries, getNodeDescription } from '../lib/conceptMemory';

const initialNodes = [
  {
    id: 'start',
    position: { x: 350, y: 150 },
    data: { label: '💡 Type a concept in the sidebar to map your layout!', title: 'Getting started', plainLabel: 'Getting started', description: 'Generate a concept map to begin.' },
  },
];

function makeNode({ id, parentId = null, label, description, position, layer }) {
  const colors = {
    1: { background: '#1e293b', border: '2px solid #38bdf8', width: 300, padding: 16, radius: 12 },
    2: { background: '#0f172a', border: '2px solid #a855f7', width: 250, padding: 14, radius: 10 },
    3: { background: '#020617', border: '1px dashed #ec4899', width: 260, padding: 12, radius: 8 },
  };
  const style = colors[layer];
  const tag = layer === 1 ? '🏢 System Layer' : layer === 2 ? '⚙️ Subsystem' : '🛠️ Technical Detail';
  const accent = layer === 1 ? 'text-sky-400' : layer === 2 ? 'text-purple-400' : 'text-pink-400';

  return {
    id,
    position,
    data: {
      title: label,
      plainLabel: label,
      description,
      parentId,
      layer,
      label: (
        <div className="text-left">
          <div className={`text-[10px] font-bold uppercase tracking-wider ${accent} mb-1`}>{tag}</div>
          <div className="text-sm font-bold text-slate-100 mb-1">{label}</div>
          <div className="text-xs text-slate-400 font-normal leading-relaxed">{description}</div>
          <div className="text-[9px] text-slate-500 mt-2">Click to chat ↗</div>
        </div>
      ),
    },
    style: {
      background: style.background,
      border: style.border,
      padding: style.padding,
      borderRadius: `${style.radius}px`,
      width: style.width,
      boxShadow: layer === 1 ? '0 10px 15px -3px rgba(56, 189, 248, 0.15)' : undefined,
    },
  };
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draft, setDraft] = useState('');
  // MVP-only state: conversations and summaries reset when the page is refreshed.
  // Supabase persistence will replace this later.
  const [conversations, setConversations] = useState({});
  const [memorySummaries, setMemorySummaries] = useState({});

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const selectedMessages = selectedNode ? (conversations[selectedNode.id] || []) : [];

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setChatError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Could not generate the map.');

      const generatedNodes = [];
      const generatedEdges = [];

      (data.level_1_nodes || []).forEach((node, index) => {
        generatedNodes.push(makeNode({
          id: node.id,
          label: node.label,
          description: node.summary,
          layer: 1,
          position: { x: 80 + index * 360, y: 40 },
        }));
      });

      (data.level_2_nodes || []).forEach((node, index) => {
        generatedNodes.push(makeNode({
          id: node.id,
          parentId: node.parentId,
          label: node.label,
          description: node.summary,
          layer: 2,
          position: { x: 80 + index * 300, y: 300 },
        }));
        generatedEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
        });
      });

      (data.level_3_nodes || []).forEach((node, index) => {
        generatedNodes.push(makeNode({
          id: node.id,
          parentId: node.parentId,
          label: node.label,
          description: node.detail,
          layer: 3,
          position: { x: 80 + index * 280, y: 560 },
        }));
        generatedEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          style: { stroke: '#ec4899', strokeWidth: 1.5 },
        });
      });

      if (!generatedNodes.length) throw new Error('Gemini returned an empty map.');
      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setTopic(data.topic || prompt.trim());
      setSelectedNodeId(null);
      setConversations({});
      setMemorySummaries({});
    } catch (err) {
      console.error(err);
      setError(err.message || 'Map generation failed. Check your GEMINI_API_KEY and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedNode || chatLoading) return;

    const priorMessages = conversations[selectedNode.id] || [];
    const nextMessages = [...priorMessages, { role: 'user', content }];
    setConversations((current) => ({ ...current, [selectedNode.id]: nextMessages }));
    setDraft('');
    setChatLoading(true);
    setChatError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          node: {
            id: selectedNode.id,
            label: selectedNode.data?.title || selectedNode.id,
            description: getNodeDescription(selectedNode),
            parentId: selectedNode.data?.parentId || null,
          },
          ancestorPath: getAncestorPath(selectedNode.id, nodes),
          descendantSummaries: getDescendantSummaries(selectedNode.id, nodes, memorySummaries),
          previousSummary: memorySummaries[selectedNode.id] || '',
          messages: nextMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Chat request failed.');

      setConversations((current) => ({
        ...current,
        [selectedNode.id]: [...(current[selectedNode.id] || nextMessages), { role: 'assistant', content: data.answer }],
      }));
      setMemorySummaries((current) => ({ ...current, [selectedNode.id]: data.summary }));
    } catch (err) {
      setChatError(err.message || "Sorry, I couldn't send that message.");
      // Keep the user's message in the history so they can retry or edit their next message.
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      <section className="w-72 shrink-0 border-r border-slate-800 bg-slate-900 p-5 flex flex-col justify-between z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Visionaire Canvas AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">HackRU 2026 Interactive Concept Map</p>

          <form onSubmit={handleGenerate} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Ask an Architecture Concept
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g., How does Netflix manage authentication?"
              className="w-full h-28 rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Mapping Layers...' : 'Visualize'}
            </button>
          </form>

          {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-xs font-semibold text-slate-300">HOW TO USE</div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Generate a map, then click any concept bubble to start a focused chat. Each bubble has its own conversation.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-4">
          Chats and summaries are currently stored in page memory and will reset on refresh. Database saving comes next.
        </div>
      </section>

      <section className="flex-1 relative min-w-0 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNodeId(node.id === 'start' ? null : node.id)}
          fitView
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls className="bg-slate-900 border border-slate-800 text-white rounded [&_button]:border-slate-800" />
          <MiniMap nodeColor="#38bdf8" maskColor="rgba(15, 23, 42, 0.7)" className="bg-slate-900 border border-slate-800 rounded hidden md:block" />
        </ReactFlow>
      </section>

      {selectedNode && (
        <aside className="w-[360px] max-w-[42vw] shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-sky-400 font-bold">Concept chat</div>
              <h2 className="text-base font-bold mt-1 break-words">{selectedNode.data?.title || selectedNode.id}</h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{getNodeDescription(selectedNode)}</p>
            </div>
            <button type="button" onClick={() => setSelectedNodeId(null)} aria-label="Close chat" className="text-slate-400 hover:text-white text-xl leading-none">×</button>
          </div>

          <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/40">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Conversation memory</div>
            <p className="text-xs text-slate-400 mt-1">
              {memorySummaries[selectedNode.id] || 'No summary yet. Ask a question to start building this concept’s memory.'}
            </p>
            {getDescendantSummaries(selectedNode.id, nodes, memorySummaries).length > 0 && (
              <p className="text-[10px] text-emerald-300 mt-2">
                Includes memory from {getDescendantSummaries(selectedNode.id, nodes, memorySummaries).length} descendant concept(s).
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedMessages.length === 0 && (
              <div className="text-sm text-slate-400 leading-relaxed">
                Ask about <span className="text-slate-200 font-medium">{selectedNode.data?.title}</span>. This chat uses the map path and relevant descendant summaries.
              </div>
            )}
            {selectedMessages.map((message, index) => (
              <div key={`${selectedNode.id}-${index}`} className={`rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${message.role === 'user' ? 'ml-5 bg-sky-950 border border-sky-900 text-sky-50' : 'mr-3 bg-slate-800 text-slate-100'}`}>
                <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1">{message.role === 'user' ? 'You' : 'Gemini'}</div>
                {message.content}
              </div>
            ))}
            {chatLoading && <div className="text-xs text-sky-300 animate-pulse">Gemini is thinking…</div>}
            {chatError && <div role="alert" className="text-xs text-red-300">{chatError}</div>}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={`Ask about ${selectedNode.data?.title || 'this concept'}…`}
              rows={3}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
            <button type="submit" disabled={chatLoading || !draft.trim()} className="w-full mt-2 rounded-lg bg-sky-600 hover:bg-sky-500 py-2 text-sm font-semibold disabled:opacity-50">
              {chatLoading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </aside>
      )}
    </main>
  );
}
