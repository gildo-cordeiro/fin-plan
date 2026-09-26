import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function createMonthItem(year, monthIndex) {
  const normalizedDate = new Date(year, monthIndex, 1);
  const y = normalizedDate.getFullYear();
  const m = normalizedDate.getMonth();
  const shortYear = y.toString().slice(-2);
  const monthPad = (m + 1).toString().padStart(2, '0');

  return {
    id: `${y}-${monthPad}`,
    name: `${MONTH_NAMES[m]} ${y}`,
    shortName: `${MONTH_SHORT_NAMES[m]}/${shortYear}`,
    year: y,
    monthIndex: m,
  };
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function toSemanticSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function run() {
  console.log('🚀 Iniciando migração da Planilha CSV para o MongoDB Atlas...\n');

  const csvPath = path.join(rootDir, 'FinPlan Database - planilha_google_sheets_banco_de_dados.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo CSV não encontrado em: ${csvPath}`);
    process.exit(1);
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf-8');
  const lines = rawCsv.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    console.error('❌ CSV vazio ou sem linhas de dados.');
    process.exit(1);
  }

  const dataLines = lines.slice(1);
  console.log(`📄 Lidas ${dataLines.length} linhas de dados da planilha CSV.`);

  const monthSet = new Set();
  const monthRegex = /^\d{4}-\d{2}$/;
  const parsedRows = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const [id, tipo, categoria, nome, mes_referencia, valor, status, observacao] = cols;
    if (!id && !nome) continue;

    const ref = (mes_referencia || '').trim();
    if (monthRegex.test(ref)) {
      monthSet.add(ref);
    }

    parsedRows.push({
      id: id || '',
      tipo: (tipo || '').toLowerCase(),
      categoria: (categoria || '').toLowerCase(),
      nome: (nome || '').trim(),
      mes_referencia: ref,
      valor: valor || '0',
      status: (status || 'ativo').toLowerCase(),
      observacao: observacao || '',
    });
  }

  const sortedMonthIds = Array.from(monthSet).sort();
  const months = sortedMonthIds.map((mId) => {
    const [y, m] = mId.split('-').map((v) => parseInt(v, 10));
    return createMonthItem(y, m - 1);
  });

  console.log(`📅 Identificados ${months.length} meses de projeção: ${sortedMonthIds[0]} até ${sortedMonthIds[sortedMonthIds.length - 1]}`);

  const simulation = {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
    initialBalance: 0,
    emergencyReserve: 0,
  };

  const incomesMap = new Map();
  const cartoesMap = new Map();
  const fixasMap = new Map();
  const varsMap = new Map();
  const oneTimeMap = new Map();
  const goalsMap = new Map();

  for (const row of parsedRows) {
    const rawVal = typeof row.valor === 'string' ? parseFloat(row.valor.replace(',', '.')) : row.valor;
    const val = isNaN(rawVal) ? 0 : rawVal;
    const isInactive = row.status === 'inativo';
    const refMonth = row.mes_referencia;

    if (row.tipo === 'config' || row.categoria === 'config' || row.id.startsWith('cfg:')) {
      if (row.id.includes('saldo_inicial') || row.nome.toLowerCase().includes('saldo inicial')) {
        simulation.initialBalance = val;
      } else if (row.id.includes('reserva') || row.nome.toLowerCase().includes('reserva')) {
        simulation.emergencyReserve = val;
      }
      continue;
    }

    if (row.tipo === 'renda' || row.categoria === 'renda') {
      const slug = toSemanticSlug(row.nome);
      if (!incomesMap.has(slug)) {
        incomesMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          category: 'renda',
          off: isInactive,
          values: {},
        });
      }
      if (refMonth && monthRegex.test(refMonth)) {
        incomesMap.get(slug).values[refMonth] = val;
      }
      continue;
    }

    if (row.categoria === 'cartoes') {
      const slug = toSemanticSlug(row.nome);
      if (!cartoesMap.has(slug)) {
        cartoesMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          category: 'cartoes',
          off: isInactive,
          values: {},
        });
      }
      if (refMonth && monthRegex.test(refMonth)) {
        cartoesMap.get(slug).values[refMonth] = val;
      }
      continue;
    }

    if (row.categoria === 'fixas') {
      const slug = toSemanticSlug(row.nome);
      if (!fixasMap.has(slug)) {
        fixasMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          category: 'fixas',
          off: isInactive,
          values: {},
        });
      }
      if (refMonth && monthRegex.test(refMonth)) {
        fixasMap.get(slug).values[refMonth] = val;
      }
      continue;
    }

    if (row.categoria === 'vars') {
      const slug = toSemanticSlug(row.nome);
      if (!varsMap.has(slug)) {
        varsMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          category: 'vars',
          off: isInactive,
          values: {},
        });
      }
      if (refMonth && monthRegex.test(refMonth)) {
        varsMap.get(slug).values[refMonth] = val;
      }
      continue;
    }

    if (row.tipo === 'mudanca' || row.categoria === 'mud') {
      const slug = toSemanticSlug(row.nome);
      if (!oneTimeMap.has(slug)) {
        oneTimeMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          value: val,
          targetMonthId: refMonth || '2026-12',
          off: isInactive,
          notes: (row.observacao || '').trim(),
        });
      }
      continue;
    }

    if (row.tipo === 'meta' || row.categoria === 'metas' || row.categoria === 'meta') {
      const slug = toSemanticSlug(row.nome);
      if (!goalsMap.has(slug)) {
        goalsMap.set(slug, {
          id: crypto.randomUUID(),
          name: row.nome,
          targetAmount: val,
          description: row.observacao || '',
          icon: row.observacao?.includes('🎯') ? '🎯' : row.observacao?.includes('🛡️') ? '🛡️' : '🎯',
          color: '#0e6b7a',
          status: row.status === 'concluida' ? 'concluida' : 'ativa',
          contributions: [],
        });
      }
      continue;
    }
  }

  const fillMonths = (items) => {
    return items.map((item) => {
      const filled = { ...item.values };
      months.forEach((m) => {
        if (filled[m.id] === undefined) {
          filled[m.id] = 0;
        }
      });
      return { ...item, values: filled };
    });
  };

  const budgetState = {
    version: 5,
    months,
    simulation,
    incomes: fillMonths(Array.from(incomesMap.values())),
    lists: {
      cartoes: fillMonths(Array.from(cartoesMap.values())),
      fixas: fillMonths(Array.from(fixasMap.values())),
      vars: fillMonths(Array.from(varsMap.values())),
    },
    oneTimeCosts: Array.from(oneTimeMap.values()),
    goals: Array.from(goalsMap.values()),
  };

  console.log('\n📊 Resumo dos dados extraídos:');
  console.log(` - Saldo Inicial: R$ ${simulation.initialBalance.toFixed(2)}`);
  console.log(` - Reserva Emergência: R$ ${simulation.emergencyReserve.toFixed(2)}`);
  console.log(` - Fontes de Renda: ${budgetState.incomes.length}`);
  console.log(` - Cartões de Crédito: ${budgetState.lists.cartoes.length}`);
  console.log(` - Despesas Fixas: ${budgetState.lists.fixas.length}`);
  console.log(` - Despesas Variáveis: ${budgetState.lists.vars.length}`);
  console.log(` - Custos Pontuais / Projetos: ${budgetState.oneTimeCosts.length}`);
  console.log(` - Metas Financeiras: ${budgetState.goals.length}`);

  const jsonPath = path.join(rootDir, 'finplan-migrated-budget.json');
  fs.writeFileSync(jsonPath, JSON.stringify(budgetState, null, 2), 'utf-8');
  console.log(`\n💾 Arquivo JSON gerado com sucesso: ${jsonPath}`);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('\n⚠️ MONGODB_URI não encontrada no .env.local.');
    console.log('👉 Para migrar direto para o MongoDB Atlas:');
    console.log('   1. Adicione MONGODB_URI=mongodb+srv://... no seu .env.local');
    console.log('   2. Rode: npm run migrate:mongo');
    console.log('\n👉 OU você pode importar o arquivo finplan-migrated-budget.json direto no App:');
    console.log('   1. Abra o FinPlan no navegador (npm run dev)');
    console.log('   2. Clique no botão "Backup" no topo direito');
    console.log('   3. Cole o conteúdo do finplan-migrated-budget.json e clique em "Restaurar do Texto"');
    console.log('   4. O FinPlan salvará tudo automaticamente!');
    return;
  }

  console.log('\n🔗 Conectando ao MongoDB Atlas...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'finplan';
    const db = client.db(dbName);
    const collection = db.collection('budgets');

    await collection.updateOne(
      { _id: 'default_budget' },
      {
        $set: {
          data: budgetState,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`🎉 Sucesso! Orçamento migrado e persistido no MongoDB Atlas (Banco: "${dbName}", Coleção: "budgets").`);
  } catch (err) {
    console.error('❌ Erro ao conectar ou salvar no MongoDB Atlas:', err);
  } finally {
    await client.close();
  }
}

run();
