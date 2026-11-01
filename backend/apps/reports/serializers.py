from rest_framework import serializers

from .models import ImportJob, ReportJob


class ReportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportJob
        fields = "__all__"


class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportJob
        fields = "__all__"
