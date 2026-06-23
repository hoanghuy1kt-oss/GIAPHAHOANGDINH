import React, { useState, useRef, useEffect } from "react";
import { Search, ZoomIn, ZoomOut, Maximize2, Info, Users, Leaf, Download, Upload, User, Heart, Calendar, X } from "lucide-react";
import { calculateTreeLayout } from "../utils/treeLayout";
import { SolarDate, LunarDate } from "lunar-date-vn";

export default function FamilyTree({
  members,
  onSelectMember,
  exportData,
  importData,
  resetToDefault
}) {
  // Navigation State
  const [activeSubView, setActiveSubView] = useState("tree"); // "tree" | "fan" | "timeline" | "anniversary"

  // Mobile sidebar toggle states
  const [isMobileTreeSidebarOpen, setIsMobileTreeSidebarOpen] = useState(false);

  // Touch event states for standard tree view (stored in refs to prevent constant event re-binding)
  const treeTouchStartDistRef = useRef(null);
  const treeTouchStartScaleRef = useRef(1);
  const treeTouchStartPanRef = useRef({ x: 0, y: 0 });
  const isTreeTouchDraggingRef = useRef(false);
  const treeTouchStartPosRef = useRef({ x: 0, y: 0 });

  // Search & Navigation States (for standard tree view)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);

  // Pan & Zoom state (for standard tree view)
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [tooltipDirection, setTooltipDirection] = useState("top");

  const treeStateRef = useRef({ pan: { x: 100, y: 50 }, scale: 1 });
  useEffect(() => {
    treeStateRef.current = { pan, scale };
  }, [pan, scale]);

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Compute Layout coordinates for standard tree view
  const { nodes, links, dimensions } = calculateTreeLayout(members);

  // Stats calculation based on members
  const totalCount = members.length;
  const deceasedCount = members.filter(m => m.isDeceased).length;
  const livingCount = totalCount - deceasedCount;
  const maxGen = members.reduce((max, m) => Math.max(max, m.generation || 1), 1);

  // Handle Search input
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      m => m.name.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, members]);

  // Center view on a specific node
  const centerOnNode = (node) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    const nodeCenterX = node.x + 70; // 140 / 2
    const nodeCenterY = node.y + 92.5; // 185 / 2

    const newScale = 1.0;
    const newPanX = containerW / 2 - nodeCenterX * newScale;
    const newPanY = containerH / 2 - nodeCenterY * newScale;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });

    setHighlightedNodeId(node.id);
    setTimeout(() => {
      setHighlightedNodeId(null);
    }, 2500);
  };

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setHoveredMember(null);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for standard tree view (supports 1-finger panning and 2-finger pinch zoom)
  const handleTreeTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single finger drag
      const touch = e.touches[0];
      isTreeTouchDraggingRef.current = true;
      treeTouchStartPosRef.current = {
        x: touch.clientX - treeStateRef.current.pan.x,
        y: touch.clientY - treeStateRef.current.pan.y
      };
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      isTreeTouchDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      treeTouchStartDistRef.current = dist;
      treeTouchStartScaleRef.current = treeStateRef.current.scale;
      treeTouchStartPanRef.current = { ...treeStateRef.current.pan };
    }
  };

  const handleTreeTouchMove = (e) => {
    if (e.touches.length === 1 && isTreeTouchDraggingRef.current) {
      // Single finger drag panning
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - treeTouchStartPosRef.current.x,
        y: touch.clientY - treeTouchStartPosRef.current.y
      });
    } else if (e.touches.length === 2 && treeTouchStartDistRef.current) {
      // Two finger pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      const rect = canvasRef.current.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
      
      const factor = dist / treeTouchStartDistRef.current;
      const newScale = Math.max(0.15, Math.min(treeTouchStartScaleRef.current * factor, 3));
      
      const svgX = (midX - treeTouchStartPanRef.current.x) / treeTouchStartScaleRef.current;
      const svgY = (midY - treeTouchStartPanRef.current.y) / treeTouchStartScaleRef.current;
      
      const newPanX = midX - newScale * svgX;
      const newPanY = midY - newScale * svgY;
      
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleTreeTouchEnd = () => {
    isTreeTouchDraggingRef.current = false;
    treeTouchStartDistRef.current = null;
  };

  // Zoom handlers
  const handleZoom = (factor) => {
    setScale(s => Math.max(0.15, Math.min(s * factor, 3)));
  };

  // Center view on the tree layout
  const centerTree = () => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    // Find bounding box of all nodes
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + 140)); // NODE_WIDTH is 140
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + 185)); // NODE_HEIGHT is 185

    const treeW = maxX - minX;
    const treeH = maxY - minY;

    // Calculate scale to fit container with some padding
    const scaleX = (containerW - 40) / treeW;
    const scaleY = (containerH - 60) / treeH;
    // We want a reasonable scale between 0.3 and 0.85
    const newScale = Math.max(0.3, Math.min(scaleX, scaleY, 0.85));

    // Calculate pan to center the bounding box
    const newPanX = (containerW - treeW * newScale) / 2 - minX * newScale;
    const newPanY = 40; // Top margin

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const resetView = () => {
    centerTree();
  };

  // Auto center standard tree on load / view change
  useEffect(() => {
    if (activeSubView === "tree") {
      const timer = setTimeout(() => {
        centerTree();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSubView, members]);

  // Scroll wheel zoom handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeSubView !== "tree") return;

    const handleWheel = (e) => {
      e.preventDefault();
      setHoveredMember(null);
      
      const zoomIntensity = 0.04;
      const delta = -e.deltaY;
      const factor = delta > 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const svgX = (mouseX - treeStateRef.current.pan.x) / treeStateRef.current.scale;
      const svgY = (mouseY - treeStateRef.current.pan.y) / treeStateRef.current.scale;
      
      const newScale = Math.max(0.15, Math.min(treeStateRef.current.scale * factor, 3));
      const newPanX = mouseX - newScale * svgX;
      const newPanY = mouseY - newScale * svgY;
      
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [activeSubView]);

  // Bind touch events imperatively to prevent default browser zoom/scroll on mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeSubView !== "tree") return;

    const onTouchStart = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      handleTreeTouchStart(e);
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      handleTreeTouchMove(e);
    };

    const onTouchEnd = (e) => {
      handleTreeTouchEnd(e);
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeSubView]);

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (importData(data)) {
            alert("Nhập dữ liệu thành công!");
          } else {
            alert("Định dạng dữ liệu không hợp lệ.");
          }
        } catch (err) {
          alert("Lỗi đọc tệp JSON.");
        }
      };
      reader.readAsText(file);
    }
  };

  // Divider lines drawing for Fan Chart View
  const drawDividers = (g, R_inner, R_outer, CX, CY) => {
    const numSectors = Math.pow(2, g);
    const divs = [];
    for (let k = 1; k < numSectors; k++) {
      const angle = 180 + k * (180 / numSectors);
      const rad = angle * Math.PI / 180;
      const x1 = CX + R_inner * Math.cos(rad);
      const y1 = CY + R_inner * Math.sin(rad);
      const x2 = CX + R_outer * Math.cos(rad);
      const y2 = CY + R_outer * Math.sin(rad);
      divs.push(
        <line
          key={`div-${g}-${k}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#C5A059" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
        />
      );
    }
    return divs;
  };

  return (
    <div className="w-full h-[calc(100vh-65px)] flex flex-col bg-paper-base font-sans overflow-hidden relative select-none">
      
      {/* ── Sub-Navigation / Toolbar Bar ── */}
      <div className="bg-paper-light border-b border-gold-accent/25 px-3 py-2 md:px-6 md:py-3 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 z-20 shadow-xs shrink-0 select-text">
        {/* Left Side: Simple Title Description */}
        <div className="flex items-center gap-2 hidden md:flex">
          <span className="text-xs font-semibold text-wood-dark uppercase tracking-wider">
            Sơ đồ gia phả dòng họ Hoàng Đình
          </span>
        </div>

        {/* Right Side: Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-paper-base border border-gold-accent/20 p-1 rounded-lg max-w-full overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveSubView("tree")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === "tree"
                ? "bg-wood-dark text-gold-accent shadow-sm"
                : "text-wood-medium hover:bg-gold-accent/5"
            }`}
          >
            🌳 Cây gia phả
          </button>
          <button
            onClick={() => setActiveSubView("fan")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === "fan"
                ? "bg-wood-dark text-gold-accent shadow-sm"
                : "text-wood-medium hover:bg-gold-accent/5"
            }`}
          >
            🪭 Biểu đồ quạt
          </button>
          <button
            onClick={() => setActiveSubView("timeline")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === "timeline"
                ? "bg-wood-dark text-gold-accent shadow-sm"
                : "text-wood-medium hover:bg-gold-accent/5"
            }`}
          >
            📅 Dòng thời gian
          </button>
          <button
            onClick={() => setActiveSubView("anniversary")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === "anniversary"
                ? "bg-wood-dark text-gold-accent shadow-sm"
                : "text-wood-medium hover:bg-gold-accent/5"
            }`}
          >
            🕯️ Ngày giỗ
          </button>
        </div>
      </div>

      {/* ── main views container ── */}
      <div ref={containerRef} className="flex-grow w-full relative overflow-hidden flex">
        
        {/* VIEW 1: Standard Tree View Canvas */}
        {activeSubView === "tree" && (
          <>
            {/* Mobile Search/Stats Toggle Button */}
            <button
              onClick={() => setIsMobileTreeSidebarOpen(!isMobileTreeSidebarOpen)}
              className="md:hidden absolute top-4 left-4 z-25 w-10 h-10 rounded-full bg-wood-dark text-gold-accent border border-gold-accent/40 shadow-lg flex items-center justify-center cursor-pointer hover:bg-wood-medium transition-colors"
              title="Tìm kiếm & Thống kê"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Left Control Panel / Search & Stats */}
            <div className={`absolute top-4 left-4 z-20 w-80 max-h-[90%] bg-paper-light/95 border border-gold-accent/30 rounded-lg shadow-xl p-4 flex flex-col gap-3.5 overflow-y-auto backdrop-blur-xs select-text transition-all duration-300 ${
              isMobileTreeSidebarOpen ? "translate-x-0 opacity-100" : "max-md:-translate-x-[340px] max-md:opacity-0 max-md:pointer-events-none md:translate-x-0"
            }`}>
              
              {/* Search Section Header (includes close button on mobile) */}
              <div className="flex items-center justify-between border-b border-gold-accent/10 pb-2 md:border-none md:pb-0">
                <h3 className="text-xs font-bold text-wood-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-gold-accent" /> Tìm kiếm thành viên
                </h3>
                <button
                  onClick={() => setIsMobileTreeSidebarOpen(false)}
                  className="md:hidden p-1 text-charcoal/50 hover:text-wood-dark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tên thành viên..."
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-1.5 pl-8 text-xs focus:outline-none focus:border-gold-accent transition-colors"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-charcoal/40" />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-paper-light border border-gold-accent/20 rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-gold-accent/10">
                    {searchResults.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          const layNode = nodes.find(n => n.id === m.id);
                          if (layNode) centerOnNode(layNode);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gold-accent/10 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-wood-medium">{m.name}</span>
                          <span className="text-[10px] text-charcoal/50 block">Đời {m.generation} ({m.gender})</span>
                        </div>
                        {m.isDeceased && <Leaf className="w-3.5 h-3.5 text-gold-accent shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 w-full bg-paper-light border border-gold-accent/20 rounded-md mt-1 p-3 text-center text-xs text-charcoal/40 z-30">
                    Không tìm thấy thành viên phù hợp
                  </div>
                )}
              </div>

              {/* Stats Section */}
              <div className="border-t border-gold-accent/20 pt-3">
                <h3 className="text-xs font-bold text-wood-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gold-accent" /> Thống kê gia tộc
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-paper-base border border-gold-accent/10 p-2 rounded">
                    <span className="text-charcoal/50 block text-[10px]">Tổng đinh khẩu</span>
                    <span className="font-semibold text-sm text-wood-medium">{totalCount} người</span>
                  </div>
                  <div className="bg-paper-base border border-gold-accent/10 p-2 rounded">
                    <span className="text-charcoal/50 block text-[10px]">Đời phát triển</span>
                    <span className="font-semibold text-sm text-wood-medium">{maxGen} thế hệ</span>
                  </div>
                  <div className="bg-paper-base border border-gold-accent/10 p-2 rounded">
                    <span className="text-charcoal/50 block text-[10px]">Con cháu còn sống</span>
                    <span className="font-semibold text-sm text-green-700">{livingCount} người</span>
                  </div>
                  <div className="bg-paper-base border border-gold-accent/10 p-2 rounded">
                    <span className="text-charcoal/50 block text-[10px]">Tiên tổ đã khuất</span>
                    <span className="font-semibold text-sm text-gold-accent">{deceasedCount} người</span>
                  </div>
                </div>
              </div>

              {/* Legend Section */}
              <div className="border-t border-gold-accent/20 pt-3">
                <h3 className="text-xs font-bold text-wood-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-gold-accent" /> Ký hiệu &amp; Chỉ dẫn
                </h3>
                <div className="space-y-1.5 text-xs text-charcoal/80">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-gold-accent bg-paper-light rounded-sm"></div>
                    <span>Thành viên còn sống</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-wood-dark border border-gold-accent rounded-sm flex items-center justify-center">
                      <Leaf className="w-2 h-2 text-gold-accent" />
                    </div>
                    <span>Tiên tổ đã khuất</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-gold-accent"></div>
                    <span>Liên kết Hôn nhân (Vợ - Chồng)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-wood-medium"></div>
                    <span>Liên kết Trực hệ (Cha mẹ - Con)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Floating Canvas Control Buttons */}
            <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-paper-light/95 border border-gold-accent/30 p-1.5 rounded-lg shadow-lg backdrop-blur-xs">
              <button
                onClick={() => handleZoom(1.2)}
                className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(0.8)}
                className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
                title="Căn giữa sơ đồ"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* SVG Drawing Canvas Area */}
            <div
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(#e5dec9_1px,transparent_1.5px)] [background-size:20px_20px]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ touchAction: "none" }}
            >
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                {/* Master transformation group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                  
                  {/* 1. Draw Links / Connecting Paths */}
                  {links.map((link, idx) => {
                    if (link.type === "spouse") {
                      return (
                        <line
                          key={`spouse-${idx}`}
                          x1={link.from.x}
                          y1={link.from.y}
                          x2={link.to.x}
                          y2={link.to.y}
                          stroke="#C5A059"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />
                      );
                    } else if (link.type === "connector-bar") {
                      return (
                        <line
                          key={`conn-${idx}`}
                          x1={link.from.x}
                          y1={link.from.y}
                          x2={link.to.x}
                          y2={link.to.y}
                          stroke="#4A2C2A"
                          strokeWidth="2"
                        />
                      );
                    } else {
                      return (
                        <line
                          key={`stem-${idx}`}
                          x1={link.from.x}
                          y1={link.from.y}
                          x2={link.to.x}
                          y2={link.to.y}
                          stroke="#4A2C2A"
                          strokeWidth="2"
                        />
                      );
                    }
                  })}

                  {/* 2. Draw Nodes / Member Cards */}
                  {nodes.map((node) => {
                    const isSelected = highlightedNodeId === node.id;
                    const isMale = node.gender === "Nam";

                    return (
                      <foreignObject
                        key={node.id}
                        x={node.x}
                        y={node.y}
                        width="140"
                        height="185"
                        className="overflow-visible"
                      >
                        <div
                          onClick={() => onSelectMember(node)}
                          onMouseEnter={(e) => {
                            if (window.innerWidth <= 768) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceAbove = rect.top;
                            const showBelow = spaceAbove < 240;
                            setTooltipDirection(showBelow ? "bottom" : "top");
                            setHoverPosition({
                              x: rect.left + rect.width / 2,
                              y: showBelow ? rect.bottom + 10 : rect.top - 10
                            });
                            setHoveredMember(node);
                          }}
                          onMouseLeave={() => setHoveredMember(null)}
                          className={`w-[140px] h-[185px] rounded-lg border-2 p-[4px] flex flex-col justify-between cursor-pointer select-none transition-all duration-300 bg-[#FAF7F0] ${
                            isSelected
                              ? "border-gold-accent ring-4 ring-gold-accent/30 scale-105 shadow-xl animate-bounce"
                              : node.isDeceased
                              ? "border-gold-accent hover:border-gold-light hover:shadow-gold-accent/20 hover:scale-105"
                              : "border-wood-medium/40 hover:border-gold-accent hover:shadow-md hover:scale-105"
                          } shadow-sm`}
                        >
                          {/* Image Section (Top) */}
                          <div className="w-full h-[110px] rounded-md overflow-hidden bg-paper-light border border-gold-accent/15 relative shrink-0">
                            {node.avatar ? (
                              <img src={node.avatar} alt={node.name} className="w-full h-full object-cover" style={{ objectPosition: `center ${node.avatarY ?? 0}%` }} />
                            ) : (
                              <div className={`w-full h-full flex flex-col items-center justify-center ${node.isDeceased ? 'bg-wood-medium/10' : 'bg-paper-base'}`}>
                                <User className={`w-10 h-10 ${node.isDeceased ? 'text-gold-accent/40' : 'text-charcoal/20'}`} />
                              </div>
                            )}
                            
                            {node.isDeceased && (
                              <span className="absolute top-1.5 right-1.5 bg-wood-dark/85 text-gold-accent px-1 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5">
                                🕯️
                              </span>
                            )}
                          </div>

                          {/* Info Section (Bottom) */}
                          <div
                            className={`w-full h-[63px] rounded-md flex flex-col justify-center items-center text-center p-1 ${
                              node.isDeceased
                                ? "bg-wood-dark text-gold-accent"
                                : "bg-wood-medium text-paper-base"
                            }`}
                          >
                            {/* Name */}
                            <div
                              className="font-display text-[10.5px] font-bold leading-tight truncate w-full px-0.5"
                              title={node.name}
                            >
                              {node.name}
                            </div>

                            {/* Subtitle */}
                            <div className="text-[7.5px] font-semibold uppercase tracking-wider mt-0.5 opacity-80 leading-none">
                              {node.generation === 1
                                ? (node.gender === "Nam" ? "Thủy Tổ" : "Thủy Tổ Mẫu")
                                : `Đời ${node.generation} - ${node.gender}`}
                            </div>

                            {/* Lifespan */}
                            <div className="text-[7.5px] opacity-60 mt-0.5 leading-none">
                              {node.birthDate || "???"} - {node.isDeceased ? `${node.deathDate || "???"} (Âm)` : "Nay"}
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                    );
                  })}
                </g>
              </svg>
            </div>
          </>
        )}

        {/* VIEW 2: Fan Chart View Component */}
        {activeSubView === "fan" && (
          <FanChartComponent
            members={members}
            onSelectMember={onSelectMember}
            drawDividers={drawDividers}
          />
        )}

        {/* VIEW 3: Timeline Lifespan View Component */}
        {activeSubView === "timeline" && (
          <TimelineComponent
            members={members}
            onSelectMember={onSelectMember}
          />
        )}

        {/* VIEW 4: Anniversary calendar View Component */}
        {activeSubView === "anniversary" && (
          <AnniversaryCalendarComponent
            members={members}
            onSelectMember={onSelectMember}
          />
        )}

      </div>

      {/* Hover Popup Tooltip for Desktop */}
      {hoveredMember && (
        <div 
          className={`fixed z-50 pointer-events-none transform -translate-x-1/2 flex flex-col items-center animate-fade-in ${
            tooltipDirection === "top" ? "-translate-y-full" : "translate-y-0"
          }`}
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
          }}
        >
          {/* Upward arrow if tooltip is displayed below */}
          {tooltipDirection === "bottom" && (
            <div className="w-3 h-3 bg-wood-dark border-l-2 border-t-2 border-gold-accent rotate-45 -mb-1.5 shadow-md z-10"></div>
          )}

          <div className="bg-[#FAF7F0] border-2 border-gold-accent rounded-xl shadow-2xl p-4 w-72 flex flex-col gap-3 text-sans relative overflow-hidden select-none border-t-4 border-t-wood-dark">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-gold-accent/40"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gold-accent/40"></div>

            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gold-accent/30 bg-paper-light shrink-0">
                {hoveredMember.avatar ? (
                  <img src={hoveredMember.avatar} alt={hoveredMember.name} className="w-full h-full object-cover" style={{ objectPosition: `center ${hoveredMember.avatarY ?? 0}%` }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-wood-medium/5">
                    <User className="w-8 h-8 text-gold-accent/40" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow flex flex-col justify-center min-w-0">
                <h4 className="font-display font-bold text-sm text-wood-dark leading-snug truncate">{hoveredMember.name}</h4>
                <p className="text-[10px] text-gold-accent font-semibold uppercase mt-0.5">
                  {hoveredMember.generation === 1
                    ? (hoveredMember.gender === "Nam" ? "Thủy Tổ" : "Thủy Tổ Mẫu")
                    : `Thế hệ thứ ${hoveredMember.generation}`}
                </p>
                <p className="text-[10px] text-charcoal/60 mt-0.5 font-medium">
                  Giới tính: {hoveredMember.gender}
                </p>
                <p className="text-[10px] font-semibold text-wood-medium mt-0.5">
                  {hoveredMember.birthDate || "???"} - {hoveredMember.isDeceased ? `${hoveredMember.deathDate || "???"} (Âm lịch)` : "Nay"}
                </p>
              </div>
            </div>

            <div className="border-t border-gold-accent/10 pt-2 text-[10px] text-charcoal/80 space-y-1">
              {hoveredMember.birthPlace && (
                <p className="break-words">
                  <span className="font-bold text-wood-medium">Quê quán:</span> {hoveredMember.birthPlace}
                </p>
              )}
              {hoveredMember.isDeceased ? (
                hoveredMember.burialPlace && (
                  <p className="break-words">
                    <span className="font-bold text-wood-medium">Mộ phần:</span> {hoveredMember.burialPlace}
                  </p>
                )
              ) : (
                hoveredMember.livingPlace && (
                  <p className="break-words">
                    <span className="font-bold text-wood-medium">Nơi sống:</span> {hoveredMember.livingPlace}
                  </p>
                )
              )}
              {hoveredMember.biography && (
                <p className="line-clamp-2 text-charcoal/70 italic mt-1 border-l-2 border-gold-accent/30 pl-1.5 leading-relaxed">
                  "{hoveredMember.biography}"
                </p>
              )}
            </div>
          </div>

          {/* Downward arrow if tooltip is displayed above */}
          {tooltipDirection === "top" && (
            <div className="w-3 h-3 bg-[#FAF7F0] border-r-2 border-b-2 border-gold-accent rotate-45 -mt-1.5 shadow-md"></div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: FAN CHART ──────────────────────────────────────────────────
function FanChartComponent({ members, onSelectMember, drawDividers }) {
  const [rootId, setRootId] = useState("");
  const [depth, setDepth] = useState(4); // 2 | 3 | 4
  const [search, setSearch] = useState("");

  // Mobile sidebar toggle state
  const [isMobileFanSidebarOpen, setIsMobileFanSidebarOpen] = useState(false);

  // Touch event states for Fan Chart (stored in refs to prevent constant event re-binding)
  const fanTouchStartDistRef = useRef(null);
  const fanTouchStartScaleRef = useRef(1);
  const fanTouchStartPanRef = useRef({ x: 0, y: 0 });
  const isFanTouchDraggingRef = useRef(false);
  const fanTouchStartPosRef = useRef({ x: 0, y: 0 });

  // Pan & Zoom state for Fan Chart SVG
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const fanStateRef = useRef({ pan, scale });
  useEffect(() => {
    fanStateRef.current = { pan, scale };
  }, [pan, scale]);

  const filteredList = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeRoot = members.find(m => m.id === parseInt(rootId)) || members[0];

  useEffect(() => {
    if (members.length > 0 && (!rootId || !members.some(m => m.id === parseInt(rootId)))) {
      setRootId(members[0].id.toString());
    }
  }, [members]);

  // Center the fan on load / change of root
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - 400,
        y: rect.height / 2 - 230
      });
      setScale(1.0);
    }
  }, [activeRoot, depth]);

  const findMember = (id) => members.find(m => m.id === id);

  // Build 15 ancestor slots (binary array)
  const ancestors = Array(15).fill(null);
  if (activeRoot) {
    ancestors[0] = activeRoot;
    for (let i = 0; i < 7; i++) {
      const current = ancestors[i];
      if (current) {
        // Mother's side (maternal) on the left (index 2*i + 1), Father's side (paternal) on the right (index 2*i + 2)
        ancestors[2 * i + 1] = current.motherId ? findMember(current.motherId) : null;
        ancestors[2 * i + 2] = current.fatherId ? findMember(current.fatherId) : null;
      }
    }
  }

  // Radiuses for Gen 0, 1, 2, 3
  const R = [0, 110, 220, 330];
  const CX = 400;
  const CY = 415;

  // Zoom handlers
  const handleZoom = (factor) => {
    setScale(s => Math.max(0.4, Math.min(s * factor, 3)));
  };

  const resetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - 400,
        y: rect.height / 2 - 230
      });
      setScale(1);
    }
  };

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for Fan Chart (1-finger pan, 2-finger pinch zoom)
  const handleFanTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      isFanTouchDraggingRef.current = true;
      fanTouchStartPosRef.current = {
        x: touch.clientX - fanStateRef.current.pan.x,
        y: touch.clientY - fanStateRef.current.pan.y
      };
    } else if (e.touches.length === 2) {
      isFanTouchDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      fanTouchStartDistRef.current = dist;
      fanTouchStartScaleRef.current = fanStateRef.current.scale;
      fanTouchStartPanRef.current = { ...fanStateRef.current.pan };
    }
  };

  const handleFanTouchMove = (e) => {
    if (e.touches.length === 1 && isFanTouchDraggingRef.current) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - fanTouchStartPosRef.current.x,
        y: touch.clientY - fanTouchStartPosRef.current.y
      });
    } else if (e.touches.length === 2 && fanTouchStartDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      const rect = canvasRef.current.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
      
      const factor = dist / fanTouchStartDistRef.current;
      const newScale = Math.max(0.4, Math.min(fanTouchStartScaleRef.current * factor, 3));
      
      const svgX = (midX - fanTouchStartPanRef.current.x) / fanTouchStartScaleRef.current;
      const svgY = (midY - fanTouchStartPanRef.current.y) / fanTouchStartScaleRef.current;
      
      const newPanX = midX - newScale * svgX;
      const newPanY = midY - newScale * svgY;
      
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleFanTouchEnd = () => {
    isFanTouchDraggingRef.current = false;
    fanTouchStartDistRef.current = null;
  };

  // Scroll wheel zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomIntensity = 0.04;
      const delta = -e.deltaY;
      const factor = delta > 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const svgX = (mouseX - fanStateRef.current.pan.x) / fanStateRef.current.scale;
      const svgY = (mouseY - fanStateRef.current.pan.y) / fanStateRef.current.scale;
      
      const newScale = Math.max(0.4, Math.min(fanStateRef.current.scale * factor, 3));
      const newPanX = mouseX - newScale * svgX;
      const newPanY = mouseY - newScale * svgY;
      
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Bind touch events imperatively to prevent default browser zoom/scroll in Fan Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      handleFanTouchStart(e);
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      handleFanTouchMove(e);
    };

    const onTouchEnd = (e) => {
      handleFanTouchEnd(e);
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div className="flex-grow w-full h-full flex flex-col md:flex-row bg-paper-base select-text overflow-hidden relative">
      {/* Mobile Search/Root Toggle Button */}
      <button
        onClick={() => setIsMobileFanSidebarOpen(!isMobileFanSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-wood-dark text-gold-accent border border-gold-accent/40 shadow-lg flex items-center justify-center cursor-pointer hover:bg-wood-medium transition-colors"
        title="Tìm tâm biểu đồ"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Left Sidebar - Search and Select Root Member */}
      <div className={`w-full md:w-72 border-r border-gold-accent/20 bg-paper-light flex flex-col h-full shrink-0 z-10 transition-all duration-300 ${
        isMobileFanSidebarOpen ? "translate-x-0 opacity-100" : "max-md:-translate-x-[300px] max-md:opacity-0 max-md:absolute max-md:top-0 max-md:left-0 max-md:w-72 max-md:h-full md:translate-x-0"
      }`}>
        <div className="p-4 border-b border-gold-accent/15 flex items-center justify-between">
          <label className="text-xs font-bold text-wood-dark uppercase tracking-wider block">Tìm tâm biểu đồ</label>
          <button
            onClick={() => setIsMobileFanSidebarOpen(false)}
            className="md:hidden p-1 text-charcoal/50 hover:text-wood-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-b border-gold-accent/15">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nhập tên..."
              className="w-full text-xs bg-paper-base border border-gold-accent/25 rounded px-2.5 py-1.5 focus:outline-none focus:border-gold-accent"
            />
            <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-charcoal/30" />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto divide-y divide-gold-accent/10">
          {filteredList.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setRootId(m.id.toString());
                setIsMobileFanSidebarOpen(false); // Close sidebar after selecting root on mobile
              }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                activeRoot?.id === m.id ? "bg-gold-accent/10 font-bold" : "hover:bg-gold-accent/5"
              }`}
            >
              <div>
                <p className="text-wood-medium">{m.name}</p>
                <p className="text-[10px] text-charcoal/50">Đời {m.generation} · {m.gender}</p>
              </div>
              {m.isDeceased && <span className="text-[9px]">🕯️</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Right Canvas */}
      <div ref={containerRef} className="flex-grow flex flex-col h-full bg-paper-base overflow-hidden relative">
        {/* Controls */}
        <div className="p-4 border-b border-gold-accent/15 flex flex-wrap items-center justify-between gap-4 bg-paper-light/50 shrink-0 z-10">
          <div>
            <span className="text-xs font-semibold text-charcoal/50">Gốc phả hệ (Bạn): </span>
            <span className="text-sm font-bold text-wood-dark">{activeRoot?.name || "Chưa chọn"}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-charcoal/50">Số thế hệ hiển thị:</span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setDepth(num)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all border ${
                    depth === num 
                      ? "bg-wood-dark text-gold-accent border-gold-accent" 
                      : "bg-paper-base text-wood-medium border-gold-accent/30 hover:bg-gold-accent/5 cursor-pointer"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Zoom & Pan Controls */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-paper-light/95 border border-gold-accent/30 p-1.5 rounded-lg shadow-lg backdrop-blur-xs">
          <button
            onClick={() => handleZoom(1.2)}
            className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded bg-paper-base hover:bg-gold-accent hover:text-wood-dark text-wood-medium transition-colors cursor-pointer"
            title="Căn giữa"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Drawing Canvas Area with Drag and Zoom */}
        <div
          ref={canvasRef}
          className="flex-grow w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(#e5dec9_1px,transparent_1.5px)] [background-size:20px_20px] relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ touchAction: "none" }}
        >
          <svg className="w-full h-full">
            {/* Master transformation group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
              {/* Background Arcs */}
              {depth >= 2 && (
                <path
                  d={`M ${CX - R[1]} ${CY} A ${R[1]} ${R[1]} 0 0 1 ${CX + R[1]} ${CY}`}
                  fill="none" stroke="#C5A059" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
                />
              )}
              {depth >= 3 && (
                <path
                  d={`M ${CX - R[2]} ${CY} A ${R[2]} ${R[2]} 0 0 1 ${CX + R[2]} ${CY}`}
                  fill="none" stroke="#C5A059" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
                />
              )}
              {depth >= 4 && (
                <path
                  d={`M ${CX - R[3]} ${CY} A ${R[3]} ${R[3]} 0 0 1 ${CX + R[3]} ${CY}`}
                  fill="none" stroke="#C5A059" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
                />
              )}

              {/* Dividers */}
              {depth >= 2 && drawDividers(1, R[0], R[1], CX, CY)}
              {depth >= 3 && drawDividers(2, R[1], R[2], CX, CY)}
              {depth >= 4 && drawDividers(3, R[2], R[3], CX, CY)}

              {/* Bottom flat baseline */}
              <line
                x1={CX - R[Math.min(depth - 1, 3)] - 20} y1={CY}
                x2={CX + R[Math.min(depth - 1, 3)] + 20} y2={CY}
                stroke="#4A2C2A" strokeWidth="1.5"
              />

              {/* Labels at the bottom baseline (Precisely centered) */}
              {/* Left Side: Maternal (Bên Ngoại) */}
              {depth >= 2 && <text x={CX - 75} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Mẹ (Họ Ngoại)</text>}
              {depth >= 3 && <text x={CX - 175} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Ông / Bà Ngoại</text>}
              {depth >= 4 && <text x={CX - 280} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Cụ Bên Ngoại</text>}

              {/* Right Side: Paternal (Bên Nội) */}
              {depth >= 2 && <text x={CX + 75} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Cha (Họ Nội)</text>}
              {depth >= 3 && <text x={CX + 175} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Ông / Bà Nội</text>}
              {depth >= 4 && <text x={CX + 280} y={CY + 30} className="text-[9px] font-bold text-charcoal/40" textAnchor="middle">Cụ Bên Nội</text>}

              {/* Draw nodes */}
              {ancestors.map((m, idx) => {
                // Determine generation of this slot
                let g = 0;
                let j = 0;
                if (idx === 0) { g = 0; j = 0; }
                else if (idx >= 1 && idx <= 2) { g = 1; j = idx - 1; }
                else if (idx >= 3 && idx <= 6) { g = 2; j = idx - 3; }
                else if (idx >= 7 && idx <= 14) { g = 3; j = idx - 7; }

                // Only draw if generation is within depth limit
                if (g >= depth) return null;

                // Calculate angle and position
                const numSectors = Math.pow(2, g);
                const angleSpan = 180 / numSectors;
                const angle = 180 + (j + 0.5) * angleSpan;
                const rad = angle * Math.PI / 180;
                const x = CX + R[g] * Math.cos(rad);
                const y = CY + R[g] * Math.sin(rad);

                const width = g === 0 ? 120 : 105;
                const height = g === 0 ? 45 : 38;
                const fx = x - width / 2;
                const fy = y - height / 2;

                return (
                  <g key={`fan-node-${idx}`}>
                    {/* Dotted pointer linking to center parent */}
                    {g > 0 && (
                      <line
                        x1={x} y1={y}
                        x2={CX + R[g-1] * Math.cos(rad)} y2={CY + R[g-1] * Math.sin(rad)}
                        stroke="#C5A059" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"
                      />
                    )}
                    
                    <foreignObject
                      x={fx} y={fy} width={width} height={height}
                      className="overflow-visible"
                    >
                      <div
                        onClick={() => m && onSelectMember(m)}
                        className={`w-full h-full rounded border flex flex-col justify-center items-center px-1 py-0.5 text-center cursor-pointer select-none transition-all duration-300 ${
                          m 
                            ? m.isDeceased 
                              ? "bg-wood-dark border-gold-accent text-paper-base hover:scale-105 hover:shadow-md" 
                              : "bg-paper-light border-gold-accent/40 text-charcoal hover:scale-105 hover:shadow-md hover:border-gold-accent"
                            : "bg-paper-base/30 border-dashed border-charcoal/20 text-charcoal/30 cursor-default"
                        }`}
                      >
                        {m ? (
                          <>
                            <span className="text-[8.5px] font-bold leading-tight w-full px-0.5 break-words line-clamp-2">{m.name}</span>
                            <span className={`text-[7.2px] leading-none mt-0.5 ${m.isDeceased ? "text-paper-dark/75" : "text-charcoal/50"}`}>
                              {m.birthDate || "???"} - {m.isDeceased ? `${m.deathDate || "???"} (Âm)` : "Nay"}
                            </span>
                          </>
                        ) : (
                          <span className="text-[7.5px] font-semibold italic">Chưa rõ</span>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: TIMELINE ───────────────────────────────────────────────────
function TimelineComponent({ members, onSelectMember }) {
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("all"); // "all" | "alive" | "deceased"
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const validMembers = members.filter(m => {
    if (!m.birthDate) return false;
    const year = parseInt(m.birthDate.match(/\d{4}/)?.[0] || m.birthDate);
    return !isNaN(year);
  });

  const getBirthYear = (m) => {
    return parseInt(m.birthDate.match(/\d{4}/)?.[0] || m.birthDate);
  };

  const getDeathYear = (m) => {
    if (!m.isDeceased) return new Date().getFullYear();
    if (!m.deathDate) return getBirthYear(m) + 65; 
    const year = parseInt(m.deathDate.match(/\d{4}/)?.[0] || m.deathDate);
    return isNaN(year) ? getBirthYear(m) + 65 : year;
  };

  const sortedMembers = [...validMembers].sort((a, b) => getBirthYear(a) - getBirthYear(b));

  // Filter members based on search query and color selection
  const filteredSortedMembers = sortedMembers.filter(m => {
    const nameMatch = m.name.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;

    if (colorFilter === "deceased") return m.isDeceased;
    if (colorFilter === "alive") return !m.isDeceased;

    return true;
  });

  if (sortedMembers.length === 0) {
    return (
      <div className="flex-grow w-full flex items-center justify-center p-8 text-charcoal/40 italic">
        Không có dữ liệu năm sinh để hiển thị dòng thời gian.
      </div>
    );
  }

  // Use full validMembers list for time scale calculations so that the ruler remains stable
  const birthYears = sortedMembers.map(m => getBirthYear(m));
  const minBirth = Math.min(...birthYears);
  const startTimeline = minBirth - 5;
  const currentYear = new Date().getFullYear();
  const endTimeline = currentYear + 5;
  const yearSpan = endTimeline - startTimeline;

  // grid interval years (dynamic 50-year step on mobile to prevent year overlap)
  const gridYears = [];
  const startStep = Math.ceil(startTimeline / 10) * 10;
  const step = isMobile ? 50 : 25;
  for (let y = startStep; y <= endTimeline; y += step) {
    gridYears.push(y);
  }

  return (
    <div className="flex-grow w-full flex flex-col bg-paper-light p-3 md:p-6 select-text overflow-hidden h-full">
      <div className="mb-3 md:mb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
        <div>
          <h3 className="font-display font-semibold text-wood-dark text-sm md:text-base flex items-center gap-2">
            <span className="w-1 h-4 md:h-5 bg-gold-accent rounded-full inline-block"></span>
            Dòng thời gian &amp; Tuổi thọ
          </h3>
          <p className="text-xs text-charcoal/60 leading-relaxed mt-1 hidden md:block">
            Biểu đồ thể hiện tuổi thọ và dòng thời gian sinh sống của con cháu dòng tộc theo trật tự thời gian.
          </p>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs text-charcoal/80 md:bg-paper-base/50 p-1 md:p-2 md:py-1.5 md:px-3 md:rounded-lg md:border md:border-gold-accent/15 w-fit">
          <span className="font-semibold text-wood-medium">Chú thích:</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2.5 md:w-4 md:h-3 rounded bg-gradient-to-r from-blue-500/90 to-blue-600/95 border border-blue-600/20"></div>
            <span>Nam (Sống)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2.5 md:w-4 md:h-3 rounded bg-gradient-to-r from-rose-500/90 to-rose-600/95 border border-rose-600/20"></div>
            <span>Nữ (Sống)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2.5 md:w-4 md:h-3 rounded bg-gradient-to-r from-stone-500/80 to-stone-600/90 border border-stone-600/35"></div>
            <span className="flex items-center gap-0.5">Đã mất (🕯️)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 md:p-3 border border-gold-accent/15 rounded-lg md:rounded-xl bg-paper-base mb-3 md:mb-4 shrink-0 select-text">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-full text-xs bg-paper-light border border-gold-accent/25 rounded-md md:rounded-lg pl-8 pr-3 py-1 md:py-1.5 focus:outline-none focus:border-gold-accent transition-colors"
          />
          <Search className="absolute left-2.5 top-2 md:top-2.5 w-3.5 h-3.5 text-charcoal/40" />
        </div>

        {/* Color Filters */}
        <div className="flex items-center gap-2 justify-between sm:justify-start">
          <span className="text-[10px] md:text-xs font-semibold text-charcoal/50 shrink-0">Lọc nhanh:</span>
          <div className="flex items-center gap-1 bg-paper-light p-0.5 md:p-1 rounded-md md:rounded-lg border border-gold-accent/15">
            <button
              onClick={() => setColorFilter("all")}
              className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-xs font-semibold transition-all ${
                colorFilter === "all"
                  ? "bg-wood-dark text-gold-accent shadow-xs"
                  : "text-wood-medium hover:bg-gold-accent/5 cursor-pointer"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setColorFilter("alive")}
              className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 md:gap-1.5 ${
                colorFilter === "alive"
                  ? "bg-green-700 text-white shadow-xs"
                  : "text-wood-medium hover:bg-gold-accent/5 cursor-pointer"
              }`}
            >
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded bg-green-500"></div> Còn sống
            </button>
            <button
              onClick={() => setColorFilter("deceased")}
              className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-xs font-semibold transition-all flex items-center gap-1 md:gap-1.5 ${
                colorFilter === "deceased"
                  ? "bg-stone-600 text-white shadow-xs"
                  : "text-wood-medium hover:bg-gold-accent/5 cursor-pointer"
              }`}
            >
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded bg-stone-400"></div> Đã khuất
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow border border-gold-accent/15 rounded-lg bg-paper-base flex flex-col overflow-hidden relative [--name-col-width:112px] md:[--name-col-width:192px]">
        {filteredSortedMembers.length === 0 ? (
          <div className="flex-grow w-full flex items-center justify-center p-8 text-charcoal/40 italic">
            Không tìm thấy thành viên nào khớp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto overflow-x-hidden relative">
            
            {/* Header timeline scale grid */}
            <div className="flex w-full border-b border-gold-accent/20 px-4 pt-4 pb-2.5 sticky top-0 bg-paper-base z-10">
              <div className="w-[var(--name-col-width)] shrink-0 font-bold text-xs text-wood-medium uppercase tracking-wider pl-2">Thành viên</div>
              <div className="flex-grow h-6 relative text-[10px] text-charcoal/45 font-semibold">
                {gridYears.map(year => {
                  const leftPct = ((year - startTimeline) / yearSpan) * 100;
                  return (
                    <div key={year} style={{ left: `${leftPct}%` }} className="absolute -translate-x-1/2 flex flex-col items-center">
                      <span>{year}</span>
                      <div className="w-[1px] h-[3000px] border-l border-dashed border-gold-accent/10 absolute top-4"></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List items */}
            <div className="space-y-3 relative px-4 pb-4 pr-6 mt-3">
              {/* Current timeline vertical line */}
              <div
                style={{ left: `calc(var(--name-col-width) + ${((currentYear - startTimeline) / yearSpan) * 100}%)` }}
                className="absolute top-0 bottom-0 w-[1px] border-l-2 border-dotted border-red-500/60 z-20 pointer-events-none"
              >
                <div className="absolute top-1 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded shadow-xs font-semibold">Hiện tại</div>
              </div>

              {filteredSortedMembers.map(m => {
                const birth = getBirthYear(m);
                const death = getDeathYear(m);
                const age = death - birth;
                
                const left = ((birth - startTimeline) / yearSpan) * 100;
                const width = ((death - birth) / yearSpan) * 100;

                return (
                  <div key={m.id} className="flex items-center hover:bg-gold-accent/5 py-1.5 rounded transition-all">
                    {/* Left member detail name */}
                    <div className="w-[var(--name-col-width)] shrink-0 pl-2 pr-2 md:pr-4 truncate">
                      <button
                        onClick={() => onSelectMember(m)}
                        className="text-left font-semibold text-wood-dark hover:text-gold-accent text-xs block truncate"
                      >
                        {m.name}
                      </button>
                      <span className="text-[9px] text-charcoal/40 block leading-tight">
                        Đời {m.generation} · {m.gender}
                      </span>
                    </div>

                    {/* Right bar representation */}
                    <div className="flex-grow h-7 rounded relative bg-gold-accent/5 border border-gold-accent/10">
                      <div
                        onClick={() => onSelectMember(m)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className={`absolute top-1 h-5 rounded-md cursor-pointer hover:scale-x-[1.01] hover:brightness-95 transition-all flex items-center justify-between px-2.5 text-[8.5px] font-bold text-white shadow-2xs ${
                          m.isDeceased
                            ? "bg-gradient-to-r from-stone-500/80 to-stone-600/90 border border-stone-600/35 text-stone-200"
                            : m.gender === "Nam"
                            ? "bg-gradient-to-r from-blue-500/90 to-blue-600/95"
                            : "bg-gradient-to-r from-rose-500/90 to-rose-600/95"
                        }`}
                        title={`${m.name} (${birth} - ${m.isDeceased ? death : "Nay"}, ${age} tuổi)`}
                      >
                        <span className="truncate mr-1 flex items-center gap-1">
                          {m.isDeceased && <span>🕯️</span>}
                          {birth} - {m.isDeceased ? death : "Nay"}
                        </span>
                        <span className="shrink-0">{age}t</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: ANNIVERSARY CALENDAR ──────────────────────────────────────
function AnniversaryCalendarComponent({ members, onSelectMember }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileTab, setMobileTab] = useState("list"); // "list" | "calendar"
  const [selectedDayData, setSelectedDayData] = useState(null); // { day, month, anniversaries: [...] }
  
  const currentMonth = currentDate.getMonth(); 
  const currentYear = currentDate.getFullYear();

  const getAnniversaryDate = (m) => {
    if (!m.isDeceased) return null;
    
    // Parse deathDate (formats DD/MM/YYYY, DD-MM-YYYY, etc.)
    const dateParts = m.deathDate ? m.deathDate.split(/[\/\-]/) : [];
    if (dateParts.length >= 2) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return { day, month };
      }
    }
    return null;
  };

  const individualEvents = members.filter(m => m.isDeceased).map(m => {
    const annDate = getAnniversaryDate(m);
    if (!annDate) return null;
    return {
      id: `indiv-${m.id}`,
      name: m.name,
      annDate,
      generation: m.generation,
      gender: m.gender,
      deathDate: m.deathDate,
      deathPlace: m.deathPlace,
      birthDate: m.birthDate,
      isHopKy: false,
      member: m
    };
  }).filter(Boolean);

  const hopKyMembers = members.filter(m => m.isDeceased && getAnniversaryDate(m) === null);

  const hopKyEvent = hopKyMembers.length > 0 ? [{
    id: "hopky",
    name: "Giỗ Hợp Kỵ (Giỗ chung)",
    annDate: { day: 18, month: 9 },
    generation: null,
    isHopKy: true,
    members: hopKyMembers
  }] : [];

  const allEvents = [...individualEvents, ...hopKyEvent];

  const totalAnniversaries = allEvents.length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSolarDateOfLunar = (lunarYear, lunarMonth, lunarDay) => {
    try {
      const lunar = new LunarDate({ day: 1, month: 1, year: lunarYear });
      lunar.setDate({ day: lunarDay, month: lunarMonth, year: lunarYear });
      const solar = lunar.toSolarDate();
      if (solar) {
        return solar.toDate();
      }
    } catch (e) {
      console.error("Error converting Lunar to Solar:", e);
    }
    return new Date(lunarYear, lunarMonth - 1, lunarDay);
  };

  const getUpcomingSolarDateStr = (e) => {
    const { day, month } = e.annDate;
    let solarYear = today.getFullYear();
    let target = getSolarDateOfLunar(solarYear, month, day);
    const targetZero = new Date(target);
    targetZero.setHours(0, 0, 0, 0);
    if (targetZero < today) {
      target = getSolarDateOfLunar(solarYear + 1, month, day);
    }
    const dStr = String(target.getDate()).padStart(2, '0');
    const mStr = String(target.getMonth() + 1).padStart(2, '0');
    return `${dStr}/${mStr}/${target.getFullYear()}`;
  };

  const getDaysRemaining = (e) => {
    const { day, month } = e.annDate;
    let solarYear = today.getFullYear();
    let target = getSolarDateOfLunar(solarYear, month, day);
    const targetZero = new Date(target);
    targetZero.setHours(0, 0, 0, 0);
    if (targetZero < today) {
      target = getSolarDateOfLunar(solarYear + 1, month, day);
    }
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const eventsWithDays = allEvents.map(e => ({
    ...e,
    daysRemaining: getDaysRemaining(e)
  })).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const upcoming7 = eventsWithDays.filter(e => e.daysRemaining <= 7).length;
  const upcoming30 = eventsWithDays.filter(e => e.daysRemaining <= 30).length;

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); 
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let thisMonthCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const solar = new SolarDate(new Date(currentYear, currentMonth, d));
    const lunar = solar.toLunarDate();
    const dayAnniversaries = allEvents.filter(e => e.annDate.day === lunar.day && e.annDate.month === lunar.month);
    thisMonthCount += dayAnniversaries.length;
  }

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthNames = [
    "Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu",
    "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai"
  ];

  const handleDayClick = (dayNum, dayAnniversaries) => {
    if (!dayNum || dayAnniversaries.length === 0) return;
    const solar = new SolarDate(new Date(currentYear, currentMonth, dayNum));
    const lunar = solar.toLunarDate();
    setSelectedDayData({
      day: dayNum,
      month: currentMonth + 1,
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
      anniversaries: dayAnniversaries
    });
  };

  return (
    <div className="flex-grow w-full flex flex-col bg-paper-light p-3 md:p-6 select-text h-full overflow-y-auto lg:overflow-hidden relative">
      
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-5 shrink-0">
        <div className="bg-paper-base border border-gold-accent/15 p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xs">
          <span className="text-[9px] md:text-[10px] text-charcoal/50 block font-semibold uppercase tracking-wider">Tổng ngày giỗ</span>
          <span className="font-semibold text-sm md:text-lg text-wood-dark">{totalAnniversaries} ngày</span>
        </div>
        <div className="bg-paper-base border border-gold-accent/15 p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xs">
          <span className="text-[9px] md:text-[10px] text-charcoal/50 block font-semibold uppercase tracking-wider">Sắp tới (7 ngày)</span>
          <span className={`font-semibold text-sm md:text-lg ${upcoming7 > 0 ? "text-red-600 font-bold" : "text-wood-dark"}`}>
            {upcoming7} ngày
          </span>
        </div>
        <div className="bg-paper-base border border-gold-accent/15 p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xs">
          <span className="text-[9px] md:text-[10px] text-charcoal/50 block font-semibold uppercase tracking-wider">Tháng tới (30 ngày)</span>
          <span className="font-semibold text-sm md:text-lg text-wood-dark">{upcoming30} ngày</span>
        </div>
        <div className="bg-paper-base border border-gold-accent/15 p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xs">
          <span className="text-[9px] md:text-[10px] text-charcoal/50 block font-semibold uppercase tracking-wider">Trong tháng {currentMonth + 1}</span>
          <span className="font-semibold text-sm md:text-lg text-wood-dark">{thisMonthCount} ngày</span>
        </div>
      </div>

      {/* Mobile view toggle tabs */}
      <div className="lg:hidden flex bg-paper-base border border-gold-accent/20 p-0.5 rounded-lg mb-3 shrink-0">
        <button
          onClick={() => setMobileTab("list")}
          className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all text-center cursor-pointer ${
            mobileTab === "list"
              ? "bg-wood-dark text-gold-accent shadow-xs"
              : "text-wood-medium hover:bg-gold-accent/5"
          }`}
        >
          📜 Danh sách ngày giỗ
        </button>
        <button
          onClick={() => setMobileTab("calendar")}
          className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all text-center cursor-pointer ${
            mobileTab === "calendar"
              ? "bg-wood-dark text-gold-accent shadow-xs"
              : "text-wood-medium hover:bg-gold-accent/5"
          }`}
        >
          📅 Lịch tháng {currentMonth + 1}
        </button>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 lg:overflow-hidden shrink-0 lg:shrink">
        
        {/* Left column list */}
        <div className={`lg:col-span-2 border border-gold-accent/15 bg-paper-base rounded-lg md:rounded-xl p-3 md:p-4 flex flex-col overflow-hidden shadow-2xs ${
          mobileTab === "list" ? "flex" : "hidden lg:flex"
        }`}>
          <h4 className="font-display font-semibold text-wood-dark text-xs md:text-sm border-b border-gold-accent/10 pb-2 mb-3 flex items-center gap-2">
            🕯️ Danh sách ngày giỗ sắp tới
          </h4>
          
          <div className="flex-grow overflow-y-auto divide-y divide-gold-accent/10 pr-1 md:pr-2 max-h-[350px] lg:max-h-none">
            {eventsWithDays.length === 0 ? (
              <p className="text-xs text-charcoal/45 italic text-center py-8">Không có dữ liệu ngày giỗ.</p>
            ) : (
              eventsWithDays.map(e => {
                const isToday = e.daysRemaining === 0 || e.daysRemaining === 365;
                return (
                  <div key={e.id} className="py-2 flex items-center justify-between hover:bg-gold-accent/5 px-2 rounded transition-colors">
                    <div>
                      {e.isHopKy ? (
                        <span className="text-xs font-bold text-wood-dark block text-left">
                          {e.name}
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectMember(e.member)}
                          className="text-xs font-bold text-wood-dark hover:text-gold-accent transition-colors block text-left"
                        >
                          {e.name}
                        </button>
                      )}
                      <span className="text-[10px] text-charcoal/50">
                        Ngày giỗ: {e.annDate.day}/{e.annDate.month} (Âm lịch) · Dương lịch: {getUpcomingSolarDateStr(e)} {e.generation && `· Đời ${e.generation}`}
                      </span>
                    </div>
                    <div>
                      {isToday ? (
                        <span className="px-2 py-1 rounded bg-red-600 text-white text-[9px] font-bold uppercase animate-pulse">
                          Hôm nay
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-semibold ${
                          e.daysRemaining <= 7
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-paper-light text-wood-medium border border-gold-accent/20"
                        }`}>
                          Còn {e.daysRemaining} ngày
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right calendar column */}
        <div className={`lg:col-span-3 border border-gold-accent/15 bg-paper-base rounded-lg md:rounded-xl p-3 md:p-4 flex flex-col overflow-hidden shadow-2xs ${
          mobileTab === "calendar" ? "flex" : "hidden lg:flex"
        }`}>
          
          {/* Calendar Header controls */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="font-display font-semibold text-wood-dark text-xs md:text-sm flex items-center gap-1.5 truncate">
              📅 Lịch {monthNames[currentMonth]} - {currentYear}
            </h4>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="px-2.5 py-1 text-xs bg-paper-light border border-gold-accent/20 hover:border-gold-accent rounded font-bold text-wood-medium transition-colors cursor-pointer"
              >
                &larr;
              </button>
              <button
                onClick={nextMonth}
                className="px-2.5 py-1 text-xs bg-paper-light border border-gold-accent/20 hover:border-gold-accent rounded font-bold text-wood-medium transition-colors cursor-pointer"
              >
                &rarr;
              </button>
            </div>
          </div>

          {/* Calendar grid rendering */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Days grid labels */}
            <div className="grid grid-cols-7 gap-1 border-b border-gold-accent/15 pb-2 mb-1.5 text-center text-[10px] font-bold text-wood-medium uppercase tracking-wider shrink-0">
              <div className="text-red-700">CN</div>
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
            </div>

            {/* Days entries */}
            <div className="flex-grow grid grid-cols-7 gap-1 bg-gold-accent/5 p-1 rounded-lg overflow-y-auto min-h-[300px] lg:min-h-0">
              {cells.map((d, index) => {
                const isSelectedMonthToday = d && (new Date().getMonth() === currentMonth) && (new Date().getDate() === d) && (new Date().getFullYear() === currentYear);
                
                let dayAnniversaries = [];
                let lunarText = "";
                if (d) {
                  const solar = new SolarDate(new Date(currentYear, currentMonth, d));
                  const lunar = solar.toLunarDate();
                  lunarText = lunar.day === 1 
                    ? `01/${lunar.month.toString().padStart(2, '0')}${lunar.leap_month ? 'n' : ''}` 
                    : lunar.day.toString().padStart(2, '0');
                  
                  dayAnniversaries = allEvents.filter(e => e.annDate.day === lunar.day && e.annDate.month === lunar.month);
                }

                return (
                  <div
                    key={`cal-cell-${index}`}
                    onClick={() => dayAnniversaries.length > 0 && handleDayClick(d, dayAnniversaries)}
                    className={`min-h-[48px] md:min-h-16 rounded p-1 border border-gold-accent/5 flex flex-col justify-between transition-colors overflow-hidden ${
                      !d 
                        ? "bg-transparent/0 border-none pointer-events-none" 
                        : isSelectedMonthToday
                          ? "bg-gold-accent/25 border-gold-accent/60"
                          : dayAnniversaries.length > 0
                            ? "bg-paper-light border-gold-accent/25 hover:bg-gold-accent/10 cursor-pointer"
                            : "bg-paper-base hover:bg-gold-accent/5"
                    }`}
                  >
                    {d ? (
                      <>
                        <div className="flex flex-col items-start shrink-0">
                          <span className={`text-[10px] font-semibold ${isSelectedMonthToday ? "text-gold-dark font-extrabold" : "text-charcoal/50"}`}>
                            {d}
                          </span>
                          <span className="text-[9px] text-charcoal/40 italic block leading-none mt-0.5">
                            {lunarText}
                          </span>
                        </div>
                        {dayAnniversaries.length > 0 && (
                          <div className="flex-grow flex items-center justify-center mt-1">
                            <span className="bg-wood-dark text-gold-accent text-[8.5px] md:text-[10px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 shadow-3xs leading-none">
                              🕯️ {dayAnniversaries.length}
                            </span>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Custom Modal for Day Anniversaries */}
      {selectedDayData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-text">
          <div className="bg-[#FAF7F0] border border-gold-accent/30 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border-t-4 border-t-wood-dark">
            {/* Modal Header */}
            <div className="bg-wood-dark text-gold-accent px-4 py-3 flex items-center justify-between border-b border-gold-accent/20">
              <div className="flex flex-col">
                <h3 className="font-display font-bold text-sm flex items-center gap-1.5 leading-none">
                  🕯️ Ngày giỗ: {selectedDayData.lunarDay}/{selectedDayData.lunarMonth} (Âm lịch)
                </h3>
                <span className="text-[10px] text-gold-light/80 mt-1">
                  Dương lịch năm nay: {selectedDayData.day}/{selectedDayData.month}/{currentYear}
                </span>
              </div>
              <button
                onClick={() => setSelectedDayData(null)}
                className="p-1 text-gold-accent/70 hover:text-gold-light hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-grow divide-y divide-gold-accent/10">
              <p className="text-[11px] text-charcoal/50 pb-2 mb-2 italic">
                Danh sách tiên tổ cúng giỗ vào ngày này:
              </p>
              
              {selectedDayData.anniversaries.map(e => {
                if (e.isHopKy) {
                  return (
                    <div key={e.id} className="py-3 flex flex-col gap-1.5 first:pt-1">
                      <div>
                        <h4 className="text-xs font-bold text-red-700">{e.name}</h4>
                        <p className="text-[10.5px] text-charcoal/70 mt-1 font-semibold">
                          Giỗ chung cho các tiên tổ không rõ ngày mất:
                        </p>
                        <div className="mt-2 pl-3 border-l-2 border-gold-accent/40 space-y-2 max-h-[220px] overflow-y-auto">
                          {e.members.map(m => (
                            <div key={m.id} className="text-[10px] text-charcoal">
                              <span className="font-bold text-wood-dark block">{m.name}</span>
                              <span className="text-[9px] text-charcoal/50">
                                Đời thứ {m.generation} · {m.gender} {m.deathDate && `· Năm mất: ${m.deathDate}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                const birthYear = e.birthDate ? (parseInt(e.birthDate.match(/\d{4}/)?.[0] || e.birthDate) || "???") : "???";
                const deathYear = e.deathDate ? (parseInt(e.deathDate.match(/\d{4}/)?.[0] || e.deathDate) || "???") : "???";

                return (
                  <div key={e.id} className="py-3 flex flex-col gap-1.5 first:pt-1">
                    <div>
                      <h4 className="text-xs font-bold text-wood-dark">{e.name}</h4>
                      <p className="text-[10px] text-charcoal/50">
                        Đời thứ {e.generation} · {e.gender}
                      </p>
                      <p className="text-[10px] text-wood-medium mt-0.5">
                        Tạ thế năm: {e.deathDate || "Không rõ"}
                      </p>
                      {e.deathPlace && (
                        <p className="text-[9.5px] text-charcoal/60 italic">
                          Nơi mất: {e.deathPlace}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        onSelectMember(e.member);
                        setSelectedDayData(null);
                      }}
                      className="w-full mt-1 py-1.5 bg-gold-accent/10 hover:bg-gold-accent/25 border border-gold-accent/30 hover:border-gold-accent text-wood-medium rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" /> Xem tiểu sử chi tiết
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="bg-paper-base px-4 py-2.5 flex justify-end border-t border-gold-accent/10">
              <button
                onClick={() => setSelectedDayData(null)}
                className="px-3.5 py-1.5 bg-wood-medium text-paper-base hover:bg-wood-dark hover:text-gold-accent rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
