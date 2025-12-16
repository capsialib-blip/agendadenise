/* config.example.js
 * ARQUIVO DE EXEMPLO PARA GITHUB
 * Instrução: Renomeie este arquivo para 'config.js' e insira as credenciais reais localmente.
 */

// 1. Configuração do Firebase (Substitua pelos dados do seu projeto no console do Firebase)
const FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-id-do-projeto",
  storageBucket: "seu-bucket.appspot.com",
  messagingSenderId: "00000000000",
  appId: "1:00000000000:web:00000000000000"
};

// 2. Credenciais de Acesso (Defina as senhas para cada nível de acesso)
const SISTEMA_CREDENCIAIS = {
    'admin': 'senha_mestra_aqui',
    'recepcao': 'senha_recepcao_aqui',
    'coordenacao': 'senha_gestao_aqui',
    'medico': 'senha_simples_aqui'
};

// 3. Senha de Emergência para Limpeza Total de Dados (LocalStorage)
const SENHA_RESET_GLOBAL = "senha_de_emergencia_aqui";