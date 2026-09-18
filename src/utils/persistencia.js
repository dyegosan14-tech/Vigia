const fs = require('fs');
const path = require('path');

const ARQUIVO_OCORRENCIAS = path.join(__dirname, '..', 'data', 'ocorrencias.json');

// Grava o array de ocorrencias (compartilhado por referencia entre as
// rotas via require cache) de volta no JSON, para que denuncias e
// eventos de sensor sobrevivam a um restart do servidor. Substitui um
// banco de dados de verdade apenas para os fins deste prototipo.
function salvarOcorrencias(ocorrencias) {
  fs.writeFile(ARQUIVO_OCORRENCIAS, JSON.stringify(ocorrencias, null, 2), (erro) => {
    if (erro) console.error('[Vigia] Falha ao salvar ocorrencias.json:', erro.message);
  });
}

module.exports = { salvarOcorrencias };
