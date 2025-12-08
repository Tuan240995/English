import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from api.models import Topic, Question, WeeklyQuestionSet
from django.utils import timezone
from datetime import timedelta
import random

def create_topics():
    """Create basic topics if they don't exist"""
    topics = [
        'Hàng ngày', 'Công việc', 'Du lịch', 'Ẩm thực', 'Mua sắm',
        'Giáo dục', 'Sức khỏe', 'Thể thao', 'Công nghệ', 'Gia đình'
    ]

    for topic_name in topics:
        topic, created = Topic.objects.get_or_create(
            name=topic_name,
            defaults={'description': f'Chủ đề {topic_name}'}
        )
        if created:
            print(f"Created topic: {topic_name}")

def load_sample_questions():
    """Load sample questions using Django management command"""
    try:
        call_command('load_sample_questions')
        print("Sample questions loaded successfully")
    except Exception as e:
        print(f"Error loading sample questions: {e}")

def create_weekly_question_set():
    """Create weekly question set for current week"""
    try:
        call_command('create_weekly_question_set')
        print("Weekly question set created successfully")
    except Exception as e:
        print(f"Error creating weekly question set: {e}")

def main():
    print("Starting fix for weekly questions...")

    # Step 1: Create topics
    print("\n1. Creating topics...")
    create_topics()

    # Step 2: Load sample questions
    print("\n2. Loading sample questions...")
    load_sample_questions()

    # Step 3: Create weekly question set
    print("\n3. Creating weekly question set...")
    create_weekly_question_set()

    # Check results
    print("\n4. Checking results...")
    topic_count = Topic.objects.count()
    question_count = Question.objects.count()
    weekly_set_count = WeeklyQuestionSet.objects.count()

    print(f"Topics: {topic_count}")
    print(f"Questions: {question_count}")
    print(f"Weekly question sets: {weekly_set_count}")

    if weekly_set_count > 0:
        latest_set = WeeklyQuestionSet.objects.latest('week_start')
        print(f"Latest weekly set: {latest_set.title} (Week: {latest_set.week_start})")
        print(f"Questions in set: {latest_set.get_total_questions()}")

    print("\nFix completed successfully!")

if __name__ == '__main__':
    main()
