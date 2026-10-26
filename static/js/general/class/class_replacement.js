$(document).ready(function () {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const $startInput = $("#replacement_datetime");
    const $submitBtn = $("#replacement-form button[type='submit']");
    const $sessionSelect = $("#time_schedule_key");

    // Initially disable start datetime and submit
    $startInput.prop("disabled", true);
    $submitBtn.prop("disabled", true);

    const startPicker = flatpickr("#replacement_datetime", {
        enableTime: true,
        dateFormat: "d-m-Y h:i K",
        time_24hr: false,
        minuteIncrement: 5,
        minDate: tomorrow,
        onChange: function(selectedDates, dateStr, instance) {
            checkFormValidity();
        }
    });

    let selectedDuration = 0;

    // === Load subjects based on education level ===
    $("#edu_lvl_id").on("change", function () {
        const eduLvlId = $(this).val();
        const $subjectSelect = $("#subject_id");

        $subjectSelect.prop("disabled", true).empty().append('<option>Loading...</option>');

        $.get(`/class/get_subjects/${eduLvlId}`, function (res) {
            $subjectSelect.empty().append('<option disabled selected>Select Subject</option>');
            res.subjects.forEach(sub => {
                $subjectSelect.append(`<option value="${sub.subject_id}">${sub.name}</option>`);
            });
            $subjectSelect.prop("disabled", false);
        }).fail(() => showErrorAlert("Error", "Failed to load subjects."));
    });

    // === Load class sessions based on selected subject ===
    $("#subject_id").on("change", function () {
        const subjectId = $(this).val();

        $sessionSelect.prop("disabled", true).empty().append('<option>Loading...</option>');

        $.get(`/class/get_class_sessions/${subjectId}`, function (res) {
            $sessionSelect.empty();

            if (!res.sessions || res.sessions.length === 0) {
                $sessionSelect.append('<option disabled selected>No unreplaced canceled sessions available</option>');
                return;
            }

            $sessionSelect.append('<option disabled selected>Select Class Session</option>');
            res.sessions.forEach(sess => {
                const idJson = JSON.stringify(sess.id);
                $sessionSelect.append(
                    `<option value='${idJson}' data-remaining="${sess.remaining}" data-duration="${sess.duration}">${sess.display}</option>`
                );
            });

            $sessionSelect.prop("disabled", false);
        }).fail(() => showErrorAlert("Error", "Failed to load class sessions."));
    });

    // === Track selected session duration and enable start datetime ===
    $sessionSelect.on("change", function () {
        const selectedOption = $(this).find(":selected");
        selectedDuration = parseInt(selectedOption.data("duration")) || 0;

        // Enable start datetime when session selected
        $startInput.prop("disabled", !selectedDuration);

        // Clear previous start/end values
        $startInput.val('');
        $("#replacement_end_datetime").val('');
        $("#replacement_start_iso").val('');
        $("#replacement_end_iso").val('');

        checkFormValidity();
    });

    // === Auto-calculate replacement end datetime ===
    $startInput.on("change", function () {
        const start = startPicker.selectedDates[0];
        if (!start || !selectedDuration) return;

        const end = new Date(start.getTime() + selectedDuration * 60000);

        // Format for display
        const day = String(end.getDate()).padStart(2, "0");
        const month = String(end.getMonth() + 1).padStart(2, "0");
        const year = end.getFullYear();
        let hours = end.getHours();
        const minutes = String(end.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const displayEnd = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

        $("#replacement_end_datetime").val(displayEnd);
        $("#replacement_end_iso").val(end.toISOString().slice(0, 19).replace("T", " "));
        $("#replacement_start_iso").val(start.toISOString().slice(0, 19).replace("T", " "));

        checkFormValidity();
    });

    // === Check if form is valid to enable submit ===
    function checkFormValidity() {
        const sessionSelected = $sessionSelect.val();
        const startFilled = $startInput.val().trim() !== '';
        $submitBtn.prop("disabled", !(sessionSelected && startFilled));
    }

    // === Submit replacement form ===
    $("#replacement-form").on("submit", function (e) {
        e.preventDefault();
        const selectedOption = $sessionSelect.find(":selected").val();
        if (!selectedOption) {
            showErrorAlert("Error", "Please select a class session to replace.");
            return;
        }

        const [set_id, class_detail_id] = JSON.parse(selectedOption);
        const formData = $(this).serializeArray();
        formData.push({ name: 'set_id', value: set_id });
        formData.push({ name: 'class_detail_id', value: class_detail_id });

        $.post("/class/session/replacement/submit", formData, function (res) {
            if (res.success) {
                showSuccessAlert("Success", res.message || "Replacement class added!", "/class/session/list");
                setTimeout(() => { window.location.href = "/class/session/list"; }, 1500);
            } else {
                showErrorAlert("Error", res.message || "Failed to add replacement class.");
            }
        }).fail(() => showErrorAlert("Error", "Unexpected error occurred."));
    });
});
