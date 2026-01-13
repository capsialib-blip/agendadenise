/* script.js */
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
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase inicializado com sucesso.");
} catch (e) {
    console.error("Erro ao inicializar Firebase. Verifique se os scripts do SDK foram adicionados ao HTML.", e);
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

// Lista de profissionais para assinatura (Autocomplete da Declaração)
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
let reportCurrentStatus = null; 
let reportUnfilteredResults = []; 
let atestadoEmGeracao = null;
let confirmAction = null; 
// [ARCOSAFE-FIX] Garantindo que a variável global exista
let tentativaSenha = 1;
let vagasResultadosAtuais = []; 


// ============================================
// 2. LÓGICA DE LOGIN E INICIALIZAÇÃO
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
// 3. CONFIGURAÇÃO DE EVENT LISTENERS DA AGENDA
// ============================================

function configurarEventListenersApp() {
    const btnHoje = document.getElementById('btnHoje');
    if (btnHoje) btnHoje.addEventListener('click', goToToday);

    const btnMesAnterior = document.getElementById('btnMesAnterior');
    if (btnMesAnterior) btnMesAnterior.addEventListener('click', voltarMes);

    const btnProximoMes = document.getElementById('btnProximoMes');
    if (btnProximoMes) btnProximoMes.addEventListener('click', avancarMes);

    const btnImportar = document.getElementById('btnImportar');
    if (btnImportar) btnImportar.addEventListener('click', () => {
        const htmlFileClick = document.getElementById('htmlFile');
        if (htmlFileClick) htmlFileClick.click();
    });

    const htmlFile = document.getElementById('htmlFile');
    if (htmlFile) htmlFile.addEventListener('change', handleHtmlFile);

    const btnLimparDados = document.getElementById('btnLimparDados');
    if (btnLimparDados) btnLimparDados.addEventListener('click', abrirModalLimpeza);

    const btnBackup = document.getElementById('btnBackup');
    if (btnBackup) btnBackup.addEventListener('click', fazerBackup);

    const btnRestaurar = document.getElementById('btnRestaurar');
    if (btnRestaurar) btnRestaurar.addEventListener('click', () => {
        const restoreFileClick = document.getElementById('restoreFile');
        if (restoreFileClick) restoreFileClick.click();
    });

    const restoreFile = document.getElementById('restoreFile');
    if (restoreFile) restoreFile.addEventListener('change', restaurarBackup);

    const btnDeclaracaoPaciente = document.getElementById('btnDeclaracaoPaciente');
    if (btnDeclaracaoPaciente) btnDeclaracaoPaciente.addEventListener('click', gerarDeclaracaoPaciente);

    const btnDeclaracaoAcompanhante = document.getElementById('btnDeclaracaoAcompanhante');
    if (btnDeclaracaoAcompanhante) btnDeclaracaoAcompanhante.addEventListener('click', gerarDeclaracaoAcompanhante);

    const btnCancelarChoice = document.getElementById('btnCancelarChoice');
    if (btnCancelarChoice) btnCancelarChoice.addEventListener('click', fecharModalEscolha);

    const btnFecharDeclaracao = document.getElementById('btnFecharDeclaracao');
    if (btnFecharDeclaracao) btnFecharDeclaracao.addEventListener('click', fecharModalAtestado);

    const btnImprimirDeclaracao = document.getElementById('btnImprimirDeclaracao');
    if (btnImprimirDeclaracao) btnImprimirDeclaracao.addEventListener('click', imprimirDeclaracao);

    const btnConfirmarAcompanhante = document.getElementById('btnConfirmarAcompanhante');
    if (btnConfirmarAcompanhante) btnConfirmarAcompanhante.addEventListener('click', confirmarNomeAcompanhante);

    const btnCancelarAcompanhante = document.getElementById('btnCancelarAcompanhante');
    if (btnCancelarAcompanhante) btnCancelarAcompanhante.addEventListener('click', fecharModalAcompanhante);

    const acompanhanteNomeInput = document.getElementById('acompanhanteNomeInput');
    if (acompanhanteNomeInput) acompanhanteNomeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            confirmarNomeAcompanhante();
        }
    });

    const btnCancelarModal = document.getElementById('btnCancelarModal');
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModalConfirmacao);

    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton) confirmButton.addEventListener('click', executarAcaoConfirmada);

    const btnCancelarJustificativa = document.getElementById('btnCancelarJustificativa');
    if (btnCancelarJustificativa) btnCancelarJustificativa.addEventListener('click', fecharModalJustificativa);

    const btnConfirmarJustificativa = document.getElementById('btnConfirmarJustificativa');
    if (btnConfirmarJustificativa) btnConfirmarJustificativa.addEventListener('click', salvarJustificativa);

    const btnCancelarBloqueio = document.getElementById('btnCancelarBloqueio');
    if (btnCancelarBloqueio) btnCancelarBloqueio.addEventListener('click', fecharModalBloqueio);

    const btnConfirmarBloqueio = document.getElementById('btnConfirmarBloqueio');
    if (btnConfirmarBloqueio) btnConfirmarBloqueio.addEventListener('click', confirmarBloqueio);

    const btnCancelClearData = document.getElementById('btnCancelClearData');
    if (btnCancelClearData) btnCancelClearData.addEventListener('click', fecharModalLimpeza);

    // [ARCOSAFE-FIX] Event Listener Async Blindado - Lixeira
    const btnConfirmClearData = document.getElementById('btnConfirmClearData');
    if (btnConfirmClearData) {
        btnConfirmClearData.addEventListener('click', async (event) => {
            event.preventDefault();
            await executarLimpezaTotal();
        });
    }

    // [ARCOSAFE-FIX] Interceptação Segura da tecla ENTER no campo de senha (Async)
    const clearDataPasswordInput = document.getElementById('clearDataPassword');
    if (clearDataPasswordInput) {
        clearDataPasswordInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                event.stopPropagation();
                await executarLimpezaTotal(); 
            }
        });
    }

    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) togglePassword.addEventListener('click', togglePasswordVisibility);
    
    const justificationRadios = document.querySelectorAll('input[name="justificativaTipo"]');
    justificationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const reagendamentoDataContainer = document.getElementById('reagendamentoDataContainer');
            if (reagendamentoDataContainer) {
                reagendamentoDataContainer.style.display = e.target.value === 'Reagendado' ? 'block' : 'none';
            }
        });
    });

    const globalSearchButton = document.getElementById('globalSearchButton');
    if (globalSearchButton) globalSearchButton.addEventListener('click', buscarAgendamentosGlobais);

    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) globalSearchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            buscarAgendamentosGlobais();
        }
    });

    const btnFecharReportModal = document.getElementById('btnFecharReportModal');
    if (btnFecharReportModal) btnFecharReportModal.addEventListener('click', fecharModalRelatorio);
    
    const btnFecharReportModalFooter = document.getElementById('btnFecharReportModalFooter');
    if (btnFecharReportModalFooter) btnFecharReportModalFooter.addEventListener('click', fecharModalRelatorio);

    const btnPrintReport = document.getElementById('btnPrintReport');
    if (btnPrintReport) btnPrintReport.addEventListener('click', () => handlePrint('printing-report'));

    const btnApplyFilter = document.getElementById('btnApplyFilter');
    if (btnApplyFilter) btnApplyFilter.addEventListener('click', aplicarFiltroRelatorio);

    const btnClearFilter = document.getElementById('btnClearFilter');
    if (btnClearFilter) btnClearFilter.addEventListener('click', limparFiltroRelatorio);

    const reportFilterType = document.getElementById('reportFilterType');
    if (reportFilterType) reportFilterType.addEventListener('change', atualizarValoresFiltro);

    const btnVerRelatorioAnual = document.getElementById('btnVerRelatorioAnual');
    if (btnVerRelatorioAnual) btnVerRelatorioAnual.addEventListener('click', () => abrirModalRelatorio(null, 'current_year'));

    // [ARCOSAFE-FIX] Correção do Botão OK do Modal de Backup Automático
    const btnBackupModalAction = document.getElementById('btnBackupModalAction');
    if (btnBackupModalAction) {
        btnBackupModalAction.addEventListener('click', () => {
            fazerBackup(); 
            // Força a atualização da chave ANTES de tentar fechar o modal
            const horarioSalvo = localStorage.getItem('backupTime') || '16:00';
            const hoje = new Date().toLocaleDateString('pt-BR');
            const chaveBackup = `${hoje}_${horarioSalvo}`;
            localStorage.setItem('ultimoBackupChave', chaveBackup);
            
            fecharModalBackup(); 
        });
    }
}

function configurarVagasEventListeners() {
    const btnProcurarVagas = document.getElementById('btnProcurarVagas');
    if (btnProcurarVagas) btnProcurarVagas.addEventListener('click', procurarVagas);

    const btnClearVagasSearch = document.getElementById('btnClearVagasSearch');
    if (btnClearVagasSearch) btnClearVagasSearch.addEventListener('click', limparBuscaVagas);

    const btnPrintVagas = document.getElementById('btnPrintVagas');
    if (btnPrintVagas) btnPrintVagas.addEventListener('click', imprimirVagas);

    const startDateInput = document.getElementById('vagasStartDate');
    const endDateInput = document.getElementById('vagasEndDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault(); 
                endDateInput.focus();    
            }
        });

        startDateInput.addEventListener('input', () => {
            const val = startDateInput.value;
            if (val) {
                const year = parseInt(val.split('-')[0], 10);
                if (year > 999) {
                    endDateInput.focus();
                }
            }
        });
    }
}


// ============================================
// 4. FUNÇÕES DO SISTEMA (CALENDÁRIO, VAGAS, ETC.)
// ============================================

function verificarDadosCarregados() {
    const indicator = document.getElementById('dataLoadedIndicator');
    const indicatorText = document.getElementById('indicatorText');
    if (indicator && indicatorText) {
        const temPacientes = pacientesGlobais.length > 0;
        const temAgendamentos = Object.keys(agendamentos).length > 0;

        if (temPacientes || temAgendamentos) {
            indicator.classList.remove('not-loaded');
            indicator.classList.add('loaded');
            indicatorText.textContent = "Dados Carregados";
        } else {
            indicator.classList.remove('loaded');
            indicator.classList.add('not-loaded');
            indicatorText.textContent = "Sem Dados Carregados";
        }
    }
}

function salvarAgendamentos() {
    try {
        if (database) {
            database.ref('agendamentos').set(agendamentos);
        }
        localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
        return true;
    } catch (error) {
        console.error('Erro ao salvar agendamentos:', error);
        return false;
    }
}

function salvarBloqueios() {
    try {
        if (database) {
            database.ref('dias_bloqueados').set(diasBloqueados);
        }
        localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
        return true;
    } catch (error) {
        console.error('Erro ao salvar bloqueios:', error);
        return false;
    }
}

function salvarFeriadosDesbloqueados() {
    try {
        if (database) {
            database.ref('feriados_desbloqueados').set(feriadosDesbloqueados);
        }
        localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
        return true;
    } catch (error) {
        console.error('Erro ao salvar feriados desbloqueados:', error);
        return false;
    }
}

function salvarPacientesNoLocalStorage() {
    try {
        if (database) {
            database.ref('pacientes').set(pacientesGlobais);
        }
        localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
        return true;
    } catch (error) {
        console.error('Erro ao salvar pacientes globais:', error);
        return false;
    }
}

// --- NAVEGAÇÃO DO CALENDÁRIO ---

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

// --- LÓGICA DE FERIADOS ---
function getFeriados(ano) {
    function calcularPascoa(ano) {
        const a = ano % 19;
        const b = Math.floor(ano / 100);
        const c = ano % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
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

    feriadosFixos.forEach(f => {
        const dataStr = `${ano}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
        feriados.set(dataStr, f.nome);
    });

    const carnaval = new Date(pascoa.getTime() - 47 * umDia);
    const sextaSanta = new Date(pascoa.getTime() - 2 * umDia);
    const corpusChristi = new Date(pascoa.getTime() + 60 * umDia);

    const feriadosMoveis = [
        { data: carnaval, nome: "Carnaval" },
        { data: sextaSanta, nome: "Sexta-feira Santa" },
        { data: corpusChristi, nome: "Corpus Christi" }
    ];

    feriadosMoveis.forEach(f => {
        const dataStr = `${f.data.getFullYear()}-${String(f.data.getMonth() + 1).padStart(2, '0')}-${String(f.data.getDate()).padStart(2, '0')}`;
        feriados.set(dataStr, f.nome);
    });

    return feriados;
}


// --- RENDERIZAÇÃO DO CALENDÁRIO E AGENDAMENTOS ---

function atualizarCalendario() {
    const container = document.getElementById('calendarContainer');
    const mesAnoEl = document.getElementById('mesAno');
    
    if (!container || !mesAnoEl) return;

    try {
        mesAnoEl.textContent = `${meses[mesAtual]} ${anoAtual}`;
        container.innerHTML = '';

        const feriadosDoAno = getFeriados(anoAtual);
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        const diasDaSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        diasDaSemana.forEach(dia => {
            const weekdayEl = document.createElement('div');
            weekdayEl.className = 'weekday';
            weekdayEl.textContent = dia;
            calendarGrid.appendChild(weekdayEl);
        });

        const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
        const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        const hoje = new Date();
        const dataHojeFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

        for (let i = 0; i < primeiroDia; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataCompleta = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const diaSemana = new Date(dataCompleta + "T00:00:00").getDay();
            const diaEl = document.createElement('div');
            diaEl.className = 'day';
            diaEl.textContent = dia;
            diaEl.setAttribute('data-date', dataCompleta);

            const feriado = feriadosDoAno.get(dataCompleta);
            if (feriado && !feriadosDesbloqueados[dataCompleta]) {
                diaEl.classList.add('day-holiday');
                diaEl.title = feriado;
                if (!diasBloqueados[dataCompleta] || !diasBloqueados[dataCompleta].manual) {
                    diasBloqueados[dataCompleta] = { diaInteiro: true, motivo: feriado, isHoliday: true };
                }
            }

            const bloqueio = diasBloqueados[dataCompleta];
            let totalmenteBloqueado = false;
            
            if (bloqueio) {
                if (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde)) {
                    diaEl.classList.add('blocked-day');
                    totalmenteBloqueado = true;
                } else {
                    if (bloqueio.manha) {
                        diaEl.classList.add('blocked-morning');
                    }
                    if (bloqueio.tarde) {
                        diaEl.classList.add('blocked-afternoon');
                    }
                }
            }

            if (diaSemana === 0 || diaSemana === 6) {
                diaEl.classList.add('weekend');
            } else {
                diaEl.classList.add('workday');
                diaEl.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selecionarDia(dataCompleta, diaEl);
                };
                const temAgendamentos = agendamentos[dataCompleta] && ( (agendamentos[dataCompleta].manha && agendamentos[dataCompleta].manha.length > 0) || (agendamentos[dataCompleta].tarde && agendamentos[dataCompleta].tarde.length > 0) );
                if(temAgendamentos && !totalmenteBloqueado) {
                    diaEl.classList.add('day-has-appointments');
                }
            }
            if (dataCompleta === dataHojeFormatada) diaEl.classList.add('today');
            if (dataCompleta === dataSelecionada) diaEl.classList.add('selected');

            calendarGrid.appendChild(diaEl);
        }

        container.appendChild(calendarGrid);
    } catch (error) {
        console.error('Erro fatal ao renderizar o calendário:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--color-danger); padding: 1rem;">Erro ao carregar o calendário. Tente recarregar a página.</p>';
    }
}

// [ARCOSAFE-LOGIC] Função Expandida para Calcular Métricas Mensais Completas
function calcularResumoMensal(dataReferencia) {
    const ano = new Date(dataReferencia).getFullYear();
    const mes = new Date(dataReferencia).getMonth();
    const totalVagasPorDia = 16;
    const daysInMonth = new Date(ano, mes + 1, 0).getDate();
    let businessDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateCheck = new Date(ano, mes, day);
        const dayOfWeek = dateCheck.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclui Sáb/Dom
            businessDays++;
        }
    }
    
    const capacityTotal = businessDays * totalVagasPorDia;
    let occupiedCount = 0;
    let abstencaoCount = 0;
    let atendimentoCount = 0;
    const targetPrefix = `${ano}-${String(mes + 1).padStart(2, '0')}`;

    if (agendamentos) {
        Object.keys(agendamentos).forEach(dateKey => {
            if (dateKey.startsWith(targetPrefix)) {
                ['manha', 'tarde'].forEach(turno => {
                    if (agendamentos[dateKey][turno] && Array.isArray(agendamentos[dateKey][turno])) {
                        agendamentos[dateKey][turno].forEach(ag => {
                            if (ag && ag.nome) { // Se existe agendamento válido
                                occupiedCount++;
                                // Lógica de Abstenção: Falta + Justificou (conforme regra de negócio)
                                if (ag.status === 'Faltou' || ag.status === 'Justificou') {
                                    abstencaoCount++;
                                }
                                // Lógica de Atendimento: Compareceu
                                if (ag.status === 'Compareceu') {
                                    atendimentoCount++;
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    const percentage = capacityTotal > 0 ? ((occupiedCount / capacityTotal) * 100).toFixed(1) : 0;
    const abstencaoPercent = occupiedCount > 0 ? ((abstencaoCount / occupiedCount) * 100).toFixed(1) : 0;
    const atendimentoPercent = occupiedCount > 0 ? ((atendimentoCount / occupiedCount) * 100).toFixed(1) : 0;

    return { 
        percentage, 
        occupiedCount, 
        capacityTotal,
        abstencaoCount,
        abstencaoPercent,
        atendimentoCount,
        atendimentoPercent
    };
}

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return; 

    const dataObj = new Date(data + 'T12:00:00');
    let dataFmt = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    dataFmt = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

    // [ARCOSAFE-LOGIC] Cálculo de Métricas (Ao Renderizar)
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

    // [ARCOSAFE-UX] Construção do Dashboard Grid Expandido (4 Colunas)
    container.innerHTML = `
        <div class="appointment-header">
            <h2 class="appointment-title">${dataFmt}</h2>
            <div class="header-actions">
                <button id="btnPrint" class="btn btn-secondary btn-sm" aria-label="Imprimir agenda do dia">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer-fill" viewBox="0 0 16 16">
                        <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2z"/>
                        <path d="M11 6.5a.5.5 0 0 1-1 0V3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3z"/>
                        <path d="M2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
                    </svg>
                    <span>Imprimir</span>
                </button>
                <button id="btnLockDay" class="btn-icon btn-lock" title="Bloquear Agenda" aria-label="Bloquear agenda do dia">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock-fill" viewBox="0 0 16 16">
                        <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">
            <div class="card-content">
                
                <div class="dashboard-stats-grid">
                    <div class="stats-card-mini">
                        <h4>
                            <span>Hoje</span>
                            <i class="bi bi-calendar-event"></i>
                        </h4>
                        <div class="stats-value-big val-neutral">${totalHoje}</div>
                        <div class="stats-meta">Pacientes Agendados</div>
                    </div>
                    
                    <div class="stats-card-mini">
                        <h4>
                            <span>Ocupação Mensal</span>
                            <i class="bi bi-graph-up"></i>
                        </h4>
                        <div class="stats-value-big val-primary">${metrics.percentage}%</div>
                        <div class="stats-meta">${metrics.occupiedCount} / ${metrics.capacityTotal} Vagas</div>
                    </div>

                    <div class="stats-card-mini">
                        <h4>
                            <span>Abstenções (Mês)</span>
                            <i class="bi bi-x-circle" style="color: var(--color-danger);"></i>
                        </h4>
                        <div class="stats-value-big val-danger">${metrics.abstencaoCount}</div>
                        <div class="stats-meta">${metrics.abstencaoPercent}% dos Agendados</div>
                    </div>

                    <div class="stats-card-mini">
                        <h4>
                            <span>Atendimentos (Mês)</span>
                            <i class="bi bi-check-circle" style="color: var(--color-success);"></i>
                        </h4>
                        <div class="stats-value-big val-success">${metrics.atendimentoCount}</div>
                        <div class="stats-meta">${metrics.atendimentoPercent}% dos Agendados</div>
                    </div>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mostrarTurno('manha')">Manhã</button>
                    <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mostrarTurno('tarde')">Tarde</button>
                </div>

                <div id="turnoIndicator" class="turno-indicator ${turnoAtivo}">
                    ${turnoAtivo === 'manha' 
                        ? '<i class="bi bi-brightness-high-fill"></i> MANHÃ (08:00 - 12:00)' 
                        : '<i class="bi bi-moon-stars-fill"></i> TARDE (13:00 - 17:00)'
                    }
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

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => imprimirAgendaDiaria(data));
    
    const btnLockDay = document.getElementById('btnLockDay');
    if (btnLockDay) btnLockDay.addEventListener('click', () => gerenciarBloqueioDia(data));
    
    // [ARCOSAFE-FIX] Event Listeners para bloqueios parciais
    const btnLockManha = document.getElementById('btnLockTurno_Manha');
    if (btnLockManha) btnLockManha.addEventListener('click', () => gerenciarBloqueioDia(data));

    const btnLockTarde = document.getElementById('btnLockTurno_Tarde');
    if (btnLockTarde) btnLockTarde.addEventListener('click', () => gerenciarBloqueioDia(data));

    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
        document.querySelectorAll('input[name="agendadoPor"]').forEach(input => {
            input.addEventListener('blur', (event) => {
                const inputField = event.target;
                const codeMap = {
                    '01': 'Alessandra',
                    '02': 'Nicole'
                };
                const value = inputField.value.trim();
                if (codeMap[value]) {
                    inputField.value = codeMap[value];
                }
            });
        });
    }, 0);
}

function gerarVagasTurno(agendamentosTurno, turno, data) {
    let html = '<div class="vagas-grid">';
    agendamentosTurno = agendamentosTurno || [];

    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = agendamentosTurno.find(a => a.vaga === i);
// FIM PARTE 1 - CONTINUA...
