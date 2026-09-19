let mapaInstancia = null;
let graficoInstancia = null;

// Função utilitária de sanitização para evitar Stored XSS via innerHTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function iniciarRelogio() {
  if (window.__relogioIniciado) return;
  window.__relogioIniciado = true;

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
  if (window.__menuMobileIniciado) return;
  window.__menuMobileIniciado = true;

  const btn = document.getElementById('btn-toggle-menu');
  const sidebar = document.getElementById('app-sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
  });

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btn) {
      sidebar.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
}

function iniciarMapa(pracas) {
  const container = document.getElementById('mapa-pracas');
  if (!container || !window.L || mapaInstancia || container._leaflet_id) return;

  try {
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
      if (!p || !p.lat || !p.lng) return;

      const statusClasse = p.status === 'operacional' ? 'ok' : (p.status || 'ok');
      const iconHtml = `
        <div class="custom-pin ${escapeHtml(statusClasse)}">
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

      const totalEq = p.equipamentos?.total ?? 0;
      const operacionaisEq = p.equipamentos?.operacionais ?? 0;
      const ocupacao = Number(p.ocupacao_atual) || 0;

      const popupHtml = `
        <div class="map-popup-title">${escapeHtml(p.nome)}</div>
        <div class="map-popup-bairro">${escapeHtml(p.bairro)} &middot; Status: <strong style="color: var(--status-${escapeHtml(statusClasse)})">${escapeHtml(statusTexto[p.status] || p.status)}</strong></div>
        <div class="map-popup-stat">
          <span>Ocupação atual:</span>
          <strong>${ocupacao}%</strong>
        </div>
        <div class="map-popup-stat">
          <span>Equipamentos:</span>
          <strong>${operacionaisEq}/${totalEq} operacionais</strong>
        </div>
        <a href="/pracas/${encodeURIComponent(p.id)}" class="map-popup-link">Abrir monitoramento da praça &rarr;</a>
      `;

      L.marker([p.lat, p.lng], { icon: customIcon })
        .addTo(mapaInstancia)
        .bindPopup(popupHtml);
    });
  } catch (err) {
    console.warn('[Vigia] Não foi possível carregar o mapa tático:', err);
  }
}

function renderizarTendencia(dados) {
  const canvas = document.getElementById('grafico-tendencia');
  if (!canvas || !window.Chart || !Array.isArray(dados)) return;

  if (graficoInstancia) {
    graficoInstancia.destroy();
    graficoInstancia = null;
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(16, 91, 171, 0.35)');
  gradient.addColorStop(1, 'rgba(16, 91, 171, 0.02)');

  graficoInstancia = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dados.map((d) => (d.data && d.data.length >= 5 ? d.data.slice(5) : d.data || '')),
      datasets: [{
        label: 'Frequência estimada',
        data: dados.map((d) => Number(d.visitantes) || 0),
        borderColor: '#105bab',
        backgroundColor: gradient,
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ffcc00',
        pointBorderColor: '#0e1a2e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0e1a2e',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(16, 91, 171, 0.5)',
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
  if (window.__atualizacaoIniciada) return;
  window.__atualizacaoIniciada = true;

  const listaOcorrencias = document.getElementById('lista-ultimas-ocorrencias');
  if (!listaOcorrencias) return;

  const definirTexto = (id, texto) => {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  };

  function aplicarKpis(kpis) {
    if (!kpis) return;
    definirTexto('kpi-uptime', kpis.uptimePct);
    definirTexto('kpi-abertas', kpis.ocorrenciasAbertas);
    definirTexto('kpi-tempo', kpis.tempoMedioResposta ?? '—');
    definirTexto('kpi-uso', kpis.usoMedio);
    definirTexto('kpi-percepcao', kpis.percepcaoMedia);
    definirTexto('kpi-custo', 'R$ ' + (Number(kpis.custoManutencaoMensal) || 0).toLocaleString('pt-BR'));

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
    if (!Array.isArray(lista) || !lista.length) {
      listaOcorrencias.innerHTML = '<div class="empty-state">Nenhuma ocorrência registrada no momento.</div>';
      return;
    }

    listaOcorrencias.innerHTML = lista.map((o) => `
      <div class="event-row">
        <div class="event-top">
          <span class="event-time">${escapeHtml(o.hora)}</span>
          <span class="badge ${escapeHtml(o.severidade)}">${escapeHtml(o.severidade)}</span>
          <span class="badge status-${escapeHtml(o.status)}">${escapeHtml(String(o.status || '').replace('_', ' '))}</span>
          ${o.origem === 'cidadao' ? '<span class="badge origem-cidadao">Cidadão</span>' : ''}
        </div>
        <div class="event-tipo">${escapeHtml(o.tipo)}</div>
        <div class="event-praca">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${escapeHtml(o.pracaNome)}
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

// Fallback para páginas que só utilizam o relógio e a navegação móvel
document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  iniciarMenuMobile();
});
