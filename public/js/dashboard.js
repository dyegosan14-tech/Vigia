function iniciarRelogio() {
  const el = document.getElementById('relogio');
  if (!el) return;

  function atualizar() {
    const agora = new Date();
    el.textContent = agora.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'medium' });
  }

  atualizar();
  setInterval(atualizar, 1000);
}

function renderizarTendencia(dados) {
  const canvas = document.getElementById('grafico-tendencia');
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: dados.map((d) => d.data.slice(5)),
      datasets: [{
        label: 'Visitantes estimados',
        data: dados.map((d) => d.visitantes),
        borderColor: '#e8a33d',
        backgroundColor: 'rgba(232, 163, 61, 0.12)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9aa4b5', font: { size: 11 } } },
        y: { grid: { color: '#2a3140' }, ticks: { color: '#9aa4b5', font: { size: 11 } } }
      }
    }
  });
}

function iniciarAtualizacaoPainel() {
  const listaOcorrencias = document.getElementById('lista-ultimas-ocorrencias');
  if (!listaOcorrencias) return; // roda apenas no painel geral

  const definirTexto = (id, texto) => {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  };

  function aplicarKpis(kpis) {
    definirTexto('kpi-uptime', kpis.uptimePct + '%');
    definirTexto('kpi-abertas', kpis.ocorrenciasAbertas);
    definirTexto('kpi-tempo', (kpis.tempoMedioResposta ?? '—') + (kpis.tempoMedioResposta != null ? ' min' : ''));
    definirTexto('kpi-uso', kpis.usoMedio + '%');
    definirTexto('kpi-percepcao', kpis.percepcaoMedia + '/10');
    definirTexto('kpi-custo', 'R$ ' + kpis.custoManutencaoMensal.toLocaleString('pt-BR'));

    const variacaoEl = document.getElementById('kpi-variacao');
    if (variacaoEl) {
      if (kpis.variacaoOcorrenciasPct === null) {
        variacaoEl.textContent = '—';
      } else {
        const sinal = kpis.variacaoOcorrenciasPct > 0 ? '+' : '';
        variacaoEl.textContent = `${sinal}${kpis.variacaoOcorrenciasPct}%`;
        variacaoEl.style.color = kpis.variacaoOcorrenciasPct <= 0 ? 'var(--status-ok)' : 'var(--status-critical)';
      }
    }
  }

  // severidade/status/tipo vindos de /resumo sao sempre valores de um
  // conjunto fechado definido no servidor (ver src/routes/denuncia.js),
  // nunca texto livre — seguro para inserir via template string.
  function aplicarOcorrencias(lista) {
    if (!lista.length) {
      listaOcorrencias.innerHTML = '<div class="empty-state">Nenhuma ocorrencia registrada.</div>';
      return;
    }

    listaOcorrencias.innerHTML = lista.map((o) => `
      <div class="event-row">
        <div class="event-top">
          <span class="event-time">${o.hora}</span>
          <span class="badge ${o.severidade}">${o.severidade}</span>
          <span class="badge status-${o.status}">${o.status.replace('_', ' ')}</span>
          ${o.origem === 'cidadao' ? '<span class="badge baixa">denuncia cidada</span>' : ''}
        </div>
        <div class="event-tipo">${o.tipo}</div>
        <div class="event-praca">${o.pracaNome}</div>
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
      definirTexto('ultima-atualizacao', 'Atualizado as ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (erro) {
      // Falha silenciosa: mantem os ultimos dados renderizados pelo servidor.
    }
  }

  setInterval(atualizar, 15000);
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  iniciarAtualizacaoPainel();
});
