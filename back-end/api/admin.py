from django.contrib import admin
from .models import Question, UserAnswer


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['vietnamese_text', 'english_text', 'difficulty', 'created_at']
    list_filter = ['difficulty', 'created_at']
    search_fields = ['vietnamese_text', 'english_text']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Nội dung câu hỏi', {
            'fields': ('vietnamese_text', 'english_text')
        }),
        ('Thông tin', {
            'fields': ('difficulty', 'created_at')
        }),
    )


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ['question', 'user_answer', 'is_correct', 'similarity_score', 'created_at']
    list_filter = ['is_correct', 'created_at']
    search_fields = ['user_answer', 'question__vietnamese_text', 'question__english_text']
    readonly_fields = ['created_at', 'similarity_score']
    ordering = ['-created_at']

    fieldsets = (
        ('Câu hỏi', {
            'fields': ('question',)
        }),
        ('Câu trả lời', {
            'fields': ('user_answer', 'is_correct', 'similarity_score')
        }),
        ('Thông tin', {
            'fields': ('created_at',)
        }),
    )
