import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos dos arquivos
const rootDir = path.resolve(__dirname, '..');
const dbConfigPath = path.join(rootDir, 'database.json');
const envPath = path.join(rootDir, '.env');

console.log('🔄 Sincronizando banco de dados HubFrete...');

// 1. Ler o database.json
if (!fs.existsSync(dbConfigPath)) {
  console.error('❌ Erro: Arquivo database.json não encontrado na raiz do projeto.');
  process.exit(1);
}

const dbConfig = JSON.parse(fs.readFileSync(dbConfigPath, 'utf-8'));
const activeDbKey = dbConfig['active-database'];

if (!activeDbKey || !dbConfig[activeDbKey]) {
  console.error(`❌ Erro: Banco de dados ativo ("${activeDbKey}") não encontrado nas configurações.`);
  process.exit(1);
}

const activeDb = dbConfig[activeDbKey];
console.log(`✅ Banco de dados destino selecionado: ${activeDb['database-name']} (${activeDbKey})`);

// 2. Variáveis a serem injetadas/atualizadas no .env
const envVarsToUpdate = {
  'VITE_SUPABASE_URL': activeDb['supabase-url'],
  'VITE_SUPABASE_ANON_KEY': activeDb['supabase-anon-key']
};

// 3. Processar .env existente
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else {
  console.log('⚠️ Arquivo .env não encontrado. Um novo será criado.');
}

const envLines = envContent.split('\n');
const newEnvLines = [];
let varsUpdated = new Set();

for (let line of envLines) {
  // Ignorar linhas em branco ou comentários puros longo de cara? Não necessariamente.
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    newEnvLines.push(line);
    continue;
  }

  // Verificar se a linha declara uma das variáveis que queremos atualizar
  const [key] = line.split('=');
  const cleanKey = key?.trim();

  if (envVarsToUpdate[cleanKey] !== undefined) {
    newEnvLines.push(`${cleanKey}=${envVarsToUpdate[cleanKey]}`);
    varsUpdated.add(cleanKey);
  } else {
    // Manter as outras chaves intocadas
    newEnvLines.push(line);
  }
}

// 4. Adicionar variáveis que não existiam no .env
for (const [key, value] of Object.entries(envVarsToUpdate)) {
  if (!varsUpdated.has(key)) {
    newEnvLines.push(`${key}=${value}`);
  }
}

// 5. Salvar o .env
fs.writeFileSync(envPath, newEnvLines.join('\n'), 'utf-8');

console.log('\n✨ Sucesso! Variáveis atualizadas no .env:');
console.log(`- VITE_SUPABASE_URL = ${activeDb['supabase-url']}`);
console.log(`- VITE_SUPABASE_ANON_KEY = [OCULTA]`);
console.log(`\nLembre-se de rodar "npx supabase link --project-ref ${activeDb['supabase-id']}" localmente se for enviar migrations para este ambiente.\n`);
