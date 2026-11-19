import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  Activity,
  Layers,
  Terminal,
  RefreshCw,
  ShieldCheck,
  Code2,
  Palette,
  FileCheck2,
  Sparkles,
  Store,
} from 'lucide-react';
import { OrchestratorTask, AgentStatusInfo, AgentLogEntry } from '../server/orchestrator.js';
import { UserProfile } from '../types/index.js';
import { SpendingTrendChart } from './SpendingTrendChart.js';
import { useAuth } from '../contexts/AuthContext.js';

interface CommandCenterProps {
  onBackToStore: () => void;
  currentUser?: UserProfile;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onBackToStore, currentUser }) => {
  const { refreshToken } = useAuth();
  const [agents, setAgents] = useState<AgentStatusInfo[]>([]);
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [selectedTask, setSelectedTask] = useState<OrchestratorTask | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('HIGH');
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/v1/orchestrator/state');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAgents(json.data.agents || []);
          setTasks(json.data.tasks || []);
          setLogs(json.data.logs || []);
          if (!selectedTask && json.data.tasks?.length > 0) {
            setSelectedTask(json.data.tasks[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch from /api/v1/orchestrator/state, using client state.', err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatchTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsExecuting(true);
    setDispatchError(null);
    try {
      const token = await refreshToken().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/v1/orchestrator/run', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          phase: 'PHASE 1',
          priority: newTaskPriority,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setNewTaskTitle('');
        await fetchState();
        setSelectedTask(json.data);
      } else {
        setDispatchError(
          json?.error ||
            (res.status === 401 || res.status === 403
              ? 'Admin Firebase sign-in required to dispatch live backend orchestrator tasks.'
              : 'Failed to dispatch orchestrator task.')
        );
      }
    } catch (err) {
      console.error('Failed to dispatch task:', err);
      setDispatchError('Network error while contacting orchestrator API.');
    } finally {
      setIsExecuting(false);
    }
  };

  const completedTaskCount = tasks.filter((t) => t.status === 'VERIFIED').length || tasks.length;
  const totalTestsPassed = tasks.reduce((sum, t) => sum + (t.testerOutput?.testsPassed ?? 0), 0);
  const totalTestsFailed = tasks.reduce((sum, t) => sum + (t.testerOutput?.testsFailed ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060911] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Command Center Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                NEXORA CORE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 font-semibold uppercase">
                Four-Agent Orchestrator
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              Autonomous Engineering Command &amp; Telemetry Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchState}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Refresh Telemetry"
            aria-label="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onBackToStore}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-cyan-400" />
            <span>Switch to Storefront</span>
          </button>
        </div>
      </header>

      {/* Main Command Center Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* SECTION 1: THE FOUR SPECIALIZED AGENTS */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Specialized Engineering Agents</span>
            </h2>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              Workflow: Planner → Designer → Builder → Tester
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Agent 1: PLANNER */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  {agents[0]?.state || 'READY'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Agent 1: Planner</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Strategic Project Intelligence
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span>Completed Tasks</span>
                <span className="text-slate-900 dark:text-white font-bold">{completedTaskCount}</span>
              </div>
            </div>

            {/* Agent 2: DESIGNER */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  {agents[1]?.state || 'READY'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Agent 2: Designer</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  UI/UX &amp; Design Tokens
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span>Design Tokens</span>
                <span className="text-slate-900 dark:text-white font-bold">Obsidian / Pearl</span>
              </div>
            </div>

            {/* Agent 3: BUILDER */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/40">
                  <Code2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  {agents[2]?.state || 'READY'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Agent 3: Builder</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Full-Stack Implementation
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span>Active Runtime</span>
                <span className="text-slate-900 dark:text-white font-bold">Express + Vite</span>
              </div>
            </div>

            {/* Agent 4: TESTER */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  {agents[3]?.state || 'VERIFIED'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Agent 4: Tester</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Independent Verification QA
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span>Checks Recorded</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {totalTestsFailed} Failed / {totalTestsPassed} Passed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: D3 MONTHLY SPENDING TRENDS TELEMETRY */}
        <section aria-label="Monthly Spending Trends Visualizer">
          <SpendingTrendChart
            orders={currentUser?.orders || []}
            userName={currentUser?.name || 'Current User'}
          />
        </section>

        {/* SECTION 3: DISPATCH NEW TASK WORKFLOW FORM */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16]/80 shadow-xs">
          <form onSubmit={handleDispatchTask} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dispatch Engineering Task through Four-Agent Pipeline</span>
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                Sequential verification &amp; bounded retries
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Implement Atomic Stock Decrement & Reservation Expiry Clocks..."
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM')}
                className="px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="CRITICAL">CRITICAL Priority</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
              </select>

              <button
                type="submit"
                disabled={isExecuting || !newTaskTitle.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-950/20"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Task</span>
                  </>
                )}
              </button>
            </div>
            {dispatchError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {dispatchError}
              </p>
            )}
          </form>
        </div>

        {/* SECTION 4: ACTIVE TASKS BOARD & DETAILED INSPECTOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tasks List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Pipeline Tasks &amp; Acceptance Status ({tasks.length})</span>
            </h3>

            <div className="space-y-2.5">
              {tasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTask(t)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/20 ring-1 ring-cyan-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-700 dark:text-cyan-400 font-semibold">
                        {t.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        {t.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{t.title}</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{t.phase}</span>
                      <span>Priority: {t.priority}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Inspector & Agent Outputs */}
          <div className="lg:col-span-7">
            {selectedTask ? (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                      {selectedTask.id}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTask.title}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    {selectedTask.status}
                  </span>
                </div>

                {/* Planner Deliverable */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Planner Deliverables</span>
                  </h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-300">Acceptance Criteria:</p>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5">
                      {selectedTask.plannerOutput?.acceptanceCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Designer Deliverable */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Designer Specifications</span>
                  </h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Design Tokens: </span>
                      {selectedTask.designerOutput?.designTokens.join(', ')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Layout: </span>
                      {selectedTask.designerOutput?.layoutSpecs}
                    </p>
                  </div>
                </div>

                {/* Builder Deliverable */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Builder Code Output</span>
                  </h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Files Touched: </span>
                      {selectedTask.builderOutput?.filesTouched.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Tester Deliverable */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Tester Verification Report</span>
                  </h4>
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="flex justify-between font-mono">
                      <span>Tests Executed: {selectedTask.testerOutput?.testsExecuted}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        Passed: {selectedTask.testerOutput?.testsPassed}
                      </span>
                      <span>Failed: {selectedTask.testerOutput?.testsFailed}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 pt-1 text-[11px]">
                      {selectedTask.testerOutput?.findings.join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] rounded-2xl">
                Select a task to inspect agent handoffs and verification deliverables.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: REAL-TIME ORCHESTRATOR EXECUTION LOGS */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Real-Time Orchestration Telemetry &amp; Handoff Logs</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">Append-Only Audit Stream</span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="text-slate-400 text-[10px] shrink-0 pt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    log.agent === 'PLANNER'
                      ? 'bg-blue-950 text-blue-400 border border-blue-900'
                      : log.agent === 'DESIGNER'
                      ? 'bg-purple-950 text-purple-400 border border-purple-900'
                      : log.agent === 'BUILDER'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-900'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                  }`}
                >
                  {log.agent}
                </span>
                <span
                  className={`leading-relaxed ${
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
