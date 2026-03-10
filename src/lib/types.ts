// ============ Bangumi API Types ============

export interface BangumiUser {
  id: number;
  username: string;
  nickname: string;
  avatar: {
    large: string;
    medium: string;
    small: string;
  };
  sign: string;
}

export interface BangumiSubject {
  id: number;
  type: number; // 2=anime, 4=game
  name: string;
  name_cn: string;
  summary: string;
  date: string;
  images?: {
    large: string;
    common: string;
    medium: string;
    small: string;
    grid: string;
  };
  score: number;
  rank: number;
  tags?: { name: string; count: number }[];
  collection_total: number;
  eps: number;
}

export type CollectionStatus = "wish" | "collect" | "doing" | "on_hold" | "dropped";

export interface BangumiCollection {
  subject_id: number;
  subject_type: number;
  rate: number; // user rating 0-10
  type: number; // 1=wish,2=collect,3=doing,4=on_hold,5=dropped
  comment: string;
  tags: string[];
  updated_at: string;
  subject: BangumiSubject;
}

export interface BangumiCollectionResponse {
  total: number;
  limit: number;
  offset: number;
  data: BangumiCollection[];
}

// ============ LLM Types ============

export type LLMProvider = "claude" | "openai" | "custom";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // for custom OpenAI-compatible endpoints
}

// ============ Analysis Types ============

export interface TasteTag {
  label: string;
  description: string;
}

export interface GenrePreference {
  genre: string;
  score: number; // 0-100
  count: number;
}

export interface RatingAnalysis {
  average: number;
  median: number;
  tendency: string; // e.g. "偏严格" / "偏宽松" / "中庸"
  description: string;
}

export interface TasteAnalysis {
  summary: string;
  tasteTags: TasteTag[];
  genrePreferences: GenrePreference[];
  ratingAnalysis: RatingAnalysis;
  uniqueTraits: string[];
  hiddenGems: { name: string; reason: string }[];
  recommendations: { name: string; reason: string }[];
}

// ============ Chart Data Types ============

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface TypeDistribution {
  name: string;
  value: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}
