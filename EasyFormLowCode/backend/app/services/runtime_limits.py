MAX_IN_MEMORY_SCAN = 1000


def ensure_scan_limit(count: int, operation: str) -> None:
    if count > MAX_IN_MEMORY_SCAN:
        raise ValueError(
            f"{operation} supports at most {MAX_IN_MEMORY_SCAN} records; narrow the filters or reduce demo data",
        )
