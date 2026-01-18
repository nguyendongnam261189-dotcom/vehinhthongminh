import React from 'react';
import { Shape, ShapeType, PointShape } from '../types';
import { 
    PaintBucket, Circle, Minus, Activity, Trash2, 
    Grid3X3, CircleDashed, AlignJustify, 
    Slash, X, Waves, BrickWall, Hexagon, 
    Triangle, LayoutDashboard, Grip, Plus, Ban
} from 'lucide-react';

interface ControlPanelProps {
  selectedShape: Shape | null;
  onUpdateShape: (updatedShape: Shape) => void;
  onDeleteShape: (id: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ selectedShape, onUpdateShape, onDeleteShape }) => {
  if (!selectedShape) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Chọn một đối tượng trên hình vẽ để chỉnh sửa</p>
      </div>
    );
  }

  const handleChange = (key: string, value: any) => {
    onUpdateShape({ ...selectedShape, [key]: value });
  };

  const isFillable = selectedShape.type === ShapeType.POLYGON || selectedShape.type === ShapeType.PATH || selectedShape.type === ShapeType.CIRCLE;

  const patterns = [
    { id: 'none', label: 'Trơn', icon: <Ban className="w-4 h-4"/> },
    { id: 'lines', label: 'Ngang', icon: <AlignJustify className="w-4 h-4 rotate-90"/> },
    { id: 'vertical', label: 'Dọc', icon: <AlignJustify className="w-4 h-4"/> },
    { id: 'diagonal', label: 'Chéo P', icon: <Slash className="w-4 h-4"/> },
    { id: 'diagonal-rev', label: 'Chéo T', icon: <Slash className="w-4 h-4 -rotate-90"/> },
    { id: 'cross', label: 'Lưới chéo', icon: <X className="w-4 h-4"/> },
    { id: 'grid', label: 'Lưới', icon: <Grid3X3 className="w-4 h-4"/> },
    { id: 'dots', label: 'Chấm bi', icon: <Grip className="w-4 h-4"/> },
    { id: 'circles', label: 'Tròn', icon: <CircleDashed className="w-4 h-4"/> },
    { id: 'plus', label: 'Cộng', icon: <Plus className="w-4 h-4"/> },
    { id: 'waves', label: 'Sóng', icon: <Waves className="w-4 h-4"/> },
    { id: 'zigzag', label: 'Zigzag', icon: <Activity className="w-4 h-4"/> },
    { id: 'bricks', label: 'Gạch', icon: <BrickWall className="w-4 h-4"/> },
    { id: 'hexagons', label: 'Tổ ong', icon: <Hexagon className="w-4 h-4"/> },
    { id: 'checks', label: 'Caro', icon: <LayoutDashboard className="w-4 h-4"/> },
    { id: 'triangles', label: 'Tam giác', icon: <Triangle className="w-4 h-4"/> },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <h3 className="text-lg font-semibold text-teal-400 flex items-center gap-2">
          {selectedShape.type === ShapeType.POINT && <Circle className="w-4 h-4 fill-current" />}
          {selectedShape.type === ShapeType.LINE && <Minus className="w-4 h-4" />}
          {isFillable && <PaintBucket className="w-4 h-4" />}
          Tùy chỉnh
        </h3>
        <button 
          onClick={() => onDeleteShape(selectedShape.id)}
          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
          title="Xóa đối tượng"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Common: Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">
             {isFillable ? 'Màu nền / Viền' : 'Màu sắc'}
          </label>
          <div className="flex gap-2 flex-wrap">
            {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'].map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedShape.color === color ? 'border-white ring-2 ring-teal-500/50' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                onClick={() => handleChange(isFillable ? 'fill' : 'color', color)}
              />
            ))}
            <input 
                type="color" 
                value={(isFillable ? (selectedShape as any).fill : selectedShape.color) || "#000000"} 
                onChange={(e) => handleChange(isFillable ? 'fill' : 'color', e.target.value)}
                className="w-8 h-8 bg-transparent cursor-pointer rounded overflow-hidden"
            />
          </div>
        </div>

        {/* Common: Stroke Width / Size */}
        <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
                {selectedShape.type === ShapeType.POINT ? 'Kích thước điểm' : 'Độ dày nét'}
            </label>
            <input 
                type="range" 
                min="1" 
                max="10" 
                value={selectedShape.type === ShapeType.POINT ? (selectedShape as PointShape).radius : selectedShape.strokeWidth || 2}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (selectedShape.type === ShapeType.POINT) handleChange('radius', val);
                    else handleChange('strokeWidth', val);
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
        </div>

        {/* Pattern Selection (For Pie Chart / Shapes) */}
        {isFillable && (
             <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Hoạ tiết tô (Pattern)</label>
                <div className="grid grid-cols-4 gap-2">
                    {patterns.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => handleChange('pattern', p.id)}
                            title={p.label}
                            className={`flex flex-col items-center justify-center p-2 rounded border transition-colors ${selectedShape.pattern === p.id ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                            {p.icon}
                            {/* Shorten label if needed or rely on icon + tooltip */}
                            <span className="text-[9px] mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{p.label}</span>
                        </button>
                    ))}
                </div>
             </div>
        )}

        {/* Line Style */}
        {(selectedShape.type === ShapeType.LINE || selectedShape.type === ShapeType.CIRCLE) && (
             <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Kiểu nét</label>
                <div className="grid grid-cols-3 gap-2">
                    {['solid', 'dashed', 'dotted'].map((style) => (
                        <button
                            key={style}
                            onClick={() => handleChange('strokeStyle', style)}
                            className={`px-2 py-1 text-xs rounded border ${selectedShape.strokeStyle === style ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                            {style === 'solid' ? 'Liền' : style === 'dashed' ? 'Đứt' : 'Chấm'}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;