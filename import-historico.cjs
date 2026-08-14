const XLSX = require('xlsx');
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:azime202600@db.ymrrguubkqbxndhoxhor.supabase.co:5432/postgres';

function excelDateToJSDate(excelDate) {
  // Excel base date is Dec 30, 1899
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  // Return YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

function processAlinareRow(row) {
  const dataRaw = row['Data        '];
  const dataParsed = typeof dataRaw === 'number' ? excelDateToJSDate(dataRaw) : new Date(dataRaw).toISOString().split('T')[0];

  const hInicio = row['Hora de início'] || row['Data        '];
  const hFim = row['Hora de conclusão'] || row['Data        '];
  let tempoSegundos = 0;
  if (typeof hInicio === 'number' && typeof hFim === 'number') {
    tempoSegundos = Math.round((hFim - hInicio) * 86400);
  }

  const codigo = parseInt(String(row['Código do Cliente '] || '0').replace(/\D/g, ''), 10);

  let motivo = String(row['Motivo'] || 'Outros').trim();
  const validMotivos = ['Peça com defeito', 'Mercadoria errada', 'Endereço incorreto', 'Baixa qualidade no conserto', 'Outros'];
  if (!validMotivos.includes(motivo)) motivo = 'Outros';

  return {
    empresa: 'Alinare',
    data_solicitacao: dataParsed,
    solicitante: String(row['Solicitante '] || '').trim(),
    setor: String(row['Setor'] || '').trim(),
    codigo_cliente: isNaN(codigo) ? 0 : codigo,
    nome_cliente: String(row['Nome do Cliente'] || '').trim(),
    endereco_postagem: String(row['Endereço de Postagem\r\n'] || '').trim(),
    motivo,
    justificativa_outros: row['Justifique a opção "Outros"'] ? String(row['Justifique a opção "Outros"']).trim() : null,
    autorizacao: String(row['Autorização do reverso\r\n'] || '').trim(),
    resolvido: false, // Planilha Alinare não tem status, assume false
    tempo_preenchimento_segundos: tempoSegundos
  };
}

function processNovitahRow(row) {
  const dataRaw = row['Data'];
  const dataParsed = typeof dataRaw === 'number' ? excelDateToJSDate(dataRaw) : new Date(dataRaw).toISOString().split('T')[0];

  const hInicio = row['Hora de início'] || row['Data'];
  const hFim = row['Hora de conclusão'] || row['Data'];
  let tempoSegundos = 0;
  if (typeof hInicio === 'number' && typeof hFim === 'number') {
    tempoSegundos = Math.round((hFim - hInicio) * 86400);
  }

  const codigo = parseInt(String(row['Código da Cliente   '] || '0').replace(/\D/g, ''), 10);

  let motivo = String(row['Motivo '] || 'Outros').trim();
  const validMotivos = ['Peça com defeito', 'Mercadoria errada', 'Endereço incorreto', 'Baixa qualidade no conserto', 'Outros'];
  if (!validMotivos.includes(motivo)) motivo = 'Outros';

  const resolvido = String(row['Status'] || '').toLowerCase().includes('feito');

  return {
    empresa: 'Novitah',
    data_solicitacao: dataParsed,
    solicitante: String(row['Solicitante'] || '').trim(),
    setor: String(row['Setor'] || '').trim(),
    codigo_cliente: isNaN(codigo) ? 0 : codigo,
    nome_cliente: String(row['Nome da Cliente'] || '').trim(),
    endereco_postagem: String(row['Endereço de Postagem '] || '').trim(),
    motivo,
    justificativa_outros: row['Justifique a opção "Outros"'] ? String(row['Justifique a opção "Outros"']).trim() : null,
    autorizacao: String(row['Autorização do reverso'] || '').trim(),
    resolvido,
    tempo_preenchimento_segundos: tempoSegundos
  };
}

async function main() {
  const wbA = XLSX.readFile('data/hist_alinare.xlsx');
  const rowsA = XLSX.utils.sheet_to_json(wbA.Sheets[wbA.SheetNames[0]]);
  const recordsA = rowsA.map(processAlinareRow);

  const wbN = XLSX.readFile('data/hist_novitah.xlsx');
  const rowsN = XLSX.utils.sheet_to_json(wbN.Sheets[wbN.SheetNames[0]]);
  const recordsN = rowsN.map(processNovitahRow);

  const allRecords = [...recordsA, ...recordsN];
  console.log(`Lidos: ${recordsA.length} Alinare, ${recordsN.length} Novitah. Total: ${allRecords.length}`);

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Conectado ao Supabase para importação.');

    // Limpa a tabela para não duplicar se rodar mais de uma vez nos testes
    await client.query('DELETE FROM solicitacoes_reverso');
    console.log('Tabela solicitacoes_reverso limpa.');

    let inserted = 0;
    for (const rec of allRecords) {
      // Cria query parametrizada
      const query = `
        INSERT INTO solicitacoes_reverso (
          empresa, data_solicitacao, solicitante, setor, codigo_cliente,
          nome_cliente, endereco_postagem, motivo, justificativa_outros,
          autorizacao, resolvido, tempo_preenchimento_segundos
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const values = [
        rec.empresa,
        rec.data_solicitacao,
        rec.solicitante || 'Desconhecido',
        rec.setor || 'Desconhecido',
        rec.codigo_cliente,
        rec.nome_cliente || 'Desconhecido',
        rec.endereco_postagem || 'Desconhecido',
        rec.motivo,
        rec.justificativa_outros,
        rec.autorizacao || 'Desconhecido',
        rec.resolvido,
        rec.tempo_preenchimento_segundos
      ];

      try {
        await client.query(query, values);
        inserted++;
      } catch (err) {
        console.error('Erro ao inserir registro:', rec, err.message);
      }
    }

    console.log(`Concluído! ${inserted} registros inseridos com sucesso.`);

  } catch (err) {
    console.error('Erro fatal:', err.message);
  } finally {
    await client.end();
  }
}

main();