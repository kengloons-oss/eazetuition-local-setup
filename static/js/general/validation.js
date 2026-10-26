// For validate text (Eg. name, title, address)
function validateText(text, required = true, field, short = true) {
    // 'field' is for the input field to mention in the message
    // 'short' means is verify for short text (not exceed 50 characters)

    if (text.length === 0) {
        if (required) {
            return field + ' is required';
        }
    }
    else if (short && text.length > 50) {
        return field + ' must not exceed 50 characters'
    }
    else if (!short && text.length > 300) {
        return field + ' must not exceed 300 characters'
    }

    return null;
}

// For validate number with limit range (Eg. membership level. price)
function validateNumber(num, min, max, required = true, field) {

    if (!num || isNaN(num)) {

        if (required) {
            return field + ' is required';
        }
    }
    else if (num < min || num > max) {
        return field + " must between " + min + ' and ' + max + ' only';
    }

    return null;
}

//====================================================
// Helper Function to Show & Clear Error
//====================================================
function showError(input, message) {
    input.siblings('span.error-message')
        .text(message)
        .fadeIn()
        .parent('.form-group')
        .addClass('hasError');
}

// Helper Function to Clear Error
function clearError(input) {
    input.siblings('span.error-message')
        .text('')
        .fadeOut()
        .parent('.form-group')
        .removeClass('hasError');
}

//====================================================
// General Validation code
//====================================================
var nameErr = true,
    descriptionErr = true,
    feeErr = true,
    eduLvlErr = true;

$(document).ready(function () {
    // Form validation
    $('input, textarea').on('blur input', function () {
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

        if ($(this).hasClass('description')) {

            const inputElement = $(this);
            var input = $(this).val();

            var err = validateText(input, true, "Description", false);

            if (err != null) {
                showError(inputElement, err);
                descriptionErr = true;
            }
            else {
                clearError(inputElement);
                descriptionErr = false;
            }
        }

        if ($(this).hasClass('normal_class_fee')) {
            var input = $(this).val();
            var inputElement = $(this);


            let err = validateNumber(input, 0.01, 9999.99, true, "Normal Class Fee");

            if (err != null) {
                showError(inputElement, err);
                feeErr = true;
            }
            else {
                clearError(inputElement);
                feeErr = false;
            }
        }

        if ($(this).hasClass('focus_class_fee')) {
            var input = $(this).val();
            var inputElement = $(this);


            let err = validateNumber(input, 0.01, 9999.99, true, "Focus Class Fee");

            if (err != null) {
                showError(inputElement, err);
                feeErr = true;
            }
            else {
                clearError(inputElement);
                feeErr = false;
            }
        }

        if ($(this).hasClass('material_fee')) {
            var input = $(this).val();
            var inputElement = $(this);


            let err = validateNumber(input, 0.01, 9999.99, true, "Material Fee");

            if (err != null) {
                showError(inputElement, err);
                feeErr = true;
            }
            else {
                clearError(inputElement);
                feeErr = false;
            }
        }
    });

    $('select').on('change blur', function () {
        const inputElement = $(this);

        if (inputElement.hasClass('edu_lvl_id')) {
            const selectedVal = inputElement.val();
            console.log(selectedVal);

            if (!selectedVal) {
                showError(inputElement, "Education Level is required");
                eduLvlErr = true;
            } else {
                // Optional AJAX check if ID is valid
                $.ajax({
                    url: '/education/validate_edu_lvl',  // Flask route to validate ID
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ edu_lvl_id: selectedVal }),
                    success: function (response) {
                        if (response.valid) {
                            clearError(inputElement);
                            eduLvlErr = false;
                        } else {
                            showError(inputElement, "Invalid Education Level selected");
                            eduLvlErr = true;
                        }
                    },
                    error: function () {
                        showError(inputElement, "Unable to validate Education Level");
                        eduLvlErr = true;
                    }
                });
            }
        }
    });

    $('input, textarea, select').on('blur input change', function () {
        setTimeout(() => {
            checkDuplicateSubject();
        }, 200);
    });


    $('form').submit(function (event) {
        if ($("input[type='file']").length) {
            return true;
        }
        event.preventDefault(); // Prevent default submission

        // Trigger blur on all fields to force re-validation
        $('.edu_lvl_id, .name, .description, .normal_class_fee, .focus_class_fee, .material_fee').trigger('blur');

        // Allow a slight delay to make sure all validation completes
        setTimeout(() => {
            if (!eduLvlErr && !nameErr && !descriptionErr && !feeErr) {
                HTMLFormElement.prototype.submit.call(this);
            }
        }, 100); // adjust delay if needed
    });

    function getSafeVal(selector) {
        const el = $(selector);
        return el.length ? (el.val() || "").trim() : "";
    }

    function checkDuplicateSubject() {
        let subject_id = getSafeVal("input[name='subject_id']"); // <— 新增！！

        let name = getSafeVal(".name");
        let edu_lvl_id = getSafeVal(".edu_lvl_id");
        let normal_fee = getSafeVal(".normal_class_fee");
        let focus_fee = getSafeVal(".focus_class_fee");
        let material_fee = getSafeVal(".material_fee");

        if (!name || !edu_lvl_id || !normal_fee || !focus_fee || !material_fee) {
            return;
        }

        $.ajax({
            url: "/subject/ajax/check-duplicate-subject",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                subject_id: subject_id,
                name: name,
                edu_lvl_id: edu_lvl_id,
                normal_fee: normal_fee,
                focus_fee: focus_fee,
                material_fee: material_fee
            }),
            success: function (res) {
                if (res.duplicate) {
                    showError($(".name"),
                        `This subject already exists with the same fees for this education level.`
                    );
                    nameErr = true;
                } else {
                    clearError($(".name"));
                    nameErr = false;
                }
            }
        });
    }
});

// back button
function back() {
    history.back();
}