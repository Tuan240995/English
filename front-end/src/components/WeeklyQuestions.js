import React, { useState, useEffect } from 'react';
import { getWeeklyQuestions, updateWeeklyQuestionProgress } from '../services/api';

const WeeklyQuestions = ({ user }) => {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [skippedQuestions, setSkippedQuestions] = useState([]);
  const [showSkippedQuestions, setShowSkippedQuestions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadWeeklyQuestions();
  }, [user]);

  const loadWeeklyQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getWeeklyQuestions(user.username);
      setWeeklyData(data);

      // Set first question as current if available
      if (data.remaining_questions && data.remaining_questions.length > 0) {
        setCurrentQuestion(data.remaining_questions[0]);
      }
    } catch (err) {
      console.error('Lỗi khi tải câu hỏi tuần:', err);
      setError(err.response?.data?.error || 'Không thể tải câu hỏi tuần');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();

    if (!currentQuestion || !userAnswer.trim()) {
      setFeedback('Vui lòng nhập câu trả lời');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Update weekly question progress with user answer
      const response = await updateWeeklyQuestionProgress(user.username, currentQuestion.id, userAnswer);

      if (response.is_correct) {
        setFeedback(`:white_check_mark: ${response.message}`);

        // Move to next question
        const remainingQuestions = weeklyData.remaining_questions.filter(q => q.id !== currentQuestion.id);
        if (remainingQuestions.length > 0) {
          setCurrentQuestion(remainingQuestions[0]);
          setUserAnswer('');

          // Update weekly data
          setWeeklyData({
            ...weeklyData,
            remaining_questions: remainingQuestions,
            completed_count: weeklyData.completed_count + 1,
            progress_percentage: ((weeklyData.completed_count + 1) / weeklyData.total_questions) * 100
          });
        } else {
          // All questions completed
          setCurrentQuestion(null);
          setUserAnswer('');
          setWeeklyData({
            ...weeklyData,
            remaining_questions: [],
            completed_count: weeklyData.total_questions,
            progress_percentage: 100,
            is_completed: true
          });
          setFeedback(':tada: Chúc mừng! Bạn đã hoàn thành tất cả câu hỏi tuần này!');
        }
      } else {
        // Answer is not correct enough, show feedback
        setFeedback({
          type: 'error',
          message: response.message,
          similarityScore: response.similarity_score,
          feedback: response.feedback,
          correctAnswer: response.correct_answer
        });
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật tiến trình:', err);
      setFeedback(err.response?.data?.error || 'Không thể cập nhật tiến trình');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    if (!currentQuestion || weeklyData.remaining_questions.length <= 1) {
      return;
    }

    // Add current question to skipped questions list
    setSkippedQuestions([...skippedQuestions, currentQuestion]);

    const remainingQuestions = weeklyData.remaining_questions.filter(q => q.id !== currentQuestion.id);
    setCurrentQuestion(remainingQuestions[0]);
    setUserAnswer('');
    setFeedback(':black_right_pointing_double_triangle_with_vertical_bar: Bỏ qua câu hỏi này');

    // Update weekly data to increment completed_count but not points
    setWeeklyData({
      ...weeklyData,
      remaining_questions: remainingQuestions,
      completed_count: weeklyData.completed_count + 1,
      progress_percentage: ((weeklyData.completed_count + 1) / weeklyData.total_questions) * 100
    });
  };

  const handleReturnToSkippedQuestions = () => {
    if (skippedQuestions.length === 0) {
      return;
    }

    // Get the first skipped question
    const questionToRetry = skippedQuestions[0];

    // Remove it from skipped questions
    const remainingSkipped = skippedQuestions.slice(1);
    setSkippedQuestions(remainingSkipped);

    // Add it back to remaining questions
    const updatedRemainingQuestions = [questionToRetry, ...weeklyData.remaining_questions];

    // Update weekly data
    setWeeklyData({
      ...weeklyData,
      remaining_questions: updatedRemainingQuestions,
      completed_count: Math.max(0, weeklyData.completed_count - 1),
      progress_percentage: Math.max(0, ((weeklyData.completed_count - 1) / weeklyData.total_questions) * 100)
    });

    // Set current question
    setCurrentQuestion(questionToRetry);
    setUserAnswer('');
    setFeedback(':arrows_counterclockwise: Quay lại câu hỏi đã bỏ qua');
    setShowSkippedQuestions(false);
  };

  const handleShowSkippedQuestions = () => {
    setShowSkippedQuestions(!showSkippedQuestions);
  };

  const handlePlayAudio = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        console.error('Lỗi khi phát âm thanh');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      alert('Trình duyệt của bạn không hỗ trợ tính năng phát âm thanh');
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="weekly-questions-container">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Đang tải câu hỏi tuần...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weekly-questions-container">
        <div className="alert alert-danger">
          <h4>Lỗi</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadWeeklyQuestions}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!weeklyData) {
    return (
      <div className="weekly-questions-container">
        <div className="alert alert-info">
          <h4>Không có dữ liệu</h4>
          <p>Không thể tải thông tin câu hỏi tuần.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-questions-container">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="text-center mb-3">
              :memo: Câu Hàng Tuần
            </h2>
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{weeklyData.question_set.title}</h5>
                <p className="card-text">{weeklyData.question_set.description}</p>
                <div className="row text-center">
                  <div className="col-md-3">
                    <small className="text-muted">Khoảng thời gian:</small>
                    <div>{weeklyData.question_set.week_range_display}</div>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted">Tiến trình:</small>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${weeklyData.progress_percentage}%` }}
                      ></div>
                    </div>
                    <small>{weeklyData.completed_count}/{weeklyData.total_questions} câu hỏi</small>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted">Điểm:</small>
                    <div className="fw-bold text-success">
                      {weeklyData.question_set.points_per_question} điểm/câu
                    </div>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted">Tổng điểm:</small>
                    <div className="fw-bold text-primary">
                      {weeklyData.completed_count * weeklyData.question_set.points_per_question} điểm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Message */}
        {weeklyData.is_completed && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-success text-center">
                <h4>:tada: Chúc mừng hoàn thành!</h4>
                <p>Bạn đã hoàn thành tất cả {weeklyData.total_questions} câu hỏi trong tuần này.</p>
                <p>Tổng điểm nhận được: {weeklyData.completed_count * weeklyData.question_set.points_per_question} điểm</p>
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        {!weeklyData.is_completed && currentQuestion && weeklyData.remaining_questions.length > 0 && (
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      Câu hỏi {weeklyData.completed_count + 1}/{weeklyData.total_questions}
                    </h5>
                    <span className="badge bg-info">
                      {currentQuestion.difficulty === 'easy' ? 'Dễ' :
                       currentQuestion.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                    </span>
                  </div>

                  <div className="question-content mb-4">
                    <div className="vietnamese-question mb-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6>Câu hỏi tiếng Việt:</h6>
                          <p className="lead">{currentQuestion.vietnamese_text}</p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info ms-2"
                          onClick={() => isPlaying ? handleStopAudio() : handlePlayAudio(currentQuestion.english_text)}
                          disabled={isSubmitting}
                          title={isPlaying ? "Dừng phát" : "Nghe phát âm"}
                        >
                          {isPlaying ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                              Dừng
                            </>
                          ) : (
                            <>
                              :loud_sound: Nghe
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="topic-info mb-3">
                      <small className="text-muted">
                        Chủ đề: {currentQuestion.topic_name || 'Chung'}
                      </small>
                    </div>
                  </div>

                  {/* Feedback */}
                  {feedback && (
                    <div className={`alert ${
                      typeof feedback === 'string'
                        ? (feedback.includes(':white_check_mark:') ? 'alert-success' : feedback.includes(':black_right_pointing_double_triangle_with_vertical_bar:') ? 'alert-warning' : 'alert-info')
                        : (feedback.type === 'error' ? 'alert-warning' : 'alert-info')
                    } mb-3`}>
                      {typeof feedback === 'string' ? (
                        feedback
                      ) : (
                        <div>
                          <strong>Chưa đủ chính xác!</strong>
                          <p>{feedback.message}</p>
                          <p><strong>Độ chính xác:</strong> {Math.round(feedback.similarityScore * 100)}%</p>
                          <p><strong>Gợi ý:</strong> {feedback.feedback}</p>
                          <div className="d-flex align-items-center">
                            <p className="mb-0 me-2"><strong>Đáp án đúng:</strong> {feedback.correctAnswer}</p>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handlePlayAudio(feedback.correctAnswer)}
                              title="Nghe phát âm đáp án đúng"
                            >
                              :loud_sound:
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Answer Form */}
                  <form onSubmit={handleSubmitAnswer}>
                    <div className="mb-3">
                      <label htmlFor="userAnswer" className="form-label">
                        Câu trả lời của bạn (tiếng Anh):
                      </label>
                      <textarea
                        className="form-control"
                        id="userAnswer"
                        rows="3"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Nhập câu trả lời tiếng Anh..."
                        disabled={isSubmitting}
                      ></textarea>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || !userAnswer.trim()}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Đang gửi...
                          </>
                        ) : (
                          'Gửi câu trả lời'
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleSkipQuestion}
                        disabled={isSubmitting}
                      >
                        Bỏ qua
                      </button>

                      {skippedQuestions.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-warning"
                          onClick={handleShowSkippedQuestions}
                          disabled={isSubmitting}
                        >
                          :clipboard: Câu đã bỏ qua ({skippedQuestions.length})
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All questions completed (but not marked as completed in backend) */}
        {!weeklyData.is_completed && (!currentQuestion || weeklyData.remaining_questions.length === 0) && (
          <div className="row">
            <div className="col-12">
              <div className="alert alert-success text-center">
                <h4>:tada: Hoàn thành!</h4>
                <p>Bạn đã xem qua tất cả {weeklyData.total_questions} câu hỏi trong tuần này.</p>
                <p>Tổng điểm nhận được: {weeklyData.completed_count * weeklyData.question_set.points_per_question} điểm</p>
                {skippedQuestions.length > 0 && (
                  <div className="mt-3">
                    <button className="btn btn-warning me-2" onClick={handleReturnToSkippedQuestions}>
                      :arrows_counterclockwise: Làm lại câu đã bỏ qua ({skippedQuestions.length})
                    </button>
                    <button className="btn btn-outline-primary" onClick={loadWeeklyQuestions}>
                      Tải lại
                    </button>
                  </div>
                )}
                <button className="btn btn-primary" onClick={loadWeeklyQuestions}>
                  Tải lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skipped Questions Modal */}
        {showSkippedQuestions && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">:clipboard: Câu hỏi đã bỏ qua</h5>
                  <button type="button" className="btn-close" onClick={handleShowSkippedQuestions}></button>
                </div>
                <div className="modal-body">
                  {skippedQuestions.length > 0 ? (
                    <div>
                      <p>Bạn có {skippedQuestions.length} câu hỏi đã bỏ qua:</p>
                      <div className="list-group">
                        {skippedQuestions.map((question, index) => (
                          <div key={question.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>Câu {index + 1}:</strong>
                                <p className="mb-1">{question.vietnamese_text}</p>
                                <small className="text-muted">Chủ đề: {question.topic_name || 'Chung'}</small>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  // Remove this question from skipped and add to remaining
                                  const remainingSkipped = skippedQuestions.filter(q => q.id !== question.id);
                                  const updatedRemainingQuestions = [question, ...weeklyData.remaining_questions];

                                  setSkippedQuestions(remainingSkipped);
                                  setWeeklyData({
                                    ...weeklyData,
                                    remaining_questions: updatedRemainingQuestions,
                                    completed_count: Math.max(0, weeklyData.completed_count - 1),
                                    progress_percentage: Math.max(0, ((weeklyData.completed_count - 1) / weeklyData.total_questions) * 100)
                                  });

                                  setCurrentQuestion(question);
                                  setUserAnswer('');
                                  setFeedback(':arrows_counterclockwise: Quay lại câu hỏi đã bỏ qua');
                                  setShowSkippedQuestions(false);
                                }}
                              >
                                Làm lại
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p>Chưa có câu hỏi nào được bỏ qua.</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleShowSkippedQuestions}>
                    Đóng
                  </button>
                  {skippedQuestions.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleReturnToSkippedQuestions}
                    >
                      Làm lại câu đầu tiên
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .weekly-questions-container {
          padding: 20px;
          min-height: calc(100vh - 200px);
        }

        .progress {
          height: 20px;
          background-color: #E9ECEF;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #28A745, #20C997);
          transition: width 0.3s ease;
        }

        .vietnamese-question {
          background-color: #F8F9FA;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #007BFF;
        }

        .lead {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0;
        }

        .card {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: none;
          transition: transform 0.2s;
        }

        .card:hover {
          transform: translateY(-2px);
        }

        .btn {
          border-radius: 6px;
          padding: 8px 16px;
        }

        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
          border-width: 0.2em;
        }
      `}</style>
    </div>
  );
};

export default WeeklyQuestions;