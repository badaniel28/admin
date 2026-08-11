(function () {
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  function createChart(canvasId, type, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    return new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: { ...chartDefaults, ...options }
    });
  }

  function animateCountups() {
    document.querySelectorAll('.countup').forEach((el) => {
      const target = Number(el.dataset.target || 0);
      if (!Number.isFinite(target)) return;
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
  }

  function animateReveals() {
    const revealElements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    revealElements.forEach((el) => observer.observe(el));
  }

  function initNavigation() {
    document.querySelectorAll('a.nav-link[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href')?.slice(1);
        if (!targetId) return;
        const section = document.getElementById(targetId);
        if (section) {
          event.preventDefault();
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initCharts() {
    createChart('births', 'bar', ['2021', '2022', '2023', '2024'], [{
      label: 'Births',
      data: [862, 890, 915, 940],
      backgroundColor: 'rgba(255, 183, 3, 0.75)',
      borderColor: 'rgba(255, 183, 3, 1)',
      borderWidth: 2,
      borderRadius: 10
    }]);

    createChart('deaths', 'bar', ['2021', '2022', '2023', '2024'], [{
      label: 'Deaths',
      data: [310, 328, 335, 345],
      backgroundColor: 'rgba(71, 179, 255, 0.74)',
      borderColor: 'rgba(71, 179, 255, 0.98)',
      borderWidth: 2,
      borderRadius: 10
    }]);

    createChart('InMig', 'line', ['2021', '2022', '2023', '2024'], [{
      label: 'In-migration',
      data: [210, 225, 248, 263],
      borderColor: 'rgba(76, 175, 80, 1)',
      backgroundColor: 'rgba(76, 175, 80, 0.22)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#ffd43b'
    }]);

    createChart('OutMig', 'line', ['2021', '2022', '2023', '2024'], [{
      label: 'Out-migration',
      data: [190, 178, 162, 150],
      borderColor: 'rgba(255, 87, 34, 1)',
      backgroundColor: 'rgba(255, 87, 34, 0.22)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#ffd43b'
    }]);

    createChart('chart1', 'line', ['2021', '2022', '2023', '2024'], [{
      label: 'Population',
      data: [54580, 55450, 56200, 57162],
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.22)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#ffd43b'
    }], {
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false }
      }
    });

    createChart('chart2', 'bar', ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60+'], [
      {
        label: 'Male',
        data: [-6800, -7200, -7600, -7000, -6200, -5100, -3100],
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 10
      },
      {
        label: 'Female',
        data: [7000, 7300, 7500, 6900, 6100, 5000, 3200],
        backgroundColor: 'rgba(236, 72, 153, 0.75)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 2,
        borderRadius: 10
      }
    ], {
      indexAxis: 'y',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = Math.abs(context.parsed.x);
              return context.dataset.label + ': ' + value.toLocaleString();
            }
          }
        }
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
  }

  function initScrollButton() {
    const button = document.getElementById('myBtn');
    if (!button) return;

    const updateButton = () => {
      const shouldShow = document.body.scrollTop > 300 || document.documentElement.scrollTop > 300;
      button.style.display = shouldShow ? 'block' : 'none';
    };

    window.addEventListener('scroll', updateButton, { passive: true });
    updateButton();

    window.topFunction = function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollButton();
    initCharts();
    animateCountups();
    animateReveals();
  });
})();
