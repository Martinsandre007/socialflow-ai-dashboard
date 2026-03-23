import { GoogleGenerativeAI } from '@google/genai';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
    label: SentimentLabel;
    score: number;           // -1 (very negative) → 0 (neutral) → +1 (very positive)
    confidence: number;      // 0–100 %
    keywords: string[];      // sentiment-driving words found in the text
}

export interface SocialMention {
    id: string;
    platform: string;
    author: string;
    content: string;
    timestamp: Date;
    likes?: number;
    shares?: number;
}

export interface AnalyzedMention extends SocialMention {
    sentiment: SentimentResult;
}

export interface SentimentBucket {
    hour: string;            // e.g. "14:00"
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number;
    total: number;
}

export interface PlatformSentimentSummary {
    platform: string;
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number;
    total: number;
    trend: 'improving' | 'stable' | 'declining';
    trendDelta: number;      // percentage-point change vs previous period
}

export interface SentimentOverview {
    overall: SentimentResult;
    byPlatform: PlatformSentimentSummary[];
    hourlyTrend: SentimentBucket[];
    recentMentions: AnalyzedMention[];
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    totalAnalyzed: number;
    lastUpdated: Date;
}

// ─── Lexicon ──────────────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
    'love', 'loved', 'loving', 'great', 'amazing', 'awesome', 'excellent', 'fantastic',
    'wonderful', 'brilliant', 'perfect', 'best', 'outstanding', 'superb', 'incredible',
    'happy', 'happily', 'happiness', 'excited', 'exciting', 'thrilled', 'glad', 'pleased',
    'delighted', 'joy', 'joyful', 'good', 'nice', 'cool', 'fire', 'lit', 'dope', 'sick',
    'impressive', 'inspiring', 'inspired', 'motivating', 'motivated', 'thankful',
    'grateful', 'appreciate', 'appreciation', 'congratulations', 'congrats', 'well done',
    'bravo', 'celebrated', 'celebrate', 'achievement', 'win', 'winner', 'success',
    'successful', 'recommend', 'recommended', 'helpful', 'useful', 'effective', 'powerful',
    'innovative', 'creative', 'genius', 'smart', 'clever', 'beautiful', 'gorgeous',
    'stunning', 'insane', 'unreal', 'legendary', 'goat', 'epic', 'iconic', 'blessed',
    'supportive', 'engaged', 'engaging', 'uplifting', 'positive', 'remarkable',
]);

const NEGATIVE_WORDS = new Set([
    'hate', 'hated', 'hating', 'terrible', 'awful', 'horrible', 'disgusting', 'trash',
    'garbage', 'worst', 'bad', 'poor', 'mediocre', 'disappointing', 'disappointed',
    'frustrating', 'frustrated', 'annoying', 'annoyed', 'angry', 'anger', 'upset',
    'sad', 'depressed', 'miserable', 'pathetic', 'useless', 'waste', 'boring', 'bored',
    'dull', 'broken', 'bug', 'crash', 'fail', 'failed', 'failure', 'broken', 'scam',
    'fraud', 'fake', 'lie', 'lied', 'deceptive', 'misleading', 'mislead', 'clickbait',
    'spam', 'offensive', 'rude', 'insult', 'insulted', 'disrespect', 'disrespected',
    'shame', 'shameful', 'embarrassing', 'embarrassed', 'regret', 'regretted', 'disaster',
    'nightmare', 'hell', 'horrible', 'atrocious', 'dreadful', 'shocking', 'outrageous',
    'ridiculous', 'stupid', 'dumb', 'idiot', 'nonsense', 'pointless', 'cringe', 'cringy',
    'overrated', 'hyped', 'scanned', 'cancelled', 'banned', 'blocked', 'reported', 'flagged',
]);

const NEGATION_WORDS = new Set([
    'not', 'no', 'never', 'neither', 'nor', 'nobody', 'nothing', 'nowhere',
    "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "hardly", "barely",
]);

const INTENSIFIERS = new Set([
    'very', 'really', 'extremely', 'absolutely', 'incredibly', 'so', 'super', 'totally',
    'utterly', 'awfully', 'deeply', 'beyond', 'truly', 'highly', 'insanely',
]);

// ─── NLP Engine ───────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\w\s']/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function lexiconScore(text: string): SentimentResult {
    const tokens = tokenize(text);
    let score = 0;
    let posCount = 0;
    let negCount = 0;
    const keywords: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        const prev = tokens[i - 1] || '';
        const prevPrev = tokens[i - 2] || '';

        const isNegated = NEGATION_WORDS.has(prev) || NEGATION_WORDS.has(prevPrev);
        const multiplier = INTENSIFIERS.has(prev) ? 1.5 : 1;

        if (POSITIVE_WORDS.has(word)) {
            const delta = multiplier * (isNegated ? -0.6 : 0.6);
            score += delta;
            if (delta > 0) posCount++;
            else negCount++;
            keywords.push(word);
        } else if (NEGATIVE_WORDS.has(word)) {
            const delta = multiplier * (isNegated ? 0.4 : -0.6);
            score += delta;
            if (delta < 0) negCount++;
            else posCount++;
            keywords.push(word);
        }
    }

    // Normalise to [-1, +1]
    const total = posCount + negCount || 1;
    let normalised = Math.max(-1, Math.min(1, score / total));

    // Emoji bonus
    const emojiPositive = (text.match(/[😊😍🔥💪🎉🙌👏✅💯🚀⭐🌟]/g) || []).length;
    const emojiNegative = (text.match(/[😡😢😤💔😞👎❌🤮🤢]/g) || []).length;
    const emojiDelta = (emojiPositive - emojiNegative) * 0.1;
    normalised = Math.max(-1, Math.min(1, normalised + emojiDelta));

    let label: SentimentLabel;
    if (normalised > 0.15) label = 'positive';
    else if (normalised < -0.15) label = 'negative';
    else label = 'neutral';

    const confidence = Math.min(100, Math.round(50 + Math.abs(normalised) * 50));

    return { label, score: parseFloat(normalised.toFixed(3)), confidence, keywords: [...new Set(keywords)].slice(0, 5) };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SAMPLE_COMMENTS: Array<{ platform: string; content: string; author: string }> = [
    { platform: 'Instagram', author: 'user_alex', content: 'This content is absolutely amazing! Love the new Web3 integration 🔥🙌' },
    { platform: 'Instagram', author: 'sarah_m', content: 'Not really impressed with the latest post. Felt misleading.' },
    { platform: 'TikTok', author: 'dancequeen99', content: 'The reel was fire! Shared it with my whole squad 💯🚀' },
    { platform: 'TikTok', author: 'skeptic_t', content: 'This is just more hype. Nothing new here honestly.' },
    { platform: 'TikTok', author: 'vibes_only', content: 'Awesome work as always! Keep it up! 🎉' },
    { platform: 'YouTube', author: 'techreviewer', content: 'The guide was super helpful and well explained. Subscribed!' },
    { platform: 'YouTube', author: 'commente_r', content: 'Audio quality was terrible. Hard to follow the tutorial.' },
    { platform: 'Facebook', author: 'local_biz', content: 'Great community spotlight! Congratulations to the contributors 🌟' },
    { platform: 'Facebook', author: 'tom_s', content: 'I really don\'t understand the point of this post. Waste of time.' },
    { platform: 'LinkedIn', author: 'prof_jane', content: 'Incredibly insightful article. Shared with my network!' },
    { platform: 'LinkedIn', author: 'recruiter_k', content: 'Mediocre takeaways. Nothing groundbreaking to be honest.' },
    { platform: 'Instagram', author: 'foodie_lu', content: 'This is exactly what the community needs! Brilliant idea 💡' },
    { platform: 'TikTok', author: 'hype_h', content: 'Watched three times already. Legendary content 🏆' },
    { platform: 'YouTube', author: 'rant_account', content: 'Disappointed again. Expected much better quality from this channel.' },
    { platform: 'Facebook', author: 'happy_fan', content: 'Best campaign I\'ve seen this year! You never disappoint! 🎉😊' },
    { platform: 'Instagram', author: 'neutral_n', content: 'Okay content. Nothing special but not bad either.' },
    { platform: 'LinkedIn', author: 'growth_hacker', content: 'Powerful strategy. The AI-driven approach really stands out.' },
    { platform: 'X', author: 'tweet_bird', content: 'Actually hate the new update. Broken on my phone.' },
    { platform: 'X', author: 'dm_only', content: 'Interesting perspective. Would love to see more data though.' },
    { platform: 'X', author: 'early_adopter', content: 'Absolutely love this! The best social dashboard I\'ve ever used ❤️' },
    { platform: 'Instagram', author: 'style_guru', content: 'The aesthetic is beautiful. Very well designed profile 🌸' },
    { platform: 'TikTok', author: 'comedy_acc', content: 'Cringe content ngl. Not my vibe at all.' },
    { platform: 'YouTube', author: 'edu_seeker', content: 'Very informative and well structured video. Highly recommend!' },
    { platform: 'Facebook', author: 'skeptic2', content: 'Seems like a scam honestly. Too good to be true.' },
    { platform: 'LinkedIn', author: 'ceo_mindset', content: 'Remarkable growth metrics! The team deserves a round of applause 👏' },
];

// ─── Service ──────────────────────────────────────────────────────────────────

class SentimentService {
    private storageKey = 'sf_sentiment_cache';
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    /** Analyse a single text string. */
    async analyzeSentiment(text: string): Promise<SentimentResult> {
        // Option 1: AI-powered analysis (NLP Service)
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Analyze the sentiment of the following social media content. 
                Return ONLY a JSON object with this format: {"label": "positive"|"neutral"|"negative", "score": number between -1 and 1, "confidence": number 0-100, "keywords": ["word1", "word2"]}.
                Content: "${text}"`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const jsonText = response.text().replace(/```json|```/g, '').trim();
                return JSON.parse(jsonText) as SentimentResult;
            } catch (error) {
                console.warn('AI Sentiment analysis failed, falling back to lexicon:', error);
            }
        }

        // Option 2: Robust Lexicon fallback (Rules-based NLP)
        return lexiconScore(text);
    }

    /** Analyse a batch of SocialMentions. */
    async analyzeMentions(mentions: SocialMention[]): Promise<AnalyzedMention[]> {
        // For batches, we use the lexicon to avoid rate limits/latency unless it's a small set
        const results = await Promise.all(mentions.map(async (m) => ({
            ...m,
            sentiment: await this.analyzeSentiment(m.content),
        })));
        return results;
    }

    /**
     * Generate a full SentimentOverview for the last 24 hours.
     * Uses cached mock mentions, scoring them in real-time.
     */
    async getSentimentOverview(): Promise<SentimentOverview> {
        const cached = this.loadCache();
        if (cached) return cached;

        const mentions = this.generateMockMentions();
        const analyzed = await this.analyzeMentions(mentions);

        const overview = this.buildOverview(analyzed);
        this.saveCache(overview);
        return overview;
    }

    /** Refresh the overview (bypass cache). */
    async refreshSentiment(): Promise<SentimentOverview> {
        localStorage.removeItem(this.storageKey);
        return this.getSentimentOverview();
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private generateMockMentions(): SocialMention[] {
        const now = new Date();
        return SAMPLE_COMMENTS.map((c, i) => {
            const hoursAgo = (i / SAMPLE_COMMENTS.length) * 24;
            const ts = new Date(now.getTime() - hoursAgo * 3_600_000);
            return {
                id: `mention-${i}`,
                platform: c.platform,
                author: c.author,
                content: c.content,
                timestamp: ts,
                likes: Math.floor(Math.random() * 2000 + 10),
                shares: Math.floor(Math.random() * 500),
            };
        });
    }

    private buildOverview(mentions: AnalyzedMention[]): SentimentOverview {
        const total = mentions.length;
        const positive = mentions.filter(m => m.sentiment.label === 'positive').length;
        const neutral = mentions.filter(m => m.sentiment.label === 'neutral').length;
        const negative = mentions.filter(m => m.sentiment.label === 'negative').length;
        const avgScore = mentions.reduce((s, m) => s + m.sentiment.score, 0) / total;

        const overall: SentimentResult = {
            label: avgScore > 0.15 ? 'positive' : avgScore < -0.15 ? 'negative' : 'neutral',
            score: parseFloat(avgScore.toFixed(3)),
            confidence: Math.min(100, Math.round(50 + Math.abs(avgScore) * 50)),
            keywords: this.topKeywords(mentions),
        };

        const hourlyTrend = this.buildHourlyTrend(mentions);
        const byPlatform = this.buildPlatformSummary(mentions, hourlyTrend);

        return {
            overall,
            byPlatform,
            hourlyTrend,
            recentMentions: mentions
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 8),
            positivePct: parseFloat(((positive / total) * 100).toFixed(1)),
            neutralPct: parseFloat(((neutral / total) * 100).toFixed(1)),
            negativePct: parseFloat(((negative / total) * 100).toFixed(1)),
            totalAnalyzed: total,
            lastUpdated: new Date(),
        };
    }

    private topKeywords(mentions: AnalyzedMention[]): string[] {
        const freq: Record<string, number> = {};
        mentions.forEach(m => m.sentiment.keywords.forEach(k => { freq[k] = (freq[k] || 0) + 1; }));
        return Object.entries(freq)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([k]) => k);
    }

    private buildHourlyTrend(mentions: AnalyzedMention[]): SentimentBucket[] {
        const buckets: Record<string, AnalyzedMention[]> = {};

        // Create 24 buckets (one per hour, last 24 h)
        for (let h = 23; h >= 0; h--) {
            const d = new Date(Date.now() - h * 3_600_000);
            const label = `${String(d.getHours()).padStart(2, '0')}:00`;
            if (!buckets[label]) buckets[label] = [];
        }

        mentions.forEach(m => {
            const h = `${String(m.timestamp.getHours()).padStart(2, '0')}:00`;
            if (buckets[h]) buckets[h].push(m);
        });

        return Object.entries(buckets).map(([hour, items]) => {
            const pos = items.filter(i => i.sentiment.label === 'positive').length;
            const neu = items.filter(i => i.sentiment.label === 'neutral').length;
            const neg = items.filter(i => i.sentiment.label === 'negative').length;
            const avg = items.length ? items.reduce((s, i) => s + i.sentiment.score, 0) / items.length : 0;
            return { hour, positive: pos, neutral: neu, negative: neg, avgScore: parseFloat(avg.toFixed(3)), total: items.length };
        });
    }

    private buildPlatformSummary(
        mentions: AnalyzedMention[],
        hourly: SentimentBucket[],
    ): PlatformSentimentSummary[] {
        const platforms = [...new Set(mentions.map(m => m.platform))];

        return platforms.map(platform => {
            const items = mentions.filter(m => m.platform === platform);
            const pos = items.filter(m => m.sentiment.label === 'positive').length;
            const neu = items.filter(m => m.sentiment.label === 'neutral').length;
            const neg = items.filter(m => m.sentiment.label === 'negative').length;
            const avg = items.reduce((s, m) => s + m.sentiment.score, 0) / (items.length || 1);

            // Trend: compare first vs second half of the 24-hour window
            const midTs = Date.now() - 12 * 3_600_000;
            const older = items.filter(m => m.timestamp.getTime() < midTs);
            const newer = items.filter(m => m.timestamp.getTime() >= midTs);
            const olderAvg = older.length ? older.reduce((s, m) => s + m.sentiment.score, 0) / older.length : 0;
            const newerAvg = newer.length ? newer.reduce((s, m) => s + m.sentiment.score, 0) / newer.length : 0;
            const delta = parseFloat(((newerAvg - olderAvg) * 100).toFixed(1));

            return {
                platform,
                positive: pos,
                neutral: neu,
                negative: neg,
                avgScore: parseFloat(avg.toFixed(3)),
                total: items.length,
                trend: delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable',
                trendDelta: delta,
            };
        });
    }

    private loadCache(): SentimentOverview | null {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const age = Date.now() - new Date(parsed.lastUpdated).getTime();
            if (age > this.CACHE_TTL_MS) return null;
            // Rehydrate Date objects
            parsed.lastUpdated = new Date(parsed.lastUpdated);
            parsed.recentMentions = parsed.recentMentions.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
            return parsed as SentimentOverview;
        } catch {
            return null;
        }
    }

    private saveCache(overview: SentimentOverview): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(overview));
        } catch { /* quota exceeded – skip */ }
    }
}

export const sentimentService = new SentimentService();
