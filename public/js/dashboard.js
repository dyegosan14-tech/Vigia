let mapaInstancia = null;

function iniciarRelogio() {
  const el = document.getElementById('relogio');
  if (!el) return;

  function atualizar() {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour12: false });
    el.textContent = `${dataFormatada}  ${horaFormatada}`;
  }

  atualizar();
  setInterval(atualizar, 1000);
}

function iniciarMenuMobile() {
  const btn = document.getElementById('btn-toggle-menu');
  const sidebar = document.getElementById('app-sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btn) {
      sidebar.classList.remove('open');
    }
  });
}

function iniciarMapa(pracas) {
  const container = document.getElementById('mapa-pracas');
  if (!container || !window.L || mapaInstancia) return;

  // Centro aproximado de Recife
  mapaInstancia = L.map('mapa-pracas', {
    zoomControl: false,
    attributionControl: false
  }).setView([-8.055, -34.897], 13);

  L.control.zoom({ position: 'topright' }).addTo(mapaInstancia);

  // Camada escura tática CartoDB Dark Matter
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(mapaInstancia);

  const statusTexto = {
    operacional: 'Operacional',
    atencao: 'Atenção',
    critico: 'Crítico'
  };

  pracas.forEach((p) => {
    if (!p.lat || !p.lng) return;

    const statusClasse = p.status === 'operacional' ? 'ok' : p.status;
    const iconHtml = `
      <div class="custom-pin ${statusClasse}">
        <div class="custom-pin-pulse"></div>
        <div class="custom-pin-core"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-marker',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const popupHtml = `
      <div class="map-popup-title">${p.nome}</div>
      <div class="map-popup-bairro">${p.bairro} &middot; Status: <strong style="color: var(--status-${statusClasse})">${statusTexto[p.status] || p.status}</strong></div>
      <div class="map-popup-stat">
        <span>Ocupação atual:</span>
        <strong>${p.ocupacao_atual}%</strong>
      </div>
      <div class="map-popup-stat">
        <span>Equipamentos:</span>
        <strong>${p.equipamentos.operacionais}/${p.equipamentos.total} operacionais</strong>
      </div>
      <a href="/pracas/${p.id}" class="map-popup-link">Abrir monitoramento da praça &rarr;</a>
    `;

    L.marker([p.lat, p.lng], { icon: customIcon })
      .addTo(mapaInstancia)
      .bindPopup(popupHtml);
  });
}

function renderizarTendencia(dados) {
  const canvas = document.getElementById('grafico-tendencia');
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: dados.map((d) => d.data.slice(5)),
      datasets: [{
        label: 'Visitantes estimados',
        data: dados.map((d) => d.visitantes),
        borderColor: '#f59e0b',
        backgroundColor: gradient,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#18202d',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 10,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 11 } }
        }
      }
    }
  });
}

function iniciarAtualizacaoPainel() {
  const listaOcorrencias = document.getElementById('lista-ultimas-ocorrencias');
  if (!listaOcorrencias) return;

  const definirTexto = (id, texto) => {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  };

  function aplicarKpis(kpis) {
    definirTexto('kpi-uptime', kpis.uptimePct);
    definirTexto('kpi-abertas', kpis.ocorrenciasAbertas);
    definirTexto('kpi-tempo', kpis.tempoMedioResposta ?? '—');
    definirTexto('kpi-uso', kpis.usoMedio);
    definirTexto('kpi-percepcao', kpis.percepcaoMedia);
    definirTexto('kpi-custo', 'R$ ' + kpis.custoManutencaoMensal.toLocaleString('pt-BR'));

    const variacaoEl = document.getElementById('kpi-variacao');
    const badgeEl = document.getElementById('kpi-variacao-badge');
    if (variacaoEl) {
      if (kpis.variacaoOcorrenciasPct === null) {
        variacaoEl.textContent = '—';
      } else {
        const sinal = kpis.variacaoOcorrenciasPct > 0 ? '+' : '';
        variacaoEl.textContent = `${sinal}${kpis.variacaoOcorrenciasPct}%`;
      }
    }
    if (badgeEl && kpis.variacaoOcorrenciasPct !== null) {
      const isMelhor = kpis.variacaoOcorrenciasPct <= 0;
      badgeEl.className = `trend-badge ${isMelhor ? 'positive' : 'negative'}`;
      badgeEl.textContent = isMelhor ? 'Redução de incidentes' : 'Aumento de incidentes';
    }
  }

  function aplicarOcorrencias(lista) {
    if (!lista.length) {
      listaOcorrencias.innerHTML = '<div class="empty-state">Nenhuma ocorrência registrada no momento.</div>';
      return;
    }

    listaOcorrencias.innerHTML = lista.map((o) => `
      <div class="event-row">
        <div class="event-top">
          <span class="event-time">${o.hora}</span>
          <span class="badge ${o.severidade}">${o.severidade}</span>
          <span class="badge status-${o.status}">${o.status.replace('_', ' ')}</span>
          ${o.origem === 'cidadao' ? '<span class="badge origem-cidadao">Cidadão</span>' : ''}
        </div>
        <div class="event-tipo">${o.tipo}</div>
        <div class="event-praca">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${o.pracaNome}
        </div>
      </div>
    `).join('');
  }

  async function atualizar() {
    try {
      const resposta = await fetch('/resumo', { headers: { Accept: 'application/json' } });
      if (!resposta.ok) return;
      const dados = await resposta.json();
      aplicarKpis(dados.kpis);
      aplicarOcorrencias(dados.ultimasOcorrencias);
      definirTexto('ultima-atualizacao', 'Sincronizado às ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (erro) {
      // Falha silenciosa em caso de desconexão momentânea
    }
  }

  setInterval(atualizar, 15000);
}

function inicializarPainel(config) {
  iniciarRelogio();
  iniciarMenuMobile();
  if (config) {
    if (config.pracas) iniciarMapa(config.pracas);
    if (config.tendencia) renderizarTendencia(config.tendencia);
  }
  iniciarAtualizacaoPainel();
}

// Fallback caso páginas simples só usem relógio e menu
document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  iniciarMenuMobile();
});
