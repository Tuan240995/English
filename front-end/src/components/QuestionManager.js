import React, { useState, useEffect } from 'react';
import { getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getQuestion, getTopics, importQuestionsFromFile } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const QuestionManager = () => {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    vietnamese_text: '',
    english_text: '',
    difficulty: 'medium',
    topic: ''
  });

  // Edit state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState({
    id: null,
    vietnamese_text: '',
    english_text: '',
    difficulty: 'medium',
    topic: ''
  });

  // Pagination and filter states
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 20,
    has_next: false,
    has_previous: false
  });
  const [filters, setFilters] = useState({
    topic_id: '',
    difficulty: '',
    search: ''
  });

  useEffect(() => {
    fetchQuestions();
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const topicsData = await getTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Lỗi khi tải danh sách chủ đề:', error);
    }
  };

  const fetchQuestions = async (page = 1, newFilters = null) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: pagination.page_size,
        ...filters,
        ...newFilters
      };

      const data = await getAllQuestions(params);
      setQuestions(data.results || []);
      setPagination({
        current_page: data.current_page || 1,
        total_pages: data.total_pages || 1,
        count: data.count || 0,
        page_size: data.page_size || 20,
        has_next: data.has_next || false,
        has_previous: data.has_previous || false
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách câu hỏi:', error);
      alert('Không thể lấy danh sách câu hỏi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();

    if (!newQuestion.vietnamese_text.trim() || !newQuestion.english_text.trim()) {
      alert('Vui lòng nhập đầy đủ câu tiếng Việt và tiếng Anh!');
      return;
    }

    setLoading(true);

    try {
      await addQuestion(
        newQuestion.vietnamese_text,
        newQuestion.english_text,
        newQuestion.difficulty,
        newQuestion.topic || null
      );

      // Reset form
      setNewQuestion({
        vietnamese_text: '',
        english_text: '',
        difficulty: 'medium',
        topic: ''
      });
      setShowAddForm(false);

      // Refresh danh sách
      await fetchQuestions();

      alert('Thêm câu hỏi thành công!');
    } catch (error) {
      console.error('Lỗi khi thêm câu hỏi:', error);
      alert('Không thể thêm câu hỏi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (e) => {
    e.preventDefault();

    const fileInput = e.target.elements.file;
    const file = fileInput.files[0];

    if (!file) {
      alert('Vui lòng chọn file để import!');
      return;
    }

    if (!file.name.endsWith('.txt')) {
      alert('Chỉ hỗ trợ file .txt!');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const result = await importQuestionsFromFile(file);
      setImportResult(result);

      // Refresh danh sách
      await fetchQuestions();

      // Reset form
      fileInput.value = '';

    } catch (error) {
      console.error('Lỗi khi import file:', error);
      alert('Không thể import file. Vui lòng kiểm tra lại định dạng file.');
    } finally {
      setLoading(false);
    }
  };

  // Edit handlers
  const handleEditQuestion = async (questionId) => {
    try {
      const question = await getQuestion(questionId);
      setEditingQuestion({
        id: question.id,
        vietnamese_text: question.vietnamese_text,
        english_text: question.english_text,
        difficulty: question.difficulty,
        topic: question.topic || ''
      });
      setShowEditForm(true);
      setShowAddForm(false);
      setShowImportForm(false);
    } catch (error) {
      console.error('Lỗi khi lấy thông tin câu hỏi:', error);
      alert('Không thể lấy thông tin câu hỏi. Vui lòng thử lại.');
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();

    if (!editingQuestion.vietnamese_text.trim() || !editingQuestion.english_text.trim()) {
      alert('Vui lòng nhập đầy đủ câu tiếng Việt và tiếng Anh!');
      return;
    }

    setLoading(true);

    try {
      await updateQuestion(
        editingQuestion.id,
        editingQuestion.vietnamese_text,
        editingQuestion.english_text,
        editingQuestion.difficulty,
        editingQuestion.topic || null
      );

      // Reset form
      setEditingQuestion({
        id: null,
        vietnamese_text: '',
        english_text: '',
        difficulty: 'medium',
        topic: ''
      });
      setShowEditForm(false);

      // Refresh danh sách
      await fetchQuestions();

      alert('Cập nhật câu hỏi thành công!');
    } catch (error) {
      console.error('Lỗi khi cập nhật câu hỏi:', error);
      alert('Không thể cập nhật câu hỏi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này không?')) {
      return;
    }

    setLoading(true);

    try {
      await deleteQuestion(questionId);

      // Refresh danh sách
      await fetchQuestions();

      alert('Xóa câu hỏi thành công!');
    } catch (error) {
      console.error('Lỗi khi xóa câu hỏi:', error);
      alert('Không thể xóa câu hỏi. Vui lòng thử lại.');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    setPagination({ ...pagination, current_page: 1 }); // Reset to first page when filtering
    fetchQuestions(1, newFilters);
  };

  // Handle search
  const handleSearch = (e) => {
    const searchValue = e.target.value;
    handleFilterChange('search', searchValue);
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchQuestions(page);
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newPageSize = parseInt(e.target.value);
    setPagination({ ...pagination, page_size: newPageSize, current_page: 1 });
    fetchQuestions(1, { ...filters, page_size: newPageSize });
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      topic_id: '',
      difficulty: '',
      search: ''
    });
    setPagination({ ...pagination, current_page: 1 });
    fetchQuestions(1, {
      topic_id: '',
      difficulty: '',
      search: ''
    });
  };

  // Calculate index for display
  const getDisplayIndex = (index) => {
    return (pagination.current_page - 1) * pagination.page_size + index + 1;
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card shadow">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">Quản lý câu hỏi</h3>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-warning"
                  onClick={() => setShowImportForm(!showImportForm)}
                >
                  {showImportForm ? 'Hủy' : '📁 Import File'}
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Hủy' : '+ Thêm câu hỏi'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Form sửa câu hỏi */}
              {showEditForm && (
                <div className="card mb-4 border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="mb-0">Sửa câu hỏi</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleUpdateQuestion}>
                      <div className="mb-3">
                        <label htmlFor="editVietnameseText" className="form-label fw-bold">
                          Câu tiếng Việt:
                        </label>
                        <textarea
                          className="form-control"
                          id="editVietnameseText"
                          rows="2"
                          value={editingQuestion.vietnamese_text}
                          onChange={(e) => setEditingQuestion({
                            ...editingQuestion,
                            vietnamese_text: e.target.value
                          })}
                          placeholder="Nhập câu tiếng Việt..."
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="editEnglishText" className="form-label fw-bold">
                          Câu tiếng Anh:
                        </label>
                        <textarea
                          className="form-control"
                          id="editEnglishText"
                          rows="2"
                          value={editingQuestion.english_text}
                          onChange={(e) => setEditingQuestion({
                            ...editingQuestion,
                            english_text: e.target.value
                          })}
                          placeholder="Nhập câu tiếng Anh..."
                          required
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="editTopic" className="form-label fw-bold">
                              Chủ đề:
                            </label>
                            <select
                              className="form-select"
                              id="editTopic"
                              value={editingQuestion.topic}
                              onChange={(e) => setEditingQuestion({
                                ...editingQuestion,
                                topic: e.target.value
                              })}
                            >
                              <option value="">Chọn chủ đề</option>
                              {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                  {topic.icon} {topic.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="editDifficulty" className="form-label fw-bold">
                              Độ khó:
                            </label>
                            <select
                              className="form-select"
                              id="editDifficulty"
                              value={editingQuestion.difficulty}
                              onChange={(e) => setEditingQuestion({
                                ...editingQuestion,
                                difficulty: e.target.value
                              })}
                            >
                              <option value="easy">Dễ</option>
                              <option value="medium">Trung bình</option>
                              <option value="hard">Khó</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button
                          type="button"
                          className="btn btn-secondary me-md-2"
                          onClick={() => {
                            setShowEditForm(false);
                            setEditingQuestion({
                              id: null,
                              vietnamese_text: '',
                              english_text: '',
                              difficulty: 'medium',
                              topic: ''
                            });
                          }}
                          disabled={loading}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-warning"
                          disabled={loading}
                        >
                          {loading ? 'Đang cập nhật...' : 'Cập nhật câu hỏi'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Form thêm câu hỏi */}
              {showAddForm && (
                <div className="card mb-4 border-primary">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">Thêm câu hỏi mới</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddQuestion}>
                      <div className="mb-3">
                        <label htmlFor="vietnameseText" className="form-label fw-bold">
                          Câu tiếng Việt:
                        </label>
                        <textarea
                          className="form-control"
                          id="vietnameseText"
                          rows="2"
                          value={newQuestion.vietnamese_text}
                          onChange={(e) => setNewQuestion({
                            ...newQuestion,
                            vietnamese_text: e.target.value
                          })}
                          placeholder="Nhập câu tiếng Việt..."
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="englishText" className="form-label fw-bold">
                          Câu tiếng Anh:
                        </label>
                        <textarea
                          className="form-control"
                          id="englishText"
                          rows="2"
                          value={newQuestion.english_text}
                          onChange={(e) => setNewQuestion({
                            ...newQuestion,
                            english_text: e.target.value
                          })}
                          placeholder="Nhập câu tiếng Anh..."
                          required
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="topic" className="form-label fw-bold">
                              Chủ đề:
                            </label>
                            <select
                              className="form-select"
                              id="topic"
                              value={newQuestion.topic}
                              onChange={(e) => setNewQuestion({
                                ...newQuestion,
                                topic: e.target.value
                              })}
                            >
                              <option value="">Chọn chủ đề</option>
                              {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                  {topic.icon} {topic.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="difficulty" className="form-label fw-bold">
                              Độ khó:
                            </label>
                            <select
                              className="form-select"
                              id="difficulty"
                              value={newQuestion.difficulty}
                              onChange={(e) => setNewQuestion({
                                ...newQuestion,
                                difficulty: e.target.value
                              })}
                            >
                              <option value="easy">Dễ</option>
                              <option value="medium">Trung bình</option>
                              <option value="hard">Khó</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button
                          type="button"
                          className="btn btn-secondary me-md-2"
                          onClick={() => setShowAddForm(false)}
                          disabled={loading}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'Đang thêm...' : 'Thêm câu hỏi'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Form import file */}
              {showImportForm && (
                <div className="card mb-4 border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="mb-0">Import câu hỏi từ file</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleImportFile}>
                      <div className="mb-3">
                        <label htmlFor="file" className="form-label fw-bold">
                          Chọn file (.txt):
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          id="file"
                          accept=".txt"
                          required
                        />
                        <div className="form-text">
                          File phải có định dạng: Question: [câu hỏi] Answer: [câu trả lời] Topic: [chủ đề] Status: [độ khó]
                        </div>
                      </div>

                      <div className="alert alert-info">
                        <h6>Định dạng file mẫu:</h6>
                        <pre className="mb-0">
{`Question: Tôi yêu gia đình của tôi rất nhiều.
Answer: I love my family very much.
Topic: Gia đình
Status: Dễ

Question: Cô ấy đi làm bằng xe buýt mỗi ngày.
Answer: She goes to work by bus every day.
Topic: Hàng ngày
Status: Trung bình`}
                        </pre>
                      </div>

                      <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button
                          type="button"
                          className="btn btn-secondary me-md-2"
                          onClick={() => {
                            setShowImportForm(false);
                            setImportResult(null);
                          }}
                          disabled={loading}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-warning"
                          disabled={loading}
                        >
                          {loading ? 'Đang import...' : '📁 Import File'}
                        </button>
                      </div>
                    </form>

                    {/* Import result */}
                    {importResult && (
                      <div className="mt-3">
                        <div className={`alert ${importResult.error_count > 0 ? 'alert-warning' : 'alert-success'}`}>
                          <h6>Kết quả import:</h6>
                          <p className="mb-1">
                            <strong>✔️ Thành công:</strong> {importResult.created_count} câu hỏi
                          </p>
                          {importResult.error_count > 0 && (
                            <p className="mb-1">
                              <strong>❌ Lỗi:</strong> {importResult.error_count} câu hỏi
                            </p>
                          )}
                          {importResult.errors && importResult.errors.length > 0 && (
                            <details className="mt-2">
                              <summary>Chi tiết lỗi</summary>
                              <ul className="mb-0 mt-2">
                                {importResult.errors.map((error, index) => (
                                  <li key={index} className="small">{error}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && !showAddForm && !showImportForm && !showEditForm && (
                <div className="text-center my-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              )}

              {/* Bộ lọc và phân trang */}
              {!loading && !showAddForm && !showImportForm && !showEditForm && (
                <div className="card mb-4 border-light">
                  <div
                    className="card-header bg-light d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <h6 className="mb-0">🔍 Bộ lọc và tìm kiếm</h6>
                    <button className="btn btn-sm btn-outline-secondary">
                      {showFilters ? '▼' : '▶'}
                    </button>
                  </div>
                  {showFilters && (
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label fw-bold">Tìm kiếm:</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Tìm kiếm theo câu hỏi..."
                            value={filters.search}
                            onChange={handleSearch}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold">Chủ đề:</label>
                          <select
                            className="form-select"
                            value={filters.topic_id}
                            onChange={(e) => handleFilterChange('topic_id', e.target.value)}
                          >
                            <option value="">Tất cả chủ đề</option>
                            {topics.map(topic => (
                              <option key={topic.id} value={topic.id}>
                                {topic.icon} {topic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold">Độ khó:</label>
                          <select
                            className="form-select"
                            value={filters.difficulty}
                            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                          >
                            <option value="">Tất cả độ khó</option>
                            <option value="easy">Dễ</option>
                            <option value="medium">Trung bình</option>
                            <option value="hard">Khó</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label fw-bold">Số lượng/trang:</label>
                          <select
                            className="form-select"
                            value={pagination.page_size}
                            onChange={handlePageSizeChange}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={clearFilters}
                          disabled={loading}
                        >
                          🔄 Xóa bộ lọc
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách câu hỏi */}
              {!loading && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <h5 className="mb-0">
                        Danh sách câu hỏi
                        <span className="badge bg-primary ms-2">
                          {pagination.count} câu hỏi
                        </span>
                      </h5>
                      {!showAddForm && !showImportForm && !showEditForm && (
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => setShowFilters(!showFilters)}
                        >
                          {showFilters ? '🔽 Ẩn bộ lọc' : '🔍 Hiện bộ lọc'}
                        </button>
                      )}
                    </div>
                    <div className="text-muted small">
                      Trang {pagination.current_page} / {pagination.total_pages}
                    </div>
                  </div>

                  {questions.length === 0 ? (
                    <div className="alert alert-info text-center">
                      Chưa có câu hỏi nào. Hãy thêm câu hỏi mới!
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Câu tiếng Việt</th>
                            <th scope="col">Câu tiếng Anh</th>
                            <th scope="col">Chủ đề</th>
                            <th scope="col">Độ khó</th>
                            <th scope="col">Ngày tạo</th>
                            <th scope="col">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((question, index) => (
                            <tr key={question.id}>
                              <th scope="row">{getDisplayIndex(index)}</th>
                              <td>{question.vietnamese_text}</td>
                              <td>
                                <em>{question.english_text}</em>
                              </td>
                              <td>
                                {question.topic_name ? (
                                  <span className="badge bg-info">
                                    {question.topic_name}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge bg-${getDifficultyColor(question.difficulty)}`}>
                                  {getDifficultyText(question.difficulty)}
                                </span>
                              </td>
                              <td>{formatDate(question.created_at)}</td>
                              <td>
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleEditQuestion(question.id)}
                                    disabled={loading}
                                    title="Sửa câu hỏi"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                    disabled={loading}
                                    title="Xóa câu hỏi"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Navigation */}
                  {pagination.total_pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted small">
                        Hiển thị {questions.length} / {pagination.count} câu hỏi
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${!pagination.has_previous ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.current_page - 1)}
                              disabled={!pagination.has_previous}
                            >
                              &laquo; Trước
                            </button>
                          </li>

                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                            let pageNum;
                            if (pagination.total_pages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.current_page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.current_page >= pagination.total_pages - 2) {
                              pageNum = pagination.total_pages - 4 + i;
                            } else {
                              pageNum = pagination.current_page - 2 + i;
                            }

                            return (
                              <li key={pageNum} className={`page-item ${pageNum === pagination.current_page ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}

                          <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.current_page + 1)}
                              disabled={!pagination.has_next}
                            >
                              Sau &raquo;
                            </button>
                          </li>
                        </ul>
                      </nav>
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

export default QuestionManager;
