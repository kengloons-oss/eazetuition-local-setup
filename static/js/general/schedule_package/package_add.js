var subjectErr = true,
    eduLvlErr = true,
    timeWindowErr = false,
    intakeYearErr = false,
    numOfPackageErr = true,
    nameErr = true;

$(document).ready(function () {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 10;
    const $addBtn = $('button[type="submit"]');

    function updateAddBtnState() {
        const atLeastOneChecked = $('.package-checkbox:checked').length > 0;
        const allFieldsValid = checkAllValid(); // your existing validation helper
        $addBtn.prop('disabled', !(atLeastOneChecked && allFieldsValid));
    }

    // Set min and max dynamically
    $('.intake_year').attr({
        min: currentYear,
        max: maxYear
    });

    // (Optional) auto-fill current year
    $('.intake_year').val(currentYear);

    $('#resetBtn').on('click', function () {
        location.reload(); // simply reloads the page
    });

    // =======================================
    // Handle subject dropdown behavior
    // =======================================
    const $subjectSelect = $('.subject_id');

    // 1️⃣ Disable subject select by default
    $subjectSelect.prop('disabled', true).empty();

    // 2️⃣ Listen for education level change
    $('.edu_lvl_id').on('change', function () {
        const eduLvlId = $(this).val();

        if (!eduLvlId) {
            // If no edu level selected, disable subject select
            $subjectSelect.prop('disabled', true)
                .empty()
                .append('<option value="" disabled selected>Select Subject</option>');
            if ($subjectSelect.hasClass('select2')) {
                $subjectSelect.trigger('change.select2');
            }
            return;
        }

        // Show loading indicator
        $subjectSelect.prop('disabled', true)
            .empty()
            .append('<option disabled>Loading subjects...</option>');

        // 3️⃣ Fetch subjects via AJAX
        $.ajax({
            url: `/subject/by_edu_lvl/${eduLvlId}`,
            type: 'GET',
            dataType: 'json',
            success: function (subjects) {
                $subjectSelect.empty(); // clear old options

                if (!subjects || subjects.length === 0) {
                    // No subjects for this edu level
                    $subjectSelect.prop('disabled', true).empty();

                    showError($subjectSelect, "No subjects available for the selected education level");
                    subjectErr = true;
                } else {
                    clearError($subjectSelect);

                    // Populate and enable
                    $.each(subjects, function (i, subject) {
                        $subjectSelect.append(
                            $('<option>', { value: subject.subject_id, text: subject.name })
                        );
                    });
                    $subjectSelect.prop('disabled', false);
                }

                // Refresh Select2 if used
                if ($subjectSelect.hasClass('select2')) {
                    $subjectSelect.trigger('change.select2');
                }
            },
            error: function (xhr, status, error) {
                console.error('Error fetching subjects:', error);
                $subjectSelect.empty()
                    .append('<option disabled>Error loading subjects</option>')
                    .prop('disabled', true);
            }
        });
    });


    // =======================================
    // Handle generate package button behavior
    // =======================================
    $('#generatePackageBtn').on('click', function () {
        $('select, input').trigger('blur');
        if (!checkAllValid()) {
            alert('Please fill all required fields correctly before generating packages.');
            return;
        }

        const formData = {
            edu_lvl_id: $('.edu_lvl_id').val(),
            subject_ids: $('.subject_id').val(),
            time_window: $('.time_window').val(),
            intake_year: $('.intake_year').val(),
            num_of_package: $('.num_of_package').val()
        };

        $('#generatePackageBtn').prop('disabled', true).text('Generating...');

        $.ajax({
            url: '/schedule_package/generate',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (response) {
                const $container = $('#generatedPackages');
                $container.empty().show();

                if (response.packages && response.packages.length > 0) {
                    let hasContent = false;

                    // Map incomplete packages
                    const incompleteMap = {};
                    if (response.incomplete_packages && response.incomplete_packages.length > 0) {
                        response.incomplete_packages.forEach(p => {
                            incompleteMap[p.package_name] = p.missing_subjects || [];
                        });
                    }

                    // 🧠 Map AI results
                    const aiMap = {};
                    if (response.ai_result && response.ai_result.length > 0) {
                        response.ai_result.forEach(ai => {
                            aiMap[ai.package_name] = ai;
                        });
                    }

                    response.packages.forEach((pkg, index) => {
                        const isIncomplete = pkg.package_name in incompleteMap;
                        const missingSubjects = incompleteMap[pkg.package_name] || [];

                        // ===== Updated Label Logic =====
                        const hasClasses = Object.values(pkg.subjects).some(subjArr => subjArr.length > 0);
                        let labelNote = '';
                        if (!hasClasses) {
                            labelNote = `<span class="uk-text-danger uk-text-small"> (No class available)</span>`;
                        } else if (isIncomplete) {
                            labelNote = `<span class="uk-text-warning uk-text-small" title="Missing: ${missingSubjects.join(', ')}"> (Incomplete package)</span>`;
                        }

                        // ====== 🧠 ADD AI RECOMMENDATION + REASON ======
                        const ai = aiMap[pkg.package_name];
                        let aiBadge = '';
                        if (ai) {
                            // Color by recommendation level
                            let color = '#999';
                            let icon = '⚪';
                            switch (ai.ai_recommended) {
                                case 'Highly Recommended':
                                    color = '#00C853'; // green
                                    icon = '🌟';
                                    break;
                                case 'Recommended':
                                    color = '#4CAF50'; // lighter green
                                    icon = '✅';
                                    break;
                                case 'Moderate':
                                    color = '#FFC107'; // amber
                                    icon = '⚖️';
                                    break;
                                case 'Not Recommended':
                                    color = '#F44336'; // red
                                    icon = '❌';
                                    break;
                            }

                            // Build reason list with color
                            let reasonHtml = "<ul class='ai-reason-list'>";
                            ai.reason.forEach(r => {
                                let c = "#666"; // default neutral
                                if (r.type === "danger") c = "#E53935";
                                if (r.type === "warning") c = "#FB8C00";
                                if (r.type === "positive") c = "#43A047";

                                reasonHtml += `<li style="color:${c}; margin-bottom:4px;">${r.text}</li>`;
                            });
                            reasonHtml += "</ul>";

                            aiBadge = `
                                <span class="uk-text-small"
                                    style="color:${color}; font-weight:600; margin-left:8px;">
                                    ${icon} ${ai.ai_recommended}

                                    <div class="ai-hover-wrapper">
                                        <i class="fa-solid fa-circle-info ai-info-icon"></i>

                                        <div class="ai-hover-box">
                                            ${reasonHtml}
                                        </div>
                                    </div>
                                </span>
                            `;

                        }
                        // ==================================

                        const labelHtml = `
                            <label for="pkg_${index}" class="uk-margin-small-left uk-text-bold">
                                ${pkg.package_name}
                                ${aiBadge}
                                ${labelNote}
                            </label>
                `;

                        const $card = $(`
                    <div class="package-card uk-card uk-card-default uk-card-body uk-margin-small-bottom">
                        <div class="uk-flex uk-flex-middle uk-flex-between toggle-header" style="cursor:pointer;">
                            <div class="uk-flex uk-flex-middle">
                                <input type="checkbox" class="package-checkbox" id="pkg_${index}" data-index="${index}">
                                ${labelHtml}
                            </div>
                            <span class="toggle-icon" style="font-size:1rem; color:#333;">${index < 2 ? '▼' : '▶'}</span>
                        </div>
                        <div id="pkg_content_${index}" class="pkg-content" ${index < 2 ? '' : 'style="display:none;"'}>
                            <table class="uk-table uk-table-divider uk-table-small">
                                <thead>
                                    <tr>
                                        <th>Day</th>
                                        <th>Subject</th>
                                        <th>Time</th>
                                        <th>Tutor</th>
                                        <th>Room</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                `);

                        const $tbody = $card.find('tbody');
                        const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
                        let allClasses = [];

                        Object.keys(pkg.subjects).forEach(subj_id => {
                            pkg.subjects[subj_id].forEach(cd => {
                                allClasses.push({
                                    subject_name: cd.subject_name,
                                    day_of_week: parseInt(cd.day_of_week),
                                    start_time: cd.start_time,
                                    end_time: cd.end_time,
                                    tutor_name: cd.tutor_name,
                                    room_name: cd.room_name
                                });
                            });
                        });

                        // 🧠 Disable package if empty
                        if (allClasses.length === 0) {
                            $tbody.append(`
                        <tr>
                            <td colspan="5" class="uk-text-center uk-text-danger">
                                ⚠️ This package has no available classes.
                            </td>
                        </tr>
                    `);
                            $card.addClass('uk-border-danger');
                            $card.find('.package-checkbox')
                                .prop('disabled', true)
                                .attr('title', 'This package cannot be selected because it has no classes.');
                        } else {
                            hasContent = true;
                            allClasses.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
                            const dayGroups = {};
                            allClasses.forEach(cd => {
                                if (!dayGroups[cd.day_of_week]) dayGroups[cd.day_of_week] = [];
                                dayGroups[cd.day_of_week].push(cd);
                            });

                            Object.keys(dayGroups).forEach(day => {
                                const group = dayGroups[day];
                                group.forEach((cd, i) => {
                                    const borderStyle = i === 0 ? 'border-top: 1.5px solid #333;' : '';
                                    const $tr = $(`
                                <tr style="${borderStyle}">
                                    ${i === 0 ? `<td rowspan="${group.length}" class="day-cell" style="vertical-align: middle; text-align: center;">${dayMap[cd.day_of_week]}</td>` : ''}
                                    <td>${cd.subject_name}</td>
                                    <td>${cd.start_time}-${cd.end_time}</td>
                                    <td>${cd.tutor_name}</td>
                                    <td>${cd.room_name}</td>
                                </tr>
                            `);
                                    $tbody.append($tr);
                                });
                            });
                        }

                        $card.data('packageData', pkg);
                        $container.append($card);
                    });

                    if (!hasContent) {
                        $container.html(`
                    <div class="uk-alert-danger uk-text-center uk-padding-small" uk-alert>
                        <p><strong>⚠️ No valid packages could be generated for this intake.</strong></p>
                    </div>
                `);
                    }

                    // Toggle open/close
                    $container.off('click', '.toggle-header').on('click', '.toggle-header', function (e) {
                        if ($(e.target).is('input')) return;
                        const $content = $(this).next('.pkg-content');
                        const $icon = $(this).find('.toggle-icon');
                        $content.slideToggle(200);
                        $icon.text($content.is(':visible') ? '▼' : '▶');
                    });



                } else {
                    $container.html(`
                <div class="uk-alert-danger uk-text-center uk-padding-small" uk-alert>
                    <p><strong>⚠️ No packages generated.</strong></p>
                </div>
            `);
                }

                $container.on("click", ".ai-info-icon", function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                });
            },

            complete: function () {
                $('#generatePackageBtn').prop('disabled', false).html('<i class="fa-solid fa-boxes-stacked"></i> Generate Packages');
            }
        });
    });


    // =============================
    // Listen to checkbox changes inside generated packages
    // =============================
    $('#generatedPackages').on('change', '.package-checkbox', function () {
        updateAddBtnState(); // Update Add button whenever user checks/unchecks
    });


    //=========================================================================================
    // Validation
    //=========================================================================================
    $('select').on('change blur', function () {

        const inputElement = $(this);
        // Education Level
        if (inputElement.hasClass('edu_lvl_id')) {
            const selectedVal = inputElement.val();

            if (!selectedVal) {
                showError(inputElement, "Education level is required");
                eduLvlErr = true;
            } else {
                clearError(inputElement);
                eduLvlErr = false;
            }
        }

        // Subject
        if (inputElement.hasClass('subject_id')) {
            const selectedVal = inputElement.val();

            if (!selectedVal || selectedVal.length === 0) {
                showError(inputElement, "Subject is required");
                subjectErr = true;
            } else {
                clearError(inputElement);
                subjectErr = false;
            }
        }

        // Time Window
        if (inputElement.hasClass('time_window')) {
            const selectedVal = inputElement.val();

            if (!selectedVal) {
                showError(inputElement, "Time window is required");
                timeWindowErr = true;
            } else if (selectedVal !== 'M' && selectedVal !== 'A' && selectedVal !== 'F') {
                showError(inputElement, "Timw window must be 'Morning', 'Afternoon' or 'Fullday'");
                timeWindowErr = true;
            } else {
                clearError(inputElement);
                timeWindowErr = false;
            }
        }

        checkAllValid();
    });

    $('input, textarea').on('blur input', function () {

        // Name
        if ($(this).hasClass('name')) {

            const inputElement = $(this);
            var input = $(this).val();

            var err = validateText(input, true, "Name");

            if (err != null) {
                showError(inputElement, err);
                nameErr = true;
            }
            else {
                clearError(inputElement);
                nameErr = false;
            }
        }

        // Intake Year
        if ($(this).hasClass('intake_year')) {
            var input = $(this).val();
            var inputElement = $(this);

            let err = validateNumber(input, currentYear, maxYear, true, "Intake Year");

            if (err != null) {
                showError(inputElement, err);
                intakeYearErr = true;
            }
            else {
                clearError(inputElement);
                intakeYearErr = false;
            }
        }

        // Number Of Package Generate
        if ($(this).hasClass('num_of_package')) {
            var input = $(this).val();
            var inputElement = $(this);

            let err = validateNumber(input, 1, 6, true, "Number Of Pckage Generate");

            if (err != null) {
                showError(inputElement, err);
                numOfPackageErr = true;
            }
            else {
                clearError(inputElement);
                numOfPackageErr = false;
            }
        }

        checkAllValid();
    });

    // =============================
    // Clear generated packages ONLY when value actually changes
    // =============================
    $('select, input').each(function () {
        $(this).data('prev', $(this).val()); // store initial value
    });

    $('select, input').on('change blur input', function () {
        const $el = $(this);
        const prevVal = $el.data('prev');
        const currentVal = $el.val();

        // Only trigger if value actually changed
        if (currentVal !== prevVal && $el.attr('id') !== 'is_open_for_enrollment') {
            $('#generatedPackages').empty().hide();
            $('#generatePackageBtn').prop('disabled', !checkAllValid());
            $addBtn.prop('disabled', true);

            // update stored previous value
            $el.data('prev', currentVal);
        }

        checkAllValid();
        updateAddBtnState();
    });



    // =============================
    // Handle Form Submit (AJAX POST)
    // =============================
    $('#package-form').on('submit', function (e) {
        e.preventDefault();
        if (!checkAllValid()) {
            alert('Please fill all required fields.');
            return;
        }

        const selectedPackages = [];
        $('.package-checkbox:checked').each(function () {
            const $pkgCard = $(this).closest('.package-card');
            const pkgData = $pkgCard.data('packageData');
            const isDisabled = $(this).prop('disabled');

            if (isDisabled || !pkgData || Object.keys(pkgData.subjects).length === 0) {
                alert('Some selected packages are empty and cannot be submitted.');
                return false; // stop submission
            }
            selectedPackages.push(pkgData);
        });

        if (selectedPackages.length === 0) {
            alert('Please select at least one valid package.');
            return;
        }

        const payload = {
            name: $('.name').val(),
            edu_lvl_id: $('.edu_lvl_id').val(),
            subject_ids: $('.subject_id').val(),
            time_window: $('.time_window').val(),
            intake_year: $('.intake_year').val(),
            num_of_package: $('.num_of_package').val(),
            is_open_for_enrollment: $('#is_open_for_enrollment').is(':checked'),
            selected_packages: selectedPackages
        };

        const $btn = $('button[type="submit"]');
        $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');
        console.log("SENDING PAYLOAD:", JSON.stringify(payload, null, 2));

        $.ajax({
            url: '/schedule_package/add',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                if (response.status === 'error') {
                    // Inline error or alert
                    showErrorAlert(response.title || 'Error', response.message || 'Failed to submit packages.');
                } else if (response.status === 'success') {
                    // 🎉 Success alert
                    showSuccessAlert(
                        response.title || 'Success',
                        response.message || 'Package sets added successfully!',
                        '/schedule_package/list' // optional redirect
                    );

                    // Optional: clear the form
                    $('form')[0].reset();
                }
            },
            error: function () {
                showErrorAlert('Error', 'An unexpected error occurred. Please try again.');
            },
            complete: function () {
                $btn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Confirm Packages');
            }
        });
    });

});

// ========================================================
// Helper to check if all validation flags are false (no error)
// ========================================================
function checkAllValid() {
    const allValid = !(
        subjectErr ||
        eduLvlErr ||
        timeWindowErr ||
        intakeYearErr ||
        numOfPackageErr ||
        nameErr

    );

    $('#generatePackageBtn').prop('disabled', !allValid);
    return allValid;
}