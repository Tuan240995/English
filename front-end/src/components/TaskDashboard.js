import React, { useState, useEffect } from 'react';
import { getTaskDashboard, getWeeklyTasks, getLeaderboard } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const TaskDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('total');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardType]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, tasksData] = await Promise.all([
        getTaskDashboard(user.username),
        getWeeklyTasks()
      ]);

      setDashboardData(dashboardData);
      setWeeklyTasks(tasksData);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const leaderboardData = await getLeaderboard(leaderboardType, 10);
      setLeaderboard(leaderboardData.leaderboard);
    } catch (err) {
      console.error('Lỗi khi tải bảng xếp hạng:', err);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const getTaskIcon = (taskType) => {
    const icons = {
      'daily_practice': ':books:',
      'correct_answers': ':white_check_mark:',
      'perfect_week': ':trophy:',
      'streak_master': ':fire:',
      'topic_master': ':dart:'
    };
    return icons[taskType] || ':clipboard:';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2">Đang tải dữ liệu nhiệm vụ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          {error}
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={loadDashboardData}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        {/* User Points Summary */}
        <div className="col-12 mb-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <h4>:trophy: Tổng điểm</h4>
                  <h2>{dashboardData?.user_points?.total_points || 0}</h2>
                </div>
                <div className="col-md-3">
                  <h4>:bar_chart: Điểm tuần</h4>
                  <h2>{dashboardData?.user_points?.weekly_points || 0}</h2>
                </div>
                <div className="col-md-3">
                  <h4>:fire: Chuỗi hiện tại</h4>
                  <h2>{dashboardData?.user_points?.current_streak || 0}</h2>
                </div>
                <div className="col-md-3">
                  <h4>:star: Chuỗi dài nhất</h4>
                  <h2>{dashboardData?.user_points?.longest_streak || 0}</h2>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Tasks */}
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">:clipboard: Nhiệm vụ hàng tuần</h5>
            </div>
            <div className="card-body">
              {weeklyTasks.length === 0 ? (
                <p className="text-muted">Chưa có nhiệm vụ nào cho tuần này.</p>
              ) : (
                <div className="row">
                  {weeklyTasks.map((task) => {
                    const progress = dashboardData?.user_progress?.find(
                      p => p.task === task.id
                    );
                    const progressPercentage = progress ?
                      (progress.current_progress / task.target_count) * 100 : 0;

                    return (
                      <div key={task.id} className="col-md-6 mb-3">
                        <div className="card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-2">
                              <span className="fs-4 me-2">{getTaskIcon(task.task_type)}</span>
                              <h6 className="card-title mb-0">{task.title}</h6>
                            </div>
                            <p className="card-text small text-muted">{task.description}</p>

                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">
                                  Tiến trình: {progress?.current_progress || 0}/{task.target_count}
                                </small>
                                <small className="text-muted">
                                  {Math.round(progressPercentage)}%
                                </small>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className={`progress-bar bg-${getProgressColor(progressPercentage)}`}
                                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-success">
                                :gift: {task.points_reward} điểm
                              </small>
                              {progress?.is_completed && (
                                <span className="badge bg-success">:white_check_mark: Hoàn thành</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">:trophy: Bảng xếp hạng</h5>
            </div>
            <div className="card-body">
              <div className="btn-group w-100 mb-3" role="group">
                <button
                  className={`btn btn-sm ${leaderboardType === 'total' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setLeaderboardType('total')}
                >
                  Tổng
                </button>
                <button
                  className={`btn btn-sm ${leaderboardType === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setLeaderboardType('weekly')}
                >
                  Tuần
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-muted">Chưa có dữ liệu xếp hạng.</p>
              ) : (
                <div className="leaderboard">
                  {leaderboard.map((user) => (
                    <div
                      key={user.id}
                      className={`d-flex justify-content-between align-items-center p-2 mb-2 rounded ${
                        user.username === dashboardData?.user_points?.username
                          ? 'bg-primary text-white'
                          : 'bg-light'
                      }`}
                    >
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary me-2">#{user.rank}</span>
                        <span className="fw-bold">{user.username}</span>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">{user.total_points} điểm</div>
                        <small className={user.username === dashboardData?.user_points?.username ? 'text-white-50' : 'text-muted'}>
                          :fire: {user.current_streak} ngày
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">:chart_with_upwards_trend: Tóm tắt tuần</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <h4>:memo: Tổng câu hỏi</h4>
                  <h3>{dashboardData?.weekly_summary?.total_questions || 0}</h3>
                </div>
                <div className="col-md-3">
                  <h4>:white_check_mark: Trả lời đúng</h4>
                  <h3>{dashboardData?.weekly_summary?.correct_answers || 0}</h3>
                </div>
                <div className="col-md-3">
                  <h4>:dart: Điểm kiếm được</h4>
                  <h3>{dashboardData?.weekly_summary?.points_earned || 0}</h3>
                </div>
                <div className="col-md-3">
                  <h4>:date: Ngày hoạt động</h4>
                  <h3>{dashboardData?.weekly_summary?.days_active || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        {dashboardData?.daily_completion && (
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">:date: Hoạt động hôm nay</h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-4">
                    <h5>:memo: Câu hỏi đã làm</h5>
                    <h3>{dashboardData.daily_completion.questions_answered}</h3>
                  </div>
                  <div className="col-md-4">
                    <h5>:white_check_mark: Trả lời đúng</h5>
                    <h3>{dashboardData.daily_completion.correct_answers}</h3>
                  </div>
                  <div className="col-md-4">
                    <h5>:dart: Độ chính xác</h5>
                    <h3>{dashboardData.daily_completion.accuracy_percentage}%</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDashboard;