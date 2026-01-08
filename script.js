/* script.js - VERSÃO FINAL (Sintaxe Corrigida + Lixeira Blindada) */
'use strict';

console.log("Sistema Iniciado: Versão Final Blindada");

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDu_n6yDxrSEpv0eCcJDjUIyH4h0UiYx14",
  authDomain: "caps-libia.firebaseapp.com",
  projectId: "caps-libia",
  storageBucket: "caps-libia.firebasestorage.app",
  messagingSenderId: "164764567114",
  appId: "1:164764567114:web:2701ed4a861492c0e388b3"
};

// Inicialização do Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase conectado.");
} catch (e) {
    console.error("Erro Firebase:", e);
}

// ============================================
// 1. VARIÁVEIS GLOBAIS
// ============================================
const VAGAS_POR_TURNO = 8;
const MAX_DAYS_SEARCH = 10;
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Lista de Profissionais
const PROFISSIONAIS_LISTA = [
    { nome: "ALESSANDRA OLIVEIRA MONTALVAO DA CRUZ", funcao: "ASSISTENTE ADMINISTRATIVO" },
    { nome: "ANDRESSA RIBEIRO LEAL", funcao: "ENFERMEIRO" },
    { nome: "CAROLINE OLIVEIRA LEDO", funcao: "ASSISTENTE SOCIAL" },
    { nome: "DENISE CORREA DOS SANTOS", funcao: "MEDICO" },
    { nome: "DJENTILÂME FAMINÉ SANTA RITA", funcao: "PSICOLOGO CLINICO" },
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
    { nome: "TALITA LUANA DOS SANTOS SILVA", funcao: "TERAPEUTA OCUPACIONAL" },
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
let reportCurrentStatus = null; 
let reportUnfilteredResults = []; 
let atestadoEmGeracao = null;
let confirmAction = null; 
let tentativaSenha = 1;
let vagasResultadosAtuais = []; 

// ============================================
// 2. INICIALIZAÇÃO E LOGIN
// ============================================

function inicializarLogin() {
    if (sessionStorage.getItem('usuarioLogado') === 'true') {
        document.body.classList.add('logged-in');
        inicializarApp();
    } else {
        configurarEventListenersLogin();
    }
}

function configurarEventListenersLogin() {
    const loginButton = document.getElementById('loginButton');
    const loginSenhaInput = document.getElementById('loginSenha');
    
    if (loginButton) {
        const novoLoginButton = loginButton.cloneNode(true);
        loginButton.parentNode.replaceChild(novoLoginButton, loginButton);
        novoLoginButton.addEventListener('click', tentarLogin);
    }
    
    if (loginSenhaInput) {
        loginSenhaInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') tentarLogin();
        });
    }
}

function tentarLogin() {
    const usuarioInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginSenha');
    const errorMessage = document.getElementById('loginErrorMessage');

    if (usuarioInput.value === '0000' && senhaInput.value === '0000') {
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
    // Carrega do LocalStorage primeiro para rapidez
    try {
        agendamentos = JSON.parse(localStorage.getItem('agenda_completa_final')) || {};
        pacientesGlobais = JSON.parse(localStorage.getItem('pacientes_dados')) || [];
        pacientes = [...pacientesGlobais];
        diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados')) || {};
        feriadosDesbloqueados = JSON.parse(localStorage.getItem('feriados_desbloqueados')) || {};
    } catch(e) { console.warn("Erro ao carregar cache:", e); }

    // Conecta Listeners do Firebase (COM CORREÇÃO DE NULL)
    if (database) {
        database.ref('agendamentos').on('value', (snapshot) => {
            const data = snapshot.val();
            // CORREÇÃO CRÍTICA: Se data for null, usa {}
            agendamentos = data || {}; 
            localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
            
            // Atualiza Interface
            atualizarCalendario();
            if (dataSelecionada) exibirAgendamentos(dataSelecionada);
            atualizarResumoMensal();
            atualizarResumoSemanal(new Date());
            verificarDadosCarregados();
        });

        database.ref('dias_bloqueados').on('value', (snapshot) => {
            const data = snapshot.val();
            diasBloqueados = data || {}; // Trata apagamento
            localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
            atualizarCalendario();
            if (dataSelecionada) exibirAgendamentos(dataSelecionada);
        });

        database.ref('pacientes').on('value', (snapshot) => {
            const data = snapshot.val();
            pacientesGlobais = data || []; // Trata apagamento
            pacientes = [...pacientesGlobais];
            localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
            verificarDadosCarregados();
        });

        database.ref('feriados_desbloqueados').on('value', (snapshot) => {
            const data = snapshot.val();
            feriadosDesbloqueados = data || {}; // Trata apagamento
            localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
            atualizarCalendario();
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
    // Botões Principais
    document.getElementById('btnHoje')?.addEventListener('click', goToToday);
    document.getElementById('btnMesAnterior')?.addEventListener('click', voltarMes);
    document.getElementById('btnProximoMes')?.addEventListener('click', avancarMes);

    // Importação/Backup
    document.getElementById('btnImportar')?.addEventListener('click', () => document.getElementById('htmlFile').click());
    document.getElementById('htmlFile')?.addEventListener('change', handleHtmlFile);
    document.getElementById('btnBackup')?.addEventListener('click', fazerBackup);
    document.getElementById('btnRestaurar')?.addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile')?.addEventListener('change', restaurarBackup);
    
    // Lixeira e Confirmações
    document.getElementById('btnLimparDados')?.addEventListener('click', abrirModalLimpeza);
    document.getElementById('btnCancelClearData')?.addEventListener('click', fecharModalLimpeza);
    document.getElementById('btnConfirmClearData')?.addEventListener('click', executarLimpezaTotal);
    document.getElementById('togglePassword')?.addEventListener('click', togglePasswordVisibility);

    // Modais e Ações
    document.getElementById('btnDeclaracaoPaciente')?.addEventListener('click', gerarDeclaracaoPaciente);
    document.getElementById('btnDeclaracaoAcompanhante')?.addEventListener('click', gerarDeclaracaoAcompanhante);
    document.getElementById('btnCancelarChoice')?.addEventListener('click', fecharModalEscolha);
    document.getElementById('btnFecharDeclaracao')?.addEventListener('click', fecharModalAtestado);
    document.getElementById('btnImprimirDeclaracao')?.addEventListener('click', imprimirDeclaracao);
    document.getElementById('btnConfirmarAcompanhante')?.addEventListener('click', confirmarNomeAcompanhante);
    document.getElementById('btnCancelarAcompanhante')?.addEventListener('click', fecharModalAcompanhante);
    
    document.getElementById('acompanhanteNomeInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') confirmarNomeAcompanhante();
    });

    document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModalConfirmacao);
    document.getElementById('confirmButton')?.addEventListener('click', executarAcaoConfirmada);

    document.getElementById('btnCancelarJustificativa')?.addEventListener('click', fecharModalJustificativa);
    document.getElementById('btnConfirmarJustificativa')?.addEventListener('click', salvarJustificativa);

    document.getElementById('btnCancelarBloqueio')?.addEventListener('click', fecharModalBloqueio);
    document.getElementById('btnConfirmarBloqueio')?.addEventListener('click', confirmarBloqueio);

    // Radios Justificativa
    document.querySelectorAll('input[name="justificativaTipo"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const container = document.getElementById('reagendamentoDataContainer');
            if(container) container.style.display = e.target.value === 'Reagendado' ? 'block' : 'none';
        });
    });

    // Busca Global
    document.getElementById('globalSearchButton')?.addEventListener('click', buscarAgendamentosGlobais);
    document.getElementById('globalSearchInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') buscarAgendamentosGlobais();
    });

    // Relatórios
    document.getElementById('btnFecharReportModal')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnFecharReportModalFooter')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnPrintReport')?.addEventListener('click', () => handlePrint('printing-report'));
    document.getElementById('btnApplyFilter')?.addEventListener('click', aplicarFiltroRelatorio);
    document.getElementById('btnClearFilter')?.addEventListener('click', limparFiltroRelatorio);
    document.getElementById('reportFilterType')?.addEventListener('change', atualizarValoresFiltro);
    document.getElementById('btnVerRelatorioAnual')?.addEventListener('click', () => abrirModalRelatorio(null, 'current_year'));

    // Backup Modal
    document.getElementById('btnBackupModalAction')?.addEventListener('click', () => {
        fazerBackup(); 
        fecharModalBackup(); 
    });
}

function configurarVagasEventListeners() {
    document.getElementById('btnProcurarVagas')?.addEventListener('click', procurarVagas);
    document.getElementById('btnClearVagasSearch')?.addEventListener('click', limparBuscaVagas);
    document.getElementById('btnPrintVagas')?.addEventListener('click', imprimirVagas);

    const startDateInput = document.getElementById('vagasStartDate');
    const endDateInput = document.getElementById('vagasEndDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault(); 
                endDateInput.focus();   
            }
        });
        startDateInput.addEventListener('input', () => {
            if (startDateInput.value && parseInt(startDateInput.value.split('-')[0], 10) > 999) {
                endDateInput.focus();
            }
        });
    }
}

// ============================================
// 4. LÓGICA DE DADOS (CRUD)
// ============================================

function verificarDadosCarregados() {
    const indicator = document.getElementById('dataLoadedIndicator');
    const indicatorText = document.getElementById('indicatorText');
    if (indicator && indicatorText) {
        const temDados = pacientesGlobais.length > 0 || Object.keys(agendamentos).length > 0;
        indicator.className = `data-loaded-indicator ${temDados ? 'loaded' : 'not-loaded'}`;
        indicatorText.textContent = temDados ? "Dados Carregados" : "Sem Dados Carregados";
    }
}

function salvarAgendamentos() {
    try {
        if (database) database.ref('agendamentos').set(agendamentos);
        localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
        return true;
    } catch (e) { return false; }
}

function salvarBloqueios() {
    try {
        if (database) database.ref('dias_bloqueados').set(diasBloqueados);
        localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
        return true;
    } catch (e) { return false; }
}

function salvarFeriadosDesbloqueados() {
    try {
        if (database) database.ref('feriados_desbloqueados').set(feriadosDesbloqueados);
        localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
        return true;
    } catch (e) { return false; }
}

function salvarPacientesNoLocalStorage() {
    try {
        if (database) database.ref('pacientes').set(pacientesGlobais);
        localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
        return true;
    } catch (e) { return false; }
}

// ============================================
// 5. FUNÇÕES DE LIMPEZA E SEGURANÇA
// ============================================

function executarLimpezaTotal() {
    const passwordInput = document.getElementById('clearDataPassword');
    const errorMessage = document.getElementById('clearDataError');
    if (!passwordInput || !errorMessage) return;

    if (passwordInput.value === 'apocalipse') {
        
        // --- 1. LIMPEZA IMEDIATA DA MEMÓRIA ---
        agendamentos = {};
        pacientesGlobais = [];
        pacientes = [];
        diasBloqueados = {};
        feriadosDesbloqueados = {};

        // --- 2. DESLIGAR LISTENERS (Evita re-download) ---
        if (typeof database !== 'undefined' && database) {
            try {
                database.ref('agendamentos').off();
                database.ref('pacientes').off();
                database.ref('dias_bloqueados').off();
                database.ref('feriados_desbloqueados').off();
            } catch(e) {}

            // --- 3. EXCLUSÃO NA NUVEM COM TIMEOUT DE SEGURANÇA ---
            // Se o Firebase demorar mais de 3s, forçamos o reload limpo.
            const firebasePromise = Promise.all([
                database.ref('agendamentos').remove(),
                database.ref('pacientes').remove(),
                database.ref('dias_bloqueados').remove(),
                database.ref('feriados_desbloqueados').remove()
            ]);

            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));

            Promise.race([firebasePromise, timeoutPromise]).then(() => {
                finalizarLimpeza();
            });

        } else {
            finalizarLimpeza(); // Modo Offline
        }

    } else {
        // Senha incorreta
        errorMessage.textContent = 'Senha incorreta!';
        errorMessage.classList.remove('hidden');
        if (typeof tentativaSenha !== 'undefined' && tentativaSenha === 1) {
            errorMessage.textContent = 'Senha incorreta! O robô de limpeza está preparando o polidor.';
            tentativaSenha++;
        }
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function finalizarLimpeza() {
    localStorage.clear(); 
    sessionStorage.setItem('limpezaSucesso', 'true');
    location.reload();
}

function abrirModalLimpeza() {
    const modal = document.getElementById('clearDataModal');
    if (modal) {
        modal.style.display = 'flex';
        const passInput = document.getElementById('clearDataPassword');
        if (passInput) passInput.focus();
        document.getElementById('clearDataError').classList.add('hidden');
    }
}

function fecharModalLimpeza() {
    const modal = document.getElementById('clearDataModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('clearDataPassword').value = '';
    tentativaSenha = 1;
}

function togglePasswordVisibility() {
    const i = document.getElementById('clearDataPassword');
    const icon = document.querySelector('#togglePassword i');
    if (i && icon) {
        i.type = i.type === 'password' ? 'text' : 'password';
        icon.className = i.type === 'password' ? 'bi bi-eye-slash' : 'bi bi-eye';
    }
}

// ============================================
// 6. NAVEGAÇÃO E CALENDÁRIO
// ============================================

function voltarMes() {
    if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else { mesAtual--; }
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1));
}

function avancarMes() {
    if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else { mesAtual++; }
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1));
}

function goToToday() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(hoje);

    const diaEl = document.querySelector(`.day[data-date="${dataFormatada}"]`);
    if (diaEl && !diaEl.classList.contains('weekend')) {
        selecionarDia(dataFormatada, diaEl);
    } else {
        dataSelecionada = null;
        const container = document.getElementById('appointmentsContainer');
        if (container) container.innerHTML = criarEmptyState();
        esconderBolinhasDisponibilidade();
        const hint = document.getElementById('floatingDateHint');
        if(hint) hint.classList.remove('visible');
    }
}

function selecionarDia(data, elemento) {
    slotEmEdicao = null;
    const diaSelecionadoAnterior = document.querySelector('.day.selected');
    if(diaSelecionadoAnterior) diaSelecionadoAnterior.classList.remove('selected');
    if(elemento) elemento.classList.add('selected');
    dataSelecionada = data;
    exibirAgendamentos(data);
    
    atualizarBolinhasDisponibilidade(data);
    atualizarResumoMensal(new Date(data + 'T12:00:00'));

    const hint = document.getElementById('floatingDateHint');
    if (hint) {
        const dataObj = new Date(data + 'T12:00:00');
        const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
        let dataTexto = dataObj.toLocaleDateString('pt-BR', opcoes);
        dataTexto = dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1);
        hint.textContent = dataTexto;
        hint.classList.add('visible');
    }
}

// ... (Restante das funções auxiliares, sem alterações de lógica, apenas restaurando as declarações)

function getFeriados(ano) {
    function calcularPascoa(ano) {
        const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
        const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31);
        const dia = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(ano, mes - 1, dia);
    }
    const pascoa = calcularPascoa(ano);
    const umDia = 24 * 60 * 60 * 1000;
    const feriados = new Map();
    const feriadosFixos = [
        { mes: 1, dia: 1, nome: "Confraternização Universal" },
        { mes: 4, dia: 21, nome: "Tiradentes" },
        { mes: 5, dia: 1, nome: "Dia do Trabalho" },
        { mes: 9, dia: 7, nome: "Independência do Brasil" },
        { mes: 10, dia: 12, nome: "Nossa Senhora Aparecida" },
        { mes: 11, dia: 2, nome: "Finados" },
        { mes: 11, dia: 15, nome: "Proclamação da República" },
        { mes: 12, dia: 25, nome: "Natal" }
    ];
    feriadosFixos.forEach(f => feriados.set(`${ano}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`, f.nome));
    const feriadosMoveis = [
        { data: new Date(pascoa.getTime() - 47 * umDia), nome: "Carnaval" },
        { data: new Date(pascoa.getTime() - 2 * umDia), nome: "Sexta-feira Santa" },
        { data: new Date(pascoa.getTime() + 60 * umDia), nome: "Corpus Christi" }
    ];
    feriadosMoveis.forEach(f => feriados.set(`${f.data.getFullYear()}-${String(f.data.getMonth() + 1).padStart(2, '0')}-${String(f.data.getDate()).padStart(2, '0')}`, f.nome));
    return feriados;
}

function atualizarCalendario() {
    const container = document.getElementById('calendarContainer');
    const mesAnoEl = document.getElementById('mesAno');
    if (!container || !mesAnoEl) return;

    mesAnoEl.textContent = `${meses[mesAtual]} ${anoAtual}`;
    container.innerHTML = '';
    const feriadosDoAno = getFeriados(anoAtual);
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(dia => {
        const d = document.createElement('div'); d.className = 'weekday'; d.textContent = dia; calendarGrid.appendChild(d);
    });

    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const hoje = new Date();
    const hojeFmt = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < primeiroDia; i++) calendarGrid.appendChild(document.createElement('div'));

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const dObj = new Date(dStr + "T00:00:00");
        const diaSemana = dObj.getDay();
        const el = document.createElement('div');
        el.className = 'day'; el.textContent = dia; el.setAttribute('data-date', dStr);

        const feriado = feriadosDoAno.get(dStr);
        if (feriado && !feriadosDesbloqueados[dStr]) {
            el.classList.add('day-holiday'); el.title = feriado;
            if (!diasBloqueados[dStr]) diasBloqueados[dStr] = { diaInteiro: true, motivo: feriado, isHoliday: true };
        }
        
        const b = diasBloqueados[dStr];
        let blocked = false;
        if (b) {
            if (b.diaInteiro || (b.manha && b.tarde)) { el.classList.add('blocked-day'); blocked = true; }
            else { if (b.manha) el.classList.add('blocked-morning'); if (b.tarde) el.classList.add('blocked-afternoon'); }
        }

        if (diaSemana === 0 || diaSemana === 6) el.classList.add('weekend');
        else {
            el.classList.add('workday');
            el.onclick = (e) => { e.stopPropagation(); selecionarDia(dStr, el); };
            if (agendamentos[dStr] && ((agendamentos[dStr].manha?.length) || (agendamentos[dStr].tarde?.length)) && !blocked) el.classList.add('day-has-appointments');
        }
        if (dStr === hojeFmt) el.classList.add('today');
        if (dStr === dataSelecionada) el.classList.add('selected');
        calendarGrid.appendChild(el);
    }
    container.appendChild(calendarGrid);
}

function criarBlockedState(data, dataFmt, motivo, tipo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x-fill' : 'bi-lock-fill';
    return `<div class="appointment-header"><h2 class="appointment-title">${dataFmt}</h2><div class="header-actions"><button id="btnLockDay" class="btn-icon btn-lock"><i class="bi bi-unlock-fill"></i></button></div></div><div class="glass-card"><div class="card-content"><div class="blocked-state"><i class="bi ${icon} blocked-icon"></i><h3>Agenda Bloqueada</h3><p>Motivo: <strong>${motivo || 'Não especificado'}</strong></p></div></div></div>`;
}

function criarBlockedTurnoState(turno, motivo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x' : 'bi-lock-fill';
    return `<div class="blocked-state turno"><i class="bi ${icon} blocked-icon"></i><h4>Turno da ${turno} Bloqueado</h4><p>Motivo: <strong>${motivo || 'Não especificado'}</strong></p></div>`;
}

function criarEmptyState() {
    return `<div class="glass-card empty-state-card"><div class="card-content"><div class="empty-state"><i class="bi bi-calendar-check empty-icon" style="font-size:3rem"></i><h3>Selecione uma Data</h3><p>Clique num dia útil no calendário.</p></div></div></div>`;
}

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;
    const d = new Date(data + 'T12:00:00');
    let dFmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    dFmt = dFmt.charAt(0).toUpperCase() + dFmt.slice(1);
    const metrics = calcularResumoMensal(data);
    const bloqueio = diasBloqueados[data];

    if (bloqueio && (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde))) {
        container.innerHTML = criarBlockedState(data, dFmt, bloqueio.motivo, 'all', bloqueio.isHoliday);
        document.getElementById('btnLockDay')?.addEventListener('click', () => gerenciarBloqueioDia(data));
        return;
    }

    const ag = agendamentos[data] || { manha: [], tarde: [] };
    const total = (ag.manha?.length || 0) + (ag.tarde?.length || 0);

    container.innerHTML = `
        <div class="appointment-header"><h2 class="appointment-title">${dFmt}</h2><div class="header-actions"><button id="btnPrint" class="btn btn-secondary btn-sm"><i class="bi bi-printer-fill"></i> Imprimir</button><button id="btnLockDay" class="btn-icon btn-lock"><i class="bi bi-lock-fill"></i></button></div></div>
        <div class="glass-card"><div class="card-content">
            <div class="dashboard-stats-grid">
                <div class="stats-card-mini"><h4><span>Hoje</span><i class="bi bi-calendar-event"></i></h4><div class="stats-value-big val-neutral">${total}</div><div class="stats-meta">Pacientes Agendados</div></div>
                <div class="stats-card-mini"><h4><span>Ocupação</span><i class="bi bi-graph-up"></i></h4><div class="stats-value-big val-primary">${metrics.percentage}%</div><div class="stats-meta">${metrics.occupiedCount}/${metrics.capacityTotal} Vagas</div></div>
                <div class="stats-card-mini"><h4><span>Abstenções</span><i class="bi bi-x-circle val-danger"></i></h4><div class="stats-value-big val-danger">${metrics.abstencaoCount}</div><div class="stats-meta">${metrics.abstencaoPercent}%</div></div>
                <div class="stats-card-mini"><h4><span>Atendimentos</span><i class="bi bi-check-circle val-success"></i></h4><div class="stats-value-big val-success">${metrics.atendimentoCount}</div><div class="stats-meta">${metrics.atendimentoPercent}%</div></div>
            </div>
            <div class="tabs"><button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mostrarTurno('manha')">Manhã</button><button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mostrarTurno('tarde')">Tarde</button></div>
            <div id="turnoIndicator" class="turno-indicator ${turnoAtivo}">${turnoAtivo === 'manha' ? '<i class="bi bi-brightness-high-fill"></i> MANHÃ (08:00 - 12:00)' : '<i class="bi bi-moon-stars-fill"></i> TARDE (13:00 - 17:00)'}</div>
            <div id="turno-manha" class="turno-content ${turnoAtivo === 'manha' ? 'active' : ''}">${bloqueio?.manha ? criarBlockedTurnoState('Manhã', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(ag.manha, 'manha', data)}</div>
            <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">${bloqueio?.tarde ? criarBlockedTurnoState('Tarde', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(ag.tarde, 'tarde', data)}</div>
        </div></div>`;

    document.getElementById('btnPrint')?.addEventListener('click', () => imprimirAgendaDiaria(data));
    document.getElementById('btnLockDay')?.addEventListener('click', () => gerenciarBloqueioDia(data));
    
    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
        document.querySelectorAll('input[name="agendadoPor"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                const map = { '01': 'Alessandra', '02': 'Nicole' };
                if (map[e.target.value.trim()]) e.target.value = map[e.target.value.trim()];
            });
        });
    }, 0);
}

function gerarVagasTurno(lista = [], turno, data) {
    let html = '<div class="vagas-grid">';
    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const ag = lista.find(a => a.vaga === i);
        const edit = slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === i;
        const d = edit ? ag : {};
        const status = ag?.status || 'Aguardando';
        const stClass = ag ? `status-${status.toLowerCase().replace(' ', '-')}` : '';
        const id = `card-${data}-${turno}-${i}`;

        html += `<div id="${id}" class="vaga-card ${ag ? 'ocupada' : ''} ${edit ? 'editing' : ''} ${stClass} ${ag?.primeiraConsulta ? 'primeira-consulta' : ''}">
            <div class="vaga-header ${turno}"><div>Vaga ${i} - ${ag && !edit ? 'Ocupada' : (edit ? 'Editando...' : 'Disponível')}</div>
            ${ag && !edit ? `<div class="vaga-header-tags">${ag.primeiraConsulta ? '<span class="primeira-consulta-tag">1ª Consulta</span>' : ''}<span class="status-tag ${stClass}">${status}</span></div>` : ''}</div>
            <div class="vaga-content">`;

        if (ag && !edit) {
            html += `<div class="agendamento-info"><div class="info-content"><div class="paciente-header"><h4 class="paciente-nome">${ag.nome}</h4><div class="paciente-numero"><span class="paciente-numero-value">Nº ${ag.numero}</span></div></div>
            <div class="paciente-info"><p class="info-line"><span class="info-icon icon-cns"><i class="bi bi-person-vcard"></i></span><strong>CNS:</strong> ${ag.cns}</p>
            ${ag.distrito ? `<p class="info-line"><span class="info-icon icon-distrito"><i class="bi bi-geo-alt-fill"></i></span><strong>Distrito:</strong> ${ag.distrito}</p>` : ''}
            ${ag.tecRef ? `<p class="info-line"><span class="info-icon icon-tecref"><i class="bi bi-people-fill"></i></span><strong>Téc. Ref.:</strong> ${ag.tecRef}</p>` : ''}
            ${ag.agendadoPor ? `<p class="info-line"><span class="info-icon"><i class="bi bi-person-check-fill"></i></span><strong>Agendado por:</strong> ${ag.agendadoPor}</p>` : ''}
            ${ag.cid ? `<p class="info-line"><span class="info-icon icon-cid"><i class="bi bi-search"></i></span><strong>CID:</strong> ${ag.cid.toUpperCase()}</p>` : ''}</div>
            ${ag.status === 'Justificou' && ag.justificativa ? `<div class="justificativa-display"><p><strong>Justificativa:</strong> ${ag.justificativa.tipo === 'Reagendado' ? `Reagendado para ${new Date(ag.justificativa.detalhe + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Contato TR'}</p></div>` : ''}
            <div class="status-buttons-container">
                <button class="btn btn-sm btn-status ${status === 'Compareceu' ? 'active' : ''}" onclick="marcarStatus('${data}','${turno}',${i},'Compareceu')"><i class="bi bi-check-circle-fill"></i> Compareceu</button>
                <button class="btn btn-sm btn-status ${status === 'Faltou' ? 'active' : ''}" onclick="marcarStatus('${data}','${turno}',${i},'Faltou')"><i class="bi bi-x-circle-fill"></i> Faltou</button>
                <button class="btn btn-sm btn-status ${status === 'Justificou' ? 'active' : ''}" onclick="marcarStatus('${data}','${turno}',${i},'Justificou')"><i class="bi bi-exclamation-circle-fill"></i> Justificou</button>
            </div>
            ${ag.solicitacoes?.length ? `<div class="solicitacoes-display"><strong class="solicitacoes-display-title">Solicitações:</strong><div class="tags-container">${ag.solicitacoes.map(s => `<span class="solicitacao-tag">${s}</span>`).join('')}</div></div>` : ''}
            ${ag.observacao ? `<div class="observacao-display"><p><strong>Observação:</strong> ${ag.observacao}</p></div>` : ''}</div>
            <div class="agendamento-acoes">
                <button class="btn btn-edit" onclick="iniciarEdicao('${data}','${turno}',${i})"><i class="bi bi-pencil-square"></i> Editar</button>
                <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}','${turno}',${i})">Declaração</button>
                <button class="btn btn-danger btn-cancel-appointment" onclick="abrirModalConfirmacao('Cancelar agendamento?', () => executarCancelamento('${data}','${turno}',${i}))">Cancelar</button>
            </div></div>`;
        } else {
            const checks = d.solicitacoes || [];
            const check = (v) => checks.includes(v) ? 'checked' : '';
            html += `<form class="vaga-form" onsubmit="agendarPaciente(event, '${data}', '${turno}', ${i})"><div class="form-content-wrapper">
            <div class="form-group-checkbox-single"><input type="checkbox" name="primeiraConsulta" id="pc_${id}" ${d.primeiraConsulta ? 'checked' : ''}><label for="pc_${id}">Primeira Consulta</label></div>
            <div class="form-row"><div class="form-group numero autocomplete-container"><label>Número:</label><input type="text" name="numero" class="form-input" required value="${d.numero || ''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div>
            <div class="form-group nome autocomplete-container"><label>Nome:</label><input type="text" name="nome" class="form-input" required value="${d.nome || ''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div></div>
            <div class="form-row"><div class="form-group autocomplete-container"><label>CNS:</label><input type="text" name="cns" class="form-input" required value="${d.cns || ''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div>
            <div class="form-group"><label>Distrito:</label><input type="text" name="distrito" class="form-input" value="${d.distrito || ''}"></div></div>
            <div class="form-row"><div class="form-group autocomplete-container"><label>Téc. Ref.:</label><input type="text" name="tecRef" class="form-input" value="${d.tecRef || ''}"><div class="sugestoes-lista"></div></div>
            <div class="form-group"><label>CID:</label><input type="text" name="cid" class="form-input" value="${d.cid || ''}"></div></div>
            <div class="form-group full-width solicitacoes-group"><label>Solicitações:</label><div class="checkbox-grid">
                ${['Passe Livre Municipal', 'Passe Livre Intermunicipal', 'Passe Livre Interestadual', 'Atestado INSS', 'Atestado Escola', 'Fraldas'].map(s => `<div class="checkbox-item"><input type="checkbox" name="solicitacao" value="${s}" ${check(s)}><label>${s}</label></div>`).join('')}
            </div></div>
            <div class="form-row"><div class="form-group full-width"><label>Observação:</label><textarea name="observacao" class="form-input" rows="3">${d.observacao || ''}</textarea></div></div></div>
            <div class="form-actions-wrapper"><div class="form-group agendado-por"><label>Agendado por:</label><input type="text" name="agendadoPor" class="form-input" required value="${d.agendadoPor || ''}"></div>
            <div class="form-buttons">${edit ? `<button type="button" class="btn btn-secondary ${turno}" onclick="cancelarEdicao()">Cancelar</button><button type="submit" class="btn btn-success ${turno}">Salvar</button>` : `<button type="submit" class="btn btn-success ${turno}">Agendar</button><button type="button" class="btn btn-secondary ${turno}" onclick="limparFormulario(this)">Limpar</button>`}</div></div></form>`;
        }
        html += `</div></div>`;
    }
    return html + '</div>';
}

function mostrarNotificacao(msg, tipo = 'info') {
    const c = document.getElementById('floating-notifications');
    if (!c) return;
    const n = document.createElement('div');
    n.className = `floating-notification ${tipo}`; n.textContent = msg;
    c.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 5000);
}

function parseHtmlToPacientes(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const novos = [];
    doc.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const numero = cells[0].textContent.trim();
            if (numero && /^\d+$/.test(numero)) {
                novos.push({
                    numero, nome: cells[1].textContent.trim(), cns: cells[2].textContent.trim(),
                    distrito: cells[3].textContent.trim(), tecRef: cells[4].textContent.trim(), cid: cells[5].textContent.trim()
                });
            }
        }
    });
    return novos;
}

function mergePacientes(existentes, novos) {
    let add = 0, upd = 0;
    const map = new Map(existentes.map(p => [p.numero, p]));
    novos.forEach(n => {
        if (map.has(n.numero)) { Object.assign(map.get(n.numero), n); upd++; }
        else { map.set(n.numero, n); add++; }
    });
    return { pacientes: Array.from(map.values()), add, upd };
}

function handleHtmlFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const novos = parseHtmlToPacientes(evt.target.result);
        if (novos.length === 0) { mostrarNotificacao('Nenhum paciente válido.', 'warning'); return; }
        const res = mergePacientes(pacientesGlobais, novos);
        pacientesGlobais = res.pacientes;
        salvarPacientesNoLocalStorage();
        mostrarNotificacao(`${res.add} novos, ${res.upd} atualizados.`, 'success');
        verificarDadosCarregados();
        e.target.value = '';
    };
    reader.readAsText(file, 'windows-1252');
}

function buscarAgendamentosGlobais() {
    const termo = document.getElementById('globalSearchInput').value.trim().toLowerCase();
    const container = document.getElementById('searchResultsContainer');
    if (termo.length < 2) { container.innerHTML = '<p class="search-feedback">Digite 2+ caracteres.</p>'; return; }
    
    const results = [];
    Object.keys(agendamentos).forEach(d => {
        ['manha', 'tarde'].forEach(t => {
            (agendamentos[d][t] || []).forEach(ag => {
                if (ag.nome.toLowerCase().includes(termo) || ag.numero.includes(termo)) results.push({ ...ag, data: d, turno: t });
            });
        });
    });
    results.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    container.innerHTML = `<div class="search-results-header"><h4>${results.length} encontrados</h4><button class="btn-icon btn-clear-search" onclick="limparBuscaGlobal()"><i class="bi bi-x-lg"></i></button></div>` +
        (results.length ? results.map(r => `<div class="search-result-item"><div class="result-info"><strong>${r.nome} (Nº ${r.numero})</strong><span>${new Date(r.data + 'T12:00').toLocaleDateString('pt-BR')} - ${r.turno}</span></div><button class="btn btn-jump" onclick="pularParaAgendamento('${r.data}')">Ver</button></div>`).join('') : '<p class="search-feedback">Nada encontrado.</p>');
}

function limparBuscaGlobal() {
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('searchResultsContainer').innerHTML = '';
}

function pularParaAgendamento(data) {
    const d = new Date(data + 'T12:00:00');
    mesAtual = d.getMonth(); anoAtual = d.getFullYear();
    atualizarCalendario();
    setTimeout(() => selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`)), 100);
}

function pularParaCard(data, turno, vaga) {
    pularParaAgendamento(data);
    mostrarTurno(turno);
    setTimeout(() => {
        const el = document.getElementById(`card-${data}-${turno}-${vaga}`);
        if(el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('highlight-card'); setTimeout(()=>el.classList.remove('highlight-card'), 1500); }
    }, 300);
}

function pularParaVagaLivre(data, turno) {
    pularParaAgendamento(data);
    mostrarTurno(turno);
    setTimeout(() => {
        const el = document.getElementById(`turno-${turno}`).querySelector('.vaga-card:not(.ocupada)');
        if(el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('highlight-card'); setTimeout(()=>el.classList.remove('highlight-card'), 1500); el.querySelector('input').focus(); }
    }, 300);
}

function configurarBuscaGlobalAutocomplete() {
    const inp = document.getElementById('globalSearchInput');
    const list = document.getElementById('globalSugestoesLista');
    if(!inp || !list) return;
    inp.addEventListener('input', () => {
        const v = inp.value.toLowerCase();
        if(v.length < 2) { list.style.display='none'; return; }
        const res = pacientesGlobais.filter(p => p.nome.toLowerCase().includes(v) || p.numero.includes(v)).slice(0, 10);
        if(res.length) {
            list.innerHTML = res.map(p => `<div class="sugestao-item" data-value="${p.nome}"><strong>${p.nome}</strong><br><small>Nº ${p.numero}</small></div>`).join('');
            list.style.display = 'block';
        } else list.style.display = 'none';
    });
    list.addEventListener('click', (e) => {
        const it = e.target.closest('.sugestao-item');
        if(it) { inp.value = it.dataset.value; list.style.display='none'; buscarAgendamentosGlobais(); }
    });
    document.addEventListener('click', e => { if(!inp.contains(e.target)) list.style.display='none'; });
}

// Declaração
function iniciarProcessoDeclaracao(d, t, v) {
    const item = agendamentos[d][t].find(a => a.vaga === v);
    if(item) { atestadoEmGeracao = { ...item, data: d, turno: t }; document.getElementById('choiceModal').style.display = 'flex'; }
}
function fecharModalEscolha() { document.getElementById('choiceModal').style.display = 'none'; atestadoEmGeracao = null; }
function gerarDeclaracaoPaciente() { montarHTMLDeclaracao(atestadoEmGeracao.nome, null); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
function gerarDeclaracaoAcompanhante() { document.getElementById('acompanhanteModal').style.display='flex'; }
function fecharModalAcompanhante() { document.getElementById('acompanhanteModal').style.display='none'; document.getElementById('acompanhanteNomeInput').value=''; }
function confirmarNomeAcompanhante() {
    const nome = document.getElementById('acompanhanteNomeInput').value.trim();
    if(nome) { montarHTMLDeclaracao(atestadoEmGeracao.nome, nome); fecharModalAcompanhante(); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
    else mostrarNotificacao('Digite o nome.', 'warning');
}
function fecharModalAtestado() { document.getElementById('declaracaoModal').style.display='none'; atestadoEmGeracao=null; }

function montarHTMLDeclaracao(p, a) {
    const d = new Date(atestadoEmGeracao.data + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const t = atestadoEmGeracao.turno === 'manha' ? 'manhã' : 'tarde';
    const txt = a ? `Declaramos que <strong>${a.toUpperCase()}</strong> esteve presente na unidade CAPS ia Liberdade, turno ${t}, acompanhando o(a) paciente <strong>${p.toUpperCase()}</strong> (CNS ${atestadoEmGeracao.cns}).` 
                  : `Declaramos que o(a) paciente <strong>${p.toUpperCase()}</strong> (CNS ${atestadoEmGeracao.cns}) esteve presente na unidade CAPS ia Liberdade, turno ${t}.`;
    
    document.getElementById('declaracao-content-wrapper').innerHTML = `<h4>DECLARAÇÃO</h4><p>${txt}</p><p>Documento emitido para fins de comprovação.</p><br><br><p style="text-align:center">Salvador, ${d}.</p>`;
}

// Impressão
function limparEstadoImpressao() { document.body.className = document.body.className.replace(/printing-\w+/g, '').trim(); }
function handlePrint(cls) { 
    limparEstadoImpressao(); document.body.classList.add('logged-in', cls); 
    window.print(); 
    setTimeout(limparEstadoImpressao, 1000); 
}
function imprimirDeclaracao() { if(!document.getElementById('assinaturaNomePrint').textContent.trim()) { mostrarNotificacao('Selecione um profissional.', 'warning'); return; } handlePrint('printing-declaracao'); }
function imprimirAgendaDiaria(d) {
    const c = document.getElementById('print-container');
    const dFmt = new Date(d+'T12:00').toLocaleDateString('pt-BR');
    let h = `<h1>Agenda ${dFmt}</h1>`;
    ['manha','tarde'].forEach(t => {
        h += `<h2>${t.toUpperCase()}</h2><table class="agenda-table"><thead><tr><th>Nº</th><th>Paciente</th><th>Téc. Ref.</th><th>Obs</th></tr></thead><tbody>`;
        const l = agendamentos[d]?.[t] || [];
        if(!l.length) h += '<tr><td colspan="4">Vazio</td></tr>';
        else l.sort((a,b)=>a.vaga-b.vaga).forEach(a => h += `<tr><td>${a.numero}</td><td>${a.nome}</td><td>${a.tecRef||''}</td><td>${a.observacao||''}</td></tr>`);
        h += '</tbody></table>';
    });
    c.innerHTML = h; handlePrint('printing-agenda');
}
function imprimirVagas() {
    if(!vagasResultadosAtuais.length) return mostrarNotificacao('Sem dados.', 'warning');
    const c = document.getElementById('print-vagas-container');
    let h = `<h1>Vagas Encontradas</h1>`;
    vagasResultadosAtuais.forEach(d => {
        h += `<div class="print-day-container"><h2>${d.weekday}, ${new Date(d.date+'T12:00').toLocaleDateString('pt-BR')}</h2>`;
        if(d.type==='Bloqueio') h += `<p>Bloqueado: ${d.motivo}</p>`;
        else if(d.type==='Fim de Semana') h += `<p>Fim de Semana</p>`;
        else {
            h += `<div class="print-row"><div class="print-col"><h3>Manhã (${d.manha.livres} livres)</h3><ul>${d.manha.ocupados.map(a=>`<li>${a.numero} - ${a.nome}</li>`).join('')}</ul></div>`;
            h += `<div class="print-col"><h3>Tarde (${d.tarde.livres} livres)</h3><ul>${d.tarde.ocupados.map(a=>`<li>${a.numero} - ${a.nome}</li>`).join('')}</ul></div></div>`;
        }
        h += '</div>';
    });
    c.innerHTML = h; handlePrint('printing-vagas');
}

// Backup e Restauração
function fazerBackup() {
    const blob = new Blob([JSON.stringify({agendamentos, pacientesGlobais, diasBloqueados, feriadosDesbloqueados}, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    localStorage.setItem('ultimoBackupChave', `${new Date().toLocaleDateString('pt-BR')}_${localStorage.getItem('backupTime')||'16:00'}`);
    fecharModalBackup(); mostrarNotificacao('Backup OK!', 'success');
}
function restaurarBackup(e) {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (evt) => {
        try {
            const d = JSON.parse(evt.target.result);
            executarRestauracao(d);
        } catch(err) { mostrarNotificacao('Erro no arquivo.', 'danger'); }
        e.target.value = '';
    };
    r.readAsText(f);
}
function executarRestauracao(d) {
    if(d.agendamentos) { agendamentos = d.agendamentos; salvarAgendamentos(); }
    if(d.pacientesGlobais) { pacientesGlobais = d.pacientesGlobais; salvarPacientesNoLocalStorage(); }
    if(d.diasBloqueados) { diasBloqueados = d.diasBloqueados; salvarBloqueios(); }
    if(d.feriadosDesbloqueados) { feriadosDesbloqueados = d.feriadosDesbloqueados; salvarFeriadosDesbloqueados(); }
    sessionStorage.setItem('restauracaoSucesso', 'true'); location.reload();
}

function configurarHorarioBackup() {
    const btn = document.getElementById('saveBackupTimeBtn');
    if(btn) btn.addEventListener('click', salvarHorarioBackup);
    const saved = localStorage.getItem('backupTime') || '16:00';
    if(document.getElementById('backupTimeDisplay')) document.getElementById('backupTimeDisplay').textContent = saved;
    if(document.getElementById('backupTimeInput')) document.getElementById('backupTimeInput').value = saved;
}
function salvarHorarioBackup() {
    const val = document.getElementById('backupTimeInput').value;
    localStorage.setItem('backupTime', val);
    sessionStorage.removeItem('backupRealizadoSessao');
    configurarHorarioBackup();
    verificarNecessidadeBackup();
    mostrarNotificacao('Horário salvo.', 'success');
}
function verificarNecessidadeBackup() {
    if(modalBackupAberto) return;
    const saved = localStorage.getItem('backupTime') || '16:00';
    const now = new Date();
    const [h, m] = saved.split(':').map(Number);
    if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
        const key = `${now.toLocaleDateString('pt-BR')}_${saved}`;
        if (localStorage.getItem('ultimoBackupChave') !== key) abrirModalBackup();
    }
}
function abrirModalBackup() { document.getElementById('backupModal').style.display='flex'; modalBackupAberto=true; }
function fecharModalBackup() {
    const saved = localStorage.getItem('backupTime') || '16:00';
    const key = `${new Date().toLocaleDateString('pt-BR')}_${saved}`;
    if(localStorage.getItem('ultimoBackupChave') === key) { document.getElementById('backupModal').style.display='none'; modalBackupAberto=false; }
}

// Auxiliares
function abrirModalConfirmacao(msg, action) {
    document.getElementById('confirmMessage').textContent = msg;
    confirmAction = action;
    document.getElementById('confirmModal').style.display = 'flex';
}
function fecharModalConfirmacao() { document.getElementById('confirmModal').style.display='none'; confirmAction=null; }
function executarAcaoConfirmada() { if(confirmAction) confirmAction(); fecharModalConfirmacao(); }

function iniciarEdicao(d,t,v) { slotEmEdicao={data:d,turno:t,vaga:v}; exibirAgendamentos(d); }
function cancelarEdicao() { slotEmEdicao=null; exibirAgendamentos(dataSelecionada); }
function limparFormulario(btn) { btn.form.reset(); }
function gerenciarBloqueioDia(d) {
    const b = diasBloqueados[d];
    if(b) abrirModalConfirmacao(`Desbloquear ${d}?`, () => executarDesbloqueio(d));
    else abrirModalBloqueio();
}
function abrirModalBloqueio() { document.getElementById('blockDayModal').style.display='flex'; }
function fecharModalBloqueio() { document.getElementById('blockDayModal').style.display='none'; }
function confirmarBloqueio() {
    const t = document.getElementById('blockType').value;
    const m = document.getElementById('blockReason').value.trim();
    if(!m) return mostrarNotificacao('Motivo obrigatório', 'warning');
    diasBloqueados[dataSelecionada] = {
        motivo: m, diaInteiro: t==='all_day',
        manha: t==='all_day'||t==='morning', tarde: t==='all_day'||t==='afternoon'
    };
    salvarBloqueios(); atualizarCalendario(); exibirAgendamentos(dataSelecionada); fecharModalBloqueio();
}

function marcarStatus(d,t,v,s) {
    const item = agendamentos[d][t].find(a=>a.vaga===v);
    if(!item) return;
    if(s==='Justificou') return abrirModalJustificativa(d,t,v);
    item.status = item.status===s ? 'Aguardando' : s;
    if(item.status!=='Justificou') delete item.justificativa;
    salvarAgendamentos(); exibirAgendamentos(d); atualizarResumoMensal();
}

function executarCancelamento(d,t,v) {
    agendamentos[d][t] = agendamentos[d][t].filter(a=>a.vaga!==v);
    if(!agendamentos[d][t].length) delete agendamentos[d][t];
    salvarAgendamentos(); exibirAgendamentos(d); atualizarResumoMensal(); atualizarResumoSemanal(new Date(d+'T12:00'));
    fecharModalConfirmacao(); mostrarNotificacao('Cancelado.', 'info');
}

function verificarDuplicidadeAoDigitar(el,d,t,v) {
    const val = el.value.trim().toLowerCase();
    if(!val) return;
    const list = [...(agendamentos[d]?.manha||[]), ...(agendamentos[d]?.tarde||[])];
    const dup = list.find(a => {
        if(slotEmEdicao && slotEmEdicao.vaga===v) return false;
        return (el.name==='numero' && a.numero===val) || (el.name==='nome' && a.nome.toLowerCase()===val) || (el.name==='cns' && a.cns===val);
    });
    if(dup) {
        const err = document.createElement('div'); err.className='form-error-message'; err.textContent='Paciente já agendado hoje!';
        el.closest('.form-content-wrapper').prepend(err); setTimeout(()=>err.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(sessionStorage.getItem('limpezaSucesso')) { mostrarNotificacao('Limpeza Completa!', 'success'); sessionStorage.removeItem('limpezaSucesso'); }
    if(sessionStorage.getItem('restauracaoSucesso')) { mostrarNotificacao('Restauração Completa!', 'success'); sessionStorage.removeItem('restauracaoSucesso'); }
    inicializarLogin();
});
