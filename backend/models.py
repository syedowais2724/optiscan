from datetime import datetime

from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    operational_records = relationship(
        "OperationalRecord",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class OperationalRecord(Base):
    __tablename__ = "operational_records"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    date = Column(Date, nullable=True)
    shift = Column(String, nullable=True)
    employee_number = Column(String, nullable=True)
    operation_code = Column(String, nullable=True)
    machine_number = Column(String, nullable=True)
    work_order_number = Column(String, nullable=True)
    quantity_produced = Column(Integer, nullable=True)
    time_taken = Column(Float, nullable=True)
    raw_extracted_json = Column(Text, nullable=True)
    confidence_scores = Column(JSON, nullable=True)
    validation_issues = Column(JSON, nullable=True)
    overall_confidence = Column(Float, nullable=True)
    review_status = Column(String, nullable=False, default="pending")
    reviewed_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="operational_records")
