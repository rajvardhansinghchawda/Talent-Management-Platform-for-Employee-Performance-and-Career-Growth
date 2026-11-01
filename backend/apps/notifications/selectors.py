from .models import Notification


def get_unread_count_for_user(user_id) -> int:
    return Notification.objects.filter(recipient_id=user_id, is_read=False).count()
