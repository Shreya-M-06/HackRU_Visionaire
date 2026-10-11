'use client';

import React from 'react';
import { getNodeDescription, getDescendantSummaries } from '../lib/conceptMemory';

export default function ConceptSidebar({
  prompt,
  setPrompt,
  handleGenerate,
  loading,
  error,
  selectedNode,
  setSelectedNodeId,
  draft,
  setDraft,
  handleSendMessage,
  selectedMessages,
  chatLoading,
  chatError,
  memorySummaries,
  nodes,
}) {
  return (
    <>
      {/* LEFT SIDEBAR: INPUT CONTROL PANEL */}
      <section className="w-72 shrink-0 border-r border-slate-800 bg-slate-900 p-5 flex flex-col justify-between z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Visionaire Canvas AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">HackRU Interactive Concept Map</p>

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

      {/* RIGHT SIDEBAR: INDEPENDENT BUBBLE CONVERSATION WINDOW */}
      {selectedNode && (
        <aside className="w-[360px] max-w-[42vw] shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col z-10">
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-sky-400 font-bold">Concept chat</div>
              <h2 className="text-base font-bold mt-1 break-words">{selectedNode.data?.title || selectedNode.id}</h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{getNodeDescription(selectedNode)}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedNodeId(null)} 
              aria-label="Close chat" 
              className="text-slate-400 hover:text-white text-xl leading-none"
            >
              ×
            </button>
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
            <button 
              type="submit" 
              disabled={chatLoading || !draft.trim()} 
              className="w-full mt-2 rounded-lg bg-sky-600 hover:bg-sky-500 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {chatLoading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
