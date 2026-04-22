import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);



type SkillData = {
  label: string;
  demand: number;
  user: number;
};

type EnrichedSkill = SkillData & {
  gap: number;
  risk: number;
  opportunity: number;
};

type ViewMode = 'gap' | 'demand' | 'user';

/* ---------------- DATA ---------------- */

const skillData: SkillData[] = [
  { label: 'React / Next.js', demand: 85, user: 92 },
  { label: 'PostgreSQL', demand: 65, user: 40 },
  { label: 'TypeScript', demand: 78, user: 88 },
  { label: 'Cloud infrastructure', demand: 55, user: 20 },
  { label: 'System design', demand: 90, user: 50 },
];

/* ---------------- LOGIC ---------------- */

function enrich(data: SkillData[]): EnrichedSkill[] {
  return data.map(s => {
    const gap = s.demand - s.user;
    const risk = Math.max(0, gap) * (s.demand / 100);
    const opportunity = s.user > s.demand ? 0 : gap + s.demand * 0.1;

    return { ...s, gap, risk, opportunity };
  });
}

/* ---------------- UI ---------------- */

function Card({
  title,
  value,
  subtitle
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      border: '1px solid #e5e5e5',
      background: '#fff',
      minWidth: 160
    }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, opacity: 0.6 }}>{subtitle}</div>}
    </div>
  );
}

function Pill({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid #ddd',
        background: active ? '#111' : '#fff',
        color: active ? '#fff' : '#111',
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );
}

/* ---------------- MAIN ---------------- */

export default function TrendingDashboard() {
  const enriched = useMemo(() => enrich(skillData), []);
  const [selected, setSelected] = useState<EnrichedSkill | null>(null);
  const [view, setView] = useState<ViewMode>('gap');

  const topGap = enriched.reduce((a, b) => (b.gap > a.gap ? b : a));
  const avgGap = enriched.reduce((a, b) => a + b.gap, 0) / enriched.length;

  const riskScore = enriched.reduce((a, b) => a + b.risk, 0);

  const sorted = useMemo(() => {
    const copy = [...enriched];
    if (view === 'gap') return copy.sort((a, b) => b.gap - a.gap);
    if (view === 'demand') return copy.sort((a, b) => b.demand - a.demand);
    return copy.sort((a, b) => b.user - a.user);
  }, [view, enriched]);

  const chartData = {
    labels: sorted.map(s => s.label),
    datasets: [
      {
        label: 'Demand',
        data: sorted.map(s => s.demand),
        backgroundColor: '#cfcfcf'
      },
      {
        label: 'User level',
        data: sorted.map(s => s.user),
        backgroundColor: '#444'
      }
    ]
  };

  const donut = {
    labels: ['Healthy', 'At risk', 'Critical'],
    datasets: [
      {
        data: [
          enriched.filter(s => s.gap < 10).length,
          enriched.filter(s => s.gap >= 10 && s.gap < 30).length,
          enriched.filter(s => s.gap >= 30).length
        ],
        backgroundColor: ['#4e8f72', '#b89a5a', '#b05c5c']
      }
    ]
  };

  return (
    <div style={{ padding: 28, fontFamily: 'Arial', background: '#fafafa' }}>

      {/* HEADER METRICS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Card title="Average gap" value={avgGap.toFixed(1)} />
        <Card title="Risk score" value={riskScore.toFixed(1)} />
        <Card title="Highest gap" value={topGap.label} subtitle={topGap.gap.toFixed(1)} />
        <Card title="Skills tracked" value={enriched.length} />
      </div>

      {/* VIEW SWITCH */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Pill active={view === 'gap'} label="Gap view" onClick={() => setView('gap')} />
        <Pill active={view === 'demand'} label="Market demand" onClick={() => setView('demand')} />
        <Pill active={view === 'user'} label="User focus" onClick={() => setView('user')} />
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>

        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #e5e5e5'
        }}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              onClick: (_, elements) => {
                if (!elements.length) return;
                const index = elements[0].index;
                setSelected(sorted[index]);
              }
            }}
          />
        </div>

        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #e5e5e5'
        }}>
          <Doughnut data={donut} />
        </div>

      </div>

      {/* INSIGHT PANEL */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #e5e5e5'
        }}>
          <h3>Skill intelligence</h3>

          {selected ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{selected.label}</div>

              <p>Demand score: {selected.demand}</p>
              <p>User level: {selected.user}</p>
              <p>Gap: {selected.gap}</p>
              <p>Risk index: {selected.risk.toFixed(1)}</p>
              <p>Opportunity score: {selected.opportunity.toFixed(1)}</p>
            </div>
          ) : (
            <p>Select a bar to inspect a skill</p>
          )}
        </div>

        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #e5e5e5'
        }}>
          <h3>Action layer</h3>

          <div style={{ marginBottom: 10 }}>
            Focus immediately on {topGap.label}
          </div>

          <div style={{ marginBottom: 10 }}>
            Reduce gap in high demand skills above 30 points first
          </div>

          <div>
            Rebalance roadmap towards system design and cloud infrastructure
          </div>
        </div>

      </div>
    </div>
  );
}