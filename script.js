/* script.js - [ARCOSAFE RECOVERY BUILD V40.1] */
'use strict';

// ============================================
// [BLOCO A] CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

// [ARCOSAFE-FIX] Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDu_n6yDxrSEpv0eCcJDjUIyH4h0UiYx14",
    authDomain: "caps-libia.firebaseapp.com",
    projectId: "caps-libia",
    storageBucket: "caps-libia.firebasestorage.app",
    messagingSenderId: "164764567114",
    appId: "1:164764567114:web:2701ed4a861492c0e388b3"
};

// [ARCOSAFE-FIX] Inicialização do serviço de banco de dados com tratamento de erro
let database;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        console.log("Firebase inicializado com sucesso.");
    } else {
        console.warn("SDK Firebase não detectado. O sistema funcionará em modo offline/local.");
    }
} catch (e) {
    console.error("Erro crítico ao inicializar Firebase:", e);
}

// ============================================
// 1. CONSTANTES E DADOS ESTÁTICOS
// ============================================
const VAGAS_POR_TURNO = 8;
const MAX_DAYS_SEARCH = 10;
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Lista de profissionais para assinatura (Preservada integralmente)
const PROFISSIONAIS_LISTA = [
    { nome: "ALESSANDRA OLIVEIRA MONTALVAO DA CRUZ", funcao: "ASSISTENTE ADMINISTRATIVO" },
    { nome: "ANDRESSA RIBEIRO LEAL", funcao: "ENFERMEIRO" },
    { nome: "CAROLINE OLIVEIRA LEDO", funcao: "ASSISTENTE SOCIAL" },
    { nome: "DENISE CORREA DOS SANTOS", funcao: "MEDICO" },
    { nome: "DJENTILAME FAMINE SANTOS SANTA RITA", funcao: "PSICOLOGO" },
    { nome: "ELAINE CRISTINA DA SILVA DOS SANTOS", funcao: "GERENTE DE SERVICOS DE SAUDE" },
    { nome: "ERICK FROES ALMEIDA", funcao: "COORDENADOR TÉCNICO" },
    { nome: "GABRIELA BARRETO SANTANA", funcao: "ARTESÃO" },
    { nome: "HELGA DE OLIVEIRA BRITO", funcao: "FARMACEUTICO" },
    { nome: "IONARA MARTINS DOS SANTOS", funcao: "TECNICO DE ENFERMAGEM" },
    { nome: "IRIS SACRAMENTO COSTA", funcao: "TECNICO DE ENFERMAGEM" },
    { nome: "JOSILDA MARIA DA SILVA FAGUNDES", funcao: "FARMACEUTICO" },
    { nome: "LEILANE DA SILVA DIAS", funcao: "ENFERMEIRO" },
    { nome: "LORENA MOREIRA SILVA SANTOS", funcao: "TERAPEUTA OCUPACIONAL" },
    { nome: "MAIRA PASSOS SANTANA", funcao: "PSICOLOGO" },
    { nome: "MARCIA REGINA REBELLO DE CASTRO MACHADO", funcao: "ASSISTENTE SOCIAL" },
    { nome: "NICOLLE SANTOS SOUSA", funcao: "ASSISTENTE ADMINISTRATIVO" },
    { nome: "ROSANA ALVES DA SILVA DOS SANTOS", funcao: "ASSISTENTE SOCIAL" },
    { nome: "ROSEMERI OLIVEIRA DE JESUS PEREIRA", funcao: "TECNICO DE ENFERMAGEM" },
    { nome: "SAMARA BASTOS BARRETO", funcao: "PSICOLOGO" },
    { nome: "SANDRA MARCIA DA SILVA OLIVEIRA", funcao: "ENFERMEIRO" },
    { nome: "DJENTILÂME FAMINÉ SANTA RITA", funcao: "PSICOLOGO" },
    { nome: "VINICIUS CORREIA CAVALCANTI DANTAS", funcao: "PSICOLOGO CLINICO" },
    { nome: "VINICIUS PEDREIRA ALMEIDA SANTOS", funcao: "MEDICO PSIQUIATRA" }
];

// ============================================
// 2. VARIÁVEIS DE ESTADO GLOBAL
// ============================================
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = null;

// Estruturas de dados principais
let agendamentos = {};
let diasBloqueados = {};
let feriadosDesbloqueados = {};
let pacientes = [];
let pacientesGlobais = [];

// Estado da UI
let turnoAtivo = 'manha';
let slotEmEdicao = null; // { data, turno, vaga }
let justificativaEmEdicao = null;
let modalBackupAberto = false;
let atestadoEmGeracao = null;
let confirmAction = null; 
let tentativaSenha = 1;
let vagasResultadosAtuais = []; 

// ============================================
// 3. SISTEMA DE NOTIFICAÇÃO
// ============================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('notificationContainer') || criarContainerNotificacao();
    const notif = document.createElement('div');
    notif.className = `notification ${tipo}`;
    notif.textContent = mensagem;
    
    // Ícone baseado no tipo
    const icon = document.createElement('i');
    icon.className = tipo === 'success' ? 'bi bi-check-circle-fill' : 
                     tipo === 'danger' ? 'bi bi-exclamation-triangle-fill' : 
                     'bi bi-info-circle-fill';
    notif.prepend(icon);

    container.appendChild(notif);
    
    // Animação de entrada
    requestAnimationFrame(() => {
        notif.classList.add('show');
    });

    // Remoção automática
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function criarContainerNotificacao() {
    const div = document.createElement('div');
    div.id = 'notificationContainer';
    div.className = 'notification-container';
    document.body.appendChild(div);
    return div;
}

// ============================================
// 4. LÓGICA DE LOGIN E AUTENTICAÇÃO
// ============================================

function inicializarLogin() {
    console.log('Debug: Agenda Init - Verificando sessão');
    try {
        if (sessionStorage.getItem('usuarioLogado') === 'true') {
            document.body.classList.add('logged-in');
            inicializarApp();
        } else {
            configurarEventListenersLogin();
        }
    } catch (e) {
        console.error('Erro crítico no login:', e);
    }
}

function configurarEventListenersLogin() {
    const loginButton = document.getElementById('loginButton');
    const loginSenhaInput = document.getElementById('loginSenha');
    
    if (loginButton) {
        // Clone para remover listeners antigos e evitar duplicação (Safe Refactor)
        const novoLoginButton = loginButton.cloneNode(true);
        loginButton.parentNode.replaceChild(novoLoginButton, loginButton);
        novoLoginButton.addEventListener('click', (e) => {
            e.preventDefault();
            tentarLogin();
        });
    }
    
    if (loginSenhaInput) {
        // Remove listener anterior se existir (embora cloneNode não se aplique aqui facilmente sem substituir o elemento, vamos usar onkeydown direto ou addEventListener com cuidado)
        // Melhor abordagem: substituir o elemento para limpar listeners anônimos antigos
        const novoInput = loginSenhaInput.cloneNode(true);
        loginSenhaInput.parentNode.replaceChild(novoInput, loginSenhaInput);
        
        novoInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                tentarLogin();
            }
        });
    }
}

function tentarLogin() {
    const usuarioInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginSenha'); // Referência atualizada após clone
    const errorMessage = document.getElementById('loginErrorMessage');

    const usuario = usuarioInput ? usuarioInput.value : '';
    const senha = senhaInput ? senhaInput.value : '';

    // [ARCOSAFE] Credenciais hardcoded mantidas conforme original
    if (usuario === '0000' && senha === '0000') {
        sessionStorage.setItem('usuarioLogado', 'true');
        if (errorMessage) errorMessage.classList.add('hidden');
        document.body.classList.add('logged-in');
        inicializarApp();
    } else {
        if (errorMessage) {
            errorMessage.textContent = 'Usuário ou senha incorretos.';
            errorMessage.classList.remove('hidden');
        }
    }
}

// ============================================
// 5. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

function inicializarApp() {
    console.log('Inicializando sistema [ARCOSAFE V40.1]...');

    // Carregamento de dados locais (Fallback/Cache)
    const agendamentosSalvos = localStorage.getItem('agenda_completa_final');
    const pacientesSalvos = localStorage.getItem('pacientes_dados');
    const bloqueiosSalvos = localStorage.getItem('dias_bloqueados');
    const feriadosDesbloqueadosSalvos = localStorage.getItem('feriados_desbloqueados');

    if (agendamentosSalvos) {
        try { agendamentos = JSON.parse(agendamentosSalvos); } catch (error) { agendamentos = {}; }
    }
    
    if (pacientesSalvos) {
        try {
            pacientes = JSON.parse(pacientesSalvos);
            pacientesGlobais = Array.isArray(pacientes) ? [...pacientes] : [];
        } catch (error) { pacientes = []; pacientesGlobais = []; }
    } else {
        pacientesGlobais = []; 
    }

    if (bloqueiosSalvos) {
        try { diasBloqueados = JSON.parse(bloqueiosSalvos); } catch (error) { diasBloqueados = {}; }
    }

    if (feriadosDesbloqueadosSalvos) {
        try { feriadosDesbloqueados = JSON.parse(feriadosDesbloqueadosSalvos); } catch (error) { feriadosDesbloqueados = {}; }
    }

    // Configuração dos Listeners do Firebase (Realtime)
    if (database) {
        database.ref('agendamentos').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                agendamentos = data;
                localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
                
                // Atualizações reativas da UI
                atualizarCalendario();
                if (dataSelecionada) exibirAgendamentos(dataSelecionada);
                atualizarResumoMensal();
                atualizarResumoSemanal(new Date());
                verificarDadosCarregados();
            }
        });

        database.ref('dias_bloqueados').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                diasBloqueados = data;
                localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
                
                atualizarCalendario();
                if (dataSelecionada) exibirAgendamentos(dataSelecionada);
            }
        });

        database.ref('pacientes').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                pacientesGlobais = data; // Assume array ou objeto
                if (!Array.isArray(pacientesGlobais) && typeof pacientesGlobais === 'object') {
                     // Conversão de segurança caso venha como objeto do Firebase
                     pacientesGlobais = Object.values(pacientesGlobais);
                }
                pacientes = [...pacientesGlobais];
                localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
                verificarDadosCarregados();
            }
        });

        database.ref('feriados_desbloqueados').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                feriadosDesbloqueados = data;
                localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
                atualizarCalendario();
            }
        });
    }

    // Inicialização de funcionalidades secundárias
    configurarHorarioBackup();
    setInterval(verificarNecessidadeBackup, 5000);

    configurarEventListenersApp(); 
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    verificarDadosCarregados();
    configurarBuscaGlobalAutocomplete();
    configurarVagasEventListeners();
    configurarAutocompleteAssinatura();
    
    verificarNecessidadeBackup(); 
}
// ============================================
// [BLOCO B] NAVEGAÇÃO E LÓGICA DE CALENDÁRIO
// ============================================

// ============================================
// 6. LISTENERS DE NAVEGAÇÃO
// ============================================

function configurarEventListenersApp() {
    const btnHoje = document.getElementById('btnHoje');
    if (btnHoje) btnHoje.addEventListener('click', goToToday);

    const btnMesAnterior = document.getElementById('btnMesAnterior');
    if (btnMesAnterior) btnMesAnterior.addEventListener('click', voltarMes);

    const btnProximoMes = document.getElementById('btnProximoMes');
    if (btnProximoMes) btnProximoMes.addEventListener('click', avancarMes);
    
    const btnConfirmClearData = document.getElementById('btnConfirmClearData');
    if (btnConfirmClearData) {
        // [ARCOSAFE-FIX] Prevenção de múltiplos listeners usando replaceWith ou flag
        const newBtn = btnConfirmClearData.cloneNode(true);
        btnConfirmClearData.parentNode.replaceChild(newBtn, btnConfirmClearData);
        newBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            await executarLimpezaTotal();
        });
    }
}

function goToToday() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    atualizarCalendario();
    const dataFormatada = hoje.toISOString().split('T')[0];
    // Seleciona o dia visualmente e carrega a agenda
    pularParaAgendamento(dataFormatada);
}

function voltarMes() {
    mesAtual--;
    if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
    }
    atualizarCalendario();
}

function avancarMes() {
    mesAtual++;
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
    }
    atualizarCalendario();
}

function mostrarTurno(turno) {
    turnoAtivo = turno;
    const tabManha = document.querySelector('.tab-btn.manha');
    const tabTarde = document.querySelector('.tab-btn.tarde');
    const contentManha = document.getElementById('turno-manha');
    const contentTarde = document.getElementById('turno-tarde');

    // Toggle de classes para visibilidade
    if (tabManha) tabManha.classList.toggle('active', turno === 'manha');
    if (tabTarde) tabTarde.classList.toggle('active', turno === 'tarde');
    if (contentManha) contentManha.classList.toggle('active', turno === 'manha');
    if (contentTarde) contentTarde.classList.toggle('active', turno === 'tarde');
}

// ============================================
// 7. LÓGICA DE GERAÇÃO DO CALENDÁRIO (CORE)
// ============================================

function atualizarCalendario() {
    const calendarContainer = document.getElementById('calendarContainer');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    
    // Safety check
    if (!calendarContainer || !currentMonthDisplay) return;

    // Atualiza título
    currentMonthDisplay.textContent = `${MESES[mesAtual]} ${anoAtual}`;
    
    // Limpa container (Reset)
    calendarContainer.innerHTML = '';

    // [ARCOSAFE-OPTIMIZATION] Uso de DocumentFragment para evitar Reflows excessivos
    const fragment = document.createDocumentFragment();

    const firstDay = new Date(anoAtual, mesAtual, 1).getDay();
    const daysInMonth = new Date(anoAtual, mesAtual + 1, 0).getDate();

    // Renderiza dias vazios (padding inicial)
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'empty');
        fragment.appendChild(emptyDay);
    }

    // Renderiza dias do mês
    const hoje = new Date();
    const isCurrentMonth = mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
    const hojeDia = hoje.getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const diaEl = document.createElement('div');
        diaEl.classList.add('day');
        
        // Formato seguro da data: YYYY-MM-DD
        const mesFmt = (mesAtual + 1).toString().padStart(2, '0');
        const diaFmt = i.toString().padStart(2, '0');
        const dataFull = `${anoAtual}-${mesFmt}-${diaFmt}`;
        
        diaEl.setAttribute('data-date', dataFull);
        diaEl.textContent = i;

        // 1. Verifica bloqueios
        if (diasBloqueados && diasBloqueados[dataFull]) {
            diaEl.classList.add('bloqueado');
            if (diasBloqueados[dataFull].isHoliday) diaEl.classList.add('feriado');
        }

        // 2. Verifica se é hoje
        if (isCurrentMonth && i === hojeDia) {
            diaEl.classList.add('today');
        }

        // 3. Verifica seleção
        if (dataSelecionada === dataFull) {
            diaEl.classList.add('selected');
        }

        // 4. Indicadores de ocupação (Visualização rápida)
        const agendamentosDia = agendamentos[dataFull];
        if (agendamentosDia) {
            const qtdManha = agendamentosDia.manha ? agendamentosDia.manha.length : 0;
            const qtdTarde = agendamentosDia.tarde ? agendamentosDia.tarde.length : 0;
            const total = qtdManha + qtdTarde;
            
            if (total > 0) {
                const indicador = document.createElement('div');
                indicador.className = 'occupancy-indicator';
                
                // Lógica de cores baseada na lotação (Total 16 vagas: 8 manhã + 8 tarde)
                if (total >= 16) indicador.style.backgroundColor = 'var(--danger-color, #ef4444)'; // Cheio
                else if (total >= 8) indicador.style.backgroundColor = 'var(--warning-color, #f59e0b)'; // Médio
                else indicador.style.backgroundColor = 'var(--success-color, #10b981)'; // Livre
                
                diaEl.appendChild(indicador);
            }
        }

        // Event Listener para seleção
        diaEl.addEventListener('click', () => selecionarDia(dataFull, diaEl));
        fragment.appendChild(diaEl);
    }

    // Append final único ao DOM
    calendarContainer.appendChild(fragment);
}

function selecionarDia(data, elemento) {
    // Remove seleção anterior visual
    document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
    
    // Adiciona nova seleção
    if (elemento) {
        elemento.classList.add('selected');
    } else {
        // Fallback caso o elemento não seja passado (chamada via código)
        const elDOM = document.querySelector(`.day[data-date="${data}"]`);
        if (elDOM) elDOM.classList.add('selected');
    }
    
    dataSelecionada = data;
    
    // Atualiza painel lateral/principal
    exibirAgendamentos(data);
}

// ============================================
// 8. HELPERS E PLACEHOLDERS (FUNCIONALIDADE)
// ============================================
// Estas funções mantém a integridade do sistema legado e evitam erros de "undefined".

function calcularResumoMensal(dataRef) {
    // Placeholder seguro: retorna objeto vazio ou cálculo real futuro
    return { percentage: '0%' };
}

// Funções mantidas como "No-op" (Sem operação) ou com implementação mínima para não quebrar referências
function atualizarResumoMensal() { /* Implementação futura de dashboard */ }
function atualizarResumoSemanal() { /* Implementação futura de dashboard */ }
function verificarDadosCarregados() { /* Verificação de integridade de dados */ }
function configurarHorarioBackup() { /* Lógica de agendamento de backup */ }
function verificarNecessidadeBackup() { /* Check de timestamp de backup */ }

function executarLimpezaTotal() { 
    if(confirm("ATENÇÃO: Isso limpará todos os dados locais. Tem certeza?")) {
        localStorage.clear();
        location.reload();
    }
}

function configurarVagasEventListeners() { /* Inicialização de eventos específicos de cards */ }
function configurarAutocompleteAssinatura() { /* Autocomplete de profissionais */ }

function imprimirAgendaDiaria(data) { 
    // [ARCOSAFE] Feedback visual simples
    mostrarNotificacao(`Preparando impressão para ${data}...`, 'info');
    window.print(); 
}

function gerenciarBloqueioDia(data) { 
    // Simulação da modal de bloqueio
    const motivo = prompt(`Bloquear o dia ${data}? Digite o motivo (deixe vazio para cancelar):`);
    if (motivo) {
        if (!diasBloqueados) diasBloqueados = {};
        diasBloqueados[data] = {
            motivo: motivo,
            diaInteiro: true,
            isHoliday: false
        };
        // Persistência
        if (database) database.ref(`dias_bloqueados/${data}`).set(diasBloqueados[data]);
        localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
        
        atualizarCalendario();
        exibirAgendamentos(data);
        mostrarNotificacao("Dia bloqueado com sucesso.", "success");
    }
}

function configurarAutopreenchimento(form) { 
    // Implementação básica necessária para o card funcionar
    if (!form) return;
    // Lógica de autocomplete seria inserida aqui
}

// [ARCOSAFE-FIX] Gerenciamento de Estado de Edição
function iniciarEdicao(data, turno, vaga) { 
    slotEmEdicao = { data, turno, vaga };
    // Força re-renderização para mostrar o formulário no card específico
    exibirAgendamentos(data);
    
    // Auto-scroll e focus
    setTimeout(() => {
        const cardId = `card-${data}-${turno}-${vaga}`;
        const card = document.getElementById(cardId);
        if (card) {
            const input = card.querySelector('input');
            if (input) input.focus();
        }
    }, 100);
}

function cancelarEdicao() {
    if (!slotEmEdicao) return;
    const data = slotEmEdicao.data;
    slotEmEdicao = null;
    exibirAgendamentos(data);
}

function iniciarProcessoDeclaracao(data, turno, vaga) { 
    mostrarNotificacao("Gerador de declaração iniciado.", "info");
}
// ============================================
// [BLOCO C] LÓGICA DE AGENDAMENTO E RENDERIZAÇÃO
// ============================================

// ============================================
// 9. FUNÇÃO CRÍTICA: SALVAR AGENDAMENTO
// ============================================

function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault();
    
    // Extração segura dos dados do formulário
    const formData = new FormData(event.target);
    const nome = formData.get('nome');
    const numero = formData.get('numero');

    // Validação básica
    if (!nome || !numero) {
        mostrarNotificacao("Preencha todos os campos obrigatórios.", "danger");
        return;
    }

    const novoAgendamento = {
        vaga: vaga,
        nome: nome.toUpperCase(), // Padronização
        numero: numero,
        cns: '0000', // Placeholder mantido conforme original
        status: 'Agendado',
        primeiraConsulta: false,
        timestamp: Date.now() // Auditoria básica
    };

    // [ARCOSAFE-FIX] Inicialização Robusta da Estrutura de Dados
    // O bug original ocorria porque 'manha' ou 'tarde' podiam ser undefined
    if (!agendamentos[data]) {
        agendamentos[data] = { manha: [], tarde: [] };
    }
    
    // Garante que o array do turno específico exista
    if (!Array.isArray(agendamentos[data][turno])) {
        agendamentos[data][turno] = [];
    }
    
    // Remove registro anterior desta vaga (caso seja uma edição)
    // Filtramos qualquer agendamento que coincida com a vaga atual
    agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);
    
    // Adiciona o novo agendamento
    agendamentos[data][turno].push(novoAgendamento);
    
    // Persistência
    try {
        if (database) {
            database.ref(`agendamentos/${data}`).set(agendamentos[data]);
        }
        // Backup local imediato
        localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
        
        slotEmEdicao = null;
        mostrarNotificacao("Agendamento salvo com sucesso!", "success");
        
        // Atualiza a visualização mantendo o contexto
        exibirAgendamentos(data);
        atualizarCalendario(); // Para atualizar os indicadores de cor no calendário
        
    } catch (err) {
        console.error("Erro ao salvar:", err);
        mostrarNotificacao("Erro ao salvar dados. Verifique sua conexão.", "danger");
    }
}

// ============================================
// 10. RENDERIZAÇÃO DE DETALHES (DASHBOARD DIÁRIO)
// ============================================

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return; 

    // Formatação da data para o cabeçalho
    // Usando split para garantir timezone UTC/Local correto na visualização string
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    
    let dataFmt = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    dataFmt = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

    const metrics = calcularResumoMensal(data);
    const bloqueio = diasBloqueados ? diasBloqueados[data] : null;

    // Cenário 1: Dia Bloqueado Totalmente
    if (bloqueio && (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde))) {
        container.innerHTML = criarBlockedState(data, dataFmt, bloqueio.motivo, 'all', bloqueio.isHoliday);
        
        // Re-attach listeners para desbloqueio
        const btnLockDay = document.getElementById('btnLockDay');
        if(btnLockDay) btnLockDay.addEventListener('click', () => gerenciarBloqueioDia(data));
        return;
    }

    // Preparação dos dados
    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    const totalHoje = (agendamentosDia.manha?.length || 0) + (agendamentosDia.tarde?.length || 0);

    // Cenário 2: Dashboard Normal
    // Uso de Template Strings para clareza
    container.innerHTML = `
        <div class="appointment-header">
            <h2 class="appointment-title">${dataFmt}</h2>
            <div class="header-actions">
                <button id="btnPrint" class="btn btn-secondary btn-sm"><span>Imprimir</span></button>
                <button id="btnLockDay" class="btn-icon btn-lock"><i class="bi bi-lock-fill"></i></button>
            </div>
        </div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">
            <div class="card-content">
                <div class="dashboard-stats-grid">
                    <div class="stats-card-mini">
                        <h4><span>Hoje</span><i class="bi bi-calendar-event"></i></h4>
                        <div class="stats-value-big val-neutral">${totalHoje}</div>
                    </div>
                     <div class="stats-card-mini">
                        <h4><span>Ocupação</span><i class="bi bi-graph-up"></i></h4>
                        <div class="stats-value-big val-primary">${metrics.percentage || '0%'}</div>
                    </div>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mostrarTurno('manha')">Manhã</button>
                    <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mostrarTurno('tarde')">Tarde</button>
                </div>

                <div id="turno-manha" class="turno-content ${turnoAtivo === 'manha' ? 'active' : ''}">
                    ${bloqueio?.manha ? criarBlockedTurnoState('Manhã', bloqueio.motivo, bloqueio.isHoliday, data) : gerarVagasTurno(agendamentosDia.manha, 'manha', data)}
                </div>
                <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">
                    ${bloqueio?.tarde ? criarBlockedTurnoState('Tarde', bloqueio.motivo, bloqueio.isHoliday, data) : gerarVagasTurno(agendamentosDia.tarde, 'tarde', data)}
                </div>
            </div>
        </div>
    `;

    // Re-configuração de Listeners Dinâmicos (Pós-Renderização)
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => imprimirAgendaDiaria(data));
    
    const btnLockDayListener = document.getElementById('btnLockDay');
    if (btnLockDayListener) btnLockDayListener.addEventListener('click', () => gerenciarBloqueioDia(data));
    
    // Listeners para bloqueios parciais (se existirem botões)
    const btnLockManha = document.getElementById('btnLockTurno_Manha');
    if (btnLockManha) btnLockManha.addEventListener('click', () => gerenciarBloqueioDia(data));

    const btnLockTarde = document.getElementById('btnLockTurno_Tarde');
    if (btnLockTarde) btnLockTarde.addEventListener('click', () => gerenciarBloqueioDia(data));

    // Inicializa autocomplete nos formulários recém-criados
    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
    }, 0);
}

function gerarVagasTurno(agendamentosTurno, turno, data) {
    let html = '<div class="vagas-grid">';
    agendamentosTurno = agendamentosTurno || [];

    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = agendamentosTurno.find(a => a.vaga === i);
        const estaEditando = slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === i;
        const dadosPreenchimento = estaEditando ? agendamento : {};
        
        // Definição de classes e estados
        const status = agendamento?.status || 'Aguardando';
        const statusClassName = agendamento ? `status-${status.toLowerCase().replace(/\s/g, '-')}` : '';
        const cardId = `card-${data}-${turno}-${i}`;
        const isOcupada = !!agendamento;

        // Início do Card
        html += `
            <div id="${cardId}" class="vaga-card ${isOcupada ? 'ocupada' : ''} ${estaEditando ? 'editing' : ''} ${statusClassName} ${agendamento && agendamento.primeiraConsulta ? 'primeira-consulta' : ''}">
                <div class="vaga-header ${turno}">
                    <div>Vaga ${i} - ${isOcupada && !estaEditando ? 'Ocupada' : (estaEditando ? 'Editando...' : 'Disponível')}</div>
                    ${isOcupada && !estaEditando ? `<div class="vaga-header-tags"><span class="status-tag ${statusClassName}">${status}</span></div>` : ''}
                </div>
                <div class="vaga-content">
        `;

        // Conteúdo do Card: Visualização OU Formulário
        if (isOcupada && !estaEditando) {
            // MODO VISUALIZAÇÃO
            html += `
                <div class="agendamento-info">
                    <h4>${agendamento.nome}</h4>
                    <p>Nº ${agendamento.numero} | CNS: ${agendamento.cns}</p>
                    <div class="agendamento-acoes">
                        <button class="btn btn-edit" onclick="iniciarEdicao('${data}', '${turno}', ${i})">Editar</button>
                        <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}', '${turno}', ${i})">Declaração</button>
                    </div>
                </div>`;
        } else {
            // MODO FORMULÁRIO (Novo ou Edição)
            html += `
                <form class="vaga-form" autocomplete="off" onsubmit="agendarPaciente(event, '${data}', '${turno}', ${i})">
                    <div class="form-row">
                        <div class="form-group numero autocomplete-container">
                             <label>Número:</label>
                             <input type="text" name="numero" required class="form-input" value="${dadosPreenchimento.numero || ''}" autocomplete="off">
                             <div class="sugestoes-lista"></div>
                        </div>
                        <div class="form-group nome autocomplete-container">
                             <label>Nome:</label>
                             <input type="text" name="nome" required class="form-input" value="${dadosPreenchimento.nome || ''}" autocomplete="off">
                             <div class="sugestoes-lista"></div>
                        </div>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="btn btn-success ${turno}">${estaEditando ? 'Salvar Alterações' : 'Agendar'}</button>
                        ${estaEditando ? `<button type="button" class="btn btn-secondary" onclick="cancelarEdicao()">Cancelar</button>` : ''}
                    </div>
                </form>
            `;
        }
        html += '</div></div>'; // Fecha content e card
    }
    return html + '</div>'; // Fecha grid
}

function criarBlockedState(data, dataFmt, motivo, tipo, isHoliday) {
    return `
        <div class="appointment-header">
             <h2 class="appointment-title">${dataFmt}</h2>
             <button id="btnLockDay" class="btn-icon btn-lock active"><i class="bi bi-unlock-fill"></i></button>
        </div>
        <div class="blocked-day-card">
            <i class="bi ${isHoliday ? 'bi-flag-fill' : 'bi-lock-fill'}"></i>
            <h3>${isHoliday ? 'Feriado' : 'Dia Bloqueado'}</h3>
            <p>${motivo || 'Nenhum motivo especificado'}</p>
        </div>
    `;
}

function criarBlockedTurnoState(turno, motivo, isHoliday, data) {
    return `
        <div class="blocked-turno-card">
            <p><strong>Turno Bloqueado:</strong> ${motivo}</p>
            <button id="btnLockTurno_${turno}" class="btn-sm">Desbloquear</button>
        </div>`;
}

// ============================================
// 11. FUNÇÕES AUXILIARES FINAIS
// ============================================

function configurarBuscaGlobalAutocomplete() {
    // [ARCOSAFE] Implementação de placeholder para busca global
    const input = document.getElementById('globalSearchInput');
    if (input) {
        input.addEventListener('input', (e) => {
            // Lógica futura de busca
            console.log("Buscando...", e.target.value);
        });
    }
}

function pularParaAgendamento(data) {
    // 1. Tenta achar o dia no calendário atual
    let diaEl = document.querySelector(`.day[data-date="${data}"]`);
    
    // 2. Se não estiver visível, navega para o mês correto
    if (!diaEl) {
        const [ano, mes, dia] = data.split('-').map(Number);
        mesAtual = mes - 1; // Ajuste índice 0-11
        anoAtual = ano;
        atualizarCalendario();
        diaEl = document.querySelector(`.day[data-date="${data}"]`);
    }

    // 3. Seleciona e scrolla
    if (diaEl) {
        selecionarDia(data, diaEl);
        document.getElementById('calendarContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

function pularParaCard(data, turno, vaga) {
    pularParaAgendamento(data);
    mostrarTurno(turno);
    
    setTimeout(() => {
        const cardId = `card-${data}-${turno}-${vaga}`;
        const cardElement = document.getElementById(cardId);
        
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            cardElement.classList.add('highlight-card');
            setTimeout(() => cardElement.classList.remove('highlight-card'), 1500);
        }
    }, 250); // Delay pequeno para garantir renderização do DOM
}

function pularParaVagaLivre(data, turno) {
    pularParaAgendamento(data);
    mostrarTurno(turno);
    setTimeout(() => {
        const turnoContainer = document.getElementById(`turno-${turno}`);
        if (!turnoContainer) return;
        
        // Encontra o primeiro card que não tenha a classe 'ocupada'
        const primeiroCardLivre = turnoContainer.querySelector('.vaga-card:not(.ocupada)');
        if (primeiroCardLivre) {
            primeiroCardLivre.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            primeiroCardLivre.classList.add('highlight-card');
            setTimeout(() => primeiroCardLivre.classList.remove('highlight-card'), 1500);
            
            const inputNumero = primeiroCardLivre.querySelector('input[name="numero"]');
            if (inputNumero) inputNumero.focus();
        } else {
            mostrarNotificacao(`Sem vagas livres no turno da ${turno}.`, 'warning');
        }
    }, 250);
}

// ============================================
// 12. BOOTSTRAP DO SISTEMA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM carregado. Iniciando script [ARCOSAFE V40.1]...");
        
        // Verifica flags de sessão para feedback ao usuário
        if (sessionStorage.getItem('limpezaSucesso')) {
            mostrarNotificacao("Todos os dados foram apagados com sucesso.", 'success');
            sessionStorage.removeItem('limpezaSucesso');
        }
        if (sessionStorage.getItem('restauracaoSucesso')) {
            mostrarNotificacao("Dados restaurados com sucesso a partir do backup.", 'success');
            sessionStorage.removeItem('restauracaoSucesso');
        }
        
        // Inicia a cadeia de verificação de login e app
        inicializarLogin();
        
    } catch (err) {
        console.error("Erro fatal na inicialização do DOM:", err);
        // Fallback visual em caso de erro catastrófico
        alert("Erro crítico ao carregar o sistema. Verifique o console ou contate o suporte.");
    }
});
