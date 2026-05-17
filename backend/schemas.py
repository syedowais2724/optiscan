from datetime import date as Date
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

DocumentFileType = Literal["image", "pdf"]
DocumentStatus = Literal["pending", "processing", "extracted", "reviewed", "failed"]
ReviewStatus = Literal["pending", "approved", "flagged"]


class OperationalRecordBase(BaseModel):
    document_id: int
    date: Date | None = None
    shift: str | None = None
    employee_number: str | None = None
    operation_code: str | None = None
    machine_number: str | None = None
    work_order_number: str | None = None
    quantity_produced: int | None = None
    time_taken: float | None = None
    raw_extracted_json: str | None = None
    confidence_scores: dict[str, Any] | list[Any] | None = None
    validation_issues: dict[str, Any] | list[Any] | None = None
    overall_confidence: float | None = None
    review_status: ReviewStatus = "pending"
    reviewed_at: datetime | None = None


class OperationalRecordCreate(OperationalRecordBase):
    pass


class OperationalRecordUpdate(BaseModel):
    date: Date | None = None
    shift: str | None = None
    employee_number: str | None = None
    operation_code: str | None = None
    machine_number: str | None = None
    work_order_number: str | None = None
    quantity_produced: int | None = None
    time_taken: float | None = None
    raw_extracted_json: str | None = None
    confidence_scores: dict[str, Any] | list[Any] | None = None
    validation_issues: dict[str, Any] | list[Any] | None = None
    overall_confidence: float | None = None
    review_status: ReviewStatus | None = None
    reviewed_at: datetime | None = None


class OperationalRecord(OperationalRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_type: DocumentFileType
    file_path: str
    status: DocumentStatus = "pending"


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    filename: str | None = None
    original_filename: str | None = None
    file_type: DocumentFileType | None = None
    file_path: str | None = None
    status: DocumentStatus | None = None


class Document(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uploaded_at: datetime
    operational_records: list[OperationalRecord] = Field(default_factory=list)
