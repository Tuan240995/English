from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Question, UserAnswer, Topic, WeeklyTask, UserTaskProgress, DailyTaskCompletion, UserPoints, WeeklyQuestionSet, WeeklyQuestionProgress


class TopicSerializer(serializers.ModelSerializer):
    questions_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = ['id', 'name', 'description', 'icon', 'questions_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_questions_count(self, obj):
        return obj.questions.count()


# Task System Serializers
class WeeklyTaskSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyTask model"""
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyTask
        fields = [
            'id', 'title', 'description', 'task_type', 'task_type_display',
            'target_count', 'points_reward', 'is_active', 'created_at',
            'progress_percentage'
        ]
        read_only_fields = ['id', 'created_at']

    def get_progress_percentage(self, obj):
        """Calculate progress percentage for a user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            try:
                from django.utils import timezone
                import datetime

                # Get current week start (Monday)
                today = timezone.now().date()
                week_start = today - datetime.timedelta(days=today.weekday())

                progress = UserTaskProgress.objects.get(
                    user=request.user,
                    task=obj,
                    week_start=week_start
                )
                return min(100, (progress.current_progress / obj.target_count) * 100)
            except UserTaskProgress.DoesNotExist:
                return 0
        return 0


class UserTaskProgressSerializer(serializers.ModelSerializer):
    """Serializer for UserTaskProgress model"""
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    task_type_display = serializers.CharField(source='task.get_task_type_display', read_only=True)
    target_count = serializers.IntegerField(source='task.target_count', read_only=True)
    points_reward = serializers.IntegerField(source='task.points_reward', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = UserTaskProgress
        fields = [
            'id', 'task', 'task_title', 'task_description', 'task_type_display',
            'current_progress', 'target_count', 'progress_percentage', 'is_completed',
            'completed_at', 'points_earned', 'points_reward', 'week_start',
            'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_progress_percentage(self, obj):
        # Use the target_count from the related task
        if hasattr(obj, 'task') and obj.task:
            if obj.task.target_count > 0:
                return min(100, (obj.current_progress / obj.task.target_count) * 100)
        return 0

    def get_is_overdue(self, obj):
        """Check if the task is overdue (past the current week)"""
        from django.utils import timezone
        import datetime

        today = timezone.now().date()
        week_start = today - datetime.timedelta(days=today.weekday())
        week_end = week_start + datetime.timedelta(days=6)

        return obj.week_start < week_start and not obj.is_completed


class DailyTaskCompletionSerializer(serializers.ModelSerializer):
    """Serializer for DailyTaskCompletion model"""
    accuracy_percentage = serializers.SerializerMethodField()

    class Meta:
        model = DailyTaskCompletion
        fields = [
            'id', 'completion_date', 'questions_answered', 'correct_answers',
            'accuracy_percentage', 'points_earned', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_accuracy_percentage(self, obj):
        if obj.questions_answered > 0:
            return round((obj.correct_answers / obj.questions_answered) * 100, 1)
        return 0


class UserPointsSerializer(serializers.ModelSerializer):
    """Serializer for UserPoints model"""
    weekly_rank = serializers.SerializerMethodField()
    total_rank = serializers.SerializerMethodField()

    class Meta:
        model = UserPoints
        fields = [
            'id', 'total_points', 'weekly_points', 'current_streak',
            'longest_streak', 'last_activity_date', 'weekly_rank', 'total_rank',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_weekly_rank(self, obj):
        """Get user's weekly rank"""
        from django.db.models import F
        from django.utils import timezone
        import datetime

        # Get current week start
        today = timezone.now().date()
        week_start = today - datetime.timedelta(days=today.weekday())

        # Count users with higher weekly points
        higher_count = UserPoints.objects.filter(
            weekly_points__gt=obj.weekly_points
        ).count()

        return higher_count + 1

    def get_total_rank(self, obj):
        """Get user's total rank"""
        higher_count = UserPoints.objects.filter(
            total_points__gt=obj.total_points
        ).count()

        return higher_count + 1


class TaskDashboardSerializer(serializers.Serializer):
    """Serializer for task dashboard data"""
    weekly_tasks = serializers.ListField(child=WeeklyTaskSerializer())
    user_progress = serializers.ListField(child=UserTaskProgressSerializer())
    user_points = UserPointsSerializer()
    daily_completion = DailyTaskCompletionSerializer(allow_null=True)
    weekly_summary = serializers.DictField()

    def get_questions_count(self, obj):
        return obj.questions.count()


class QuestionSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'vietnamese_text', 'english_text', 'difficulty', 'topic', 'topic_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionSimpleSerializer(serializers.ModelSerializer):
    """Serializer for learning page - includes English text for audio hints"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'vietnamese_text', 'english_text', 'difficulty', 'topic_name']




class CheckAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    user_answer = serializers.CharField()


class CheckAnswerResponseSerializer(serializers.Serializer):
    is_correct = serializers.BooleanField()
    similarity_score = serializers.FloatField()
    correct_answer = serializers.CharField()
    user_answer = serializers.CharField()
    message = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id']


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login (username only)"""
    username = serializers.CharField(max_length=150)


class UserAnswerWithUserSerializer(serializers.ModelSerializer):
    """Serializer for UserAnswer with user info"""
    username = serializers.CharField(source='user.username', read_only=True)
    vietnamese_text = serializers.CharField(source='question.vietnamese_text', read_only=True)
    correct_answer = serializers.CharField(source='question.english_text', read_only=True)

    class Meta:
        model = UserAnswer
        fields = [
            'id', 'username', 'question_id', 'vietnamese_text', 'user_answer',
            'correct_answer', 'is_correct', 'similarity_score', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# Weekly Question System Serializers
class WeeklyQuestionSetSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyQuestionSet model"""
    total_questions = serializers.SerializerMethodField()
    week_range_display = serializers.SerializerMethodField()
    questions = QuestionSimpleSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklyQuestionSet
        fields = [
            'id', 'title', 'description', 'questions', 'week_start', 'week_end',
            'total_questions', 'week_range_display', 'is_active', 'points_per_question',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_questions(self, obj):
        return obj.get_total_questions()

    def get_week_range_display(self, obj):
        return obj.get_week_range_display()


class WeeklyQuestionProgressSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyQuestionProgress model"""
    question_set_title = serializers.CharField(source='question_set.title', read_only=True)
    question_set_week_range = serializers.CharField(source='question_set.get_week_range_display', read_only=True)
    completed_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    remaining_questions_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyQuestionProgress
        fields = [
            'id', 'question_set', 'question_set_title', 'question_set_week_range',
            'completed_count', 'total_questions', 'progress_percentage',
            'remaining_questions_count', 'total_points', 'is_completed',
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_completed_count(self, obj):
        return obj.get_completed_count()

    def get_total_questions(self, obj):
        return obj.question_set.get_total_questions()

    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()

    def get_remaining_questions_count(self, obj):
        return obj.get_remaining_questions().count()


class WeeklyQuestionDetailSerializer(serializers.ModelSerializer):
    """Serializer for weekly questions with progress tracking"""
    question_set = WeeklyQuestionSetSerializer(read_only=True)
    completed_questions = serializers.SerializerMethodField()
    next_question = serializers.SerializerMethodField()
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = WeeklyQuestionProgress
        fields = [
            'id', 'question_set', 'completed_questions', 'next_question',
            'is_completed', 'total_points', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_completed_questions(self, obj):
        """Get list of completed question IDs"""
        return list(obj.completed_questions.values_list('id', flat=True))

    def get_next_question(self, obj):
        """Get the next unanswered question"""
        remaining = obj.get_remaining_questions().first()
        if remaining:
            return QuestionSimpleSerializer(remaining).data
        return None
