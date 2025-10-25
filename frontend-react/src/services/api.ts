import axios from 'axios';
import { QuizResponse, HistoryItem, Note } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Extract video ID from YouTube URL
export const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Generate quiz
export const generateQuiz = async (
  videoId: string,
  numQuestions: number = 15,
  difficulty: string = 'medium'
): Promise<QuizResponse> => {
  const response = await api.post<QuizResponse>('/generateQuiz', {
    videoId,
    num_questions: numQuestions,
    difficulty,
  });
  return response.data;
};

// Save quiz history
export const saveHistory = async (historyData: Partial<HistoryItem>): Promise<void> => {
  await api.post('/history', historyData);
};

// Get user history (now uses authenticated endpoint)
export const getUserHistory = async (): Promise<HistoryItem[]> => {
  const response = await api.get<HistoryItem[]>('/my-history');
  return response.data;
};

// Get all history
export const getAllHistory = async (): Promise<{ success: boolean; history: HistoryItem[] }> => {
  const response = await api.get('/history');
  return response.data;
};

// Get user notes (now uses authenticated endpoint)
export const getUserNotes = async (): Promise<{ success: boolean; notes: Note[] }> => {
  const response = await api.get('/my-notes');
  return response.data;
};

// Get notes for specific video (now uses authenticated endpoint)
export const getVideoNotes = async (videoId: string): Promise<Note> => {
  const response = await api.get<Note>(`/notes/${videoId}`);
  return response.data;
};

// Delete note
export const deleteNote = async (noteId: string): Promise<void> => {
  await api.delete(`/notes/${noteId}`);
};

// Get AI-powered recommendations
export const getRecommendations = async (
  weakTopics: string[],
  videoId?: string
): Promise<{ success: boolean; recommendations: any }> => {
  const response = await api.post('/recommendations', {
    weakTopics,
    videoId
  });
  return response.data;
};

// Health check
export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
