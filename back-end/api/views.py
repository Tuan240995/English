from rest_framework import status, views, parsers
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import difflib
import random
import re

from django.contrib.auth.models import User
from django.db import models
from .models import (
    Question, UserAnswer, Topic, WeeklyTask, UserTaskProgress, DailyTaskCompletion,
    UserPoints, WeeklyQuestionSet, WeeklyQuestionProgress, DailyLearningSession,
    DailyLearningQuestion, DailyLearningStreak, DailyLearningSettings
)
from .serializers import (
    QuestionSerializer, QuestionSimpleSerializer,
    CheckAnswerSerializer, CheckAnswerResponseSerializer, TopicSerializer,
    UserSerializer, UserLoginSerializer, UserAnswerWithUserSerializer,
    WeeklyTaskSerializer, UserTaskProgressSerializer, DailyTaskCompletionSerializer,
    UserPointsSerializer, TaskDashboardSerializer, WeeklyQuestionSetSerializer,
    WeeklyQuestionProgressSerializer, WeeklyQuestionDetailSerializer,
    DailyLearningSessionSerializer, DailyLearningQuestionSerializer,
    DailyLearningStreakSerializer, DailyLearningSettingsSerializer,
    DailyLearningSessionDetailSerializer, DailyLearningDashboardSerializer
)



def calculate_similarity(text1, text2):
    """Calculate similarity between two texts using SequenceMatcher"""
    return difflib.SequenceMatcher(None, text1.lower().strip(), text2.lower().strip()).ratio()


def get_feedback_message(similarity):
    """Generate feedback message based on similarity score"""
    if similarity >= 0.9:
        return "Tuyệt vời! Bản dịch của bạn rất chính xác!"
    elif similarity >= 0.8:
        return "Tốt! Bản dịch của bạn khá chính xác!"
    elif similarity >= 0.6:
        return "Khá tốt! Có một vài lỗi nhỏ."
    elif similarity >= 0.4:
        return "Cần cải thiện! Bản dịch có nhiều lỗi."
    else:
        return "Cần cố gắng nhiều hơn! Hãy xem lại đáp án đúng."


class RandomQuestionView(views.APIView):
    """Get a random question based on difficulty and topic"""

    def get(self, request):
        difficulty = request.GET.get('difficulty', 'medium')
        topic_id = request.GET.get('topic_id')

        questions = Question.objects.filter(difficulty=difficulty)

        # Filter by topic if provided
        if topic_id:
            questions = questions.filter(topic_id=topic_id)

        if not questions.exists():
            return Response(
                {'error': 'Không có câu hỏi nào cho bộ lọc này'},
                status=status.HTTP_404_NOT_FOUND
            )

        random_question = random.choice(questions)
        serializer = QuestionSimpleSerializer(random_question)
        return Response(serializer.data)


class CheckAnswerView(views.APIView):
    """Check user's answer against the correct answer"""

    def post(self, request):
        serializer = CheckAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question_id = serializer.validated_data['question_id']
        user_answer = serializer.validated_data['user_answer']
        username = request.data.get('username', '')

        question = get_object_or_404(Question, id=question_id)

        # Calculate similarity
        similarity = calculate_similarity(user_answer, question.english_text)
        is_correct = similarity > 0.8

        # Get or create user if username provided
        user = None
        if username:
            user, created = User.objects.get_or_create(username=username)

        # Save user answer
        user_answer_record = UserAnswer.objects.create(
            user=user,
            question=question,
            user_answer=user_answer,
            is_correct=is_correct,
            similarity_score=similarity
        )

        # Prepare response
        response_data = {
            'is_correct': is_correct,
            'similarity_score': similarity,
            'correct_answer': question.english_text,
            'user_answer': user_answer,
            'message': get_feedback_message(similarity)
        }

        response_serializer = CheckAnswerResponseSerializer(response_data)
        return Response(response_serializer.data)


class QuestionListView(views.APIView):
    """Get all questions or add a new question"""

    def get(self, request):
        """Get all questions with pagination and filtering"""
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            topic_id = request.GET.get('topic_id')
            difficulty = request.GET.get('difficulty')
            search = request.GET.get('search', '').strip()

            # Start with all questions
            questions = Question.objects.all()

            # Apply filters
            if topic_id:
                questions = questions.filter(topic_id=topic_id)

            if difficulty:
                questions = questions.filter(difficulty=difficulty)

            if search:
                questions = questions.filter(
                    Q(vietnamese_text__icontains=search) |
                    Q(english_text__icontains=search)
                )

            # Order by created_at descending
            questions = questions.order_by('-created_at')

            # Get total count
            total_count = questions.count()

            # Calculate pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_questions = questions[start_index:end_index]

            # Serialize
            serializer = QuestionSerializer(paginated_questions, many=True)

            # Calculate pagination info
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1

            return Response({
                'results': serializer.data,
                'count': total_count,
                'next': page + 1 if has_next else None,
                'previous': page - 1 if has_previous else None,
                'total_pages': total_pages,
                'current_page': page,
                'page_size': page_size,
                'has_next': has_next,
                'has_previous': has_previous
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy danh sách câu hỏi: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Add a new question"""
        serializer = QuestionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Thêm câu hỏi thành công'
            },
            status=status.HTTP_201_CREATED
        )


class TopicListView(views.APIView):
    """Get all topics or add a new topic"""

    def get(self, request):
        """Get all topics"""
        topics = Topic.objects.all().order_by('name')
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Add a new topic"""
        serializer = TopicSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Thêm chủ đề thành công'
            },
            status=status.HTTP_201_CREATED
        )


class TopicDetailView(views.APIView):
    """Get, update or delete a specific topic"""

    def get(self, request, topic_id):
        """Get a specific topic"""
        topic = get_object_or_404(Topic, id=topic_id)
        serializer = TopicSerializer(topic)
        return Response(serializer.data)

    def put(self, request, topic_id):
        """Update a topic"""
        topic = get_object_or_404(Topic, id=topic_id)
        serializer = TopicSerializer(topic, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Cập nhật chủ đề thành công'
            }
        )

    def delete(self, request, topic_id):
        """Delete a topic"""
        topic = get_object_or_404(Topic, id=topic_id)
        topic.delete()
        return Response(
            {'message': 'Xóa chủ đề thành công'},
            status=status.HTTP_204_NO_CONTENT
        )


class QuestionDetailView(views.APIView):
    """Get, update or delete a specific question"""

    def get(self, request, question_id):
        """Get a specific question"""
        question = get_object_or_404(Question, id=question_id)
        serializer = QuestionSerializer(question)
        return Response(serializer.data)

    def put(self, request, question_id):
        """Update a question"""
        question = get_object_or_404(Question, id=question_id)
        serializer = QuestionSerializer(question, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Cập nhật câu hỏi thành công'
            }
        )

    def delete(self, request, question_id):
        """Delete a question"""
        question = get_object_or_404(Question, id=question_id)
        question.delete()
        return Response(
            {'message': 'Xóa câu hỏi thành công'},
            status=status.HTTP_204_NO_CONTENT
        )


class ImportQuestionsView(views.APIView):
    """Import questions from text file"""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    @csrf_exempt
    def post(self, request):
        try:
            # Check if file was uploaded
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'Vui lòng tải lên file'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            file = request.FILES['file']
            print(file)
            # Check file extension
            if not file.name.endswith('.txt'):
                return Response(
                    {'error': 'Chỉ hỗ trợ file .txt'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Read file content with error handling
            try:
                content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                # Try with different encodings
                file.seek(0)
                try:
                    content = file.read().decode('latin-1')
                except UnicodeDecodeError:
                    file.seek(0)
                    content = file.read().decode('utf-8', errors='ignore')

            # Parse questions from file
            questions_data = self.parse_questions_file(content)

            if not questions_data:
                return Response(
                    {'error': 'Không tìm thấy câu hỏi hợp lệ trong file'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Save questions to database
            created_count = 0
            error_count = 0
            errors = []

            for q_data in questions_data:
                try:
                    # Find or create topic
                    topic = None
                    if q_data['topic']:
                        topic, _ = Topic.objects.get_or_create(
                            name=q_data['topic'],
                            defaults={'description': f'Chủ đề {q_data["topic"]}'}
                        )

                    # Create question
                    Question.objects.get_or_create(
                        vietnamese_text=q_data['vietnamese'],
                        english_text=q_data['english'],
                        defaults={
                            'topic': topic,
                            'difficulty': q_data['difficulty']
                        }
                    )
                    created_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Lỗi với câu hỏi: {q_data.get('vietnamese', 'N/A')} - {str(e)}")

            return Response({
                'message': f'Import thành công {created_count} câu hỏi',
                'created_count': created_count,
                'error_count': error_count,
                'errors': errors[:10]  # Limit errors to first 10
            })

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response(
                {'error': f'Lỗi xử lý file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def parse_questions_file(self, content):
        """Parse questions from file content"""
        questions = []

        # Split by double newlines to separate question blocks
        blocks = re.split(r'\n\s*\n', content.strip())

        for block in blocks:
            if not block.strip():
                continue

            question_data = {
                'vietnamese': '',
                'english': '',
                'topic': '',
                'difficulty': 'medium'
            }

            lines = block.strip().split('\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Parse Question line
                if line.startswith('Question:'):
                    question_data['vietnamese'] = line.replace('Question:', '').strip()

                # Parse Answer line
                elif line.startswith('Answer:'):
                    question_data['english'] = line.replace('Answer:', '').strip()

                # Parse Topic line
                elif line.startswith('Topic:'):
                    question_data['topic'] = line.replace('Topic:', '').strip()

                # Parse Status line (difficulty)
                elif line.startswith('Status:'):
                    status = line.replace('Status:', '').strip().lower()
                    if 'dễ' in status or 'easy' in status:
                        question_data['difficulty'] = 'easy'
                    elif 'khó' in status or 'hard' in status:
                        question_data['difficulty'] = 'hard'
                    else:
                        question_data['difficulty'] = 'medium'

            # Only add if we have both question and answer
            if question_data['vietnamese'] and question_data['english']:
                questions.append(question_data)

        return questions


# User Management Views
class UserLoginView(views.APIView):
    """User login endpoint - username only"""

    @csrf_exempt
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']

        # Get or create user
        user, created = User.objects.get_or_create(
            username=username
        )

        # Get or create token for user
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'message': 'Đăng nhập thành công',
            'user': UserSerializer(user).data,
            'token': token.key,
            'is_new_user': created
        }, status=status.HTTP_200_OK)


class GetTokenView(views.APIView):
    """Get token for authenticated user"""

    def get(self, request):
        # Try to get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                from rest_framework.authtoken.models import Token
                token = Token.objects.get(key=token_key)
                return Response({
                    'token': token.key,
                    'user': UserSerializer(token.user).data
                })
            except Token.DoesNotExist:
                pass

        return Response(
            {'error': 'Token không hợp lệ hoặc không tìm thấy'},
            status=status.HTTP_401_UNAUTHORIZED
        )




class UserAnswerHistoryView(views.APIView):
    """Get user answer history with pagination"""

    def get(self, request):
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            username = request.GET.get('username', '')

            # Filter by username if provided
            answers = UserAnswer.objects.all()
            if username:
                answers = answers.filter(user__username=username)

            # Order by created_at descending
            answers = answers.order_by('-created_at')

            # Get total count
            total_count = answers.count()

            # Calculate pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_answers = answers[start_index:end_index]

            # Serialize
            serializer = UserAnswerWithUserSerializer(paginated_answers, many=True)

            # Calculate pagination info
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1

            return Response({
                'results': serializer.data,
                'count': total_count,
                'next': page + 1 if has_next else None,
                'previous': page - 1 if has_previous else None,
                'total_pages': total_pages,
                'current_page': page,
                'page_size': page_size,
                'has_next': has_next,
                'has_previous': has_previous
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy lịch sử: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Task System Views
class WeeklyTaskListView(views.APIView):
    """Get all weekly tasks or create new ones"""

    def get(self, request):
        """Get all active weekly tasks"""
        tasks = WeeklyTask.objects.filter(is_active=True).order_by('created_at')
        serializer = WeeklyTaskSerializer(tasks, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """Create a new weekly task (admin only)"""
        serializer = WeeklyTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Tạo nhiệm vụ hàng tuần thành công'
            },
            status=status.HTTP_201_CREATED
        )


class TaskDashboardView(views.APIView):
    """Get task dashboard data for a user"""

    def get(self, request):
        """Get comprehensive task dashboard data"""
        try:
            username = request.GET.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get or create user points
            user_points, created = UserPoints.objects.get_or_create(
                user=user,
                defaults={
                    'total_points': 0,
                    'weekly_points': 0,
                    'current_streak': 0,
                    'longest_streak': 0
                }
            )

            # Get current week start
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            week_start = today - datetime.timedelta(days=today.weekday())

            # Get weekly tasks
            weekly_tasks = WeeklyTask.objects.filter(is_active=True).order_by('created_at')

            # Get or create user progress for each task
            user_progress_list = []
            for task in weekly_tasks:
                progress, created = UserTaskProgress.objects.get_or_create(
                    user=user,
                    task=task,
                    week_start=week_start,
                    defaults={
                        'current_progress': 0,
                        'is_completed': False,
                        'points_earned': 0
                    }
                )
                user_progress_list.append(progress)

            # Get today's completion
            try:
                daily_completion = DailyTaskCompletion.objects.get(
                    user=user,
                    completion_date=today
                )
            except DailyTaskCompletion.DoesNotExist:
                daily_completion = None

            # Calculate weekly summary
            weekly_completions = DailyTaskCompletion.objects.filter(
                user=user,
                completion_date__gte=week_start
            )

            weekly_summary = {
                'total_questions': weekly_completions.aggregate(
                    total=models.Sum('questions_answered'))['total'] or 0,
                'correct_answers': weekly_completions.aggregate(
                    correct=models.Sum('correct_answers'))['correct'] or 0,
                'points_earned': weekly_completions.aggregate(
                    points=models.Sum('points_earned'))['points'] or 0,
                'days_active': weekly_completions.count(),
                'tasks_completed': UserTaskProgress.objects.filter(
                    user=user,
                    week_start=week_start,
                    is_completed=True
                ).count()
            }

            # Prepare response data
            response_data = {
                'weekly_tasks': WeeklyTaskSerializer(
                    weekly_tasks, many=True, context={'request': request}
                ).data,
                'user_progress': UserTaskProgressSerializer(
                    user_progress_list, many=True
                ).data,
                'user_points': UserPointsSerializer(user_points).data,
                'daily_completion': DailyTaskCompletionSerializer(
                    daily_completion
                ).data if daily_completion else None,
                'weekly_summary': weekly_summary
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy dữ liệu dashboard: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateTaskProgressView(views.APIView):
    """Update user task progress"""

    def post(self, request):
        """Update progress for a specific task"""
        try:
            username = request.data.get('username', '')
            task_id = request.data.get('task_id', '')
            increment = request.data.get('increment', 1)

            if not username or not task_id:
                return Response(
                    {'error': 'Vui lòng cung cấp username và task_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            task = get_object_or_404(WeeklyTask, id=task_id)

            # Get current week start
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            week_start = today - datetime.timedelta(days=today.weekday())

            # Get or create user progress
            progress, created = UserTaskProgress.objects.get_or_create(
                user=user,
                task=task,
                week_start=week_start,
                defaults={
                    'current_progress': 0,
                    'is_completed': False,
                    'points_earned': 0
                }
            )

            # Update progress
            if not progress.is_completed:
                progress.current_progress += increment
                progress.save()

                # If task was just completed, update user points
                if progress.is_completed and not created:
                    user_points, _ = UserPoints.objects.get_or_create(user=user)
                    user_points.total_points += progress.points_earned
                    user_points.weekly_points += progress.points_earned
                    user_points.save()

            return Response({
                'message': 'Cập nhật tiến trình thành công',
                'progress': UserTaskProgressSerializer(progress).data
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi cập nhật tiến trình: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateDailyActivityView(views.APIView):
    """Update daily activity and points"""

    def post(self, request):
        """Update daily activity after answering questions"""
        try:
            username = request.data.get('username', '')
            questions_answered = request.data.get('questions_answered', 1)
            correct_answers = request.data.get('correct_answers', 0)
            points_earned = request.data.get('points_earned', 0)

            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get or create user points
            user_points, created = UserPoints.objects.get_or_create(
                user=user,
                defaults={
                    'total_points': 0,
                    'weekly_points': 0,
                    'current_streak': 0,
                    'longest_streak': 0
                }
            )

            # Update streak
            user_points.update_streak()

            # Get today's completion
            from django.utils import timezone
            today = timezone.now().date()

            daily_completion, created = DailyTaskCompletion.objects.get_or_create(
                user=user,
                completion_date=today,
                defaults={
                    'questions_answered': 0,
                    'correct_answers': 0,
                    'points_earned': 0
                }
            )

            # Update daily completion
            daily_completion.questions_answered += questions_answered
            daily_completion.correct_answers += correct_answers
            daily_completion.points_earned += points_earned
            daily_completion.save()

            # Update user points
            user_points.total_points += points_earned
            user_points.weekly_points += points_earned
            user_points.save()

            # Update task progress based on activity
            self._update_task_progress_from_activity(user, questions_answered, correct_answers)

            return Response({
                'message': 'Cập nhật hoạt động hàng ngày thành công',
                'user_points': UserPointsSerializer(user_points).data,
                'daily_completion': DailyTaskCompletionSerializer(daily_completion).data
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi cập nhật hoạt động: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _update_task_progress_from_activity(self, user, questions_answered, correct_answers):
        """Update task progress based on user activity"""
        from django.utils import timezone
        import datetime

        today = timezone.now().date()
        week_start = today - datetime.timedelta(days=today.weekday())

        # Update daily practice task
        daily_practice_task = WeeklyTask.objects.filter(
            task_type='daily_practice',
            is_active=True
        ).first()

        if daily_practice_task:
            progress, _ = UserTaskProgress.objects.get_or_create(
                user=user,
                task=daily_practice_task,
                week_start=week_start,
                defaults={
                    'current_progress': 0,
                    'is_completed': False,
                    'points_earned': 0
                }
            )

            if not progress.is_completed:
                progress.current_progress = min(progress.current_progress + 1, daily_practice_task.target_count)
                progress.save()

        # Update correct answers task
        correct_answers_task = WeeklyTask.objects.filter(
            task_type='correct_answers',
            is_active=True
        ).first()

        if correct_answers_task and correct_answers > 0:
            progress, _ = UserTaskProgress.objects.get_or_create(
                user=user,
                task=correct_answers_task,
                week_start=week_start,
                defaults={
                    'current_progress': 0,
                    'is_completed': False,
                    'points_earned': 0
                }
            )

            if not progress.is_completed:
                progress.current_progress = min(
                    progress.current_progress + correct_answers,
                    correct_answers_task.target_count
                )
                progress.save()


class UserLeaderboardView(views.APIView):
    """Get user leaderboard"""

    def get(self, request):
        """Get leaderboard sorted by points"""
        try:
            leaderboard_type = request.GET.get('type', 'total')  # total or weekly
            limit = int(request.GET.get('limit', 10))

            if leaderboard_type == 'weekly':
                leaderboard = UserPoints.objects.all().order_by('-weekly_points', '-current_streak')
            else:
                leaderboard = UserPoints.objects.all().order_by('-total_points', '-longest_streak')

            leaderboard_data = []
            for rank, user_points in enumerate(leaderboard[:limit], 1):
                data = UserPointsSerializer(user_points).data
                data['rank'] = rank
                leaderboard_data.append(data)

            return Response({
                'leaderboard': leaderboard_data,
                'type': leaderboard_type,
                'total_users': UserPoints.objects.count()
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy bảng xếp hạng: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Weekly Question System Views
class WeeklyQuestionSetListView(views.APIView):
    """Get all weekly question sets or create new ones"""

    def get(self, request):
        """Get all weekly question sets"""
        question_sets = WeeklyQuestionSet.objects.all().order_by('-week_start')
        serializer = WeeklyQuestionSetSerializer(question_sets, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new weekly question set (admin only)"""
        serializer = WeeklyQuestionSetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {
                **serializer.data,
                'message': 'Tạo bộ câu hỏi hàng tuần thành công'
            },
            status=status.HTTP_201_CREATED
        )


class WeeklyQuestionProgressView(views.APIView):
    """Get or update user progress on weekly question sets"""

    def get(self, request):
        """Get user's weekly question progress"""
        try:
            username = request.GET.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get current week start
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            week_start = today - datetime.timedelta(days=today.weekday())

            # Get current week's question set
            try:
                question_set = WeeklyQuestionSet.objects.get(week_start=week_start, is_active=True)
            except WeeklyQuestionSet.DoesNotExist:
                return Response(
                    {'error': 'Chưa có bộ câu hỏi cho tuần này'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get or create user progress
            progress, created = WeeklyQuestionProgress.objects.get_or_create(
                user=user,
                question_set=question_set
            )

            serializer = WeeklyQuestionDetailSerializer(progress)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy tiến trình câu hỏi tuần: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Update user progress on weekly questions"""
        try:
            username = request.data.get('username', '')
            question_id = request.data.get('question_id', '')
            user_answer = request.data.get('user_answer', '')

            if not username or not question_id or not user_answer:
                return Response(
                    {'error': 'Vui lòng cung cấp username, question_id và user_answer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            question = get_object_or_404(Question, id=question_id)

            # Get current week start
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            week_start = today - datetime.timedelta(days=today.weekday())

            # Get current week's question set
            try:
                question_set = WeeklyQuestionSet.objects.get(week_start=week_start, is_active=True)
            except WeeklyQuestionSet.DoesNotExist:
                return Response(
                    {'error': 'Chưa có bộ câu hỏi cho tuần này'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get or create user progress
            progress, created = WeeklyQuestionProgress.objects.get_or_create(
                user=user,
                question_set=question_set
            )

            # Check if question is part of this week's set
            if question not in question_set.questions.all():
                return Response(
                    {'error': 'Câu hỏi này không thuộc bộ câu hỏi tuần này'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate similarity for answer validation
            similarity = calculate_similarity(user_answer, question.english_text)
            is_correct = similarity > 0.8  # 80% threshold for correct answer

            if is_correct:
                # Mark question as completed only if answer is correct enough
                progress.mark_question_completed(question)

                # Update user points
                user_points, _ = UserPoints.objects.get_or_create(user=user)
                user_points.total_points += question_set.points_per_question
                user_points.weekly_points += question_set.points_per_question
                user_points.save()

                return Response({
                    'message': 'Câu trả lời chính xác! Cập nhật tiến trình thành công.',
                    'is_correct': True,
                    'similarity_score': round(similarity, 2),
                    'correct_answer': question.english_text,
                    'progress': WeeklyQuestionDetailSerializer(progress).data
                })
            else:
                return Response({
                    'message': f'Câu trả lời chưa đủ chính xác (độ chính xác: {round(similarity * 100)}%). Vui lòng thử lại.',
                    'is_correct': False,
                    'similarity_score': round(similarity, 2),
                    'correct_answer': question.english_text,
                    'feedback': get_feedback_message(similarity),
                    'progress': WeeklyQuestionDetailSerializer(progress).data
                })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi cập nhật tiến trình câu hỏi tuần: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WeeklyQuestionListView(views.APIView):
    """Get weekly questions for a user"""

    def get(self, request):
        """Get remaining questions for user's weekly set"""
        try:
            username = request.GET.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get current week start
            from django.utils import timezone
            import datetime
            today = timezone.now().date()
            week_start = today - datetime.timedelta(days=today.weekday())

            # Get current week's question set
            try:
                question_set = WeeklyQuestionSet.objects.get(week_start=week_start, is_active=True)
            except WeeklyQuestionSet.DoesNotExist:
                return Response(
                    {'error': 'Chưa có bộ câu hỏi cho tuần này'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get or create user progress
            progress, created = WeeklyQuestionProgress.objects.get_or_create(
                user=user,
                question_set=question_set
            )

            # Get remaining questions
            remaining_questions = progress.get_remaining_questions()
            serializer = QuestionSimpleSerializer(remaining_questions, many=True)

            return Response({
                'question_set': WeeklyQuestionSetSerializer(question_set).data,
                'remaining_questions': serializer.data,
                'completed_count': progress.get_completed_count(),
                'total_questions': question_set.get_total_questions(),
                'progress_percentage': progress.get_progress_percentage(),
                'is_completed': progress.is_completed
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy câu hỏi tuần: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Daily Learning System Views
class DailyLearningDashboardView(views.APIView):
    """Get daily learning dashboard data"""

    def get(self, request):
        """Get comprehensive daily learning dashboard"""
        try:
            username = request.GET.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get today's date
            from django.utils import timezone
            today = timezone.now().date()

            # Get or create user settings
            user_settings, created = DailyLearningSettings.objects.get_or_create(
                user=user,
                defaults={
                    'daily_target': 10,
                    'preferred_difficulty': 'medium',
                    'exercise_types': 'translation,listening'
                }
            )

            # Get or create learning streak
            learning_streak, created = DailyLearningStreak.objects.get_or_create(
                user=user,
                defaults={
                    'current_streak': 0,
                    'longest_streak': 0,
                    'total_days_learned': 0
                }
            )

            # Get today's sessions
            today_sessions = DailyLearningSession.objects.filter(
                user=user,
                session_date=today
            ).order_by('created_at')

            # Calculate weekly stats
            week_start = today - timezone.timedelta(days=today.weekday())
            weekly_sessions = DailyLearningSession.objects.filter(
                user=user,
                session_date__gte=week_start
            )

            weekly_stats = {
                'total_sessions': weekly_sessions.count(),
                'total_questions': weekly_sessions.aggregate(
                    total=models.Sum('completed_questions'))['total'] or 0,
                'correct_answers': weekly_sessions.aggregate(
                    correct=models.Sum('correct_answers'))['correct'] or 0,
                'points_earned': weekly_sessions.aggregate(
                    points=models.Sum('points_earned'))['points'] or 0,
                'days_active': weekly_sessions.values('session_date').distinct().count()
            }

            # Calculate monthly stats
            month_start = today.replace(day=1)
            monthly_sessions = DailyLearningSession.objects.filter(
                user=user,
                session_date__gte=month_start
            )

            monthly_stats = {
                'total_sessions': monthly_sessions.count(),
                'total_questions': monthly_sessions.aggregate(
                    total=models.Sum('completed_questions'))['total'] or 0,
                'correct_answers': monthly_sessions.aggregate(
                    correct=models.Sum('correct_answers'))['correct'] or 0,
                'points_earned': monthly_sessions.aggregate(
                    points=models.Sum('points_earned'))['points'] or 0,
                'days_active': monthly_sessions.values('session_date').distinct().count()
            }

            # Generate achievements
            achievements = self._generate_achievements(user, learning_streak, user_settings)

            response_data = {
                'today_sessions': DailyLearningSessionSerializer(today_sessions, many=True).data,
                'learning_streak': DailyLearningStreakSerializer(learning_streak).data,
                'user_settings': DailyLearningSettingsSerializer(user_settings).data,
                'weekly_stats': weekly_stats,
                'monthly_stats': monthly_stats,
                'achievements': achievements
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy dashboard học tập: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_achievements(self, user, learning_streak, settings):
        """Generate user achievements based on progress"""
        achievements = []

        # Streak achievements
        if learning_streak.current_streak >= 30:
            achievements.append({
                'id': 'streak_30',
                'title': ':fire::fire::fire: Huyền thoại',
                'description': 'Học tập liên tục 30 ngày',
                'earned': True
            })
        elif learning_streak.current_streak >= 14:
            achievements.append({
                'id': 'streak_14',
                'title': ':fire::fire: Bậc thầy',
                'description': 'Học tập liên tục 14 ngày',
                'earned': True
            })
        elif learning_streak.current_streak >= 7:
            achievements.append({
                'id': 'streak_7',
                'title': ':fire: Kiên trì',
                'description': 'Học tập liên tục 7 ngày',
                'earned': True
            })

        # Total days achievements
        if learning_streak.total_days_learned >= 100:
            achievements.append({
                'id': 'days_100',
                'title': ':100: Trăm ngày',
                'description': 'Học tập tổng cộng 100 ngày',
                'earned': True
            })
        elif learning_streak.total_days_learned >= 50:
            achievements.append({
                'id': 'days_50',
                'title': ':star2: Nửa chặng đường',
                'description': 'Học tập tổng cộng 50 ngày',
                'earned': True
            })

        return achievements


class DailyLearningSessionView(views.APIView):
    """Create and manage daily learning sessions"""

    def post(self, request):
        """Start a new daily learning session"""
        try:
            username = request.data.get('username', '')
            exercise_type = request.data.get('exercise_type', 'mixed')
            target_questions = request.data.get('target_questions', 10)

            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get today's date
            from django.utils import timezone
            today = timezone.now().date()

            # Check if session already exists for today and exercise type
            existing_session = DailyLearningSession.objects.filter(
                user=user,
                session_date=today,
                exercise_type=exercise_type
            ).first()

            if existing_session:
                return Response({
                    'message': 'Bạn đã có buổi học hôm nay cho loại bài tập này',
                    'session': DailyLearningSessionDetailSerializer(existing_session).data
                })

            # Get user settings for target questions
            user_settings = user.daily_learning_settings.first()
            if user_settings:
                target_questions = user_settings.daily_target

            # Create new session
            session = DailyLearningSession.objects.create(
                user=user,
                session_date=today,
                exercise_type=exercise_type,
                target_questions=target_questions
            )

            # Update learning streak
            learning_streak, created = DailyLearningStreak.objects.get_or_create(
                user=user,
                defaults={
                    'current_streak': 0,
                    'longest_streak': 0,
                    'total_days_learned': 0
                }
            )
            learning_streak.update_streak(today)

            return Response({
                'message': 'Bắt đầu buổi học thành công!',
                'session': DailyLearningSessionDetailSerializer(session).data
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi bắt đầu buổi học: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """Get current learning session"""
        try:
            username = request.GET.get('username', '')
            exercise_type = request.GET.get('exercise_type', '')

            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Get today's date
            from django.utils import timezone
            today = timezone.now().date()

            # Filter sessions
            sessions = DailyLearningSession.objects.filter(
                user=user,
                session_date=today
            )

            if exercise_type:
                sessions = sessions.filter(exercise_type=exercise_type)

            sessions = sessions.order_by('created_at')

            if not sessions.exists():
                return Response({
                    'message': 'Chưa có buổi học nào hôm nay',
                    'sessions': []
                })

            session_data = []
            for session in sessions:
                session_data.append(DailyLearningSessionDetailSerializer(session).data)

            return Response({
                'sessions': session_data,
                'total_sessions': len(session_data)
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy buổi học: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DailyLearningAnswerView(views.APIView):
    """Submit answers for daily learning sessions"""

    def post(self, request):
        """Submit answer for a learning session"""
        try:
            username = request.data.get('username', '')
            session_id = request.data.get('session_id', '')
            question_id = request.data.get('question_id', '')
            user_answer = request.data.get('user_answer', '')
            time_taken = request.data.get('time_taken', 0)

            if not username or not session_id or not question_id or not user_answer:
                return Response(
                    {'error': 'Vui lòng cung cấp username, session_id, question_id và user_answer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            session = get_object_or_404(DailyLearningSession, id=session_id, user=user)
            question = get_object_or_404(Question, id=question_id)

            # Check if session is already completed
            if session.is_completed:
                return Response(
                    {'error': 'Buổi học đã kết thúc'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if question already answered in this session
            existing_answer = DailyLearningQuestion.objects.filter(
                session=session,
                question=question
            ).first()

            if existing_answer:
                # Update existing answer
                existing_answer.user_answer = user_answer
                existing_answer.attempts += 1
                existing_answer.time_taken += time_taken
            else:
                # Create new answer
                existing_answer = DailyLearningQuestion.objects.create(
                    session=session,
                    question=question,
                    user_answer=user_answer,
                    time_taken=time_taken
                )

            # Calculate similarity
            similarity = calculate_similarity(user_answer, question.english_text)
            is_correct = similarity > 0.8

            # Update answer record
            existing_answer.is_correct = is_correct
            existing_answer.similarity_score = similarity
            existing_answer.save()

            # Update session progress
            if is_correct:
                session.correct_answers += 1

            session.completed_questions += 1

            # Calculate points for this answer based on similarity percentage
            # Points range: 1-10 points based on accuracy (0.1 to 1.0 similarity)
            points_for_this_answer = max(1, int(similarity * 10))  # Min 1 point, max 10 points
            session.points_earned += points_for_this_answer

            # Check if session is completed
            if session.completed_questions >= session.target_questions:
                session.mark_completed()

            session.save()

            # Update user points
            user_points, _ = UserPoints.objects.get_or_create(user=user)
            user_points.total_points += points_for_this_answer
            user_points.weekly_points += points_for_this_answer
            user_points.save()

            return Response({
                'message': 'Nộp bài thành công!',
                'is_correct': is_correct,
                'similarity_score': round(similarity, 2),
                'correct_answer': question.english_text,
                'feedback': get_feedback_message(similarity),
                'session_progress': {
                    'completed_questions': session.completed_questions,
                    'target_questions': session.target_questions,
                    'correct_answers': session.correct_answers,
                    'points_earned': session.points_earned,
                    'is_completed': session.is_completed,
                    'progress_percentage': session.get_progress_percentage(),
                    'accuracy_rate': session.get_accuracy_rate()
                }
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi nộp bài: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DailyLearningSettingsView(views.APIView):
    """Manage daily learning settings"""

    def get(self, request):
        """Get user learning settings"""
        try:
            username = request.GET.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            settings, created = DailyLearningSettings.objects.get_or_create(
                user=user,
                defaults={
                    'daily_target': 10,
                    'preferred_difficulty': 'medium',
                    'exercise_types': 'translation,listening'
                }
            )

            return Response(DailyLearningSettingsSerializer(settings).data)

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy cài đặt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """Update user learning settings"""
        try:
            username = request.data.get('username', '')
            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            settings, created = DailyLearningSettings.objects.get_or_create(user=user)

            # Update settings
            if 'daily_target' in request.data:
                settings.daily_target = int(request.data['daily_target'])
            if 'preferred_difficulty' in request.data:
                settings.preferred_difficulty = request.data['preferred_difficulty']
            if 'preferred_topics' in request.data:
                topic_ids = request.data['preferred_topics']
                settings.preferred_topics.set(topic_ids)
            if 'exercise_types' in request.data:
                if isinstance(request.data['exercise_types'], list):
                    settings.set_exercise_types_list(request.data['exercise_types'])
                else:
                    settings.exercise_types = request.data['exercise_types']
            if 'reminder_enabled' in request.data:
                settings.reminder_enabled = request.data['reminder_enabled']
            if 'reminder_time' in request.data:
                settings.reminder_time = request.data['reminder_time']
            if 'auto_play_audio' in request.data:
                settings.auto_play_audio = request.data['auto_play_audio']
            if 'speech_rate' in request.data:
                settings.speech_rate = float(request.data['speech_rate'])

            settings.save()

            return Response({
                'message': 'Cập nhật cài đặt thành công',
                'settings': DailyLearningSettingsSerializer(settings).data
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi cập nhật cài đặt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DailyLearningResetSessionView(views.APIView):
    """Reset a daily learning session"""

    @csrf_exempt
    def post(self, request):
        """Reset a learning session"""
        try:
            username = request.data.get('username', '')
            session_id = request.data.get('session_id', '')

            if not username or not session_id:
                return Response(
                    {'error': 'Vui lòng cung cấp username và session_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)
            session = get_object_or_404(DailyLearningSession, id=session_id, user=user)

            # Delete all questions for this session
            DailyLearningQuestion.objects.filter(session=session).delete()

            # Reset session progress
            session.completed_questions = 0
            session.correct_answers = 0
            session.points_earned = 0
            session.is_completed = False
            session.completed_at = None
            session.save()

            return Response({
                'message': 'Làm lại buổi học thành công!',
                'session': DailyLearningSessionDetailSerializer(session).data
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi làm lại buổi học: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DailyLearningHistoryView(views.APIView):
    """Get daily learning history"""

    def get(self, request):
        """Get user's learning history"""
        try:
            username = request.GET.get('username', '')
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            days = int(request.GET.get('days', 30))  # Default last 30 days

            if not username:
                return Response(
                    {'error': 'Vui lòng cung cấp username'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = get_object_or_404(User, username=username)

            # Calculate date range
            from django.utils import timezone
            end_date = timezone.now().date()
            start_date = end_date - timezone.timedelta(days=days)

            # Get sessions
            sessions = DailyLearningSession.objects.filter(
                user=user,
                session_date__gte=start_date,
                session_date__lte=end_date
            ).order_by('-session_date', '-created_at')

            # Get total count
            total_count = sessions.count()

            # Calculate pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_sessions = sessions[start_index:end_index]

            # Serialize
            serializer = DailyLearningSessionDetailSerializer(paginated_sessions, many=True)

            # Calculate pagination info
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1

            return Response({
                'results': serializer.data,
                'count': total_count,
                'next': page + 1 if has_next else None,
                'previous': page - 1 if has_previous else None,
                'total_pages': total_pages,
                'current_page': page,
                'page_size': page_size,
                'has_next': has_next,
                'has_previous': has_previous,
                'date_range': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': days
                }
            })

        except Exception as e:
            return Response(
                {'error': f'Lỗi khi lấy lịch sử học tập: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
