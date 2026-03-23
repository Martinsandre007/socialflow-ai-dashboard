import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, RadialBarChart, RadialBar } from 'recharts';
import { sentimentService, SentimentOverview, AnalyzedMention, PlatformSentimentSummary } from '../services/sentimentService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
    positive: '#10b981',
    neutral: '#6366f1',
    negative: '#ef4444',
} as const;

const PLATFORM_ICONS: Record<string, string> = {
    Instagram: '📸',
    TikTok: '🎵',
    YouTube: '▶️',
    Facebook: '👤',
    LinkedIn: '💼',
    X: '✖',
};

function ScoreBadge({ score }: { score: number }) {
    const pct = Math.round(((score + 1) / 2) * 100);
    const color = score > 0.15 ? '#10b981' : score < -0.15 ? '#ef4444' : '#6366f1';
    return (
        <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
            </svg>
            <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700, color,
            }}>
                {score > 0 ? '+' : ''}{score.toFixed(2)}
            </span>
        </div>
    );
}

function LabelPill({ label }: { label: 'positive' | 'neutral' | 'negative' }) {
    const styles: Record<string, { bg: string; color: string; icon: string }> = {
        positive: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: '😊' },
        neutral: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', icon: '😐' },
        negative: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', icon: '😠' },
    };
    const s = styles[label];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 10px', borderRadius: 999,
            backgroundColor: s.bg, color: s.color,
            fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
        }}>
            {s.icon} {label}
        </span>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '10px 14px', fontSize: 12,
        }}>
            <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function OverallGauge({ overview }: { overview: SentimentOverview }) {
    const { positivePct, neutralPct, negativePct, overall } = overview;
    const data = [
        { name: 'Positive', value: positivePct, fill: '#10b981' },
        { name: 'Neutral', value: neutralPct, fill: '#6366f1' },
        { name: 'Negative', value: negativePct, fill: '#ef4444' },
    ];

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Overall Sentiment</h3>
                    <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                        {overview.totalAnalyzed} mentions in last 24h
                    </p>
                </div>
                <LabelPill label={overall.label} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ flex: '0 0 160px', height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
                            <RadialBar dataKey="value" cornerRadius={6}>
                                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </RadialBar>
                            <Tooltip content={(props: any) => {
                                const { active, payload } = props;
                                if (active && payload?.length) {
                                    return (
                                        <div style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }}>
                                            <span style={{ color: payload[0].payload.fill }}>{payload[0].payload.name}: {payload[0].value}%</span>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.map(d => (
                        <div key={d.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.name}</span>
                                <span style={{ color: d.fill, fontWeight: 700, fontSize: 13 }}>{d.value}%</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${d.value}%`, background: d.fill,
                                    borderRadius: 999, transition: 'width 1s ease',
                                }} />
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                        <span style={{ color: '#64748b', fontSize: 11 }}>NLP Score: </span>
                        <span style={{
                            fontWeight: 800, fontSize: 18,
                            color: overall.score > 0.15 ? '#10b981' : overall.score < -0.15 ? '#ef4444' : '#818cf8',
                        }}>
                            {overall.score > 0 ? '+' : ''}{overall.score.toFixed(3)}
                        </span>
                        <span style={{ color: '#475569', fontSize: 11, marginLeft: 6 }}>({overall.confidence}% confidence)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HourlyTrend({ buckets }: { overview: SentimentOverview; buckets: SentimentOverview['hourlyTrend'] }) {
    const data = buckets.map(b => ({ ...b, name: b.hour }));
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: 24,
        }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 18px' }}>
                24-Hour Sentiment Trend
            </h3>
            <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {[
                                { id: 'pos', color: '#10b981' },
                                { id: 'neu', color: '#6366f1' },
                                { id: 'neg', color: '#ef4444' },
                            ].map(({ id, color }) => (
                                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false}
                            interval={3} dy={6} />
                        <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="positive" name="Positive" stroke="#10b981" strokeWidth={2} fill="url(#pos)" />
                        <Area type="monotone" dataKey="neutral" name="Neutral" stroke="#6366f1" strokeWidth={2} fill="url(#neu)" />
                        <Area type="monotone" dataKey="negative" name="Negative" stroke="#ef4444" strokeWidth={2} fill="url(#neg)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function PlatformBreakdown({ platforms }: { platforms: PlatformSentimentSummary[] }) {
    const trendIcon = (t: string) => t === 'improving' ? '↑' : t === 'declining' ? '↓' : '→';
    const trendColor = (t: string) => t === 'improving' ? '#10b981' : t === 'declining' ? '#ef4444' : '#6366f1';

    const chartData = platforms.map(p => ({
        name: p.platform,
        Positive: p.positive,
        Neutral: p.neutral,
        Negative: p.negative,
    }));

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: 24,
        }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 18px' }}>Sentiment by Platform</h3>
            <div style={{ height: 180, marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Positive" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Neutral" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {platforms.map(p => (
                    <div key={p.platform} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <span style={{ fontSize: 18 }}>{PLATFORM_ICONS[p.platform] || '🌐'}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, flex: 1 }}>{p.platform}</span>
                        <ScoreBadge score={p.avgScore} />
                        <span style={{
                            fontSize: 12, fontWeight: 700, color: trendColor(p.trend),
                            minWidth: 40, textAlign: 'right',
                        }}>
                            {trendIcon(p.trend)} {Math.abs(p.trendDelta).toFixed(1)}%
                        </span>
                        <span style={{ color: '#475569', fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                            {p.total} mentions
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MentionFeed({ mentions }: { mentions: AnalyzedMention[] }) {
    const timeAgo = (ts: Date) => {
        const mins = Math.round((Date.now() - ts.getTime()) / 60_000);
        if (mins < 60) return `${mins}m ago`;
        return `${Math.round(mins / 60)}h ago`;
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: 24,
        }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 16px' }}>
                Recent Mentions · Live Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
                {mentions.map(m => (
                    <div key={m.id} style={{
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${SENTIMENT_COLORS[m.sentiment.label]}22`,
                        borderLeft: `3px solid ${SENTIMENT_COLORS[m.sentiment.label]}`,
                        borderRadius: 12,
                        transition: 'background 0.2s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{PLATFORM_ICONS[m.platform] || '🌐'}</span>
                                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>{m.platform}</span>
                                <span style={{ color: '#475569', fontSize: 11 }}>@{m.author}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <LabelPill label={m.sentiment.label} />
                                <span style={{ color: '#334155', fontSize: 11 }}>{timeAgo(m.timestamp)}</span>
                            </div>
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{m.content}</p>
                        {m.sentiment.keywords.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                                {m.sentiment.keywords.map(kw => (
                                    <span key={kw} style={{
                                        fontSize: 10, padding: '2px 7px',
                                        background: `${SENTIMENT_COLORS[m.sentiment.label]}18`,
                                        color: SENTIMENT_COLORS[m.sentiment.label],
                                        borderRadius: 999, fontWeight: 600,
                                    }}>
                                        #{kw}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const SentimentAnalysis: React.FC = () => {
    const [overview, setOverview] = useState<SentimentOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (forceRefresh = false) => {
        try {
            setError(null);
            if (forceRefresh) setRefreshing(true);
            else setLoading(true);

            const data = forceRefresh
                ? await sentimentService.refreshSentiment()
                : await sentimentService.getSentimentOverview();

            setOverview(data);
        } catch (e) {
            setError('Failed to load sentiment data. Please try refreshing.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                <div style={{
                    width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)',
                    borderTop: '3px solid #6366f1', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: '#64748b', fontSize: 14 }}>Analysing sentiment across platforms…</p>
            </div>
        );
    }

    if (error || !overview) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <p style={{ fontSize: 18, marginBottom: 12 }}>⚠️ {error || 'No data available'}</p>
                <button
                    onClick={() => load(true)}
                    style={{
                        padding: '10px 24px', background: '#6366f1', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    const ts = overview.lastUpdated instanceof Date
        ? overview.lastUpdated
        : new Date(overview.lastUpdated);
    const lastUpdatedLabel = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ padding: '28px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.3px' }}>
                        🧠 Sentiment Analysis
                    </h2>
                    <p style={{ color: '#475569', fontSize: 12, margin: '4px 0 0' }}>
                        NLP-powered · {overview.totalAnalyzed} interactions analysed · Updated {lastUpdatedLabel}
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 18px',
                        background: refreshing ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
                        color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 12, cursor: refreshing ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                    }}
                >
                    <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
                        ↻
                    </span>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* Top row: Gauge + Trend */}
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
                <OverallGauge overview={overview} />
                <HourlyTrend overview={overview} buckets={overview.hourlyTrend} />
            </div>

            {/* Bottom row: Platform + Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <PlatformBreakdown platforms={overview.byPlatform} />
                <MentionFeed mentions={overview.recentMentions} />
            </div>

            {/* Keywords strip */}
            {overview.overall.keywords.length > 0 && (
                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16, padding: '14px 20px',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Top Sentiment Keywords</span>
                    {overview.overall.keywords.map((kw: string) => (
                        <span key={kw} style={{
                            padding: '4px 12px', background: 'rgba(99,102,241,0.12)',
                            color: '#818cf8', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        }}>
                            {kw}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
