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

/* script.js */

// Lista de profissionais para assinatura (Autocomplete da Declaração)
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
        novoLoginButton.addEventListener('click', tentarLogin);
    }
    
    if (loginSenhaInput) {
        loginSenhaInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                tentarLogin();
            }
        });
    }
}

 tentarLogin() {
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

 inicializarApp() {
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
    
    // [ARCOSAFE-FIX] Intervalo de Alta Precisão: 5 segundos
    setInterval(verificarNecessidadeBackup, 5000);

    configurarEventListenersApp(); 
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    verificarDadosCarregados();
    configurarBuscaGlobalAutocomplete();
    configurarVagasEventListeners();
    configurarAutocompleteAssinatura();
    
    // Verificação inicial imediata
    verificarNecessidadeBackup(); 
}


// ============================================
// 3. CONFIGURAÇÃO DE EVENT LISTENERS DA AGENDA
// ============================================

 configurarEventListenersApp() {
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

    const btnConfirmClearData = document.getElementById('btnConfirmClearData');
    if (btnConfirmClearData) btnConfirmClearData.addEventListener('click', executarLimpezaTotal);

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

    const btnBackupModalAction = document.getElementById('btnBackupModalAction');
    if (btnBackupModalAction) btnBackupModalAction.addEventListener('click', () => {
        fazerBackup(); 
        fecharModalBackup(); 
    });
}

 configurarVagasEventListeners() {
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

 verificarDadosCarregados() {
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

 salvarAgendamentos() {
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

 salvarBloqueios() {
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

 salvarFeriadosDesbloqueados() {
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

 salvarPacientesNoLocalStorage() {
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

 voltarMes() {
    if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else { mesAtual--; }
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1));
}

 avancarMes() {
    if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else { mesAtual++; }
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1));
}

// --- LÓGICA DE FERIADOS ---
 getFeriados(ano) {
     calcularPascoa(ano) {
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

 atualizarCalendario() {
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
 calcularResumoMensal(dataReferencia) {
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

 exibirAgendamentos(data) {
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
                    ${bloqueio?.manha ? criarBlockedTurnoState('Manhã', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(agendamentosDia.manha, 'manha', data)}
                </div>
                <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">
                    ${bloqueio?.tarde ? criarBlockedTurnoState('Tarde', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(agendamentosDia.tarde, 'tarde', data)}
                </div>
            </div>
        </div>
    `;

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => imprimirAgendaDiaria(data));
    
    const btnLockDay = document.getElementById('btnLockDay');
    if (btnLockDay) btnLockDay.addEventListener('click', () => gerenciarBloqueioDia(data));

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

 gerarVagasTurno(agendamentosTurno, turno, data) {
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

        let headerDireita = '';
        if (agendamento && !estaEditando) {
             headerDireita = `
                <div class="vaga-header-tags">
                    ${agendamento.primeiraConsulta ? '<span class="primeira-consulta-tag" title="Primeira Consulta">1ª Consulta</span>' : ''}
                    <span class="status-tag ${statusClassName}">${status}</span>
                </div>
            `;
        }

        html += `
            <div id="${cardId}" class="vaga-card ${agendamento ? 'ocupada' : ''} ${estaEditando ? 'editing' : ''} ${statusClassName} ${agendamento && agendamento.primeiraConsulta ? 'primeira-consulta' : ''}">
                <div class="vaga-header ${turno}">
                    <div>Vaga ${i} - ${agendamento && !estaEditando ? 'Ocupada' : (estaEditando ? 'Editando...' : 'Disponível')}</div>
                    ${headerDireita}
                </div>
                <div class="vaga-content">
        `;

        if (agendamento && !estaEditando) {
             const justificativaHTML = (agendamento.status === 'Justificou' && agendamento.justificativa) ? `
                <div class="justificativa-display">
                    <p><strong>Justificativa:</strong>
                        ${agendamento.justificativa.tipo === 'Reagendado'
                            ? `Reagendado para ${new Date(agendamento.justificativa.detalhe + 'T12:00:00').toLocaleDateString('pt-BR')}`
                            : 'Entrará em contato com o TR.'}
                    </p>
                </div>
            ` : '';

            const statusButtonsHTML = `
                <div class="status-buttons-container">
                    <button class="btn btn-sm btn-status ${status === 'Compareceu' ? 'active' : ''}" data-status="Compareceu" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Compareceu')">
                        <i class="bi bi-check-circle-fill"></i> Compareceu
                    </button>
                    <button class="btn btn-sm btn-status ${status === 'Faltou' ? 'active' : ''}" data-status="Faltou" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Faltou')">
                        <i class="bi bi-x-circle-fill"></i> Faltou
                    </button>
                    <button class="btn btn-sm btn-status ${status === 'Justificou' ? 'active' : ''}" data-status="Justificou" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Justificou')">
                        <i class="bi bi-exclamation-circle-fill"></i> Justificou
                    </button>
                </div>`;

            html += `
                <div class="agendamento-info">
                    <div class="info-content">
                        <div class="paciente-header">
                            <h4 class="paciente-nome">${agendamento.nome}</h4>
                            <div class="paciente-numero">
                                <span class="paciente-numero-value">Nº ${agendamento.numero}</span>
                            </div>
                        </div>
                        <div class="paciente-info">
                            <p class="info-line"><span class="info-icon icon-cns"><i class="bi bi-person-vcard"></i></span><strong>CNS:</strong> ${agendamento.cns}</p>
                            ${agendamento.distrito ? `<p class="info-line"><span class="info-icon icon-distrito"><i class="bi bi-geo-alt-fill"></i></span><strong>Distrito:</strong> ${agendamento.distrito}</p>` : ''}
                            ${agendamento.tecRef ? `<p class="info-line"><span class="info-icon icon-tecref"><i class="bi bi-people-fill"></i></span><strong>Téc. Ref.:</strong> ${agendamento.tecRef}</p>` : ''}
                            ${agendamento.agendadoPor ? `<p class="info-line"><span class="info-icon"><i class="bi bi-person-check-fill"></i></span><strong>Agendado por:</strong> ${agendamento.agendadoPor}</p>` : ''}
                            ${agendamento.cid ? `<p class="info-line"><span class="info-icon icon-cid"><i class="bi bi-search"></i></span><strong>CID:</strong> ${agendamento.cid.toUpperCase()}</p>` : ''}
                        </div>
                        ${justificativaHTML}
                        ${statusButtonsHTML}
                        ${(agendamento.solicitacoes && agendamento.solicitacoes.length > 0) ? `
                            <div class="solicitacoes-display">
                                <strong class="solicitacoes-display-title">Solicitações:</strong>
                                <div class="tags-container">
                                    ${agendamento.solicitacoes.map(item => `<span class="solicitacao-tag">${item}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${agendamento.observacao ? `
                            <div class="observacao-display">
                                <p><strong>Observação:</strong> ${agendamento.observacao.replace(/\n/g, '<br>')}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="agendamento-acoes">
                        <button class="btn btn-edit" onclick="iniciarEdicao('${data}', '${turno}', ${i})" title="Editar Agendamento">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                            </svg>
                            <span>Editar</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}', '${turno}', ${i})">Imprimir Declaração</button>
                        <button class="btn btn-danger btn-cancel-appointment" onclick="abrirModalConfirmacao('Deseja realmente cancelar este agendamento?', () => executarCancelamento('${data}', '${turno}', ${i}))">Cancelar</button>
                    </div>
                </div>
            `;
        } else {
            const solicitacoesSalvas = dadosPreenchimento.solicitacoes || [];
            html += `
                <form class="vaga-form" onsubmit="agendarPaciente(event, '${data}', '${turno}', ${i})">
                    <div class="form-content-wrapper">
                         <div class="form-group-checkbox-single">
                             <input type="checkbox" name="primeiraConsulta" id="primeiraConsulta_${uniqueIdPrefix}" ${dadosPreenchimento.primeiraConsulta ? 'checked' : ''}>
                             <label for="primeiraConsulta_${uniqueIdPrefix}">Primeira Consulta</label>
                         </div>
                        <div class="form-row">
                            <div class="form-group numero autocomplete-container">
                                <label>Número:</label>
                                <input type="text" name="numero" required class="form-input" maxlength="5" pattern="[0-9]{4,5}" title="O número deve conter de 4 a 5 dígitos." value="${dadosPreenchimento.numero || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}', '${turno}', ${i})">
                                <div class="sugestoes-lista"></div>
                            </div>
                            <div class="form-group nome autocomplete-container">
                                <label>Nome do Paciente:</label>
                                <input type="text" name="nome" required class="form-input" maxlength="51" value="${dadosPreenchimento.nome || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}', '${turno}', ${i})">
                                <div class="sugestoes-lista"></div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group autocomplete-container">
                                <label>CNS:</label>
                                <input type="text" name="cns" required class="form-input" maxlength="15" pattern="[0-9]{15}" title="O CNS deve contar com 15 dígitos." value="${dadosPreenchimento.cns || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}', '${turno}', ${i})">
                                <div class="sugestoes-lista"></div>
                            </div>
                            <div class="form-group">
                                <label>Distrito:</label>
                                <input type="text" name="distrito" class="form-input" maxlength="21" value="${dadosPreenchimento.distrito || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group autocomplete-container">
                                <label>Téc. Ref.:</label>
                                <input type="text" name="tecRef" class="form-input" maxlength="50" value="${dadosPreenchimento.tecRef || ''}">
                                <div class="sugestoes-lista"></div>
                            </div>
                            <div class="form-group">
                                <label>CID:</label>
                                <input type="text" name="cid" class="form-input" maxlength="12" style="text-transform: uppercase;" value="${dadosPreenchimento.cid || ''}">
                            </div>
                        </div>

                        <div class="form-group full-width solicitacoes-group">
                            <label>Solicitações:</label>
                            <div class="checkbox-grid">
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Passe Livre Municipal" id="pl_municipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Municipal') ? 'checked' : ''}>
                                    <label for="pl_municipal_${uniqueIdPrefix}">Passe Livre Municipal</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Passe Livre Intermunicipal" id="pl_intermunicipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Intermunicipal') ? 'checked' : ''}>
                                    <label for="pl_intermunicipal_${uniqueIdPrefix}">Passe Livre Intermunicipal</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Passe Livre Interestadual" id="pl_interestadual_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Interestadual') ? 'checked' : ''}>
                                    <label for="pl_interestadual_${uniqueIdPrefix}">Passe Livre Interestadual</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Atestado INSS" id="atestado_inss_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Atestado INSS') ? 'checked' : ''}>
                                    <label for="atestado_inss_${uniqueIdPrefix}">Atestado INSS</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Atestado Escola" id="atestado_escola_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Atestado Escola') ? 'checked' : ''}>
                                    <label for="atestado_escola_${uniqueIdPrefix}">Atestado para Escola</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" name="solicitacao" value="Fraldas" id="fraldas_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Fraldas') ? 'checked' : ''}>
                                    <label for="fraldas_${uniqueIdPrefix}">Fraldas</label>
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label>Observação (detalhes da solicitação):</label>
                                <textarea name="observacao" class="form-input" rows="3" maxlength="320">${dadosPreenchimento.observacao || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions-wrapper">
                        <div class="form-group agendado-por">
                            <label>Agendado por:</label>
                            <input type="text" name="agendadoPor" required class="form-input" maxlength="15" value="${dadosPreenchimento.agendadoPor || ''}">
                        </div>
                        <div class="form-buttons">
                            ${estaEditando ? `
                                <button type="button" class="btn btn-secondary ${turno}" onclick="cancelarEdicao()">Cancelar Edição</button>
                                <button type="submit" class="btn btn-success ${turno}">Salvar Alterações</button>
                            ` : `
                                <button type="submit" class="btn btn-success ${turno}">Agendar</button>
                                <button type="button" class="btn btn-secondary ${turno}" onclick="limparFormulario(this)">Limpar</button>
                            `}
                        </div>
                    </div>
                </form>
            `;
        }
        html += '</div></div>';
    }
    return html + '</div>';
}

// --- Funções de Notificação e Importação ---

 mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('floating-notifications');
    if (!container) return; 

    const notificacao = document.createElement('div');
    notificacao.className = `floating-notification ${tipo}`;
    notificacao.textContent = mensagem;
    container.appendChild(notificacao);

    setTimeout(() => {
        notificacao.style.opacity = '0';
        notificacao.style.transform = 'translateY(20px)';
        setTimeout(() => notificacao.remove(), 300);
    }, 5000);
}

 parseHtmlToPacientes(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const rows = doc.querySelectorAll('tr');
    const novosPacientes = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) { 
            const numero = cells[0].textContent.trim();
            const nome = cells[1].textContent.trim();
            const cns = cells[2].textContent.trim();
            const distrito = cells[3].textContent.trim();
            const tecRef = cells[4].textContent.trim();
            const cid = cells[5].textContent.trim();

            if (numero && nome && cns && /^\d+$/.test(numero)) { 
                novosPacientes.push({ numero, nome, cns, distrito, tecRef, cid });
            }
        }
    });
    return novosPacientes;
}

 mergePacientes(existentes, novos) {
    let adicionados = 0;
    let atualizados = 0;
    const mapaExistentes = new Map(existentes.map(p => [p.numero, p]));

    novos.forEach(novo => {
        if (mapaExistentes.has(novo.numero)) {
            Object.assign(mapaExistentes.get(novo.numero), novo);
            atualizados++;
        } else {
            mapaExistentes.set(novo.numero, novo);
            adicionados++;
        }
    });

    return {
        pacientes: Array.from(mapaExistentes.values()),
        adicionados,
        atualizados
    };
}

 handleHtmlFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) {
        try {
            const content = e.target.result;
            const novosPacientes = parseHtmlToPacientes(content);

            if (novosPacientes.length === 0) {
                mostrarNotificacao('Nenhum paciente válido encontrado no arquivo.', 'warning');
                return;
            }

            const resultadoMerge = mergePacientes(pacientesGlobais, novosPacientes);
            pacientesGlobais = resultadoMerge.pacientes;
            pacientes = [...pacientesGlobais]; 

            if (salvarPacientesNoLocalStorage()) {
                mostrarNotificacao(`${resultadoMerge.adicionados} novos pacientes adicionados e ${resultadoMerge.atualizados} atualizados.`, 'success');
                verificarDadosCarregados(); 
            } else {
                mostrarNotificacao('Erro ao salvar os dados dos pacientes.', 'danger');
            }
            event.target.value = '';
        } catch (error) {
            console.error('Erro ao processar o arquivo HTML:', error);
            mostrarNotificacao('Falha ao ler o arquivo. Verifique o formato.', 'danger');
            event.target.value = '';
        }
    };
    reader.readAsText(file, 'windows-1252'); 
}

function buscarAgendamentosGlobais() {
    const input = document.getElementById('globalSearchInput');
    const containerResultados = document.getElementById('searchResultsContainer');
    if (!input || !containerResultados) return; 

    const termoBusca = input.value.trim().toLowerCase();

    if (termoBusca.length < 2) {
        containerResultados.innerHTML = '<p class="search-feedback">Digite pelo menos 2 caracteres para buscar.</p>';
        return;
    }

    const resultados = [];
    Object.keys(agendamentos).forEach(data => {
        ['manha', 'tarde'].forEach(turno => {
            if (agendamentos[data] && agendamentos[data][turno]) {
                agendamentos[data][turno].forEach(ag => {
                    if (ag && ag.nome && ag.numero) {
                        const nome = ag.nome.toLowerCase();
                        const numero = ag.numero.toString();
                        if (nome.includes(termoBusca) || numero.includes(termoBusca)) {
                            resultados.push({ ...ag, data, turno });
                        }
                    }
                });
            }
        });
    });

    resultados.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (resultados.length > 0) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        containerResultados.innerHTML = `
            <div class="search-results-header">
                <h4>${resultados.length} agendamento(s) encontrado(s)</h4>
                <button class="btn-icon btn-clear-search" onclick="limparBuscaGlobal()" aria-label="Limpar busca" title="Limpar Busca">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L7.293 8z"/></svg>
                </button>
            </div>
            ${resultados.map(res => {
                const dataAgendamento = new Date(res.data + 'T12:00:00');
                const isPast = dataAgendamento < hoje;
                const status = res.status || 'Aguardando';
                const statusClass = `status-${status.toLowerCase().replace(/\s/g, '-')}`;

                return `
                <div class="search-result-item ${isPast ? 'past' : 'future'}">
                    <div class="result-info">
                        <strong>${res.nome} (Nº ${res.numero})</strong>
                        <span>
                            ${dataAgendamento.toLocaleDateString('pt-BR')} - ${res.turno.charAt(0).toUpperCase() + res.turno.slice(1)}
                            <span class="result-status ${statusClass}">${status}</span>
                        </span>
                    </div>
                    <button class="btn btn-jump" onclick="pularParaAgendamento('${res.data}')">Ver na Agenda</button>
                </div>
            `}).join('')}
        `;
    } else {
        containerResultados.innerHTML = `
            <div class="search-results-header">
                <h4>Nenhum agendamento encontrado</h4>
                <button class="btn-icon btn-clear-search" onclick="limparBuscaGlobal()" aria-label="Limpar busca" title="Limpar Busca">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L7.293 8z"/></svg>
                </button>
            </div>
            <p class="search-feedback">Nenhum agendamento encontrado para este paciente.</p>
        `;
    }
}

function limparBuscaGlobal() {
    const input = document.getElementById('globalSearchInput');
    if (input) input.value = '';
    const container = document.getElementById('searchResultsContainer');
    if (container) container.innerHTML = '';
}

function pularParaAgendamento(data) {
    const dataObj = new Date(data + 'T12:00:00');
    mesAtual = dataObj.getMonth();
    anoAtual = dataObj.getFullYear();
    atualizarCalendario();
    setTimeout(() => {
        const diaEl = document.querySelector(`.day[data-date="${data}"]`);
        if (diaEl) {
            selecionarDia(data, diaEl);
            diaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
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

function configurarBuscaGlobalAutocomplete() {
    const input = document.getElementById('globalSearchInput');
    const sugestoesContainer = document.getElementById('globalSugestoesLista');
    if (!input || !sugestoesContainer) return; 

    input.addEventListener('input', () => {
        const termo = input.value.toLowerCase();
        if (termo.length < 2) {
            sugestoesContainer.innerHTML = '';
            sugestoesContainer.style.display = 'none';
            return;
        }
        const sugestoesFiltradas = pacientesGlobais
            .filter(p => p.nome.toLowerCase().includes(termo) || p.numero.includes(termo))
            .slice(0, 10); 

        if (sugestoesFiltradas.length > 0) {
            sugestoesContainer.innerHTML = sugestoesFiltradas.map(p =>
                `<div class="sugestao-item" data-value="${p.nome}">
                    <strong>${p.nome}</strong><br>
                    <small>Nº: ${p.numero}</small>
                </div>`
            ).join('');
            sugestoesContainer.style.display = 'block';
        } else {
            sugestoesContainer.style.display = 'none';
        }
    });

    sugestoesContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.sugestao-item');
        if (item) {
            input.value = item.dataset.value;
            sugestoesContainer.innerHTML = '';
            sugestoesContainer.style.display = 'none';
            buscarAgendamentosGlobais();
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !sugestoesContainer.contains(e.target)) {
            sugestoesContainer.style.display = 'none';
        }
    });
}

// --- Funções de Declaração e Atestado ---

function iniciarProcessoDeclaracao(data, turno, vaga) {
    const agendamentosDia = agendamentos[data];
    if (!agendamentosDia || !agendamentosDia[turno]) return;
    const agendamento = agendamentosDia[turno].find(ag => ag.vaga === vaga);
    if (!agendamento) return;
    atestadoEmGeracao = { ...agendamento, data, turno }; 
    const choiceModal = document.getElementById('choiceModal');
    if (choiceModal) choiceModal.style.display = 'flex';
}

function fecharModalEscolha() {
    const choiceModal = document.getElementById('choiceModal');
    if (choiceModal) choiceModal.style.display = 'none';
    atestadoEmGeracao = null; 
}

function gerarDeclaracaoPaciente() {
    if (!atestadoEmGeracao) return;
    const { nome, cns, data, turno } = atestadoEmGeracao;
    const dataObj = new Date(data + 'T12:00:00');
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const turnoFormatado = turno === 'manha' ? 'manhã' : 'tarde';

    const conteudoAtestado = `
        <h4>DECLARAÇÃO DE COMPARECIMENTO</h4>
        <p>Declaramos, para os devidos fins, que o(a) paciente&nbsp;<strong>${nome.toUpperCase()}</strong>, CNS&nbsp;<strong>${cns}</strong>, esteve presente nesta unidade, CAPS ia Liberdade, no período da ${turnoFormatado}, participando de atividades relacionadas ao seu Projeto Terapêutico Singular.</p>
        <p>Essa declaração é emitida para fins de comprovação da presença no âmbito do acompanhamento terapêutico do(a) referido(a) paciente, conforme previsto em seu plano terapêutico.</p>
        <br><br>
        <p style="text-align: center;">Salvador, ${dataFormatada}.</p>
    `;

    const wrapper = document.getElementById('declaracao-content-wrapper');
    if (wrapper) wrapper.innerHTML = conteudoAtestado;
    
    fecharModalEscolha();
    const declaracaoModal = document.getElementById('declaracaoModal');
    if (declaracaoModal) declaracaoModal.style.display = 'flex';
}

function gerarDeclaracaoAcompanhante() {
    if (!atestadoEmGeracao) return;
    const modal = document.getElementById('acompanhanteModal');
    if (modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('acompanhanteNomeInput');
        if (input) input.focus();
    }
}

function fecharModalAcompanhante() {
    const input = document.getElementById('acompanhanteNomeInput');
    if (input) input.value = ''; 
    const modal = document.getElementById('acompanhanteModal');
    if (modal) modal.style.display = 'none';
}

function confirmarNomeAcompanhante() {
    const nomeAcompanhanteInput = document.getElementById('acompanhanteNomeInput');
    if (!nomeAcompanhanteInput) return;
    const nomeAcompanhante = nomeAcompanhanteInput.value.trim();

    if (nomeAcompanhante) {
        if (!atestadoEmGeracao) return;
        const { nome, cns, data, turno } = atestadoEmGeracao;
        const dataObj = new Date(data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const turnoFormatado = turno === 'manha' ? 'manhã' : 'tarde';

        const conteudoAtestado = `
            <h4>DECLARAÇÃO DE COMPARECIMENTO</h4>
            <p>Declaramos, para os devidos fins, que <strong>${nomeAcompanhante}</strong>, esteve presente nesta unidade, CAPS ia Liberdade, no período da ${turnoFormatado}, acompanhando o(a) paciente <strong>${nome.toUpperCase()}</strong>, CNS <strong>${cns}</strong> nas atividades relacionadas ao seu Projeto Terapêutico Singular.</p>
            <p>Essa declaração é emitida para fins de comprovação da presença no âmbito do acompanhamento terapêutico do(a) referido(a) paciente, conforme previsto em seu plano terapêutico.</p>
            <br><br>
            <p style="text-align: center;">Salvador, ${dataFormatada}.</p>
        `;

        const wrapper = document.getElementById('declaracao-content-wrapper');
        if (wrapper) wrapper.innerHTML = conteudoAtestado;
        
        fecharModalAcompanhante();
        fecharModalEscolha();
        const declaracaoModal = document.getElementById('declaracaoModal');
        if (declaracaoModal) declaracaoModal.style.display = 'flex';
    } else {
        mostrarNotificacao('Por favor, digite o nome do acompanhante.', 'warning');
        if (nomeAcompanhanteInput) nomeAcompanhanteInput.focus();
    }
}

function fecharModalAtestado() {
    const declaracaoModal = document.getElementById('declaracaoModal');
    if (declaracaoModal) declaracaoModal.style.display = 'none';
    atestadoEmGeracao = null; 
    try {
        document.getElementById('assinaturaInput').value = '';
        document.getElementById('assinaturaNomePrint').textContent = '\u00A0'; 
        document.getElementById('assinaturaFuncaoPrint').textContent = '\u00A0'; 
        document.getElementById('assinaturaSugestoes').style.display = 'none';
    } catch (e) {}
}

// --- Funções de Impressão ---

// Helper para garantir estado limpo antes de qualquer impressão
function limparEstadoImpressao() {
    document.body.classList.remove('printing-agenda', 'printing-vagas', 'printing-report', 'printing-declaracao');
    const containers = ['print-container', 'print-vagas-container'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

function handlePrint(printClass) {
    // Limpeza preventiva de classes
    document.body.classList.remove('printing-agenda', 'printing-vagas', 'printing-report', 'printing-declaracao');
    
    document.body.classList.add(printClass);
    const handleAfterPrint = () => {
        document.body.classList.remove(printClass);
        limparEstadoImpressao(); // Limpeza pós-impressão também
        window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    try {
        window.print();
    } catch (e) {
        console.error('Erro ao chamar window.print():', e);
        handleAfterPrint();
    }
}

function imprimirDeclaracao() {
    const nomeAssinatura = document.getElementById('assinaturaNomePrint');
    if (!nomeAssinatura || nomeAssinatura.textContent.trim() === '' || nomeAssinatura.textContent === '\u00A0') {
        mostrarNotificacao('Por favor, selecione um profissional para a assinatura.', 'warning');
        return; 
    }
    limparEstadoImpressao(); // Garante limpeza
    handlePrint('printing-declaracao');
}

function imprimirAgendaDiaria(dataParaImpressao) {
    limparEstadoImpressao(); // Garante limpeza inicial

    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    // LÓGICA DE TÍTULO MODIFICADA
    const data = dataParaImpressao || dataSelecionada;
    const dataObj = new Date(data + 'T12:00:00');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const diaSemanaNome = diasSemana[dataObj.getDay()].toLowerCase();

    let printHTML = `<h1>Agendamentos em ${dia}/${mes}/${ano} - ${diaSemanaNome}</h1>`;

    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    
    const criarTabelaTurno = (turno, agendamentosTurno) => {
        let tabela = `
            <h2>Turno: ${turno.charAt(0).toUpperCase() + turno.slice(1)}</h2>
            <table class="agenda-table">
                <thead>
                    <tr>
                        <th class="col-numero">Nº</th>
                        <th class="col-nome">Paciente</th>
                        <th class="col-tr">Téc. Ref.</th>
                        <th class="col-obs">Observação/Solicitação</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (!agendamentosTurno || agendamentosTurno.length === 0) {
            tabela += '<tr><td colspan="4">Nenhum agendamento para este turno.</td></tr>';
        } else {
            agendamentosTurno.sort((a, b) => a.vaga - b.vaga); 
            agendamentosTurno.forEach(ag => {
                const obs = ag.observacao || '';
                const solicitacoes = (ag.solicitacoes && ag.solicitacoes.length > 0) 
                    ? `<strong>Solicitações:</strong> ${ag.solicitacoes.join(', ')}` 
                    : '';
                const obsFinal = [obs, solicitacoes].filter(Boolean).join('<br><br>');
                tabela += `
                    <tr>
                        <td class="col-numero">${ag.numero}</td>
                        <td class="col-nome">${ag.nome}</td>
                        <td class="col-tr">${ag.tecRef || ''}</td>
                        <td class="col-obs">${obsFinal}</td>
                    </tr>
                `;
            });
        }
        tabela += '</tbody></table>';
        return tabela;
    };
    
    printHTML += criarTabelaTurno('Manhã', agendamentosDia.manha);
    printHTML += criarTabelaTurno('Tarde', agendamentosDia.tarde);
    printContainer.innerHTML = printHTML;
    handlePrint('printing-agenda');
    const cleanup = () => {
        printContainer.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
}

function imprimirVagas() {
    limparEstadoImpressao(); // Garante limpeza inicial

    const printContainer = document.getElementById('print-vagas-container');
    const contentToPrintEl = document.getElementById('vagasResultadosContainer'); 
    if (!printContainer || !contentToPrintEl || !vagasResultadosAtuais || vagasResultadosAtuais.length === 0) {
        mostrarNotificacao('Não há dados de vagas para imprimir.', 'warning');
        return;
    }
    
    const titleEl = contentToPrintEl.querySelector('#vagasPeriodoTitulo');
    const title = titleEl ? titleEl.textContent : 'Resumo de Vagas Encontradas';

    let printHTML = `<h1>${title}</h1>`;
    let detalhesHTML = '<div id="vagasBloqueiosDetalhes">'; 

    vagasResultadosAtuais.forEach(d => {
        const dateFmt = new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        detalhesHTML += `<div class="print-day-container">`;
        detalhesHTML += `<h2 class="print-day-header">${d.weekday}, ${dateFmt}</h2>`;

        if (d.type === 'Fim de Semana') {
            detalhesHTML += `<p class="print-aviso fim-semana">Fim de Semana</p>`;
        } else {
            detalhesHTML += `<div class="print-row">`;
            detalhesHTML += `<div class="print-col">`;
            const statusManha = d.manha.livres === VAGAS_POR_TURNO ? 'LIVRE' : (d.manha.livres > 0 ? `${d.manha.livres} Livres` : 'CHEIO');
            detalhesHTML += `<h3 class="print-turno-header">Manhã (${statusManha})</h3>`;
            
            if (d.motivo && d.manha.livres === 0) {
                 detalhesHTML += `<p class="print-aviso bloqueio">Bloqueado: ${d.motivo}</p>`;
            } else if (d.manha.ocupados.length > 0) {
                 detalhesHTML += `<ul class="print-turno-list">`;
                 d.manha.ocupados.forEach(ag => {
                     detalhesHTML += `<li class="print-vaga-ocupada"><span>Nº ${ag.numero}</span> - ${ag.nome}</li>`;
                 });
                 detalhesHTML += `</ul>`;
            } else if (d.manha.livres === 0 && !d.motivo) {
                 detalhesHTML += `<p class="print-aviso bloqueio">8 vagas ocupadas.</p>`;
            } else if (d.manha.livres === VAGAS_POR_TURNO) {
                 detalhesHTML += `<p class="print-aviso print-vaga-livre">8 vagas livres.</p>`;
            }
            detalhesHTML += `</div>`; 
            detalhesHTML += `<div class="print-col">`;
            const statusTarde = d.tarde.livres === VAGAS_POR_TURNO ? 'LIVRE' : (d.tarde.livres > 0 ? `${d.tarde.livres} Livres` : 'CHEIO');
            detalhesHTML += `<h3 class="print-turno-header">Tarde (${statusTarde})</h3>`;
            
            if (d.motivo && (d.tarde.livres === 0 || d.tarde.ocupados.length === 0)) {
                 detalhesHTML += `<p class="print-aviso bloqueio">Bloqueado: ${d.motivo}</p>`;
            } else if (d.tarde.ocupados.length > 0) {
                 detalhesHTML += `<ul class="print-turno-list">`;
                 d.tarde.ocupados.forEach(ag => {
                     detalhesHTML += `<li class="print-vaga-ocupada"><span>Nº ${ag.numero}</span> - ${ag.nome}</li>`;
                 });
                 detalhesHTML += `</ul>`;
            } else if (d.tarde.livres === 0 && !d.motivo) {
                 detalhesHTML += `<p class="print-aviso bloqueio">8 vagas ocupadas.</p>`;
            } else if (d.tarde.livres === VAGAS_POR_TURNO) {
                 detalhesHTML += `<p class="print-aviso print-vaga-livre">8 vagas livres.</p>`;
            }
            detalhesHTML += `</div>`; 
            detalhesHTML += `</div>`; 
        }
        detalhesHTML += `</div>`; 
    });

    detalhesHTML += '</div>';
    printContainer.innerHTML = printHTML + detalhesHTML;
    handlePrint('printing-vagas');
    const cleanup = () => {
        printContainer.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
}

function configurarAutocompleteAssinatura() {
    const input = document.getElementById('assinaturaInput');
    const sugestoesLista = document.getElementById('assinaturaSugestoes');
    const nomePrint = document.getElementById('assinaturaNomePrint');
    const funcaoPrint = document.getElementById('assinaturaFuncaoPrint');
    if (!input || !sugestoesLista || !nomePrint || !funcaoPrint) return;
    
    const container = input.closest('.autocomplete-container');

    input.addEventListener('input', () => {
        const termo = input.value.trim().toLowerCase();
        if (termo === '') {
            nomePrint.textContent = '\u00A0'; 
            funcaoPrint.textContent = '\u00A0'; 
            sugestoesLista.innerHTML = '';
            sugestoesLista.style.display = 'none';
            return;
        }
        if (termo.length < 2) {
            sugestoesLista.innerHTML = '';
            sugestoesLista.style.display = 'none';
            return;
        }
        const sugestoesFiltradas = PROFISSIONAIS_LISTA.filter(p => 
            p.nome.toLowerCase().includes(termo)
        );

        if (sugestoesFiltradas.length > 0) {
            sugestoesLista.innerHTML = sugestoesFiltradas.map(p => 
                `<div class="sugestao-item" data-nome="${p.nome}">
                    <strong>${p.nome}</strong><br>
                    <small>${p.funcao}</small>
                </div>`
            ).join('');
            sugestoesLista.style.display = 'block';
        } else {
            sugestoesLista.innerHTML = '';
            sugestoesLista.style.display = 'none';
        }
    });

    sugestoesLista.addEventListener('click', (e) => {
        const item = e.target.closest('.sugestao-item');
        if (item) {
            const nomeSelecionado = item.dataset.nome;
            const profissional = PROFISSIONAIS_LISTA.find(p => p.nome === nomeSelecionado);
            if (profissional) {
                nomePrint.textContent = profissional.nome;
                funcaoPrint.textContent = profissional.funcao;
                input.value = '';
                sugestoesLista.innerHTML = '';
                sugestoesLista.style.display = 'none';
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            sugestoesLista.style.display = 'none';
        }
    });
}

// --- Funções de Agendamento e Edição ---

function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault();
    const form = event.target; 
    const solicitacoes = Array.from(form.querySelectorAll('input[name="solicitacao"]:checked')).map(cb => cb.value);
    const numeroPaciente = form.querySelector('[name="numero"]').value.trim();

    const erroAntigo = form.querySelector('.form-error-message');
    if (erroAntigo) erroAntigo.remove();

    if (agendamentos[data]) {
        const agendamentosDia = [
            ...(agendamentos[data].manha || []),
            ...(agendamentos[data].tarde || [])
        ];
        const duplicado = agendamentosDia.find(ag => {
            const encontrado = ag.numero === numeroPaciente;
            if (slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === vaga) {
                   return false; 
            }
            return encontrado; 
        });

        if (duplicado) {
            const erroEl = document.createElement('p');
            erroEl.className = 'form-error-message';
            erroEl.textContent = 'ERRO: Paciente já agendado para este dia.';
            const actionsWrapper = form.querySelector('.form-actions-wrapper');
            if (actionsWrapper) form.insertBefore(erroEl, actionsWrapper);
            return; 
        }
    }

    const novoAgendamento = {
        vaga: vaga,
        numero: numeroPaciente, 
        nome: form.querySelector('[name="nome"]').value.trim(),
        cns: form.querySelector('[name="cns"]').value.trim(),
        distrito: form.querySelector('[name="distrito"]').value.trim(),
        tecRef: form.querySelector('[name="tecRef"]').value.trim(),
        cid: form.querySelector('[name="cid"]').value.trim().toUpperCase(),
        agendadoPor: form.querySelector('[name="agendadoPor"]').value.trim(),
        observacao: form.querySelector('[name="observacao"]').value.trim(),
        primeiraConsulta: form.querySelector('[name="primeiraConsulta"]').checked,
        solicitacoes: solicitacoes,
        status: 'Aguardando',
    };

    if (!agendamentos[data]) agendamentos[data] = {};
    if (!agendamentos[data][turno]) agendamentos[data][turno] = [];

    const index = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    if (index !== -1) {
        agendamentos[data][turno][index] = { ...agendamentos[data][turno][index], ...novoAgendamento };
    } else {
        agendamentos[data][turno].push(novoAgendamento);
    }
    
    agendamentos[data][turno].sort((a, b) => a.vaga - b.vaga);
    
    salvarAgendamentos();
    slotEmEdicao = null;
    selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`));
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date(data + 'T12:00:00'));
    mostrarNotificacao('Agendamento salvo com sucesso!', 'success');
}

function iniciarEdicao(data, turno, vaga) {
    slotEmEdicao = { data, turno, vaga };
    exibirAgendamentos(data);
}

function cancelarEdicao() {
    const data = slotEmEdicao.data;
    slotEmEdicao = null;
    exibirAgendamentos(data);
}

function executarCancelamento(data, turno, vaga) {
    if (!agendamentos[data] || !agendamentos[data][turno]) return;
    const index = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    if (index !== -1) {
        agendamentos[data][turno].splice(index, 1);
        if (agendamentos[data][turno].length === 0) delete agendamentos[data][turno];
        if (Object.keys(agendamentos[data]).length === 0) delete agendamentos[data];

        salvarAgendamentos();
        selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`));
        atualizarCalendario();
        atualizarResumoMensal();
        atualizarResumoSemanal(new Date(data + 'T12:00:00'));
        mostrarNotificacao('Agendamento cancelado com sucesso!', 'info');
    }
    fecharModalConfirmacao();
}

function marcarStatus(data, turno, vaga, novoStatus) {
    const agendamento = agendamentos[data]?.[turno]?.find(a => a.vaga === vaga);
    if (!agendamento) return;

    if (novoStatus === 'Justificou') {
        abrirModalJustificativa(data, turno, vaga);
        return; 
    }
    agendamento.status = (agendamento.status === novoStatus) ? 'Aguardando' : novoStatus;
    if (agendamento.status !== 'Justificou') delete agendamento.justificativa;
    
    salvarAgendamentos();
    exibirAgendamentos(data);
    atualizarResumoMensal();
}

function limparFormulario(button) {
    const form = button.closest('form');
    if (form) {
        form.reset();
        const erroAntigo = form.querySelector('.form-error-message');
        if (erroAntigo) erroAntigo.remove();
        const numeroInput = form.querySelector('[name="numero"]');
        if (numeroInput) numeroInput.focus();
    }
}

function verificarDuplicidadeAoDigitar(inputElement, data, turno, vaga) {
    const form = inputElement.closest('form');
    const valorInput = inputElement.value.trim();
    const erroAntigo = form.querySelector('.form-error-message');
    if (erroAntigo) erroAntigo.remove();
    
    if (valorInput === '') return;

    const campoVerificacao = inputElement.name;
    const valorVerificacao = valorInput.toLowerCase();

    if (agendamentos[data]) {
        const agendamentosDia = [
            ...(agendamentos[data].manha || []),
            ...(agendamentos[data].tarde || [])
        ];
        const duplicado = agendamentosDia.find(ag => {
            let valorAgendamento = '';
            if (campoVerificacao === 'numero') valorAgendamento = ag.numero;
            else if (campoVerificacao === 'nome') valorAgendamento = ag.nome.toLowerCase();
            else if (campoVerificacao === 'cns') valorAgendamento = ag.cns;

            const encontrado = valorAgendamento === valorVerificacao;
            if (slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === vaga) {
                   return false;
            }
            return encontrado; 
        });

        if (duplicado) {
            const erroEl = document.createElement('p');
            erroEl.className = 'form-error-message';
            erroEl.textContent = 'ERRO: Paciente já agendado para este dia.';
            const actionsWrapper = form.querySelector('.form-actions-wrapper');
            if (actionsWrapper) form.insertBefore(erroEl, actionsWrapper);
        }
    }
}

function criarEmptyState() {
    return `
        <div class="glass-card empty-state-card">
            <div class="card-content">
                <div class="empty-state">
                    <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-calendar-check" viewBox="0 0 16 16"><path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>
                    <h3>Selecione uma Data</h3>
                    <p>Clique num dia útil no calendário para visualizar e gerenciar os agendamentos.</p>
                </div>
            </div>
        </div>
    `;
}

function criarBlockedState(data, dataFmt, motivo, tipo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x-fill' : 'bi-lock-fill';
    return `
        <div class="appointment-header">
            <h2 class="appointment-title">${dataFmt}</h2>
            <div class="header-actions">
                <button id="btnLockDay" class="btn-icon btn-lock" title="Desbloquear Agenda" aria-label="Desbloquear agenda do dia">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-unlock-fill" viewBox="0 0 16 16"><path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2"/></svg>
                </button>
            </div>
        </div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">
            <div class="card-content">
                <div class="blocked-state">
                    <i class="bi ${icon} blocked-icon"></i>
                    <h3>Agenda Bloqueada</h3>
                    <p>Motivo: <strong>${motivo || 'Não especificado'}</strong></p>
                </div>
            </div>
        </div>`;
}

function criarBlockedTurnoState(turno, motivo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x' : 'bi-lock-fill';
    return `
        <div class="blocked-state turno">
            <i class="bi ${icon} blocked-icon"></i>
            <h4>Turno da ${turno} Bloqueado</h4>
            <p>Motivo: <strong>${motivo || 'Não especificado'}</strong></p>
        </div>`;
}

function mostrarTurno(turno) {
    turnoAtivo = turno;
    
    // 1. Atualiza as Abas (Tabs)
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) activeTab.classList.remove('active');
    const newTab = document.querySelector(`.tab-btn.${turno}`);
    if (newTab) newTab.classList.add('active');

    // 2. Atualiza o Conteúdo dos Cards
    const activeContent = document.querySelector('.turno-content.active');
    if (activeContent) activeContent.classList.remove('active');
    const newContent = document.getElementById(`turno-${turno}`);
    if (newContent) newContent.classList.add('active');

    // --- NOVO: Atualiza o Indicador Visual (Hint) ---
    const indicator = document.getElementById('turnoIndicator');
    if (indicator) {
        // Remove classes antigas e adiciona a nova
        indicator.classList.remove('manha', 'tarde');
        indicator.classList.add(turno);
        
        // Atualiza Texto e Ícone
        if (turno === 'manha') {
            indicator.innerHTML = '<i class="bi bi-brightness-high-fill"></i> MANHÃ (08:00 - 12:00)';
        } else {
            indicator.innerHTML = '<i class="bi bi-moon-stars-fill"></i> TARDE (13:00 - 17:00)';
        }
    }
}

function abrirModalConfirmacao(mensagem, acao) {
    const msgElement = document.getElementById('confirmMessage');
    if (msgElement) msgElement.textContent = mensagem;
    confirmAction = acao;
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'flex';
}

function fecharModalConfirmacao() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
    confirmAction = null;
}

function executarAcaoConfirmada() {
    if (typeof confirmAction === 'function') confirmAction();
    fecharModalConfirmacao();
}

function abrirModalJustificativa(data, turno, vaga) {
    justificativaEmEdicao = { data, turno, vaga };
    const form = document.getElementById('justificationForm');
    if (form) form.reset();
    const container = document.getElementById('reagendamentoDataContainer');
    if (container) container.style.display = 'block'; 
    const modal = document.getElementById('justificationModal');
    if (modal) modal.style.display = 'flex';
}

function fecharModalJustificativa() {
    const modal = document.getElementById('justificationModal');
    if (modal) modal.style.display = 'none';
    justificativaEmEdicao = null;
}

function salvarJustificativa() {
    if (!justificativaEmEdicao) return;
    const { data, turno, vaga } = justificativaEmEdicao;
    const agendamento = agendamentos[data]?.[turno]?.find(a => a.vaga === vaga);
    if (!agendamento) return;

    const tipoInput = document.querySelector('input[name="justificativaTipo"]:checked');
    if (!tipoInput) return;
    
    const tipo = tipoInput.value;
    let detalhe = '';

    if (tipo === 'Reagendado') {
        const dataInput = document.getElementById('reagendamentoData');
        if (dataInput) detalhe = dataInput.value;
        if (!detalhe) {
            mostrarNotificacao('Por favor, selecione a data de reagendamento.', 'warning');
            return;
        }
    } else {
        detalhe = 'Contato TR';
    }

    agendamento.status = 'Justificou';
    agendamento.justificativa = { tipo, detalhe };
    salvarAgendamentos();
    fecharModalJustificativa();
    exibirAgendamentos(data);
    atualizarResumoMensal();
    mostrarNotificacao('Justificativa salva com sucesso!', 'success');
}

function configurarAutopreenchimento(form) {
    const inputs = form.querySelectorAll('input[name="numero"], input[name="nome"], input[name="cns"], input[name="tecRef"]');
    inputs.forEach(input => {
        const container = input.closest('.autocomplete-container');
        if (!container) return;
        const sugestoesLista = container.querySelector('.sugestoes-lista');
        if (!sugestoesLista) return;

        input.addEventListener('input', () => {
            const termo = input.value.toLowerCase();
            const campo = input.name;
            if (termo.length < 2) {
                sugestoesLista.innerHTML = '';
                sugestoesLista.style.display = 'none';
                return;
            }
            const sugestoesFiltradas = pacientesGlobais.filter(p => {
                const valorCampo = p[campo] ? p[campo].toString().toLowerCase() : '';
                return valorCampo.includes(termo);
            }).slice(0, 5);

            if (sugestoesFiltradas.length > 0) {
                sugestoesLista.innerHTML = sugestoesFiltradas.map(p => 
                    `<div class="sugestao-item" data-numero="${p.numero}">
                        <strong>${p.nome}</strong> (Nº: ${p.numero})
                    </div>`
                ).join('');
                sugestoesLista.style.display = 'block';
            } else {
                sugestoesLista.style.display = 'none';
            }
        });

        sugestoesLista.addEventListener('click', (e) => {
            const item = e.target.closest('.sugestao-item');
            if (item) {
                const numeroPaciente = item.dataset.numero;
                const paciente = pacientesGlobais.find(p => p.numero === numeroPaciente);
                if (paciente) {
                    const numeroInput = form.querySelector('[name="numero"]');
                    if (numeroInput) numeroInput.value = paciente.numero || '';
                    const nomeInput = form.querySelector('[name="nome"]');
                    if (nomeInput) nomeInput.value = paciente.nome || '';
                    const cnsInput = form.querySelector('[name="cns"]');
                    if (cnsInput) cnsInput.value = paciente.cns || '';
                    const distritoInput = form.querySelector('[name="distrito"]');
                    if (distritoInput) distritoInput.value = paciente.distrito || '';
                    const tecRefInput = form.querySelector('[name="tecRef"]');
                    if (tecRefInput) tecRefInput.value = paciente.tecRef || '';
                    const cidInput = form.querySelector('[name="cid"]');
                    if (cidInput) cidInput.value = paciente.cid || '';
                }
                sugestoesLista.innerHTML = '';
                sugestoesLista.style.display = 'none';
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!form.contains(e.target)) {
            form.querySelectorAll('.sugestoes-lista').forEach(lista => {
                if (lista) lista.style.display = 'none';
            });
        }
    });
}

function isWeekend(date) {
    const day = new Date(date + 'T00:00:00').getDay();
    return day === 0 || day === 6; 
}

function displayVagasError(message, show) {
    const errorElement = document.getElementById('vagasErrorMessage');
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.classList.toggle('hidden', !show); 
}

function procurarVagas() {
    const startDateInput = document.getElementById('vagasStartDate');
    const endDateInput = document.getElementById('vagasEndDate');
    const resultsContainer = document.getElementById('vagasResultadosContainer');
    const printButton = document.getElementById('btnPrintVagas');
    if (!startDateInput || !endDateInput || !resultsContainer || !printButton) return;

    displayVagasError('', false); 
    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    if (!startDateStr || !endDateStr) {
        displayVagasError('Preencha as datas de início e fim da pesquisa.', true);
        resultsContainer.classList.add('hidden');
        return;
    }

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T00:00:00');
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
         displayVagasError('A data final não pode ser anterior à data inicial.', true);
         resultsContainer.classList.add('hidden');
         return;
    }
    if (diffDays >= MAX_DAYS_SEARCH) {
        displayVagasError('POR FAVOR, DIGITE UM INTERVALO DE NO MAXIMO DEZ DIAS', true);
        resultsContainer.classList.add('hidden');
        return;
    }

    let totalVagasLivres = 0;
    let diasProcessados = [];
    let day = new Date(startDate);
    
    while (day <= endDate) {
        const dateStr = day.toISOString().split('T')[0];
        const dayOfWeek = day.getDay();
        const bloqueio = diasBloqueados[dateStr];
        const agendamentosDia = agendamentos[dateStr];
        let vagasLivresManha = VAGAS_POR_TURNO;
        let vagasLivresTarde = VAGAS_POR_TURNO;
        let ocupadosManha = [];
        let ocupadosTarde = [];
        let bloqueioMotivo = null;

        if (isWeekend(dateStr)) {
            diasProcessados.push({ date: dateStr, weekday: diasSemana[dayOfWeek], type: 'Fim de Semana', totalVagas: 0 });
        } else {
            if (bloqueio) {
                bloqueioMotivo = bloqueio.motivo;
                if (bloqueio.diaInteiro) {
                    vagasLivresManha = 0;
                    vagasLivresTarde = 0;
                } else {
                    if (bloqueio.manha) vagasLivresManha = 0;
                    if (bloqueio.tarde) vagasLivresTarde = 0;
                }
            }
            if (agendamentosDia) {
                if (vagasLivresManha > 0 && agendamentosDia.manha) {
                    ocupadosManha = agendamentosDia.manha.map(ag => ({...ag, turno: 'manha'}));
                    vagasLivresManha -= ocupadosManha.length;
                    vagasLivresManha = Math.max(0, vagasLivresManha);
                }
                if (vagasLivresTarde > 0 && agendamentosDia.tarde) {
                    ocupadosTarde = agendamentosDia.tarde.map(ag => ({...ag, turno: 'tarde'}));
                    vagasLivresTarde -= ocupadosTarde.length;
                    vagasLivresTarde = Math.max(0, vagasLivresTarde);
                }
            }
            totalVagasLivres += vagasLivresManha + vagasLivresTarde;
            diasProcessados.push({
                date: dateStr,
                weekday: diasSemana[dayOfWeek],
                type: bloqueioMotivo ? 'Bloqueio' : (vagasLivresManha + vagasLivresTarde > 0 ? 'Disponível' : 'Cheio'),
                manha: { livres: vagasLivresManha, ocupados: ocupadosManha },
                tarde: { livres: vagasLivresTarde, ocupados: ocupadosTarde },
                motivo: bloqueioMotivo
            });
        }
        day.setDate(day.getDate() + 1);
    }

    renderizarResultadosVagas(startDate, endDate, totalVagasLivres, diasProcessados);
    vagasResultadosAtuais = diasProcessados; 
    resultsContainer.classList.remove('hidden');
    printButton.classList.remove('hidden');
}

function renderizarResultadosVagas(startDate, endDate, totalVagasLivres, diasProcessados) {
    const resultsSummary = document.getElementById('vagasSumario');
    const resultsDetails = document.getElementById('vagasBloqueiosDetalhes');
    const title = document.getElementById('vagasPeriodoTitulo');
    if (!resultsSummary || !resultsDetails || !title) return;

    const startFmt = startDate.toLocaleDateString('pt-BR');
    const endFmt = endDate.toLocaleDateString('pt-BR');

    title.textContent = `Vagas Encontradas: ${startFmt} a ${endFmt}`;
    resultsSummary.innerHTML = ''; 

    const gerarListaVagas = (vagas, tipo, data, turno) => {
        let listaHTML = '';
        if (tipo === 'ocupada') {
            vagas.forEach(ag => {
                listaHTML += `
                <li class="vaga-lista-item ocupada">
                    <div class="vaga-ocupada-info">
                        <span>Nº ${ag.numero}</span> - <strong>${ag.nome}</strong>
                    </div>
                    <button class="btn-icon btn-jump-patient" onclick="pularParaCard('${data}', '${turno}', ${ag.vaga})" title="Ver na agenda">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar-check" viewBox="0 0 16 16"><path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>
                    </button>
                </li>`;
            });
        } else { 
            for (let i = 0; i < vagas; i++) {
                listaHTML += `<li class="vaga-lista-item livre" onclick="pularParaVagaLivre('${data}', '${turno}')">Vaga Livre</li>`;
            }
        }
        return listaHTML;
    };

    let detalhesHTML = '<div id="vagas-resultado-grid">';
    
    diasProcessados.forEach(d => {
        const dateFmt = new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const jumpButton = `
            <button class="btn-icon btn-jump-day" onclick="pularParaAgendamento('${d.date}')" title="Ir para este dia">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right-circle" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z"/></svg>
            </button>`;

        if (d.type === 'Fim de Semana') {
            detalhesHTML += `
                <div class="vaga-dia-card fim-de-semana">
                    <div class="vaga-dia-header"><span>${d.weekday}, ${dateFmt}</span></div>
                    <p class="aviso-bloqueio">Fim de Semana</p>
                </div>`;
        } else if (d.type === 'Bloqueio' && d.manha.livres === 0 && d.tarde.livres === 0) {
             detalhesHTML += `
                <div class="vaga-dia-card bloqueado">
                    <div class="vaga-dia-header"><span>${d.weekday}, ${dateFmt}</span>${jumpButton}</div>
                    <p class="aviso-bloqueio">Dia Inteiro Bloqueado. Motivo: ${d.motivo}</p>
                </div>`;
        } else {
            detalhesHTML += `<div class="vaga-dia-card"><div class="vaga-dia-header"><span>${d.weekday}, ${dateFmt}</span>${jumpButton}</div>`;
            
            const statusManha = d.manha.livres === VAGAS_POR_TURNO ? 'LIVRE' : (d.manha.livres > 0 ? `${d.manha.livres} Livres` : 'CHEIO');
            detalhesHTML += `<div class="turno-detalhe"><h3 class="turno-titulo manha">Manhã (${statusManha})</h3><ul class="vaga-lista">`;
            if (d.motivo && d.manha.livres === 0) {
                 detalhesHTML += `<p class="aviso-bloqueio">Turno Bloqueado: ${d.motivo}</p>`;
            } else {
                 detalhesHTML += gerarListaVagas(d.manha.ocupados, 'ocupada', d.date, 'manha');
                 detalhesHTML += gerarListaVagas(d.manha.livres, 'livre', d.date, 'manha');
            }
            detalhesHTML += `</ul></div>`;
            
            const statusTarde = d.tarde.livres === VAGAS_POR_TURNO ? 'LIVRE' : (d.tarde.livres > 0 ? `${d.tarde.livres} Livres` : 'CHEIO');
            detalhesHTML += `<div class="turno-detalhe"><h3 class="turno-titulo tarde">Tarde (${statusTarde})</h3><ul class="vaga-lista">`;
             if (d.motivo && d.tarde.livres === 0) {
                 detalhesHTML += `<p class="aviso-bloqueio">Turno Bloqueado: ${d.motivo}</p>`;
            } else {
                 detalhesHTML += gerarListaVagas(d.tarde.ocupados, 'ocupada', d.date, 'tarde'); 
                 detalhesHTML += gerarListaVagas(d.tarde.livres, 'livre', d.date, 'tarde');
            }
            detalhesHTML += `</ul></div></div>`; 
        }
    });

    detalhesHTML += '</div>'; 
    resultsDetails.innerHTML = detalhesHTML;
    
    if (totalVagasLivres === 0) {
        resultsSummary.innerHTML = '<p style="font-weight: bold; color: var(--color-danger);">Nenhuma vaga livre foi encontrada no período.</p>';
    }
}

function limparBuscaVagas() {
    const startDateInput = document.getElementById('vagasStartDate');
    if (startDateInput) startDateInput.value = '';
    const endDateInput = document.getElementById('vagasEndDate');
    if (endDateInput) endDateInput.value = '';
    const resultsContainer = document.getElementById('vagasResultadosContainer');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    const summary = document.getElementById('vagasSumario');
    if (summary) summary.innerHTML = '';
    const details = document.getElementById('vagasBloqueiosDetalhes');
    if (details) details.innerHTML = '';
    const printButton = document.getElementById('btnPrintVagas');
    if (printButton) printButton.classList.add('hidden');
    vagasResultadosAtuais = []; 
    displayVagasError('', false); 
}

function gerenciarBloqueioDia(data) {
    const bloqueio = diasBloqueados[data];
    if (bloqueio) {
        let mensagem = '';
        const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');

        if (bloqueio.diaInteiro) {
            mensagem = `Deseja realmente desbloquear o dia ${dataFormatada}?`;
        } else if (bloqueio.manha && !bloqueio.tarde) {
            mensagem = `Deseja realmente desbloquear o turno da manhã do dia ${dataFormatada}?`;
        } else if (bloqueio.tarde && !bloqueio.manha) {
            mensagem = `Deseja realmente desbloquear o turno da tarde do dia ${dataFormatada}?`;
        } else {
            mensagem = `Deseja realmente desbloquear o dia ${dataFormatada}?`;
        }

        abrirModalConfirmacao(
            mensagem,
            () => executarDesbloqueio(data)
        );
    } else {
        abrirModalBloqueio();
    }
}

function executarDesbloqueio(data) {
    const bloqueio = diasBloqueados[data];
    if (bloqueio) {
        if (bloqueio.isHoliday) {
            feriadosDesbloqueados[data] = true;
            salvarFeriadosDesbloqueados();
        }
        delete diasBloqueados[data];
        salvarBloqueios();
        atualizarCalendario();
        const diaEl = document.querySelector(`.day[data-date="${data}"]`);
        if (diaEl) selecionarDia(data, diaEl);
        mostrarNotificacao('Dia desbloqueado com sucesso.', 'success');
    }
}

function abrirModalBloqueio() {
    const form = document.getElementById('blockDayForm');
    if (form) form.reset();
    const modal = document.getElementById('blockDayModal');
    if (modal) modal.style.display = 'flex';
}

function fecharModalBloqueio() {
    const modal = document.getElementById('blockDayModal');
    if (modal) modal.style.display = 'none';
}

function confirmarBloqueio() {
    const data = dataSelecionada;
    if (!data) return;
    const tipoInput = document.getElementById('blockType');
    const motivoInput = document.getElementById('blockReason');
    if (!tipoInput || !motivoInput) return;

    const tipo = tipoInput.value;
    const motivo = motivoInput.value.trim();
    if (!motivo) {
        mostrarNotificacao('O motivo do bloqueio é obrigatório.', 'warning');
        return;
    }

    if (!diasBloqueados[data]) diasBloqueados[data] = {};
    diasBloqueados[data].diaInteiro = tipo === 'all_day';
    diasBloqueados[data].manha = tipo === 'all_day' || tipo === 'morning';
    diasBloqueados[data].tarde = tipo === 'all_day' || tipo === 'afternoon';
    diasBloqueados[data].motivo = motivo;
    diasBloqueados[data].isHoliday = false; 
    diasBloqueados[data].manual = true; 

    salvarBloqueios();
    atualizarCalendario();
    selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`));
    atualizarBolinhasDisponibilidade(data);
    fecharModalBloqueio();
    mostrarNotificacao('Dia/turno bloqueado com sucesso.', 'success');
}

function abrirModalLimpeza() {
    const modal = document.getElementById('clearDataModal');
    if (modal) {
        modal.style.display = 'flex';
        const passInput = document.getElementById('clearDataPassword');
        if (passInput) passInput.focus();
        const msg = document.getElementById('clearDataMessage');
        if (msg) msg.textContent = "Tem certeza? Não é todo dia que você tem a chance de recomeçar do zero. Considere isso uma faxina digital épica.";
    }
}

function fecharModalLimpeza() {
    const modal = document.getElementById('clearDataModal');
    if (!modal) return;
    modal.style.display = 'none';
    const passwordInput = modal.querySelector('#clearDataPassword');
    const errorMessage = modal.querySelector('#clearDataError');
    if (passwordInput) passwordInput.value = '';
    if (errorMessage) errorMessage.classList.add('hidden');
    tentativaSenha = 1; 
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('clearDataPassword');
    if (!passwordInput) return;
    const icon = document.querySelector('#togglePassword i');
    if (!icon) return;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    }
}

function executarLimpezaTotal() {
    const passwordInput = document.getElementById('clearDataPassword');
    const errorMessage = document.getElementById('clearDataError');
    if (!passwordInput || !errorMessage) return;

    if (passwordInput.value === 'apocalipse') {
        // [ARCOSAFE-FIX] Remove chave correta
        localStorage.removeItem('agenda_completa_final');
        localStorage.removeItem('pacientes_dados');
        localStorage.removeItem('dias_bloqueados');
        localStorage.removeItem('feriados_desbloqueados');
        sessionStorage.setItem('limpezaSucesso', 'true');
        location.reload();
    } else {
        if (tentativaSenha === 1) {
            errorMessage.textContent = 'Senha incorreta! O robô de limpeza agora já está preparando o polidor.';
            tentativaSenha++;
        } else {
            errorMessage.textContent = 'Senha incorreta!';
        }
        errorMessage.classList.remove('hidden');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function configurarHorarioBackup() {
    const saveBtn = document.getElementById('saveBackupTimeBtn');
    if (saveBtn) saveBtn.addEventListener('click', salvarHorarioBackup);
    carregarHorarioBackup();
}

function carregarHorarioBackup() {
    const backupTimeDisplay = document.getElementById('backupTimeDisplay');
    const backupTimeInput = document.getElementById('backupTimeInput');
    const horarioSalvo = localStorage.getItem('backupTime') || '16:00';
    if (backupTimeDisplay) backupTimeDisplay.textContent = horarioSalvo;
    if (backupTimeInput) backupTimeInput.value = horarioSalvo;
}

function salvarHorarioBackup() {
    const backupTimeInput = document.getElementById('backupTimeInput');
    if (backupTimeInput) {
        const novoHorario = backupTimeInput.value;
        localStorage.setItem('backupTime', novoHorario);
        
        // [ARCOSAFE-FIX] Reset da sessão de backup para permitir nova verificação hoje
        sessionStorage.removeItem('backupRealizadoSessao');
        
        const backupTimeDisplay = document.getElementById('backupTimeDisplay');
        if (backupTimeDisplay) backupTimeDisplay.textContent = novoHorario;
        mostrarNotificacao(`Horário de backup salvo para ${novoHorario}. Próximo backup agendado!`, 'success');
        
        // [ARCOSAFE-FIX] Verifica necessidade imediatamente
        verificarNecessidadeBackup();
    }
}

function verificarNecessidadeBackup() {
    if (modalBackupAberto) return;

    const horarioSalvo = localStorage.getItem('backupTime') || '16:00';
    const [horaAlvo, minutoAlvo] = horarioSalvo.split(':').map(Number);
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    // Verifica se o horário alvo foi atingido
    const horarioAtingido = horaAtual > horaAlvo || (horaAtual === horaAlvo && minutoAtual >= minutoAlvo);
    if (!horarioAtingido) return;

    // Chave única: data + horário configurado
    const hoje = agora.toLocaleDateString('pt-BR');
    const chaveBackup = `${hoje}_${horarioSalvo}`;
    const ultimoBackupChave = localStorage.getItem('ultimoBackupChave');

    // Só dispara se ainda não fez backup para ESTE horário específico hoje
    if (ultimoBackupChave === chaveBackup) return;
    abrirModalBackup();
}

function abrirModalBackup() {
    const modal = document.getElementById('backupModal');
    if (modal) {
        modal.style.display = 'flex';
        modalBackupAberto = true;
    }
}

function fecharModalBackup() {
    // [ARCOSAFE-FIX] Validação por chave composta
    const horarioSalvo = localStorage.getItem('backupTime') || '16:00';
    const hoje = new Date().toLocaleDateString('pt-BR');
    const chaveBackup = `${hoje}_${horarioSalvo}`;
    const ultimoBackupChave = localStorage.getItem('ultimoBackupChave');

    // Se a chave não estiver gravada (backup não feito), não deixa fechar (TRAVA RÍGIDA)
    if (ultimoBackupChave !== chaveBackup) {
         return; 
    }

    const modal = document.getElementById('backupModal');
    if (modal) {
        modal.style.display = 'none';
        modalBackupAberto = false;
    }
}

function atualizarBolinhasDisponibilidade(data) {
    const indicator = document.getElementById('availabilityIndicator');
    const bolinhasManha = document.getElementById('bolinhasManha');
    const bolinhasTarde = document.getElementById('bolinhasTarde');
    if (!indicator || !bolinhasManha || !bolinhasTarde) return;

    if (!data) {
        indicator.classList.add('hidden');
        return;
    }
    const agendamentosDia = agendamentos[data];
    const bloqueio = diasBloqueados[data];
    bolinhasManha.innerHTML = '';
    bolinhasTarde.innerHTML = '';

    const ocupadasManha = (bloqueio?.manha || bloqueio?.diaInteiro) ? VAGAS_POR_TURNO : (agendamentosDia?.manha?.length || 0);
    for (let i = 0; i < VAGAS_POR_TURNO; i++) {
        const bolinha = document.createElement('div');
        bolinha.className = 'vaga-bolinha';
        if (i < ocupadasManha) {
            bolinha.classList.add('ocupada', 'manha');
            bolinha.title = bloqueio?.manha ? `Turno bloqueado: ${bloqueio.motivo}` : `Vaga ${i+1} Ocupada`;
        } else {
            bolinha.title = `Vaga ${i+1} Livre`;
        }
        bolinhasManha.appendChild(bolinha);
    }
    
    const ocupadasTarde = (bloqueio?.tarde || bloqueio?.diaInteiro) ? VAGAS_POR_TURNO : (agendamentosDia?.tarde?.length || 0);
    for (let i = 0; i < VAGAS_POR_TURNO; i++) {
        const bolinha = document.createElement('div');
        bolinha.className = 'vaga-bolinha';
        if (i < ocupadasTarde) {
            bolinha.classList.add('ocupada', 'tarde');
            bolinha.title = bloqueio?.tarde ? `Turno bloqueado: ${bloqueio.motivo}` : `Vaga ${i+1} Ocupada`;
        } else {
            bolinha.title = `Vaga ${i+1} Livre`;
        }
        bolinhasTarde.appendChild(bolinha);
    }
    indicator.classList.remove('hidden');
}

function esconderBolinhasDisponibilidade() {
    const indicator = document.getElementById('availabilityIndicator');
    if (indicator) indicator.classList.add('hidden');
}

function atualizarResumoMensal() {
    const container = document.getElementById('resumoMensalContainer');
    if (!container) return;
    const stats = { compareceu: 0, faltou: 0, justificou: 0 };
    const prefixoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-`;

    Object.keys(agendamentos).forEach(data => {
        if (data.startsWith(prefixoMes)) {
            ['manha', 'tarde'].forEach(turno => {
                (agendamentos[data][turno] || []).forEach(ag => {
                    if (ag.status === 'Compareceu') stats.compareceu++;
                    else if (ag.status === 'Faltou') stats.faltou++;
                    else if (ag.status === 'Justificou') stats.justificou++;
                });
            });
        }
    });

    container.innerHTML = `
        <div class="monthly-summary-card">
            <h4 class="monthly-summary-title">Resumo de ${meses[mesAtual]}</h4>
            <ul class="summary-stats-list">
                <li class="summary-stat-item">
                    <span class="label">Compareceram:</span>
                    <button class="value compareceu" title="Ver relatório de comparecimentos" onclick="abrirModalRelatorio('Compareceu', 'current_month')">${stats.compareceu}</button>
                </li>
                <li class="summary-stat-item">
                    <span class="label">Faltaram:</span>
                    <button class="value faltou" title="Ver relatório de faltas" onclick="abrirModalRelatorio('Faltou', 'current_month')">${stats.faltou}</button>
                </li>
                <li class="summary-stat-item">
                    <span class="label">Justificaram:</span>
                    <button class="value justificou" title="Ver relatório de justificativas" onclick="abrirModalRelatorio('Justificou', 'current_month')">${stats.justificou}</button>
                </li>
            </ul>
        </div>
    `;
}

function atualizarResumoSemanal(dataReferencia) {
    const container = document.getElementById('resumoSemanalContainer');
    if (!container) return;

    const data = new Date(dataReferencia.getTime());
    const diaSemana = data.getDay();
    const diff = data.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
    const segundaFeira = new Date(data.setDate(diff));

    let statsSemanais = [];
    let maxAgendamentos = 0;

    for (let i = 0; i < 5; i++) { 
        const diaAtual = new Date(segundaFeira.getTime());
        diaAtual.setDate(segundaFeira.getDate() + i);
        const dataStr = diaAtual.toISOString().split('T')[0];
        const diaFmt = String(diaAtual.getDate()).padStart(2, '0');
        const diaSemanaCurto = diasSemana[diaAtual.getDay()].substring(0, 3);
        const agendamentosDia = agendamentos[dataStr];
        const bloqueio = diasBloqueados[dataStr];
        
        const totalManha = (bloqueio?.manha || bloqueio?.diaInteiro) ? VAGAS_POR_TURNO : (agendamentosDia?.manha?.length || 0);
        const totalTarde = (bloqueio?.tarde || bloqueio?.diaInteiro) ? VAGAS_POR_TURNO : (agendamentosDia?.tarde?.length || 0);

        statsSemanais.push({ dia: diaSemanaCurto, data: diaFmt, manha: totalManha, tarde: totalTarde });
        maxAgendamentos = Math.max(maxAgendamentos, totalManha, totalTarde);
    }
    
    const alturaMaxima = (maxAgendamentos === 0) ? VAGAS_POR_TURNO : maxAgendamentos;

    container.innerHTML = `
        <div class="weekly-summary-card">
            <h4 class="weekly-summary-title">Resumo da Semana (${statsSemanais[0].data} a ${statsSemanais[4].data})</h4>
            <div class="week-chart-container">
                ${statsSemanais.map(dia => `
                    <div class="week-day-column">
                        <div class="chart-values">
                            <span class="chart-value-manha">${dia.manha}</span>
                            <span class="chart-value-tarde">${dia.tarde}</span>
                        </div>
                        <div class="chart-bars">
                            <div class="chart-bar manha" style="height: ${(dia.manha / alturaMaxima) * 100}%" data-tooltip="${dia.manha} agend. manhã"></div>
                            <div class="chart-bar tarde" style="height: ${(dia.tarde / alturaMaxima) * 100}%" data-tooltip="${dia.tarde} agend. tarde"></div>
                        </div>
                        <span class="week-date-label">${dia.data}</span>
                        <span class="week-day-label">${dia.dia}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function abrirModalRelatorio(status = null, periodo = 'current_month') {
    const modal = document.getElementById('reportModal');
    const titleEl = document.getElementById('reportModalTitle');
    const anualBtn = document.getElementById('btnVerRelatorioAnual');
    if (!modal || !titleEl || !anualBtn) return;

    reportCurrentStatus = status; 
    let dados;
    if (periodo === 'current_month') {
        titleEl.textContent = `Relatório de ${status || 'Geral'} - ${meses[mesAtual]} ${anoAtual}`;
        dados = coletarDadosRelatorio(mesAtual, anoAtual);
        anualBtn.classList.remove('hidden'); 
    } else { 
        titleEl.textContent = `Relatório Anual - ${anoAtual}`;
        dados = coletarDadosRelatorio(null, anoAtual);
        anualBtn.classList.add('hidden'); 
    }
    reportUnfilteredResults = dados; 
    let dadosFiltrados = dados;
    if (status) dadosFiltrados = dados.filter(ag => ag.status === status);

    renderizarTabelaRelatorio(dadosFiltrados);
    popularFiltrosRelatorio(dados);
    limparFiltroRelatorio(false); 
    modal.style.display = 'flex';
}

function fecharModalRelatorio() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
    reportUnfilteredResults = []; 
    reportCurrentStatus = null;
}

function coletarDadosRelatorio(mes, ano) {
    let resultados = [];
    let prefixoBusca = `${ano}-`;
    if (mes !== null) prefixoBusca += `${String(mes + 1).padStart(2, '0')}-`;

    Object.keys(agendamentos).forEach(data => {
        if (data.startsWith(prefixoBusca)) {
            ['manha', 'tarde'].forEach(turno => {
                (agendamentos[data][turno] || []).forEach(ag => {
                    resultados.push({ ...ag, data, turno });
                });
            });
        }
    });
    resultados.sort((a, b) => new Date(a.data) - new Date(b.data));
    return resultados;
}

function renderizarTabelaRelatorio(dados) {
    const container = document.getElementById('reportTableContainer');
    const countEl = document.getElementById('reportTotalCount');
    if (!container || !countEl) return;

    countEl.textContent = `Total de ${dados.length} registros encontrados.`;
    if (dados.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 1rem;">Nenhum registro encontrado para este filtro.</p>';
        return;
    }
    let tabelaHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-data">Data</th>
                    <th class="col-nome">Paciente</th>
                    <th class="col-numero">Nº</th>
                    <th class="col-tr">Téc. Ref.</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${dados.map(ag => `
                    <tr>
                        <td>${new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>${ag.nome}</td>
                        <td>${ag.numero}</td>
                        <td>${ag.tecRef || ''}</td>
                        <td>${ag.status || 'Aguardando'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabelaHTML;
}

function popularFiltrosRelatorio(dados) {
    const filtroTipo = document.getElementById('reportFilterType');
    const filtroValor = document.getElementById('reportFilterValue');
    if (!filtroTipo || !filtroValor) return;
    const tecRefs = new Set();
    const distritos = new Set();
    dados.forEach(ag => {
        if (ag.tecRef) tecRefs.add(ag.tecRef);
        if (ag.distrito) distritos.add(ag.distrito);
    });
    filtroValor.dataset.tecRefs = JSON.stringify(Array.from(tecRefs).sort());
    filtroValor.dataset.distritos = JSON.stringify(Array.from(distritos).sort());
}

function atualizarValoresFiltro() {
    const filtroTipo = document.getElementById('reportFilterType');
    const filtroValor = document.getElementById('reportFilterValue');
    if (!filtroTipo || !filtroValor) return;
    const tipoSelecionado = filtroTipo.value;
    let valores = [];
    if (tipoSelecionado === 'tecRef') valores = JSON.parse(filtroValor.dataset.tecRefs || '[]');
    else if (tipoSelecionado === 'distrito') valores = JSON.parse(filtroValor.dataset.distritos || '[]');

    filtroValor.innerHTML = '<option value="">Selecione o valor</option>';
    valores.forEach(val => {
        filtroValor.innerHTML += `<option value="${val}">${val}</option>`;
    });
    filtroValor.disabled = (tipoSelecionado === '');
}

function aplicarFiltroRelatorio() {
    const filtroTipo = document.getElementById('reportFilterType');
    const filtroValor = document.getElementById('reportFilterValue');
    if (!filtroTipo || !filtroValor) return;
    const tipo = filtroTipo.value;
    const valor = filtroValor.value;
    let dadosFiltrados = reportUnfilteredResults;
    if (reportCurrentStatus) dadosFiltrados = dadosFiltrados.filter(ag => ag.status === reportCurrentStatus);
    if (tipo && valor) dadosFiltrados = dadosFiltrados.filter(ag => ag[tipo] === valor);
    renderizarTabelaRelatorio(dadosFiltrados);
}

function limparFiltroRelatorio(reRenderizar = true) {
    const filtroTipo = document.getElementById('reportFilterType');
    const filtroValor = document.getElementById('reportFilterValue');
    if (!filtroTipo || !filtroValor) return;
    filtroTipo.value = '';
    filtroValor.innerHTML = '<option value="">Selecione o valor</option>';
    filtroValor.disabled = true;
    if (reRenderizar) {
        let dadosFiltrados = reportUnfilteredResults;
        if (reportCurrentStatus) dadosFiltrados = dadosFiltrados.filter(ag => ag.status === reportCurrentStatus);
        renderizarTabelaRelatorio(dadosFiltrados);
    }
}

function fazerBackup() {
    const dataParaBackup = {
        // [ARCOSAFE-FIX] Backup usa a chave agendamentos para compatibilidade interna, mas carrega da nova key
        agendamentos,
        pacientesGlobais,
        diasBloqueados,
        feriadosDesbloqueados
    };
    const dataString = JSON.stringify(dataParaBackup, null, 2);
    const blob = new Blob([dataString], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const hoje = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_agenda_${hoje}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // [ARCOSAFE-FIX] Grava a chave composta (DATA_HORARIO) no localStorage
    const horarioSalvo = localStorage.getItem('backupTime') || '16:00';
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const chaveBackup = `${dataHoje}_${horarioSalvo}`;
    localStorage.setItem('ultimoBackupChave', chaveBackup);
    
    // Fecha o modal se estiver aberto
    fecharModalBackup();
    
    mostrarNotificacao('Backup realizado com sucesso!', 'success');
}

function restaurarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && typeof data.agendamentos === 'object' && Array.isArray(data.pacientesGlobais)) {
                 abrirModalConfirmacao(
                    'Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos permanentemente.',
                    () => executarRestauracao(data)
                );
            } else {
                mostrarNotificacao('Arquivo de backup inválido ou corrompido.', 'danger');
            }
        } catch (error) {
            console.error('Erro ao ler o arquivo de backup:', error);
            mostrarNotificacao('Falha ao ler o arquivo de backup. Verifique o formato.', 'danger');
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function executarRestauracao(data) {
    agendamentos = data.agendamentos || {};
    pacientesGlobais = data.pacientesGlobais || [];
    diasBloqueados = data.diasBloqueados || {};
    feriadosDesbloqueados = data.feriadosDesbloqueados || {};
    salvarAgendamentos();
    salvarPacientesNoLocalStorage();
    salvarBloqueios();
    salvarFeriadosDesbloqueados();
    sessionStorage.setItem('restauracaoSucesso', 'true');
    location.reload();
}

// ============================================
// 5. INICIALIZAÇÃO DO DOM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se há mensagens de sucesso na sessão (após reload)
    if (sessionStorage.getItem('limpezaSucesso')) {
        mostrarNotificacao("Todos os dados foram apagados com sucesso.", 'success');
        sessionStorage.removeItem('limpezaSucesso');
    }
    if (sessionStorage.getItem('restauracaoSucesso')) {
        mostrarNotificacao("Dados restaurados com sucesso a partir do backup.", 'success');
        sessionStorage.removeItem('restauracaoSucesso');
    }
    
    // Inicia o processo de verificação de login
    inicializarLogin();
});


// ============================================
// 6. OVERRIDES PARA RECURSO DE HINT FLUTUANTE
// ============================================
// Sobrescrevemos estas funções aqui no final para garantir que o recurso 
// funcione corretamente, já que a definição original delas está no início do arquivo.

function selecionarDia(data, elemento) {
    slotEmEdicao = null;
    const diaSelecionadoAnterior = document.querySelector('.day.selected');
    if(diaSelecionadoAnterior) diaSelecionadoAnterior.classList.remove('selected');
    if(elemento) elemento.classList.add('selected');
    dataSelecionada = data;
    exibirAgendamentos(data);
    
    atualizarBolinhasDisponibilidade(data);
    atualizarResumoSemanal(new Date(data + 'T12:00:00'));

    // --- Lógica do Hint Lateral ---
    const hint = document.getElementById('floatingDateHint');
    if (hint) {
        const dataObj = new Date(data + 'T12:00:00');
        const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
        let dataTexto = dataObj.toLocaleDateString('pt-BR', opcoes);
        // Capitaliza a primeira letra
        dataTexto = dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1);
        
        hint.textContent = dataTexto;
        hint.classList.add('visible');
    }
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
        
        // Esconde o hint se não for dia útil/selecionável
        const hint = document.getElementById('floatingDateHint');
        if(hint) hint.classList.remove('visible');
    }
}



