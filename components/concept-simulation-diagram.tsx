'use client';

import React, { useState } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';

interface ConceptSimulationDiagramProps {
  moduleId: string;
  moduleIndex: number;
  title: string;
}

export function ConceptSimulationDiagram({
  moduleId,
  moduleIndex,
  title,
}: ConceptSimulationDiagramProps) {
  // Interactive parameter for the simulation (Learning Rate eta & Step Count)
  const [learningRate, setLearningRate] = useState<number>(0.35);
  const [stepCount, setStepCount] = useState<number>(5);

  // Compute simulated trajectory points on parabola y = (x - 50)^2 / 25
  const computeTrajectory = () => {
    const points: { x: number; y: number }[] = [];
    let currentW = -38; // start on left rim of valley (minimum is at w = 0)
    for (let i = 0; i <= stepCount; i++) {
      const loss = (currentW * currentW) / 18;
      // Map w in [-45, 45] to SVG x in [28, 292], loss in [0, 90] to SVG y in [120, 18]
      const svgX = Math.max(20, Math.min(300, 160 + currentW * 2.8));
      const svgY = Math.max(14, Math.min(126, 120 - loss * 1.15));
      points.push({ x: svgX, y: svgY });

      // Gradient of w^2 is 2*w; update w = w - lr * 2.15 * w
      currentW = currentW * (1 - learningRate * 2.15);
    }
    return points;
  };

  const trajectory = computeTrajectory();

  const regimeStatus =
    learningRate < 0.2
      ? {
          code: '▲ SLOW CONVERGENCE',
          summary:
            'Step size too small — hiker takes tiny cautious shuffles and needs many epochs.',
          tone: 'text-amber-700 dark:text-amber-300',
          badgeBg:
            'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80',
        }
      : learningRate <= 0.65
      ? {
          code: '● OPTIMAL DESCENT',
          summary:
            'Balanced learning rate — hiker descends smoothly into the valley minimum.',
          tone: 'text-emerald-700 dark:text-emerald-300',
          badgeBg:
            'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80',
        }
      : {
          code: '▲ OVERSHOOT & BOUNCE',
          summary:
            'Step size too high — hiker leaps across the canyon walls and risks diverging!',
          tone: 'text-rose-700 dark:text-rose-300',
          badgeBg:
            'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80',
        };

  return (
    <div
      id="sidebar-loss-landscape-sandbox"
      data-module-id={moduleId}
      data-module-index={moduleIndex}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-start gap-2 min-w-0">
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
              Interactive Loss Landscape Sandbox — Test the Hiker Analogy
            </h3>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Active: {title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setLearningRate(0.35);
            setStepCount(5);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Reset simulation parameters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Regime Status Pill */}
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold ${regimeStatus.badgeBg} ${regimeStatus.tone}`}
      >
        <span>{regimeStatus.code}</span>
        <span className="tabular-nums">η = {learningRate.toFixed(2)}</span>
      </div>

      {/* SVG Loss Curve Visualizer (Sized cleanly for Sidebar width) */}
      <div className="rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 p-2.5 overflow-hidden">
        <svg
          viewBox="0 0 320 142"
          className="w-full h-32 block"
          role="img"
          aria-label="Loss function valley curve showing gradient descent steps"
        >
          {/* Grid lines */}
          <line
            x1="20"
            y1="120"
            x2="300"
            y2="120"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="1"
          />
          <line
            x1="160"
            y1="12"
            x2="160"
            y2="125"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Loss Bowl Parabola */}
          <path
            d="M 28 16 Q 160 224 292 16"
            fill="none"
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-600"
            strokeWidth="2"
          />

          {/* Minimum Target Marker */}
          <circle cx="160" cy="120" r="4.5" className="fill-emerald-500" />
          <text
            x="160"
            y="136"
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[9.5px] font-mono"
          >
            Global Minimum (Valley Floor)
          </text>

          {/* Hiker Trajectory Path */}
          {trajectory.map((pt, i) => {
            const next = trajectory[i + 1];
            return (
              <g key={i}>
                {next && (
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="#4f46e5"
                    strokeWidth="1.8"
                    strokeDasharray="3 2"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={i === 0 ? 5 : i === trajectory.length - 1 ? 4.5 : 3.2}
                  className={
                    i === 0
                      ? 'fill-amber-500 stroke-white dark:stroke-slate-900 stroke-2'
                      : i === trajectory.length - 1
                      ? 'fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 stroke-2'
                      : 'fill-indigo-500/80'
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Controls */}
      <div className="space-y-2.5 pt-0.5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <label
              htmlFor="sim-lr-slider"
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              Learning Rate (η Step Size):
            </label>
            <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
              {learningRate.toFixed(2)}
            </span>
          </div>
          <input
            id="sim-lr-slider"
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={learningRate}
            onChange={(e) => setLearningRate(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            <span>0.05 (Tiny)</span>
            <span>0.35 (Ideal)</span>
            <span>0.95 (Overshoot)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label
              htmlFor="sim-steps-slider"
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              Descent Steps Simulated:
            </label>
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {stepCount} steps
            </span>
          </div>
          <input
            id="sim-steps-slider"
            type="range"
            min={2}
            max={8}
            step={1}
            value={stepCount}
            onChange={(e) => setStepCount(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {regimeStatus.summary}
        </p>
      </div>
    </div>
  );
}

