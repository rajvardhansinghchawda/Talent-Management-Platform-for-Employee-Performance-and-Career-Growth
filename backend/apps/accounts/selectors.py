from .models import User


def get_user_by_id(user_id) -> User | None:
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


def get_user_by_email(email: str) -> User | None:
    try:
        return User.objects.get(email=email.lower())
    except User.DoesNotExist:
        return None
