from datetime import date as Date
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services.validator import validate_record

router = APIRouter(prefix="/api/records", tags=["records"])


def _record_to_validation_data(record: models.OperationalRecord) -> dict:
    return {
        "date": record.date.isoformat() if record.date else None,
        "shift": record.shift,
        "employee_number": record.employee_number,
        "operation_code": record.operation_code,
        "machine_number": record.machine_number,
        "work_order_number": record.work_order_number,
        "quantity_produced": record.quantity_produced,
        "time_taken": record.time_taken,
        "confidence_scores": record.confidence_scores,
    }


def _existing_work_orders(db: Session, exclude_record_id: int | None = None) -> list[str]:
    query = db.query(models.OperationalRecord.work_order_number).filter(
        models.OperationalRecord.work_order_number.isnot(None)
    )
    if exclude_record_id is not None:
        query = query.filter(models.OperationalRecord.id != exclude_record_id)
    return [work_order for (work_order,) in query.all()]


@router.get("/search", response_model=list[schemas.OperationalRecord])
def search_records(
    date: Date | None = None,
    shift: str | None = None,
    machine_number: str | None = None,
    work_order_number: str | None = None,
    review_status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.OperationalRecord)

    if date is not None:
        query = query.filter(models.OperationalRecord.date == date)
    if shift is not None:
        query = query.filter(models.OperationalRecord.shift == shift)
    if machine_number is not None:
        query = query.filter(models.OperationalRecord.machine_number == machine_number)
    if work_order_number is not None:
        query = query.filter(models.OperationalRecord.work_order_number == work_order_number)
    if review_status is not None:
        query = query.filter(models.OperationalRecord.review_status == review_status)

    return query.order_by(models.OperationalRecord.id.desc()).all()


@router.put("/{record_id}", response_model=schemas.OperationalRecord)
def update_record(
    record_id: int,
    record_update: schemas.OperationalRecordUpdate,
    db: Session = Depends(get_db),
):
    record = db.get(models.OperationalRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    update_data = record_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    record.validation_issues = validate_record(
        _record_to_validation_data(record),
        _existing_work_orders(db, exclude_record_id=record.id),
    )

    db.commit()
    db.refresh(record)
    return record


@router.post("/{record_id}/approve", response_model=schemas.OperationalRecord)
def approve_record(record_id: int, db: Session = Depends(get_db)):
    record = db.get(models.OperationalRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    record.review_status = "approved"
    record.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


@router.post("/{record_id}/flag", response_model=schemas.OperationalRecord)
def flag_record(record_id: int, db: Session = Depends(get_db)):
    record = db.get(models.OperationalRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    record.review_status = "flagged"
    db.commit()
    db.refresh(record)
    return record
