def suppress_small_groups(
    groups: list[dict], min_size: int = 5, count_field: str = "count"
) -> dict:
    """
    Suppresses or merges small groups (< min_size) for executive privacy.
    Groups with count < min_size are merged into an "Other (small groups)" bucket.
    If the merged bucket is still < min_size, it is dropped and counted in suppressed_groups.
    """
    visible = []
    small_groups_count = 0
    suppressed_count = 0

    for g in groups:
        c = g.get(count_field, 0)
        if c >= min_size:
            visible.append(g)
        else:
            small_groups_count += c
            suppressed_count += 1

    applied = suppressed_count > 0
    merged_into = None

    if small_groups_count >= min_size:
        visible.append({"name": "Other (small groups)", count_field: small_groups_count})
        merged_into = "Other (small groups)"

    return {
        "results": visible,
        "suppression": {
            "applied": applied,
            "suppressed_groups": suppressed_count,
            "merged_into": merged_into,
            "min_group_size": min_size,
        },
    }
