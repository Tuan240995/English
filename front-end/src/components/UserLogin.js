import React, { useState } from 'react';
import { userLogin } from '../services/api';

const UserLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with username:', username);
      const response = await userLogin(username);
      console.log('Login response:', response);

      // Save token to localStorage
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      onLogin(response.user, response.is_new_user);
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.error ||
                          err.message ||
                          'Đã có lỗi xảy ra. Vui lòng kiểm tra console để xem chi tiết.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      <div className="user-login-card">
        <h2>Đăng nhập</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="user-login-form">
          <div className="form-group">
            <label htmlFor="username">Tên người dùng:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên người dùng của bạn"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-info">
          <p>Chỉ cần nhập tên người dùng, không cần mật khẩu!</p>
        </div>
      </div>

      <style jsx>{`
        .user-login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          padding: 20px;
        }

        .user-login-card {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }

        .user-login-card h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #333;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 1rem;
          border: 1px solid #fcc;
        }

        .user-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #555;
        }

        .form-group input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667EEA;
        }

        .login-button {
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 5px;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-info {
          text-align: center;
          margin-top: 1.5rem;
        }

        .login-info p {
          color: #666;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default UserLogin;