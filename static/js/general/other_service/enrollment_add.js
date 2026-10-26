function fetchAvailableServices() {
    const student_id = $('.student_id').val();
    const service_type = $('.service_type').val();
    const serviceSelect = $('.service_id');
    const addressField = $('.address');

    // Always reset and disable initially
    serviceSelect.prop('disabled', true)
        .empty();
    serviceErr = true;
    addressField.val('');
    clearError(addressField);
    addressErr = true;
    updateSubmitButtonState();

    // Hide address by default
    addressField.closest('.form-group').hide();

    if (!student_id || !service_type) return;

    // Adjust UI per service type
    if (service_type === '2') {
        // Transport → single select, show address
        serviceSelect.prop('multiple', false);
        addressField.prop('disabled', false).closest('.form-group').show();
    } else {
        // Daycare / Other → multiple select, hide address
        serviceSelect.prop('multiple', true);
        addressField.prop('disabled', true).closest('.form-group').hide();
    }

    // Reinitialize select2
    serviceSelect.select2('destroy').select2({
        placeholder: 'Select Service'
    });

    $.ajax({
        url: `/service/available_services/${student_id}`,
        method: 'GET',
        data: { service_type },
        success: function (response) {
            const services = response.available_services;

            serviceSelect.empty();

            if (!services || services.length === 0) {
                showError(serviceSelect, "No available service for this student");
                serviceSelect.prop('disabled', true);
                serviceErr = true;
                updateSubmitButtonState();
                return;
            }

            clearError(serviceSelect);

            // Populate services
            services.forEach(s => {
                let feeInfo = "";
                if (s.fee_type === "per_month") feeInfo = `(RM ${s.service_fee_per_month}/month)`;
                else if (s.fee_type === "per_attend") feeInfo = `(RM ${s.service_fee_per_attend}/attend)`;

                serviceSelect.append(
                    `<option value="${s.service_id}">${s.name} ${feeInfo}</option>`
                );
            });

            serviceSelect.prop('disabled', false);
            serviceErr = true; // remain invalid until user picks one
            updateSubmitButtonState();

            // ✅ Force reset so validation re-checks for Transport
            if (service_type === '2') {
                serviceSelect.val('').trigger('change');
            }

            // Auto-open dropdown for better UX
            setTimeout(() => serviceSelect.select2('open'), 150);
        },
        error: function () {
            showError(serviceSelect, "Failed to fetch available services. Please try again.");
            serviceSelect.prop('disabled', true);
            serviceErr = true;
            updateSubmitButtonState();
        }
    });
}

var addressErr = true,
    studentErr = true,
    serviceErr = true;

// ✅ Unified helper for enabling/disabling submit
function updateSubmitButtonState() {
    const service_type = $('.service_type').val();
    const submitBtn = $('button[type="submit"]');
    const canSubmit =
        !studentErr &&
        !serviceErr &&
        (service_type !== '2' || !addressErr);

    submitBtn.prop('disabled', !canSubmit);
}

$(document).ready(function () {
    // React to student/service type changes
    $('.student_id').on('change', function () {
        const selectedVal = $(this).val();
        studentErr = !selectedVal;
        studentErr ? showError($(this), "Student is required") : clearError($(this));
        fetchAvailableServices();
        updateSubmitButtonState();
    });

    $('.service_type').on('change', function () {
        const selectedVal = $(this).val();
        if (!selectedVal) showError($(this), "Service type is required");
        else clearError($(this));
        fetchAvailableServices();
        updateSubmitButtonState();
    });

    // Hide address initially
    $('.address').closest('.form-group').hide();

    // ✅ Validate Service dropdown
    $('.service_id').on('change', function () {
        const selectedVals = $(this).val();
        serviceErr = !selectedVals || selectedVals.length === 0;
        serviceErr ? showError($(this), "Service is required") : clearError($(this));
        updateSubmitButtonState();
    });

    // ✅ Validate Address for transport only
    $('.address').on('blur input', function () {
        const inputElement = $(this);
        const service_type = $('.service_type').val();
        if (service_type === '2') {
            const err = validateText($(this).val(), true, "Address", false);
            if (err) {
                showError(inputElement, err);
                addressErr = true;
            } else {
                clearError(inputElement);
                addressErr = false;
            }
        } else {
            clearError(inputElement);
            addressErr = false;
        }
        updateSubmitButtonState();
    });

    // ✅ Final form submission
    $('form').on('submit', function (event) {
        event.preventDefault();

        const service_type = $('.service_type').val();
        $('.student_id').trigger('blur');
        $('.service_id').trigger('blur');
        if (service_type === '2') $('.address').trigger('blur');

        updateSubmitButtonState();

        if (studentErr || serviceErr || (service_type === '2' && addressErr)) {
            showErrorAlert('Validation Error', 'Please fill in all required fields correctly.');
            return;
        }

        const payload = {
            student_id: $('.student_id').val(),
            selectedServices: $('.service_id').val(),
            address: service_type === '2' ? $('.address').val() : null,
            service_type: service_type
        };

        $.ajax({
            url: '/service/enrollment/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                if (response.status === 'error') {
                    showErrorAlert(response.title, response.message);
                } else {
                    showSuccessAlert(response.title, response.message, response.redirectUrl);
                    $('form')[0].reset();
                    $('.select2').val(null).trigger('change');
                    $('.address').closest('.form-group').hide();
                    $('button[type="submit"]').prop('disabled', true);
                    studentErr = serviceErr = addressErr = true;
                }
            },
            error: function () {
                showErrorAlert('Error', 'An unexpected error occurred. Please try again.');
            }
        });
    });
});
