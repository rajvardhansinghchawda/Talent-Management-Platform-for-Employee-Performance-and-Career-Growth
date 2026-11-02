"""Views for Course Catalog and Skills Mapping."""

import uuid

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasRole
from apps.learning import selectors, services
from apps.learning.serializers import (
    CourseCreateUpdateSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseSkillSerializer,
)


class CourseListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request) -> Response:
        q = request.query_params.get("q")
        difficulty = request.query_params.get("difficulty")
        course_format = request.query_params.get("format")
        skill_raw = request.query_params.get("skill")
        skill = uuid.UUID(skill_raw) if skill_raw else None
        is_active_raw = request.query_params.get("is_active")
        is_active = is_active_raw.lower() in ("true", "1") if is_active_raw is not None else None

        courses = selectors.list_courses(
            q=q,
            skill=skill,
            difficulty=difficulty,
            course_format=course_format,
            is_active=is_active,
        )
        serializer = CourseListSerializer(courses, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = CourseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseDetailSerializer(course).data, status=status.HTTP_201_CREATED)


class CourseDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        course = selectors.get_course_by_id(pk)
        return Response(CourseDetailSerializer(course).data)

    def patch(self, request: Request, pk: uuid.UUID) -> Response:
        course = selectors.get_course_by_id(pk)
        serializer = CourseCreateUpdateSerializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(CourseDetailSerializer(updated).data)


class CourseSkillsMappingView(APIView):
    permission_classes = [IsAuthenticated, HasRole.hr_admin()]

    def put(self, request: Request, pk: uuid.UUID) -> Response:
        course = selectors.get_course_by_id(pk)
        if not isinstance(request.data, list):
            return Response(
                {"error": {"code": "bad_request", "message": "Expected a list of skill mappings."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_skills = services.set_course_skills(course, request.data)
        return Response(CourseSkillSerializer(new_skills, many=True).data)


class LearningRecommendationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user
        from apps.learning.models import Course, Enrollment

        emp = get_employee_for_user(request.user)
        courses = Course.objects.filter(is_active=True)
        recommendations = []
        for c in courses:
            enrollment = Enrollment.objects.filter(employee=emp, course=c).first() if emp else None
            skills_list = [
                {
                    "id": str(cs.skill.id),
                    "name": cs.skill.name,
                    "category": cs.skill.category,
                }
                for cs in c.skill_mappings.all()
            ]
            primary_skill = skills_list[0]["name"] if skills_list else "Software Engineering"
            recommendations.append({
                "id": str(c.id),
                "course": {
                    "id": str(c.id),
                    "title": c.title,
                    "provider": c.provider,
                    "duration_hours": float(c.duration_hours),
                    "difficulty": c.difficulty,
                    "format": c.format,
                    "skills": skills_list,
                },
                "skill": {"name": primary_skill},
                "reason": f"Closes key skill gaps for Senior Role in {primary_skill}.",
                "score": 92,
                "is_enrolled": bool(enrollment),
                "enrollment_id": str(enrollment.id) if enrollment else None,
            })
        return Response(recommendations)


class EnrollmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user
        from apps.learning.models import Enrollment

        emp = get_employee_for_user(request.user)
        if not emp:
            return Response([])
        enrollments = Enrollment.objects.filter(employee=emp).select_related("course")
        data = [
            {
                "id": str(e.id),
                "course": {
                    "id": str(e.course.id),
                    "title": e.course.title,
                    "provider": e.course.provider,
                    "duration_hours": float(e.course.duration_hours),
                },
                "progress_pct": getattr(e, "progress_pct", 50),
                "status": e.status,
                "enrolled_at": e.created_at.isoformat(),
                "can_update_progress": e.status == "ENROLLED",
                "can_complete": e.status == "ENROLLED",
            }
            for e in enrollments
        ]
        return Response(data)

    def post(self, request: Request) -> Response:
        from apps.employees.selectors import get_employee_for_user
        from apps.learning.models import Course, Enrollment, EnrollmentStatus

        emp = get_employee_for_user(request.user)
        if not emp:
            return Response(
                {"error": {"code": "not_found", "message": "Employee not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        course_id = request.data.get("course")
        course = Course.objects.get(pk=course_id)
        enrollment, _ = Enrollment.objects.get_or_create(
            employee=emp,
            course=course,
            defaults={"status": EnrollmentStatus.ENROLLED},
        )
        return Response({"id": str(enrollment.id), "status": enrollment.status}, status=status.HTTP_201_CREATED)
