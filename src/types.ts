export interface Student {
  id: string;
  name: string;
  nisn: string;
  status: "idle" | "in_exam" | "locked" | "completed";
  subject?: string;
  kelas?: string;
  startTime?: string;
  trustScore: number;
  violationsCount: number;
  violations: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  answers?: Record<string, any>;
  aiReport?: string;
  submittedAt?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
}

export interface Question {
  id: string;
  type: "pilihan_ganda" | "pilihan_ganda_kompleks" | "menjodohkan" | "isian_singkat" | "uraian";
  stimulus: string;
  questionText: string;
  options?: string[];
  matchingPairs?: { left: string; right: string[] }[];
  correctMatching?: Record<string, string>;
  correctAnswer?: string | string[];
  points: number;
  kelas?: string;
}

export interface ViolationLog {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  description: string;
  timestamp: string;
}
