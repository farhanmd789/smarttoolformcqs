export interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
}

export interface Quiz {
  title: string;
  difficulty: string;
  questions: Question[];
}

export interface QuizResponse {
  status: string;
  message: string;
  quiz: Quiz;
}

export interface UserAnswer {
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  quiz: Quiz;
  questions?: Question[]; // Fallback for legacy data structure
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  videoId: string;
  videoTitle: string;
  completedAt: Date;
}

export interface Note {
  _id?: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  channelTitle: string;
  contentTitle: string;
  bulletPoints: string[];
  createdAt?: Date;
}

export interface HistoryItem {
  _id?: string;
  userId: string;
  videoTitle: string;
  videoUrl: string;
  videoId: string;
  quiz: Quiz;
  questions?: Question[];
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt?: Date;
}
