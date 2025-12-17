import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import EnglishLearning from './components/EnglishLearning';
import DailyLearning from './components/DailyLearning';
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
    navigate('/hoc-tap');
  };

  const handleLogout = () => {
    setUser(null);
    setIsNewUser(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentPage');
    navigate('/');
  };

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
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentPage');
      }
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('currentPage');
    }
  }, []);

  const getNavLinkClass = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  if (!user) {
    return <UserLogin onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="/hoc-tap" onClick={(e) => { e.preventDefault(); navigate('/hoc-tap'); }}>
            📚 Học Tiếng Anh
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
                  href="/hoc-tap-hang-ngay"
                  className={`btn ${getNavLinkClass('/hoc-tap-hang-ngay')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/hoc-tap-hang-ngay'); }}
                >
                  📚 Học tập hàng ngày
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="/hoc-tap"
                  className={`btn ${getNavLinkClass('/hoc-tap')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/hoc-tap'); }}
                >
                  🎯 Học tập tự do
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="/quanlycauhoi"
                  className={`btn ${getNavLinkClass('/quanlycauhoi')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/quanlycauhoi'); }}
                >
                  ⚙️ Quản lý câu hỏi
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="/lichsu"
                  className={`btn ${getNavLinkClass('/lichsu')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/lichsu'); }}
                >
                  📊 Lịch sử
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="/nhiemvu"
                  className={`btn ${getNavLinkClass('/nhiemvu')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/nhiemvu'); }}
                >
                  🎯 Nhiệm vụ
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="/cauhoituan"
                  className={`btn ${getNavLinkClass('/cauhoituan')}`}
                  onClick={(e) => { e.preventDefault(); navigate('/cauhoituan'); }}
                >
                  📝 Câu hỏi tuần
                </a>
              </li>

              <li className="nav-item">
                <button
                  className="btn btn-outline-light"
                  onClick={handleLogout}
                >
                  👤 {user?.username || 'User'} (Đăng xuất)
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {isNewUser && (
        <div className="welcome-message">
          <div className="container">
            <div className="alert alert-success">
              <h4>Chào mừng {user?.username || 'User'}! 👋</h4>
              <p>Bạn đã đăng nhập thành công. Hãy bắt đầu học tiếng Anh ngay!</p>
            </div>
          </div>
        </div>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/hoc-tap-hang-ngay" replace />} />
          <Route path="/hoc-tap-hang-ngay" element={<DailyLearning user={user} />} />
          <Route path="/hoc-tap" element={<EnglishLearning user={user} />} />
          <Route path="/quanlycauhoi" element={<QuestionManager user={user} />} />
          <Route path="/lichsu" element={<History user={user} />} />
          <Route path="/nhiemvu" element={<TaskDashboard user={user} />} />
          <Route path="/cauhoituan" element={<WeeklyQuestions user={user} />} />
          <Route path="*" element={<Navigate to="/hoc-tap-hang-ngay" replace />} />
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