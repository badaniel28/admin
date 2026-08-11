Chart.defaults.devicePixelRatio = window.devicePixelRatio || 2;

    function showSection(id, el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      document.querySelectorAll('#mainNav a').forEach(a => a.classList.remove('active'));
      if (el) el.classList.add('active');
      setTimeout(() => { Object.values(charts || {}).forEach(c => { try { c.resize(); } catch(e){} }); }, 250);
    }

    let rawData = [];
    let charts = {};
    let currentSelection = { barangay: '', year: '' };
    let tableSort = { key: 'year', dir: 'asc' };
    const statusEl = document.getElementById('status');

    function applySettings() {
      const compact = localStorage.getItem('dashboard-compact') === 'true';
      const reducedMotion = localStorage.getItem('dashboard-reduced-motion') === 'true';
      const mapLabels = localStorage.getItem('dashboard-map-labels') !== 'false';
      const theme = localStorage.getItem('dashboard-theme-preset') || 'blue';

      document.body.dataset.compact = compact ? 'true' : 'false';
      document.body.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
      document.body.dataset.mapLabels = mapLabels ? 'true' : 'false';
      document.documentElement.style.setProperty('--brand', theme === 'green' ? '#1f5f3f' : theme === 'amber' ? '#7c2d12' : theme === 'violet' ? '#4c1d95' : '#004d99');
      document.documentElement.style.setProperty('--accent-1', theme === 'green' ? '#47b06f' : theme === 'amber' ? '#f59e0b' : theme === 'violet' ? '#8b5cf6' : '#4da6ff');
      document.documentElement.style.setProperty('--accent-2', theme === 'green' ? '#8dd3a7' : theme === 'amber' ? '#fbbf24' : theme === 'violet' ? '#c4b5fd' : '#66cc99');

      const compactToggle = document.getElementById('compactModeToggle');
      const reducedMotionToggle = document.getElementById('reducedMotionToggle');
      const mapLabelsToggle = document.getElementById('mapLabelsToggle');
      if (compactToggle) compactToggle.checked = compact;
      if (reducedMotionToggle) reducedMotionToggle.checked = reducedMotion;
      if (mapLabelsToggle) mapLabelsToggle.checked = mapLabels;
    }

    function toggleSetting(key, checked) {
      if (key === 'compact') localStorage.setItem('dashboard-compact', checked ? 'true' : 'false');
      if (key === 'reducedMotion') localStorage.setItem('dashboard-reduced-motion', checked ? 'true' : 'false');
      if (key === 'mapLabels') localStorage.setItem('dashboard-map-labels', checked ? 'true' : 'false');
      applySettings();
    }

    function setThemePreset(preset) {
      localStorage.setItem('dashboard-theme-preset', preset);
      applySettings();
    }

    function applyPreset(name) {
      if (name === 'focus') {
        localStorage.setItem('dashboard-compact', 'false');
        localStorage.setItem('dashboard-reduced-motion', 'false');
        localStorage.setItem('dashboard-map-labels', 'true');
      } else if (name === 'overview') {
        localStorage.setItem('dashboard-compact', 'true');
        localStorage.setItem('dashboard-reduced-motion', 'false');
        localStorage.setItem('dashboard-map-labels', 'true');
      } else if (name === 'presentation') {
        localStorage.setItem('dashboard-compact', 'false');
        localStorage.setItem('dashboard-reduced-motion', 'true');
        localStorage.setItem('dashboard-map-labels', 'false');
      }
      applySettings();
    }

    function togglePresentationMode() {
      const banner = document.getElementById('presentationBanner');
      if (!banner) return;
      const isActive = banner.classList.toggle('active');
      if (isActive) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const banner = document.getElementById('presentationBanner');
        if (banner && banner.classList.contains('active')) {
          banner.classList.remove('active');
        }
      }
    });

    function applyDirectEntry() {
      const entryInput = document.getElementById('directEntry');
      const barangaySelect = document.getElementById('barangay');
      const yearSelect = document.getElementById('year');
      if (!entryInput || !barangaySelect || !yearSelect) return;

      const rawEntry = entryInput.value.trim();
      if (!rawEntry || ['all', 'show all', 'all data'].includes(rawEntry.toLowerCase())) {
        barangaySelect.value = '';
        yearSelect.value = '';
        updateDashboard('', '');
        return;
      }

      const barangays = [...new Set(rawData.map(r => r.barangay).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const years = [...new Set(rawData.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const tokens = rawEntry.split(/\s+/).filter(Boolean);

      let selectedBarangay = '';
      let selectedYear = '';

      tokens.forEach(token => {
        const normalized = token.toLowerCase();
        const exactBarangay = barangays.find(b => b.toLowerCase() === normalized);
        if (exactBarangay) {
          selectedBarangay = exactBarangay;
          return;
        }

        const partialBarangay = barangays.find(b => b.toLowerCase().includes(normalized));
        if (partialBarangay && !selectedBarangay) {
          selectedBarangay = partialBarangay;
        }

        const exactYear = years.find(y => String(y).toLowerCase() === normalized);
        if (exactYear) {
          selectedYear = String(exactYear);
          return;
        }

        const partialYear = years.find(y => String(y).toLowerCase().includes(normalized));
        if (partialYear && !selectedYear) {
          selectedYear = String(partialYear);
        }
      });

      if (!selectedBarangay && !selectedYear) {
        const exactBarangay = barangays.find(b => b.toLowerCase() === rawEntry.toLowerCase());
        if (exactBarangay) selectedBarangay = exactBarangay;
        const exactYear = years.find(y => String(y).toLowerCase() === rawEntry.toLowerCase());
        if (exactYear) selectedYear = String(exactYear);
      }

      barangaySelect.value = selectedBarangay || '';
      yearSelect.value = selectedYear || '';
      updateDashboard(barangaySelect.value, yearSelect.value);
    }

    function clearDirectEntry() {
      document.getElementById('directEntry').value = '';
      document.getElementById('barangay').value = '';
      document.getElementById('year').value = '';
      updateDashboard('', '');
    }

    function normalizeRow(row) {
      const normalized = {};
      Object.entries(row).forEach(([key, value]) => {
        if (!key) return;
        normalized[key.trim().toLowerCase()] = (value !== undefined && value !== null) ? value.toString().trim() : '';
      });
      return normalized;
    }

    function toNumber(v) {
      if (v === undefined || v === null || v === '') return NaN;
      const s = String(v).replace(/%/g, '').replace(/,/g, '').trim();
      return s === '' ? NaN : Number(s);
    }

    function animateValue(el, endValue, formatter, duration = 900) {
      if (!el) return;
      if (document.body.dataset.reducedMotion === 'true') {
        el.textContent = formatter(Number(endValue) || 0);
        el.dataset.value = String(Number(endValue) || 0);
        return;
      }
      const startTime = performance.now();
      const startValue = 0;
      const from = Number(el.dataset.value || 0);
      const fromValue = Number.isFinite(from) ? from : startValue;
      const toValue = Number(endValue) || 0;
      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = fromValue + (toValue - fromValue) * eased;
        el.textContent = formatter(current);
        el.dataset.value = String(current);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function renderYearChips() {
      const container = document.getElementById('yearChips');
      if (!container || !rawData || rawData.length === 0) return;
      const years = [...new Set(rawData.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const yearSelect = document.getElementById('year');
      container.innerHTML = '';
      const allChip = document.createElement('button');
      allChip.className = 'chip active';
      allChip.textContent = 'All Years';
      allChip.onclick = () => {
        document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
        allChip.classList.add('active');
        if (yearSelect) {
          yearSelect.value = '';
          updateDashboard(document.getElementById('barangay').value, yearSelect.value);
        }
      };
      container.appendChild(allChip);

      years.forEach(y => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = y;
        chip.onclick = () => {
          document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
          chip.classList.add('active');
          if (yearSelect) {
            yearSelect.value = String(y);
            updateDashboard(document.getElementById('barangay').value, yearSelect.value);
          }
        };
        container.appendChild(chip);
      });
    }

    function getFilteredRows(selectedBarangay = '', selectedYear = '') {
      return rawData.filter(r => (!selectedBarangay || r.barangay === selectedBarangay) && (!selectedYear || r.year === selectedYear));
    }

    function renderSummaryStrip(selectedBarangay = '', selectedYear = '') {
      const peakYearEl = document.getElementById('peakYear');
      const activeBarangaysEl = document.getElementById('activeBarangays');
      const avgGrowthEl = document.getElementById('avgGrowth');
      const latestYearEl = document.getElementById('latestYear');
      if (!peakYearEl || !activeBarangaysEl || !avgGrowthEl || !latestYearEl || !rawData || rawData.length === 0) return;

      const filtered = getFilteredRows(selectedBarangay, selectedYear).filter(r => !r.age_group);
      const years = [...new Set(filtered.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const latestYear = years[years.length - 1] || '--';
      const yearTotals = years.map(y => filtered.filter(r => r.year === y).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0));
      const peakYear = years[yearTotals.indexOf(Math.max(...yearTotals))] || '--';
      const growthValues = [];
      years.forEach((year, index) => {
        if (index === 0) return;
        const prev = yearTotals[index - 1];
        const cur = yearTotals[index];
        if (prev > 0) growthValues.push(((cur - prev) / prev) * 100);
      });
      const avgGrowth = growthValues.length ? (growthValues.reduce((s, v) => s + v, 0) / growthValues.length) : 0;

      animateValue(peakYearEl, Number(peakYear) || 0, (value) => String(Math.round(value)), 800);
      animateValue(activeBarangaysEl, [...new Set(filtered.map(r => r.barangay).filter(Boolean))].length, (value) => String(Math.round(value)), 800);
      animateValue(avgGrowthEl, avgGrowth, (value) => `${value.toFixed(1)}%`, 800);
      animateValue(latestYearEl, Number(latestYear) || 0, (value) => String(Math.round(value)), 800);
    }

    function renderInsightsBanner(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('insightsBanner');
      if (!container || !rawData || rawData.length === 0) return;

      const filtered = getFilteredRows(selectedBarangay, selectedYear).filter(r => !r.age_group);
      const grouped = {};
      filtered.forEach(r => {
        if (!r.barangay) return;
        if (!grouped[r.barangay]) grouped[r.barangay] = { barangay: r.barangay, total: 0, net: 0 };
        grouped[r.barangay].total += (toNumber(r.total_population) || 0);
        grouped[r.barangay].net += (toNumber(r.in_migration) || 0) - (toNumber(r.out_migration) || 0);
      });

      const ranked = Object.values(grouped).sort((a, b) => b.total - a.total);
      const top = ranked[0];
      const highestGrowth = ranked.slice().sort((a, b) => b.total - a.total)[0];
      const focus = top ? top.barangay : 'No barangay';
      const leaderCount = ranked.length;
      const migrationLeader = Object.values(grouped).sort((a, b) => b.net - a.net)[0];
      const migrationText = migrationLeader ? `${migrationLeader.barangay} with ${Math.round(migrationLeader.net).toLocaleString()} net movers` : 'stable migration patterns';

      container.innerHTML = `
        <strong>${focus} is the current population leader for this view.</strong>
        <div class="pill-row">
          <span class="pill">${leaderCount} barangays in focus</span>
          <span class="pill">${migrationText}</span>
          <span class="pill">${top ? `${Math.round(top.total).toLocaleString()} residents` : 'No data'}</span>
        </div>
      `;
    }

    function renderInsights(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('insightsContainer');
      if (!container || !rawData || rawData.length === 0) return;

      const filtered = rawData.filter(r => (!selectedBarangay || r.barangay === selectedBarangay) && (!selectedYear || r.year === selectedYear));
      const barangays = [...new Set(filtered.map(r => r.barangay).filter(Boolean))];
      const baseRows = filtered.filter(r => !r.age_group);
      const latestYear = selectedYear || [...new Set(rawData.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).slice(-1)[0];

      const populationByBarangay = barangays.map((barangay) => {
        const rows = filtered.filter(r => r.barangay === barangay && (!selectedYear || r.year === selectedYear));
        const total = rows.filter(r => !r.age_group).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0) || rows.reduce((s, r) => s + (toNumber(r.male) || 0) + (toNumber(r.female) || 0), 0);
        return { barangay, total };
      }).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

      const growthByBarangay = barangays.map((barangay) => {
        const series = [...new Set(rawData.filter(r => r.barangay === barangay).map(r => r.year).filter(Boolean))]
          .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
          .map(y => rawData.filter(r => r.barangay === barangay && r.year === y && !r.age_group).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0));
        if (series.length < 2) return { barangay, rate: 0 };
        const last = series[series.length - 1];
        const prev = series[series.length - 2];
        return { barangay, rate: prev > 0 ? ((last - prev) / prev) * 100 : 0 };
      }).filter(x => Number.isFinite(x.rate)).sort((a, b) => b.rate - a.rate);

      const migrationByBarangay = barangays.map((barangay) => {
        const rows = filtered.filter(r => r.barangay === barangay);
        const net = rows.reduce((s, r) => s + (toNumber(r.in_migration) || 0) - (toNumber(r.out_migration) || 0), 0);
        return { barangay, net };
      }).sort((a, b) => b.net - a.net);

      const topPopulation = populationByBarangay[0];
      const topGrowth = growthByBarangay[0];
      const topMigration = migrationByBarangay[0];

      const cards = [
        {
          label: 'Largest Barangay',
          value: topPopulation ? topPopulation.barangay : 'No data',
          detail: topPopulation ? `${Math.round(topPopulation.total).toLocaleString()} residents` : 'Awaiting dataset'
        },
        {
          label: 'Fastest Growth',
          value: topGrowth ? topGrowth.barangay : 'Steady',
          detail: topGrowth ? `${topGrowth.rate.toFixed(1)}% growth` : 'No growth trend available'
        },
        {
          label: 'Migration Hotspot',
          value: topMigration ? topMigration.barangay : 'Balanced',
          detail: topMigration ? `${Math.round(topMigration.net).toLocaleString()} net movers` : 'No migration signal'
        }
      ];

      container.innerHTML = cards.map(card => `
        <article class="insight-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
          <div class="detail">${card.detail}</div>
        </article>
      `).join('');
    }

    function renderBarangaySpotlight(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('spotlightList');
      if (!container || !rawData || rawData.length === 0) return;

      const totalsByBarangay = {};
      rawData
        .filter(r => (!selectedBarangay || r.barangay === selectedBarangay) && (!selectedYear || r.year === selectedYear) && !r.age_group)
        .forEach(r => {
          const total = toNumber(r.total_population) || 0;
          if (!r.barangay) return;
          totalsByBarangay[r.barangay] = (totalsByBarangay[r.barangay] || 0) + total;
        });

      const entries = Object.entries(totalsByBarangay).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (!entries.length) {
        container.innerHTML = '<div class="empty-state">No barangay totals available for the current selection.</div>';
        return;
      }

      const max = Math.max(...entries.map(([, value]) => value));
      container.innerHTML = entries.map(([barangay, value]) => `
        <div class="spotlight-row">
          <div class="spotlight-meta">
            <span>${barangay}</span>
            <strong>${Math.round(value).toLocaleString()}</strong>
          </div>
          <div class="spotlight-bar"><span style="width:${Math.max(8, (value / max) * 100)}%"></span></div>
        </div>
      `).join('');
    }

    function renderLeaderboard(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('leaderboardList');
      if (!container || !rawData || rawData.length === 0) return;

      const filtered = getFilteredRows(selectedBarangay, selectedYear).filter(r => !r.age_group);
      const grouped = {};
      filtered.forEach(r => {
        if (!r.barangay) return;
        if (!grouped[r.barangay]) grouped[r.barangay] = { barangay: r.barangay, total: 0 };
        grouped[r.barangay].total += (toNumber(r.total_population) || 0);
      });

      const list = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5);
      if (!list.length) {
        container.innerHTML = '<div class="empty-state">No leaderboard values available.</div>';
        return;
      }

      container.innerHTML = list.map((item, index) => `
        <div class="leaderboard-item">
          <span><strong>#${index + 1}</strong> ${item.barangay}</span>
          <strong>${Math.round(item.total).toLocaleString()}</strong>
        </div>
      `).join('');
    }

    function renderMapOverview(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('mapOverview');
      if (!container || !rawData || rawData.length === 0) return;

      const filtered = getFilteredRows(selectedBarangay, selectedYear).filter(r => !r.age_group);
      const grouped = {};
      filtered.forEach(r => {
        if (!r.barangay) return;
        if (!grouped[r.barangay]) grouped[r.barangay] = { barangay: r.barangay, total: 0 };
        grouped[r.barangay].total += (toNumber(r.total_population) || 0);
      });

      const list = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 6);
      if (!list.length) {
        container.innerHTML = '<div class="empty-state">No overview data available.</div>';
        return;
      }

      const max = Math.max(...list.map(item => item.total));
      const focusBarangay = selectedBarangay || '';
      container.innerHTML = `
        <div class="district-map-shell">
          <div class="district-map">
            ${list.map((item, index) => {
              const intensity = Math.max(0.5, (item.total / max) * 0.9);
              const bg = `linear-gradient(135deg, rgba(0,77,153,0.98), rgba(77,166,255,${0.58 + intensity * 0.3}))`;
              const spanStyle = index === 0 ? 'grid-column: span 2;' : '';
              const isSelected = focusBarangay && item.barangay === focusBarangay;
              const selectedClass = isSelected ? ' selected' : '';
              return `<div class="district-node${selectedClass}" style="background:${bg};${spanStyle}"><span class="district-badge"></span><strong class="district-label">${item.barangay}</strong><span class="district-value">${Math.round(item.total).toLocaleString()}</span><small>${isSelected ? 'focus zone' : 'residents'}</small></div>`;
            }).join('')}
          </div>
          <div class="district-map-legend">
            <span>Population clusters</span>
            <span>Top ${list.length} barangays</span>
            <span>${focusBarangay || 'All barangays'}</span>
          </div>
        </div>
      `;
    }

    function renderComparePanel(selectedBarangay = '', selectedYear = '') {
      const summaryEl = document.getElementById('compareSummary');
      const compareA = document.getElementById('compareA');
      const compareB = document.getElementById('compareB');
      if (!summaryEl || !compareA || !compareB || !rawData || rawData.length === 0) return;

      const barangayA = compareA.value;
      const barangayB = compareB.value;
      if (!barangayA || !barangayB || barangayA === barangayB) {
        summaryEl.innerHTML = '<div class="empty-state">Choose two different barangays to compare their latest totals.</div>';
        return;
      }

      const rowsA = getFilteredRows(barangayA, selectedYear).filter(r => !r.age_group);
      const rowsB = getFilteredRows(barangayB, selectedYear).filter(r => !r.age_group);
      const totalA = rowsA.reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
      const totalB = rowsB.reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
      const delta = totalB - totalA;
      const pct = totalA ? (delta / totalA) * 100 : 0;

      summaryEl.innerHTML = `
        <div class="spotlight-row">
          <div class="spotlight-meta"><span>${barangayA}</span><strong>${Math.round(totalA).toLocaleString()}</strong></div>
          <div class="spotlight-meta"><span>${barangayB}</span><strong>${Math.round(totalB).toLocaleString()}</strong></div>
        </div>
        <div class="spotlight-row">
          <div class="spotlight-meta"><span>Difference</span><strong>${delta >= 0 ? '+' : ''}${Math.round(delta).toLocaleString()} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</strong></div>
          <div class="spotlight-bar"><span style="width:${Math.min(100, 40 + Math.abs(pct) * 1.4)}%"></span></div>
        </div>
      `;
    }

    function renderForecast(selectedBarangay = '', selectedYear = '') {
      const card = document.getElementById('forecastCard');
      if (!card || !rawData || rawData.length === 0) return;

      const rows = rawData.filter(r => (!selectedBarangay || r.barangay === selectedBarangay) && !r.age_group && r.year);
      const years = [...new Set(rows.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const series = years.map(y => rows.filter(r => r.year === y).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0));

      if (series.length < 3) {
        card.innerHTML = '<div class="empty-state">Need at least three yearly totals to forecast the next trend.</div>';
        return;
      }

      const xMean = (series.length + 1) / 2;
      const yMean = series.reduce((s, v) => s + v, 0) / series.length;
      const numerator = series.reduce((s, value, index) => s + ((index + 1) - xMean) * (value - yMean), 0);
      const denominator = series.reduce((s, value, index) => s + Math.pow((index + 1) - xMean, 2), 0);
      const slope = denominator ? numerator / denominator : 0;
      const lastValue = series[series.length - 1] || 0;
      const nextValue = lastValue + slope;
      const changePct = lastValue ? ((nextValue - lastValue) / lastValue) * 100 : 0;
      const trend = changePct >= 0 ? 'growing' : 'declining';

      card.innerHTML = `
        <div class="spotlight-meta"><span>Projected next year</span><strong>${Math.round(nextValue).toLocaleString()}</strong></div>
        <div class="metric-pill">${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% ${trend}</div>
        <div class="spotlight-row">
          <div class="spotlight-meta"><span>Based on</span><strong>${years.length} yearly points</strong></div>
          <div class="spotlight-bar"><span style="width:${Math.min(100, 55 + Math.abs(changePct) * 1.2)}%"></span></div>
        </div>
      `;
    }

    function renderReportCardsPreview(selectedBarangay = '', selectedYear = '') {
      const container = document.getElementById('reportPreviewCards');
      if (!container || !rawData || rawData.length === 0) return;

      const filtered = getFilteredRows(selectedBarangay, selectedYear).filter(r => !r.age_group);
      const totals = filtered.reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
      const households = filtered.reduce((s, r) => s + (toNumber(r.households) || 0), 0);
      const years = [...new Set(filtered.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const latestYear = years[years.length - 1] || '—';
      const growthValues = [];
      years.forEach((_, index) => {
        if (index === 0) return;
        const prev = filtered.filter(r => r.year === years[index - 1]).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
        const cur = filtered.filter(r => r.year === years[index]).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
        if (prev > 0) growthValues.push(((cur - prev) / prev) * 100);
      });
      const avgGrowth = growthValues.length ? growthValues.reduce((s, v) => s + v, 0) / growthValues.length : 0;

      const cards = [
        { label: 'Population', value: `${Math.round(totals).toLocaleString()}` },
        { label: 'Growth', value: `${avgGrowth.toFixed(1)}%` },
        { label: 'Households', value: `${Math.round(households).toLocaleString()}` },
        { label: 'Latest Year', value: `${latestYear}` }
      ];

      container.innerHTML = cards.map(card => `
        <div class="report-preview-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
        </div>
      `).join('');
    }

    function renderDataTable(selectedBarangay = '', selectedYear = '') {
      const body = document.getElementById('dataTableBody');
      const empty = document.getElementById('dataTableEmpty');
      const search = document.getElementById('tableSearch');
      if (!body || !empty || !rawData || rawData.length === 0) return;

      let rows = getFilteredRows(selectedBarangay, selectedYear);
      const query = (search ? search.value : '').trim().toLowerCase();
      if (query) {
        rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(query)));
      }

      rows = rows.slice().sort((a, b) => {
        const key = tableSort.key;
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        const numA = toNumber(av);
        const numB = toNumber(bv);
        const isNumeric = Number.isFinite(numA) && Number.isFinite(numB);
        const comparison = isNumeric ? (numA - numB) : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return tableSort.dir === 'asc' ? comparison : -comparison;
      });

      if (!rows.length) {
        body.innerHTML = '';
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';
      body.innerHTML = rows.map(r => `
        <tr>
          <td>${r.barangay || ''}</td>
          <td>${r.year || ''}</td>
          <td>${r.age_group || ''}</td>
          <td>${r.male || ''}</td>
          <td>${r.female || ''}</td>
          <td>${r.total_population || ''}</td>
          <td>${r.households || ''}</td>
          <td>${r.in_migration || ''}</td>
          <td>${r.out_migration || ''}</td>
        </tr>
      `).join('');
    }

    function computeGrowthRate(barangay, year) {
      if (!rawData || rawData.length === 0) return NaN;
      const totals = rawData
        .filter(r => (!barangay || r.barangay === barangay) && !r.age_group && r.total_population)
        .map(r => ({ year: r.year, pop: toNumber(r.total_population) }))
        .filter(r => !isNaN(r.pop))
        .sort((a,b) => String(a.year).localeCompare(String(b.year), undefined, {numeric:true}));

      if (totals.length < 2) return NaN;
      let idx;
      if (year) idx = totals.findIndex(t => String(t.year) === String(year));
      else idx = totals.length - 1;
      if (idx === -1) idx = totals.length - 1;
      if (idx === 0) return NaN;
      const current = totals[idx].pop;
      const previous = totals[idx - 1].pop;
      if (!previous || previous === 0) return NaN;
      return ((current - previous) / previous) * 100;
    }

    function initCharts() {
      const commonOptions = {
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{ labels:{ font:{ size:14 } } },
          title:{ display:true, font:{ size:18 } }
        },
        scales:{
          x:{ ticks:{ font:{ size:13 } }, title:{ display:false } },
          y:{ ticks:{ font:{ size:13 } }, title:{ display:false } }
        }
      };

      charts.agePyramid = new Chart(document.getElementById('agePyramid'), {
        type:'bar',
        data:{ labels:[], datasets:[
          { label:'Male', data:[], backgroundColor:'#4da6ff', barThickness:18, categoryPercentage:0.9 },
          { label:'Female', data:[], backgroundColor:'#66cc99', barThickness:18, categoryPercentage:0.9 }
        ]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, indexAxis:'y', plugins:{ title:{ display:true, text:'Age Pyramid', font:{size:20} }, legend:{position:'bottom'} } })
      });

      charts.genderPie = new Chart(document.getElementById('genderPie'), {
        type:'pie',
        data:{ labels:['Male','Female'], datasets:[{ data:[], backgroundColor:['#4da6ff','#66cc99'] }]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, plugins:{ title:{ display:true, text:'Gender Distribution', font:{size:20} }, legend:{position:'bottom'} } })
      });

      charts.growthTrend = new Chart(document.getElementById('growthTrend'), {
        type:'line',
        data:{ labels:[], datasets:[{ label:'Population', data:[], borderColor:'#004d99', backgroundColor:'rgba(0,77,153,0.08)', fill:true, pointRadius:4 }]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, plugins:{ title:{ display:true, text:'Population Growth Over Time', font:{size:20} } }, interaction:{mode:'index',intersect:false} })
      });

      charts.migrationChart = new Chart(document.getElementById('migrationChart'), {
        type:'bar',
        data:{ labels:[], datasets:[
          { label:'In-Migration', data:[], backgroundColor:'#4da6ff', barThickness:18 },
          { label:'Out-Migration', data:[], backgroundColor:'#ff9966', barThickness:18 }
        ]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, plugins:{ title:{ display:true, text:'Migration In/Out Flow (Demographics)', font:{size:20} } }, scales:{ y:{ beginAtZero:true } } })
      });

      charts.growthTrend2 = new Chart(document.getElementById('growthTrend2'), {
        type:'line',
        data:{ labels:[], datasets:[{ label:'Population (All Barangays)', data:[], borderColor:'#004d99', fill:false, pointRadius:4 }]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, plugins:{ title:{ display:true, text:'Population Growth (All Barangays)', font:{size:20} } } })
      });

      charts.migrationChart2 = new Chart(document.getElementById('migrationChart2'), {
        type:'bar',
        data:{ labels:[], datasets:[
          { label:'In-Migration', data:[], backgroundColor:'#4da6ff', barThickness:18 },
          { label:'Out-Migration', data:[], backgroundColor:'#ff9966', barThickness:18 }
        ]},
        options: Object.assign({}, commonOptions, { animation:{ duration:900, easing:'easeOutQuart' }, plugins:{ title:{ display:true, text:'Migration (All Barangays)', font:{size:20} } } })
      });
    }

    // FULL updateDashboard with correct "All" aggregation for Home cards and per-barangay demographics
    function updateCensusHighlight(indexValue) {
      const slider = document.getElementById('censusYearSlider');
      const label = document.getElementById('censusYearLabel');
      const card = document.getElementById('censusHighlightCard');
      if (!slider || !label || !card || !rawData || !rawData.length) return;

      const years = [...new Set(rawData.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const safeIndex = Math.max(0, Math.min(years.length - 1, Number(indexValue) || 0));
      const year = years[safeIndex];
      const rows = rawData.filter(r => r.year === year && !r.age_group);
      const totalPopulation = rows.reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
      const migrationFlow = rows.reduce((s, r) => s + (toNumber(r.in_migration) || 0) + (toNumber(r.out_migration) || 0), 0);
      label.textContent = year || '--';
      card.innerHTML = `<strong>${year || '--'} stands out</strong><span>${Math.round(totalPopulation).toLocaleString()} residents and ${Math.round(migrationFlow).toLocaleString()} migration movements recorded.</span>`;
    }

    function updateDashboard(selectedBarangay = '', selectedYear = '') {
      currentSelection = { barangay: selectedBarangay, year: selectedYear };
      if (!rawData || rawData.length === 0) { statusEl.textContent = 'No data loaded.'; return; }

      // Filter rows for demographics (age groups) and totals (no age_group) within selected filters
      const demographicsRows = rawData.filter(r =>
        (!selectedBarangay || r.barangay === selectedBarangay) &&
        (!selectedYear || r.year === selectedYear) &&
        r.age_group
      );

      const totalsRows = rawData.filter(r =>
        (!selectedBarangay || r.barangay === selectedBarangay) &&
        (!selectedYear || r.year === selectedYear) &&
        !r.age_group
      );

      if (demographicsRows.length === 0 && totalsRows.length === 0) {
        statusEl.textContent = 'No matching data found for the selected filters.';
        document.getElementById('pop').textContent = '--';
        document.getElementById('growth').textContent = '--';
        document.getElementById('households').textContent = '--';
        document.getElementById('gender').textContent = '--';
        document.getElementById('dependency').textContent = '--';
        Object.values(charts).forEach(c => { try { c.data.labels = []; c.data.datasets.forEach(ds=>ds.data=[]); c.update(); } catch(e){} });
        return;
      }

      statusEl.textContent = 'Displaying data for ' + (selectedBarangay || 'All Barangays') + ' ' + (selectedYear ? ('(' + selectedYear + ')') : '');

      // SUMMARY logic:
      // - If a specific barangay is selected: prefer its totals row; if missing, aggregate its age_group rows.
      // - If All is selected: aggregate across barangays (for selectedYear if provided), using totals rows if present, else sum age groups.
      let summary = {};

      if (selectedBarangay) {
        if (totalsRows.length > 0) {
          summary = totalsRows[0];
        } else if (demographicsRows.length > 0) {
          const totalPop = demographicsRows.reduce((s,r)=>s + (toNumber(r.male)||0) + (toNumber(r.female)||0), 0);
          const maleTotal = demographicsRows.reduce((s,r)=>s + (toNumber(r.male)||0), 0);
          const femaleTotal = demographicsRows.reduce((s,r)=>s + (toNumber(r.female)||0), 0);
          summary = { total_population: totalPop, male: maleTotal, female: femaleTotal, households:'--', growth_rate:'--', dependency_ratio:'--' };
        }
      } else {
        // All selected: aggregate across barangays (respect selectedYear if set)
        const rowsForAggregation = rawData.filter(r => (!selectedYear || r.year === selectedYear));
        const totalsOnly = rowsForAggregation.filter(r => !r.age_group && r.total_population);
        if (totalsOnly.length > 0) {
          const totalPop = totalsOnly.reduce((s,r)=>s + (toNumber(r.total_population)||0), 0);
          const maleTotal = totalsOnly.reduce((s,r)=>s + (toNumber(r.male)||0), 0);
          const femaleTotal = totalsOnly.reduce((s,r)=>s + (toNumber(r.female)||0), 0);
          const households = totalsOnly.reduce((s,r)=>s + (toNumber(r.households)||0), 0);
          summary = { total_population: totalPop, male: maleTotal, female: femaleTotal, households: households || '--', growth_rate:'--', dependency_ratio:'--' };
        } else {
          const ageRows = rowsForAggregation.filter(r => r.age_group);
          const totalPop = ageRows.reduce((s,r)=>s + (toNumber(r.male)||0) + (toNumber(r.female)||0), 0);
          const maleTotal = ageRows.reduce((s,r)=>s + (toNumber(r.male)||0), 0);
          const femaleTotal = ageRows.reduce((s,r)=>s + (toNumber(r.female)||0), 0);
          summary = { total_population: totalPop, male: maleTotal, female: femaleTotal, households:'--', growth_rate:'--', dependency_ratio:'--' };
        }
      }

      // Update Home cards
      const popEl = document.getElementById('pop');
      const growthEl = document.getElementById('growth');
      const householdsEl = document.getElementById('households');
      const dependencyEl = document.getElementById('dependency');

      const popValue = (summary.total_population !== undefined && summary.total_population !== '') ? toNumber(summary.total_population) : NaN;
      const householdsValue = (summary.households !== undefined && summary.households !== '') ? toNumber(summary.households) : NaN;
      const dependencyValue = summary.dependency_ratio ? toNumber(summary.dependency_ratio) : NaN;

      let growthVal = toNumber(summary.growth_rate);
      if (isNaN(growthVal)) {
        growthVal = computeGrowthRate(selectedBarangay, selectedYear);
      }

      if (!isNaN(popValue)) {
        animateValue(popEl, popValue, (value) => Math.round(value).toLocaleString());
      } else {
        popEl.textContent = '--';
      }

      if (!isNaN(growthVal)) {
        animateValue(growthEl, growthVal, (value) => `${value.toFixed(1)}%`);
      } else {
        growthEl.textContent = '--';
      }

      if (!isNaN(householdsValue)) {
        animateValue(householdsEl, householdsValue, (value) => Math.round(value).toLocaleString());
      } else {
        householdsEl.textContent = '--';
      }

      document.getElementById('gender').textContent = ((summary.male || 0) + ' | ' + (summary.female || 0));
      if (!isNaN(dependencyValue)) {
        animateValue(dependencyEl, dependencyValue, (value) => `${value.toFixed(1)}%`);
      } else {
        dependencyEl.textContent = '--';
      }

      renderSummaryStrip(selectedBarangay, selectedYear);
      renderInsightsBanner(selectedBarangay, selectedYear);
      renderInsights(selectedBarangay, selectedYear);
      renderBarangaySpotlight(selectedBarangay, selectedYear);
      renderComparePanel(selectedBarangay, selectedYear);
      renderForecast(selectedBarangay, selectedYear);
      renderLeaderboard(selectedBarangay, selectedYear);
      renderMapOverview(selectedBarangay, selectedYear);
      renderReportCardsPreview(selectedBarangay, selectedYear);
      renderDataTable(selectedBarangay, selectedYear);

      // Age pyramid (use demographicsRows when filtering by barangay/year; otherwise show default groups aggregated)
      const ageGroups = demographicsRows.length > 0
        ? [...new Set(demographicsRows.map(r => r.age_group))].sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}))
        : ['0-14','15-24','25-54','55-64','65+'];

      const maleData = ageGroups.map(g => {
        const row = demographicsRows.find(r => r.age_group === g);
        return row ? (toNumber(row.male) || 0) : 0;
      });
      const femaleData = ageGroups.map(g => {
        const row = demographicsRows.find(r => r.age_group === g);
        return row ? (toNumber(row.female) || 0) : 0;
      });

      charts.agePyramid.data.labels = ageGroups;
      charts.agePyramid.data.datasets[0].data = maleData;
      charts.agePyramid.data.datasets[1].data = femaleData;
      charts.agePyramid.update();

      const maleTotal = (summary.male !== undefined ? toNumber(summary.male) : maleData.reduce((s,v)=>s+v,0)) || 0;
      const femaleTotal = (summary.female !== undefined ? toNumber(summary.female) : femaleData.reduce((s,v)=>s+v,0)) || 0;
      charts.genderPie.data.datasets[0].data = [maleTotal, femaleTotal];
      charts.genderPie.update();

      // Years and overall populations
      const allYears = [...new Set(rawData.map(r => r.year))].sort((a,b)=>String(a).localeCompare(String(b), undefined, {numeric:true}));
      const overallPopulations = allYears.map(y => rawData.filter(r => r.year === y && !r.age_group).reduce((s,r)=>s + (toNumber(r.total_population)||0), 0));

      // Demographics growth trend: per-barangay if selected, else overall
      let demPopulations;
      if (selectedBarangay) {
        demPopulations = allYears.map(y => rawData
          .filter(r => r.year === y && r.barangay === selectedBarangay && !r.age_group)
          .reduce((s,r) => s + (toNumber(r.total_population)||0), 0)
        );
      } else {
        demPopulations = overallPopulations.slice();
      }
      charts.growthTrend.data.labels = allYears;
      charts.growthTrend.data.datasets[0].data = demPopulations;

      // Demographics growth series
      const demGrowthSeries = demPopulations.map((curPop, idx) => {
        if (idx === 0) return NaN;
        const prev = demPopulations[idx - 1];
        if (!prev || prev === 0) return NaN;
        return ((curPop - prev) / prev) * 100;
      });

      const demGrowthIndex = charts.growthTrend.data.datasets.findIndex(ds => ds.label === 'Growth Rate (%)');
      if (demGrowthIndex === -1) {
        charts.growthTrend.data.datasets.push({
          label: 'Growth Rate (%)',
          data: demGrowthSeries.map(v => isNaN(v) ? null : Number(v.toFixed(2))),
          borderColor: '#ff3333',
          backgroundColor: 'rgba(255,51,51,0.08)',
          yAxisID: 'y1',
          type: 'line',
          pointRadius: 3,
          tension: 0.2
        });
        charts.growthTrend.options.scales = charts.growthTrend.options.scales || {};
        charts.growthTrend.options.scales.y1 = {
          position: 'right',
          ticks: { callback: v => v + '%' },
          grid: { drawOnChartArea: false }
        };
      } else {
        charts.growthTrend.data.datasets[demGrowthIndex].data = demGrowthSeries.map(v => isNaN(v) ? null : Number(v.toFixed(2)));
      }
      charts.growthTrend.update();

      // Demographics migration: per-barangay if selected, else overall
      let demInMig = allYears.map(y => rawData
        .filter(r => r.year === y && (!selectedBarangay || r.barangay === selectedBarangay))
        .reduce((s,r) => s + (toNumber(r.in_migration)||0), 0)
      );
      let demOutMig = allYears.map(y => rawData
        .filter(r => r.year === y && (!selectedBarangay || r.barangay === selectedBarangay))
        .reduce((s,r) => s + (toNumber(r.out_migration)||0), 0)
      );

      charts.migrationChart.data.labels = allYears;
      charts.migrationChart.data.datasets[0].data = demInMig;
      charts.migrationChart.data.datasets[1].data = demOutMig;
      charts.migrationChart.update();

      // Census page: overall populations and migration
      charts.growthTrend2.data.labels = allYears;
      charts.growthTrend2.data.datasets[0].data = overallPopulations;
      charts.growthTrend2.update();

      const overallIn = allYears.map(y => rawData.filter(r=>r.year===y).reduce((s,r)=>s + (toNumber(r.in_migration)||0),0));
      const overallOut = allYears.map(y => rawData.filter(r=>r.year===y).reduce((s,r)=>s + (toNumber(r.out_migration)||0),0));
      charts.migrationChart2.data.labels = allYears;
      charts.migrationChart2.data.datasets[0].data = overallIn;
      charts.migrationChart2.data.datasets[1].data = overallOut;
      charts.migrationChart2.update();

      const censusRangeEl = document.getElementById('censusRange');
      const censusPeakMigrationEl = document.getElementById('censusPeakMigration');
      const censusTrendLabelEl = document.getElementById('censusTrendLabel');
      if (censusRangeEl) {
        const minPop = Math.min(...overallPopulations.filter(v => Number.isFinite(v)));
        const maxPop = Math.max(...overallPopulations.filter(v => Number.isFinite(v)));
        censusRangeEl.textContent = `${Math.round(minPop).toLocaleString()} – ${Math.round(maxPop).toLocaleString()}`;
      }
      if (censusPeakMigrationEl) {
        const peakYear = allYears[overallIn.reduce((bestIndex, value, index, array) => value + overallOut[index] > array[bestIndex] + overallOut[bestIndex] ? index : bestIndex, 0)] || '--';
        const peakValue = Math.max(...overallIn.map((v, idx) => v + overallOut[idx]));
        censusPeakMigrationEl.textContent = `${peakYear}: ${Math.round(peakValue).toLocaleString()}`;
      }
      if (censusTrendLabelEl) {
        const first = overallPopulations[0] || 0;
        const last = overallPopulations[overallPopulations.length - 1] || 0;
        const trend = first > 0 ? ((last - first) / first) * 100 : 0;
        censusTrendLabelEl.textContent = trend >= 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
      }

      const slider = document.getElementById('censusYearSlider');
      if (slider) {
        slider.max = Math.max(1, allYears.length - 1);
        slider.value = Math.min(Number(slider.value) || 0, Number(slider.max) || 0);
        updateCensusHighlight(slider.value);
      }
    }

    function filterBarangayOptions() {
      const searchValue = document.getElementById('barangaySearch').value.toLowerCase();
      const select = document.getElementById('barangay');
      if (!select) return;

      Array.from(select.options).forEach(option => {
        if (!option.value) {
          option.hidden = false;
          return;
        }
        const matches = option.text.toLowerCase().includes(searchValue);
        option.hidden = !matches;
      });

      if (select.value && select.options[select.selectedIndex]?.hidden) {
        select.value = '';
        updateDashboard('', document.getElementById('year').value);
      }
    }

    function loadFromText(csvText) {
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      rawData = parsed.data.map(normalizeRow).filter(r => Object.keys(r).length > 0);
      if (!rawData || rawData.length === 0) { statusEl.textContent = 'No data rows found in CSV.'; return; }

      const barangaySelect = document.getElementById('barangay');
      const yearSelect = document.getElementById('year');
      barangaySelect.innerHTML = '<option value="">All</option>';
      yearSelect.innerHTML = '<option value="">All</option>';

      const barangays = [...new Set(rawData.map(r => r.barangay).filter(Boolean))].sort();
      const years = [...new Set(rawData.map(r => r.year).filter(Boolean))].sort();

      barangays.forEach(b => { const opt = document.createElement('option'); opt.value = b; opt.textContent = b; barangaySelect.appendChild(opt); });
      years.forEach(y => { const opt = document.createElement('option'); opt.value = y; opt.textContent = y; yearSelect.appendChild(opt); });

      if (!charts || Object.keys(charts).length === 0) initCharts();

      // default to All (empty) for barangay and year if none selected
      const defaultBarangay = ''; // All
      const defaultYear = ''; // All
      barangaySelect.value = defaultBarangay;
      yearSelect.value = defaultYear;

      barangaySelect.onchange = () => updateDashboard(barangaySelect.value, yearSelect.value);
      yearSelect.onchange = () => updateDashboard(barangaySelect.value, yearSelect.value);
      document.getElementById('barangaySearch').oninput = filterBarangayOptions;

      const compareA = document.getElementById('compareA');
      const compareB = document.getElementById('compareB');
      const populateCompareSelect = (select) => {
        if (!select) return;
        select.innerHTML = '<option value="">Select</option>';
        barangays.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b; opt.textContent = b;
          select.appendChild(opt);
        });
      };
      populateCompareSelect(compareA);
      populateCompareSelect(compareB);
      compareA.onchange = () => updateDashboard(barangaySelect.value, yearSelect.value);
      compareB.onchange = () => updateDashboard(barangaySelect.value, yearSelect.value);
      document.getElementById('tableSearch').oninput = () => renderDataTable(currentSelection.barangay, currentSelection.year);
      document.querySelectorAll('table th[data-key]').forEach(th => {
        th.onclick = () => {
          const key = th.dataset.key;
          if (tableSort.key === key) {
            tableSort.dir = tableSort.dir === 'asc' ? 'desc' : 'asc';
          } else {
            tableSort.key = key;
            tableSort.dir = 'asc';
          }
          renderDataTable(currentSelection.barangay, currentSelection.year);
        };
      });
      filterBarangayOptions();

      statusEl.textContent = 'Dashboard data loaded successfully.';
      renderYearChips();
      updateDashboard(defaultBarangay, defaultYear);
    }

    function loadDataFromServer() {
      if (location.protocol === 'file:') {
        statusEl.textContent = 'Open this page through a local web server (e.g., python -m http.server) to load CSV from /data/. You can also upload a CSV using the Upload CSV control.';
        initCharts();
        return;
      }
      fetch('data/population_data.csv')
        .then(res => { if (!res.ok) throw new Error('CSV not found'); return res.text(); })
        .then(text => loadFromText(text))
        .catch(err => {
          console.warn(err);
          statusEl.textContent = 'CSV not found in /data/. You can upload a CSV using the Upload CSV control.';
          initCharts();
        });
    }

    document.getElementById('uploadCsv').addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => loadFromText(e.target.result);
      reader.readAsText(file);
    });

    function refreshFromUpload() {
      const input = document.getElementById('uploadCsv');
      if (!input.files || !input.files[0]) { alert('Please choose a CSV file first.'); return; }
      const reader = new FileReader();
      reader.onload = e => loadFromText(e.target.result);
      reader.readAsText(input.files[0]);
    }

    function exportFilteredCSV() {
      if (!rawData || rawData.length === 0) { alert('No data to export.'); return; }
      const barangay = document.getElementById('barangay').value;
      const year = document.getElementById('year').value;
      const filtered = rawData.filter(r => (!barangay || r.barangay === barangay) && (!year || r.year === year));
      if (filtered.length === 0) { alert('No rows match the selected filters.'); return; }
      const headers = Object.keys(filtered[0]);
      const csvRows = [headers.join(',')].concat(filtered.map(row => headers.map(h => `"${(row[h]||'').replace(/"/g,'""')}"`).join(',')));
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `population_export_${barangay||'all'}_${year||'all'}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    async function exportSummaryPDF() {
      if (!rawData || rawData.length === 0) { alert('No data to export.'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const barangay = document.getElementById('barangay').value || 'All Barangays';
      const year = document.getElementById('year').value || 'All Years';
      const title = 'Population Summary - ' + barangay + ' (' + year + ')';
      doc.setFontSize(16); doc.text(title, 40, 60);
      doc.setFontSize(11); doc.text('Generated by Office of the Population Officer - Estancia', 40, 80);
      const pop = document.getElementById('pop').textContent;
      const growth = document.getElementById('growth').textContent;
      const households = document.getElementById('households').textContent;
      const gender = document.getElementById('gender').textContent;
      const dependency = document.getElementById('dependency').textContent;
      doc.setFontSize(12);
      doc.text(`Total Population: ${pop}`, 40, 120);
      doc.text(`Growth Rate: ${growth}`, 40, 140);
      doc.text(`Households: ${households}`, 40, 160);
      doc.text(`Gender Ratio (M | F): ${gender}`, 40, 180);
      doc.text(`Dependency Ratio: ${dependency}`, 40, 200);
      doc.setFontSize(10);
      doc.text('Note: This PDF contains a brief summary. For full data exports use the CSV export option.', 40, 240);
      doc.save(`population_summary_${barangay.replace(/\s+/g,'_')}_${year}.pdf`);
    }

    function exportReportCards() {
      if (!rawData || rawData.length === 0) { alert('No data to export.'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const barangay = document.getElementById('barangay').value || 'All Barangays';
      const year = document.getElementById('year').value || 'All Years';
      const filtered = getFilteredRows(barangay, year).filter(r => !r.age_group);
      const totals = filtered.reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
      const households = filtered.reduce((s, r) => s + (toNumber(r.households) || 0), 0);
      const years = [...new Set(filtered.map(r => r.year).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const latestYear = years[years.length - 1] || '—';
      const growthValues = [];
      years.forEach((_, index) => {
        if (index === 0) return;
        const prev = filtered.filter(r => r.year === years[index - 1]).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
        const cur = filtered.filter(r => r.year === years[index]).reduce((s, r) => s + (toNumber(r.total_population) || 0), 0);
        if (prev > 0) growthValues.push(((cur - prev) / prev) * 100);
      });
      const avgGrowth = growthValues.length ? growthValues.reduce((s, v) => s + v, 0) / growthValues.length : 0;

      doc.setFontSize(18);
      doc.text(`Population Report Cards - ${barangay} (${year})`, 40, 48);
      doc.setFontSize(10);
      doc.text('Generated from the current dashboard view', 40, 68);

      const cards = [
        { title: 'Total Population', value: Math.round(totals).toLocaleString() },
        { title: 'Growth Rate', value: `${avgGrowth.toFixed(1)}%` },
        { title: 'Households', value: Math.round(households).toLocaleString() },
        { title: 'Latest Year', value: latestYear }
      ];

      cards.forEach((card, index) => {
        const x = 40 + (index % 2) * 245;
        const y = 110 + Math.floor(index / 2) * 120;
        doc.setFillColor(0, 77, 153);
        doc.roundedRect(x, y, 200, 80, 10, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(card.title, x + 16, y + 28);
        doc.setFontSize(16);
        doc.text(card.value, x + 16, y + 54);
        doc.setTextColor(0, 0, 0);
      });

      if (charts.growthTrend) {
        doc.setFontSize(12);
        doc.text('Growth Trend Snapshot', 40, 250);
        doc.addImage(charts.growthTrend.toBase64Image(), 'PNG', 40, 260, 220, 110);
      }
      if (charts.migrationChart) {
        doc.setFontSize(12);
        doc.text('Migration Snapshot', 300, 250);
        doc.addImage(charts.migrationChart.toBase64Image(), 'PNG', 300, 260, 220, 110);
      }

      doc.save(`report_cards_${barangay.replace(/\s+/g,'_')}_${year}.pdf`);
    }

    function downloadSampleCSV() {
      const sample = `BARANGAY,YEAR,AGE_GROUP,MALE,FEMALE,TOTAL_POPULATION,HOUSEHOLDS,GROWTH_RATE,DEPENDENCY_RATIO,IN_MIGRATION,OUT_MIGRATION
Bayas,2022,0-14,1150,1050,52000,12300,2.0,55,470,350
Bayas,2022,15-24,880,920,52000,12300,2.0,55,440,330
Bayas,2022,25-54,1480,1580,52000,12300,2.0,55,410,310
Bayas,2023,0-14,1200,1100,52480,12345,2.1,56,480,360
Bayas,2023,15-24,900,950,52480,12345,2.1,56,450,340
Bayas,2023,25-54,1500,1600,52480,12345,2.1,56,420,320
Poblacion,2022,0-14,480,460,17800,3980,2.2,56,190,140
Poblacion,2023,0-14,500,480,18000,4000,2.3,57,200,150
Paon,2023,0-14,300,320,8000,1800,2.2,58,100,80
Bayas,2023,,25500,26980,52480,12345,2.1,56,480,360
Poblacion,2023,,8800,9200,18000,4000,2.3,57,200,150
Paon,2023,,3900,4100,8000,1800,2.2,58,100,80`;
      const blob = new Blob([sample], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'sample_population_data.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    function applyTheme(theme) {
      const body = document.body;
      body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
      localStorage.setItem('dashboard-theme', body.dataset.theme);
    }

    function toggleTheme() {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    }

    function resetFilters() {
      document.getElementById('barangay').value = '';
      document.getElementById('year').value = '';
      updateDashboard('', '');
    }

    (function start() {
      const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
      applyTheme(savedTheme);
      applySettings();
      initCharts();
      loadDataFromServer();
    })();