// --- APPLICATION STATE ---
export enum AppStep {
  LANDING = "LANDING",
  AUTH = "AUTH",                 
  PROFILE_SETUP = "PROFILE_SETUP", 
  PROFILE = "PROFILE",         
  ASSESSMENT = "ASSESSMENT",
  STRATEGY = "STRATEGY",
  LOADING = "LOADING",
  DASHBOARD = "DASHBOARD",
  INTERVIEW = "INTERVIEW",
}

// --- USER INPUTS ---
export interface TargetJob {
  company: string;
  role: string;
  description: string;
  cvFile: File | null;
}

export interface Preferences {
  learningStyle: string; // "Visual", "Auditory", "Text", "HandsOn"
  hoursPerWeek: number;
  experienceLevel: string;
  timeline: "Urgent" | "Standard" | "LongTerm"; 
}

// --- JD EXTRACTION DATA ---
export interface SkillData {
  skill: string;
  category: string;
  importance: "Critical" | "Bonus"; 
  evidence?: string; 
  context?: string;             
}

// --- RESOURCES (Used in the 'Missing Skills' list) ---
export interface Resource {
  title: string;
  provider: string; 
  type: "Video" | "Article" | "Book" | "Course" | "Project";
  duration?: string;
  reason?: string;
  url?: string;
  query?: string; 
  authority_tier: number;
  media_type: string;
}

export interface GapItem {
  skill_name: string;
  current_level: number;
  target_level: number;
  priority: "High" | "Medium" | "Low";
  estimated_hours: number;
  resources: Resource[];
}

// --- ROADMAP SYLLABUS (The Core Update) ---

// 1. Unified Resource Type (Supports Legacy & New Gamified Types)
export type ResourceType = 
  // Legacy types (Title Case) - KEEPING THESE PREVENTS DASHBOARD CRASHES
  | "Watch" | "Read" | "Build" | "Practice" 
  // New AI Agent types (Lowercase)
  | "video" | "audio" | "article" | "course" | "doc" | "project" | "boss_battle";

// 2. Enhanced Meta Data
export interface ResourceMeta {
  url?: string;
  platform?: string;
  thumbnail?: string;
  author?: string;
  duration?: string;
}


// 3. The Gamified Task
export interface RoadmapTask {
  id: string;
  title: string; 
  type: ResourceType; 
  description: string;
  estimated_minutes: number;
  
  // NEW: Gamification & Dates
  xp_reward: number;          // Default: 0 if missing
  due_date?: string;          // ISO Date String: "2024-03-12T17:00:00"
  completed_at?: string;      // Timestamp when user checked it off
  
  meta: ResourceMeta;
  status: "Pending" | "In-Progress" | "Done" | "Locked" | "Completed"; 
}

// 4. The "Phase" (Formerly Week)
export interface RoadmapPhase {
  week_number: number; // Kept for sorting/ID
  label: string;       // e.g. "Sprint: React Hooks" or "Phase 1: Foundations"
  focus_area: string;  
  description: string; 
  tasks: RoadmapTask[]; 
  total_hours: number;

  // NEW: Timeline & Locking Logic
  start_date?: string; // ISO String: "Mar 01"
  end_date?: string;   // ISO String: "Mar 07"
  is_locked: boolean;  // True if previous phase isn't done
  is_completed: boolean;
}

// Alias for backward compatibility with old components
export type RoadmapWeek = RoadmapPhase;

// --- MASTER RESULT ---
export interface AnalysisResult {
  role_name: string;
  match_percentage: number;
  missing_skills: GapItem[];
  roadmap: RoadmapPhase[]; // Updated to use the new Phase interface
  summary?: {
    total_hours_required: number;
    weekly_commitment: number;
    estimated_completion_weeks: number;
  };
}

// --- USER & PERSISTENCE ---

export interface UserProfile {
  id: string;
  email: string;
  name: string;       // React UI uses this
  target_role: string; // The correct DB field
  avatar_config: any; 
  xp: number;
  level: number;
  created_at: string;
  
  // Optional legacy field to prevent typescript errors during migration
  role?: string; 
}

export interface SavedRoadmap {
  id: string;          
  user_id: string;     
  role_title: string;
  match_score: number;
  roadmap_data: AnalysisResult; 
  status: 'active' | 'completed' | 'archived';
  progress_pct: number;
  created_at: string;
}

export interface SavedInterview {
  id: string;
  user_id: string;
  role: string;
  company: string;
  report_data: any;
  overall_score: number;
  created_at: string;
}