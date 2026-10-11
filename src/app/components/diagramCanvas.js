'use client';

import React, { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function DiagramCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onInit,
  zoomScale, // Captures real-time scale changes from your hand movements
}) {
  const { setViewport, getViewport } = useReactFlow();

  // Listen for hand gesture zoom updates and smoothly transition the viewport camera
  useEffect(() => {
    if (!zoomScale) return;
    const currentViewport = getViewport();
    setViewport(
      { x: currentViewport.x, y: currentViewport.y, zoom: zoomScale },
      { duration: 150 } // 150ms animation wrapper prevents camera jittering
    );
  }, [zoomScale, setViewport, getViewport]);

  return (
    <section className="flex-1 relative min-w-0 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onInit={onInit}
        fitView
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
