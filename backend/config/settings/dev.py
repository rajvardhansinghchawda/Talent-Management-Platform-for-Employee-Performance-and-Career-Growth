from .base import *  # noqa

DEBUG = True
CELERY_TASK_ALWAYS_EAGER = True  # run tasks synchronously in tests/dev
CELERY_TASK_EAGER_PROPAGATES = True
