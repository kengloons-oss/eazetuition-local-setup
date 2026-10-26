def choose_best_class_for_subject(class_list):
    """
    Return one representative class_detail dict for this subject.
    Priority:
      1. assigned classes (those with real start_time)
      2. earliest by (day_of_week, start_time)
    """

    # Separate assigned vs unassigned
    assigned = [
        c for c in class_list
        if c.get("start_time") not in (None, "00:00")
    ]

    target_list = assigned if assigned else class_list

    # Sort earliest
    return sorted(
        target_list,
        key=lambda c: (
            int(c["day_of_week"]),
            c["start_time"]
        )
    )[0]
