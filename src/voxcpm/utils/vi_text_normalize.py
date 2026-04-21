# Vietnamese Text Normalizer for TTS
# Converts numbers, dates, currency, percentages, units, etc. to Vietnamese words.
# Pure Python implementation — no external dependencies required.

import re

# ============================================================
# Vietnamese digit / number words
# ============================================================
_DIGITS = {
    "0": "không", "1": "một", "2": "hai", "3": "ba", "4": "bốn",
    "5": "năm", "6": "sáu", "7": "bảy", "8": "tám", "9": "chín",
}

_TEEN_ONES = {
    "0": "mươi", "1": "mốt", "2": "hai", "3": "ba", "4": "bốn",
    "5": "lăm", "6": "sáu", "7": "bảy", "8": "tám", "9": "chín",
}

_LARGE_UNITS = [
    (10**18, "tỷ tỷ"),
    (10**15, "triệu tỷ"),
    (10**12, "nghìn tỷ"),
    (10**9, "tỷ"),
    (10**6, "triệu"),
    (10**3, "nghìn"),
]


def _read_two_digits(tens: str, ones: str) -> str:
    """Read a two-digit number (tens + ones)."""
    t, o = int(tens), int(ones)
    if t == 0 and o == 0:
        return ""
    if t == 0:
        return f"lẻ {_DIGITS[ones]}"
    if t == 1:
        result = "mười"
        if o == 0:
            return result
        if o == 5:
            return result + " lăm"
        return result + " " + _DIGITS[ones]
    # t >= 2
    result = _DIGITS[tens] + " mươi"
    if o == 0:
        return result
    if o == 1:
        return result + " mốt"
    if o == 5:
        return result + " lăm"
    if o == 4:
        return result + " tư"
    return result + " " + _DIGITS[ones]


def _read_three_digits(s: str) -> str:
    """Read a group of up to 3 digits. s is zero-padded to length 3."""
    s = s.zfill(3)
    h, t, o = s[0], s[1], s[2]
    parts = []
    hi, ti, oi = int(h), int(t), int(o)

    if hi == 0 and ti == 0 and oi == 0:
        return ""

    parts.append(_DIGITS[h] + " trăm")

    if ti == 0 and oi == 0:
        return " ".join(parts)

    two = _read_two_digits(t, o)
    parts.append(two)

    return " ".join(parts)


def number_to_vietnamese(n: int) -> str:
    """Convert an integer to Vietnamese words."""
    if n < 0:
        return "âm " + number_to_vietnamese(-n)
    if n == 0:
        return "không"

    parts = []

    for unit_val, unit_name in _LARGE_UNITS:
        if n >= unit_val:
            group = n // unit_val
            n = n % unit_val
            group_text = _read_number_below_thousand(group)
            parts.append(group_text + " " + unit_name)

    # Remaining < 1000
    if n > 0:
        parts.append(_read_number_below_thousand(n))

    return " ".join(parts)


def _read_number_below_thousand(n: int) -> str:
    """Read a number from 0..999."""
    if n == 0:
        return "không"
    s = str(n)
    if len(s) == 1:
        return _DIGITS[s]
    if len(s) == 2:
        return _read_two_digits(s[0], s[1])
    return _read_three_digits(s)


def _decimal_to_vietnamese(integer_part: str, decimal_part: str) -> str:
    """Convert a decimal number string to Vietnamese words."""
    int_val = int(integer_part) if integer_part else 0
    int_text = number_to_vietnamese(int_val)

    # Read decimal digits one by one
    dec_digits = " ".join(_DIGITS[d] for d in decimal_part)

    return f"{int_text} phẩy {dec_digits}"


# ============================================================
# Vietnamese character detection
# ============================================================
_VIETNAMESE_CHARS = re.compile(
    r"[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ"
    r"ÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]"
)


def contains_vietnamese(text: str) -> bool:
    """Detect if text contains Vietnamese-specific characters."""
    return bool(_VIETNAMESE_CHARS.search(text))


# ============================================================
# Unit / symbol mappings
# ============================================================
_UNITS = {
    "km/h": "ki lô mét trên giờ",
    "m/s": "mét trên giây",
    "km²": "ki lô mét vuông",
    "km2": "ki lô mét vuông",
    "m²": "mét vuông",
    "m2": "mét vuông",
    "m³": "mét khối",
    "m3": "mét khối",
    "cm²": "xen ti mét vuông",
    "cm2": "xen ti mét vuông",
    "cm³": "xen ti mét khối",
    "cm3": "xen ti mét khối",
    "km": "ki lô mét",
    "cm": "xen ti mét",
    "mm": "mi li mét",
    "m": "mét",
    "mg": "mi li gam",
    "kg": "ki lô gam",
    "ml": "mi li lít",
    "kw": "ki lô oát",
    "kwh": "ki lô oát giờ",
    "hz": "héc",
    "mhz": "mê ga héc",
    "ghz": "gi ga héc",
    "gb": "gi ga bai",
    "mb": "mê ga bai",
    "kb": "ki lô bai",
    "tb": "tê ra bai",
    "°c": "độ xê",
    "°f": "độ ép",
    "℃": "độ xê",
    "%": "phần trăm",
}

_CURRENCY = {
    "đ": "đồng",
    "vnd": "đồng",
    "vnđ": "đồng",
    "$": "đô la",
    "usd": "đô la mỹ",
    "€": "ơ rô",
    "eur": "ơ rô",
    "£": "bảng anh",
    "¥": "yên",
    "₩": "won",
}

_SYMBOLS = {
    "+": "cộng",
    "-": "trừ",
    "×": "nhân",
    "÷": "chia",
    "=": "bằng",
    "≈": "xấp xỉ",
    "≠": "khác",
    "≥": "lớn hơn hoặc bằng",
    "≤": "nhỏ hơn hoặc bằng",
    ">": "lớn hơn",
    "<": "nhỏ hơn",
    "²": "bình phương",
    "³": "lập phương",
    "√": "căn bậc hai",
    "&": "và",
    "@": "a còng",
}

_ORDINALS = {
    "st": "", "nd": "", "rd": "", "th": "",
}

# ============================================================
# Main normalization functions
# ============================================================

def _normalize_date(text: str) -> str:
    """Normalize date patterns: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy"""
    def _replace_date(m):
        day, sep, month = m.group(1), m.group(2), m.group(3)
        year = m.group(4) if m.group(4) else None

        day_num = int(day)
        month_num = int(month)

        result = f"ngày {number_to_vietnamese(day_num)} tháng {number_to_vietnamese(month_num)}"
        if year:
            year_num = int(year)
            result += f" năm {number_to_vietnamese(year_num)}"
        return result

    # dd/mm/yyyy or dd/mm
    text = re.sub(
        r"\b(\d{1,2})([/\-\.])(\d{1,2})(?:\2(\d{2,4}))?\b",
        _replace_date, text
    )
    return text


def _normalize_time(text: str) -> str:
    """Normalize time patterns: HH:MM, HHhMM, HH giờ MM"""
    def _replace_time(m):
        hour = int(m.group(1))
        minute = int(m.group(2))
        h_text = number_to_vietnamese(hour) + " giờ"
        if minute > 0:
            h_text += " " + number_to_vietnamese(minute) + " phút"
        return h_text

    text = re.sub(r"\b(\d{1,2})[hH:](\d{2})\b", _replace_time, text)
    return text


def _normalize_currency(text: str) -> str:
    """Normalize currency: 1.500.000đ, 50$, 100 VND, etc."""
    # Number followed by currency symbol: 1.500.000đ, 50 VND
    suffix_symbols = ["vnđ", "vnd", "usd", "eur", "đ"]  # longer first
    for sym in suffix_symbols:
        def _make_suffix_replacer(currency_sym):
            def _replace(m):
                num_str = m.group(1).replace(".", "").replace(",", "")
                num = int(num_str)
                cur_name = _CURRENCY.get(currency_sym, currency_sym)
                return f"{number_to_vietnamese(num)} {cur_name}"
            return _replace
        pattern = r"([\d.,]+)\s*" + re.escape(sym)
        text = re.sub(pattern, _make_suffix_replacer(sym), text, flags=re.IGNORECASE)

    # Currency symbol before number: $50, €100
    prefix_symbols = ["$", "€", "£", "¥", "₩"]
    for sym in prefix_symbols:
        def _make_prefix_replacer(currency_sym):
            def _replace(m):
                num_str = m.group(1).replace(".", "").replace(",", "")
                num = int(num_str)
                cur_name = _CURRENCY.get(currency_sym, currency_sym)
                return f"{number_to_vietnamese(num)} {cur_name}"
            return _replace
        pattern = re.escape(sym) + r"\s*([\d.,]+)"
        text = re.sub(pattern, _make_prefix_replacer(sym), text, flags=re.IGNORECASE)

    return text


def _normalize_percentage(text: str) -> str:
    """Normalize percentages: 85%, 3.14%"""
    def _replace_pct(m):
        num_str = m.group(1)
        if "," in num_str or "." in num_str:
            # Decimal percentage
            sep = "," if "," in num_str else "."
            parts = num_str.split(sep, 1)
            return _decimal_to_vietnamese(parts[0], parts[1]) + " phần trăm"
        else:
            return number_to_vietnamese(int(num_str)) + " phần trăm"
    text = re.sub(r"([\d.,]+)\s*%", _replace_pct, text)
    return text


def _normalize_phone_number(text: str) -> str:
    """Normalize Vietnamese phone numbers: 0901234567, 090-123-4567, +84 901234567"""
    def _replace_phone(m):
        digits = re.sub(r"[^\d]", "", m.group(0))
        return " ".join(_DIGITS[d] for d in digits)

    # Vietnamese phone: starts with 0 or +84, 10-11 digits
    text = re.sub(r"\b(?:\+84|0)\s*[\d\-\.\s]{8,13}\b", _replace_phone, text)
    return text


def _normalize_units(text: str) -> str:
    """Normalize measurement units."""
    for unit, word in sorted(_UNITS.items(), key=lambda x: -len(x[0])):
        if unit == "%":
            continue  # handled separately
        # Match full number (including decimals with , or .) before unit
        pattern = r"([\d]+(?:[.,]\d+)?)\s*" + re.escape(unit) + r"(?!\w)"
        def _make_unit_replacer(unit_word):
            def _replace(m):
                num_str = m.group(1)
                # Handle decimal
                if "," in num_str:
                    parts = num_str.split(",", 1)
                    num_text = _decimal_to_vietnamese(parts[0], parts[1])
                elif "." in num_str and not re.match(r"^\d{1,3}(\.\d{3})+$", num_str):
                    parts = num_str.split(".", 1)
                    num_text = _decimal_to_vietnamese(parts[0], parts[1])
                else:
                    num_text = number_to_vietnamese(int(num_str.replace(".", "")))
                return f"{num_text} {unit_word}"
            return _replace
        text = re.sub(pattern, _make_unit_replacer(word), text, flags=re.IGNORECASE)
    return text


def _normalize_numbers(text: str) -> str:
    """Normalize standalone numbers in text."""
    def _replace_number(m):
        num_str = m.group(0)
        # Vietnamese thousand separator: 1.500.000
        if re.match(r"^\d{1,3}(\.\d{3})+$", num_str):
            clean = num_str.replace(".", "")
            return number_to_vietnamese(int(clean))
        # Decimal with comma: 3,14
        if "," in num_str:
            parts = num_str.split(",", 1)
            if parts[1].isdigit():
                return _decimal_to_vietnamese(parts[0], parts[1])
        # Decimal with dot: 3.14 (only if not thousand separator pattern)
        if "." in num_str:
            parts = num_str.split(".", 1)
            if len(parts[1]) <= 2 or not re.match(r"^\d{3}$", parts[1]):
                if parts[0].isdigit() and parts[1].isdigit():
                    return _decimal_to_vietnamese(parts[0], parts[1])
        # Plain integer
        clean = num_str.replace(".", "").replace(",", "")
        if clean.isdigit():
            return number_to_vietnamese(int(clean))
        return num_str

    text = re.sub(r"\d[\d.,]*\d|\d", _replace_number, text)
    return text


def _normalize_symbols(text: str) -> str:
    """Replace mathematical and special symbols."""
    for sym, word in _SYMBOLS.items():
        text = text.replace(sym, f" {word} ")
    # Clean up extra spaces
    text = re.sub(r"\s+", " ", text)
    return text


# ============================================================
# Public API
# ============================================================

class VietnameseTextNormalizer:
    """Vietnamese text normalizer for TTS preprocessing.

    Converts numbers, dates, times, currency, percentages,
    phone numbers, units, and special symbols into Vietnamese words.
    """

    def normalize(self, text: str) -> str:
        """Normalize Vietnamese text for TTS.

        Args:
            text: Input text potentially containing numbers, dates,
                  currency, special characters, etc.

        Returns:
            Normalized text with all numeric/symbolic content
            converted to Vietnamese words.
        """
        # Order matters: specific patterns first, general numbers last
        text = _normalize_date(text)
        text = _normalize_time(text)
        text = _normalize_phone_number(text)
        text = _normalize_currency(text)
        text = _normalize_percentage(text)
        text = _normalize_units(text)
        text = _normalize_numbers(text)
        text = _normalize_symbols(text)
        text = text.strip()
        return text
