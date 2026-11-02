from .base import *  # noqa

DEBUG = True
CELERY_TASK_ALWAYS_EAGER = True  # run tasks synchronously in tests/dev
CELERY_TASK_EAGER_PROPAGATES = True

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "login": "1000/minute",
    "password_reset": "1000/hour",
}
