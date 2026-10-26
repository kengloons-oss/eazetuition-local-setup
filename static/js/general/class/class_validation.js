var subjectErr = false,
    tutorErr = false,
    classTypeErr = false,
    timePerWeekErr = false,
    dayOfWeekErr = false,
    durationErr = false;

$(document).ready(function () {
    const $container = $('#class_time_pairs_container');
    const maxPairs = 10;

    // Observe for dynamically added pairs
    const observer = new MutationObserver(() => {
        initializeTimePickers();
        $('.uk-grid').each(function () {
            checkEnableStartTime($(this));
        });
    });

    observer.observe($container[0], { childList: true, subtree: true });

    // --- Dynamic Pair Generation ---
    const $timePerWeek = $('.time_per_week');
    const $toggle = $('#schedule_mode');

    function toggleManualContainer() {
        const $btnContainer = $('#clear_time_pairs_btn_container');

        if ($toggle.is(':checked')) {
            // Auto mode active → hide manual inputs and clear button
            $container.hide();
            $btnContainer.hide();
        } else {
            // Manual mode active → show manual inputs and clear button
            $container.show();
            generatePairs(); // refresh pairs when turning manual on
            toggleClearButton(); // ensure clear button shows correctly
        }
    }

    function generatePairs() {
        const count = Math.min(parseInt($timePerWeek.val()) || 0, maxPairs);
        $container.empty();

        for (let i = 1; i <= count; i++) {
            const pairHTML = `
                <div class="uk-grid day-time-pair" style="margin-bottom: 12px;">
                    <div class="uk-width-1-3">
                        <div class="form-group">
                            <label class="form-label">Day ${i}: </label>
                            <select class="form-select day_of_week_pair" name="day_of_week_pair[]">
                                <option value="">Select Day</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="7">Sunday</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-width-expand" style="padding-left: 20px;">
                        <div class="form-group">
                            <label class="form-label">Class Time ${i}: </label>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="text" class="form-input start_time_pair" name="start_time_pair[]" placeholder="Start Time">
                                <span>-</span>
                                <input type="text" class="form-input end_time_pair" name="end_time_pair[]" placeholder="End Time" readonly>
                            </div>
                            <span class="error-message" style="color:red;font-size:13px;"></span>
                        </div>
                    </div>
                </div>`;
            $container.append(pairHTML);
        }

        // Scrollable container if too many
        $container.css({
            'max-height': '320px',
            'overflow-y': count > 3 ? 'auto' : 'visible',
            'padding-right': '5px'
        });

        initializeTimePickers();
        toggleClearButton();
    }

    // Bind events
    $timePerWeek.on('input', generatePairs);
    $toggle.on('change', toggleManualContainer);

    // Also revalidate when tutor or duration changes
    $(document).on('change', '.tutor_id, .duration', function () {
        const isAuto = $('#schedule_mode').is(':checked');

        $('.day-time-pair').each(function () {
            const $row = $(this);
            if (!isAuto) { // Only validate in Manual mode
                checkEnableStartTime($row);
                validateRowTime($row);
            }
        });

    });

    // Ensure container shown properly on load
    toggleManualContainer();

    $(document).on('change', '.tutor_id, .day_of_week_pair', function () {
        const isAuto = $('#schedule_mode').is(':checked');

        $('.day-time-pair').each(function () {
            const $row = $(this);
            if (!isAuto) { // Only validate in Manual mode
                checkEnableStartTime($row);
                validateRowTime($row);
            }
        });

    });

    // Show or hide Clear button depending on number of pairs
    function toggleClearButton() {
        const $btnContainer = $('#clear_time_pairs_btn_container');
        const hasPairs = $('#class_time_pairs_container .day-time-pair').length > 0;
        const isAutoMode = $('#schedule_mode').is(':checked');
        $btnContainer.toggle(hasPairs && !isAutoMode);
    }


    // Clear all value in pair
    $(document).on('click', '#clear_time_pairs_btn', function () {
        // Clear each day/time value
        $('#class_time_pairs_container .day-time-pair').each(function () {
            $(this).find('select.day-select').val('');      // Clear selected day_of_week
            $(this).find('input.start-time').val('');       // Clear start_time
            $(this).find('input.end-time').val('');         // Clear end_time
        });

        // Clear error message
        $('.error-message').text('');
        $('#time_per_week').val('');
    });

    //=========================================================================================

    $('select').on('change blur', function () {

        const inputElement = $(this);

        // Subject
        if (inputElement.hasClass('subject_id')) {
            const selectedVal = inputElement.val();

            if (!selectedVal) {
                showError(inputElement, "Subject is required");
                subjectErr = true;
            } else {
                clearError(inputElement);
                subjectErr = false;
            }
        }

        // Tutor
        if (inputElement.hasClass('tutor_id')) {
            const selectedVal = inputElement.val();

            if (!selectedVal) {
                showError(inputElement, "Tutor is required");
                tutorErr = true;
            } else {
                clearError(inputElement);
                tutorErr = false;
            }
        }
    });

    $('input[type="radio"][name="class_type"]').on('change blur', function () {
        const selectedVal = $('input[name="class_type"]:checked').val();
        const errorSpan = $('input[name="class_type"]').closest('.form-group').find('span.error-message');

        if (!selectedVal) {
            errorSpan.text("Class type is required").fadeIn();
            $('input[name="class_type"]').closest('.form-group').addClass('hasError');
            classTypeErr = true;
        } else if (selectedVal !== 'N' && selectedVal !== 'F') {
            errorSpan.text("Invalid class type selected").fadeIn();
            $('input[name="class_type"]').closest('.form-group').addClass('hasError');
            classTypeErr = true;
        } else {
            errorSpan.text('').fadeOut();
            $('input[name="class_type"]').closest('.form-group').removeClass('hasError');
            classTypeErr = false;
        }
    });




    $('input, textarea').on('blur input', function () {

        if ($(this).hasClass('time_per_week')) {
            var input = $(this).val();
            var inputElement = $(this);

            let err = validateNumber(input, 0, 7, true, "Time Per Week");

            if (err != null) {
                showError(inputElement, err);
                timePerWeekErr = true;
            }
            else {
                clearError(inputElement);
                timePerWeekErr = false;

                $('.day-time-pair').each(function () {
                    const $row = $(this);
                    checkEnableStartTime($row);
                    validateRowTime($row);
                });
            }
        }

        if ($(this).hasClass('duration')) {
            var input = $(this).val();
            var inputElement = $(this);

            let err = validateNumber(input, 1, 240, true, "Duration");

            if (err != null) {
                showError(inputElement, err);
                durationErr = true;
            }
            else {
                clearError(inputElement);
                durationErr = false;

                $('.day-time-pair').each(function () {
                    const $row = $(this);
                    checkEnableStartTime($row);
                    validateRowTime($row);
                });
            }
        }
    });

    $('form').submit(async function (event) {
        event.preventDefault();
        console.log('hi');

        // Trigger blur for validation
        $('.subject_id, .tutor_id, .class_type, .time_per_week, .duration, .day_of_week_pair, .start_time_pair, .end_time_pair').trigger('blur');

        // 等待所有时间行验证完成
        const results = await Promise.all($('.day-time-pair').map(function () {
            return $('#schedule_mode').is(':checked') ? Promise.resolve(true) : validateRowTime($(this));
        }).get());


        setTimeout(() => {
            if (!subjectErr && !tutorErr && !classTypeErr && !timePerWeekErr && !dayOfWeekErr && !durationErr) {
                let formData = $(this).serialize();

                $.ajax({
                    url: '/class/add',
                    method: 'POST',
                    data: formData,
                    success: function (response) {
                        if (response.status === 'error') {
                            // Show inline error under form
                            showErrorAlert(response.title, response.message);
                        }
                        else if (response.status === 'success') {

                            // 🎉 Call your SweetAlert function
                            showSuccessAlert(response.title, response.message, response.redirectUrl);

                            // Optional: clear form
                            $('form')[0].reset();
                        }
                    },
                    error: function () {
                        $('#formError').text('An unexpected error occurred. Please try again.').show();
                    }
                });
            }
        }, 100);
    });

    //=========================================================================================

});


