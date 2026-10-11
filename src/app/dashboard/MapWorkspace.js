'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import HandTracker from '../components/HandTracker';
import {
  getAncestorPath, getDescendantSummaries, getNodeDescription,
} from '../../lib/conceptMemory';

const CENTER = { x: 0, y: 0 };
const LEVEL1_RADIUS = 360;
const LEVEL2_RADIUS = 230;
const LEVEL3_RADIUS = 185;

function bubbleNode({ id, label, description = '', layer = 0, parentId = null, position }) {
  const palettes = {
    0: { bg: '#102d4f', border: '#38bdf8', size: 220, tag: 'MAIN TOPIC' },
    1: { bg: '#12395a', border: '#38bdf8', size: 170, tag: 'TOPIC' },
    2: { bg: '#251a4a', border: '#a78bfa', size: 142, tag: 'SUBTOPIC' },
    3: { bg: '#35152f', border: '#f472b6', size: 125, tag: 'DETAIL' },
  };
  const p = palettes[layer] || palettes[3];
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
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          <div style={{ color: p.border, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 5 }}>{p.tag}</div>
          <div style={{ color: '#f8fafc', fontSize: layer === 0 ? 15 : 12, fontWeight: 750, lineHeight: 1.25 }}>{label}</div>
          {description && <div style={{ color: '#cbd5e1', fontSize: 9, lineHeight: 1.35, marginTop: 6, maxHeight: 42, overflow: 'hidden' }}>{description}</div>}
          <div style={{ color: '#94a3b8', fontSize: 8, marginTop: 6 }}>Click to explore</div>
        </div>
      ),
    },
    style: {
      width: p.size,
      height: p.size,
      borderRadius: '50%',
      border: `2px solid ${p.border}`,
      background: `radial-gradient(circle at 30% 25%, ${p.bg}, #020617 100%)`,
      boxShadow: `0 0 26px ${p.border}25, inset 0 0 18px ${p.border}10`,
      padding: 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
}

function radialPosition(parentPosition, angle, radius) {
  return {
    x: parentPosition.x + Math.cos(angle) * radius,
    y: parentPosition.y + Math.sin(angle) * radius,
  };
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState([
    bubbleNode({
      id: 'start', label: 'Your concept starts here',
      description: 'Enter a topic on the left, then select this bubble to explore.',
      layer: 0, position: CENTER,
    }),
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [memorySummaries, setMemorySummaries] = useState({});
  const [draft, setDraft] = useState('');
  const [handControlsEnabled, setHandControlsEnabled] = useState(false);
  const [flowInstance, setFlowInstance] = useState(null);
  const lastGestureRef = useRef(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ||
      allNodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, allNodes, selectedNodeId]
  );
  const selectedMessages = selectedNode ? (conversations[selectedNode.id] || []) : [];

  const revealVisibleGraph = useCallback((expanded) => {
    const visibleIds = new Set();
    const root = allNodes.find((n) => n.data.layer === 0);
    if (root) visibleIds.add(root.id);

    // A node's children are visible only after that node has been explored.
    let changed = true;
    while (changed) {
      changed = false;
      allEdges.forEach((edge) => {
        if (visibleIds.has(edge.source) && expanded.has(edge.source) && !visibleIds.has(edge.target)) {
          visibleIds.add(edge.target);
          changed = true;
        }
      });
    }

    setNodes(allNodes.filter((node) => visibleIds.has(node.id)));
    setEdges(allEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)));
  }, [allNodes, allEdges, setNodes, setEdges]);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
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

      const rootId = 'visionaire-root';
      const rootLabel = data.topic || prompt.trim();
      const builtNodes = [bubbleNode({
        id: rootId, label: rootLabel, description: 'Select this central concept to reveal its main branches.',
        layer: 0, position: CENTER,
      })];
      const builtEdges = [];
      const l1 = data.level_1_nodes || [];
      const l2 = data.level_2_nodes || [];
      const l3 = data.level_3_nodes || [];
      const positions = new Map([[rootId, CENTER]]);

      // Main branches orbit the central topic.
      l1.forEach((item, index) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(l1.length, 1);
        const position = radialPosition(CENTER, angle, LEVEL1_RADIUS);
        positions.set(item.id, position);
        builtNodes.push(bubbleNode({
          id: item.id, label: item.label, description: item.summary,
          layer: 1, parentId: rootId, position,
        }));
        builtEdges.push({
          id: `e-${rootId}-${item.id}`, source: rootId, target: item.id,
          type: 'smoothstep', style: { stroke: '#38bdf8', strokeWidth: 2 },
        });
      });

      // Keep all descendants in memory, but hide them until their parent is expanded.
      const childrenByParent = new Map();
      l2.forEach((item) => {
        if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
        childrenByParent.get(item.parentId).push(item);
      });
      l3.forEach((item) => {
        if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
        childrenByParent.get(item.parentId).push(item);
      });

      l2.forEach((item) => {
        const parentPos = positions.get(item.parentId) || CENTER;
        const siblings = childrenByParent.get(item.parentId) || [item];
        const index = siblings.findIndex((s) => s.id === item.id);
        const parentNode = builtNodes.find((n) => n.id === item.parentId);
        const parentAngle = parentNode
          ? Math.atan2(parentPos.y - CENTER.y, parentPos.x - CENTER.x)
          : 0;
        const spread = Math.PI * 0.9;
        const angle = parentAngle - spread / 2 + (siblings.length <= 1 ? 0 : spread * index / (siblings.length - 1));
        const position = radialPosition(parentPos, angle, LEVEL2_RADIUS);
        positions.set(item.id, position);
        builtNodes.push(bubbleNode({
          id: item.id, label: item.label, description: item.summary,
          layer: 2, parentId: item.parentId, position,
        }));
        builtEdges.push({
          id: `e-${item.parentId}-${item.id}`, source: item.parentId, target: item.id,
          type: 'smoothstep', style: { stroke: '#a78bfa', strokeWidth: 1.8 },
        });
      });

      l3.forEach((item) => {
        const parentPos = positions.get(item.parentId) || CENTER;
        const siblings = childrenByParent.get(item.parentId) || [item];
        const index = siblings.findIndex((s) => s.id === item.id);
        const parentNode = builtNodes.find((n) => n.id === item.parentId);
        const parentPosAngle = parentNode
          ? Math.atan2(parentPos.y - (positions.get(parentNode.data.parentId)?.y || 0), parentPos.x - (positions.get(parentNode.data.parentId)?.x || 0))
          : Math.PI / 2;
        const spread = Math.PI * 0.85;
        const angle = parentPosAngle - spread / 2 + (siblings.length <= 1 ? 0 : spread * index / (siblings.length - 1));
        const position = radialPosition(parentPos, angle, LEVEL3_RADIUS);
        positions.set(item.id, position);
        builtNodes.push(bubbleNode({
          id: item.id, label: item.label, description: item.detail,
          layer: 3, parentId: item.parentId, position,
        }));
        builtEdges.push({
          id: `e-${item.parentId}-${item.id}`, source: item.parentId, target: item.id,
          type: 'smoothstep', style: { stroke: '#f472b6', strokeWidth: 1.4 },
        });
      });

      setTopic(rootLabel);
      setAllNodes(builtNodes);
      setAllEdges(builtEdges);
      setExpandedIds(new Set());
      setNodes([builtNodes[0]]);
      setEdges([]);
      setSelectedNodeId(null);
      setConversations({});
      setMemorySummaries({});
      // Start centered on the one main bubble.
      setTimeout(() => flowInstance?.setCenter(110, 110, { zoom: 0.9, duration: 350 }), 50);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Map generation failed. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (_, node) => {
    setSelectedNodeId(node.id);
    if (node.id === 'start') return;
    const nextExpanded = new Set(expandedIds);
    if (!nextExpanded.has(node.id)) {
      nextExpanded.add(node.id);
      setExpandedIds(nextExpanded);
      revealVisibleGraph(nextExpanded);
      setTimeout(() => {
        if (!flowInstance) return;
        if (node.data?.layer === 0) {
          flowInstance.fitView({ padding: 0.18, duration: 450, maxZoom: 0.85 });
        } else {
          const childIds = allEdges
            .filter((edge) => edge.source === node.id)
            .map((edge) => edge.target);
          flowInstance.fitView({
            nodes: [{ id: node.id }, ...childIds.map((id) => ({ id }))],
            padding: 0.35,
            duration: 450,
            maxZoom: 1.1,
          });
        }
      }, 60);
    }
  };

  const handleHandMove = useCallback((gesture) => {
    if (!flowInstance) return;
    const now = performance.now();
    const previous = lastGestureRef.current;
    const pinchActive = gesture.pinchDistance < 0.065;

    if (previous && pinchActive && previous.pinchActive) {
      const dx = (previous.handX - gesture.handX) * 900;
      const dy = (previous.handY - gesture.handY) * 700;
      if (Math.abs(dx) + Math.abs(dy) > 0.4) {
        const viewport = flowInstance.getViewport();
        flowInstance.setViewport({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        }, { duration: 0 });
      }
    }

    // Opening/closing the pinch changes zoom gradually while fingers are separated.
    if (previous && now - previous.zoomAt > 100 && !pinchActive) {
      const delta = gesture.pinchDistance - previous.pinchDistance;
      if (Math.abs(delta) > 0.025) {
        const viewport = flowInstance.getViewport();
        const zoom = Math.max(0.35, Math.min(1.8, viewport.zoom + (delta > 0 ? 0.025 : -0.025)));
        flowInstance.setViewport({ ...viewport, zoom }, { duration: 80 });
        lastGestureRef.current = { ...gesture, pinchActive, zoomAt: now };
        return;
      }
    }

    lastGestureRef.current = { ...gesture, pinchActive, zoomAt: previous?.zoomAt || now };
  }, [flowInstance]);

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
          ancestorPath: getAncestorPath(selectedNode.id, allNodes),
          descendantSummaries: getDescendantSummaries(selectedNode.id, allNodes, memorySummaries),
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
      setMemorySummaries((current) => ({ ...current, [selectedNode.id]: data.summary || '' }));
    } catch (err) {
      setChatError(err.message || "Sorry, I couldn't send that message.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      <section className="z-10 flex w-72 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 p-5">
        <div>
          <h1 className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">Visionaire Canvas AI</h1>
          <p className="mb-6 mt-1 text-xs text-slate-400">HackRU 2026 Interactive Concept Map</p>
          <form onSubmit={handleGenerate} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Ask an Architecture Concept</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Penetration testing" className="h-28 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none" />
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading ? 'Mapping…' : 'Visualize'}</button>
          </form>
          {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
          <button type="button" onClick={() => setHandControlsEnabled((v) => !v)} className="mt-3 w-full rounded-lg border border-sky-700 bg-slate-950 px-4 py-2 text-sm hover:bg-slate-800">
            {handControlsEnabled ? 'Turn Off Hand Controls' : 'Enable Hand Controls'}
          </button>
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-xs font-semibold text-slate-300">HOW TO USE</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Generate a map, then click a bubble to reveal its next level. Click any concept to open its own chat. Pinch and move your hand to pan; change pinch distance to adjust zoom.</p>
          </div>
        </div>
        <div className="border-t border-slate-800/60 pt-4 text-[10px] text-slate-500">Chats and summaries reset on refresh. Database saving comes next.</div>
      </section>

      <section className="relative h-full min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onInit={setFlowInstance}
          fitView
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: false }}
        >
          <Background color="#1e3a5f" gap={24} size={1} />
          <Controls className="rounded border border-slate-800 bg-slate-900 text-white [&_button]:border-slate-800" />
          <MiniMap nodeColor={(node) => node.data?.layer === 2 ? '#a78bfa' : node.data?.layer === 3 ? '#f472b6' : '#38bdf8'} maskColor="rgba(2, 6, 23, 0.75)" className="hidden rounded border border-slate-800 bg-slate-900 md:block" />
        </ReactFlow>
        <HandTracker enabled={handControlsEnabled} onHandMove={handleHandMove} />
      </section>

      {selectedNode && selectedNode.id !== 'start' && (
        <aside className="flex w-[340px] max-w-[40vw] shrink-0 flex-col border-l border-slate-800 bg-slate-900">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Concept chat</div>
              <h2 className="mt-1 break-words text-base font-bold">{selectedNode.data?.title || selectedNode.id}</h2>
              <p className="mt-1 line-clamp-3 text-xs text-slate-400">{getNodeDescription(selectedNode)}</p>
            </div>
            <button type="button" onClick={() => setSelectedNodeId(null)} aria-label="Close chat" className="text-xl leading-none text-slate-400 hover:text-white">×</button>
          </div>
          <div className="border-b border-slate-800 bg-slate-950/40 px-4 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conversation memory</div>
            <p className="mt-1 text-xs text-slate-400">{memorySummaries[selectedNode.id] || 'No summary yet. Ask a question to start building this concept’s memory.'}</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selectedMessages.length === 0 && <div className="text-sm leading-relaxed text-slate-400">Ask about <span className="font-medium text-slate-200">{selectedNode.data?.title}</span>. This chat uses the map path and relevant descendant summaries.</div>}
            {selectedMessages.map((message, index) => (
              <div key={`${selectedNode.id}-${index}`} className={`whitespace-pre-wrap break-words rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-5 border border-sky-900 bg-sky-950 text-sky-50' : 'mr-3 bg-slate-800 text-slate-100'}`}>
                <div className="mb-1 text-[9px] uppercase tracking-wider opacity-60">{message.role === 'user' ? 'You' : 'Gemini'}</div>
                {message.content}
              </div>
            ))}
            {chatLoading && <div className="animate-pulse text-xs text-sky-300">Gemini is thinking…</div>}
            {chatError && <div role="alert" className="text-xs text-red-300">{chatError}</div>}
          </div>
          <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder={`Ask about ${selectedNode.data?.title || 'this concept'}…`} rows={3} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none" />
            <button type="submit" disabled={chatLoading || !draft.trim()} className="mt-2 w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">{chatLoading ? 'Sending…' : 'Send message'}</button>
          </form>
        </aside>
      )}
    </main>
  );
}
