import React, { useState, useEffect } from 'react';
import { getUserAnswers } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const History = () => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, correct, incorrect

  useEffect(() => {
    fetchAnswers();
  }, []);

  const fetchAnswers = async () => {
    setLoading(true);
    try {
      const data = await getUserAnswers();
      // API trả về object có key 'results' chứa mảng answers
      setAnswers(data.results || []);
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử câu trả lời:', error);
      alert('Không thể lấy lịch sử câu trả lời. Vui lòng thử lại.');
      setAnswers([]); // Đảm bảo answers luôn là mảng rỗng khi có lỗi
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAnswers = () => {
    switch (filter) {
      case 'correct':
        return answers.filter(answer => answer.is_correct);
      case 'incorrect':
        return answers.filter(answer => !answer.is_correct);
      default:
        return answers;
    }
  };

  const getStatistics = () => {
    const total = answers.length;
    const correct = answers.filter(answer => answer.is_correct).length;
    const incorrect = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { total, correct, incorrect, accuracy };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'danger';
  };

  const stats = getStatistics();
  const filteredAnswers = getFilteredAnswers();

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-11">
          <div className="card shadow">
            <div className="card-header bg-info text-white">
              <h3 className="mb-0">Lịch sử học tập</h3>
            </div>
            <div className="card-body">
              {/* Thống kê */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card text-center border-primary">
                    <div className="card-body">
                      <h5 className="card-title text-primary">{stats.total}</h5>
                      <p className="card-text">Tổng số câu</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center border-success">
                    <div className="card-body">
                      <h5 className="card-title text-success">{stats.correct}</h5>
                      <p className="card-text">Đúng</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center border-danger">
                    <div className="card-body">
                      <h5 className="card-title text-danger">{stats.incorrect}</h5>
                      <p className="card-text">Sai</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center border-info">
                    <div className="card-body">
                      <h5 className="card-title text-info">{stats.accuracy}%</h5>
                      <p className="card-text">Độ chính xác</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bộ lọc */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <label className="form-label fw-bold me-3 mb-0">Lọc:</label>
                    <div className="btn-group" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="filter"
                        id="filter-all"
                        value="all"
                        checked={filter === 'all'}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <label className="btn btn-outline-primary" htmlFor="filter-all">
                        Tất cả ({stats.total})
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="filter"
                        id="filter-correct"
                        value="correct"
                        checked={filter === 'correct'}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <label className="btn btn-outline-success" htmlFor="filter-correct">
                        Đúng ({stats.correct})
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="filter"
                        id="filter-incorrect"
                        value="incorrect"
                        checked={filter === 'incorrect'}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <label className="btn btn-outline-danger" htmlFor="filter-incorrect">
                        Sai ({stats.incorrect})
                      </label>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <button className="btn btn-secondary" onClick={fetchAnswers}>
                    🔄 Làm mới
                  </button>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="text-center my-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              )}

              {/* Danh sách câu trả lời */}
              {!loading && (
                <div>
                  {filteredAnswers.length === 0 ? (
                    <div className="alert alert-info text-center">
                      {filter === 'all'
                        ? 'Chưa có lịch sử học tập nào.'
                        : `Không có câu trả lời ${filter === 'correct' ? 'đúng' : 'sai'} nào.`
                      }
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Câu tiếng Việt</th>
                            <th scope="col">Câu trả lời</th>
                            <th scope="col">Đáp án đúng</th>
                            <th scope="col">Độ tương đồng</th>
                            <th scope="col">Kết quả</th>
                            <th scope="col">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAnswers.map((answer, index) => (
                            <tr key={answer.id} className={answer.is_correct ? 'table-success' : 'table-danger'}>
                              <th scope="row">{index + 1}</th>
                              <td>{answer.vietnamese_text}</td>
                              <td>
                                <span className={answer.is_correct ? '' : 'text-decoration-line-through'}>
                                  {answer.user_answer}
                                </span>
                              </td>
                              <td>
                                <em>{answer.correct_answer}</em>
                              </td>
                              <td>
                                <span className={`badge bg-${getSimilarityColor(answer.similarity_score)}`}>
                                  {Math.round(answer.similarity_score * 100)}%
                                </span>
                              </td>
                              <td>
                                {answer.is_correct ? (
                                  <span className="badge bg-success">✓ Đúng</span>
                                ) : (
                                  <span className="badge bg-danger">✗ Sai</span>
                                )}
                              </td>
                              <td>{formatDate(answer.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

export default History;
