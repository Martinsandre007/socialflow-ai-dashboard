import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { SponsoredBadge } from './ui/SponsoredBadge';
import { ViewProps } from '../types';
import { SiInstagram, SiYoutube, SiFacebook, SiLinkedin } from 'react-icons/si';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analyticsService, AggregatedData } from '../services/analyticsService';

const MaterialIcon = ({ name, className }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const Dashboard: React.FC<ViewProps> = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await analyticsService.getAggregatedData(timeRange);
      setData(res);
      setLoading(false);
    };
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  if (loading || !data) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  // Activity data remains mocked for now or could be pulled from elsewhere
  const activityData = [
    { id: 1, type: 'sponsored_post', platform: 'Instagram', text: 'Sponsored post is performing well', time: '1h ago', isSponsored: true, sponsorshipTier: 'premium' as const, stats: { likes: 1250, views: 8400 } },
    { id: 2, type: 'post', platform: 'Instagram', text: 'New post published', time: '2h ago', isSponsored: false },
    { id: 3, type: 'sponsored_post', platform: 'Facebook', text: 'Enterprise promotion reaching target audience', time: '3h ago', isSponsored: true, sponsorshipTier: 'enterprise' as const, stats: { likes: 2100, views: 15600 } },
    { id: 4, type: 'milestone', platform: 'YouTube', text: 'Hit 10k subscribers', time: '4h ago', isSponsored: false },
    { id: 5, type: 'alert', platform: 'System', text: 'Weekly report ready', time: '5h ago', isSponsored: false },
    { id: 6, type: 'sponsored_post', platform: 'LinkedIn', text: 'Basic promotion completed successfully', time: '6h ago', isSponsored: true, sponsorshipTier: 'basic' as const, stats: { likes: 340, views: 2100 } },
  ];

  const chartData = data.performanceHistory.map(h => ({
    name: h.date.split('-').slice(1).join('/'), // MM/DD
    value: h.engagement,
    followers: h.followers
  }));

  return (
    <div className="p-7 space-y-7 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Overview</h2>
        <div className="flex gap-2">
          <select 
            value={timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            onChange={(e) => setTimeRange(e.target.value === 'Last 30 Days' ? '30d' : '7d')}
            className="bg-dark-surface text-sm text-gray-subtext border border-dark-border rounded-xl px-4 py-2 focus:outline-none focus:border-primary-blue transition-colors"
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Followers" 
          value={`${(data.totalFollowers / 1000).toFixed(1)}k`}
          change={`+${data.followerGrowth}%`} 
          icon={<MaterialIcon name="group" className="text-primary-blue" />} 
        />
        <StatCard 
          title="Engagement Rate" 
          value={`${data.engagementRate}%`}
          change="+2.1%" 
          icon={<MaterialIcon name="monitoring" className="text-primary-teal" />} 
        />
        <StatCard 
          title="Brand Health" 
          value={`${data.sentimentInsights?.brandHealthScore}/100`}
          change={data.sentimentData?.overall.score! > 0 ? "Positive" : "Improving"}
          icon={<MaterialIcon name="favorite" className="text-pink-400" />} 
        />
        <StatCard 
          title="Net Sentiment" 
          value={data.sentimentData?.overall.score! > 0 ? `+${data.sentimentData?.overall.score}` : `${data.sentimentData?.overall.score}`}
          change={`${data.sentimentData?.overall.confidence}% confidence`}
          icon={<MaterialIcon name="psychology" className="text-orange-400" />} 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-7">
          <Card>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Performance Overview</h3>
                <p className="text-sm text-gray-subtext">Engagement & NLP Sentiment Trends</p>
              </div>
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-subtext transition-colors"
                >
                  <MaterialIcon name="more_horiz" />
                </button>
                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-2xl shadow-lg z-20 animate-fade-in-sm">
                    <button onClick={() => {analyticsService.exportReport('pdf', timeRange); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/5"><MaterialIcon name="download" className="text-sm" /> Export Data</button>
                    <button onClick={() => {window.location.reload(); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/5"><MaterialIcon name="refresh" className="text-sm" /> Refresh</button>
                  </div>
                )}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8892b0', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8892b0', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" name="Engagement %" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Platform Sentiment</h3>
                <div className="space-y-4">
                  {data.socialMetrics.map(m => (
                    <AccountRow 
                      key={m.platform}
                      icon={m.platform === 'Instagram' ? <SiInstagram size={18} /> : m.platform === 'YouTube' ? <SiYoutube size={18} /> : m.platform === 'Facebook' ? <SiFacebook size={18} /> : <SiLinkedin size={18} />} 
                      name={m.platform} 
                      value={`${Math.round(((m.sentimentScore || 0) + 1) * 50)}%`} 
                      color={m.sentimentScore! > 0.2 ? "bg-teal-500" : m.sentimentScore! < -0.2 ? "bg-red-500" : "bg-primary-blue"} 
                    />
                  ))}
                </div>
             </Card>
             <Card>
                <div className="flex justify-between items-end mb-4">
                   <div>
                    <h3 className="text-lg font-semibold text-white">Sentiment keywords</h3>
                    <p className="text-xs text-gray-subtext">NLP-extracted hashtags</p>
                   </div>
                   <span className="text-2xl font-bold text-primary-teal uppercase text-sm">Top 5</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {data.sentimentData?.overall.keywords.map(kw => (
                    <span key={kw} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-primary-teal font-medium">#{kw}</span>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-dark-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-subtext">Sentiment Adjusted Engagement</span>
                    <span className="text-sm font-bold text-white">{data.sentimentInsights?.sentimentAdjustedEngagement}%</span>
                  </div>
                  <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary-teal" style={{ width: `${(data.sentimentInsights?.sentimentAdjustedEngagement || 0) * 10}%` }} />
                  </div>
                </div>
             </Card>
          </div>
        </div>

        {/* Right Sidebar - Activity */}
        <div className="space-y-6">
          <Card className="h-full">
            <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
            <div className="space-y-8 relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-[1px] bg-dark-border" />
              {activityData.map((item, index) => (
                <div key={item.id} className="relative flex items-start gap-4">
                  <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-dark-surface flex items-center justify-center shrink-0 ${
                    item.isSponsored 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                      : index === 0 ? 'bg-primary-blue' : 'bg-gray-700'
                  }`}>
                    {item.isSponsored ? (
                      <MaterialIcon name="campaign" className="text-white text-sm" />
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">{item.text}</p>
                      {item.isSponsored && item.sponsorshipTier && (
                        <SponsoredBadge tier={item.sponsorshipTier} className="shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-primary-blue bg-primary-blue/10 px-2 py-0.5 rounded-full">{item.platform}</span>
                      <span className="text-xs text-gray-subtext">{item.time}</span>
                    </div>
                    {item.isSponsored && item.stats && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <MaterialIcon name="favorite" className="text-xs" />
                          {item.stats.likes.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MaterialIcon name="visibility" className="text-xs" />
                          {item.stats.views.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, icon, isNegative = false }: any) => (
  <Card>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm text-gray-subtext font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-white">{value}</h4>
      </div>
      <div className="p-3 rounded-2xl bg-white/5">
        {icon}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-lg ${isNegative ? 'bg-red-500/10 text-red-400' : 'bg-teal-500/10 text-teal-400'}`}>
        <MaterialIcon name={isNegative ? "arrow_downward" : "arrow_upward"} className={`text-sm mr-1`} />
        {change}
      </span>
      <span className="text-xs text-gray-subtext">vs last month</span>
    </div>
  </Card>
);

const AccountRow = ({ icon, name, value, color }: any) => (
  <div className="flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${color} bg-opacity-20 flex items-center justify-center text-white`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white">{name}</span>
        <span className="text-gray-subtext">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-dark-surface rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: value }} />
      </div>
    </div>
  </div>
);