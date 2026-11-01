from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Standard pagination: page-number based, default 20 per page, max 100."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
