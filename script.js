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
    { nome: "IONARA MARTINS DOS SANTOS",funcao: "TECNICO DE ENFERMAGEM" },
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
    
    // [ARCOSAFE-FIX] Restauração da lógica de cloneNode para garantir limpeza de eventos (Correção do Login)
    if (loginButton) {
        const novoLoginButton = loginButton.cloneNode(true);
        loginButton.parentNode.replaceChild(novoLoginButton, loginButton);
        novoLoginButton.addEventListener('click', (e) => {
            e.preventDefault(); tentarLogin(); }); } if (loginSenhaInput) { loginSenhaInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); tentarLogin(); } }); } } function tentarLogin() { const usuarioInput = document.getElementById('loginUsuario'); const senhaInput = document.getElementById('loginSenha'); const errorMessage = document.getElementById('loginErrorMessage'); const usuario = usuarioInput ? usuarioInput.value : ''; const senha = senhaInput ? senhaInput.value : ''; if (usuário === '0000' && senha === '0000') { sessionStorage.setItem('usuarioLogado', 'true'); if (errorMessage) errorMessage.classList.add('oculto'); document.body.classList.add('logado'); inicializarApp(); } else { if (errorMessage) { errorMessage.textContent = 'Usuário ou senha incorreta.'; errorMessage.classList.remove('oculto'); } } } function inicializarApp() { console.log('Inicializando sistema...'); const agendamentosSalvos = localStorage.getItem('agenda_completa_final'); const pacientesSalvos = localStorage.getItem('pacientes_dados'); const bloqueiosSalvos = localStorage.getItem('dias_bloqueados'); const feriadosDesbloqueadosSalvos = localStorage.getItem('feriados_desbloqueados'); if (agendamentosSalvos) { try { agendamentos = JSON.parse(agendamentosSalvos); } catch (erro) { agendamentos = {}; } } if (pacientesSalvos) { try { pacientes = JSON.parse(pacientesSalvos); pacientesGlobais = [...pacientes]; } catch (erro) { pacientes = []; pacientesGlobais = []; } } else { pacientesGlobais = []; } if (bloqueiosSalvos) { try { diasBloqueados = JSON.parse(bloqueiosSalvos); } catch (erro) { diasBloqueados = {}; } } if (feriadosDesbloqueadosSalvos) { try { feriadosDesbloqueados = JSON.parse(feriadosDesbloqueadosSalvos); } catch (erro) { feriadosDesbloqueados = {}; } } if (database) { database.ref('agendamentos').on('value', (snapshot) => { const data = snapshot.val(); if (data) { agendamentos = data; localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos)); atualizarCalendario(); if (dataSelecionada) exibirAgendamentos(dataSelecionada); atualizarResumoMensal(); atualizarResumoSemanal(new Date()); verificarDadosCarregados(); banco de dados.ref('dias_bloqueados').on('valor',(snapshot) => {
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

    const btnRestaurar = document.getElementById('btnRestaurar'); if (btnRestaurar) btnRestaurar.addEventListener('click', () => { const restoreFileClick = document.getElementById('restoreFile'); if (restoreFileClick) restoreFileClick.click(); }); const restoreFile = document.getElementById('restoreFile'); if (restoreFile) restoreFile.addEventListener('change', restaurarBackup); const btnDeclaracaoPaciente = document.getElementById('btnDeclaracaoPaciente'); if (btnDeclaracaoPaciente) btnDeclaracaoPaciente.addEventListener('click', gerarDeclaracaoPaciente); const btnDeclaracaoAcompanhante = document.getElementById('btnDeclaracaoAcompanhante'); if (btnDeclaracaoAcompanhante) btnDeclaracaoAcompanhante.addEventListener('click', gerarDeclaracaoAcompanhante); const btnCancelarChoice = document.getElementById('btnCancelarChoice'); if (btnCancelarChoice) btnCancelarChoice.addEventListener('click', fecharModalEscolha); const btnFecharDeclaracao = document.getElementById('btnFecharDeclaracao'); if (btnFecharDeclaracao) btnFecharDeclaracao.addEventListener('click', fecharModalAtestado); const btnImprimirDeclaracao = document.getElementById('btnImprimirDeclaracao'); if (btnImprimirDeclaracao) btnImprimirDeclaracao.addEventListener('click', imprimirDeclaracao); const btnConfirmarAcompanhante = document.getElementById('btnConfirmarAcompanhante'); if (btnConfirmarAcompanhante) btnConfirmarAcompanhante.addEventListener('click', confirmarNomeAcompanhante); const btnCancelarAcompanhante = document.getElementById('btnCancelarAcompanhante'); if (btnCancelarAcompanhante) btnCancelarAcompanhante.addEventListener('clique', fecharModalAcompanhante); const acompanhanteNomeInput = document.getElementById('acompanhanteNomeInput'); if (acompanhanteNomeInput) acompanhanteNomeInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') { confirmarNomeAcompanhante(); } }); const btnCancelarModal = document.getElementById('btnCancelarModal'); if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModalConfirmacao); const confirmButton = document.getElementById('confirmButton'); if (confirmButton) confirmButton.addEventListener('click', executarAcaoConfirmada); const btnCancelarJustificativa = document.getElementById('btnCancelarJustificativa'); if (btnCancelarJustificativa) btnCancelarJustificativa.addEventListener('click', fecharModalJustificativa); const btnConfirmarJustificativa = document.getElementById('btnConfirmarJustificativa'); if (btnConfirmarJustificativa) btnConfirmarJustificativa.addEventListener('click',salvarJustificativa);

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
    
    const btnFecharReportModalFooter = document.const btnFecharReportModalFooter = document.getElementById('btnFecharReportModalFooter'); if (btnFecharReportModalFooter) btnFecharReportModalFooter.addEventListener('click', fecharModalRelatorio); const btnPrintReport = document.getElementById('btnPrintReport'); if (btnPrintReport) btnPrintReport.addEventListener('click', () => handlePrint('printing-report')); const btnApplyFilter = document.getElementById('btnApplyFilter'); if (btnApplyFilter) btnApplyFilter.addEventListener('click', aplicarFiltroRelatorio); const btnClearFilter = document.getElementById('btnClearFilter'); if (btnClearFilter) btnClearFilter.addEventListener('click', limparFiltroRelatorio); const reportFilterType = document.getElementById('reportFilterType'); if (reportFilterType) reportFilterType.addEventListener('change', atualizarValoresFiltro); const btnVerRelatorioAnual = document.getElementById('btnVerRelatorioAnual'); if (btnVerRelatorioAnual) btnVerRelatorioAnual.addEventListener('click', () => abrirModalRelatorio(null, 'current_year')); // [ARCOSAFE-FIX] Correção do Botão OK do Modal de Backup Automático (Solução 1: Reordenação) const btnBackupModalAction = document.getElementById('btnBackupModalAction'); if (btnBackupModalAction) { btnBackupModalAction.addEventListener('click', () => { // 1. Definir variáveis ​​e gravar chave PRIMEIRO const hoje = new Date().toLocaleDateString('pt-BR'); const horarioSalvo = localStorage.getItem('backupTime') || '16:00'; const chaveBackup = `${hoje}_${horarioSalvo}`; localStorage.setItem('ultimoBackupChave', chaveBackup); // 2. Iniciar o download fazerBackup() // 3. Fechar o modal (agora a validação vai passar) fecharModalBackup(); } // [ARCOSAFE-NEW] Ouvinte do Relatório Mensal const btnGerarRelatorioMensal = document.getElementById('btnGerarRelatorioMensal'); if (btnGerarRelatorioMensal) { btnGerarRelatorioMensal.addEventListener('click', gerarRelatorioMensal); // [ARCOSAFE-UX] Preenchimento automático do mês atual const reportMonthInput = document.getElementById('reportMonthInput'); if (reportMonthInput) { const now = new Date(); const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, '0'); reportMonthInput.value = `${year}-${month}`; } } } function configurarVagasEventListeners() { const btnProcurarVagas = document.getElementById('btnProcurarVagas'); if (btnProcurarVagas) btnProcurarVagas.addEventListener('click', procurarVagas); const btnClearVagasSearch = document.const btnClearVagasSearch = document.getElementById('btnClearVagasSearch'); if (btnClearVagasSearch) btnClearVagasSearch.addEventListener('click', limparBuscaVagas); const btnPrintVagas = document.getElementById('btnPrintVagas'); if (btnPrintVagas) btnPrintVagas.addEventListener('click', imprimirVagas); const startDateInput = document.getElementById('vagasStartDate'); const endDateInput = document.getElementById('vagasEndDate'); if (startDateInput && endDateInput) { startDateInput.addEventListener('keydown', (event) => { if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); endDateInput.focus(); } }); startDateInput.addEventListener('input', () => { const val = startDateInput.value; if (val) { const year = parseInt(val.split('-')[0], 10); if (year > 999) { endDateInput.focus(); } } }); } } // ======================================== // 4. FUNÇÕES DO SISTEMA (CALENDÁRIO, VAGAS, ETC.) // =========================================== function verificarDadosCarregados() { indicador const = document.getElementById('dataLoadedIndicator'); const indicadorText = document.getElementById('indicatorText'); if (indicador && indicadorTexto) { const temPacientes = pacientesGlobais.length > 0; const temAgendamentos = Object.keys(agendamentos).length > 0; if (temPacientes || temAgendamentos) { indicador.classList.remove('not-loaded'); indicador.classList.add('carregado'); IndicatorText.textContent = "Dados Carregados"; } else {indicador.classList.remove('carregado'); indicador.classList.add('não carregado'); indicadorText.textContent = "Sem Dados Carregados"; } } } function salvarAgendamentos() { try { if (banco de dados) { banco de dados.ref('agendamentos').set(agendamentos); } localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos)); retornar verdadeiro; } catch (error) { console.error('Erro ao salvar agendamentos:', erro); retornar falso; } } function salvarBloqueios() { try { if (banco de dados) { banco de dados.ref('dias_bloqueados').set(diasBloqueados); } localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados)); retornar verdadeiro; } catch (error) { console.error('Erro ao salvar bloqueios:', erro); retornar falso; } } function salvarFeriadosDesbloqueados() { try { if (banco de dados) { banco de dados.ref('feriados_desbloqueados').set(feriadosDesbloqueados);
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
                    diasBloqueados[dataCompleta] = { diaInteiro: true, motivo: feriado, isHoliday:true };
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
    const targetPrefix = `${ano}-${String(mes + 1).padStart(2,'0')}`;

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
    const totalHoje = (agendamentosDia.manha?.length || 0) + (agendamentosDia.tarde?.comprimento || 0); // [ARCOSAFE-UX] Construção do Dashboard Grid Expandido (4 Colunas) // [ARCOSAFE-FIX] Removido o Card de Status da Base de Dados (Artefato Visual) container.innerHTML = ` <div class="appointment-header"> <h2 class="appointment-title">${dataFmt}</h2> <div class="header-actions"> <button id="btnPrint" class="btn btn-secondary btn-sm" aria-label="Imprimir agenda do dia"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer-fill" viewBox="0 0 16 16"> <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2z"/> <caminho d="M11 6.5a.5.5 0 0 1-1 0V3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3z"/> <caminho d="M2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/> </svg> <span>Imprimir</span> </button> <button id="btnLockDay" class="btn-icon btn-lock" title="Bloquear Agenda" aria-label="Bloquear agenda do dia"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock-fill" viewBox="0 0 16 16"> <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/> </svg> </button> </div> </div> <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top:nenhum;"> <div class="card-content"> <div class="dashboard-stats-grid"> <div class="stats-card-mini"> <h4> <span>Hoje</span> <i class="bi bi-calendar-event"></i> </h4> <div class="stats-value-big val-neutral">${totalHoje}</div> <div class="stats-meta">Pacientes Agendados</div> </div> <div class="stats-card-mini"> <h4> <span>Ocupação Mensal</span> <i class="bi bi-graph-up"></i> </h4> <div class="stats-value-big val-primary">${metrics.percentage}%</div> <div class="stats-meta">${metrics.occupiedCount} / ${metrics.capacityTotal} Vagas</div> </div> <div class="stats-card-mini"> <h4> <span>Abstenções (Mês)</span> <i class="bi bi-x-circle" style="color: var(--color-danger);"></i> </h4> <div class="stats-value-big val-danger">${metrics.abstencaoCount}</div> <div class="stats-meta">${metrics.abstencaoPercent}% dos Agendados</div> </div> <div class="stats-card-mini"> <h4> <span>Atendimentos (Mês)</span> <i class="bi bi-check-circle" style="color: var(--color-success);"></i> </h4> <div class="stats-value-big val-success">${metrics.atendimentoCount}</div> <div class="stats-meta">${metrics.atendimentoPercent}% dos Agendados</div> </div> </div> <div class="tabs"> <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'ativo' : ''}" onclick="mostrarTurno('manha')">Manhã</button> <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'ativo':''}" onclick="mostrarTurno('tarde')">Tarde</button>
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

    // [ARCOSAFE-UI] Listeners para os botões estilo "Dia Todo" nos turnos parciais
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

function gerarVagasTurno(agendamentosTurno, turno,data) {
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
                    <button class="btn btn-sm btn-status ${status === 'Compareceu' ? 'active' :''}" data-status="Compareceu" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Compareceu')">
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
                        <button class="btn btn-danger btn-cancel-appointment" onclick="abrirModalConfirmacao('Deseja realmente cancelar este agendamento?',() => executarCancelamento('${data}', '${turno}', ${i}))">Cancelar</button>
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
                                <input type="text" name="cns" required class="form-input" maxlength="17" pattern="[0-9]{1,17}" title="O CNS deve conter até 17 dígitos." value="${dadosPreenchimento.cns || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}','${turno}', ${i})"> <div class="sugestoes-lista"></div> </div> <div class="form-group"> <label>Distrito:</label> <input type="text" name="distrito" class="form-input" maxlength="21" value="${dadosPreenchimento.distrito || ''}"> </div> </div> <div class="form-row"> <div class="form-group autocomplete-container"> <label>Téc. Ref.:</label> <input type="text" name="tecRef" class="form-input" maxlength="50" value="${dadosPreenchimento.tecRef || ''}"> <div class="sugestoes-lista"></div> </div> <div class="form-group"> <label>CID:</label> <input type="text" name="cid" class="form-input" maxlength="12" style="text-transform: uppercase;" value="${dadosPreenchimento.cid || ''}"> </div> </div> <div class="form-group full-width solicitações-group"> <label>Solicitações:</label> <div class="checkbox-grid"> <div class="checkbox-item"> <input type="checkbox" name="solicitacao" value="Passe Livre Municipal" id="pl_municipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Municipal') ? 'checked' : ''}> <label for="pl_municipal_${uniqueIdPrefix}">Passe Livre Municipal</label> </div> <div class="checkbox-item"> <input type="checkbox" name="solicitacao" value="Passe Livre Intermunicipal" id="pl_intermunicipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Intermunicipal') ? 'verificado':''}>
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

function mostrarNotificacao(mensagem, tipo = 'info') {
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

function parseHtmlToPacientes(htmlContent) {
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

function mergePacientes(existentes, novos) {
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

function handleHtmlFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
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
        containerResultados.innerHTML = ` <div class="search-results-header"> <h4>Nenhum agendamento encontrado</h4> <button class="btn-icon btn-clear-search" onclick="limparBuscaGlobal()" aria-label="Limpar busca" title="Limpar Busca"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L7.293 8z"/></svg> </button> </div> <p class="search-feedback">Nenhum agendamento encontrado para este paciente.</p> `; } } function limparBuscaGlobal() { const input = document.getElementById('globalSearchInput'); if (input) input.value = ''; const container = document.getElementById('searchResultsContainer'); if (container) container.innerHTML = ''; } function pularParaAgendamento(data) { const dataObj = new Date(data + 'T12:00:00'); mesAtual = dataObj.getMonth(); anoAtual = dataObj.getFullYear(); atualizarCalendario(); setTimeout(() => { const diaEl = document.querySelector(`.day[data-date="${data}"]`); if (diaEl) { selecionarDia(data, diaEl); diaEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 100); } function pularParaCard(data, turno, vaga) { pularParaAgendamento(data); mostrarTurno(turno); setTimeout(() => { const cardId = `card-${data}-${turno}-${vaga}`; const cardElement = document.getElementById(cardId); if (cardElement) { cardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); cardElement.classList.add('highlight-card'); setTimeout(() => cardElement.classList.remove('highlight-card'), 1500); } }, 250); } function pularParaVagaLivre(data, turno) { pularParaAgendamento(data); mostrarTurno(turno); setTimeout(() => { const turnContainer = document.getElementById(`turno-${turno}`); if (!turnoContainer) return; const primeiroCardLivre = turnContainer.querySelector('.vaga-card:not(.ocupada)'); if (primeiroCardLivre) { primeiroCardLivre.scrollIntoView({ comportamento: 'smooth', bloco: 'centro', inline: 'mais próximo' }); primeiroCardLivre.classList.add('highlight-card'); setTimeout(() => primeiroCardLivre.classList.remove('highlight-card'), 1500);querySelector('input[name="numero"]'); if (inputNumero) inputNumero.focus(); } }, 250); } function configurarBuscaGlobalAutocomplete() { const input = document.getElementById('globalSearchInput'); const suggestoesContainer = document.getElementById('globalSugestoesLista'); if (!input || !sugestoesContainer) return; input.addEventListener('input', () => { const termo = input.value.toLowerCase(); if (termo.length < 2) { sugestoesContainer.innerHTML = ''; sugestoesContainer.style.display = 'none'; return; } const sugestoesFiltradas = pacientesGlobais .filter(p => p.nome.toLowerCase().includes(termo) || p.numero.includes(termo)) .slice(0, 10); if (sugestoesFiltradas.length > 0) { sugestoesContainer.innerHTML = sugestoesFiltradas.map(p => `<div class="sugestao-item" data-value="${p.nome}"> <strong>${p.nome}</strong><br> <small>Nº: ${p.numero}</small> </div>` ).join(''); sugestoesContainer.style.display = 'block'; } else { sugestoesContainer.style.display = 'none'; } }); sugestoesContainer.addEventListener('mousedown', (e) => { const item = e.target.closest('.sugestao-item'); if (item) { e.preventDefault(); input.value = item.dataset.value; sugestoesContainer.innerHTML = ''; sugestoesContainer.style.display = 'none'; buscarAgendamentosGlobais(); } }); document.addEventListener('click', (e) => { if (!input.contains(e.target) && !sugestoesContainer.contains(e.target)) { sugestoesContainer.style.display = 'none'; } }); } // --- Funções de Declaração e Atestado --- function iniciarProcessoDeclaracao(data, turn, vaga) { const agendamentosDia = agendamentos[data]; if (!agendamentosDia || !agendamentosDia[turno]) return; const agendamento = agendamentosDia[turno].find(ag => ag.vaga === vaga); if (!agendamento) retornar; atestadoEmGeracao = { ...agendamento, dados, turno }; const escolhaModal = document.getElementById('choiceModal'); if (choiceModal) choiceModal.style.display = 'flex'; } function fecharModalEscolha() { const choiceModal = document.getElementById('choiceModal'); if (choiceModal) choiceModal.style.display = 'none'; atestadoEmGeracao = null; } function gerarDeclaracaoPaciente() { if (!atestadoEmGeracao) return; const { nome, cns, data, turno } = atestadoEmGeracao; const dataObj = new Date(data + 'T12:00:00');
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const turnoFormatado = turno === 'manha' ? 'manhã' : 'tarde';

    const conteudoAtestado = `
        <h4>DECLARAÇÃO DE COMPARECIMENTO</h4>
        <p>Declaramos, para os devidos fins, que o(a) paciente <strong>${nome.toUpperCase()}</strong>, CNS <strong>${cns}</strong>, esteve presente nesta unidade, CAPS ia Liberdade, no período da ${turnoFormatado}, participando de atividades relacionadas ao seu Projeto Terapêutico Singular.</p>
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

function limparEstadoImpressao() {
    document.body.classList.remove
