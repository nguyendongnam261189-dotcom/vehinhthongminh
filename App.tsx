import React, { useState, useEffect, useRef } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import ControlPanel from './components/ControlPanel';
import { geminiService } from './services/geminiService';
import { Shape, AppStatus, ShapeType } from './types';
import {
  Calculator,
  Mic,
  Play,
  Square,
  Loader2,
  Sparkles,
  PieChart,
  Plus,
  Trash2,
  BarChartBig
} from 'lucide-react';

const EXAMPLE_PROBLEM =
  "Cho tam giác ABC đều. Vẽ đường cao AH. Gọi M là trung điểm của AC. Vẽ đường tròn tâm M bán kính MC.";

interface ChartItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DoubleBarItem {
  id: string;
  label: string;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
}

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899'
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'geometry' | 'pie' | 'bar' | 'bar2'>('geometry');

  // Geometry State
  const [problemText, setProblemText] = useState(EXAMPLE_PROBLEM);

  // Chart Data State
  const [pieItems, setPieItems] = useState<ChartItem[]>([
    { id: '1', label: 'Nhóm A', value: 30, color: COLORS[0] },
    { id: '2', label: 'Nhóm B', value: 50, color: COLORS[1] },
    { id: '3', label: 'Nhóm C', value: 20, color: COLORS[2] }
  ]);

  const [barItems, setBarItems] = useState<ChartItem[]>([
    { id: '1', label: 'Tháng 1', value: 45, color: COLORS[3] },
    { id: '2', label: 'Tháng 2', value: 80, color: COLORS[4] },
    { id: '3', label: 'Tháng 3', value: 60, color: COLORS[5] },
    { id: '4', label: 'Tháng 4', value: 95, color: COLORS[6] }
  ]);

  // Double Bar (Grouped) Chart State
  const [series1Name, setSeries1Name] = useState<string>('Nhóm 1');
  const [series2Name, setSeries2Name] = useState<string>('Nhóm 2');

  // NEW: titles for grouped chart
  const [doubleChartTitle, setDoubleChartTitle] = useState<string>('Biểu đồ cột kép');
  const [doubleXAxisTitle, setDoubleXAxisTitle] = useState<string>('Danh mục');
  const [doubleYAxisTitle, setDoubleYAxisTitle] = useState<string>('Giá trị');

  const [doubleBarItems, setDoubleBarItems] = useState<DoubleBarItem[]>([
    { id: '1', label: 'Khối 6', value1: 35, value2: 45, color1: COLORS[3], color2: COLORS[5] },
    { id: '2', label: 'Khối 7', value1: 55, value2: 50, color1: COLORS[3], color2: COLORS[5] },
    { id: '3', label: 'Khối 8', value1: 60, value2: 75, color1: COLORS[3], color2: COLORS[5] },
    { id: '4', label: 'Khối 9', value1: 80, value2: 70, color1: COLORS[3], color2: COLORS[5] }
  ]);

  // Common State
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [explanation, setExplanation] = useState<string>('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // --- Geometry Logic ---
  const handleProcessProblem = async () => {
    if (!problemText.trim()) return;
    setStatus(AppStatus.ANALYZING);
    setShapes([]);
    setExplanation('');
    setAudioBuffer(null);
    setSelectedShapeId(null);
    stopAudio();

    try {
      const result = await geminiService.analyzeGeometryProblem(problemText);
      setShapes(result.shapes || []);
      setExplanation(result.explanation);

      if (result.explanation && audioContextRef.current) {
        setStatus(AppStatus.SPEAKING);
        try {
          const buffer = await geminiService.generateSpeech(result.explanation, audioContextRef.current);
          setAudioBuffer(buffer);
        } catch (e) {
          console.warn(e);
        }
      }
      setStatus(AppStatus.IDLE);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
    }
  };

  // --- Pie Logic ---
  const generatePieChart = () => {
    const total = pieItems.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return;

    const newShapes: Shape[] = [];
    const cx = 400,
      cy = 300,
      r = 200;
    let startAngle = -Math.PI / 2;

    pieItems.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      newShapes.push({
        id: `slice-${item.id}`,
        type: ShapeType.PATH,
        d: d,
        fill: item.color,
        color: '#ffffff',
        strokeWidth: 2,
        opacity: 1,
        pattern: 'none'
      });

      const midAngle = startAngle + sliceAngle / 2;
      const textR = r * 0.7;
      const tx = cx + textR * Math.cos(midAngle);
      const ty = cy + textR * Math.sin(midAngle);
      const percent = ((item.value / total) * 100).toFixed(1);

      newShapes.push({
        id: `text-${item.id}`,
        type: ShapeType.TEXT,
        x: tx,
        y: ty,
        content: `${item.label}\n(${percent}%)`,
        color: '#ffffff',
        fontSize: 14,
        strokeWidth: 0,
        strokeStyle: 'solid',
        pattern: 'none'
      });
      startAngle = endAngle;
    });

    setShapes(newShapes);
    setExplanation(`Biểu đồ tròn thể hiện tỷ lệ của ${pieItems.length} thành phần.`);
    setSelectedShapeId(null);
  };

  // --- Bar Logic ---
  const generateBarChart = () => {
    if (barItems.length === 0) return;
    const newShapes: Shape[] = [];
    const originX = 100;
    const originY = 500;
    const chartWidth = 600;
    const chartHeight = 400;
    const maxValue = Math.max(...barItems.map((i) => i.value));
    const scaleFactor = maxValue === 0 ? 1 : (chartHeight - 50) / maxValue;

    newShapes.push({
      id: 'axis-y',
      type: ShapeType.LINE,
      x1: originX,
      y1: originY,
      x2: originX,
      y2: originY - chartHeight,
      color: '#cbd5e1',
      strokeWidth: 2,
      strokeStyle: 'solid',
      arrow: true
    });
    newShapes.push({
      id: 'axis-x',
      type: ShapeType.LINE,
      x1: originX,
      y1: originY,
      x2: originX + chartWidth,
      y2: originY,
      color: '#cbd5e1',
      strokeWidth: 2,
      strokeStyle: 'solid',
      arrow: true
    });

    barItems.forEach((item, index) => {
      const gap = 30;
      const barWidth = (chartWidth - gap * (barItems.length + 1)) / barItems.length;
      const barHeight = item.value * scaleFactor;
      const x = originX + gap + index * (barWidth + gap);
      const y = originY - barHeight;

      newShapes.push({
        id: `bar-${item.id}`,
        type: ShapeType.POLYGON,
        points: [
          { x, y: originY },
          { x: x + barWidth, y: originY },
          { x: x + barWidth, y },
          { x, y }
        ],
        fill: item.color,
        opacity: 1,
        color: '#ffffff',
        strokeWidth: 2,
        pattern: 'none'
      });
      newShapes.push({
        id: `label-${item.id}`,
        type: ShapeType.TEXT,
        x: x + barWidth / 2,
        y: originY + 25,
        content: item.label,
        color: '#e2e8f0',
        fontSize: 14
      });
      newShapes.push({
        id: `val-${item.id}`,
        type: ShapeType.TEXT,
        x: x + barWidth / 2,
        y: y - 10,
        content: item.value.toString(),
        color: '#ffffff',
        fontSize: 14
      });
    });

    setShapes(newShapes);
    setExplanation(`Biểu đồ cột so sánh ${barItems.length} đối tượng.`);
    setSelectedShapeId(null);
  };

  // --- Double Bar (Grouped) Logic ---
  const generateDoubleBarChart = () => {
    if (doubleBarItems.length === 0) return;

    const newShapes: Shape[] = [];

    /**
     * IMPORTANT FIX:
     * - Chừa không gian bên phải để đặt chú giải (legend) không đè lên cột.
     * - Giảm chartWidth để có “legend area” nằm trong canvas.
     */
    const originX = 90;
    const originY = 500;
    const chartWidth = 500; // reduced from 600 to create space for legend
    const chartHeight = 400;

    const maxValue = Math.max(...doubleBarItems.map((i) => i.value1), ...doubleBarItems.map((i) => i.value2), 0);
    const scaleFactor = maxValue === 0 ? 1 : (chartHeight - 70) / maxValue;

    // Axes
    newShapes.push({
      id: 'axis2-y',
      type: ShapeType.LINE,
      x1: originX,
      y1: originY,
      x2: originX,
      y2: originY - chartHeight,
      color: '#cbd5e1',
      strokeWidth: 2,
      strokeStyle: 'solid',
      arrow: true
    });
    newShapes.push({
      id: 'axis2-x',
      type: ShapeType.LINE,
      x1: originX,
      y1: originY,
      x2: originX + chartWidth,
      y2: originY,
      color: '#cbd5e1',
      strokeWidth: 2,
      strokeStyle: 'solid',
      arrow: true
    });

    // Chart Title (top center)
    if (doubleChartTitle?.trim()) {
      newShapes.push({
        id: 'dbl-title',
        type: ShapeType.TEXT,
        x: originX + chartWidth / 2,
        y: originY - chartHeight - 25,
        content: doubleChartTitle.trim(),
        color: '#e2e8f0',
        fontSize: 18
      });
    }

    // Y Axis Title (left side, horizontal)
    if (doubleYAxisTitle?.trim()) {
      newShapes.push({
        id: 'dbl-y-title',
        type: ShapeType.TEXT,
        x: originX - 45,
        y: originY - chartHeight / 2,
        content: doubleYAxisTitle.trim(),
        color: '#cbd5e1',
        fontSize: 13
      });
    }

    // X Axis Title (bottom center)
    if (doubleXAxisTitle?.trim()) {
      newShapes.push({
        id: 'dbl-x-title',
        type: ShapeType.TEXT,
        x: originX + chartWidth / 2,
        y: originY + 55,
        content: doubleXAxisTitle.trim(),
        color: '#cbd5e1',
        fontSize: 13
      });
    }

    // Layout
    const groupGap = 30;
    const innerGap = 10;
    const groupWidth = (chartWidth - groupGap * (doubleBarItems.length + 1)) / doubleBarItems.length;
    const barWidth = (groupWidth - innerGap) / 2;

    doubleBarItems.forEach((item, index) => {
      const groupX = originX + groupGap + index * (groupWidth + groupGap);

      const bar1Height = item.value1 * scaleFactor;
      const bar2Height = item.value2 * scaleFactor;

      const x1 = groupX;
      const x2 = groupX + barWidth + innerGap;
      const y1 = originY - bar1Height;
      const y2 = originY - bar2Height;

      // Bar 1
      newShapes.push({
        id: `bar2-1-${item.id}`,
        type: ShapeType.POLYGON,
        points: [
          { x: x1, y: originY },
          { x: x1 + barWidth, y: originY },
          { x: x1 + barWidth, y: y1 },
          { x: x1, y: y1 }
        ],
        fill: item.color1,
        opacity: 1,
        color: '#ffffff',
        strokeWidth: 2,
        pattern: 'none'
      });
      newShapes.push({
        id: `val2-1-${item.id}`,
        type: ShapeType.TEXT,
        x: x1 + barWidth / 2,
        y: y1 - 10,
        content: item.value1.toString(),
        color: '#ffffff',
        fontSize: 14
      });

      // Bar 2
      newShapes.push({
        id: `bar2-2-${item.id}`,
        type: ShapeType.POLYGON,
        points: [
          { x: x2, y: originY },
          { x: x2 + barWidth, y: originY },
          { x: x2 + barWidth, y: y2 },
          { x: x2, y: y2 }
        ],
        fill: item.color2,
        opacity: 1,
        color: '#ffffff',
        strokeWidth: 2,
        pattern: 'none'
      });
      newShapes.push({
        id: `val2-2-${item.id}`,
        type: ShapeType.TEXT,
        x: x2 + barWidth / 2,
        y: y2 - 10,
        content: item.value2.toString(),
        color: '#ffffff',
        fontSize: 14
      });

      // Category label (center of group)
      newShapes.push({
        id: `label2-${item.id}`,
        type: ShapeType.TEXT,
        x: groupX + groupWidth / 2,
        y: originY + 25,
        content: item.label,
        color: '#e2e8f0',
        fontSize: 14
      });
    });

    /**
     * LEGEND FIX:
     * Đặt legend ở “khu bên phải” của chart (ngoài vùng cột),
     * nên không bị đè nữa.
     */
    const legendX = originX + chartWidth + 35; // right of chart
    const legendY = originY - chartHeight + 60;

    const c1 = doubleBarItems[0]?.color1 || COLORS[3];
    const c2 = doubleBarItems[0]?.color2 || COLORS[5];

    // swatch 1
    newShapes.push({
      id: 'legend2-box-1',
      type: ShapeType.POLYGON,
      points: [
        { x: legendX, y: legendY - 12 },
        { x: legendX + 18, y: legendY - 12 },
        { x: legendX + 18, y: legendY + 6 },
        { x: legendX, y: legendY + 6 }
      ],
      fill: c1,
      opacity: 1,
      color: '#ffffff',
      strokeWidth: 1,
      pattern: 'none'
    });
    newShapes.push({
      id: 'legend2-text-1',
      type: ShapeType.TEXT,
      x: legendX + 70,
      y: legendY + 3,
      content: series1Name || 'Nhóm 1',
      color: '#e2e8f0',
      fontSize: 14
    });

    // swatch 2
    newShapes.push({
      id: 'legend2-box-2',
      type: ShapeType.POLYGON,
      points: [
        { x: legendX, y: legendY + 18 },
        { x: legendX + 18, y: legendY + 18 },
        { x: legendX + 18, y: legendY + 36 },
        { x: legendX, y: legendY + 36 }
      ],
      fill: c2,
      opacity: 1,
      color: '#ffffff',
      strokeWidth: 1,
      pattern: 'none'
    });
    newShapes.push({
      id: 'legend2-text-2',
      type: ShapeType.TEXT,
      x: legendX + 70,
      y: legendY + 33,
      content: series2Name || 'Nhóm 2',
      color: '#e2e8f0',
      fontSize: 14
    });

    setShapes(newShapes);
    setExplanation(
      `Biểu đồ cột kép so sánh 2 dãy dữ liệu (${series1Name} và ${series2Name}) theo ${doubleBarItems.length} nhóm.`
    );
    setSelectedShapeId(null);
  };

  const addChartItem = (isBar: boolean) => {
    const id = Date.now().toString();
    const newItem = { id, label: 'Mới', value: 20, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    if (isBar) setBarItems([...barItems, newItem]);
    else setPieItems([...pieItems, newItem]);
  };

  const addDoubleBarItem = () => {
    const id = Date.now().toString();
    const newItem: DoubleBarItem = {
      id,
      label: 'Mới',
      value1: 20,
      value2: 30,
      color1: COLORS[Math.floor(Math.random() * COLORS.length)],
      color2: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    setDoubleBarItems([...doubleBarItems, newItem]);
  };

  const updateDoubleBarItem = (id: string, field: keyof DoubleBarItem, val: any) => {
    setDoubleBarItems(doubleBarItems.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const removeDoubleBarItem = (id: string) => {
    setDoubleBarItems(doubleBarItems.filter((p) => p.id !== id));
  };

  const updateChartItem = (isBar: boolean, id: string, field: keyof ChartItem, val: any) => {
    const setter = isBar ? setBarItems : setPieItems;
    const items = isBar ? barItems : pieItems;
    setter(items.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const removeChartItem = (isBar: boolean, id: string) => {
    const setter = isBar ? setBarItems : setPieItems;
    const items = isBar ? barItems : pieItems;
    setter(items.filter((p) => p.id !== id));
  };

  const playAudio = async () => {
    if (!audioBuffer || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    stopAudio();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleUpdateShape = (updatedShape: Shape) => setShapes((prev) => prev.map((s) => (s.id === updatedShape.id ? updatedShape : s)));
  const handleDeleteShape = (id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    setSelectedShapeId(null);
  };

  const renderDataInput = (isBar: boolean) => {
    const items = isBar ? barItems : pieItems;
    return (
      <div className="p-4 border-b border-slate-800 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            {isBar ? <BarChartBig className="w-4 h-4 text-teal-500" /> : <PieChart className="w-4 h-4 text-teal-500" />}
            Dữ liệu {isBar ? 'Cột' : 'Tròn'}
          </h2>
          <button onClick={() => addChartItem(isBar)} className="p-1 hover:bg-slate-700 rounded text-teal-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center bg-slate-800 p-2 rounded border border-slate-700">
              <input
                type="color"
                value={item.color}
                onChange={(e) => updateChartItem(isBar, item.id, 'color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateChartItem(isBar, item.id, 'label', e.target.value)}
                className="w-20 bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
                placeholder="Nhãn"
              />
              <input
                type="number"
                value={item.value}
                onChange={(e) => updateChartItem(isBar, item.id, 'value', Number(e.target.value))}
                className="w-16 bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none text-right"
              />
              <button onClick={() => removeChartItem(isBar, item.id)} className="text-red-400 hover:bg-red-900/30 p-1 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={isBar ? generateBarChart : generatePieChart}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2"
        >
          {isBar ? <BarChartBig className="w-4 h-4" /> : <PieChart className="w-4 h-4" />} Vẽ Biểu Đồ
        </button>
      </div>
    );
  };

  const renderDoubleBarDataInput = () => {
    return (
      <div className="p-4 border-b border-slate-800 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <BarChartBig className="w-4 h-4 text-teal-500" />
            Dữ liệu Cột kép
          </h2>
          <button onClick={addDoubleBarItem} className="p-1 hover:bg-slate-700 rounded text-teal-400" title="Thêm nhóm">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* NEW: Chart & Axis Titles */}
        <div className="space-y-2 mb-4">
          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <label className="text-[11px] text-slate-400">Tên biểu đồ</label>
            <input
              type="text"
              value={doubleChartTitle}
              onChange={(e) => setDoubleChartTitle(e.target.value)}
              className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
              placeholder="Ví dụ: So sánh kết quả theo khối"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800 p-2 rounded border border-slate-700">
              <label className="text-[11px] text-slate-400">Tiêu đề trục X</label>
              <input
                type="text"
                value={doubleXAxisTitle}
                onChange={(e) => setDoubleXAxisTitle(e.target.value)}
                className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
                placeholder="Ví dụ: Khối lớp"
              />
            </div>
            <div className="bg-slate-800 p-2 rounded border border-slate-700">
              <label className="text-[11px] text-slate-400">Tiêu đề trục Y</label>
              <input
                type="text"
                value={doubleYAxisTitle}
                onChange={(e) => setDoubleYAxisTitle(e.target.value)}
                className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
                placeholder="Ví dụ: Số học sinh"
              />
            </div>
          </div>
        </div>

        {/* Series Names */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <label className="text-[11px] text-slate-400">Tên dãy 1</label>
            <input
              type="text"
              value={series1Name}
              onChange={(e) => setSeries1Name(e.target.value)}
              className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
              placeholder="Ví dụ: Nam"
            />
          </div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <label className="text-[11px] text-slate-400">Tên dãy 2</label>
            <input
              type="text"
              value={series2Name}
              onChange={(e) => setSeries2Name(e.target.value)}
              className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
              placeholder="Ví dụ: Nữ"
            />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {doubleBarItems.map((item) => (
            <div key={item.id} className="bg-slate-800 p-2 rounded border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateDoubleBarItem(item.id, 'label', e.target.value)}
                  className="flex-1 bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none"
                  placeholder="Nhãn nhóm"
                />
                <button
                  onClick={() => removeDoubleBarItem(item.id)}
                  className="text-red-400 hover:bg-red-900/30 p-1 rounded"
                  title="Xoá nhóm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.color1}
                    onChange={(e) => updateDoubleBarItem(item.id, 'color1', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none"
                  />
                  <input
                    type="number"
                    value={item.value1}
                    onChange={(e) => updateDoubleBarItem(item.id, 'value1', Number(e.target.value))}
                    className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none text-right"
                    placeholder="Giá trị 1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.color2}
                    onChange={(e) => updateDoubleBarItem(item.id, 'color2', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none"
                  />
                  <input
                    type="number"
                    value={item.value2}
                    onChange={(e) => updateDoubleBarItem(item.id, 'value2', Number(e.target.value))}
                    className="w-full bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none text-right"
                    placeholder="Giá trị 2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.color1 }} />
                  <span>{series1Name || 'Dãy 1'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.color2 }} />
                  <span>{series2Name || 'Dãy 2'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={generateDoubleBarChart}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2"
        >
          <BarChartBig className="w-4 h-4" /> Vẽ Biểu Đồ Cột Kép
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-teal-500/30">
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              THẦY NAM - VẼ HÌNH THÔNG MINH
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase opacity-80">Trợ Lý Toán Học</p>
          </div>
        </div>

        <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setActiveTab('geometry')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'geometry' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3 h-3 inline mr-1" /> Hình học
          </button>
          <button
            onClick={() => setActiveTab('pie')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'pie' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-3 h-3 inline mr-1" /> Biểu đồ tròn
          </button>
          <button
            onClick={() => setActiveTab('bar')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'bar' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChartBig className="w-3 h-3 inline mr-1" /> Biểu đồ cột
          </button>
          <button
            onClick={() => setActiveTab('bar2')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'bar2' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChartBig className="w-3 h-3 inline mr-1" /> Cột kép
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col z-20">
          {activeTab === 'geometry' && (
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-500" /> Đề bài toán hình học
              </h2>
              <textarea
                className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all"
                placeholder="Nhập đề bài toán..."
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
              />
              <button
                onClick={handleProcessProblem}
                disabled={status === AppStatus.ANALYZING || status === AppStatus.SPEAKING}
                className="w-full mt-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50"
              >
                {status === AppStatus.ANALYZING ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Vẽ hình ngay
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'pie' && renderDataInput(false)}
          {activeTab === 'bar' && renderDataInput(true)}
          {activeTab === 'bar2' && renderDoubleBarDataInput()}

          <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-500" /> Giải thích từ AI
            </h2>

            {explanation ? (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-sm text-slate-300 leading-relaxed">
                  {explanation}
                </div>

                {audioBuffer && (
                  <button
                    onClick={isPlaying ? stopAudio : playAudio}
                    className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      isPlaying
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-4 h-4 fill-current" /> Dừng đọc
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" /> Nghe giải thích
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-600 py-10 text-sm">Sẵn sàng phân tích hình học cho bạn.</div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-950 relative flex flex-col p-6 overflow-auto">
          <div className="flex-1 min-h-[500px] flex items-center justify-center">
            {status === AppStatus.ANALYZING ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-400 animate-pulse">Đang kiến tạo bản vẽ...</p>
              </div>
            ) : (
              <DrawingCanvas shapes={shapes} selectedId={selectedShapeId} onSelectShape={setSelectedShapeId} />
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 text-xs text-slate-400 shadow-xl z-10">
            <span>{shapes.length} đối tượng</span>
            <div className="w-px h-4 bg-slate-700"></div>
            <span>Chọn đối tượng để tùy chỉnh</span>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900 overflow-y-auto z-20">
          <ControlPanel
            selectedShape={shapes.find((s) => s.id === selectedShapeId) || null}
            onUpdateShape={handleUpdateShape}
            onDeleteShape={handleDeleteShape}
          />
        </div>
      </main>
    </div>
  );
}
