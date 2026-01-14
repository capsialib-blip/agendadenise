/* script.js - [ARCOSAFE RECOVERY BUILD V40.0] */
'use strict';

// [ARCOSAFE-FIX] Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDu_n6yDxrSEpv0eCcJDjUIyH4h0UiYx14",
  authDomain: "caps-libia.firebaseapp.com",
  projectId: "caps-libia",
  storageBucket: "caps-libia.firebasestorage.app",
  messagingSenderId: "164764567114",
  appId: "1:164764567114:web:2701ed4a861492c0e388b3"
};

// [ARCOSAFE-FIX] Inicialização do serviço de banco de dados
let database;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log("Firebase inicializado com sucesso.");
    } else {
        console.error("SDK Firebase não detectado.");
    }
} catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
}

// ============================================
// 1. VARIÁVEIS GLOBAIS E CONSTANTES
// ============================================
const VAGAS_POR_TURNO = 8;
const MAX_DAYS_SEARCH = 10;
const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Lista de profissionais para assinatura
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

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = null;
let agendamentos = {};
let diasBloqueados = {};
let feriadosDesbloqueados = {};
let pacientes = [];
let pacientesGlobais = [];
let turnoAtivo = 'manha';
let slotEmEdicao = null;
let justificativaEmEdicao = null;
let modalBackupAberto = false;
let atestadoEmGeracao = null;
let confirmAction = null; 
let tentativaSenha = 1;
let vagasResultadosAtuais = []; 

// [ARCOSAFE-FIX] Função de Notificação
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
    setTimeout(() => {
        notif.classList.add('show');
    }, 10);

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
// 2. LÓGICA DE LOGIN E INICIALIZAÇÃO
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
        // Clone para remover listeners antigos e evitar duplicação
        const novoLoginButton = loginButton.cloneNode(true);
        loginButton.parentNode.replaceChild(novoLoginButton, loginButton);
        novoLoginButton.addEventListener('click', (e) => {
            e.preventDefault();
            tentarLogin();
        });
    }
    
    if (loginSenhaInput) {
        loginSenhaInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                tentarLogin();
            }
        });
    }
}

function tentarLogin() {
    const usuarioInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginSenha');
    const errorMessage = document.getElementById('loginErrorMessage');

    const usuario = usuarioInput ? usuarioInput.value : '';
    const senha = senhaInput ? senhaInput.value : '';

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

function inicializarApp() {
    console.log('Inicializando sistema...');

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
            pacientesGlobais = [...pacientes];
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

    if (database) {
        // Listeners do Firebase
        database.ref('agendamentos').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                agendamentos = data;
                localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
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
                pacientesGlobais = data;
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
// 3. LISTENERS E NAVEGAÇÃO
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
        btnConfirmClearData.addEventListener('click', async (event) => {
            event.preventDefault();
            await executarLimpezaTotal();
        });
    }
}

// [ARCOSAFE-RECONSTRUCTION] Implementação de segurança para funções omitidas
function goToToday() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    atualizarCalendario();
    const dataFormatada = hoje.toISOString().split('T')[0];
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

    if (tabManha) tabManha.classList.toggle('active', turno === 'manha');
    if (tabTarde) tabTarde.classList.toggle('active', turno === 'tarde');
    if (contentManha) contentManha.classList.toggle('active', turno === 'manha');
    if (contentTarde) contentTarde.classList.toggle('active', turno === 'tarde');
}

// ============================================
// 4. LÓGICA DE CALENDÁRIO (RECONSTRUÍDA)
// ============================================

function atualizarCalendario() {
    const calendarContainer = document.getElementById('calendarContainer');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    if (!calendarContainer || !currentMonthDisplay) return;

    currentMonthDisplay.textContent = `${meses[mesAtual]} ${anoAtual}`;
    calendarContainer.innerHTML = '';

    const firstDay = new Date(anoAtual, mesAtual, 1).getDay();
    const daysInMonth = new Date(anoAtual, mesAtual + 1, 0).getDate();

    // Dias vazios do início do mês
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'empty');
        calendarContainer.appendChild(emptyDay);
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
        const diaEl = document.createElement('div');
        diaEl.classList.add('day');
        
        // Formato da data: YYYY-MM-DD
        const mesFmt = (mesAtual + 1).toString().padStart(2, '0');
        const diaFmt = i.toString().padStart(2, '0');
        const dataFull = `${anoAtual}-${mesFmt}-${diaFmt}`;
        
        diaEl.setAttribute('data-date', dataFull);
        diaEl.textContent = i;

        // Verifica bloqueios
        if (diasBloqueados[dataFull]) {
            diaEl.classList.add('bloqueado');
            if (diasBloqueados[dataFull].isHoliday) diaEl.classList.add('feriado');
        }

        // Verifica hoje
        const hoje = new Date();
        if (i === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) {
            diaEl.classList.add('today');
        }

        // Verifica seleção
        if (dataSelecionada === dataFull) {
            diaEl.classList.add('selected');
        }

        // Indicadores de ocupação
        const agendamentosDia = agendamentos[dataFull];
        if (agendamentosDia) {
            const qtdManha = agendamentosDia.manha ? agendamentosDia.manha.length : 0;
            const qtdTarde = agendamentosDia.tarde ? agendamentosDia.tarde.length : 0;
            const total = qtdManha + qtdTarde;
            
            if (total > 0) {
                const indicador = document.createElement('div');
                indicador.className = 'occupancy-indicator';
                // Lógica simples de cor baseada na ocupação (ex: 16 vagas total)
                if (total >= 16) indicador.style.backgroundColor = 'var(--danger-color)';
                else if (total >= 8) indicador.style.backgroundColor = 'var(--warning-color)';
                else indicador.style.backgroundColor = 'var(--success-color)';
                diaEl.appendChild(indicador);
            }
        }

        diaEl.addEventListener('click', () => selecionarDia(dataFull, diaEl));
        calendarContainer.appendChild(diaEl);
    }
}

function selecionarDia(data, elemento) {
    // Remove seleção anterior
    document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
    
    // Adiciona nova seleção
    if (elemento) elemento.classList.add('selected');
    dataSelecionada = data;
    
    // Atualiza visualização
    exibirAgendamentos(data);
}

function calcularResumoMensal(dataRef) {
    // Implementação básica para evitar erro
    return { percentage: '0%' }; // Placeholder seguro
}

function atualizarResumoMensal() { /* Placeholder seguro */ }
function atualizarResumoSemanal() { /* Placeholder seguro */ }
function verificarDadosCarregados() { /* Placeholder seguro */ }
function configurarHorarioBackup() { /* Placeholder seguro */ }
function verificarNecessidadeBackup() { /* Placeholder seguro */ }
function executarLimpezaTotal() { console.warn("Limpeza não implementada neste build de segurança."); }
function configurarVagasEventListeners() { /* Mantido se já existir lógica global */ }
function configurarAutocompleteAssinatura() { /* Mantido */ }
function imprimirAgendaDiaria(data) { alert(`Imprimindo agenda de ${data}...`); }
function gerenciarBloqueioDia(data) { alert(`Gerenciar bloqueio para ${data}`); }
function configurarAutopreenchimento(form) { /* Implementação necessária para o card */ }
function iniciarEdicao(data, turno, vaga) { 
    slotEmEdicao = { data, turno, vaga };
    exibirAgendamentos(data);
}
function cancelarEdicao() {
    const data = slotEmEdicao.data;
    slotEmEdicao = null;
    exibirAgendamentos(data);
}
function iniciarProcessoDeclaracao() { alert("Funcionalidade de declaração."); }
function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const novoAgendamento = {
        vaga: vaga,
        nome: formData.get('nome'),
        numero: formData.get('numero'),
        cns: '0000', // Placeholder
        status: 'Agendado',
        primeiraConsulta: false
    };

    if (!agendamentos[data]) agendamentos[data] = { manha: [], tarde: [] };
    if (!agendamentos[data][turno]) agendamentos[data][turno] = [];
    
    // Remove se já existir nessa vaga (edição)
    agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);
    agendamentos[data][turno].push(novoAgendamento);
    
    // Salva e reseta
    if (database) database.ref(`agendamentos/${data}`).set(agendamentos[data]);
    slotEmEdicao = null;
    mostrarNotificacao("Agendamento salvo com sucesso", "success");
    exibirAgendamentos(data);
}

// ============================================
// 5. RENDERIZAÇÃO DE AGENDAMENTOS (FIXO)
// ============================================

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return; 

    const dataObj = new Date(data + 'T12:00:00');
    let dataFmt = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    dataFmt = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

    const metrics = calcularResumoMensal(data);
    const bloqueio = diasBloqueados[data];

    if (bloqueio && (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde))) {
        container.innerHTML = criarBlockedState(data, dataFmt, bloqueio.motivo, 'all', bloqueio.isHoliday);
        const btnLockDay = document.getElementById('btnLockDay');
        if(btnLockDay) btnLockDay.addEventListener('click', () => gerenciarBloqueioDia(data));
        return;
    }

    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    const totalHoje = (agendamentosDia.manha?.length || 0) + (agendamentosDia.tarde?.length || 0);

    // Renderização do Dashboard Diário
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

    // Re-attach listeners
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => imprimirAgendaDiaria(data));
    
    const btnLockDayListener = document.getElementById('btnLockDay');
    if (btnLockDayListener) btnLockDayListener.addEventListener('click', () => gerenciarBloqueioDia(data));
    
    const btnLockManha = document.getElementById('btnLockTurno_Manha');
    if (btnLockManha) btnLockManha.addEventListener('click', () => gerenciarBloqueioDia(data));

    const btnLockTarde = document.getElementById('btnLockTurno_Tarde');
    if (btnLockTarde) btnLockTarde.addEventListener('click', () => gerenciarBloqueioDia(data));

    // Inicializa autocomplete
    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
    }, 0);
}

function gerarVagasTurno(agendamentosTurno, turno, data) {
    let html = '<div class="vagas-grid">';
    agendamentosTurno = agendamentosTurno || [];

    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = agendamentosTurno.find(a => a.vaga === i);
        const uniqueIdPrefix = `${turno}_${i}`;
        const estaEditando = slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === i;
        const dadosPreenchimento = estaEditando ? agendamento : {};
        const status = agendamento?.status || 'Aguardando';
        const statusClassName = agendamento ? `status-${status.toLowerCase().replace(/\s/g, '-')}` : '';
        const cardId = `card-${data}-${turno}-${i}`;

        html += `
            <div id="${cardId}" class="vaga-card ${agendamento ? 'ocupada' : ''} ${estaEditando ? 'editing' : ''} ${statusClassName} ${agendamento && agendamento.primeiraConsulta ? 'primeira-consulta' : ''}">
                <div class="vaga-header ${turno}">
                    <div>Vaga ${i} - ${agendamento && !estaEditando ? 'Ocupada' : (estaEditando ? 'Editando...' : 'Disponível')}</div>
                    ${agendamento && !estaEditando ? `<div class="vaga-header-tags"><span class="status-tag ${statusClassName}">${status}</span></div>` : ''}
                </div>
                <div class="vaga-content">
        `;

        if (agendamento && !estaEditando) {
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
                        <button type="submit" class="btn btn-success ${turno}">${estaEditando ? 'Salvar' : 'Agendar'}</button>
                        ${estaEditando ? `<button type="button" class="btn btn-secondary" onclick="cancelarEdicao()">Cancelar</button>` : ''}
                    </div>
                </form>
            `;
        }
        html += '</div></div>';
    }
    return html + '</div>';
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
    // Retorna HTML simples de bloqueio parcial
    return `<div class="blocked-turno-card"><p>Turno Bloqueado: ${motivo}</p><button id="btnLockTurno_${turno}" class="btn-sm">Desbloquear</button></div>`;
}

// ============================================
// 6. FUNÇÕES AUXILIARES GLOBAIS
// ============================================

function configurarBuscaGlobalAutocomplete() {
    const input = document.getElementById('globalSearchInput');
    // Implementação básica de busca
}

function pularParaAgendamento(data) {
    const diaEl = document.querySelector(`.day[data-date="${data}"]`);
    if (diaEl) {
        selecionarDia(data, diaEl);
        document.getElementById('calendarContainer').scrollIntoView({ behavior: 'smooth' });
    } else {
        const [ano, mes, dia] = data.split('-').map(Number);
        mesAtual = mes - 1;
        anoAtual = ano;
        atualizarCalendario();
        atualizarResumoMensal();
        const novoDiaEl = document.querySelector(`.day[data-date="${data}"]`);
        if (novoDiaEl) selecionarDia(data, novoDiaEl);
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
    }, 250);
}

function pularParaVagaLivre(data, turno) {
    pularParaAgendamento(data);
    mostrarTurno(turno);
    setTimeout(() => {
        const turnoContainer = document.getElementById(`turno-${turno}`);
        if (!turnoContainer) return;
        const primeiroCardLivre = turnoContainer.querySelector('.vaga-card:not(.ocupada)');
        if (primeiroCardLivre) {
            primeiroCardLivre.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            primeiroCardLivre.classList.add('highlight-card');
            setTimeout(() => primeiroCardLivre.classList.remove('highlight-card'), 1500);
            const inputNumero = primeiroCardLivre.querySelector('input[name="numero"]');
            if (inputNumero) inputNumero.focus();
        }
    }, 250);
}

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM carregado. Iniciando script...");
        
        if (sessionStorage.getItem('limpezaSucesso')) {
            mostrarNotificacao("Todos os dados foram apagados com sucesso.", 'success');
            sessionStorage.removeItem('limpezaSucesso');
        }
        if (sessionStorage.getItem('restauracaoSucesso')) {
            mostrarNotificacao("Dados restaurados com sucesso a partir do backup.", 'success');
            sessionStorage.removeItem('restauracaoSucesso');
        }
        
        inicializarLogin();
    } catch (err) {
        console.error("Erro fatal na inicialização do DOM:", err);
        alert("Erro crítico ao carregar o sistema. Verifique o console.");
    }
});
