from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from api.models import Question, Topic, WeeklyQuestionSet, WeeklyQuestionProgress
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Create weekly question set for current week'

    def handle(self, *args, **options):
        """Create weekly question set for current week"""
        self.stdout.write('Creating weekly question set for current week...\n')

        # Get current week start (Monday)
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())

        # Check if weekly set already exists for this week
        existing_set = WeeklyQuestionSet.objects.filter(week_start=week_start).first()
        if existing_set:
            self.stdout.write(f'Weekly question set already exists for week {week_start} (ID: {existing_set.id})\n')
            return

        # Get all questions
        questions = Question.objects.all()
        if not questions.exists():
            self.stdout.write('No questions found in database. Please add some questions first.\n')
            return

        # Calculate week end (Sunday)
        week_end = week_start + timedelta(days=6)

        # Create weekly question set
        weekly_set = WeeklyQuestionSet.objects.create(
            title=f'Câu hỏi tuần {week_start.strftime("%d/%m/%Y")} - {week_end.strftime("%d/%m/%Y")}',
            description=f'Bộ câu hỏi cho tuần từ {week_start.strftime("%d/%m/%Y")} đến {week_end.strftime("%d/%m/%Y")}',
            week_start=week_start,
            week_end=week_end,
            is_active=True,
            points_per_question=10
        )

        # Add random questions to the set (10 questions per set)
        all_questions = list(questions)
        random.shuffle(all_questions)
        selected_questions = all_questions[:10]  # Take first 10 random questions

        weekly_set.questions.add(*selected_questions)
        weekly_set.save()

        self.stdout.write(f'Created weekly question set: {weekly_set.title}\n')
        self.stdout.write(f'Week start: {weekly_set.week_start}\n')
        self.stdout.write(f'Total questions: {weekly_set.get_total_questions()}\n')
        self.stdout.write(f'Points per question: {weekly_set.points_per_question}\n')
        self.stdout.write(f'Questions added: {len(selected_questions)}\n')

        # Create progress for all users
        users = User.objects.all()
        for user in users:
            WeeklyQuestionProgress.objects.get_or_create(
                user=user,
                question_set=weekly_set
            )

        self.stdout.write(f'Created progress for {users.count()} users\n')
        self.stdout.write('Weekly question set created successfully!\n')
