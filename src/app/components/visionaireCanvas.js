'use client';
import React, { useEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function VisionaireCanvas({ graphData, zoomScale, onInit }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setViewport, getViewport } = useReactFlow();

  // 1. Listen to zoomScale changes passed down from the page coordinator
  useEffect(() => {
    if (!zoomScale) return;
    const currentViewport = getViewport();
    // Smoothly pan/zoom the canvas camera based on the hand tracking distance
    setViewport({ x: currentViewport.x, y: currentViewport.y, zoom: zoomScale }, { duration: 150 });
  }, [zoomScale, setViewport, getViewport]);

  // 2. Build the visual diagram nodes whenever new Gemini data arrives
  useEffect(() => {
    if (!graphData) return;

    let newNodes = [];
    let newEdges = [];

    // Map Macro systems (Level 1)
    graphData.level_1_nodes?.forEach((node, index) => {
      newNodes.push({
        id: node.id,
        type: 'default',
        data: { label: <div><h3>{node.label}</h3><p>{node.summary}</p></div> },
        position: { x: index * 320, y: 100 }, // Stagger horizontally
        style: { background: '#1e3a8a', color: '#fff', border: '2px solid #3b82f6', borderRadius: '8px', width: 260 }
      });
    });

    // Map Sub-systems (Level 2)
    graphData.level_2_nodes?.forEach((node, index) => {
      newNodes.push({
        id: node.id,
        type: 'default',
        data: { label: <div><h4>{node.label}</h4><p>{node.summary}</p></div> },
        position: { x: index * 320, y: 350 }, // Render below Level 1
        style: { background: '#065f46', color: '#fff', border: '2px solid #10b981', borderRadius: '6px', width: 240 }
      });
      // Draw connection lines from Level 1 parent down to Level 2 sub-box
      newEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id, animated: true });
    });

    // Map Micro Details (Level 3)
    graphData.level_3_nodes?.forEach((node, index) => {
      newNodes.push({
        id: node.id,
        type: 'output',
        data: { label: <div><strong>{node.label}</strong><p style={{fontSize: '11px'}}>{node.detail}</p></div> },
        position: { x: index * 320, y: 600 }, // Render at the very bottom
        style: { background: '#78350f', color: '#fff', border: '2px solid #f59e0b', borderRadius: '4px', width: 220 }
      });
      // Draw connection lines from Level 2 sub-box down to Level 3 data card
      newEdges.push({ id: `e-${node.parentId}-${node.id}`, source: node.parentId, target: node.id });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit} // Gives the main page access to the camera instance
        minZoom={0.5}
        maxZoom={4}
      >
        <Background color="#334155" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}