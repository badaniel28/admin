window.addEventListener('DOMContentLoaded', function () {
    const topButton = document.getElementById('myBtn');

    window.onscroll = function () {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            topButton.style.display = 'block';
        } else {
            topButton.style.display = 'none';
        }
    };

    window.topFunction = function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const navLinks = document.querySelectorAll('a.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const section = document.getElementById(targetId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const chartConfig = {
        borderWidth: 2,
        borderRadius: 8,
        backgroundColor: 'rgba(79, 176, 255, 0.35)',
        borderColor: 'rgba(79, 176, 255, 0.95)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#ffd43b'
    };

    function createChart(canvasId, type, data, options) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        return new Chart(canvas, { type, data, options });
    }

    createChart('births', 'bar', {
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'Births',
            data: [862, 890, 915, 940],
            backgroundColor: 'rgba(255, 183, 3, 0.75)',
            borderColor: 'rgba(255, 183, 3, 1)',
            borderWidth: 2,
            borderRadius: 10,
        }]
    }, {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
        }
    });

    createChart('deaths', 'bar', {
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'Deaths',
            data: [310, 328, 335, 345],
            backgroundColor: 'rgba(71, 179, 255, 0.74)',
            borderColor: 'rgba(71, 179, 255, 0.98)',
            borderWidth: 2,
            borderRadius: 10,
        }]
    }, {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
        }
    });

    createChart('InMig', 'line', {
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'In-migration',
            data: [210, 225, 248, 263],
            ...chartConfig,
            backgroundColor: 'rgba(76, 175, 80, 0.22)',
            borderColor: 'rgba(76, 175, 80, 1)',
            fill: true,
        }]
    }, {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
        }
    });

    createChart('OutMig', 'line', {
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'Out-migration',
            data: [190, 178, 162, 150],
            ...chartConfig,
            backgroundColor: 'rgba(255, 87, 34, 0.22)',
            borderColor: 'rgba(255, 87, 34, 1)',
            fill: true,
        }]
    }, {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
        }
    });

    createChart('chart1', 'line', {
        labels: ['2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'Population',
            data: [54580, 55450, 56200, 57162],
            ...chartConfig,
            backgroundColor: 'rgba(16, 185, 129, 0.22)',
            borderColor: 'rgba(16, 185, 129, 1)',
            fill: true,
        }]
    }, {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: false }
        }
    });

    createChart('chart2', 'bar', {
        labels: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60+'],
        datasets: [
            {
                label: 'Male',
                data: [-6800, -7200, -7600, -7000, -6200, -5100, -3100],
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                borderRadius: 10,
            },
            {
                label: 'Female',
                data: [7000, 7300, 7500, 6900, 6100, 5000, 3200],
                backgroundColor: 'rgba(236, 72, 153, 0.75)',
                borderColor: 'rgba(236, 72, 153, 1)',
                borderWidth: 2,
                borderRadius: 10,
            }
        ]
    }, {
        indexAxis: 'y',
        responsive: true,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: {
                label: function (context) {
                    const value = Math.abs(context.parsed.x);
                    return context.dataset.label + ': ' + value.toLocaleString();
                }
            }}
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    callback: function (value) { return Math.abs(value); }
                }
            },
            y: {
                grid: { display: false },
                reverse: true
            }
        }
    });

    const countupElements = document.querySelectorAll('.countup');
    countupElements.forEach(el => {
        const target = +el.dataset.target;
        let current = 0;
        const step = Math.max(1, Math.round(target / 120));
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                el.textContent = target.toLocaleString();
                clearInterval(interval);
            } else {
                el.textContent = current.toLocaleString();
            }
        }, 15);
    });

    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    revealElements.forEach(el => revealObserver.observe(el));
});
