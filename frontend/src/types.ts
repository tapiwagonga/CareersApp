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
  ANALYTICS = "ANALYTICS" 
}

export interface TargetJob {
  company: string;
  role: string;
  description: string;
  cvFile: File | null;
}

export interface Preferences {
  learningStyle: string; 
  hoursPerWeek: number;
  experienceLevel: string;
  timeline: "Urgent" | "Standard" | "LongTerm"; 
}


export interface SkillData {
  skill: string;
  category: string;
  importance: "Critical" | "Bonus";
  evidence?: string;
  context?: string;
}

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

export interface CuratedResource {
  type: string;
  title: string;
  description: string;
  estimated_minutes: number;
  meta?: {
    url?: string;
    platform?: string;
    provider?: string;
    quality_score?: number;
    iframe_safe?: boolean;
  };
}

export interface GapItem {
  skill_name: string;
  current_level: number;
  target_level: number;
  priority: "High" | "Medium" | "Low";
  estimated_hours: number;
  resources: CuratedResource[];
}

export type ResourceType =
  | "Watch"
  | "Read"
  | "Build"
  | "Practice"
  | "video"
  | "audio"
  | "article"
  | "course"
  | "doc"
  | "project"
  | "boss_battle"
  | "deep_dive"
  | "repo"
  | "interactive"
  | "book"
  | "documentation";


  export interface ResourceMeta {
    url?: string;
    platform?: string;
    provider?: string;
    thumbnail?: string;
    author?: string;
    duration?: string;
    quality_score?: number;
    iframe_safe?: boolean;
  }

export interface RoadmapTask {
  id: string;
  title: string; 
  type: ResourceType; 
  description: string;
  estimated_minutes: number;
  xp_reward: number;          
  due_date?: string;       
  completed_at?: string;     
  meta: ResourceMeta;
  status: "Pending" | "In-Progress" | "Done" | "Locked" | "Completed"; 
}


export interface RoadmapPhase {
  week_number: number; 
  label: string;       
  focus_area: string;  
  description: string; 
  tasks: RoadmapTask[]; 
  total_hours: number;
  start_date?: string; 
  end_date?: string;  
  is_locked: boolean;  
  is_completed: boolean;
}


export type RoadmapWeek = RoadmapPhase;


export interface AnalysisResult {
  role_name: string;
  match_percentage: number;
  missing_skills: GapItem[];
  roadmap: RoadmapPhase[]; 
  summary?: {
    total_hours_required: number;
    weekly_commitment: number;
    estimated_completion_weeks: number;
  };
}



export interface UserProfile {
  id: string;
  email: string;
  name: string;       
  target_role: string; 
  avatar_config: any; 
  xp: number;
  level: number;
  created_at: string;
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