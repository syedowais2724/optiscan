from datetime import datetime
import re
from typing import Any

Issue = dict[str, str]

MANDATORY_FIELDS = {
    "date",
    "shift",
    "employee_number",
    "machine_number",
    "work_order_number",
    "quantity_produced",
}

VALID_SHIFTS = {"A", "B", "C"}
MACHINE_NUMBER_PATTERN = re.compile(r"^[A-Za-z]+-\d+$")
WORK_ORDER_PATTERN = re.compile(r"^WO-\d{6}$")


def _issue(field: str, rule: str, message: str, severity: str) -> Issue:
    return {
        "field": field,
        "rule": rule,
        "message": message,
        "severity": severity,
    }


def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _is_valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False

    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False

    return True


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def validate_record(data: dict, existing_work_orders: list[str]) -> list[dict]:
    issues: list[dict] = []

    for field in sorted(MANDATORY_FIELDS):
        if _is_missing(data.get(field)):
            issues.append(
                _issue(
                    field=field,
                    rule="mandatory",
                    message=f"{field} is required",
                    severity="error",
                )
            )

    shift = data.get("shift")
    if not _is_missing(shift) and str(shift).upper() not in VALID_SHIFTS:
        issues.append(
            _issue(
                field="shift",
                rule="valid_shift",
                message="Shift must be A, B, or C",
                severity="error",
            )
        )

    machine_number = data.get("machine_number")
    if not _is_missing(machine_number) and not MACHINE_NUMBER_PATTERN.match(str(machine_number)):
        issues.append(
            _issue(
                field="machine_number",
                rule="machine_number_format",
                message="Machine number should match letters-digits format, e.g. MC-001",
                severity="warning",
            )
        )

    work_order_number = data.get("work_order_number")
    if not _is_missing(work_order_number):
        work_order_number_str = str(work_order_number)
        if not WORK_ORDER_PATTERN.match(work_order_number_str):
            issues.append(
                _issue(
                    field="work_order_number",
                    rule="work_order_format",
                    message="Work order number should match WO-XXXXXX format",
                    severity="warning",
                )
            )

        if work_order_number_str in existing_work_orders:
            issues.append(
                _issue(
                    field="work_order_number",
                    rule="duplicate_work_order",
                    message="Work order number already exists",
                    severity="error",
                )
            )

    quantity_produced = data.get("quantity_produced")
    if not _is_missing(quantity_produced):
        quantity_value = _as_number(quantity_produced)
        if quantity_value is None or quantity_value <= 0:
            issues.append(
                _issue(
                    field="quantity_produced",
                    rule="quantity_range",
                    message="Quantity produced must be greater than 0",
                    severity="error",
                )
            )
        elif quantity_value > 10000:
            issues.append(
                _issue(
                    field="quantity_produced",
                    rule="quantity_range",
                    message="Quantity produced is unusually high",
                    severity="warning",
                )
            )

    time_taken = data.get("time_taken")
    if not _is_missing(time_taken):
        time_value = _as_number(time_taken)
        if time_value is None or time_value < 0 or time_value > 24:
            issues.append(
                _issue(
                    field="time_taken",
                    rule="time_taken_range",
                    message="Time taken should be between 0 and 24 hours",
                    severity="warning",
                )
            )

    date = data.get("date")
    if not _is_missing(date) and not _is_valid_date(date):
        issues.append(
            _issue(
                field="date",
                rule="date_format",
                message="Date must be a valid YYYY-MM-DD value",
                severity="error",
            )
        )

    confidence_scores = data.get("confidence_scores")
    if isinstance(confidence_scores, dict):
        for field, confidence in confidence_scores.items():
            confidence_value = _as_number(confidence)
            if confidence_value is not None and confidence_value < 0.6:
                issues.append(
                    _issue(
                        field=str(field),
                        rule="low_confidence",
                        message="Low OCR confidence, please verify",
                        severity="warning",
                    )
                )

    return issues
