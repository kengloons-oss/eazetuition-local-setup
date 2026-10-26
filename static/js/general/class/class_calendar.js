// ============================================================
//  class_calendar.js
//  Handles cascading dropdowns (Education Level → Package → Set → Tutor)
//  and dynamically loads the class session calendar via AJAX
// ============================================================
let CALENDAR_CURRENT_DATE = null;  // 用来全局记住当前月

$(document).ready(function () {
    console.log("[ClassCalendar] Initialized.");

    // ----------------------------------------------------
    // Utility: Reset and set placeholder for <select>
    // ----------------------------------------------------
    function resetSelect($select, placeholder) {
        $select.empty().append(`<option value="">${placeholder}</option>`);
    }

    // ----------------------------------------------------
    // 1️⃣ Education Level → Load Packages
    // ----------------------------------------------------
    $('#eduLevelSelect').on('change', function () {
        const edu_lvl_id = $(this).val();
        console.log(`[ClassCalendar] Selected edu_lvl_id = ${edu_lvl_id}`);

        resetSelect($('#packageSelect'), '-- Select Package --');
        resetSelect($('#setSelect'), '-- Select Set --');
        resetSelect($('#tutorSelect'), '-- Select Tutor --');
        $('#classSessionCalendar').empty();

        if (!edu_lvl_id) return;

        $.ajax({
            url: `/class/session/get_packages/${edu_lvl_id}`,
            method: 'GET',
            success: function (data) {
                console.log('[ClassCalendar] Packages loaded:', data);
                data.forEach(pkg => {
                    $('#packageSelect').append(
                        `<option value="${pkg.package_id}">${pkg.name}</option>`
                    );
                });
            },
            error: function (xhr, status, error) {
                console.error('[ClassCalendar] Failed to load packages:', error);
            }
        });

        loadCalendar(null, null);
    });

    // ----------------------------------------------------
    // 2️⃣ Package → Load Sets
    // ----------------------------------------------------
    $('#packageSelect').on('change', function () {
        const package_id = $(this).val();
        console.log(`[ClassCalendar] Selected package_id = ${package_id}`);

        resetSelect($('#setSelect'), '-- Select Set --');
        resetSelect($('#tutorSelect'), '-- Select Tutor --');
        $('#classSessionCalendar').empty();

        if (!package_id) return;

        $.ajax({
            url: `/class/session/get_sets/${package_id}`,
            method: 'GET',
            success: function (data) {
                console.log('[ClassCalendar] Sets loaded:', data);
                data.forEach(set => {
                    $('#setSelect').append(
                        `<option value="${set.set_id}">${set.name}</option>`
                    );
                });
            },
            error: function (xhr, status, error) {
                console.error('[ClassCalendar] Failed to load sets:', error);
            }
        });

        loadCalendar(null, null);
    });

    // ----------------------------------------------------
    // 3️⃣ Set → Load Tutors + Calendar
    // ----------------------------------------------------
    $('#setSelect').on('change', function () {
        const set_id = $(this).val();
        console.log(`[ClassCalendar] Selected set_id = ${set_id}`);

        resetSelect($('#tutorSelect'), '-- Select Tutor --');
        $('#classSessionCalendar').empty();

        if (!set_id) return;

        // Load tutors
        $.ajax({
            url: `/class/session/get_tutors/${set_id}`,
            method: 'GET',
            success: function (data) {
                console.log('[ClassCalendar] Tutors loaded:', data);
                data.forEach(t => {
                    $('#tutorSelect').append(
                        `<option value="${t.tutor_id}">${t.name}</option>`
                    );
                });
            },
            error: function (xhr, status, error) {
                console.error('[ClassCalendar] Failed to load tutors:', error);
            }
        });

        // Load calendar for this set (no tutor filter yet)
        loadCalendar(set_id, null);
    });

    // ----------------------------------------------------
    // 4️⃣ Tutor → Filter Calendar
    // ----------------------------------------------------
    $('#tutorSelect').on('change', function () {
        const set_id = $('#setSelect').val();
        const tutor_id = $(this).val();
        if (!set_id) return;
        loadCalendar(set_id, tutor_id);
    });

    // ----------------------------------------------------
    // 5️⃣ Helper: Load Calendar Partial via AJAX
    // ----------------------------------------------------
    function loadCalendar(set_id, tutor_id = null) {
        let url = `/class/session/load_calendar?set_id=${set_id || ''}`;
        if (tutor_id) url += `&tutor_id=${tutor_id}`;

        console.log(`[ClassCalendar] Loading calendar: ${url}`);
        $.ajax({
            url: url,
            method: 'GET',
            beforeSend: function () {
                $('#classSessionCalendar').html('<div class="text-center p-3"><em>Loading calendar...</em></div>');
            },
            success: function (html) {
                $('#classSessionCalendar').html(html);

                // Check if calendar div exists before initializing
                if ($('#calendar').length) {
                    let eventsData = [];
                    try {
                        const eventsAttr = $('#calendar').attr('data-events'); // <-- use attr() here
                        eventsData = eventsAttr ? JSON.parse(eventsAttr) : [];
                    } catch (e) {
                        console.error("Failed to parse events JSON", e);
                    }

                    const calendarTutorId = $('#calendar').attr('data-tutor-id') || null;

                    initializeCalendar(eventsData);

                    if (CALENDAR_CURRENT_DATE) {
                        const calendarInstance = $('#calendar').data('tuiCalendarInstance');
                        if (calendarInstance) {
                            calendarInstance.setDate(CALENDAR_CURRENT_DATE);
                        }
                    }
                    
                    if (calendarTutorId) {
                        // 再次绑定 tutor 下拉（第二轮 reload）
                        $('#tutorSelect').val(calendarTutorId);
                    }
                }

            },
            error: function (xhr, status, error) {
                console.error('[ClassCalendar] Failed to load calendar:', error);
                $('#classSessionCalendar').html('<div class="text-danger text-center p-3">Failed to load calendar.</div>');
            }
        });
    }

    function initializeCalendar(eventsData = []) {
        const calendarEl = document.querySelector('#calendar');
        if (!calendarEl) return; // Avoid error if calendar div doesn't exist

        const calendar = new tui.Calendar('#calendar', {
            defaultView: 'month',
            isReadOnly: false,
            useCreationPopup: false,
            useDetailPopup: true,
            month: { startDayOfWeek: 1, },
            calendars: [
                { id: '0', name: 'Cancelled', backgroundColor: '#d9534f', borderColor: '#007bff' },
                { id: '1', name: 'Pending', backgroundColor: '#f5a623', borderColor: '#007bff' },
                { id: '2', name: 'Ongoing', backgroundColor: '#007bff', borderColor: '#50c878' },
                { id: '3', name: 'Completed', backgroundColor: '#50c878', borderColor: '#50c878' },
            ],
            gridSelection: { enableDblClick: false, enableClick: true },
        });

        // Templates
        calendar.setOptions({
            template: {
                popupDetailTitle({ title }) { return `<strong>${title}</strong>`; },
                popupDetailBody({ body, raw, calendarId, isAllDay }) {
                    console.log('hi')
                    const r = raw || {};
                    return `
                        <div><strong>Class Type:</strong> ${r.class_type + ' Class' || 'N/A'}</div>
                        <div><strong>Class Session:</strong> ${r.type || 'N/A'}</div>
                    `;
                },
                popupEdit() { return 'View Attendances'; },
                popupDelete() { return 'Cancel Class'; },
            },
        });

        if (Array.isArray(eventsData) && eventsData.length > 0) {
            calendar.createEvents(eventsData);
        }

        function updateRange() {
            const date = calendar.getDate();
            const rangeEl = document.querySelector('.navbar--range');
            if (rangeEl) {
                rangeEl.textContent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
        }

        if (CALENDAR_CURRENT_DATE) {
            calendar.setDate(CALENDAR_CURRENT_DATE);
        }
        updateRange();

        // Navigation buttons (only if exist)
        const todayBtn = document.querySelector('.today');
        const prevBtn = document.querySelector('.prev');
        const nextBtn = document.querySelector('.next');
        if (todayBtn) todayBtn.addEventListener('click', () => { calendar.today(); CALENDAR_CURRENT_DATE = calendar.getDate(); updateRange(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { calendar.prev(); CALENDAR_CURRENT_DATE = calendar.getDate(); updateRange(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { calendar.next(); CALENDAR_CURRENT_DATE = calendar.getDate(); updateRange(); });

        const backBtn = document.querySelector('.back-to-month');
        function updateBackToMonthButtonVisibility() {
            if (backBtn) backBtn.style.display = calendar.getViewName() === 'day' ? 'inline-block' : 'none';
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                calendar.changeView('month');
                updateRange();
                updateBackToMonthButtonVisibility();
            });
        }

        // Switch to day view on date click
        calendar.on('selectDateTime', (info) => {
            calendar.changeView('day');
            calendar.setDate(info.start);
            updateRange();
            updateBackToMonthButtonVisibility();
        });

        // View attendance
        calendar.on('beforeUpdateEvent', (event) => {
            if (event.event && event.event.id) {
                window.location.href = "/attendance/detail/" + event.event.id;
            }
        });

        // Cancel class
        calendar.on('beforeDeleteEvent', (event) => {
            const eventId = event.id;
            const eventStatus = event.raw.status;
            const formattedId = `CS${eventId.toString().padStart(4, '0')}`;

            if (eventStatus === "Pending") {
                Swal.fire({
                    title: "Cancel Class",
                    text: `Are you sure to cancel class session ${formattedId}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: "Yes"
                }).then((result) => {
                    if (result.isConfirmed) {
                        loadingAlert(); // show loading spinner
                        $.post(`/class/session/cancel?id=${eventId}`, function (res) {
                            Swal.close(); // close loading
                            if (res.success) {
                                showActionSuccessAlert('Success', `Class ${formattedId} has been canceled.`);
                            } else {
                                showErrorAlert('Error', `Class ${formattedId} could not be canceled. ${res.message}`);
                            }
                        });
                    }
                });
            } else {
                showErrorAlert('Error', "The class session already passed or was canceled.");
            }
        });



        updateBackToMonthButtonVisibility();
        calendarEl._calendarInstance = calendar;

    }

    // Initial load (empty calendar)
    loadCalendar(null, null);
});
