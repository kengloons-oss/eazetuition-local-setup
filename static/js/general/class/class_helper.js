// Helper: enable/disable start time when all conditions met
function checkEnableStartTime($row) {
    const mode = $('#class-form').data('mode');
    const isEditForm = mode === 'edit';

    // const subjectFilled = !!$('.subject_id').val();

    let tutorFilled, durationFilled;

    if (isEditForm) {
        tutorFilled = !!$('#tutor_id').data('id');
        durationFilled = !!$('#duration').data('duration');
    } else {
        tutorFilled = !!$('.tutor_id').val();
        durationFilled = !!$('.duration').val();
    }

    const dayFilled = !!$row.find('.day_of_week_pair').val();
    // const allFilled = subjectFilled && tutorFilled && durationFilled && dayFilled;
    const allFilled = tutorFilled && durationFilled && dayFilled;

    $row.find('.start_time_pair').prop('disabled', !allFilled);
}


// Helper: format end time
function updateEndTimeAuto(startTime, $row) {
    const mode = $('#class-form').data('mode'); // check form mode (add/edit)
    const isEditForm = mode === 'edit';

    // Get duration according to form mode
    const durationMinutes = isEditForm
        ? parseInt($('#duration').data('duration'))   // edit form: read from data-duration
        : parseInt($('.duration').val());             // add form: read from input

    if (!startTime || isNaN(durationMinutes)) return;

    // Compute end time
    const endDate = new Date(startTime.getTime() + durationMinutes * 60000);
    let hours = endDate.getHours();
    const minutes = endDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const endFormatted = `${hours}:${minutes} ${ampm}`;

    // Update the end time input
    $row.find('.end_time_pair').val(endFormatted);
}


// --- TIME VALIDATION ---
function isEndAfterStart(start, end) {
    if (!start || !end) return true;
    const parseTime = (t) => {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };
    return parseTime(end) > parseTime(start);
}

function validateRowTime($row) {
    return new Promise((resolve) => {
        const mode = $('#class-form').data('mode');
        const isEditForm = mode === 'edit';

        const isAuto = $('#schedule_mode').is(':checked'); // Auto mode active?

        if (isAuto) {
            timeErr = true; // 直接标记通过
            resolve(true);
            return;
        }

        const startTime = $row.find('.start_time_pair').val();
        const endTime = $row.find('.end_time_pair').val();
        let tutorId = "";
        let duration = "";
        const $errorSpan = $row.find('.error-message');
        let class_detail_id = null;

        const dayOfWeek = $row.find('.day_of_week_pair').val();
        if (isEditForm) {
            //Edit Class Form
            if (dayOfWeek == '') {
                timeErr = true;
                $errorSpan.text(''); // clear
                resolve(true);
                return;
            } else {
                tutorId = $('#tutor_id').data('id') || '';
                duration = parseInt($('#duration').data('duration')) || 0;
                class_detail_id = $row.find('.class_detail_id_pair').val();
                console.log(class_detail_id)
            }
        } else {
            //Add Class Form
            tutorId = $('.tutor_id').val();
            duration = $('.duration').val();
        }
        $errorSpan.text(''); // clear first



        if (!tutorId || !dayOfWeek || !duration) {
            $errorSpan.text("Please select Tutor, Day of Week and Duration first.");
            timeErr = false;
            return;
        } else if (!startTime) {
            $errorSpan.text("Start time is required.");
            timeErr = false;
            return;
        } else if (!isEndAfterStart(startTime, endTime)) {
            $errorSpan.text("End time must be later than start time.");
            timeErr = false;
            return;
        }

        const currentIndex = $row.index();
        let isDuplicate = false;
        let isOverlap = false;

        $('.day-time-pair').each(function (i) {
            if (i === currentIndex) return; // skip self
            const otherDay = $(this).find('.day_of_week_pair').val();
            const otherStart = $(this).find('.start_time_pair').val();
            const otherEnd = $(this).find('.end_time_pair').val();

            if (dayOfWeek && otherDay && dayOfWeek === otherDay) {
                // Compare time ranges if same day
                const parseTime = (t) => {
                    if (!t) return null;
                    const [time, modifier] = t.split(' ');
                    let [hours, minutes] = time.split(':').map(Number);
                    if (modifier === 'PM' && hours !== 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                };

                const startA = parseTime(startTime);
                const endA = parseTime(endTime);
                const startB = parseTime(otherStart);
                const endB = parseTime(otherEnd);

                if (startA != null && endA != null && startB != null && endB != null) {
                    // Check for exact same time slot
                    if (startA === startB && endA === endB) {
                        isDuplicate = true;
                    }
                    // Check overlap: A starts before B ends AND A ends after B starts
                    if (startA < endB && endA > startB) {
                        isOverlap = true;
                    }
                }
            }
        });

        if (isDuplicate) {
            $errorSpan.text("Duplicate day and time found in another row.");
            timeErr = false;
            return;
        }
        if (isOverlap) {
            $errorSpan.text("Time overlaps with another session on the same day.");
            timeErr = false;
            return;
        }

        // --- AJAX validation (with server) ---
        $.ajax({
            url: '/class/validate_class_time',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                tutor_id: tutorId,
                class_detail_id: class_detail_id
            }),
            success: function (response) {
                if (!response.valid) {
                    $errorSpan.text("The selected time conflicts with the tutor’s schedule.");
                    timeErr = false;
                    resolve(false);
                }
                timeErr = true;
                resolve(true);
            },
            error: function () {
                $errorSpan.text("Unable to validate selected time.");
                timeErr = false;
                resolve(false);
            }
        });
    });
}

// Initialize flatpickr dynamically for each row
function initializeTimePickers() {
    $('.start_time_pair').each(function () {
        const $this = $(this);
        if (!$this.data('flatpickr')) {
            const $row = $this.closest('.uk-grid');
            flatpickr(this, {
                enableTime: true,
                noCalendar: true,
                dateFormat: "h:i K",
                time_24hr: false,
                onChange: function (selectedDates) {
                    updateEndTimeAuto(selectedDates[0], $row);
                    validateRowTime($row); // validate only this row
                }
            });
        }
    });

    $('.end_time_pair').each(function () {
        const $this = $(this);
        $this.prop('readonly', true);
        $this.css({
            'background-color': '#f8f8f8',
            'cursor': 'not-allowed'
        });
    });
}

function isEndAfterStart(start, end) {
    // Convert "h:i K" format (e.g., "3:30 PM") to comparable 24-hour minutes
    const startDate = new Date(`1970-01-01 ${start}`);
    const endDate = new Date(`1970-01-01 ${end}`);
    return endDate > startDate;
}

function updateEndTime() {
    const startTimeStr = $('.start_time').val();
    const durationMinutes = parseInt($('.duration').val());

    if (!startTimeStr || isNaN(durationMinutes)) return;

    // Parse start time
    const startDate = new Date(`1970-01-01 ${startTimeStr}`);
    if (isNaN(startDate)) return;

    // Add duration in minutes
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);

    // Format back to "h:i K" (12-hour)
    let hours = startDate.getHours();
    const minutes = startDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 -> 12
    const endTimeStr = `${hours}:${minutes} ${ampm}`;

    $('.end_time').val(endTimeStr).trigger('blur'); // trigger validation
}
