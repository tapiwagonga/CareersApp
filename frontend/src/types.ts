// src/types.ts

// --- APPLICATION STATE ---
export enum AppStep {
  LANDING = "LANDING",       
  ASSESSMENT = "ASSESSMENT", 
  STRATEGY = "STRATEGY",     
  LOADING = "LOADING",       
  DASHBOARD = "DASHBOARD"    
}

// --- USER INPUTS ---
export interface TargetJob {
  company: string;
  role: string;
  description: string;
}

export interface Preferences {
  learningStyle: string;
  hoursPerWeek: number;
  experienceLevel: string;
  timeline: "Urgent" | "Standard" | "LongTerm"; 
}

// --- JD EXTRACTION DATA ---
export interface SkillData {
  skill: string;
  category: string;
  importance: "Critical" | "Bonus"; 
  evidence?: string; // Optional because legacy data might miss it
  context?: string;  // The "Why" extracted from JD               
}

// --- RESOURCES (Used in the 'Missing Skills' list) ---
export interface Resource {
  title: string;
  provider: string; // e.g. "YouTube", "Medium"
  type: "Video" | "Article" | "Book" | "Course" | "Project";
  duration?: string;
  reason?: string;
  url?: string;
  query?: string; // Fallback if no direct URL
}

export interface GapItem {
  skill_name: string;
  current_level: number;
  target_level: number;
  priority: "High" | "Medium" | "Low";
  estimated_hours: number;
  resources: Resource[];
}

// --- ROADMAP SYLLABUS (Used in the Dashboard Timeline) ---

export type TaskType = "Watch" | "Read" | "Build" | "Practice";

export interface RoadmapTask {
  id: string;
  title: string; 
  type: TaskType;
  description: string;
  estimated_minutes: number;
  meta: {
    url?: string;       
    platform?: string;  
    thumbnail?: string;
    author?: string;    
  };
  status: "Pending" | "In-Progress" | "Done";
}

export interface RoadmapWeek {
  week_number: number;
  label: string;       // e.g. "Phase 1: Foundations"
  focus_area: string;  // e.g. "React Hooks, State Management"
  description: string; // Brief summary of the week's goal
  tasks: RoadmapTask[]; // <--- STRICTLY TYPED (No more any[])
  total_hours: number;
}

// --- MASTER RESULT ---
export interface AnalysisResult {
  role_name: string;
  match_percentage: number;
  missing_skills: GapItem[];
  roadmap: RoadmapWeek[];
  summary?: {
    total_hours_required: number;
    weekly_commitment: number;
    estimated_completion_weeks: number;
  };
}