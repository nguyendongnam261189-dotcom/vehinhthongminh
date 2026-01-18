import React, { useState, useEffect, useRef } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import ControlPanel from './components/ControlPanel';
import { geminiService } from './services/geminiService';
import { Shape, AppStatus, ShapeType } from './types';
import { Calculator, Mic, Play, Square, Loader2, Sparkles, AlertCircle, PieChart, Plus, Trash2, BarChartBig } from 'lucide-react';

const EXAMPLE_PROBLEM = "Cho tam giác ABC đều. Vẽ đường cao AH. Gọi M là trung điểm của AC. Vẽ đường tròn tâm M bán kính MC.";

interface ChartItem {
    id: string;
    label: string;
    value: number;
    color: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'geometry' | 'pie' | 'bar'>('geometry');
  
  // Geometry State
  const [problemText, setProblemText] = useState(EXAMPLE_PROBLEM);
  
  // Chart Data State
  const [pieItems, setPieItems] = useState<ChartItem[]>([
      { id: '1', label: 'Nhóm A', value: 30, color: COLORS[0] },
      { id: '2', label: 'Nhóm B', value: 50, color: COLORS[1] },
      { id: '3', label: 'Nhóm C', value: 20, color: COLORS[2] },
  ]);

  const [barItems, setBarItems] = useState<ChartItem[]>([
      { id: '1', label: 'Tháng 1', value: 45, color: COLORS[3] },
      { id: '2', label: 'Tháng 2', value: 80, color: COLORS[4] },
      { id: '3', label: 'Tháng 3', value: 60, color: COLORS[5] },
      { id: '4', label: 'Tháng 4', value: 95, color: COLORS[6] },
  ]);

  // Common State
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [explanation, setExplanation] = useState<string>("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => { audioContextRef.current?.close(); };
  }, []);

  // --- Geometry Logic ---
  const handleProcessProblem = async () => {
    if (!problemText.trim()) return;
    setStatus(AppStatus.ANALYZING);
    setShapes([]);
    setExplanation("");
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
         } catch(e) { console.warn(e); }
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
    const cx = 400, cy = 300, r = 200;
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
      const maxValue = Math.max(...barItems.map(i => i.value));
      const scaleFactor = maxValue === 0 ? 1 : (chartHeight - 50) / maxValue;

      newShapes.push({ id: 'axis-y', type: ShapeType.LINE, x1: originX, y1: originY, x2: originX, y2: originY - chartHeight, color: '#cbd5e1', strokeWidth: 2, strokeStyle: 'solid', arrow: true });
      newShapes.push({ id: 'axis-x', type: ShapeType.LINE, x1: originX, y1: originY, x2: originX + chartWidth, y2: originY, color: '#cbd5e1', strokeWidth: 2, strokeStyle: 'solid', arrow: true });

      barItems.forEach((item, index) => {
          const gap = 30;
          const barWidth = (chartWidth - (gap * (barItems.length + 1))) / barItems.length;
          const barHeight = item.value * scaleFactor;
          const x = originX + gap + index * (barWidth + gap);
          const y = originY - barHeight;

          newShapes.push({
              id: `bar-${item.id}`,
              type: ShapeType.POLYGON,
              points: [{x, y: originY}, {x: x + barWidth, y: originY}, {x: x + barWidth, y}, {x, y}],
              fill: item.color,
              opacity: 1,
              color: '#ffffff',
              strokeWidth: 2,
              pattern: 'none'
          });
          newShapes.push({ id: `label-${item.id}`, type: ShapeType.TEXT, x: x + barWidth / 2, y: originY + 25, content: item.label, color: '#e2e8f0', fontSize: 14 });
          newShapes.push({ id: `val-${item.id}`, type: ShapeType.TEXT, x: x + barWidth / 2, y: y - 10, content: item.value.toString(), color: '#ffffff', fontSize: 14 });
      });
      setShapes(newShapes);
      setExplanation(`Biểu đồ cột so sánh ${barItems.length} đối tượng.`);
      setSelectedShapeId(null);
  };

  const addChartItem = (isBar: boolean) => {
    const id = Date.now().toString();
    const newItem = { id, label: 'Mới', value: 20, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    if (isBar) setBarItems([...barItems, newItem]);
    else setPieItems([...pieItems, newItem]);
  };

  const updateChartItem = (isBar: boolean, id: string, field: keyof ChartItem, val: any) => {
    const setter = isBar ? setBarItems : setPieItems;
    const items = isBar ? barItems : pieItems;
    setter(items.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const removeChartItem = (isBar: boolean, id: string) => {
    const setter = isBar ? setBarItems : setPieItems;
    const items = isBar ? barItems : pieItems;
    setter(items.filter(p => p.id !== id));
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
    if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch(e) {} audioSourceRef.current = null; }
    setIsPlaying(false);
  };

  const handleUpdateShape = (updatedShape: Shape) => setShapes(prev => prev.map(s => s.id === updatedShape.id ? updatedShape : s));
  const handleDeleteShape = (id: string) => { setShapes(prev => prev.filter(s => s.id !== id)); setSelectedShapeId(null); };

  const renderDataInput = (isBar: boolean) => {
      const items = isBar ? barItems : pieItems;
      return (
        <div className="p-4 border-b border-slate-800 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    {isBar ? <BarChartBig className="w-4 h-4 text-teal-500"/> : <PieChart className="w-4 h-4 text-teal-500"/>}
                    Dữ liệu {isBar ? 'Cột' : 'Tròn'}
                </h2>
                <button onClick={() => addChartItem(isBar)} className="p-1 hover:bg-slate-700 rounded text-teal-400"><Plus className="w-4 h-4"/></button>
            </div>
            <div className="space-y-2 mb-4">
                {items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center bg-slate-800 p-2 rounded border border-slate-700">
                        <input type="color" value={item.color} onChange={(e) => updateChartItem(isBar, item.id, 'color', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"/>
                        <input type="text" value={item.label} onChange={(e) => updateChartItem(isBar, item.id, 'label', e.target.value)} className="w-20 bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none" placeholder="Nhãn"/>
                        <input type="number" value={item.value} onChange={(e) => updateChartItem(isBar, item.id, 'value', Number(e.target.value))} className="w-16 bg-transparent text-sm border-b border-slate-600 focus:border-teal-500 outline-none text-right"/>
                        <button onClick={() => removeChartItem(isBar, item.id)} className="text-red-400 hover:bg-red-900/30 p-1 rounded"><Trash2 className="w-3 h-3"/></button>
                    </div>
                ))}
            </div>
            <button onClick={isBar ? generateBarChart : generatePieChart} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2">
                {isBar ? <BarChartBig className="w-4 h-4" /> : <PieChart className="w-4 h-4" />} Vẽ Biểu Đồ
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
              THẦY HÙNG - VẼ HÌNH THÔNG MINH
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase opacity-80">Trợ Lý Toán Học</p>
          </div>
        </div>
        <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
            <button onClick={() => setActiveTab('geometry')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'geometry' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Calculator className="w-3 h-3 inline mr-1"/> Hình học</button>
            <button onClick={() => setActiveTab('pie')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'pie' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><PieChart className="w-3 h-3 inline mr-1"/> Biểu đồ tròn</button>
            <button onClick={() => setActiveTab('bar')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'bar' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><BarChartBig className="w-3 h-3 inline mr-1"/> Biểu đồ cột</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col z-20">
          {activeTab === 'geometry' && (
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 text-teal-500"/> Đề bài toán hình học</h2>
                <textarea className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all" placeholder="Nhập đề bài toán..." value={problemText} onChange={(e) => setProblemText(e.target.value)} />
                <button onClick={handleProcessProblem} disabled={status === AppStatus.ANALYZING || status === AppStatus.SPEAKING} className="w-full mt-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50">
                  {status === AppStatus.ANALYZING ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <><Sparkles className="w-4 h-4" /> Vẽ hình ngay</>}
                </button>
              </div>
          )}
          {activeTab === 'pie' && renderDataInput(false)}
          {activeTab === 'bar' && renderDataInput(true)}
          <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Mic className="w-4 h-4 text-purple-500"/> Giải thích từ AI</h2>
            {explanation ? (
                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-sm text-slate-300 leading-relaxed">{explanation}</div>
                    {audioBuffer && (
                        <button onClick={isPlaying ? stopAudio : playAudio} className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {isPlaying ? <><Square className="w-4 h-4 fill-current"/> Dừng đọc</> : <><Play className="w-4 h-4 fill-current"/> Nghe giải thích</>}
                        </button>
                    )}
                </div>
            ) : <div className="text-center text-slate-600 py-10 text-sm">Sẵn sàng phân tích hình học cho bạn.</div>}
          </div>
        </div>
        <div className="flex-1 bg-slate-950 relative flex flex-col p-6 overflow-auto">
          <div className="flex-1 min-h-[500px] flex items-center justify-center">
             {status === AppStatus.ANALYZING ? (
                 <div className="flex flex-col items-center gap-4">
                     <div className="relative w-16 h-16"><div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div><div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
                     <p className="text-slate-400 animate-pulse">Đang kiến tạo bản vẽ...</p>
                 </div>
             ) : <DrawingCanvas shapes={shapes} selectedId={selectedShapeId} onSelectShape={setSelectedShapeId} />}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 text-xs text-slate-400 shadow-xl z-10">
               <span>{shapes.length} đối tượng</span>
               <div className="w-px h-4 bg-slate-700"></div>
               <span>Chọn đối tượng để tùy chỉnh</span>
          </div>
        </div>
        <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900 overflow-y-auto z-20">
          <ControlPanel selectedShape={shapes.find(s => s.id === selectedShapeId) || null} onUpdateShape={handleUpdateShape} onDeleteShape={handleDeleteShape} />
        </div>
      </main>
    </div>
  );
}