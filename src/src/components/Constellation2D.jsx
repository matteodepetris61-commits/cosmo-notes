import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  forceSimulation, 
  forceManyBody, 
  forceCenter, 
  forceLink, 
  forceCollide,
  forceX,
  forceY
} from 'd3-force';
import { ZoomIn, ZoomOut, Maximize2, Sparkles, Filter } from 'lucide-react';

export default function Constellation2D({ 
  graphData, 
  onSelectNode, 
  selectedTopic, 
  searchQuery,
  activeFilterTopic
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Transform / Camera State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef(null);

  // Background stars particles
  const bgStarsRef = useRef([]);

  // D3 Simulation reference
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);

  // Generate background ambient stars
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 160; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 3000,
        y: (Math.random() - 0.5) * 3000,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }
    bgStarsRef.current = stars;
  }, []);

  // Initialize and update simulation when graphData changes
  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    // Deep clone nodes and links for simulation
    const nodes = graphData.nodes.map(d => ({ ...d }));
    const nodeMap = new Map(nodes.map(d => [d.id, d]));

    const links = (graphData.links || [])
      .map(l => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

    nodesRef.current = nodes;
    linksRef.current = links;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation(nodes)
      .force('charge', forceManyBody().strength(d => d.type === 'topic' ? -400 : -140))
      .force('center', forceCenter(0, 0))
      .force('x', forceX(0).strength(0.04))
      .force('y', forceY(0).strength(0.04))
      .force('collide', forceCollide().radius(d => (d.size || 14) + 12).iterations(2))
      .force('link', forceLink(links).id(d => d.id).distance(d => d.type === 'topic-link' ? 70 : 120).strength(d => d.strength || 0.5))
      .alphaDecay(0.025);

    simulationRef.current = sim;

    return () => sim.stop();
  }, [graphData]);

  // Main Render Loop
  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width = containerRef.current?.clientWidth || window.innerWidth;
      const height = canvas.height = containerRef.current?.clientHeight || window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // Deep space background gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
      bgGrad.addColorStop(0, '#0d1127');
      bgGrad.addColorStop(0.6, '#080b18');
      bgGrad.addColorStop(1, '#04050c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply Camera Transform
      ctx.translate(width / 2 + transformRef.current.x, height / 2 + transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);

      // 1. Draw Ambient Twinkling Background Stars
      const time = Date.now() * 0.001;
      bgStarsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 10) * 0.25 + 0.75;
        ctx.fillStyle = `rgba(224, 231, 255, ${star.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Filter matches helper
      const isNodeMatch = (node) => {
        if (activeFilterTopic && activeFilterTopic !== 'all') {
          if (node.type === 'topic' && node.name !== activeFilterTopic) return false;
          if (node.type === 'note' && node.topic !== activeFilterTopic) return false;
        }
        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (node.name || '').toLowerCase().includes(q);
          const matchSummary = (node.summary || '').toLowerCase().includes(q);
          const matchTags = (node.subtopics || []).some(t => t.toLowerCase().includes(q));
          return matchName || matchSummary || matchTags;
        }
        return true;
      };

      // 2. Draw Constellation Links (Lines between stars)
      links.forEach(link => {
        const src = typeof link.source === 'object' ? link.source : nodes.find(n => n.id === link.source);
        const tgt = typeof link.target === 'object' ? link.target : nodes.find(n => n.id === link.target);
        if (!src || !tgt) return;

        const isHighlighted = isNodeMatch(src) && isNodeMatch(tgt);
        const isHovered = hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id);

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (link.type === 'topic-link') {
          // Main constellation branch
          ctx.strokeStyle = isHovered 
            ? 'rgba(56, 189, 248, 0.85)' 
            : isHighlighted 
              ? 'rgba(56, 189, 248, 0.35)' 
              : 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = isHovered ? 2.5 : isHighlighted ? 1.5 : 0.8;
          ctx.setLineDash([]);
        } else {
          // Semantic cross-connection link
          ctx.strokeStyle = isHovered 
            ? 'rgba(192, 132, 252, 0.9)' 
            : isHighlighted 
              ? 'rgba(192, 132, 252, 0.4)' 
              : 'rgba(192, 132, 252, 0.06)';
          ctx.lineWidth = isHovered ? 2 : 1;
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 3. Draw Nodes (Stars & Topic Nebulae)
      nodes.forEach(node => {
        const isMatch = isNodeMatch(node);
        const isHover = hoveredNode && hoveredNode.id === node.id;
        const baseColor = node.color || '#38bdf8';
        const radius = (node.size || 12) * (isHover ? 1.25 : 1);

        const nodeAlpha = isMatch ? 1 : 0.2;

        if (node.type === 'topic') {
          // Nebula outer glow
          const glowGrad = ctx.createRadialGradient(node.x, node.y, radius * 0.4, node.x, node.y, radius * 2.8);
          glowGrad.addColorStop(0, `${baseColor}${Math.floor(0.4 * nodeAlpha * 255).toString(16).padStart(2, '0')}`);
          glowGrad.addColorStop(0.7, `${baseColor}${Math.floor(0.12 * nodeAlpha * 255).toString(16).padStart(2, '0')}`);
          glowGrad.addColorStop(1, 'transparent');
          
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Topic Core Star
          ctx.fillStyle = isMatch ? baseColor : '#475569';
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Inner brilliant core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Topic Label
          ctx.font = `600 ${Math.max(12, 14 / transformRef.current.k)}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = isMatch ? '#ffffff' : '#64748b';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 4;
          ctx.fillText(node.name, node.x, node.y + radius + 16);
          ctx.shadowBlur = 0;

          // Note count badge
          ctx.font = `500 ${Math.max(10, 11 / transformRef.current.k)}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = isMatch ? 'rgba(56, 189, 248, 0.9)' : '#475569';
          ctx.fillText(`(${node.noteCount} note)`, node.x, node.y + radius + 29);
        } else {
          // Note Star (Satellite)
          // Star Glow
          const starGlow = ctx.createRadialGradient(node.x, node.y, radius * 0.3, node.x, node.y, radius * 2);
          starGlow.addColorStop(0, `${baseColor}${Math.floor(0.5 * nodeAlpha * 255).toString(16).padStart(2, '0')}`);
          starGlow.addColorStop(1, 'transparent');

          ctx.fillStyle = starGlow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
          ctx.fill();

          // Star Body
          ctx.fillStyle = isMatch ? baseColor : '#334155';
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Bright center
          ctx.fillStyle = isMatch ? '#f8fafc' : '#475569';
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Label for note
          if (isHover || transformRef.current.k > 0.85) {
            ctx.font = `500 ${Math.max(10, 11 / transformRef.current.k)}px 'Plus Jakarta Sans', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = isMatch ? '#e2e8f0' : '#475569';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            const truncatedName = node.name.length > 24 ? node.name.slice(0, 22) + '...' : node.name;
            ctx.fillText(`${node.noteType === 'audio' ? '🎤 ' : '✍️ '}${truncatedName}`, node.x, node.y + radius + 12);
            ctx.shadowBlur = 0;
          }
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredNode, searchQuery, activeFilterTopic]);

  // Coordinate Conversion: Screen to World
  const screenToWorld = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const width = canvas.width;
    const height = canvas.height;
    
    const clickX = screenX - rect.left;
    const clickY = screenY - rect.top;

    const x = (clickX - (width / 2 + transformRef.current.x)) / transformRef.current.k;
    const y = (clickY - (height / 2 + transformRef.current.y)) / transformRef.current.k;
    return { x, y };
  }, []);

  // Find node under pointer
  const getNodeAtPosition = useCallback((worldX, worldY) => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const radius = (node.size || 12) + 6;
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      if (dx * dx + dy * dy < radius * radius) {
        return node;
      }
    }
    return null;
  }, []);

  // Mouse / Touch Event Handlers
  const handleMouseDown = (e) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(x, y);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart();
        clickedNode.fx = clickedNode.x;
        clickedNode.fy = clickedNode.y;
      }
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = x;
      draggedNodeRef.current.fy = y;
      return;
    }

    if (isDraggingRef.current) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      transformRef.current = { ...transformRef.current, x: newX, y: newY };
      setTransform(transformRef.current);
      return;
    }

    const nodeUnder = getNodeAtPosition(x, y);
    setHoveredNode(nodeUnder);
  };

  const handleMouseUp = (e) => {
    if (draggedNodeRef.current) {
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(x, y);
    if (clickedNode && onSelectNode) {
      onSelectNode(clickedNode);
    }
  };

  // Zoom with Wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newK = Math.min(Math.max(0.2, transformRef.current.k * zoomFactor), 4);
    transformRef.current = { ...transformRef.current, k: newK };
    setTransform(transformRef.current);
  };

  // Reset Zoom / Center
  const resetView = () => {
    transformRef.current = { x: 0, y: 0, k: 1 };
    setTransform(transformRef.current);
    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart();
    }
  };

  const zoomIn = () => {
    transformRef.current = { ...transformRef.current, k: Math.min(4, transformRef.current.k * 1.25) };
    setTransform(transformRef.current);
  };

  const zoomOut = () => {
    transformRef.current = { ...transformRef.current, k: Math.max(0.2, transformRef.current.k * 0.8) };
    setTransform(transformRef.current);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full block"
      />

      {/* Floating Constellation Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 glass-panel p-1.5 rounded-2xl shadow-xl z-20 border border-slate-700/50">
        <button
          onClick={zoomIn}
          title="Zoom Avanti"
          className="p-2.5 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-cyan-400 transition"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Indietro"
          className="p-2.5 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-cyan-400 transition"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          title="Centra Costellazione"
          className="p-2.5 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-cyan-400 transition border-t border-slate-700/40"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Mini Legend & Active Constellation Info */}
      <div className="absolute top-6 left-6 pointer-events-none z-10 hidden sm:flex items-center gap-4 glass-panel px-4 py-2 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]"></div>
          <span className="text-xs text-slate-300 font-medium">Argomento (Stella Cardine)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]"></div>
          <span className="text-xs text-slate-300 font-medium">Nota / Appunto</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">---</span>
          <span className="text-xs text-slate-400">Collegamento Semantico AI</span>
        </div>
      </div>
    </div>
  );
}
