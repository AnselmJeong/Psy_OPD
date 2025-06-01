"""
Miscellaneous helper functions
"""

import re
from datetime import datetime, timezone
from typing import Optional, Union, Dict, Any
import hashlib
import secrets


def format_datetime_iso(dt: datetime) -> str:
    """
    Format datetime to ISO 8601 string

    Args:
        dt: Datetime object

    Returns:
        str: ISO formatted datetime string
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def parse_iso_datetime(iso_string: str) -> Optional[datetime]:
    """
    Parse ISO 8601 datetime string

    Args:
        iso_string: ISO formatted datetime string

    Returns:
        Optional[datetime]: Parsed datetime object or None if invalid
    """
    try:
        return datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def validate_email(email: str) -> bool:
    """
    Validate email address format

    Args:
        email: Email address to validate

    Returns:
        bool: True if valid email format
    """
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_medical_record_number(mrn: str) -> bool:
    """
    Validate medical record number format

    Args:
        mrn: Medical record number to validate

    Returns:
        bool: True if valid format
    """
    # Simple validation - alphanumeric, 6-20 characters
    if not mrn or len(mrn) < 6 or len(mrn) > 20:
        return False
    return mrn.isalnum()


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a secure random token

    Args:
        length: Length of the token

    Returns:
        str: Secure random token
    """
    return secrets.token_urlsafe(length)


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash password with salt (for additional security if needed)

    Args:
        password: Password to hash
        salt: Optional salt, generates new one if not provided

    Returns:
        tuple: (hashed_password, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)

    combined = f"{password}{salt}"
    hashed = hashlib.sha256(combined.encode()).hexdigest()

    return hashed, salt


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe file operations

    Args:
        filename: Original filename

    Returns:
        str: Sanitized filename
    """
    # Remove or replace unsafe characters
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)
    # Remove leading/trailing spaces and dots
    filename = filename.strip(" .")
    # Limit length
    if len(filename) > 255:
        filename = filename[:255]

    return filename or "unnamed_file"


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data for logging/display

    Args:
        data: Sensitive data to mask
        visible_chars: Number of characters to keep visible

    Returns:
        str: Masked data
    """
    if not data or len(data) <= visible_chars:
        return "*" * len(data) if data else ""

    return data[:visible_chars] + "*" * (len(data) - visible_chars)


def calculate_age_from_birthdate(birthdate: Union[str, datetime]) -> Optional[int]:
    """
    Calculate age from birthdate

    Args:
        birthdate: Birthdate as string (YYYY-MM-DD) or datetime

    Returns:
        Optional[int]: Age in years or None if invalid
    """
    try:
        if isinstance(birthdate, str):
            birth_dt = datetime.strptime(birthdate, "%Y-%m-%d")
        else:
            birth_dt = birthdate

        today = datetime.now()
        age = today.year - birth_dt.year

        # Adjust if birthday hasn't occurred this year
        if today.month < birth_dt.month or (
            today.month == birth_dt.month and today.day < birth_dt.day
        ):
            age -= 1

        return age if age >= 0 else None

    except (ValueError, AttributeError):
        return None


def format_survey_score(score: float, survey_type: str) -> str:
    """
    Format survey score for display

    Args:
        score: Raw score
        survey_type: Type of survey

    Returns:
        str: Formatted score string
    """
    score_ranges = {
        "AUDIT": 40,
        "PSQI": 21,
        "BDI": 63,
        "BAI": 63,
        "K-MDQ": 16,  # Simplified range
    }

    max_score = score_ranges.get(survey_type, 100)
    percentage = (score / max_score) * 100 if max_score > 0 else 0

    return f"{score:.1f}/{max_score} ({percentage:.1f}%)"


def clean_text_for_csv(text: str) -> str:
    """
    Clean text for safe CSV export

    Args:
        text: Text to clean

    Returns:
        str: Cleaned text
    """
    if not text:
        return ""

    # Replace newlines with spaces
    text = text.replace("\n", " ").replace("\r", " ")
    # Replace commas with semicolons to avoid CSV issues
    text = text.replace(",", ";")
    # Remove excessive whitespace
    text = " ".join(text.split())

    return text


def validate_date_range(start_date: str, end_date: str) -> bool:
    """
    Validate that date range is logical

    Args:
        start_date: Start date (ISO format)
        end_date: End date (ISO format)

    Returns:
        bool: True if valid date range
    """
    try:
        start_dt = parse_iso_datetime(start_date)
        end_dt = parse_iso_datetime(end_date)

        if not start_dt or not end_dt:
            return False

        return start_dt <= end_dt

    except Exception:
        return False


def get_current_timestamp() -> str:
    """
    Get current timestamp in ISO format

    Returns:
        str: Current timestamp
    """
    return format_datetime_iso(datetime.now(timezone.utc))


def extract_error_message(exception: Exception) -> str:
    """
    Extract user-friendly error message from exception

    Args:
        exception: Exception object

    Returns:
        str: User-friendly error message
    """
    error_msg = str(exception)

    # Map common error patterns to user-friendly messages
    error_mappings = {
        "permission denied": "You do not have permission to perform this action",
        "not found": "The requested resource was not found",
        "invalid token": "Your session has expired. Please log in again",
        "connection error": "Unable to connect to the service. Please try again later",
        "timeout": "The request timed out. Please try again",
    }

    error_lower = error_msg.lower()
    for pattern, friendly_msg in error_mappings.items():
        if pattern in error_lower:
            return friendly_msg

    # Return generic message for unknown errors
    return "An unexpected error occurred. Please try again or contact support"


def paginate_results(items: list, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    """
    Paginate a list of items

    Args:
        items: List of items to paginate
        page: Page number (1-based)
        page_size: Number of items per page

    Returns:
        Dict: Paginated results with metadata
    """
    total_items = len(items)
    total_pages = (total_items + page_size - 1) // page_size

    # Ensure page is within valid range
    page = max(1, min(page, total_pages if total_pages > 0 else 1))

    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    paginated_items = items[start_idx:end_idx]

    return {
        "items": paginated_items,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
    }
