import React, { useRef } from 'react';
import { Shape, ShapeType, PointShape, LineShape, CircleShape, PolygonShape, TextShape, PathShape } from '../types';
import { Download } from 'lucide-react';

interface DrawingCanvasProps {
  shapes: Shape[];
  selectedId: string | null;
  onSelectShape: (id: string | null) => void;
  width?: number;
  height?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  shapes = [], 
  selectedId, 
  onSelectShape,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;
    
    // Create a canvas to draw the SVG onto
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        
        // Fill background with slate-950 color (matches app theme)
        ctx.fillStyle = "#020617"; 
        ctx.fillRect(0,0, width, height);
        
        // Draw the SVG
        ctx.drawImage(img, 0, 0);
        
        // Trigger download
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "hinh-ve-thong-minh.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Helper render pattern overlay
  const renderPatternOverlay = (shape: Shape) => {
    if (!shape.pattern || shape.pattern === 'none') return null;
    
    const patternUrl = `url(#pattern-${shape.pattern})`;
    const commonProps = {
        fill: patternUrl,
        fillOpacity: 0.6, // Tăng opacity một chút để nhìn rõ pattern hơn
        className: "pointer-events-none"
    };
    
    if (shape.type === ShapeType.POLYGON) {
        const s = shape as PolygonShape;
        const pointsStr = s.points.map(p => `${p.x},${p.y}`).join(" ");
        return <polygon points={pointsStr} {...commonProps} />;
    }
    if (shape.type === ShapeType.PATH) {
        const s = shape as PathShape;
        return <path d={s.d} {...commonProps} />;
    }
    if (shape.type === ShapeType.CIRCLE) {
        const s = shape as CircleShape;
        return <circle cx={s.cx} cy={s.cy} r={s.r} {...commonProps} />;
    }
    return null;
  };

  const renderShape = (shape: Shape) => {
    if (!shape) return null; 
    
    const isSelected = shape.id === selectedId;
    const highlightClass = isSelected ? "stroke-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" : "";
    const cursorClass = "cursor-pointer hover:opacity-90 transition-all duration-200";

    let element = null;

    switch (shape.type) {
      case ShapeType.POINT:
        const pt = shape as PointShape;
        element = (
          <g key={pt.id} onClick={(e) => { e.stopPropagation(); onSelectShape(pt.id); }} className={cursorClass}>
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r={isSelected ? (pt.radius || 4) + 4 : (pt.radius || 4)} 
              fill={pt.color || "#38bdf8"}
              stroke="white"
              strokeWidth={2}
              className={highlightClass}
            />
            {pt.label && (
              <text 
                x={pt.x + 10} 
                y={pt.y - 10} 
                fill="white" 
                fontSize={16} 
                fontWeight="bold"
                className="select-none pointer-events-none drop-shadow-md"
              >
                {pt.label}
              </text>
            )}
          </g>
        );
        break;

      case ShapeType.LINE:
        const ln = shape as LineShape;
        element = (
          <line
            key={ln.id}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke={ln.color || "#94a3b8"}
            strokeWidth={isSelected ? (ln.strokeWidth || 2) + 2 : (ln.strokeWidth || 2)}
            strokeDasharray={ln.strokeStyle === 'dashed' ? "5,5" : ln.strokeStyle === 'dotted' ? "2,2" : ""}
            markerEnd={ln.arrow ? "url(#arrowhead)" : undefined}
            onClick={(e) => { e.stopPropagation(); onSelectShape(ln.id); }}
            className={`${cursorClass} ${highlightClass}`}
          />
        );
        break;

      case ShapeType.CIRCLE:
        const circ = shape as CircleShape;
        element = (
            <React.Fragment key={circ.id}>
                <circle
                    cx={circ.cx}
                    cy={circ.cy}
                    r={circ.r}
                    fill="transparent" 
                    stroke={circ.color || "#94a3b8"}
                    strokeWidth={isSelected ? (circ.strokeWidth || 2) + 2 : (circ.strokeWidth || 2)}
                    strokeDasharray={circ.strokeStyle === 'dashed' ? "5,5" : ""}
                    onClick={(e) => { e.stopPropagation(); onSelectShape(circ.id); }}
                    className={`${cursorClass} ${highlightClass}`}
                />
                {renderPatternOverlay(shape)}
            </React.Fragment>
        );
        break;
      
      case ShapeType.POLYGON:
        const poly = shape as PolygonShape;
        if (!poly.points || !Array.isArray(poly.points)) return null; 
        const pointsStr = poly.points.map(p => `${p.x},${p.y}`).join(" ");
        element = (
           <React.Fragment key={poly.id}>
               <polygon
                points={pointsStr}
                fill={poly.fill || "transparent"}
                fillOpacity={poly.opacity || 0.1}
                stroke={poly.color || "#94a3b8"}
                strokeWidth={isSelected ? (poly.strokeWidth || 2) + 2 : (poly.strokeWidth || 2)}
                onClick={(e) => { e.stopPropagation(); onSelectShape(poly.id); }}
                className={`${cursorClass} ${highlightClass}`}
               />
               {renderPatternOverlay(shape)}
           </React.Fragment>
        );
        break;

      case ShapeType.PATH: // New Case for Pie Slices
        const path = shape as PathShape;
        element = (
           <React.Fragment key={path.id}>
               <path
                d={path.d}
                fill={path.fill || "#38bdf8"}
                fillOpacity={path.opacity || 1}
                stroke={path.color || "white"}
                strokeWidth={isSelected ? (path.strokeWidth || 2) + 2 : (path.strokeWidth || 1)}
                onClick={(e) => { e.stopPropagation(); onSelectShape(path.id); }}
                className={`${cursorClass} ${highlightClass}`}
               />
               {renderPatternOverlay(shape)}
           </React.Fragment>
        );
        break;

      case ShapeType.TEXT:
        const txt = shape as TextShape;
        element = (
            <text
                key={txt.id}
                x={txt.x}
                y={txt.y}
                fill={txt.color || "#e2e8f0"}
                fontSize={txt.fontSize || 16}
                fontWeight="bold"
                textAnchor="middle" 
                className={`select-none drop-shadow-md ${cursorClass} ${isSelected ? 'fill-yellow-400' : ''}`}
                onClick={(e) => { e.stopPropagation(); onSelectShape(txt.id); }}
            >
                {txt.content}
            </text>
        );
        break;
    }

    return element;
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative group">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Download Button */}
      <button 
        onClick={handleDownload}
        className="absolute top-4 right-4 bg-slate-800/80 hover:bg-teal-600 text-slate-300 hover:text-white p-2 rounded-lg backdrop-blur border border-slate-700 transition-all z-20 group-hover:opacity-100 opacity-0"
        title="Tải hình ảnh (PNG)"
      >
        <Download className="w-4 h-4"/>
      </button>

      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full max-w-[800px] max-h-[600px] bg-transparent z-10"
        onClick={() => onSelectShape(null)}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
            {/* Arrowhead Marker */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
            </marker>

            {/* 1. Sọc Ngang */}
            <pattern id="pattern-lines" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                 <line x1="0" y1="5" x2="10" y2="5" stroke="white" strokeWidth="2" opacity="0.8"/>
            </pattern>

            {/* 2. Sọc Dọc */}
            <pattern id="pattern-vertical" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
                 <line x1="0" y1="5" x2="10" y2="5" stroke="white" strokeWidth="2" opacity="0.8"/>
            </pattern>

            {/* 3. Chấm Bi */}
            <pattern id="pattern-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1.5" fill="white" opacity="0.8"/>
            </pattern>

            {/* 4. Lưới Vuông */}
            <pattern id="pattern-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

            {/* 5. Sọc Chéo Phải (///) */}
            <pattern id="pattern-diagonal" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="white" strokeWidth="2" opacity="0.8"/>
            </pattern>

            {/* 6. Sọc Chéo Trái (\\\) */}
            <pattern id="pattern-diagonal-rev" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="white" strokeWidth="2" opacity="0.8"/>
            </pattern>

            {/* 7. Lưới Chéo (XXX) */}
            <pattern id="pattern-cross" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M 0 5 L 10 5 M 5 0 L 5 10" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

             {/* 8. Sóng Nước (~~~) */}
            <pattern id="pattern-waves" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 0 10 Q 5 5 10 10 T 20 10" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8"/>
            </pattern>

            {/* 9. Zigzag (W) */}
            <pattern id="pattern-zigzag" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 0 5 L 5 0 L 10 5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8"/>
            </pattern>

            {/* 10. Bricks (Tường gạch) */}
            <pattern id="pattern-bricks" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                <path d="M0 10 H20 M0 5 H20 M10 0 V5 M0 5 V10 M20 5 V10" fill="none" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

            {/* 11. Hexagons (Tổ ong) */}
            <pattern id="pattern-hexagons" x="0" y="0" width="14" height="24" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
                <path d="M7 0 L14 4 V12 L7 16 L0 12 V4 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

            {/* 12. Checkerboard (Caro) */}
            <pattern id="pattern-checks" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="5" height="5" fill="white" fillOpacity="0.4"/>
                <rect x="5" y="5" width="5" height="5" fill="white" fillOpacity="0.4"/>
            </pattern>

            {/* 13. Triangles (Tam giác) */}
            <pattern id="pattern-triangles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <polygon points="5,1 9,9 1,9" fill="none" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

            {/* 14. Circles (Tròn rỗng) */}
            <pattern id="pattern-circles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="3" fill="none" stroke="white" strokeWidth="1" opacity="0.8"/>
            </pattern>

            {/* 15. Plus (Dấu cộng) */}
            <pattern id="pattern-plus" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 5 2 V 8 M 2 5 H 8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8"/>
            </pattern>
        </defs>
        
        {/* Render Background Shapes */}
        {shapes && shapes.filter(s => s.type !== ShapeType.POINT && s.type !== ShapeType.TEXT).map(renderShape)}
        
        {/* Render Foreground Shapes */}
        {shapes && shapes.filter(s => s.type === ShapeType.POINT || s.type === ShapeType.TEXT).map(renderShape)}
      </svg>
      
      <div className="absolute bottom-4 right-4 text-slate-600 text-xs select-none">
        {width} x {height} Canvas
      </div>
    </div>
  );
};

export default DrawingCanvas;