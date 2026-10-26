function fetchStudents() {
    const edu_lvl_id = $('.edu_lvl_id').val();
    const intake_year = $('.intake_year').val();
    const studentSelect = $('.student_id');
    const selectedStudent = studentSelect.val(); // keep the currently selected student

    if (!edu_lvl_id || !intake_year) {
        studentSelect.prop('disabled', true)
            .empty().append('<option value="" disabled selected>Select Student</option>');
        $('.class_').prop('disabled', true)
            .empty().append('<option value="" disabled selected>Select Class</option>');
        return;
    }

    $.ajax({
        url: `/class/students/${edu_lvl_id}`,
        method: 'GET',
        data: { intake_year },
        success: function (response) {
            studentSelect.empty().append('<option value="" disabled selected>Select Student</option>');

            let stillExists = false;
            response.students.forEach(s => {
                const isSelected = s.student_id == selectedStudent;
                if (isSelected) stillExists = true;
                studentSelect.append(`<option value="${s.student_id}" ${isSelected ? 'selected' : ''}>${s.name}</option>`);
            });

            studentSelect.prop('disabled', response.students.length === 0);
            studentSelect.trigger('change.select2');

            // ✅ If previously selected student still exists, keep it & refetch classes
            if (stillExists) {
                fetchAvailableClasses();
            } else {
                $('.class_').prop('disabled', true).empty().append('<option value="" disabled selected>Select Class</option>');
            }

            checkFormCompletion();
        }
    });
}

function fetchAvailableClasses() {
    const student_id = $('.student_id').val();
    const intake_year = $('.intake_year').val();
    const classSelect = $('.class_');

    if (!student_id) return;

    $.ajax({
        url: `/class/available_classes/${student_id}`,
        method: 'GET',
        data: { intake_year },
        success: function (response) {
            classSelect.empty();

            // Handle no available class
            if (!response.class_details || response.class_details.length === 0) {
                classSelect.prop('disabled', true);
                showError(classSelect, "No available class for this student");
                return;
            }

            clearError(classSelect);

            response.class_details.forEach(c => {
                classSelect.append(
                    `<option value="${c.class_detail_id}" data-set-id="${c.package_set_id}" ${c.is_full ? 'disabled' : ''}>
                        ${c.detail}
                    </option>`
                );
            });

            classSelect.prop('disabled', false);
            classSelect.trigger('change.select2');

            // 👇 Automatically open dropdown
            setTimeout(() => {
                classSelect.select2('open');
            }, 100);
        },
        error: function () {
            classSelect.prop('disabled', true);
            showError(classSelect, "Failed to fetch available classes. Please try again.");
        }
    });
}

function checkFormCompletion() {
    const eduLvl = $('.edu_lvl_id').val();
    const intakeYear = $('.intake_year').val();
    const student = $('.student_id').val();
    const classes = $('.class_').val();

    const isComplete = eduLvl && intakeYear && student && classes && classes.length > 0;
    $('button[type="submit"]').prop('disabled', !isComplete);
}


var eduErr = true,
    intakeYearErr = true,
    studentErr = true,
    classErr = true;
$(document).ready(function () {
    $('.edu_lvl_id, .intake_year').on('change', function () {
        fetchStudents();
        checkFormCompletion();
    });

    $('.student_id').on('change', function () {
        const hasStudent = $(this).val() !== null && $(this).val() !== '';
        $('.class_').prop('disabled', true).empty();
        if (hasStudent) fetchAvailableClasses();
        checkFormCompletion();
    });

    $('.class_').on('change', function () {
        checkFormCompletion();
    });

    $('.select2').select2({ width: '100%', placeholder: 'Select an option' });

    $('select').on('change blur', function () {
        const inputElement = $(this);
        if (inputElement.hasClass('edu_lvl_id')) {
            const selectedVal = inputElement.val();
            if (!selectedVal) showError(inputElement, "Education Level is required");
            else clearError(inputElement);
        }

        if (inputElement.hasClass('student_id')) {
            const selectedVal = inputElement.val();
            if (!selectedVal) showError(inputElement, "Student is required");
            else clearError(inputElement);
        }

        if (inputElement.hasClass('intake_year')) {
            const selectedVal = inputElement.val();
            if (!selectedVal) showError(inputElement, "Intake Year is required");
            else clearError(inputElement);
        }

        if (inputElement.hasClass('class_id')) {
            const selectedVals = inputElement.val();
            if (!selectedVals || selectedVals.length === 0) showError(inputElement, "Class is required");
            else clearError(inputElement);
        }
    });

    $('form').submit(function (event) {
        event.preventDefault();

        // Validate
        $('.student_id, .edu_lvl_id, .class_, .intake_year').trigger('blur');
        checkFormCompletion();

        const eduLvl = $('.edu_lvl_id').val();
        const intakeYear = $('.intake_year').val();
        const studentId = $('.student_id').val();
        const selectedClasses = $('.class_').val(); // array of class_detail_id

        // Build list of pairs
        const classPairs = selectedClasses.map(classId => {
            const setId = $(`.class_ option[value="${classId}"]`).data('set-id');
            return { class_id: classId, set_id: setId };
        });

        // Build the data payload
        const payload = {
            edu_lvl_id: eduLvl,
            intake_year: intakeYear,
            student_id: studentId,
            class_pairs: classPairs
        };

        $.ajax({
            url: '/class/enrollment/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                if (response.status === 'error') {
                    showErrorAlert(response.title, response.message);
                } else if (response.status === 'success') {
                    showSuccessAlert(response.title, response.message, response.redirectUrl);
                    $('form')[0].reset();
                    $('.select2').val(null).trigger('change'); // reset select2
                }
            },
            error: function () {
                showErrorAlert('Error', 'An unexpected error occurred. Please try again.');
            }
        });
    });

});
