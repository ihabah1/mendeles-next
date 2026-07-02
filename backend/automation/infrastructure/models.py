from django.conf import settings
from django.db import models

from automation.domain.enums import (
    JobPriority,
    JobStatus,
    JobType,
    LogLevel,
    NotificationChannel,
    NotificationType,
    ScheduleType,
    StepStatus,
    WorkerStatus,
)
from core.models import BaseModel


class AutomationQueue(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="automation_queues")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80)
    is_default = models.BooleanField(default=False)
    is_paused = models.BooleanField(default=False)

    class Meta:
        db_table = "automation_queues"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_automation_queue_slug"),
        ]
        indexes = [
            models.Index(fields=["tenant", "is_default"]),
        ]

    def __str__(self) -> str:
        return self.name


class AutomationWorkflow(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="automation_workflows")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100)
    version = models.PositiveIntegerField(default=1)
    definition = models.JSONField(default=list, help_text="Ordered steps with dependencies")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "automation_workflows"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug", "version"], name="uniq_automation_workflow_version"),
        ]

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class AutomationTemplate(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="automation_templates")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100)
    job_type = models.CharField(max_length=64, choices=JobType.choices)
    default_config = models.JSONField(default=dict)
    steps_schema = models.JSONField(default=list)
    requires_approval = models.BooleanField(default=True)

    class Meta:
        db_table = "automation_templates"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="uniq_automation_template_slug"),
        ]

    def __str__(self) -> str:
        return self.name


class AutomationJob(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="automation_jobs")
    queue = models.ForeignKey(
        AutomationQueue,
        on_delete=models.PROTECT,
        related_name="jobs",
    )
    workflow = models.ForeignKey(
        AutomationWorkflow,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )
    template = models.ForeignKey(
        AutomationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )
    name = models.CharField(max_length=300)
    job_type = models.CharField(max_length=64, choices=JobType.choices, db_index=True)
    status = models.CharField(max_length=32, choices=JobStatus.choices, default=JobStatus.QUEUED, db_index=True)
    priority = models.CharField(max_length=16, choices=JobPriority.choices, default=JobPriority.NORMAL, db_index=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    current_step_index = models.PositiveIntegerField(default=0)
    config = models.JSONField(default=dict)
    requires_approval = models.BooleanField(default=False)
    auto_publish_enabled = models.BooleanField(default=False)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    error_message = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="automation_jobs_created",
    )
    parent_job = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_jobs",
    )

    class Meta:
        db_table = "automation_jobs"
        indexes = [
            models.Index(fields=["tenant", "status", "priority", "created_at"]),
            models.Index(fields=["tenant", "job_type"]),
            models.Index(fields=["queue", "status"]),
        ]

    def __str__(self) -> str:
        return self.name


class AutomationJobStep(BaseModel):
    job = models.ForeignKey(AutomationJob, on_delete=models.CASCADE, related_name="steps")
    step_order = models.PositiveIntegerField()
    name = models.CharField(max_length=200)
    step_type = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=32, choices=StepStatus.choices, default=StepStatus.PENDING)
    requires_approval = models.BooleanField(default=False)
    config = models.JSONField(default=dict)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        db_table = "automation_job_steps"
        ordering = ["step_order"]
        constraints = [
            models.UniqueConstraint(fields=["job", "step_order"], name="uniq_automation_job_step_order"),
        ]

    def __str__(self) -> str:
        return f"{self.job_id}:{self.step_order} {self.name}"


class AutomationSchedule(BaseModel):
    job = models.OneToOneField(AutomationJob, on_delete=models.CASCADE, related_name="schedule")
    schedule_type = models.CharField(max_length=32, choices=ScheduleType.choices, default=ScheduleType.NOW)
    timezone = models.CharField(max_length=64, default="UTC")
    cron_expression = models.CharField(max_length=120, blank=True, default="")
    interval_value = models.PositiveIntegerField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "automation_schedules"
        indexes = [
            models.Index(fields=["is_active", "next_run_at"]),
        ]


class AutomationExecution(BaseModel):
    job = models.ForeignKey(AutomationJob, on_delete=models.CASCADE, related_name="executions")
    execution_number = models.PositiveIntegerField()
    status = models.CharField(max_length=32, choices=JobStatus.choices)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    result = models.JSONField(default=dict)
    error_message = models.TextField(blank=True, default="")
    worker = models.ForeignKey(
        "AutomationWorker",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="executions",
    )

    class Meta:
        db_table = "automation_executions"
        constraints = [
            models.UniqueConstraint(fields=["job", "execution_number"], name="uniq_automation_execution_number"),
        ]
        indexes = [
            models.Index(fields=["job", "created_at"]),
        ]


class AutomationLog(BaseModel):
    job = models.ForeignKey(AutomationJob, on_delete=models.CASCADE, related_name="logs")
    execution = models.ForeignKey(
        AutomationExecution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs",
    )
    level = models.CharField(max_length=16, choices=LogLevel.choices, default=LogLevel.INFO)
    message = models.TextField()
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "automation_logs"
        indexes = [
            models.Index(fields=["job", "created_at"]),
        ]
        ordering = ["created_at"]


class AutomationWorker(BaseModel):
    worker_id = models.CharField(max_length=120, unique=True)
    hostname = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=WorkerStatus.choices, default=WorkerStatus.IDLE)
    current_job = models.ForeignKey(
        AutomationJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_workers",
    )
    cpu_time_ms = models.PositiveIntegerField(default=0)
    memory_mb = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True, db_index=True)
    last_activity = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "automation_workers"
        indexes = [
            models.Index(fields=["status", "last_heartbeat"]),
        ]

    def __str__(self) -> str:
        return self.worker_id


class AutomationNotification(BaseModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="automation_notifications")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="automation_notifications",
    )
    job = models.ForeignKey(
        AutomationJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    channel = models.CharField(max_length=16, choices=NotificationChannel.choices, default=NotificationChannel.IN_APP)
    notification_type = models.CharField(max_length=32, choices=NotificationType.choices)
    title = models.CharField(max_length=300)
    body = models.TextField(blank=True, default="")
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "automation_notifications"
        indexes = [
            models.Index(fields=["tenant", "user", "read_at"]),
            models.Index(fields=["user", "created_at"]),
        ]
