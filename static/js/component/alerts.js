function showSuccessAlert(title, msg, redirectUrl = null) {
    Swal.fire({
        icon: 'success',
        title: title,
        html: msg,
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonText: 'Back to List',
        reverseButtons: true // optional: puts "Back to List" on the left
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel && redirectUrl) {
            window.location.href = redirectUrl;
        }
    });
}


function showErrorAlert(title, msg, redirectUrl = null) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: msg,
        confirmButtonText: 'OK'
    }).then((result) => {
        if (result.isConfirmed && redirectUrl) {
            window.location.href = redirectUrl;
        }
    });
}

function showWarningAlert(title, msg) {
    return Swal.fire({
        icon: 'warning',
        title: title,
        html: msg,
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
    }).then((result) => {
        return result.isConfirmed;
    });
}


function showActionSuccessAlert(title, msg) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: msg,
        showCancelButton: false,
        confirmButtonText: 'OK'
    });
}

function loadingAlert(title = "Processing...") {
    // Show loading spinner immediately
    Swal.fire({
        title: 'Processing...',
        html: `
            <div style="display: flex; justify-content: center; align-items: center; margin:10px 0px;">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="10" style="width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;">
                    <circle cx="50" cy="50" r="40" stroke="#3FC3EE" stroke-opacity="0.5" />
                    <circle cx="50" cy="50" r="40" stroke="#3FC3EE" stroke-dasharray="251.2" stroke-dashoffset="0" stroke-linecap="round">
                        <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50"/>
                        <animate attributeName="stroke-dashoffset" repeatCount="indefinite" dur="2.5s" values="880;0"/>
                    </circle>
                </svg>
            </div>
        `,
        showConfirmButton: false, // Hide confirm button
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false
    });
}

