import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import EnglishLearning from './components/EnglishLearning';
import QuestionManager from './components/QuestionManager';
import History from './components/History';
import TaskDashboard from './components/TaskDashboard';
import WeeklyQuestions from './components/WeeklyQuestions';
import UserLogin from './components/UserLogin';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';

// Component để xử lý navigation logic
function AppContent() {
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogin = (userData, isNew) => {
    setUser(userData);
    setIsNewUser(isNew);
    // Navigate to learning page after login
    navigate('/hoc-tap');
  };

  const handleLogout = () => {
    setUser(null);
    setIsNewUser(false);
    // Clear token and user data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentPage');
    // Navigate to home
    navigate('/');
  };

  // Check token on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        setIsNewUser(false);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentPage');
      }
    } else {
      // No token found, clear any remaining user data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('currentPage');
    }
  }, []);

  const getNavLinkClass = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  // Nếu chưa đăng nhập, chỉ hiển thị login page
  if (!user) {
    return <UserLogin onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      {/* Navigation - chỉ hiển thị khi đã đăng nhập */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="/hoc-tap" onClick={(e) => { e.preventDefault(); navigate('/hoc-tap'); }}>
            :books: Học Tiếng Anh
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a
                  href="/hoc-tap"
                  className={`btn ${getNavLinkClass('/hoc-tap')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/hoc-tap'); }}
                >
                  :dart: Học tập
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="/quanlycauhoi"
                  className={`btn ${getNavLinkClass('/quanlycauhoi')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/quanlycauhoi'); }}
                >
                  :gear: Quản lý câu hỏi
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="/lichsu"
                  className={`btn ${getNavLinkClass('/lichsu')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/lichsu'); }}
                >
                  :bar_chart: Lịch sử
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="/nhiemvu"
                  className={`btn ${getNavLinkClass('/nhiemvu')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/nhiemvu'); }}
                >
                  :dart: Nhiệm vụ
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="/cauhoituan"
                  className={`btn ${getNavLinkClass('/cauhoituan')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/cauhoituan'); }}
                >
                  :memo: Câu hỏi tuần
                </a>
              </li>
              <li className="nav-item">
                <button
                  className="btn btn-outline-light"
                  onClick={handleLogout}
                >
                  :bust_in_silhouette: {user?.username || 'User'} (Đăng xuất)
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Welcome Message */}
      {isNewUser && (
        <div className="welcome-message">
          <div className="container">
            <div className="alert alert-success">
              <h4>Chào mừng {user?.username || 'User'}! :wave:</h4>
              <p>Bạn đã đăng nhập thành công. Hãy bắt đầu học tiếng Anh ngay!</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/hoc-tap" replace />} />
          <Route path="/hoc-tap" element={<EnglishLearning user={user} />} />
          <Route path="/quanlycauhoi" element={<QuestionManager user={user} />} />
          <Route path="/lichsu" element={<History user={user} />} />
          <Route path="/nhiemvu" element={<TaskDashboard user={user} />} />
          <Route path="/cauhoituan" element={<WeeklyQuestions user={user} />} />
          <Route path="*" element={<Navigate to="/hoc-tap" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;