var studentErr = true,
    paymentErr = true,
    methodErr = true,
    receivedAmtErr = true;

$(document).ready(function () {
    const studentSelect = $(".student_id");
    const paymentSelect = $(".payment_id");
    const methodSelect = $(".payment_method");
    const receivedGroup = $("#received-group");
    const paymentDetailDiv = $("#payment_detail");
    const submitBtn = $("#payment-form button[type='submit']");
    const receivedInput = $(".received_amt");

    const paymentIdPre = $('input[name="payment_id"]').val();
    const studentIdPre = $('input[name="student_id"]').val();

    // ==========================
    // HANDLE PREFILLED PAYMENT
    // ==========================
    if (paymentIdPre && studentIdPre) {
        studentErr = false;
        paymentErr = false;
        methodErr = true;
        receivedAmtErr = true;

        receivedGroup.hide();
        methodSelect.prop("disabled", false);

        // Load payment details using hidden input
        loadPaymentDetails(paymentIdPre);

        // Fetch payment method
        $.getJSON(`/payment/get_payment/${paymentIdPre}`, function (data) {
            if (data.payment_method) {
                methodSelect.val(data.payment_method).trigger("change.select2");
                methodSelect.prop("disabled", false);
                methodErr = false;
                checkAllValid();
            }
        });
    }

    // ============================================================
    // INITIAL SETUP
    // ============================================================
    if (!paymentIdPre) {
        paymentSelect.prop("disabled", true);
        methodSelect.prop("disabled", true);
        receivedGroup.hide();
        submitBtn.prop("disabled", true);
    }

    // ============================================================
    // STUDENT CHANGE → FETCH UNPAID PAYMENTS
    // ============================================================
    studentSelect.on("change", function () {
        const studentId = $(this).val();
        if (!studentId) return;

        paymentSelect.empty().append(`<option value="" disabled selected>Loading...</option>`);
        paymentSelect.prop("disabled", true);
        methodSelect.prop("disabled", true);
        paymentDetailDiv.hide().empty();
        submitBtn.prop("disabled", true);
        receivedGroup.hide();

        $.getJSON(`/payment/get_unpaid/${studentId}`, function (data) {
            paymentSelect.empty();
            if (data.length === 0) {
                paymentSelect.append(`<option disabled>No unpaid payments found</option>`);
                return;
            }

            paymentSelect.append(`<option disabled selected>Select Payment</option>`);
            data.forEach(p => {
                paymentSelect.append(`
                    <option value="${p.payment_id}" 
                            data-final_amt="${p.final_amt}" 
                            data-discount_amt="${p.discount_amt}">
                        Payment #${p.payment_id} — RM${p.final_amt.toFixed(2)} 
                        (Created: ${p.created_datetime})
                    </option>
                `);
            });

            paymentSelect.prop("disabled", false);
        });
    });

    // ============================================================
    // PAYMENT CHANGE → LOAD PAYMENT DETAILS
    // ============================================================
    paymentSelect.on("change", function () {
        const paymentId = $(this).val();
        if (!paymentId) return;

        methodSelect.prop("disabled", true);
        paymentDetailDiv.hide().empty();
        receivedGroup.hide();
        submitBtn.prop("disabled", true);

        loadPaymentDetails(paymentId);

        methodSelect.prop("disabled", false);
    });

    // ============================================================
    // PAYMENT METHOD CHANGE
    // ============================================================
    methodSelect.on("change", function () {
        const val = $(this).val();
        if (val === "1") {
            receivedGroup.show();
            receivedAmtErr = true;
        } else {
            receivedGroup.hide();
            receivedAmtErr = false;
            $(".change-amount").text("0.00");
        }
        checkAllValid();
    });

    // ============================================================
    // RECEIVED AMOUNT VALIDATION + CHANGE CALCULATION
    // ============================================================
    $('input.received_amt').on('blur input', function () {
        const inputElement = $(this);
        const input = parseFloat(inputElement.val()) || 0;
        const method = $('.payment_method').val();

        // Handle prefilled or select-based payment
        let paymentEl = $('.payment_id option:selected');
        if (!paymentEl.length) {
            paymentEl = $('input[name="payment_id"]'); // hidden input for prefill
        }

        const finalAmt = parseFloat(paymentEl.data('final_amt')) || 0;
        let err = null;

        if (method === "1") {
            err = validateNumber(input, 0.01, 9999.99, true, "Received Amount");
            if (!err && input < finalAmt) {
                err = `Received amount (RM${input.toFixed(2)}) must be at least the total payable amount (RM${finalAmt.toFixed(2)}).`;
            }
            updateChangeAmount(input, finalAmt);
        } else {
            clearError(inputElement);
            receivedAmtErr = false;
            $(".change-amount").text("0.00");
            checkAllValid();
            return;
        }

        if (err) { showError(inputElement, err); receivedAmtErr = true; }
        else { clearError(inputElement); receivedAmtErr = false; }

        checkAllValid();
    });

    // ============================================================
    // SELECT CHANGE VALIDATION
    // ============================================================
    $('select').on('change blur', function () {
        const inputElement = $(this);
        if (inputElement.hasClass('student_id')) {
            const val = inputElement.val();
            if (!val) { showError(inputElement, "Student is required"); studentErr = true; }
            else { clearError(inputElement); studentErr = false; }
        }
        if (inputElement.hasClass('payment_id')) {
            const val = inputElement.val();
            if (!val) { showError(inputElement, "Payment is required"); paymentErr = true; }
            else { clearError(inputElement); paymentErr = false; }
        }
        if (inputElement.hasClass('payment_method')) {
            const val = inputElement.val();
            if (!val) { showError(inputElement, "Payment Method is required"); methodErr = true; }
            else if (val !== '1' && val !== '3') {
                showError(inputElement, "Payment method must be 'Cash' or 'Touch'n Go / Back Transfer"); methodErr = true;
            } else { clearError(inputElement); methodErr = false; }
        }
        checkAllValid();
    });

    // ============================================================
    // FINAL FORM SUBMISSION
    // ============================================================
    $('#payment-form').on('submit', function (event) {
        event.preventDefault();

        $('.student_id, .payment_id, .payment_method, .received_amt').trigger('blur');

        if (!checkAllValid()) {
            showErrorAlert('Validation Error', 'Please fill in all required fields correctly.');
            return;
        }

        const studentId = $('.student_id').length
            ? $('.student_id').val() || $('input[name="student_id"]').val()
            : $('input[name="student_id"]').val();

        const paymentId = $('.payment_id').length
            ? $('.payment_id').val() || $('input[name="payment_id"]').val()
            : $('input[name="payment_id"]').val();

        const paymentMethod = $('.payment_method').val();
        const receivedAmt = paymentMethod === "1" ? parseFloat($('.received_amt').val() || 0) : 0;

        const payload = { student_id: studentId, payment_id: paymentId, payment_method: paymentMethod, received_amount: receivedAmt };

        $.ajax({
            url: '/payment/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                if (response.status === 'error') showErrorAlert(response.title, response.message);
                else {
                    showSuccessAlert(response.title, response.message, response.redirectUrl);
                    $('#payment-form')[0].reset();
                    $('.select2').val(null).trigger('change');
                    $("#payment_detail").hide().empty();
                    $("#received-group").hide();
                    submitBtn.prop('disabled', true);
                    studentErr = paymentErr = methodErr = receivedAmtErr = true;
                }
            },
            error: function () { showErrorAlert('Error', 'An unexpected error occurred. Please try again.'); }
        });
    });

});

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function updateChangeAmount(received, total) {
    const diff = received - total;
    $(".change-amount").text(diff > 0 ? diff.toFixed(2) : "0.00");
}

function checkAllValid() {
    const method = $('.payment_method').val();
    const allValid = method === "1"
        ? !(studentErr || paymentErr || methodErr || receivedAmtErr)
        : !(studentErr || paymentErr || methodErr);
    $("#payment-form button[type='submit']").prop("disabled", !allValid);
    return allValid;
}

function loadPaymentDetails(paymentId) {
    // Prefill works for both hidden input or select
    let paymentEl = $(`.payment_id option[value="${paymentId}"]`);
    if (!paymentEl.length) paymentEl = $(`input[name="payment_id"][value="${paymentId}"]`);

    const finalAmt = parseFloat(paymentEl.data("final_amt")) || 0;
    const discountAmt = parseFloat(paymentEl.data("discount_amt")) || 0;
    const subTotal = finalAmt + discountAmt;
    console.log(paymentId);

    $.getJSON(`/payment/get_payment_details/${paymentId}`, function (data) {
        const paymentDetailDiv = $("#payment_detail");
        if (!data.length) { paymentDetailDiv.html("<p>No details available.</p>").show(); return; }

        let html = `<div class="receipt"><table class="receipt-table"><thead>
                        <tr><th>Description</th><th>Amount (RM)</th></tr>
                    </thead><tbody>`;

        data.forEach(d => {
            let name = d.class_name || d.service_name || "";
            let amount = d.class_fee || d.service_fee || 0;
            if (!d.class_name && d.fee_type === "2") name += " (Deposit)";
            if (!d.class_name && d.fee_type === "3" && d.service_attend_time) name += ` (${d.service_attend_time})`;
            html += `<tr><td>${name}</td><td>${parseFloat(amount).toFixed(2)}</td></tr>`;
        });

        html += `<tr class="receipt-divider"><td colspan="2"></td></tr>
                 <tr class="receipt-summary-row"><td>Subtotal</td><td>${subTotal.toFixed(2)}</td></tr>
                 <tr class="receipt-summary-row"><td>Discount</td><td>- ${discountAmt.toFixed(2)}</td></tr>
                 <tr class="receipt-total-row"><td><strong>Total Payable</strong></td>
                 <td class="final-amount"><strong>${finalAmt.toFixed(2)}</strong></td></tr>
                 <tr class="receipt-divider"><td colspan="2"></td></tr>
                 <tr class="receipt-summary-row receipt-change-row"><td>Changed Amount</td><td class="change-amount">0.00</td></tr>
                 </tbody></table></div>`;

        paymentDetailDiv.html(html).fadeIn(200);
    });
}
