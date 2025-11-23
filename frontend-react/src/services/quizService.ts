import axios from 'axios';

// Reuse same backend base URL convention
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface QuizResponse {
  status: 'success' | 'error';
  quiz?: any;
  message?: string;
}

export const generateQuiz = async (
  videoId: string,
  numQuestions: number,
  difficulty: string
): Promise<QuizResponse> => {
  try {
    const response = await axios.post(`${API_URL}/quiz/generate`, {
      videoId,
      numQuestions,
      difficulty,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to generate quiz',
    };
  }
};
