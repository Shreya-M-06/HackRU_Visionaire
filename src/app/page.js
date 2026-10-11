'use client';

import React, { useMemo, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAncestorPath, getDescendantSummaries, getNodeDescription } from '../lib/conceptMemory';

// Import all decoupled layout microservices
import HandTracker from './components/HandTracker';
import DiagramCanvas from './components/diagramCanvas';
import ConceptSidebar from './components/ConceptSidebar';

const initialNodes = [
  {
    id: 'start',
    position: { x: 350, y: 150 },
    data: { label: '💡 Type a concept in the sidebar to map your layout!', title: 'Getting started', plainLabel: 'Getting started', description: 'Generate a concept map to begin.' },
  },
];

// High-fidelity styled node generator from your original project
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

function VisionaireWorkspaceContent() {
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draft, setDraft] = useState('');
  const [conversations, setConversations] = useState({});
  const [memorySummaries, setMemorySummaries] = useState({});

  // Core Zoom & Layout States
  const [allGeneratedData, setAllGeneratedData] = useState(null); // Storage vault for raw Gemini JSON trees
  const [zoomScale, setZoomScale] = useState(1.0); // Trackpad and webcam scale synchronizer
  const [rfInstance, setRfInstance] = useState(null);

  // Fallback state trackers for baseline panning actions
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 1. SEMANTIC INTERACTION LOOP: Re-evaluates visible elements automatically based on viewport zoom scales
  const visibleElements = useMemo(() => {
    if (!allGeneratedData) return { nodes: initialNodes, edges: [] };

    const filteredNodes = [];
    const filteredEdges = [];

    // TIER 1: Always visible as your high-level system layout
    allGeneratedData.level_1_nodes?.forEach((node, index) => {
      filteredNodes.push(makeNode({
        id: node.id, label: node.label, description: node.summary, layer: 1,
        position: { x: 100 + index * 420, y: 50 },
      }));
    });

    // TIER 2: Dynamically unmasks sub-components when zoom scale moves closer than 1.2x scale
    if (zoomScale >= 1.2) {
      allGeneratedData.level_2_nodes?.forEach((node, index) => {
        filteredNodes.push(makeNode({
          id: node.id, parentId: node.parentId, label: node.label, description: node.summary, layer: 2,
          position: { x: 120 + index * 340, y: 320 },
        }));
        filteredEdges.push({
          id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
        });
      });
    }

    // TIER 3: Unmasks full code specs and database recommendations when camera scale passes 2.0x deep zoom
    if (zoomScale >= 2.0) {
      allGeneratedData.level_3_nodes?.forEach((node, index) => {
        filteredNodes.push(makeNode({
          id: node.id, parentId: node.parentId, label: node.label, description: node.detail, layer: 3,
          position: { x: 140 + index * 300, y: 600 },
        }));
        filteredEdges.push({
          id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id,
          style: { stroke: '#ec4899', strokeWidth: 1.5 },
        });
      });
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [allGeneratedData, zoomScale]);

  // Hook into currently tracked visible items array to avoid conversational component context drops
  const selectedNode = useMemo(
    () => visibleElements.nodes.find((node) => node.id === selectedNodeId) || null,
    [visibleElements.nodes, selectedNodeId]
  );
  const selectedMessages = selectedNode ? (conversations[selectedNode.id] || []) : [];

  // 2. Drive viewport zooming smoothly via computer vision webcam hand feed
  const handleHandMovement = ({ pinchDistance }) => {
    if (!rfInstance) return;

    let targetZoom = 0.5 + (pinchDistance * 12);
    if (targetZoom < 0.6) targetZoom = 0.6;
    if (targetZoom > 3.2) targetZoom = 3.2;

    setZoomScale(targetZoom); // Triggers real-time node reveal filter recalculations!

    const currentViewport = rfInstance.getViewport();
    rfInstance.setViewport(
      { x: currentViewport.x, y: currentViewport.y, zoom: targetZoom },
      { duration: 80 } // Fast interpolation removes layout jittering
    );
  };

  // 3. Trackpad Pinching Listener Integration
  const handleViewportChange = (viewport) => {
    setZoomScale(viewport.zoom); // Syncs manual hardware scaling changes back to reveal loops
  };

  // 4. Box Click Camera Centering Automation
  const handleNodeClick = (event, node) => {
    if (!rfInstance || node.id === 'start') return;
    setSelectedNodeId(node.id);

    // Pull focus forward and zoom map automatically depending on layer clicked
    const targetZoom = node.data?.layer === 1 ? 1.4 : 2.3;
    setZoomScale(targetZoom);

    const currentViewport = rfInstance.getViewport();
    rfInstance.setViewport(
      { x: currentViewport.x, y: currentViewport.y, zoom: targetZoom },
      { duration: 350 }
    );
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true); setError(''); setChatError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Could not generate the map.');

      setAllGeneratedData(data); // Safely locked in data vault memory
      setTopic(data.topic || prompt.trim());
      setSelectedNodeId(null); setConversations({}); setMemorySummaries({});
      setZoomScale(1.0); // Resets viewport scale to standard level-1 macros

      if (rfInstance) {
        setTimeout(() => rfInstance.fitView({ duration: 400 }), 120);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Map generation failed.');
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
    setDraft(''); setChatLoading(true); setChatError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          node: { id: selectedNode.id, label: selectedNode.data?.title || selectedNode.id, description: getNodeDescription(selectedNode), parentId: selectedNode.data?.parentId || null },
          ancestorPath: getAncestorPath(selectedNode.id, visibleElements.nodes),
          descendantSummaries: getDescendantSummaries(selectedNode.id, visibleElements.nodes, memorySummaries),
          previousSummary: memorySummaries[selectedNode.id] || '',
          messages: nextMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Chat request failed.');

      setConversations((current) => ({ ...current, [selectedNode.id]: [...(current[selectedNode.id] || nextMessages), { role: 'assistant', content: data.answer }] }));
      setMemorySummaries((current) => ({ ...current, [selectedNode.id]: data.summary }));
    } catch (err) {
      setChatError(err.message || "Message send failure.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100 relative">
      {/* 1. SEPARATED CONTROL PANELS AND MESSAGE RECURSIONS */}
      <ConceptSidebar
        prompt={prompt} setPrompt={setPrompt} handleGenerate={handleGenerate} loading={loading} error={error}
        selectedNode={selectedNode} setSelectedNodeId={setSelectedNodeId} draft={draft} setDraft={setDraft}
        handleSendMessage={handleSendMessage} selectedMessages={selectedMessages} chatLoading={chatLoading}
        chatError={chatError} memorySummaries={memorySummaries} nodes={visibleElements.nodes}
      />

      {/* 2. INFINITE NAVIGABLE SPACE GRID */}
      <DiagramCanvas
        nodes={visibleElements.nodes}
        edges={visibleElements.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onInit={setRfInstance}
        onViewportChange={handleViewportChange}
      />

      {/* 3. LOCAL WEBCAM CAMERA GESTURE CAPTURE LAYER */}
      <HandTracker onHandMove={handleHandMovement} />
    </main>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <VisionaireWorkspaceContent />
    </ReactFlowProvider>
  );
}
