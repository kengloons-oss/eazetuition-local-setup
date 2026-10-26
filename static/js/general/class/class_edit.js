var classTypeErr = false,
    dayOfWeekErr = false;

$(document).ready(function () {
    const isAuto = false;
    initializeTimePickers();
    const $form = $('#class-form');

    const $container = $('#class_time_pairs_container');
    const count = parseInt($container.data('count')) || 0;

    // Scrollable container if too many
    if (count > 3) {
        $container.css({
            'max-height': '320px',
            'overflow-y': 'auto',
            'padding-right': '5px'
        });
    } else {
        $container.css({
            'max-height': 'none',
            'overflow-y': 'visible'
        });
    }

    // ✅ Helper to toggle disable/enable of time fields
    function toggleTimeFields($select) {
        let selected = $select.val()?.trim();
        const $row = $select.closest('.day-time-pair');
        const $start = $row.find('.start_time_pair');
        const $end = $row.find('.end_time_pair');

        if (!selected || selected === 'None' || selected === '0') {
            // Allow submitting null by keeping fields enabled but blank
            $start.val('');
            $end.val('');
            $start.prop('readonly', true);
            $end.prop('readonly', true);
            $row.addClass('no-day-selected');
        } else {
            $start.prop('readonly', false);
            $end.prop('readonly', false);
            $row.removeClass('no-day-selected');
        }
    }


    // 🔹 When user changes the day selection
    $(document).on('change', '.day_of_week_pair', function () {
        toggleTimeFields($(this));

        $('.day-time-pair').each(function () {
            const $row = $(this)
            checkEnableStartTime($row);
            validateRowTime($row);

        });

    });

    // 🔹 Apply on page load for all existing rows (after slight delay to ensure DOM ready)
    setTimeout(() => {
        $('.day-time-pair').each(function () {
            const $row = $(this);
            toggleTimeFields($row.find('.day_of_week_pair'));
            checkEnableStartTime($row);
        });
    }, 200);

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

    // Existing form submission handler disabled automatically, so we can wrap it
    $('#btn-submit').on('click', function () {
        const title = "Edit Confirmation";
        const message = "Are you sure you want to update this class? <br/><br/><small>⚠️ <strong>Note:</strong> The class detail already scheduled in package and timetable will <u>also be modified</u>.</small>";

        showWarningAlert(title, message).then((confirmed) => {
            if (confirmed) {
                $('#class-form').submit();
            }
        });
    });


    $('form').submit(async function (event) {
        event.preventDefault();

        // Trigger blur for validation
        $('.class_type, .day_of_week_pair, .start_time_pair, .end_time_pair').trigger('blur');

        // wait for all time validation done
        const results = await Promise.all($('.day-time-pair').map(function () {
            return validateRowTime($(this));
        }).get());

        const classId = $('input[name="class_id"]').val();

        setTimeout(() => {
            if (!classTypeErr && !dayOfWeekErr) {
                let formData = $(this).serialize();
                console.log('hi');
                $.ajax({
                    url: "/class/detail/" + classId,
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

});
