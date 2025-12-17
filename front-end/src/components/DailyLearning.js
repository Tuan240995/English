import React, { useState, useEffect, useCallback } from 'react';
import {
  getDailyLearningDashboard,
  startDailyLearningSession,
  getDailyLearningSessions,
  submitDailyLearningAnswer,
  getDailyLearningSettings,
  updateDailyLearningSettings,
  resetDailyLearningSession,
  getTopics
} from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const DailyLearning = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [topics, setTopics] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showVietnameseHint, setShowVietnameseHint] = useState(false);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!user?.username) return;
    
    try {
      setLoading(true);
      const dashboardData = await getDailyLearningDashboard(user.username);
      setDashboard(dashboardData);
      setSettings(dashboardData.user_settings);
      setSpeechRate(dashboardData.user_settings.speech_rate);
    } catch (error) {
      console.error('Lỗi khi tải dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load topics
  const loadTopics = async () => {
    try {
      const topicsData = await getTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Lỗi khi tải danh sách chủ đề:', error);
    }
  };

  // Start new learning session
  const startSession = async (exerciseType) => {
    if (!user?.username) return;

    try {
      setLoading(true);
      const sessionData = await startDailyLearningSession(
        user.username,
        exerciseType,
        settings?.daily_target || 10
      );
      setCurrentSession(sessionData.session);
      setActiveTab('learning');
      setSessionStartTime(Date.now());
      
      // Get first question
      if (sessionData.session.next_question) {
        setCurrentQuestion(sessionData.session.next_question);
        setQuestionStartTime(Date.now());
      }
    } catch (error) {
      console.error('Lỗi khi bắt đầu buổi học:', error);
      alert('Không thể bắt đầu buổi học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!user?.username || !currentSession || !currentQuestion || !userAnswer.trim()) {
      alert('Vui lòng nhập câu trả lời!');
      return;
    }

    try {
      setLoading(true);
      const timeTaken = questionStartTime ? Math.round((Date.now() - questionStartTime) / 1000) : 0;
      
      const resultData = await submitDailyLearningAnswer(
        user.username,
        currentSession.id,
        currentQuestion.id,
        userAnswer,
        timeTaken
      );

      setResult(resultData);
      setUserAnswer('');
      setQuestionStartTime(null);

      // Update session progress
      setCurrentSession(prev => ({
        ...prev,
        completed_questions: resultData.session_progress.completed_questions,
        correct_answers: resultData.session_progress.correct_answers,
        points_earned: resultData.session_progress.points_earned,
        is_completed: resultData.session_progress.is_completed,
        progress_percentage: resultData.session_progress.progress_percentage,
        accuracy_rate: resultData.session_progress.accuracy_rate
      }));

      // Get next question if session not completed
      if (!resultData.session_progress.is_completed) {
        // Load updated session to get next question
        const sessionsData = await getDailyLearningSessions(user.username, currentSession.exercise_type);
        if (sessionsData.sessions && sessionsData.sessions.length > 0) {
          const updatedSession = sessionsData.sessions.find(s => s.id === currentSession.id);
          if (updatedSession && updatedSession.next_question) {
            setCurrentQuestion(updatedSession.next_question);
            setQuestionStartTime(Date.now());
          }
        }
      } else {
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error('Lỗi khi nộp bài:', error);
      alert('Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Update settings
  const updateSettings = async (newSettings) => {
    if (!user?.username) return;

    try {
      setLoading(true);
      const updatedSettings = await updateDailyLearningSettings(user.username, newSettings);
      setSettings(updatedSettings.settings);
      setSpeechRate(updatedSettings.settings.speech_rate);
      setShowSettings(false);
      alert('Cập nhật cài đặt thành công!');
    } catch (error) {
      console.error('Lỗi khi cập nhật cài đặt:', error);
      alert('Không thể cập nhật cài đặt. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Reset current session
  const resetSession = async () => {
    if (!user?.username || !currentSession) return;

    if (!window.confirm('Bạn có chắc muốn làm lại buổi học này? Toàn bộ tiến trình sẽ được đặt lại.')) {
      return;
    }

    try {
      setLoading(true);
      await resetDailyLearningSession(user.username, currentSession.id);
      
      // Reset local state
      setCurrentQuestion(null);
      setUserAnswer('');
      setResult(null);
      setQuestionStartTime(null);
      
      // Reload session to get reset state
      const sessionsData = await getDailyLearningSessions(user.username, currentSession.exercise_type);
      if (sessionsData.sessions && sessionsData.sessions.length > 0) {
        const updatedSession = sessionsData.sessions.find(s => s.id === currentSession.id);
        if (updatedSession) {
          setCurrentSession(updatedSession);
          if (updatedSession.next_question) {
            setCurrentQuestion(updatedSession.next_question);
            setQuestionStartTime(Date.now());
          }
        }
      }
      
      alert('Buổi học đã được làm lại thành công!');
    } catch (error) {
      console.error('Lỗi khi làm lại buổi học:', error);
      alert('Không thể làm lại buổi học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Text-to-speech function
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = speechRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get all available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order for English voices (most natural first)
      const preferredVoices = [
        // Google voices (usually very natural)
        'Google US English',
        'Google UK English Female',
        'Google UK English Male',
        'Google español de Estados Unidos',
        'Google français',
        'Google italiano',
        'Google Deutsch',
        'Google português do Brasil',
        'Google Bahasa Indonesia',
        'Google Nederlands',
        'Google polski',
        'Google dansk',
        'Google suomi',
        'Google norsk',
        'Google svenska',
        'Google Türkçe',
        'Google русский',
        'Google हिन्दी',
        'Google தமிழ்',
        'Google తెలుగు',
        'Google euskara',
        'Google català',
        'Google čeština',
        'Google Ελληνικά',
        'Google עברית',
        'Google magyar',
        'Google íslenska',
        'Google Indonesia',
        'Google latviešu',
        'Google lietuvių',
        'Google slovenčina',
        'Google slovenščina',
        'Google српски',
        'Google hrvatski',
        'Google български',
        'Google українська',
        
        // Microsoft voices (high quality)
        'Microsoft Zira Desktop',
        'Microsoft David Desktop',
        'Microsoft Mark Desktop',
        'Microsoft Hazel Desktop',
        'Microsoft Guy Desktop',
        'Microsoft Susan Desktop',
        'Microsoft Heera Desktop',
        'Microsoft Ravi Desktop',
        'Microsoft Kalpana Desktop',
        'Microsoft Priya Desktop',
        'Microsoft Irina Desktop',
        'Microsoft Alyona Desktop',
        'Microsoft Elsa Desktop',
        'Microsoft Sabina Desktop',
        'Microsoft Heidi Desktop',
        'Microsoft Karsten Desktop',
        'Microsoft Katja Desktop',
        'Microsoft Helle Desktop',
        'Microsoft Filip Desktop',
        'Microsoft Jorgen Desktop',
        'Microsoft Gunda Desktop',
        'Microsoft Herminia Desktop',
        'Microsoft Lara Desktop',
        'Microsoft Naja Desktop',
        'Microsoft Maja Desktop',
        'Microsoft Sara Desktop',
        
        // Apple voices (very natural on Apple devices)
        'Samantha',
        'Karen',
        'Moira',
        'Tessa',
        'Veena',
        'Monica',
        'Paulina',
        'Satu',
        'Amelie',
        'Thomas',
        'Daniel',
        'Karen',
        'Moira',
        'Tessa',
        'Veena',
        'Samantha',
        'Alex',
        'Fred',
        'Victoria',
        
        // Amazon voices (if available)
        'Joanna',
        'Joey',
        'Justin',
        'Kendra',
        'Kimberly',
        'Matthew',
        'Salli',
        'Nicole',
        'Russell',
        'Amy',
        'Brian',
        'Emma',
        'Raveena',
        'Ivy',
        'Justin',
        
        // Other high-quality voices
        'Allison',
        'Astrid',
        'Carmit',
        'Damayanti',
        'Diana',
        'Fiona',
        'Filiz',
        'Gwyneth',
        'Jorge',
        'Lea',
        'Luciana',
        'Mabel',
        'Mei-Jia',
        'Melina',
        'Milena',
        'Nora',
        'Penelope',
        'Raúl',
        'Sofia',
        'Tatyana',
        'Xander',
        'Yelda',
        'Zoe',
        'Zuzana'
      ];

      // Try to find the best available voice
      let selectedVoice = null;
      
      // First try exact matches with preferred voices
      for (const preferredName of preferredVoices) {
        const voice = voices.find(v => v.name === preferredName);
        if (voice) {
          selectedVoice = voice;
          break;
        }
      }

      // If no exact match, try to find any high-quality English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice =>
          (voice.lang.startsWith('en') && (
            voice.name.includes('Google') ||
            voice.name.includes('Microsoft') ||
            voice.name.includes('Samantha') ||
            voice.name.includes('Karen') ||
            voice.name.includes('Alex') ||
            voice.name.includes('Daniel') ||
            voice.name.includes('Joanna') ||
            voice.name.includes('Matthew') ||
            voice.name.includes('Nicole') ||
            voice.name.includes('Russell') ||
            voice.name.includes('Amy') ||
            voice.name.includes('Brian') ||
            voice.name.includes('Emma') ||
            voice.name.includes('Allison')
          ))
        );
      }

      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }

      // Final fallback to any voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
      } else {
        console.warn('No voice found, using default');
      }

      // Adjust parameters for more natural speech
      utterance.rate = Math.max(0.7, Math.min(1.3, speechRate)); // Limit rate for naturalness
      utterance.pitch = 0.9; // Slightly lower pitch for more natural sound
      utterance.volume = 0.9; // Slightly lower volume for better quality

      window.speechSynthesis.speak(utterance);
    } else {
      alert('Trình duyệt của bạn không hỗ trợ tính năng đọc văn bản.');
    }
  };

  // Get exercise type display
  const getExerciseTypeDisplay = (type) => {
    switch (type) {
      case 'translation': return '📝 Dịch câu';
      case 'listening': return '🎧 Nghe-viết';
      case 'mixed': return '🔄 Kết hợp (Dịch câu + Nghe-viết)';
      default: return type;
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'danger';
      default: return 'secondary';
    }
  };

  // Get difficulty text
  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return 'Trung bình';
    }
  };

  // Effects
  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    if (user?.username) {
      loadDashboard();
    }
  }, [user, loadDashboard]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Load next question when needed
  useEffect(() => {
    if (activeTab === 'learning' && currentSession && !currentQuestion && !result) {
      // Load current session to get next question
      const loadSession = async () => {
        try {
          const sessionsData = await getDailyLearningSessions(user.username, currentSession.exercise_type);
          if (sessionsData.sessions && sessionsData.sessions.length > 0) {
            const updatedSession = sessionsData.sessions.find(s => s.id === currentSession.id);
            if (updatedSession && updatedSession.next_question) {
              setCurrentQuestion(updatedSession.next_question);
              setQuestionStartTime(Date.now());
            }
          }
        } catch (error) {
          console.error('Lỗi khi tải buổi học:', error);
        }
      };
      loadSession();
    }
  }, [activeTab, currentSession, currentQuestion, result, user]);

  if (!user?.username) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-warning">
              <h4>Vui lòng đăng nhập để sử dụng tính năng học tập hàng ngày</h4>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">📚 Học Tập Hàng Ngày</h2>
            </div>
            <div className="card-body">
              {/* Navigation Tabs */}
              <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    📊 Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'learning' ? 'active' : ''}`}
                    onClick={() => setActiveTab('learning')}
                  >
                    🎯 Bắt đầu học
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    ⚙️ Cài đặt
                  </button>
                </li>
              </ul>

              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div>
                  {loading ? (
                    <div className="text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  ) : dashboard ? (
                    <div>
                      {/* Learning Streak */}
                      <div className="row mb-4">
                        <div className="col-md-4">
                          <div className="card bg-warning text-white">
                            <div className="card-body text-center">
                              <h3>{dashboard.learning_streak.current_streak}</h3>
                              <p className="mb-0">Chuỗi học tập hiện tại {dashboard.learning_streak.streak_emoji}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-info text-white">
                            <div className="card-body text-center">
                              <h3>{dashboard.learning_streak.longest_streak}</h3>
                              <p className="mb-0">Chuỗi dài nhất</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-success text-white">
                            <div className="card-body text-center">
                              <h3>{dashboard.learning_streak.total_days_learned}</h3>
                              <p className="mb-0">Tổng ngày học</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Today's Sessions */}
                      <div className="mb-4">
                        <h4>📅 Buổi học hôm nay</h4>
                        {dashboard.today_sessions.length > 0 ? (
                          <div className="row">
                            {dashboard.today_sessions.map((session, index) => (
                              <div key={index} className="col-md-6 mb-3">
                                <div className="card">
                                  <div className="card-body">
                                    <h6 className="card-title">
                                      {getExerciseTypeDisplay(session.exercise_type)}
                                    </h6>
                                    <div className="progress mb-2">
                                      <div
                                        className="progress-bar"
                                        role="progressbar"
                                        style={{ width: `${session.progress_percentage}%` }}
                                      >
                                        {session.progress_percentage.toFixed(1)}%
                                      </div>
                                    </div>
                                    <p className="card-text">
                                      <small>
                                        {session.completed_questions}/{session.target_questions} câu hỏi
                                        <br />
                                        Đúng: {session.correct_answers} ({session.accuracy_rate.toFixed(1)}%)
                                        <br />
                                        Điểm: {session.points_earned}
                                      </small>
                                    </p>
                                    {session.is_completed && (
                                      <span className="badge bg-success">✅ Hoàn thành</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="alert alert-info">
                            Chưa có buổi học nào hôm nay. Hãy bắt đầu học ngay!
                          </div>
                        )}
                      </div>

                      {/* Weekly Stats */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h5>📊 Thống kê tuần</h5>
                          <div className="card">
                            <div className="card-body">
                              <p><strong>Số buổi học:</strong> {dashboard.weekly_stats.total_sessions}</p>
                              <p><strong>Số câu hỏi:</strong> {dashboard.weekly_stats.total_questions}</p>
                              <p><strong>Đáp án đúng:</strong> {dashboard.weekly_stats.correct_answers}</p>
                              <p><strong>Điểm earned:</strong> {dashboard.weekly_stats.points_earned}</p>
                              <p><strong>Ngày active:</strong> {dashboard.weekly_stats.days_active}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h5>📈 Thống kê tháng</h5>
                          <div className="card">
                            <div className="card-body">
                              <p><strong>Số buổi học:</strong> {dashboard.monthly_stats.total_sessions}</p>
                              <p><strong>Số câu hỏi:</strong> {dashboard.monthly_stats.total_questions}</p>
                              <p><strong>Đáp án đúng:</strong> {dashboard.monthly_stats.correct_answers}</p>
                              <p><strong>Điểm earned:</strong> {dashboard.monthly_stats.points_earned}</p>
                              <p><strong>Ngày active:</strong> {dashboard.monthly_stats.days_active}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Achievements */}
                      {dashboard.achievements.length > 0 && (
                        <div>
                          <h4>🏆 Thành tích</h4>
                          <div className="row">
                            {dashboard.achievements.map((achievement, index) => (
                              <div key={index} className="col-md-6 mb-3">
                                <div className="card bg-light">
                                  <div className="card-body">
                                    <h6 className="card-title">{achievement.title}</h6>
                                    <p className="card-text small">{achievement.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      Không có dữ liệu dashboard. Vui lòng tải lại trang.
                    </div>
                  )}
                </div>
              )}

              {/* Learning Tab */}
              {activeTab === 'learning' && (
                <div>
                  {!currentSession ? (
                    <div className="text-center">
                      <h4>Chọn loại bài tập để bắt đầu</h4>
                      <div className="row justify-content-center mt-4">
                        <div className="col-md-4 mb-3">
                          <button
                            className="btn btn-primary btn-lg w-100"
                            onClick={() => startSession('translation')}
                            disabled={loading}
                          >
                            📝 Dịch câu
                          </button>
                        </div>
                        <div className="col-md-4 mb-3">
                          <button
                            className="btn btn-success btn-lg w-100"
                            onClick={() => startSession('listening')}
                            disabled={loading}
                          >
                            🎧 Nghe-viết
                          </button>
                        </div>
                        <div className="col-md-4 mb-3">
                          <button
                            className="btn btn-info btn-lg w-100"
                            onClick={() => startSession('mixed')}
                            disabled={loading}
                          >
                            🔄 Kết hợp
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Session Progress */}
                      <div className="row mb-4">
                        <div className="col-md-8">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>
                              <strong>{getExerciseTypeDisplay(currentSession.exercise_type)}</strong>
                            </span>
                            <span>
                              {currentSession.completed_questions}/{currentSession.target_questions} câu hỏi
                            </span>
                          </div>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{ width: `${currentSession.progress_percentage}%` }}
                            >
                              {currentSession.progress_percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4 text-end">
                          <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={resetSession}
                            disabled={loading}
                            title="Làm lại buổi học này"
                          >
                            🔄 Làm lại
                          </button>
                          <span className="badge bg-info me-2">
                            Đúng: {currentSession.correct_answers}
                          </span>
                          <span className="badge bg-success">
                            Điểm: {currentSession.points_earned}
                          </span>
                        </div>
                      </div>

                      {/* Current Question */}
                      {currentQuestion ? (
                        <div>
                          <div className="card mb-4">
                            <div className="card-header">
                              <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">
                                  {(() => {
                                    // Determine the actual exercise type for mixed sessions
                                    const actualExerciseType = currentSession.exercise_type === 'mixed'
                                      ? (currentQuestion.exercise_subtype || 'translation')
                                      : currentSession.exercise_type;

                                    return actualExerciseType === 'listening'
                                      ? 'Nghe câu sau và viết lại:'
                                      : 'Dịch câu sau sang tiếng Anh:';
                                  })()}
                                </h5>
                                <div>
                                  {currentQuestion.topic_name && (
                                    <span className="badge bg-info me-2">
                                      📚 {currentQuestion.topic_name}
                                    </span>
                                  )}
                                  <span className={`badge bg-${getDifficultyColor(currentQuestion.difficulty)}`}>
                                    {getDifficultyText(currentQuestion.difficulty)}
                                  </span>
                                  {currentSession.exercise_type === 'mixed' && (
                                    <span className="badge bg-secondary ms-2">
                                      {currentQuestion.exercise_subtype === 'listening' ? '🎧 Nghe' : '📝 Dịch'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="card-body">
                              {(() => {
                                // Determine the actual exercise type for mixed sessions
                                const actualExerciseType = currentSession.exercise_type === 'mixed'
                                  ? (currentQuestion.exercise_subtype || 'translation')
                                  : currentSession.exercise_type;

                                return actualExerciseType === 'listening' ? (
                                  <div className="text-center">
                                    <button
                                      className="btn btn-lg btn-success mb-3"
                                      onClick={() => speakText(currentQuestion.english_text)}
                                    >
                                      🔊 Nghe câu
                                    </button>
                                    <p className="text-muted">
                                      Nhấn vào nút trên để nghe câu tiếng Anh, sau đó viết lại câu bạn đã nghe
                                    </p>
                                    {showVietnameseHint && (
                                      <div className="mt-3 p-3 bg-light rounded border">
                                        <h6 className="mb-2 text-primary">
                                          💡 Gợi ý Tiếng Việt:
                                        </h6>
                                        <p className="mb-0">
                                          <strong>{currentQuestion.vietnamese_text}</strong>
                                        </p>
                                      </div>
                                    )}
                                    <button
                                      className="btn btn-sm btn-outline-info mt-2"
                                      onClick={() => setShowVietnameseHint(!showVietnameseHint)}
                                    >
                                      {showVietnameseHint ? 'Ẩn' : 'Hiện'} gợi ý tiếng Việt
                                    </button>
                                  </div>
                                ) : (
                                  <div className="alert alert-light border border-primary text-center">
                                    <h4>{currentQuestion.vietnamese_text}</h4>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Answer Form */}
                          {!result && (
                            <div className="card">
                              <div className="card-body">
                                <form onSubmit={(e) => { e.preventDefault(); submitAnswer(); }}>
                                  <div className="mb-3">
                                    <label className="form-label fw-bold">
                                      Câu trả lời của bạn:
                                    </label>
                                    <textarea
                                      className="form-control"
                                      rows="3"
                                      value={userAnswer}
                                      onChange={(e) => setUserAnswer(e.target.value)}
                                      placeholder={
                                        currentSession.exercise_type === 'listening'
                                          ? "Viết lại câu tiếng Anh bạn đã nghe..."
                                          : "Nhập câu tiếng Anh tương ứng..."
                                      }
                                      autoFocus
                                    />
                                  </div>
                                  <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <button
                                      type="submit"
                                      className="btn btn-primary"
                                      disabled={loading || !userAnswer.trim()}
                                    >
                                      {loading ? 'Đang kiểm tra...' : 'Nộp bài'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {/* Result */}
                          {result && (
                            <div className="alert alert-info">
                              <h5>
                                {result.is_correct ? '✅ Chính xác!' : '❌ Chưa chính xác'}
                              </h5>
                              <p><strong>Độ tương đồng:</strong> {Math.round(result.similarity_score * 100)}%</p>
                              <p><strong>Phản hồi:</strong> {result.feedback}</p>
                              <p><strong>Đáp án đúng:</strong> {result.correct_answer}</p>
                              
                              <div className="mt-3">
                                <h6>Tiến trình buổi học:</h6>
                                <div className="progress mb-2">
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${result.session_progress.progress_percentage}%` }}
                                  >
                                    {result.session_progress.progress_percentage.toFixed(1)}%
                                  </div>
                                </div>
                                <p className="mb-0">
                                  {result.session_progress.completed_questions}/{result.session_progress.target_questions} câu hỏi
                                  <br />
                                  Đúng: {result.session_progress.correct_answers} ({result.session_progress.accuracy_rate.toFixed(1)}%)
                                  <br />
                                  Điểm: {result.session_progress.points_earned}
                                </p>
                              </div>

                              <div className="mt-3">
                                {result.session_progress.is_completed ? (
                                  <div>
                                    <div className="alert alert-success">
                                      :tada: Chúc mừng! Bạn đã hoàn thành buổi học hôm nay!
                                    </div>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => {
                                        setCurrentSession(null);
                                        setCurrentQuestion(null);
                                        setResult(null);
                                        setUserAnswer('');
                                      }}
                                    >
                                      Bắt đầu buổi học mới
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                      setResult(null);
                                      setUserAnswer('');
                                    }}
                                  >
                                    Câu tiếp theo →
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="alert alert-success">
                            :tada: Chúc mừng! Bạn đã hoàn thành buổi học!
                          </div>
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setCurrentSession(null);
                              setCurrentQuestion(null);
                              setResult(null);
                              setUserAnswer('');
                            }}
                          >
                            Bắt đầu buổi học mới
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div>
                  {settings ? (
                    <div>
                      <h4>Cài đặt học tập</h4>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Cài đặt chung</h5>
                              
                              <div className="mb-3">
                                <label className="form-label">Số câu hỏi mục tiêu mỗi ngày</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="1"
                                  max="50"
                                  value={settings.daily_target}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    daily_target: parseInt(e.target.value)
                                  })}
                                />
                              </div>

                              <div className="mb-3">
                                <label className="form-label">Độ khó ưu tiên</label>
                                <select
                                  className="form-select"
                                  value={settings.preferred_difficulty}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    preferred_difficulty: e.target.value
                                  })}
                                >
                                  <option value="easy">Dễ</option>
                                  <option value="medium">Trung bình</option>
                                  <option value="hard">Khó</option>
                                </select>
                              </div>

                              <div className="mb-3">
                                <label className="form-label">Loại bài tập</label>
                                <div>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id="translation"
                                      checked={settings.exercise_types_list.includes('translation')}
                                      onChange={(e) => {
                                        const types = e.target.checked
                                          ? [...settings.exercise_types_list, 'translation']
                                          : settings.exercise_types_list.filter(t => t !== 'translation');
                                        setSettings({...settings, exercise_types: types.join(',')});
                                      }}
                                    />
                                    <label className="form-check-label" htmlFor="translation">
                                      📝 Dịch câu
                                    </label>
                                  </div>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id="listening"
                                      checked={settings.exercise_types_list.includes('listening')}
                                      onChange={(e) => {
                                        const types = e.target.checked
                                          ? [...settings.exercise_types_list, 'listening']
                                          : settings.exercise_types_list.filter(t => t !== 'listening');
                                        setSettings({...settings, exercise_types: types.join(',')});
                                      }}
                                    />
                                    <label className="form-check-label" htmlFor="listening">
                                      🎧 Nghe-viết
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Cài đặt âm thanh</h5>
                              
                              <div className="mb-3">
                                <label className="form-label">Tốc độ phát âm: {speechRate.toFixed(1)}x</label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="0.5"
                                  max="2.0"
                                  step="0.1"
                                  value={speechRate}
                                  onChange={(e) => {
                                    const rate = parseFloat(e.target.value);
                                    setSpeechRate(rate);
                                    setSettings({...settings, speech_rate: rate});
                                  }}
                                />
                                <div className="d-flex justify-content-between">
                                  <small>0.5x</small>
                                  <small>1.0x</small>
                                  <small>2.0x</small>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="autoPlayAudio"
                                    checked={settings.auto_play_audio}
                                    onChange={(e) => setSettings({
                                      ...settings,
                                      auto_play_audio: e.target.checked
                                    })}
                                  />
                                  <label className="form-check-label" htmlFor="autoPlayAudio">
                                    Tự động phát âm thanh
                                  </label>
                                </div>
                              </div>

                              <div className="mb-3">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => speakText("Hello, this is a test of the speech synthesis system.")}
                                >
                                  🔊 Thử phát âm thanh
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          className="btn btn-primary"
                          onClick={() => updateSettings(settings)}
                          disabled={loading}
                        >
                          {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyLearning;
