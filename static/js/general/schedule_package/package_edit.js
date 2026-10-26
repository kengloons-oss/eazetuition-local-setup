$(document).ready(function () {

    // ============================
    // 1: Toggle package set sections (Edit page)
    // ============================
    $('.card-body').on('click', '.toggle-header', function (e) {
        if ($(e.target).is('input')) return;

        const $content = $(this).next('.pkg-content');
        const $icon = $(this).children('.toggle-icon'); // 🔥 more direct

        $content.slideToggle(200);

        // toggle after animation completes
        $content.promise().done(() => {
            $icon.text($content.is(':visible') ? '▼' : '▶');
        });
    });


    // ============================================================
    // 2: Registration Status Toggle + Update Form Logic
    // ============================================================
    const $form = $('#package-edit--form');
    const $updateBtn = $form.find('button[type="submit"]');
    const $resetBtn = $('#resetBtn');
    const $statusToggle = $('#is_open_for_enrollment');

    // Store initial toggle state from backend (checked / not checked)
    $statusToggle.data('original', $statusToggle.is(':checked'));

    // When user changes toggle
    $statusToggle.on('change', function () {
        const original = $(this).data('original');
        const current = $(this).is(':checked');

        // Enable update button if changed, disable if reverted
        if (original !== current) {
            $updateBtn.prop('disabled', false);
        } else {
            $updateBtn.prop('disabled', true);
        }
    });


    // ============================================================
    // 3: Handle Reset Button
    // ============================================================
    $resetBtn.on('click', function () {
        // Revert toggle to original state
        const original = $statusToggle.data('original');
        $statusToggle.prop('checked', original);

        // Disable update button again
        $updateBtn.prop('disabled', true);
    });


    // ============================================================
    // 4: Handle Form Submission (separate from Add Form)
    // ============================================================
// ============================================================
// 4: Handle Form Submission (separate from Add Form)
// ============================================================
$form.on('submit', function (e) {
    e.preventDefault();

    const original = $statusToggle.data('original');
    const current = $statusToggle.is(':checked');

    // No change → don't submit
    if (original === current) {
        alert('No changes detected in registration status.');
        return;
    }

    const title = "Edit Confirmation";
    const message = "Are you sure you want to update this package?";

    // Confirmation first
    showWarningAlert(title, message).then((confirmed) => {
        if (!confirmed) {
            return; // user cancelled
        }

        const packageId = $('input[name="package_id"]').val();
        const formData = {
            package_id: packageId,
            is_open_for_enrollment: current ? 1 : 0
        };


        $.ajax({
            url: window.location.pathname, // e.g., /schedule_package/edit/<id>
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (response) {
                if (response.status === 'success') {
                    showSuccessAlert(response.title, response.message, response.redirectUrl);

                    // Reset original state to the new value
                    $statusToggle.data('original', current);
                    $updateBtn.prop('disabled', true);
                } else {
                    showErrorAlert(response.title, response.message);
                }
            },
            error: function (xhr) {
                console.error(xhr.responseText);
                showErrorAlert(response.title, response.message);
            }
        });
    });
});

});
