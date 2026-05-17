from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _has_error_issue(record: models.OperationalRecord) -> bool:
    issues = record.validation_issues
    if not isinstance(issues, list):
        return False
    return any(isinstance(issue, dict) and issue.get("severity") == "error" for issue in issues)


def _confidence_bucket(confidence: float | None) -> str:
    if confidence is None:
        return "low"
    if confidence >= 0.9:
        return "high"
    if confidence >= 0.6:
        return "medium"
    return "low"


@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    today = date.today()
    records = db.query(models.OperationalRecord).all()

    shift_rows = (
        db.query(
            models.OperationalRecord.shift,
            func.count(models.OperationalRecord.id),
            func.coalesce(func.sum(models.OperationalRecord.quantity_produced), 0),
        )
        .group_by(models.OperationalRecord.shift)
        .all()
    )

    machine_rows = (
        db.query(
            models.OperationalRecord.machine_number,
            func.count(models.OperationalRecord.id),
            func.coalesce(func.sum(models.OperationalRecord.quantity_produced), 0),
            func.avg(models.OperationalRecord.time_taken),
        )
        .group_by(models.OperationalRecord.machine_number)
        .all()
    )

    confidence_distribution = {"high": 0, "medium": 0, "low": 0}
    for record in records:
        confidence_distribution[_confidence_bucket(record.overall_confidence)] += 1

    return {
        "total_documents": db.query(models.Document).count(),
        "total_records": len(records),
        "pending_review": db.query(models.OperationalRecord)
        .filter(models.OperationalRecord.review_status == "pending")
        .count(),
        "validation_failures": sum(1 for record in records if _has_error_issue(record)),
        "approved_today": db.query(models.OperationalRecord)
        .filter(
            models.OperationalRecord.review_status == "approved",
            func.date(models.OperationalRecord.reviewed_at) == today.isoformat(),
        )
        .count(),
        "shift_summary": [
            {
                "shift": shift,
                "count": count,
                "total_quantity": total_quantity,
            }
            for shift, count, total_quantity in shift_rows
        ],
        "machine_summary": [
            {
                "machine_number": machine_number,
                "records": record_count,
                "total_quantity": total_quantity,
                "avg_time": avg_time,
            }
            for machine_number, record_count, total_quantity, avg_time in machine_rows
        ],
        "confidence_distribution": confidence_distribution,
    }
