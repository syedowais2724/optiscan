import json
import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

import models
import schemas
from database import get_db
from services.ai_extractor import extract_document
from services.validator import validate_record

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
PDF_EXTENSIONS = {".pdf"}


def _detect_file_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in PDF_EXTENSIONS:
        return "pdf"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported file type. Upload an image or PDF.",
    )


def _parse_record_date(value):
    if not value:
        return None
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def _average_confidence(confidence_scores) -> float | None:
    if not isinstance(confidence_scores, dict):
        return None

    values = []
    for value in confidence_scores.values():
        try:
            values.append(float(value))
        except (TypeError, ValueError):
            continue

    if not values:
        return None
    return sum(values) / len(values)


def _existing_work_orders(db: Session) -> list[str]:
    return [
        work_order
        for (work_order,) in db.query(models.OperationalRecord.work_order_number).all()
        if work_order
    ]


@router.post("/upload", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_type = _detect_file_type(file.filename or "")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename or "upload"
    stored_filename = f"{uuid4().hex}{Path(original_filename).suffix.lower()}"
    file_path = UPLOAD_DIR / stored_filename

    with file_path.open("wb") as destination:
        shutil.copyfileobj(file.file, destination)

    document = models.Document(
        filename=stored_filename,
        original_filename=original_filename,
        file_type=file_type,
        file_path=str(file_path),
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/{document_id}/extract", response_model=schemas.OperationalRecord)
async def extract_document_record(document_id: int, db: Session = Depends(get_db)):
    document = db.get(models.Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = "processing"
    db.commit()
    db.refresh(document)

    try:
        extracted_data = await extract_document(document.file_path, document.file_type)
        validation_issues = validate_record(extracted_data, _existing_work_orders(db))

        record = models.OperationalRecord(
            document_id=document.id,
            date=_parse_record_date(extracted_data.get("date")),
            shift=extracted_data.get("shift"),
            employee_number=extracted_data.get("employee_number"),
            operation_code=extracted_data.get("operation_code"),
            machine_number=extracted_data.get("machine_number"),
            work_order_number=extracted_data.get("work_order_number"),
            quantity_produced=extracted_data.get("quantity_produced"),
            time_taken=extracted_data.get("time_taken"),
            raw_extracted_json=json.dumps(extracted_data),
            confidence_scores=extracted_data.get("confidence_scores"),
            validation_issues=validation_issues,
            overall_confidence=_average_confidence(extracted_data.get("confidence_scores")),
            review_status="pending",
        )
        db.add(record)
        document.status = "extracted"
        db.commit()
        db.refresh(record)
        return record
    except Exception as exc:
        db.rollback()
        document = db.get(models.Document, document_id)
        if document is not None:
            document.status = "failed"
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document extraction failed: {exc}",
        ) from exc


@router.get("/", response_model=list[schemas.Document])
def list_documents(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(models.Document)
        .options(selectinload(models.Document.operational_records))
        .order_by(models.Document.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{document_id}", response_model=schemas.Document)
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = (
        db.query(models.Document)
        .options(selectinload(models.Document.operational_records))
        .filter(models.Document.id == document_id)
        .first()
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document
