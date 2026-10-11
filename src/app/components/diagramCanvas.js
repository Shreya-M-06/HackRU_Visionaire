'use client';

import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function DiagramCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onInit,
  onViewportChange, // Connects trackpad zooming into your page filter
}) {
  return (
    <section className="flex-1 relative min-w-0 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onInit={onInit}
        onViewportChange={onViewportChange} // Enables trackpad listener calculations
        fitView
        minZoom={0.4}
        maxZoom={4.0}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="bg-slate-900 border border-slate-800 text-white rounded [&_button]:border-slate-800" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-900 border border-slate-800 rounded hidden md:block"
        />
      </ReactFlow>
    </section>
  );
}