const fs = require('fs');
const path = require('path');

const ARQUIVO_OCORRENCIAS = path.join(__dirname, '..', 'data', 'ocorrencias.json');

// Grava o array de ocorrências usando gravação atômica (.tmp + renameSync)
// para garantir que o arquivo nunca seja corrompido ou truncado caso o processo seja interrompido.
function salvarOcorrencias(ocorrencias) {
  const tmpArquivo = `${ARQUIVO_OCORRENCIAS}.tmp`;
  try {
    const conteudo = JSON.stringify(ocorrencias, null, 2);
    fs.writeFileSync(tmpArquivo, conteudo, 'utf8');
    fs.renameSync(tmpArquivo, ARQUIVO_OCORRENCIAS);
  } catch (erro) {
    console.error('[Vigia] Falha ao salvar ocorrencias.json de forma atômica:', erro.message);
    try {
      if (fs.existsSync(tmpArquivo)) fs.unlinkSync(tmpArquivo);
    } catch (_) {}
  }
}

module.exports = { salvarOcorrencias };
