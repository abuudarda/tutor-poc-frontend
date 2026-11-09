'use client';

import React, { useState } from 'react';
import { Sliders, RotateCcw, ArrowRight } from 'lucide-react';

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
  // Interactive parameter for the simulation (e.g. Learning Rate eta or Attention Temperature)
  const [learningRate, setLearningRate] = useState<number>(0.35);
  const [stepCount, setStepCount] = useState<number>(5);

  const isLossLandscape =
    moduleId === 'mod_1' ||
    title.toLowerCase().includes('loss') ||
    title.toLowerCase().includes('gradient') ||
    moduleIndex === 0;

  // Compute simulated trajectory points on parabola y = (x - 50)^2 / 25
  const computeTrajectory = () => {
    const points: { x: number; y: number }[] = [];
    let currentW = -38; // start on left rim of valley (minimum is at w = 0)
    for (let i = 0; i <= stepCount; i++) {
      const loss = (currentW * currentW) / 18;
      // Map w in [-45, 45] to SVG x in [40, 320], loss in [0, 90] to SVG y in [130, 22]
      const svgX = Math.max(24, Math.min(336, 180 + currentW * 3.1));
      const svgY = Math.max(16, Math.min(138, 130 - loss * 1.25));
      points.push({ x: svgX, y: svgY });

      // Gradient of w^2 is 2*w; update w = w - lr * 2.2 * w
      currentW = currentW * (1 - learningRate * 2.15);
    }
    return points;
  };

  const trajectory = computeTrajectory();

  const regimeStatus =
    learningRate < 0.2
      ? {
          code: '▲ SLOW CONVERGENCE',
          summary: 'Step size too small — hiker takes tiny cautious shuffles and needs many epochs.',
          tone: 'text-amber-700 dark:text-amber-300',
        }
      : learningRate <= 0.65
      ? {
          code: '● OPTIMAL DESCENT',
          summary: 'Balanced learning rate — hiker descends smoothly into the valley minimum.',
          tone: 'text-emerald-700 dark:text-emerald-300',
        }
      : {
          code: '▲ OVERSHOOT & BOUNCE',
          summary: 'Step size too high — hiker leaps across the canyon walls and risks diverging!',
          tone: 'text-rose-700 dark:text-rose-300',
        };

  if (!isLossLandscape) {
    // Interactive Signal / Layer Propagation Sandbox for Modules 2+
    return (
      <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Interactive Signal & Depth Simulator
            </span>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
            Local Factor: {learningRate.toFixed(2)} · Active Depth: {stepCount} Layers
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 items-center">
          <div className="md:col-span-7 flex items-center justify-between gap-2 px-3 py-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
            {Array.from({ length: stepCount }, (_, idx) => {
              const signalStrength = Math.max(
                0.08,
                Math.min(1, Math.pow(Math.min(1.05, learningRate + 0.45), idx))
              );
              const pct = Math.round(signalStrength * 100);
              return (
                <React.Fragment key={idx}>
                  <div className="flex flex-col items-center min-w-[54px]">
                    <div className="w-10 h-16 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col justify-end p-1 overflow-hidden">
                      <div
                        className="w-full rounded-sm bg-indigo-600 dark:bg-indigo-500 transition-all duration-150"
                        style={{ height: `${pct}%`, opacity: Math.max(0.25, signalStrength) }}
                      />
                    </div>
                    <span className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      L{stepCount - idx} ({pct}%)
                    </span>
                  </div>
                  {idx < stepCount - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="md:col-span-5 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-gain-slider"
                  className="font-medium text-slate-700 dark:text-slate-300"
                >
                  Upstream Derivative Gain:
                </label>
                <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                  {(learningRate + 0.45).toFixed(2)}x
                </span>
              </div>
              <input
                id="sim-gain-slider"
                type="range"
                min={0.05}
                max={0.55}
                step={0.05}
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-depth-slider"
                  className="font-medium text-slate-700 dark:text-slate-300"
                >
                  Network Layers Traversed:
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {stepCount} layers
                </span>
              </div>
              <input
                id="sim-depth-slider"
                type="range"
                min={3}
                max={6}
                step={1}
                value={stepCount}
                onChange={(e) => setStepCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Interactive Loss Landscape Sandbox — Test the Hiker Analogy
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-mono font-semibold ${regimeStatus.tone}`}>
            {regimeStatus.code}
          </span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <button
            type="button"
            onClick={() => {
              setLearningRate(0.35);
              setStepCount(5);
            }}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Reset simulation parameters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 items-center">
        {/* SVG Loss Curve Visualizer */}
        <div className="md:col-span-7 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 p-3">
          <svg
            viewBox="0 0 360 155"
            className="w-full h-36 overflow-visible"
            role="img"
            aria-label="Loss function valley curve showing gradient descent steps"
          >
            {/* Grid lines */}
            <line x1="24" y1="130" x2="336" y2="130" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
            <line x1="180" y1="15" x2="180" y2="135" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />

            {/* Loss Bowl Parabola */}
            <path
              d="M 35 18 Q 180 242 325 18"
              fill="none"
              stroke="currentColor"
              className="text-slate-400 dark:text-slate-600"
              strokeWidth="2.2"
            />

            {/* Minimum Target Star/Marker */}
            <circle cx="180" cy="130" r="5" className="fill-emerald-500" />
            <text x="180" y="147" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono">
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
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === 0 ? 5.5 : i === trajectory.length - 1 ? 5 : 3.5}
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

        {/* Controls */}
        <div className="md:col-span-5 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label
                htmlFor="sim-lr-slider"
                className="font-medium text-slate-700 dark:text-slate-300"
              >
                Learning Rate (η Step Size):
              </label>
              <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                η = {learningRate.toFixed(2)}
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
            <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              <span>0.05 (Tiny)</span>
              <span>0.35 (Ideal)</span>
              <span>0.95 (Overshoot)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {regimeStatus.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
