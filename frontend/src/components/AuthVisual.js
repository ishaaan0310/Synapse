import React from 'react';
import Icon from './Icons';

// Left half of the login/register pages: a small "neural" network whose
// outer nodes are the app's areas, all wired into the twin in the middle.
const NODES = [
  { id: 'twin', x: 200, y: 200, r: 26, color: 'var(--auth-core)' },
  { id: 'health', x: 92, y: 96, r: 13, color: 'var(--health)' },
  { id: 'sleep', x: 318, y: 112, r: 11, color: 'var(--sleep)' },
  { id: 'nutrition', x: 70, y: 268, r: 14, color: 'var(--nutrition)' },
  { id: 'academic', x: 326, y: 284, r: 13, color: 'var(--academic)' },
  { id: 'documents', x: 196, y: 352, r: 10, color: 'var(--documents)' },
  { id: 'water', x: 200, y: 52, r: 9, color: 'var(--water)' }
];

const EDGES = [
  ['twin', 'health'], ['twin', 'sleep'], ['twin', 'nutrition'], ['twin', 'academic'],
  ['twin', 'documents'], ['twin', 'water'], ['health', 'water'], ['sleep', 'academic'],
  ['nutrition', 'health'], ['documents', 'academic']
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-brand">
        <span className="brand-mark"><Icon name="twin" size={20} strokeWidth={2} /></span>
        Synapse
      </div>

      <svg className="network" viewBox="0 0 400 400">
        {EDGES.map(([a, b], i) => {
          const p = byId[a];
          const q = byId[b];
          return (
            <g key={`${a}-${b}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="net-edge" />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="net-pulse"
                style={{ animationDelay: `${(i * 0.7) % 4}s` }} />
            </g>
          );
        })}
        {NODES.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r + 8} fill={n.color} opacity="0.16" />
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} className="net-node" />
          </g>
        ))}
      </svg>

      <div className="auth-copy">
        <h1>Your sleep, meals and deadlines, connected.</h1>
        <p>Synapse learns from what you log and tells you what to focus on next.</p>
      </div>
    </aside>
  );
}

export default AuthVisual;
