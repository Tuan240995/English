import React, { useState, useEffect, useCallback } from 'react';
import { getRandomQuestion, getListeningQuestion, checkAnswer, getTopics, updateDailyActivity } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

// Custom styles for suggestions
const customStyles = `
  .suggestion-item:hover {
    background-color: #F8F9FA !important;
  }

  .suggestion-item {
    transition: background-color 0.2s ease;
  }

  .suggestion-dropdown {
    border-top: none !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }
`;

const EnglishLearning = ({ user }) => {
  const [question, setQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [learningMode, setLearningMode] = useState('translation'); // 'translation' or 'listening'
  const [speechRate, setSpeechRate] = useState(0.9); // Tốc độ phát âm (0.5 - 2.0)
  const [showVietnameseHint, setShowVietnameseHint] = useState(false); // Hiển thị gợi ý tiếng Việt

  const loadTopics = async () => {
    try {
      const topicsData = await getTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Lỗi khi tải danh sách chủ đề:', error);
    }
  };

  const fetchNewQuestion = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserAnswer('');
    setResult(null);
    setShowVietnameseHint(false); // Đặt lại gợi ý tiếng Việt

    try {
      let newQuestion;
      if (learningMode === 'listening') {
        newQuestion = await getListeningQuestion(difficulty, selectedTopic || null);
      } else {
        newQuestion = await getRandomQuestion(difficulty, selectedTopic || null);
      }
      setQuestion(newQuestion);
    } catch (error) {
      console.error('Lỗi khi lấy câu hỏi mới:', error);
      alert('Không thể lấy câu hỏi mới. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, selectedTopic, learningMode]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();

    if (!userAnswer.trim()) {
      alert('Vui lòng nhập câu trả lời!');
      return;
    }

    setLoading(true);

    try {
      const checkResult = await checkAnswer(question.id, userAnswer, user?.username);
      setResult(checkResult);
      setShowResult(true);

      // Cập nhật điểm số
      setScore(prev => ({
        correct: prev.correct + (checkResult.is_correct ? 1 : 0),
        total: prev.total + 1
      }));

      // Cập nhật hoạt động hàng ngày cho task system
      if (user) {
        const pointsEarned = checkResult.is_correct ? 10 : 2; // 10 điểm cho đúng, 2 điểm cho sai
        await updateDailyActivity(
          user.username,
          1, // 1 câu hỏi
          checkResult.is_correct ? 1 : 0, // 1 câu đúng nếu đúng
          pointsEarned
        );
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra câu trả lời:', error);
      alert('Không thể kiểm tra câu trả lời. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'danger';
      default: return 'secondary';
    }
  };

  const getDifficultyText = (diff) => {
    switch (diff) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return 'Trung bình';
    }
  };

  const getResultAlertClass = (isCorrect) => {
    if (isCorrect) return 'alert-success';
    return 'alert-danger';
  };

  const getSimilarityPercentage = (score) => {
    return Math.round(score * 100);
  };

  // Function to get word suggestions based on current input
  const getWordSuggestions = (currentText, correctAnswer) => {
    if (!currentText || !correctAnswer) return [];

    const userWords = currentText.trim().split(/\s+/);
    const correctWords = correctAnswer.trim().split(/\s+/);
    const currentWord = userWords[userWords.length - 1] || '';

    // If user is typing the last word, suggest the next word
    if (userWords.length > 0 && userWords.length <= correctWords.length) {
      const nextWordIndex = userWords.length;
      if (nextWordIndex < correctWords.length) {
        const nextWord = correctWords[nextWordIndex];

        // If current word is partially correct, suggest completion
        if (currentWord && nextWord.toLowerCase().startsWith(currentWord.toLowerCase())) {
          return [nextWord];
        }

        // Always suggest the next word
        return [nextWord];
      }
    }

    return [];
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newText = e.target.value;
    setUserAnswer(newText);
    // Hide suggestions when typing
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle hint button click
  const handleHintClick = () => {
    if (question && userAnswer.trim()) {
      const newSuggestions = getWordSuggestions(userAnswer, question.english_text);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    const userWords = userAnswer.trim().split(/\s+/);

    // If the last word is partially matching the suggestion, replace it
    if (userWords.length > 0) {
      const lastWord = userWords[userWords.length - 1];
      if (lastWord && suggestion.toLowerCase().startsWith(lastWord.toLowerCase())) {
        userWords[userWords.length - 1] = suggestion;
      } else {
        userWords.push(suggestion);
      }
    } else {
      userWords.push(suggestion);
    }

    const newText = userWords.join(' ') + ' ';
    setUserAnswer(newText);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        handleSuggestionClick(suggestions[0]);
      } else if (e.ctrlKey) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }
  };

  // Function to compare texts and highlight differences
  const highlightTextDifferences = (userText, correctText) => {
    // Split both texts into words
    const userWords = userText.trim().split(/\s+/);
    const correctWords = correctText.trim().split(/\s+/);

    const highlightedUserWords = [];
    const highlightedCorrectWords = [];

    // Create a map of correct words for easier lookup
    const correctWordsMap = new Map();
    correctWords.forEach((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord) {
        if (!correctWordsMap.has(cleanWord)) {
          correctWordsMap.set(cleanWord, []);
        }
        correctWordsMap.get(cleanWord).push({ word, index });
      }
    });

    // Track which correct words have been matched
    const matchedCorrectIndices = new Set();

    // First pass: find exact matches in correct position
    for (let i = 0; i < Math.max(userWords.length, correctWords.length); i++) {
      const userWord = userWords[i] || '';
      const correctWord = correctWords[i] || '';

      const userWordClean = userWord.toLowerCase().replace(/[^\w]/g, '');
      const correctWordClean = correctWord.toLowerCase().replace(/[^\w]/g, '');

      if (userWordClean && correctWordClean && userWordClean === correctWordClean) {
        // Exact match at same position
        highlightedUserWords.push(<span key={`user-${i}`} className="text-success">{userWord} </span>);
        highlightedCorrectWords.push(<span key={`correct-${i}`} className="text-success">{correctWord} </span>);
        matchedCorrectIndices.add(i);
      } else if (!userWord && correctWord) {
        // Missing word in user text
        highlightedUserWords.push(<span key={`user-${i}`} className="text-muted">[___] </span>);
        highlightedCorrectWords.push(<span key={`correct-${i}`} className="text-warning bg-warning bg-opacity-25 px-1 rounded">{correctWord} </span>);
        matchedCorrectIndices.add(i);
      } else if (userWord && !correctWord) {
        // Extra word in user text
        highlightedUserWords.push(<span key={`user-${i}`} className="text-danger bg-danger bg-opacity-25 px-1 rounded">{userWord} </span>);
      } else {
        // Different words or one is empty - handle in second pass
        highlightedUserWords.push(null); // Placeholder
        highlightedCorrectWords.push(null); // Placeholder
      }
    }

    // Second pass: handle unmatched words
    for (let i = 0; i < highlightedUserWords.length; i++) {
      if (highlightedUserWords[i] === null) {
        const userWord = userWords[i] || '';
        const correctWord = correctWords[i] || '';

        const userWordClean = userWord.toLowerCase().replace(/[^\w]/g, '');

        if (userWordClean && correctWordsMap.has(userWordClean)) {
          // User word exists somewhere in correct text but wrong position
          const matches = correctWordsMap.get(userWordClean);
          const unmatchedMatch = matches.find(match => !matchedCorrectIndices.has(match.index));

          if (unmatchedMatch) {
            highlightedUserWords[i] = <span key={`user-${i}`} className="text-warning bg-warning bg-opacity-25 px-1 rounded">{userWord} </span>;
            highlightedCorrectWords[i] = <span key={`correct-${i}`} className="text-success">{correctWord} </span>;
            matchedCorrectIndices.add(unmatchedMatch.index);
          } else {
            // All instances already matched
            highlightedUserWords[i] = <span key={`user-${i}`} className="text-danger bg-danger bg-opacity-25 px-1 rounded">{userWord} </span>;
            highlightedCorrectWords[i] = <span key={`correct-${i}`} className="text-success">{correctWord} </span>;
          }
        } else {
          // User word doesn't exist in correct text
          highlightedUserWords[i] = <span key={`user-${i}`} className="text-danger bg-danger bg-opacity-25 px-1 rounded">{userWord} </span>;
          highlightedCorrectWords[i] = <span key={`correct-${i}`} className="text-success">{correctWord} </span>;
        }
      }
    }

    return {
      highlightedUser: highlightedUserWords.filter(Boolean),
      highlightedCorrect: highlightedCorrectWords.filter(Boolean)
    };
  };

  // Text-to-speech function
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = speechRate; // Use custom speech rate
      utterance.pitch = 1;
      utterance.volume = 1;

      // Get available voices and prefer English voices
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice =>
        (voice.lang.startsWith('en') && voice.name.includes('Google')) ||
        voice.name.includes('Microsoft') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen')
      );

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } else {
      alert('Trình duyệt của bạn không hỗ trợ tính năng đọc văn bản.');
    }
  };

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };

      loadVoices();

      // Some browsers need this event
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Handle keyboard events for result screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showResult && e.key === 'Enter') {
        e.preventDefault();
        fetchNewQuestion();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResult, fetchNewQuestion]);

  // Handle keyboard events for listening mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space key to play audio in listening mode (only when not typing in textarea)
      if (learningMode === 'listening' && !showResult && e.ctrlKey) {
        e.preventDefault();
        if (question && question.english_text) {
          speakText(question.english_text);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [learningMode, showResult, question, speakText]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('showVietnameseHint changed:', showVietnameseHint);
    console.log('question vietnamese:', question?.vietnamese_text);
  }, [showVietnameseHint, question]);

  // Load topics khi component được mount
  useEffect(() => {
    loadTopics();
  }, []);

  // Lấy câu hỏi mới khi component được mount hoặc khi thay đổi độ khó, chủ đề, hoặc mode
  useEffect(() => {
    if (topics.length > 0) {
      fetchNewQuestion();
    }
  }, [difficulty, selectedTopic, topics.length, learningMode]);

  // Inject custom styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="text-center mb-0">Học Tiếng Anh</h2>
            </div>
            <div className="card-body">
              {/* Mode Selection */}
              <div className="row mb-3">
                <div className="col-12">
                  <div className="d-flex justify-content-center align-items-center gap-3">
                    <span className="fw-bold">Chế độ học:</span>
                    <div className="btn-group" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="learningMode"
                        id="translationMode"
                        value="translation"
                        checked={learningMode === 'translation'}
                        onChange={(e) => setLearningMode(e.target.value)}
                      />
                      <label className="btn btn-outline-primary" htmlFor="translationMode">
                        📝 Dịch câu
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="learningMode"
                        id="listeningMode"
                        value="listening"
                        checked={learningMode === 'listening'}
                        onChange={(e) => setLearningMode(e.target.value)}
                      />
                      <label className="btn btn-outline-success" htmlFor="listeningMode">
                        🎧 Nghe-viết
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Điểm số và điều khiển */}
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Điểm số:</span>
                    <span className="badge bg-info">
                      {score.correct}/{score.total} ({score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="col-md-5">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Chủ đề:</span>
                    <select
                      className="form-select form-select-sm"
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      style={{ minWidth: '180px', maxWidth: '250px' }}
                    >
                      <option value="">📚 Tất cả</option>
                      {topics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.icon} {topic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Độ khó:</span>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: '120px' }}
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tốc độ phát âm (chỉ hiển thị ở mode nghe-viết) */}
              {learningMode === 'listening' && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="d-flex justify-content-center align-items-center gap-3">
                      <span className="fw-bold">Tốc độ phát âm:</span>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSpeechRate(0.5)}
                          title="Rất chậm (0.5x)"
                        >
                          🐌
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSpeechRate(0.7)}
                          title="Chậm (0.7x)"
                        >
                          🚶
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSpeechRate(0.9)}
                          title="Bình thường (0.9x)"
                        >
                          🚶‍♂️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSpeechRate(1.1)}
                          title="Nhanh (1.1x)"
                        >
                          🚶‍♀️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSpeechRate(1.3)}
                          title="Nhanh (1.3x)"
                        >
                          🏃
                        </button>
                        <div className="d-flex align-items-center gap-2 ms-3">
                          <input
                            type="range"
                            className="form-range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            style={{ width: '150px' }}
                          />
                          <span className="badge bg-secondary">{speechRate.toFixed(1)}x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="text-center my-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              )}

              {/* Câu hỏi */}
              {question && !loading && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      {learningMode === 'listening' ? 'Nghe câu sau và viết lại:' : 'Dịch câu sau sang tiếng Anh:'}
                    </h5>
                    <div className="d-flex gap-2">
                      {question.topic_name && (
                        <span className="badge bg-info">
                          📚 {question.topic_name}
                        </span>
                      )}
                      <span className={`badge bg-${getDifficultyColor(question.difficulty)}`}>
                        {getDifficultyText(question.difficulty)}
                      </span>
                      {learningMode === 'listening' ? (
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => setShowVietnameseHint(!showVietnameseHint)}
                          title="Hiển thị/ẩn câu dịch tiếng Việt"
                        >
                          💡 Hiện tiếng việt
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => speakText(question.english_text)}
                          title="Nghe đáp án đúng (gợi ý)"
                        >
                          🔊 Nghe gợi ý
                        </button>
                      )}
                    </div>
                  </div>
                  {learningMode === 'listening' ? (
                    <div className="alert alert-success border border-success text-center">
                      <div className="mb-3">
                        <button
                          className="btn btn-lg btn-success"
                          onClick={() => speakText(question.english_text)}
                          title="Nhấn để nghe câu (hoặc nhấn phím Space)"
                        >
                          <i className="bi bi-play-circle-fill me-2"></i>
                          🔊 Nghe câu
                        </button>
                      </div>
                      <p className="mb-0 text-muted">
                        <small>Nhấn vào nút trên để nghe câu tiếng Anh, sau đó viết lại câu bạn đã nghe</small>
                      </p>

                      {showVietnameseHint && (
                        <div className="mt-3 p-3 bg-light rounded border">
                          <h6 className="mb-2 text-primary">
                            <i className="bi bi-lightbulb me-2"></i>
                            Câu Tiếng Việt:
                          </h6>
                          <p className="mb-0">
                            <strong>{question.vietnamese_text || 'Đang tải câu dịch...'}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-light border border-primary">
                      <h4 className="text-center mb-0">{question.vietnamese_text}</h4>
                    </div>
                  )}
                </div>
              )}

              {/* Form nhập câu trả lời */}
              {!showResult && question && !loading && (
                <form onSubmit={handleSubmitAnswer}>
                  <div className="mb-3">
                    <label htmlFor="userAnswer" className="form-label fw-bold">
                      Câu trả lời của bạn:
                    </label>
                    <div className="position-relative">
                      <textarea
                        className="form-control"
                        id="userAnswer"
                        rows="3"
                        value={userAnswer}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          handleKeyDown(e);
                          // Xử lý phím Enter để submit form
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitAnswer(e);
                          }
                        }}
                        placeholder={learningMode === 'listening' ? "Viết lại câu tiếng Anh bạn đã nghe..." : "Nhập câu tiếng Anh tương ứng..."}
                        autoFocus
                      />

                      {/* Suggestions dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="position-absolute w-100 bg-white border border-secondary rounded-top-0 shadow-sm suggestion-dropdown"
                             style={{ top: '100%', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                          <div className="p-2 border-bottom bg-light">
                            <small className="text-muted">
                              💡 Gợi ý từ tiếp theo:
                            </small>
                          </div>
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 suggestion-item cursor-pointer hover-bg-light"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleSuggestionClick(suggestion)}
                              onMouseEnter={(e) => e.target.classList.add('bg-light')}
                              onMouseLeave={(e) => e.target.classList.remove('bg-light')}
                            >
                              <span className="fw-medium text-primary">{suggestion}</span>
                              <small className="text-muted ms-2">(Tab để chọn)</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                    <button
                      type="button"
                      className="btn btn-outline-warning me-md-2"
                      onClick={handleHintClick}
                      disabled={loading || !userAnswer.trim()}
                      title="Gợi ý từ tiếp theo"
                    >
                      💡 Gợi ý
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary me-md-2"
                      onClick={fetchNewQuestion}
                      disabled={loading}
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Kiểm tra
                    </button>
                  </div>
                </form>
              )}

              {/* Kết quả */}
              {showResult && result && (
                <div>
                  <div className={`alert ${getResultAlertClass(result.is_correct)} mb-4`}>
                    <h5 className="alert-heading">
                      {result.is_correct ? '🥳: Chính xác!' : '❌ Chưa chính xác'}
                    </h5>
                    <p className="mb-2">{result.message}</p>
                    <hr />
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Độ tương đồng:</strong> {getSimilarityPercentage(result.similarity_score)}%
                      </div>
                      <div className="col-md-6">
                        <strong>Kết quả:</strong> {result.is_correct ? 'Đúng' : 'Sai'}
                      </div>
                    </div>
                  </div>

                  {/* So sánh câu trả lời với highlight */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                          <strong>Câu trả lời của bạn:</strong>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => speakText(result.user_answer)}
                            title="Đọc câu trả lời của bạn"
                          >
                            🔊 Đọc
                          </button>
                        </div>
                        <div className="card-body">
                          <div className="mb-2">
                            <small className="text-muted">
                              <span className="text-danger bg-danger bg-opacity-25 px-1 rounded">■</span> Từ sai/thiếu |
                              <span className="text-warning bg-warning bg-opacity-25 px-1 rounded">■</span> Từ sai vị trí |
                              <span className="text-success">■</span> Từ đúng
                            </small>
                          </div>
                          <p className="mb-0" style={{ lineHeight: '1.6', fontSize: '16px' }}>
                            {highlightTextDifferences(result.user_answer, result.correct_answer).highlightedUser}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                          <strong>Đáp án đúng:</strong>
                          <button
                            className="btn btn-sm btn-light"
                            onClick={() => speakText(result.correct_answer)}
                            title="Đọc đáp án đúng"
                          >
                            🔊 Đọc
                          </button>
                        </div>
                        <div className="card-body">
                          <p className="mb-0" style={{ lineHeight: '1.6', fontSize: '16px' }}>
                            {highlightTextDifferences(result.user_answer, result.correct_answer).highlightedCorrect}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={fetchNewQuestion}
                      disabled={loading}
                    >
                      Câu tiếp theo →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnglishLearning;
