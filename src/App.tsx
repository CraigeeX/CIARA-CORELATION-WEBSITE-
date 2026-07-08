import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Trash2, 
  Plus, 
  HelpCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  Download, 
  TrendingUp, 
  BookOpen, 
  Layers, 
  CheckCircle,
  AlertTriangle,
  Heart
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

interface DataPoint {
  id: string;
  x: string;
  y: string;
}

const DEFAULT_POINTS: DataPoint[] = [
  { id: '1', x: '10', y: '12' },
  { id: '2', x: '15', y: '18' },
  { id: '3', x: '20', y: '22' },
  { id: '4', x: '25', y: '32' },
  { id: '5', x: '30', y: '38' },
  { id: '6', x: '35', y: '40' },
  { id: '7', x: '40', y: '55' },
];

export default function App() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(DEFAULT_POINTS);
  const [csvInput, setCsvInput] = useState<string>("");
  const [showCsvHelp, setShowCsvHelp] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'calculator' | 'theory'>('calculator');

  // Parse fields safely to numeric values
  const parsedData = useMemo(() => {
    return dataPoints
      .map(p => ({
        x: parseFloat(p.x),
        y: parseFloat(p.y),
        isValid: !isNaN(parseFloat(p.x)) && !isNaN(parseFloat(p.y))
      }))
      .filter(p => p.isValid);
  }, [dataPoints]);

  // Calculations for Pearson and Spearman
  const stats = useMemo(() => {
    const n = parsedData.length;
    if (n < 2) return null;

    const xs = parsedData.map(p => p.x);
    const ys = parsedData.map(p => p.y);

    // Sums
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumX2 = xs.reduce((a, b) => a + b * b, 0);
    const sumY2 = ys.reduce((a, b) => a + b * b, 0);
    const sumXY = parsedData.reduce((sum, p) => sum + p.x * p.y, 0);

    // Means
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Pearson Correlation coefficient Formula Components
    const numeratorPearson = n * sumXY - sumX * sumY;
    const denominatorPearson = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    const r = denominatorPearson !== 0 ? numeratorPearson / denominatorPearson : 0;

    // Spearman Rank Correlation
    // Get sorting indices to resolve ranks
    const getRanks = (arr: number[]): number[] => {
      const indexed = arr.map((val, idx) => ({ val, idx }));
      // Sort ascendingly
      indexed.sort((a, b) => a.val - b.val);
      
      const ranks = new Array(arr.length).fill(0);
      let i = 0;
      while (i < indexed.length) {
        let j = i;
        // Find duplicate values to compute average ties
        while (j < indexed.length && indexed[j].val === indexed[i].val) {
          j++;
        }
        // Average rank
        const sumRanks = ((i + 1) + j) * (j - i) / 2;
        const avgRank = sumRanks / (j - i);
        for (let k = i; k < j; k++) {
          ranks[indexed[k].idx] = avgRank;
        }
        i = j;
      }
      return ranks;
    };

    const ranksX = getRanks(xs);
    const ranksY = getRanks(ys);

    // Speedman formula details: standard Pearson r on ranks
    const rankSumX = ranksX.reduce((a, b) => a + b, 0);
    const rankSumY = ranksY.reduce((a, b) => a + b, 0);
    const rankSumX2 = ranksX.reduce((a, b) => a + b * b, 0);
    const rankSumY2 = ranksY.reduce((a, b) => a + b * b, 0);
    const rankSumXY = ranksX.reduce((sum, rx, idx) => sum + rx * ranksY[idx], 0);

    const numSpearman = n * rankSumXY - rankSumX * rankSumY;
    const denSpearman = Math.sqrt(
      (n * rankSumX2 - rankSumX * rankSumX) * (n * rankSumY2 - rankSumY * rankSumY)
    );

    const rho = denSpearman !== 0 ? numSpearman / denSpearman : 0;

    // Squared difference calculation helper for simplest case (no ties)
    const dSquareds = ranksX.map((rx, idx) => {
      const diff = rx - ranksY[idx];
      return diff * diff;
    });
    const sumDSquared = dSquareds.reduce((a, b) => a + b, 0);
    const rawSpearmanFormulaUntied = 1 - (6 * sumDSquared) / (n * (n * n - 1));

    // Best fit line y = mx + c (Pearson regression helper)
    let m = 0;
    let c = 0;
    const varX = sumX2 - (sumX * sumX) / n;
    if (varX !== 0) {
      m = (sumXY - (sumX * sumY) / n) / varX;
      c = meanY - m * meanX;
    }

    return {
      n,
      sumX,
      sumY,
      sumX2,
      sumY2,
      sumXY,
      meanX,
      meanY,
      numeratorPearson,
      denominatorPearson,
      r,
      ranksX,
      ranksY,
      dSquareds,
      sumDSquared,
      rho,
      m,
      c
    };
  }, [parsedData]);

  // Guide interpretation helper
  const interpretCorrelation = (val: number) => {
    const absVal = Math.abs(val);
    let direction = val > 0 ? "Positive Correlation" : val < 0 ? "Negative Correlation" : "No Correlation";
    let strength = "None/Very Weak";

    if (absVal >= 0.9) strength = "Perfect or Extremely Strong";
    else if (absVal >= 0.7) strength = "Strong";
    else if (absVal >= 0.4) strength = "Moderate";
    else if (absVal >= 0.2) strength = "Weak";

    return { direction, strength, color: val > 0 ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40" : val < 0 ? "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40" : "text-gray-600 bg-gray-50" };
  };

  const addRow = () => {
    setDataPoints(prev => [...prev, { id: Date.now().toString(), x: '', y: '' }]);
  };

  const updateRow = (id: string, field: 'x' | 'y', value: string) => {
    setDataPoints(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeRow = (id: string) => {
    if (dataPoints.length > 2) {
      setDataPoints(prev => prev.filter(p => p.id !== id));
    } else {
      alert("You need at least 2 data points to measure correlation.");
    }
  };

  const clearData = () => {
    setDataPoints([{ id: '1', x: '', y: '' }, { id: '2', x: '', y: '' }]);
  };

  const applyCsv = () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.split(/[\n,;]/);
    const newPoints: DataPoint[] = [];
    let currentX: string | null = null;

    lines.forEach((value) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      
      if (currentX === null) {
        currentX = trimmed;
      } else {
        newPoints.push({
          id: Math.random().toString(),
          x: currentX,
          y: trimmed
        });
        currentX = null;
      }
    });

    if (newPoints.length >= 2) {
      setDataPoints(newPoints);
      setCsvInput("");
    } else {
      alert("Invalid CSV structure. Please parse matching sets of at least 2 coordinate pairs.");
    }
  };

  const loadSampleDataset = (type: 'linear' | 'nonlinear' | 'perfect') => {
    if (type === 'linear') {
      setDataPoints([
        { id: '1', x: '5', y: '10' },
        { id: '2', x: '10', y: '24' },
        { id: '3', x: '15', y: '29' },
        { id: '4', x: '20', y: '45' },
        { id: '5', x: '25', y: '49' },
        { id: '6', x: '30', y: '61' },
      ]);
    } else if (type === 'nonlinear') {
      setDataPoints([
        { id: '1', x: '1', y: '1' },
        { id: '2', x: '2', y: '4' },
        { id: '3', x: '3', y: '9' },
        { id: '4', x: '4', y: '16' },
        { id: '5', x: '5', y: '25' },
        { id: '6', x: '6', y: '36' },
      ]);
    } else if (type === 'perfect') {
      setDataPoints([
        { id: '1', x: '10', y: '100' },
        { id: '2', x: '20', y: '90' },
        { id: '3', x: '30', y: '80' },
        { id: '4', x: '40', y: '70' },
        { id: '5', x: '50', y: '60' },
      ]);
    }
  };

  // Generate trend line data for the Recharts display
  const chartData = useMemo(() => {
    if (!stats) return [];
    
    // Sort raw points for standard line projection
    const sorted = [...parsedData].sort((a, b) => a.x - b.x);
    if (sorted.length === 0) return [];

    const minX = Math.min(...parsedData.map(p => p.x));
    const maxX = Math.max(...parsedData.map(p => p.x));

    return parsedData.map((p) => {
      const estimatedY = stats.m * p.x + stats.c;
      return {
        name: `X: ${p.x}`,
        X: p.x,
        Y: p.y,
        trendline: parseFloat(estimatedY.toFixed(3))
      };
    });
  }, [parsedData, stats]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950">
      
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2.5 rounded-xl text-slate-950 shadow-lg shadow-teal-500/20">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Pearson & Spearman Correlation Calculator
              </h1>
              <p className="text-xs text-slate-400">Step-by-step analytical equations & visual comparisons</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'calculator' 
                  ? 'bg-teal-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              📊 App & Solver
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'theory' 
                  ? 'bg-teal-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              💡 Learn The Math
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-grow">
        {activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Data Grid Input */}
            <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-slate-800/80 p-5 md:p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <h2 className="text-lg font-bold text-white">Input Coordinates Dataset</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={clearData} 
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-900 transition-colors"
                    title="Clear variables grid"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sample Quick Load Buttons */}
              <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 text-xs">
                <span className="text-slate-400 block mb-2 font-medium">Load Preset Datasets:</span>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => loadSampleDataset('linear')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors"
                  >
                    📈 Linear Fit
                  </button>
                  <button 
                    onClick={() => loadSampleDataset('nonlinear')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors"
                  >
                    🌀 Exponential Arc
                  </button>
                  <button 
                    onClick={() => loadSampleDataset('perfect')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors"
                  >
                    📉 Inverse Direct
                  </button>
                </div>
              </div>

              {/* Interactive Cells List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 uppercase font-semibold px-2">
                  <div className="col-span-2 text-center">Row</div>
                  <div className="col-span-4">Variable X</div>
                  <div className="col-span-4">Variable Y</div>
                  <div className="col-span-2 text-right">Delete</div>
                </div>

                {dataPoints.map((point, index) => (
                  <div key={point.id} className="grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="col-span-2 text-center text-slate-500 font-bold text-xs">
                      #{index + 1}
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        placeholder="X value"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-emerald-400 focus:ring-1 focus:ring-teal-500 outline-none text-right"
                        value={point.x}
                        onChange={(e) => updateRow(point.id, 'x', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        placeholder="Y value"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-purple-400 focus:ring-1 focus:ring-teal-500 outline-none text-right"
                        value={point.y}
                        onChange={(e) => updateRow(point.id, 'y', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => removeRow(point.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={addRow}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-lg text-sm text-teal-400 font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" /> Add Row Variable
                </button>
              </div>

              {/* Paste CSV Area */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" /> Bulk Paste values
                  </span>
                  <button 
                    onClick={() => setShowCsvHelp(!showCsvHelp)}
                    className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-3 h-3" /> Quick guide
                  </button>
                </div>

                {showCsvHelp && (
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5 mb-3">
                    <p>Paste numbers separated by commas or newlines sequence inside the field.</p>
                    <p className="font-mono bg-slate-950 p-1.5 rounded text-teal-300 text-[10px]">
                      10, 12, 15, 18, 20, 22
                    </p>
                    <p className="text-[10px]">Will generate 3 coordinate points (10,12), (15,18), and (20,22).</p>
                  </div>
                )}

                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-teal-500 outline-none h-16 font-mono resize-none"
                  placeholder="Paste X, Y coordinates..."
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                />
                <button
                  onClick={applyCsv}
                  disabled={!csvInput.trim()}
                  className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs py-2 rounded-md mt-2 transition font-semibold"
                >
                  Parse & Insert Into Table
                </button>
              </div>
            </div>

            {/* Right Column: Visual Dashboard and calculations */}
            <div className="lg:col-span-7 space-y-6">
              
              {!stats ? (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-8 text-center space-y-4">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-xl font-bold text-white">Insufficient Plot Points</h3>
                  <p className="text-slate-400 max-w-sm mx-auto text-sm">
                    Please provide at least 2 complete numerical coordinate points in the list input side to enable calculations.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Gauges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pearson Card */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-teal-400">Pearson Coefficient $r$</h4>
                          <p className="text-xs text-slate-400">Assesses linear relationship</p>
                        </div>
                        <span className="text-[10px] bg-teal-950 text-teal-300 px-2 py-0.5 rounded-full font-mono">Parametric</span>
                      </div>
                      
                      <div className="my-3 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white tracking-tight">
                          {stats.r.toFixed(5)}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">r²: {(stats.r * stats.r).toFixed(3)}</span>
                      </div>

                      {(() => {
                        const style = interpretCorrelation(stats.r);
                        return (
                          <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-block ${style.color}`}>
                            {style.direction} ({style.strength})
                          </div>
                        );
                      })()}
                    </div>

                    {/* Spearman Card */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Spearman Rank $\rho$</h4>
                          <p className="text-xs text-slate-400">Assesses monotonic curve</p>
                        </div>
                        <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full font-mono">Non-parametric</span>
                      </div>

                      <div className="my-3 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-white tracking-tight">
                          {stats.rho.toFixed(5)}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">ρ²: {(stats.rho * stats.rho).toFixed(3)}</span>
                      </div>

                      {(() => {
                        const style = interpretCorrelation(stats.rho);
                        return (
                          <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-block ${style.color}`}>
                            {style.direction} ({style.strength})
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Scatter Chart Visualisation */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> Interactive Regression Plot
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Line: $Y = {stats.m.toFixed(2)}x {stats.c >= 0 ? `+ ${stats.c.toFixed(2)}` : `- ${Math.abs(stats.c).toFixed(2)}`}$
                      </span>
                    </div>

                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis 
                            type="number" 
                            dataKey="X" 
                            name="X" 
                            stroke="#64748b" 
                            fontSize={11}
                            domain={['auto', 'auto']}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="Y" 
                            name="Y" 
                            stroke="#64748b" 
                            fontSize={11}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3', stroke: '#ef4444' }} 
                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px' }}
                          />
                          <Scatter 
                            name="Sample coordinates" 
                            data={chartData} 
                            fill="#0d9488" 
                            line={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '2 2' }} 
                            lineJointType="joint"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Complete Step by Step Working Explanation */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 md:p-6 space-y-6">
                    <div className="border-b border-slate-800/80 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-teal-400" /> Mathematical Step-by-Step Proofs
                      </h3>
                      <p className="text-xs text-slate-400">Transparent computation derived straight from your inputs</p>
                    </div>

                    {/* Step 1: Sums & Basics */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-teal-400 tracking-wide uppercase">Step 1: Compute Aggregate Sums</span>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-9050 border border-slate-900 rounded-lg">
                          <div className="text-slate-400 font-medium">Sample Count ($N$)</div>
                          <div className="text-white text-base font-bold font-mono mt-0.5">{stats.n}</div>
                        </div>
                        <div className="p-2.5 bg-slate-9050 border border-slate-900 rounded-lg">
                          <div className="text-slate-400 font-medium">Sum $X$</div>
                          <div className="text-white text-base font-bold font-mono mt-0.5">{stats.sumX}</div>
                        </div>
                        <div className="p-2.5 bg-slate-9050 border border-slate-900 rounded-lg">
                          <div className="text-slate-400 font-medium">Sum $Y$</div>
                          <div className="text-white text-base font-bold font-mono mt-0.5">{stats.sumY}</div>
                        </div>
                        <div className="p-2.5 bg-slate-9050 border border-slate-900 rounded-lg">
                          <div className="text-slate-400 font-medium">Sum $X^2$</div>
                          <div className="text-white text-base font-bold font-mono mt-0.5">{stats.sumX2}</div>
                        </div>
                        <div className="p-2.5 bg-slate-9050 border border-slate-900 rounded-lg">
                          <div className="text-slate-400 font-medium text-xs">Sum $Y^2$</div>
                          <div className="text-white text-base font-bold font-mono mt-0.5">{stats.sumY2}</div>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 text-xs text-slate-300 font-mono inline-block">
                        Sum $XY$ = <strong>{stats.sumXY}</strong>
                      </div>
                    </div>

                    {/* Step 2: Pearson formula expansion */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-teal-400 tracking-wide uppercase">Step 2: Pearson Correlation Formula Expansion</span>
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
                        <div>
                          <strong>Equation Formula:</strong>
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center my-2 text-white">
                            r = [ NΣXY - (ΣX)(ΣY) ] / √[ [NΣX² - (ΣX)²] * [NΣY² - (ΣY)²] ]
                          </div>
                        </div>
                        <div>
                          <strong>Part A: Numerator calculation</strong>
                          <div className="text-slate-400 mt-1">
                            {stats.n}({stats.sumXY}) - ({stats.sumX})({stats.sumY})
                            = <span className="text-teal-400">{stats.numeratorPearson}</span>
                          </div>
                        </div>
                        <div>
                          <strong>Part B: Denominator calculation</strong>
                          <div className="text-slate-400 mt-1">
                            √[ [{stats.n}({stats.sumX2}) - ({stats.sumX}²)] * [{stats.n}({stats.sumY2}) - ({stats.sumY}²)] ]
                            = <span className="text-teal-400">{stats.denominatorPearson.toFixed(5)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span>Final Computed Pearson (r)</span>
                          <span className="text-white font-bold">{stats.r.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Spearman ranking explanation */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-purple-400 tracking-wide uppercase">Step 3: Spearman's Rank Coordinate Matrix</span>
                      <p className="text-xs text-slate-400">
                        Variables are assigned ascending rank values (averaging equivalent ties). Pearson formula is then applied on the rank variables:
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 uppercase font-semibold text-[10px]">
                              <th className="p-2 border-b border-slate-800">Raw X</th>
                              <th className="p-2 border-b border-slate-800">Ranked Rx</th>
                              <th className="p-2 border-b border-slate-800">Raw Y</th>
                              <th className="p-2 border-b border-slate-800">Ranked Ry</th>
                              <th className="p-2 border-b border-slate-800 text-right">d (Rx - Ry)</th>
                              <th className="p-2 border-b border-slate-800 text-right">d²</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                            {parsedData.map((p, idx) => {
                              const diff = stats.ranksX[idx] - stats.ranksY[idx];
                              return (
                                <tr key={idx} className="hover:bg-slate-900/50">
                                  <td className="p-2 text-emerald-400">{p.x}</td>
                                  <td className="p-2 font-bold">{stats.ranksX[idx]}</td>
                                  <td className="p-2 text-purple-400">{p.y}</td>
                                  <td className="p-2 font-bold">{stats.ranksY[idx]}</td>
                                  <td className="p-2 text-right text-slate-400">{diff.toFixed(1)}</td>
                                  <td className="p-2 text-right text-teal-400">{stats.dSquareds[idx].toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
                        <div>
                          <strong>Sum of Squared differences (Σd²):</strong> <span className="text-purple-400">{stats.sumDSquared.toFixed(3)}</span>
                        </div>
                        <div>
                          <strong>Direct Spearman Equation (When ties are negligible / absent):</strong>
                          <div className="bg-slate-950 p-2 rounded text-center my-1.5 text-white">
                            ρ = 1 - [6 * Σd²] / [N(N² - 1)]
                          </div>
                          <div className="text-slate-400 mt-1">
                            1 - (6 * {stats.sumDSquared.toFixed(2)}) / ({stats.n}({stats.n * stats.n - 1})) = <span className="text-emerald-400">{stats.rho.toFixed(5)}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 italic">
                          Note: Our calculations automatically correct for value ties dynamically using standard continuous ranking adjustments.
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              )}

            </div>

          </div>
        ) : (
          /* Learning & Theory Section */
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-8 max-w-3xl mx-auto">
            
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Understanding Correlation Coefficients
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">
                Correlation measures the statistical strength and direction of the relationship between two quantitative variables. 
                Whether you should focus on Pearson or Spearman depends completely on the structure and distribution of your data.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-xs bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-full font-bold">PARAMETRIC</span>
                <h3 className="text-lg font-bold text-white">Pearson Coefficient ($r$)</h3>
                <p className="text-xs text-slate-400">
                  Measures the linear association between two continuous variables. It evaluates if coordinates fall 
                  accurately along a straight line vector ($Y = mX + C$).
                </p>
                <div className="space-y-1 pt-2">
                  <h4 className="text-xs font-bold text-slate-300">Best used when:</h4>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Data exhibits normal bell curve distribution</li>
                    <li>The relationship is strictly linear</li>
                    <li>No massive extreme values/outliers</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-bold font-mono">NON-PARAMETRIC</span>
                <h3 className="text-lg font-bold text-white font-mono">Spearman Rank ($\rho$)</h3>
                <p className="text-xs text-slate-400">
                  Measures monotonic relationships (i.e. whether one variable increases or decreases as the other does, 
                  regardless of the curvature level).
                </p>
                <div className="space-y-1 pt-2">
                  <h4 className="text-xs font-bold text-slate-300">Best used when:</h4>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>The trend is non-linear curved shape (exponential, logarithmic)</li>
                    <li>Data is ordinal / rank priority based</li>
                    <li>Data contains outstanding wild outliers</li>
                  </ul>
                </div>
              </div>

            </div>

            <section className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white">Strengths Quick Cheat Sheet:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-950 rounded border border-slate-900">
                  <span className="text-red-400 text-xs font-bold block">0.0 to 0.2</span>
                  <p className="text-[10px] text-slate-500 mt-1">Negligible / Uncorrelated</p>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-900">
                  <span className="text-amber-400 text-xs font-bold block">0.2 to 0.4</span>
                  <p className="text-[10px] text-slate-500 mt-1">Weak Correlation</p>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-900">
                  <span className="text-yellow-400 text-xs font-bold block">0.4 to 0.7</span>
                  <p className="text-[10px] text-slate-500 mt-1">Moderate Correlation</p>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-900">
                  <span className="text-emerald-400 text-xs font-bold block">0.7 to 1.0</span>
                  <p className="text-[10px] text-slate-500 mt-1">Strong Relationship</p>
                </div>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Footer conforming to requested rules */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Advanced Correlation Workspace. Built for academic research, validation, and analytics.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> by 
            <a 
              href="https://github.com/craigeex" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-bold text-teal-400 hover:underline"
            >
              craigeex
            </a> 
            via <span className="text-purple-400 font-bold">Ciara Code</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
