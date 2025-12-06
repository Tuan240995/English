import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle token expiration/errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear local storage and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Lấy câu hỏi ngẫu nhiên
export const getRandomQuestion = async (difficulty = 'medium', topicId = null) => {
  try {
    let url = `/questions/random/?difficulty=${difficulty}`;
    if (topicId) {
      url += `&topic_id=${topicId}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi ngẫu nhiên:', error);
    throw error;
  }
};

// Kiểm tra câu trả lời
export const checkAnswer = async (questionId, userAnswer, username = '') => {
  try {
    const requestData = {
      question_id: questionId,
      user_answer: userAnswer,
    };

    if (username) {
      requestData.username = username;
    }

    const response = await api.post('/check-answer/', requestData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi kiểm tra câu trả lời:', error);
    throw error;
  }
};

// Lấy tất cả câu hỏi với phân trang và lọc
export const getAllQuestions = async (params = {}) => {
  try {
    const {
      page = 1,
      page_size = 20,
      topic_id = null,
      difficulty = null,
      search = ''
    } = params;

    let url = '/questions/?page=' + page + '&page_size=' + page_size;

    if (topic_id) {
      url += '&topic_id=' + topic_id;
    }

    if (difficulty) {
      url += '&difficulty=' + difficulty;
    }

    if (search) {
      url += '&search=' + encodeURIComponent(search);
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy tất cả câu hỏi:', error);
    throw error;
  }
};

// Thêm câu hỏi mới
export const addQuestion = async (vietnameseText, englishText, difficulty = 'medium', topicId = null) => {
  try {
    const requestData = {
      vietnamese_text: vietnameseText,
      english_text: englishText,
      difficulty: difficulty,
    };

    if (topicId) {
      requestData.topic = topicId;
    }

    const response = await api.post('/questions/', requestData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi thêm câu hỏi mới:', error);
    throw error;
  }
};

// Cập nhật câu hỏi
export const updateQuestion = async (questionId, vietnameseText, englishText, difficulty = 'medium', topicId = null) => {
  try {
    const requestData = {
      vietnamese_text: vietnameseText,
      english_text: englishText,
      difficulty: difficulty,
    };

    if (topicId) {
      requestData.topic = topicId;
    }

    const response = await api.put(`/questions/${questionId}/`, requestData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật câu hỏi:', error);
    throw error;
  }
};

// Xóa câu hỏi
export const deleteQuestion = async (questionId) => {
  try {
    const response = await api.delete(`/questions/${questionId}/`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa câu hỏi:', error);
    throw error;
  }
};

// Lấy chi tiết một câu hỏi
export const getQuestion = async (questionId) => {
  try {
    const response = await api.get(`/questions/${questionId}/`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết câu hỏi:', error);
    throw error;
  }
};

// Lấy lịch sử câu trả lời
export const getUserAnswers = async () => {
  try {
    const response = await api.get('/user-answers/');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử câu trả lời:', error);
    throw error;
  }
};


// Topic endpoints
export const getTopics = async () => {
  try {
    const response = await api.get('/topics/');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chủ đề:', error);
    throw error;
  }
};

export const addTopic = async (name, description = '', icon = '') => {
  try {
    const response = await api.post('/topics/', {
      name: name,
      description: description,
      icon: icon,
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi thêm chủ đề mới:', error);
    throw error;
  }
};

export const updateTopic = async (topicId, name, description = '', icon = '') => {
  try {
    const response = await api.put(`/topics/${topicId}/`, {
      name: name,
      description: description,
      icon: icon,
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật chủ đề:', error);
    throw error;
  }
};

export const deleteTopic = async (topicId) => {
  try {
    const response = await api.delete(`/topics/${topicId}/`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa chủ đề:', error);
    throw error;
  }
};

export const importQuestionsFromFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/questions/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi import câu hỏi:', error);
    throw error;
  }
};

// User endpoints
export const userLogin = async (username) => {
  try {
    const response = await api.post('/auth/login/', {
      username: username
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    throw error;
  }
};

// Task System endpoints
export const getWeeklyTasks = async () => {
  try {
    const response = await api.get('/tasks/weekly/');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy nhiệm vụ hàng tuần:', error);
    throw error;
  }
};

export const getTaskDashboard = async (username) => {
  try {
    const response = await api.get(`/tasks/dashboard/?username=${username}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy dashboard nhiệm vụ:', error);
    throw error;
  }
};

export const updateTaskProgress = async (username, taskId, increment = 1) => {
  try {
    const response = await api.post('/tasks/progress/', {
      username: username,
      task_id: taskId,
      increment: increment
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật tiến trình nhiệm vụ:', error);
    throw error;
  }
};

export const updateDailyActivity = async (username, questionsAnswered = 1, correctAnswers = 0, pointsEarned = 0) => {
  try {
    const response = await api.post('/tasks/daily-activity/', {
      username: username,
      questions_answered: questionsAnswered,
      correct_answers: correctAnswers,
      points_earned: pointsEarned
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật hoạt động hàng ngày:', error);
    throw error;
  }
};

export const getLeaderboard = async (type = 'total', limit = 10) => {
  try {
    const response = await api.get(`/leaderboard/?type=${type}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy bảng xếp hạng:', error);
    throw error;
  }
};

// Weekly Question System endpoints
export const getWeeklyQuestionSets = async () => {
  try {
    const response = await api.get('/weekly-questions/sets/');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy bộ câu hỏi tuần:', error);
    throw error;
  }
};

export const getWeeklyQuestionProgress = async (username) => {
  try {
    const response = await api.get(`/weekly-questions/progress/?username=${username}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy tiến trình câu hỏi tuần:', error);
    throw error;
  }
};

export const getWeeklyQuestions = async (username) => {
  try {
    const response = await api.get(`/weekly-questions/?username=${username}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy câu hỏi tuần:', error);
    throw error;
  }
};

export const updateWeeklyQuestionProgress = async (username, questionId, userAnswer) => {
  try {
    const response = await api.post('/weekly-questions/progress/', {
      username: username,
      question_id: questionId,
      user_answer: userAnswer
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật tiến trình câu hỏi tuần:', error);
    throw error;
  }
};

export default api;
