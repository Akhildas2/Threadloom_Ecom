(function ($) {
    "use strict";

    /*Sale statistics Chart*/
    if ($('#myChart').length) {
        var ctx = document.getElementById('myChart');
        var chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',

            // The data for our dataset
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Sales',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(44, 120, 220, 0.2)',
                    borderColor: 'rgba(44, 120, 220)',
                    data: [18, 17, 4, 3, 2, 20, 25, 31, 25, 22, 20, 9]
                },
                {
                    label: 'Visitors',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(4, 209, 130, 0.2)',
                    borderColor: 'rgb(4, 209, 130)',
                    data: [40, 20, 17, 9, 23, 35, 39, 30, 34, 25, 27, 17]
                },
                {
                    label: 'Products',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(380, 200, 230, 0.2)',
                    borderColor: 'rgb(380, 200, 230)',
                    data: [30, 10, 27, 19, 33, 15, 19, 20, 24, 15, 37, 6]
                }

                ]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                        },
                    }
                }
            }
        });
    } //End if

    /*Sale statistics Chart*/
    if ($('#myChart2').length) {
        var ctx = document.getElementById("myChart2").getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: "Sales",
                    backgroundColor: "#5897fb",
                    barThickness: 30,
                    data: salesArray,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const dataIndex = context.dataIndex;
                                const dateString = dates[dataIndex];
                                return `${context.dataset.label}: ${context.formattedValue} (${dateString})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } //end if

})(jQuery);