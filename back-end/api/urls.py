from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    # User endpoints
    path('auth/login/', views.UserLoginView.as_view(), name='user_login'),
    path('auth/token/', views.GetTokenView.as_view(), name='get_token'),
    path('user-answers/', views.UserAnswerHistoryView.as_view(), name='user_answer_history'),

    # Topic endpoints
    path('topics/', views.TopicListView.as_view(), name='topic_list'),
    path('topics/<int:topic_id>/', views.TopicDetailView.as_view(), name='topic_detail'),

    # Question endpoints
    path('questions/random/', views.RandomQuestionView.as_view(), name='get_random_question'),
    path('questions/', views.QuestionListView.as_view(), name='question_list'),
    path('questions/<int:question_id>/', views.QuestionDetailView.as_view(), name='question_detail'),
    path('questions/import/', views.ImportQuestionsView.as_view(), name='import_questions'),

    # Answer endpoints
    path('check-answer/', views.CheckAnswerView.as_view(), name='check_answer'),

    # Task system endpoints
    path('tasks/weekly/', views.WeeklyTaskListView.as_view(), name='weekly_tasks'),
    path('tasks/dashboard/', views.TaskDashboardView.as_view(), name='task_dashboard'),
    path('tasks/progress/', views.UpdateTaskProgressView.as_view(), name='update_task_progress'),
    path('tasks/daily-activity/', views.UpdateDailyActivityView.as_view(), name='update_daily_activity'),
    path('leaderboard/', views.UserLeaderboardView.as_view(), name='user_leaderboard'),

    # Weekly question system endpoints
    path('weekly-questions/sets/', views.WeeklyQuestionSetListView.as_view(), name='weekly_question_sets'),
    path('weekly-questions/progress/', views.WeeklyQuestionProgressView.as_view(), name='weekly_question_progress'),
    path('weekly-questions/', views.WeeklyQuestionListView.as_view(), name='weekly_questions'),
]
