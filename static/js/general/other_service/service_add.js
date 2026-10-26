// =============================
// Validation State Variables
// =============================
var serviceTypeErr = true,
    feeTypeErr = true,
    feeErr = false,
    nameErr = true,
    descriptionErr = true;

$(document).ready(function () {

    const $form = $('#service-form');
    const $addBtn = $('button[type="submit"]');
    const mode = $form.data('mode'); // 'add' or 'edit'

    // =============================
    // Initialization for Edit Mode
    // =============================
    if (mode === 'edit') {
        if ($('.service_type').val()) serviceTypeErr = false;
        if ($('.fee_type').val()) feeTypeErr = false;
        if ($('.name').val().trim() !== '') nameErr = false;
        if ($('.description').val().trim() !== '') descriptionErr = false;

        const monthly = $('.fee_per_month').val();
        const att = $('.fee_per_att').val();
        const dep = $('.deposit_fee').val();

        if ((monthly || att || dep) && validateNumber(monthly || att || dep, 0.01, 9999.99, true) == null) {
            feeErr = false;
        }

        handleFeeTypeUI($('.fee_type').val()); // apply initial fee type UI
    }

    updateAddBtnState(); // initial button check

    // =============================
    // Helper Functions
    // =============================

    function updateAddBtnState() {
        const allFieldsValid = checkAllValid();
        $addBtn.prop('disabled', !allFieldsValid);
    }

    function checkAllValid() {
        return !(
            serviceTypeErr ||
            feeTypeErr ||
            feeErr ||
            nameErr ||
            descriptionErr
        );
    }

    // =============================
    // Input Validation Handlers
    // =============================

    $('input, textarea').on('blur input', function () {
        const $input = $(this);

        if ($input.prop('disabled')) return; // skip disabled inputs

        if ($input.hasClass('name')) {
            const val = $input.val().trim();
            if (val === '') {
                showError($input, "Service Name is required");
                nameErr = true;
            } else {
                clearError($input);
                nameErr = false;
            }
        }

        if ($input.hasClass('description')) {
            const val = $input.val().trim();
            if (val === '') {
                showError($input, "Description is required");
                descriptionErr = true;
            } else {
                clearError($input);
                descriptionErr = false;
            }
        }

        if ($input.hasClass('fee_per_month')) {
            validateFeeInput($input, "Fee Per Month");
        }

        if ($input.hasClass('fee_per_att')) {
            validateFeeInput($input, "Fee Per Attendance");
        }

        if ($input.hasClass('deposit_fee')) {
            validateFeeInput($input, "Deposit Fee");
        }

        updateAddBtnState();
    });

    // Generic fee validation helper
    function validateFeeInput($input, label) {
        const val = $input.val();
        if ($input.prop('disabled')) {
            clearError($input);
            return; // skip disabled fields
        }

        let errMsg = validateNumber(val, 0.01, 9999.99, true, label);

        if (errMsg != null) {
            showError($input, errMsg);
            feeErr = true;
        } else {
            clearError($input);
            feeErr = false;
        }
    }

    // =============================
    // Select Dropdown Validation + Fee Type Handling
    // =============================

    $('select').on('change blur', function () {
        const $select = $(this);
        const val = $select.val();

        // Service Type
        if ($select.hasClass('service_type')) {
            if (!val) {
                showError($select, "Service Type is required");
                serviceTypeErr = true;
            } else if (!['1', '2', '3'].includes(val)) {
                showError($select, "Invalid Service Type");
                serviceTypeErr = true;
            } else {
                clearError($select);
                serviceTypeErr = false;
            }
        }

        // Fee Type
        if ($select.hasClass('fee_type')) {
            if (!val) {
                showError($select, "Fee Type is required");
                feeTypeErr = true;
            } else if (!['1', '2'].includes(val)) {
                showError($select, "Invalid Fee Type");
                feeTypeErr = true;
            } else {
                clearError($select);
                feeTypeErr = false;
            }

            handleFeeTypeUI(val); // ✅ call handler after any change
        }

        updateAddBtnState();
    });

    // =============================
    // Handle Fee Type Change (Main Logic)
    // =============================
    function handleFeeTypeUI(feeType) {
        const $deposit = $('.deposit_fee');
        const $monthly = $('.fee_per_month');
        const $attendance = $('.fee_per_att');

        if (feeType === '1') {
            // Pay Direct → disable deposit & attendance
            $deposit.val('').prop('disabled', true).closest('.form-group').addClass('disabled');
            $attendance.val('').prop('disabled', true).closest('.form-group').addClass('disabled');
            $monthly.prop('disabled', false).closest('.form-group').removeClass('disabled');
            clearError($deposit);
            clearError($attendance);
        } else if (feeType === '2') {
            // Deposit + Per Attendance → disable monthly
            $monthly.val('').prop('disabled', true).closest('.form-group').addClass('disabled');
            $deposit.prop('disabled', false).closest('.form-group').removeClass('disabled');
            $attendance.prop('disabled', false).closest('.form-group').removeClass('disabled');
            clearError($monthly);
        } else {
            // ✅ No fee type selected → disable all three fields
            $deposit.val('').prop('disabled', true).closest('.form-group').addClass('disabled');
            $attendance.val('').prop('disabled', true).closest('.form-group').addClass('disabled');
            $monthly.val('').prop('disabled', true).closest('.form-group').addClass('disabled');

            clearError($deposit);
            clearError($attendance);
            clearError($monthly);
        }

        // Re-validate only enabled fee fields
        $('.deposit_fee, .fee_per_att, .fee_per_month').each(function () {
            if (!$(this).prop('disabled')) $(this).trigger('blur');
        });
    }

    // =============================
    // Handle Form Submit (AJAX)
    // =============================

    $form.on('submit', function (e) {
        e.preventDefault();

        // Trigger validation before submission
        $('.name, .description, .service_type, .fee_type, .deposit_fee, .fee_per_month, .fee_per_att').trigger('blur');

        if (!checkAllValid()) {
            showErrorAlert('Validation Error', 'Please fix all validation errors before submitting.');
            return;
        }

        // Gather form data
        const payload = {
            name: $('.name').val(),
            description: $('.description').val(),
            service_type: $('.service_type').val(),
            fee_type: $('.fee_type').val(),
            deposit_fee: $('.deposit_fee').prop('disabled') ? null : $('.deposit_fee').val(),
            fee_per_month: $('.fee_per_month').prop('disabled') ? null : $('.fee_per_month').val(),
            fee_per_att: $('.fee_per_att').prop('disabled') ? null : $('.fee_per_att').val()
        };

        // Determine URL
        const service_id = $('input[name="service_id"]').val();
        let url = '/service/add';
        if (mode === 'edit' && service_id) {
            url = `/service/detail/${service_id}`;
        }

        // AJAX Request
        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                if (response.status === 'error') {
                    showErrorAlert(response.title, response.message);
                } else if (response.status === 'success') {
                    showSuccessAlert(response.title, response.message, response.redirectUrl);

                    if (mode === 'add') {
                        $form[0].reset();
                        $('.select2').val(null).trigger('change');
                        serviceTypeErr = true;
                        feeTypeErr = true;
                        feeErr = false;
                        nameErr = true;
                        descriptionErr = true;
                        updateAddBtnState();
                        handleFeeTypeUI(null);
                    }
                }
            },
            error: function () {
                showErrorAlert('Error', 'An unexpected error occurred. Please try again.');
            }
        });
    });

    // =============================
    // Utility: Initial Trigger for Edit Mode
    // =============================
    if (mode === 'edit') {
        $('.name, .description, .service_type, .fee_type, .deposit_fee, .fee_per_month, .fee_per_att').each(function () {
            $(this).trigger('blur');
        });
    }

});
