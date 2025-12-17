from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Topic(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name or emoji")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Topic"
        verbose_name_plural = "Topics"
        ordering = ['name']

    def __str__(self):
        return self.name


class Question(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Dễ'),
        ('medium', 'Trung bình'),
        ('hard', 'Khó'),
    ]

    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name='questions',
        null=True,
        blank=True,
        help_text="Chủ đề của câu hỏi"
    )
    vietnamese_text = models.TextField()
    english_text = models.TextField()
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default='medium'
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Question"
        verbose_name_plural = "Questions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.vietnamese_text[:50]}... - {self.english_text[:50]}..."


class UserAnswer(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='answers',
        null=True,
        blank=True
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='user_answers'
    )
    user_answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    similarity_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "User Answer"
        verbose_name_plural = "User Answers"
        ordering = ['-created_at']

    def __str__(self):
        user_info = f"{self.user.username} - " if self.user else "Anonymous - "
        return f"{user_info}Answer to {self.question.vietnamese_text[:30]}... - Correct: {self.is_correct}"


class WeeklyTask(models.Model):
    """Weekly tasks for users to complete"""
    TASK_TYPES = [
        ('daily_practice', 'Luyện tập hàng ngày'),
        ('correct_answers', 'Trả lời đúng'),
        ('perfect_week', 'Tuần hoàn hảo'),
        ('topic_master', 'Bậc thầy chủ đề'),
        ('streak_master', 'Chuỗi连胜'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    target_count = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Số lần cần hoàn thành"
    )
    points_reward = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(1000)],
        help_text="Điểm thưởng khi hoàn thành"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Weekly Task"
        verbose_name_plural = "Weekly Tasks"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_task_type_display()}"


class UserTaskProgress(models.Model):
    """Track user progress on weekly tasks"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_progress'
    )
    task = models.ForeignKey(
        WeeklyTask,
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    current_progress = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    week_start = models.DateField(help_text="Start date of the week")
    points_earned = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Task Progress"
        verbose_name_plural = "User Task Progress"
        unique_together = ['user', 'task', 'week_start']
        ordering = ['-week_start', '-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.task.title} - {self.current_progress}/{self.task.target_count}"

    def save(self, *args, **kwargs):
        # Check if task is completed and set completed_at
        if self.current_progress >= self.task.target_count and not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            self.points_earned = self.task.points_reward
        super().save(*args, **kwargs)


class DailyTaskCompletion(models.Model):
    """Track daily task completions for streak calculation"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_completions'
    )
    completion_date = models.DateField()
    questions_answered = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    points_earned = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Daily Task Completion"
        verbose_name_plural = "Daily Task Completions"
        unique_together = ['user', 'completion_date']
        ordering = ['-completion_date']

    def __str__(self):
        return f"{self.user.username} - {self.completion_date} - {self.questions_answered} questions"


class UserPoints(models.Model):
    """Track user points and achievements"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='points'
    )
    total_points = models.IntegerField(default=0)
    weekly_points = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0, help_text="Current daily streak")
    longest_streak = models.IntegerField(default=0, help_text="Longest daily streak")
    last_activity_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Points"
        verbose_name_plural = "User Points"
        unique_together = ['user']

    def __str__(self):
        return f"{self.user.username} - {self.total_points} points (Streak: {self.current_streak})"

    def update_streak(self):
        """Update user streak based on daily activity"""
        today = timezone.now().date()

        if self.last_activity_date == today:
            # Already updated today
            return

        yesterday = today - timezone.timedelta(days=1)

        if self.last_activity_date == yesterday:
            # Continue streak
            self.current_streak += 1
            if self.current_streak > self.longest_streak:
                self.longest_streak = self.current_streak
        elif self.last_activity_date is None or self.last_activity_date < yesterday:
            # Reset streak
            self.current_streak = 1

        self.last_activity_date = today
        self.save()


class WeeklyQuestionSet(models.Model):
    """Weekly question sets for users to complete"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    questions = models.ManyToManyField(
        Question,
        related_name='weekly_sets',
        help_text="Các câu hỏi trong bộ tuần này"
    )
    week_start = models.DateField(help_text="Ngày bắt đầu tuần (Thứ Hai)")
    week_end = models.DateField(help_text="Ngày kết thúc tuần (Chủ Nhật)")
    is_active = models.BooleanField(default=True)
    points_per_question = models.IntegerField(default=5, help_text="Điểm cho mỗi câu trả lời đúng")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Weekly Question Set"
        verbose_name_plural = "Weekly Question Sets"
        ordering = ['-week_start']
        unique_together = ['week_start']

    def __str__(self):
        return f"Tuần {self.week_start} - {self.title}"

    def get_total_questions(self):
        return self.questions.count()

    def get_week_range_display(self):
        return f"{self.week_start.strftime('%d/%m')} - {self.week_end.strftime('%d/%m/%Y')}"


class WeeklyQuestionProgress(models.Model):
    """Track user progress on weekly question sets"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='weekly_question_progress'
    )
    question_set = models.ForeignKey(
        WeeklyQuestionSet,
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    completed_questions = models.ManyToManyField(
        Question,
        related_name='weekly_progress',
        blank=True,
        help_text="Các câu hỏi đã hoàn thành"
    )
    total_points = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Weekly Question Progress"
        verbose_name_plural = "Weekly Question Progress"
        unique_together = ['user', 'question_set']
        ordering = ['-question_set__week_start']

    def __str__(self):
        return f"{self.user.username} - {self.question_set.title} - {self.get_completed_count()}/{self.question_set.get_total_questions()}"

    def get_completed_count(self):
        return self.completed_questions.count()

    def get_progress_percentage(self):
        total = self.question_set.get_total_questions()
        if total == 0:
            return 0
        return (self.get_completed_count() / total) * 100

    def get_remaining_questions(self):
        return self.question_set.questions.exclude(id__in=self.completed_questions.all())

    def mark_question_completed(self, question):
        """Mark a question as completed and update progress"""
        if question not in self.completed_questions.all():
            self.completed_questions.add(question)
            self.total_points += self.question_set.points_per_question

            # Check if all questions are completed
            if self.get_completed_count() >= self.question_set.get_total_questions():
                self.is_completed = True
                self.completed_at = timezone.now()

            self.save()


class DailyLearningSession(models.Model):
    """Daily learning sessions for users"""
    EXERCISE_TYPES = [
        ('translation', 'Dịch câu'),
        ('listening', 'Nghe-viết'),
        ('mixed', 'Kết hợp'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_learning_sessions'
    )
    session_date = models.DateField(help_text="Ngày học tập")
    exercise_type = models.CharField(
        max_length=20,
        choices=EXERCISE_TYPES,
        default='mixed'
    )
    target_questions = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text="Số câu hỏi mục tiêu"
    )
    completed_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    points_earned = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Daily Learning Session"
        verbose_name_plural = "Daily Learning Sessions"
        unique_together = ['user', 'session_date', 'exercise_type']
        ordering = ['-session_date']

    def __str__(self):
        return f"{self.user.username} - {self.session_date} - {self.get_exercise_type_display()}"

    def get_progress_percentage(self):
        if self.target_questions == 0:
            return 0
        return (self.completed_questions / self.target_questions) * 100

    def get_accuracy_rate(self):
        if self.completed_questions == 0:
            return 0
        return (self.correct_answers / self.completed_questions) * 100

    def mark_completed(self):
        """Mark session as completed"""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            self.save()


class DailyLearningQuestion(models.Model):
    """Questions used in daily learning sessions"""
    session = models.ForeignKey(
        DailyLearningSession,
        on_delete=models.CASCADE,
        related_name='session_questions'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='daily_session_questions'
    )
    user_answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    similarity_score = models.FloatField(default=0.0)
    time_taken = models.IntegerField(
        default=0,
        help_text="Thời gian trả lời (giây)"
    )
    attempts = models.IntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Daily Learning Question"
        verbose_name_plural = "Daily Learning Questions"
        unique_together = ['session', 'question']
        ordering = ['created_at']

    def __str__(self):
        return f"{self.session.user.username} - {self.question.vietnamese_text[:30]}... - Correct: {self.is_correct}"


class DailyLearningStreak(models.Model):
    """Track daily learning streaks"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='learning_streaks'
    )
    current_streak = models.IntegerField(default=0, help_text="Chuỗi học tập hiện tại")
    longest_streak = models.IntegerField(default=0, help_text="Chuỗi học tập dài nhất")
    last_learning_date = models.DateField(null=True, blank=True)
    total_days_learned = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Daily Learning Streak"
        verbose_name_plural = "Daily Learning Streaks"
        unique_together = ['user']

    def __str__(self):
        return f"{self.user.username} - Streak: {self.current_streak} (Longest: {self.longest_streak})"

    def update_streak(self, learning_date):
        """Update learning streak based on learning date"""
        if self.last_learning_date == learning_date:
            # Already updated today
            return

        yesterday = learning_date - timezone.timedelta(days=1)

        if self.last_learning_date == yesterday:
            # Continue streak
            self.current_streak += 1
            if self.current_streak > self.longest_streak:
                self.longest_streak = self.current_streak
        elif self.last_learning_date is None or self.last_learning_date < yesterday:
            # Reset streak
            self.current_streak = 1

        self.last_learning_date = learning_date
        self.total_days_learned += 1
        self.save()


class DailyLearningSettings(models.Model):
    """User settings for daily learning"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_learning_settings'
    )
    daily_target = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text="Số câu hỏi mục tiêu mỗi ngày"
    )
    preferred_difficulty = models.CharField(
        max_length=20,
        choices=Question.DIFFICULTY_CHOICES,
        default='medium'
    )
    preferred_topics = models.ManyToManyField(
        Topic,
        blank=True,
        related_name='user_learning_preferences',
        help_text="Chủ đề yêu thích"
    )
    exercise_types = models.CharField(
        max_length=100,
        default='translation,listening',
        help_text="Các loại bài tập (cách nhau bằng dấu phẩy)"
    )
    reminder_enabled = models.BooleanField(default=True)
    reminder_time = models.TimeField(default="09:00:00")
    auto_play_audio = models.BooleanField(default=True)
    speech_rate = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(2.0)],
        help_text="Tốc độ phát âm (0.5 - 2.0)"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Daily Learning Settings"
        verbose_name_plural = "Daily Learning Settings"
        unique_together = ['user']

    def __str__(self):
        return f"{self.user.username} - Target: {self.daily_target} questions/day"

    def get_exercise_types_list(self):
        """Get exercise types as list"""
        return [t.strip() for t in self.exercise_types.split(',') if t.strip()]

    def set_exercise_types_list(self, types_list):
        """Set exercise types from list"""
        self.exercise_types = ','.join(types_list)
