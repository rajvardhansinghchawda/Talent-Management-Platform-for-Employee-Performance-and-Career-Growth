from .models import ReportJob


def get_report_job(job_id) -> ReportJob | None:
    try:
        return ReportJob.objects.get(id=job_id)
    except ReportJob.DoesNotExist:
        return None
