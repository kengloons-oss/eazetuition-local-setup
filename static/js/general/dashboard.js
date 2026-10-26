let revenueChart = null;
let outstandingChart = null;
let serviceChart = null;

// =======================
// Revenue
// =======================
function loadRevenueChart() {
    const params = $("#revenueFilters").serialize();

    $.get("/dashboard/revenue/data", params, function (res) {
        const $canvas = $("#revenueChart");

        // Destroy chart first
        if (revenueChart) {
            revenueChart.destroy();
            revenueChart = null;
        }

        // =========================
        // NO DATA
        // =========================
        if (!res.chart.labels.length) {

            // replace canvas with "no data"
            $canvas.replaceWith(`<div id="revenueChart" class="no-data-msg">No data found</div>`);

            // summary stays 0
            $("#revenueSummary").html(`
                <div class="uk-grid-small uk-child-width-1-4" uk-grid>
                    <div>
                        <div class="summary-box">
                            <h4>Total Revenue</h4>
                            <p><strong>RM 0.00</strong></p>
                        </div>
                    </div>

                    <div>
                        <div class="summary-box">
                            <h4>Average Per Student</h4>
                            <p><strong>RM 0.00</strong></p>
                        </div>
                    </div>
                </div>
            `);

            return;
        }

        // =========================
        // HAS DATA
        // =========================

        // restore canvas (IMPORTANT: replace inner element only)
        $canvas.replaceWith(`<canvas id="revenueChart"></canvas>`);

        const ctx = document.getElementById("revenueChart").getContext("2d");

        const month = $("select[name='rev_month']").val();
        const year = $("select[name='rev_year']").val();
        const titleText = buildChartTitle("Revenue Summary Report", month, year);

        $("#revenueSummary").html(`
            <div class="uk-grid-small uk-child-width-1-4" uk-grid>
                <div>
                    <div class="summary-box">
                        <h4>Total Revenue</h4>
                        <p><strong>RM ${formatRM(res.summary.total_revenue)}</strong></p>
                    </div>
                </div>

                <div>
                    <div class="summary-box">
                        <h4>Average Per Student</h4>
                        <p><strong>RM ${formatRM(res.summary.avg_revenue_per_student)}</strong></p>
                    </div>
                </div>
            </div>
        `);

        revenueChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: res.chart.labels,
                datasets: [{
                    label: "Revenue (RM)",
                    data: res.chart.revenue,
                    fill: false,
                    borderWidth: 2,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titleText,
                        font: { size: 16, weight: "600" },
                        padding: { top: 20, bottom: 10 }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
}



// =======================
// Outstanding Payment
// =======================
function loadOutstandingChart() {
    const params = $("#outstandingFilters").serialize();

    $.get("/dashboard/outstanding/data", params, function (res) {
        const $canvas = $("#outstandingChart");

        // destroy old chart
        if (outstandingChart) {
            outstandingChart.destroy();
            outstandingChart = null;
        }

        // ======================
        // NO DATA
        // ======================
        if (!res.chart.labels.length) {

            // replace canvas → no data
            $canvas.replaceWith(`<div id="outstandingChart" class="no-data-msg">No data found</div>`);

            // Summary stays empty (your logic)
            $("#outstandingSummary").html(`
                <div class="uk-grid-small uk-child-width-1-5" uk-grid>
                    <div>
                        <div class="summary-box">
                            <h4>Total Outstanding</h4>
                            <p><strong>RM 0.00</strong></p>
                        </div>
                    </div>

                    <div>
                        <div class="summary-box">
                            <h4>Unpaid (Qty)</h4>
                            <p><strong>0</strong></p>
                        </div>
                    </div>

                    <div>
                        <div class="summary-box">
                            <h4>Overdue (Qty)</h4>
                            <p><strong>0</strong></p>
                        </div>
                    </div>

                    <div>
                        <div class="summary-box">
                            <h4>Barred (Qty)</h4>
                            <p><strong>0</strong></p>
                        </div>
                    </div>
                </div>
            `);

            return;
        }

        // ======================
        // HAS DATA
        // ======================

        // Restore canvas
        $canvas.replaceWith(`<canvas id="outstandingChart"></canvas>`);
        const ctx = document.getElementById("outstandingChart").getContext("2d");

        const month = $("select[name='out_month']").val();
        const year = $("select[name='out_year']").val();
        const titleText = buildChartTitle("Outstanding Payment Report", month, year);

        // Summary normal
        $("#outstandingSummary").html(`
            <div class="uk-grid-small uk-child-width-1-5" uk-grid>
                <div>
                    <div class="summary-box">
                        <h4>Total Outstanding</h4>
                        <p><strong>RM ${formatRM(res.summary.total_outstanding)}</strong></p>
                    </div>
                </div>

                <div>
                    <div class="summary-box">
                        <h4>Unpaid (Qty)</h4>
                        <p><strong>${res.summary.unpaid_count}</strong></p>
                    </div>
                </div>

                <div>
                    <div class="summary-box">
                        <h4>Overdue (Qty)</h4>
                        <p><strong>${res.summary.overdue_count}</strong></p>
                    </div>
                </div>

                <div>
                    <div class="summary-box">
                        <h4>Barred (Qty)</h4>
                        <p><strong>${res.summary.barred_count}</strong></p>
                    </div>
                </div>
            </div>
        `);

        outstandingChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: res.chart.labels,
                datasets: [
                    { label: "Unpaid (RM)", data: res.chart.unpaid, borderWidth: 1 },
                    { label: "Overdue (RM)", data: res.chart.overdue, borderWidth: 1 },
                    { label: "Barred (RM)", data: res.chart.barred, borderWidth: 1 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titleText,
                        font: { size: 16, weight: "600" },
                        padding: { top: 20, bottom: 10 }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    });
}


// =======================
// Service Subscription Pie Chart
// =======================
function loadServiceChart() {
    const params = $("#serviceFilters").serialize();

    $.get("/dashboard/service-subscription/data", params, function (res) {
        const $canvas = $("#serviceChart");

        if (serviceChart) {
            serviceChart.destroy();
            serviceChart = null;
        }

        // ======================
        // NO DATA
        // ======================
        if (!res.chart.labels.length) {
            $canvas.replaceWith(`<div id="serviceChart" class="no-data-msg">No data found</div>`);

            $("#serviceSummary").html(`
                <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                    <div>
                        <div class="summary-box">
                            <h4>Total Subscriptions</h4>
                            <p><strong>0</strong></p>
                        </div>
                    </div>
                </div>
            `);
            return;
        }

        // ======================
        // HAS DATA
        // ======================

        $canvas.replaceWith(`<canvas id="serviceChart"></canvas>`);
        const ctx = document.getElementById("serviceChart").getContext("2d");

        const month = $("select[name='svc_month']").val();
        const year = $("select[name='svc_year']").val();
        const titleText = buildChartTitle("Top 5 Service Subscription", month, year);

        $("#serviceSummary").html(`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="summary-box">
                        <h4>Total Subscriptions</h4>
                        <p><strong>${res.summary.total_subscriptions}</strong></p>
                    </div>
                </div>
            </div>
        `);

        serviceChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: res.chart.labels,
                datasets: [{
                    data: res.chart.counts
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: titleText,
                        font: { size: 16, weight: "600" },
                        padding: { top: 20, bottom: 10 }
                    }
                }
            }
        });
    });
}



function buildChartTitle(reportName, month, year) {
    const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (month) {
        return `${reportName} for ${monthNames[month]} ${year}`;
    }
    return `${reportName} for ${year}`;
}

function formatRM(value) {
    return parseFloat(value || 0).toFixed(2);
}

// =======================
// Init
// =======================
$(document).ready(function () {
    loadRevenueChart();
    loadOutstandingChart();
    loadServiceChart();

    $("#revenueFilters select").on("change", function () {
        loadRevenueChart();
    });

    $("#outstandingFilters select").on("change", function () {
        loadOutstandingChart();
    });

    $("#serviceFilters select").on("change", function () {
        loadServiceChart();
    });
});