"""Serializers for Reports."""

from rest_framework import serializers

from apps.reports.models import ReportFormat, ReportJob, ReportStatus


class ReportTypeSerializer(serializers.Serializer):
    type = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    formats = serializers.ListField(child=serializers.CharField())
    filters_schema = serializers.DictField()


class ReportJobSerializer(serializers.ModelSerializer):
    requested_by_email = serializers.EmailField(source="requested_by.email", read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportJob
        fields = [
            "id",
            "report_type",
            "filters",
            "format",
            "status",
            "progress_pct",
            "error",
            "requested_by_email",
            "download_url",
            "started_at",
            "finished_at",
            "created_at",
        ]

    def get_download_url(self, obj: ReportJob) -> str | None:
        if obj.status == ReportStatus.SUCCEEDED and obj.file:
            return obj.file.url
        return None


class ReportJobCreateSerializer(serializers.ModelSerializer):
    format = serializers.ChoiceField(choices=ReportFormat.choices, default=ReportFormat.CSV)

    class Meta:
        model = ReportJob
        fields = ["report_type", "filters", "format"]
