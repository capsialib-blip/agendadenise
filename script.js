/* script.js - VERSÃO FINAL (CONFIRMAÇÃO FUNCIONAL) */
'use strict';

// --- CONFIGURAÇÃO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8EZZr3WE5RQCZ9he_qZ2vnXnftvX3jTc",
    authDomain: "agenda-dra-denise.firebaseapp.com",
    databaseURL: "https://agenda-dra-denise-default-rtdb.firebaseio.com",
    projectId: "agenda-dra-denise",
    storageBucket: "agenda-dra-denise.firebasestorage.app",
    messagingSenderId: "475597506458",
    appId: "1:475597506458:web:12caaac6f6d31c56979c23"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- VARIÁVEIS GLOBAIS ---
const VAGAS_POR_TURNO = 8;
const MAX_DAYS_SEARCH = 10;
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho','Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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
let pacientesGlobais = (typeof pacientesDefault !== 'undefined') ? pacientesDefault : [];
let turnoAtivo = 'manha';
let slotEmEdicao = null;
let justificativaEmEdicao = null;
let modalBackupAberto = false;
let reportCurrentStatus = null; 
let reportUnfilteredResults = []; 
let atestadoEmGeracao = null;
let confirmAction = null; // AQUI ESTÁ O SEGREDO: Variável Global de Ação
let tentativaSenha = 1;
let vagasResultadosAtuais = []; 

// --- INICIALIZAÇÃO ---
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
        loginSenhaInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') tentarLogin(); });
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
        if (errorMessage) { errorMessage.textContent = 'Senha incorreta.'; errorMessage.classList.remove('hidden'); }
    }
}

function inicializarApp() {
    console.log('App Iniciado...');
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    
    configurarEventListenersApp();
    configurarHorarioBackup();
    configurarBuscaGlobalAutocomplete();
    configurarVagasEventListeners();
    configurarAutocompleteAssinatura();
    
    const dbRef = ref(db);
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        agendamentos = data.agendamentos || {};
        diasBloqueados = data.dias_bloqueados || {};
        feriadosDesbloqueados = data.feriados_desbloqueados || {};
        if (data.pacientes_dados) pacientesGlobais = data.pacientes_dados;
        else if (typeof pacientesDefault !== 'undefined' && pacientesGlobais.length === 0) {
             pacientesGlobais = pacientesDefault; salvarPacientesNoCloud();
        }
        atualizarCalendario(); atualizarResumoMensal(); atualizarResumoSemanal(new Date()); verificarDadosCarregados();
        if (dataSelecionada) { exibirAgendamentos(dataSelecionada); atualizarBolinhasDisponibilidade(dataSelecionada); }
    });
    setInterval(verificarNecessidadeBackup, 30000);
}

// --- FUNÇÕES DE NUVEM ---
function salvarAgendamentos() { set(ref(db, 'agendamentos'), agendamentos).catch(e => mostrarNotificacao('Erro ao salvar!', 'danger')); }
function salvarBloqueios() { set(ref(db, 'dias_bloqueados'), diasBloqueados); }
function salvarFeriadosDesbloqueados() { set(ref(db, 'feriados_desbloqueados'), feriadosDesbloqueados); }
function salvarPacientesNoCloud() { set(ref(db, 'pacientes_dados'), pacientesGlobais); }
function salvarPacientesNoLocalStorage() { salvarPacientesNoCloud(); return true; }

// ============================================
// MODAL DE CONFIRMAÇÃO (CORRIGIDO)
// ============================================
function abrirModalConfirmacao(msg, acao) { 
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    if(!modal || !msgEl) return;
    
    msgEl.textContent = msg;
    confirmAction = acao; // Armazena a ação na variável global
    modal.style.display = 'flex';
}

function fecharModalConfirmacao() { 
    document.getElementById('confirmModal').style.display = 'none';
    confirmAction = null; // Limpa a ação
}

function executarAcaoConfirmada() {
    if (typeof confirmAction === 'function') {
        confirmAction(); // Executa o que foi guardado
    }
    fecharModalConfirmacao();
}

// ============================================
// CONFIGURAÇÃO DE LISTENERS
// ============================================
function configurarEventListenersApp() {
    const btnHoje = document.getElementById('btnHoje');
    if (btnHoje) btnHoje.addEventListener('click', goToToday);
    document.getElementById('btnMesAnterior')?.addEventListener('click', voltarMes);
    document.getElementById('btnProximoMes')?.addEventListener('click', avancarMes);
    
    document.getElementById('btnImportar')?.addEventListener('click', () => document.getElementById('htmlFile').click());
    document.getElementById('htmlFile')?.addEventListener('change', handleHtmlFile);
    document.getElementById('btnLimparDados')?.addEventListener('click', abrirModalLimpeza);
    document.getElementById('btnBackup')?.addEventListener('click', fazerBackup);
    document.getElementById('btnRestaurar')?.addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile')?.addEventListener('change', restaurarBackup);
    
    document.getElementById('btnDeclaracaoPaciente')?.addEventListener('click', gerarDeclaracaoPaciente);
    document.getElementById('btnDeclaracaoAcompanhante')?.addEventListener('click', gerarDeclaracaoAcompanhante);
    document.getElementById('btnCancelarChoice')?.addEventListener('click', fecharModalEscolha);
    document.getElementById('btnFecharDeclaracao')?.addEventListener('click', fecharModalAtestado);
    document.getElementById('btnImprimirDeclaracao')?.addEventListener('click', imprimirDeclaracao);
    document.getElementById('btnConfirmarAcompanhante')?.addEventListener('click', confirmarNomeAcompanhante);
    document.getElementById('btnCancelarAcompanhante')?.addEventListener('click', fecharModalAcompanhante);
    document.getElementById('acompanhanteNomeInput')?.addEventListener('keyup', (e) => { if(e.key==='Enter') confirmarNomeAcompanhante(); });

    // CONFIRMAÇÃO: Listener fixo que chama a função que executa a variável global
    document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModalConfirmacao);
    const btnConfirm = document.getElementById('confirmButton');
    // Remove listeners antigos para evitar duplicação e adiciona o novo
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
    newBtnConfirm.addEventListener('click', executarAcaoConfirmada);
    
    document.getElementById('btnCancelClearData')?.addEventListener('click', fecharModalLimpeza);
    document.getElementById('btnConfirmClearData')?.addEventListener('click', executarLimpezaTotal);
    document.getElementById('togglePassword')?.addEventListener('click', togglePasswordVisibility);

    document.getElementById('btnCancelarJustificativa')?.addEventListener('click', fecharModalJustificativa);
    document.getElementById('btnConfirmarJustificativa')?.addEventListener('click', salvarJustificativa);
    document.getElementById('btnCancelarBloqueio')?.addEventListener('click', fecharModalBloqueio);
    document.getElementById('btnConfirmarBloqueio')?.addEventListener('click', confirmarBloqueio);
    
    document.getElementById('globalSearchButton')?.addEventListener('click', buscarAgendamentosGlobais);
    document.getElementById('globalSearchInput')?.addEventListener('keyup', (e) => { if(e.key==='Enter') buscarAgendamentosGlobais(); });

    document.getElementById('btnFecharReportModal')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnFecharReportModalFooter')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnPrintReport')?.addEventListener('click', () => handlePrint('printing-report'));
    document.getElementById('btnApplyFilter')?.addEventListener('click', aplicarFiltroRelatorio);
    document.getElementById('btnClearFilter')?.addEventListener('click', limparFiltroRelatorio);
    document.getElementById('reportFilterType')?.addEventListener('change', atualizarValoresFiltro);
    document.getElementById('btnVerRelatorioAnual')?.addEventListener('click', () => abrirModalRelatorio(null, 'current_year'));
    document.getElementById('btnBackupModalAction')?.addEventListener('click', () => { fazerBackup(); fecharModalBackup(); });
    
    const justificationRadios = document.querySelectorAll('input[name="justificativaTipo"]');
    justificationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const container = document.getElementById('reagendamentoDataContainer');
            if (container) container.style.display = e.target.value === 'Reagendado' ? 'block' : 'none';
        });
    });
}

function configurarVagasEventListeners() {
    document.getElementById('btnProcurarVagas')?.addEventListener('click', procurarVagas);
    document.getElementById('btnClearVagasSearch')?.addEventListener('click', limparBuscaVagas);
    document.getElementById('btnPrintVagas')?.addEventListener('click', imprimirVagas);
    const startDate = document.getElementById('vagasStartDate');
    const endDate = document.getElementById('vagasEndDate');
    if (startDate && endDate) {
        startDate.addEventListener('keydown', (e) => { if(e.key==='Tab' && !e.shiftKey) { e.preventDefault(); endDate.focus(); } });
        startDate.addEventListener('input', () => { if(startDate.value && parseInt(startDate.value.split('-')[0]) > 999) endDate.focus(); });
    }
}

// ============================================
// FUNÇÕES DE SUPORTE
// ============================================
function verificarDadosCarregados() {
    const indicator = document.getElementById('dataLoadedIndicator');
    const indicatorText = document.getElementById('indicatorText');
    if (indicator && indicatorText) {
        const temPacientes = pacientesGlobais.length > 0;
        const temAgendamentos = Object.keys(agendamentos).length > 0;
        if (temPacientes || temAgendamentos) {
            indicator.classList.remove('not-loaded'); indicator.classList.add('loaded'); indicatorText.textContent = "Online";
        } else {
            indicator.classList.remove('loaded'); indicator.classList.add('not-loaded'); indicatorText.textContent = "Conectado";
        }
    }
}

function voltarMes() { if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else { mesAtual--; } atualizarCalendario(); atualizarResumoMensal(); atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1)); }
function avancarMes() { if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else { mesAtual++; } atualizarCalendario(); atualizarResumoMensal(); atualizarResumoSemanal(new Date(anoAtual, mesAtual, 1)); }

function getFeriados(ano) {
    function cp(a) { const b=Math.floor(a/100),c=a%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*(a%19)+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor(((a%19)+11*h+22*l)/451),n=Math.floor((h+l-7*m+114)/31),o=((h+l-7*m+114)%31)+1; return new Date(a,n-1,o); }
    const pascoa=cp(ano), umDia=86400000, feriados=new Map();
    const fixos=[{m:1,d:1,n:"Confraternização"},{m:4,d:21,n:"Tiradentes"},{m:5,d:1,n:"Trabalho"},{m:9,d:7,n:"Independência"},{m:10,d:12,n:"N.S. Aparecida"},{m:11,d:2,n:"Finados"},{m:11,d:15,n:"Proclamação"},{m:12,d:25,n:"Natal"}];
    fixos.forEach(f=>feriados.set(`${ano}-${String(f.m).padStart(2,'0')}-${String(f.d).padStart(2,'0')}`,f.n));
    [{d:new Date(pascoa.getTime()-47*umDia),n:"Carnaval"},{d:new Date(pascoa.getTime()-2*umDia),n:"Sexta Santa"},{d:new Date(pascoa.getTime()+60*umDia),n:"Corpus Christi"}].forEach(f=>feriados.set(f.d.toISOString().split('T')[0],f.n));
    return feriados;
}

function atualizarCalendario() {
    const container = document.getElementById('calendarContainer');
    const mesAnoEl = document.getElementById('mesAno');
    if (!container || !mesAnoEl) return;
    try {
        mesAnoEl.textContent = `${meses[mesAtual]} ${anoAtual}`; container.innerHTML = '';
        const feriadosDoAno = getFeriados(anoAtual);
        const calendarGrid = document.createElement('div'); calendarGrid.className = 'calendar-grid';
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(dia => { const weekdayEl = document.createElement('div'); weekdayEl.className = 'weekday'; weekdayEl.textContent = dia; calendarGrid.appendChild(weekdayEl); });
        const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay(); const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate(); const hoje = new Date(); const dataHojeFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        for (let i = 0; i < primeiroDia; i++) { calendarGrid.appendChild(document.createElement('div')); }
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataCompleta = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const diaSemana = new Date(dataCompleta + "T00:00:00").getDay();
            const diaEl = document.createElement('div'); diaEl.className = 'day'; diaEl.textContent = dia; diaEl.setAttribute('data-date', dataCompleta);
            const feriado = feriadosDoAno.get(dataCompleta);
            if (feriado && !feriadosDesbloqueados[dataCompleta]) { diaEl.classList.add('day-holiday'); diaEl.title = feriado; if (!diasBloqueados[dataCompleta] || !diasBloqueados[dataCompleta].manual) { diasBloqueados[dataCompleta] = { diaInteiro: true, motivo: feriado, isHoliday: true }; } }
            const bloqueio = diasBloqueados[dataCompleta]; let totalmenteBloqueado = false;
            if (bloqueio) { if (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde)) { diaEl.classList.add('blocked-day'); totalmenteBloqueado = true; } else { if (bloqueio.manha) diaEl.classList.add('blocked-morning'); if (bloqueio.tarde) diaEl.classList.add('blocked-afternoon'); } }
            if (diaSemana === 0 || diaSemana === 6) { diaEl.classList.add('weekend'); } else { diaEl.classList.add('workday'); diaEl.onclick = (event) => { event.preventDefault(); event.stopPropagation(); selecionarDia(dataCompleta, diaEl); }; const temAgendamentos = agendamentos[dataCompleta] && ( (agendamentos[dataCompleta].manha && agendamentos[dataCompleta].manha.length > 0) || (agendamentos[dataCompleta].tarde && agendamentos[dataCompleta].tarde.length > 0) ); if(temAgendamentos && !totalmenteBloqueado) diaEl.classList.add('day-has-appointments'); }
            if (dataCompleta === dataHojeFormatada) diaEl.classList.add('today'); if (dataCompleta === dataSelecionada) diaEl.classList.add('selected'); calendarGrid.appendChild(diaEl);
        }
        container.appendChild(calendarGrid);
    } catch (error) { console.error(error); container.innerHTML = '<p>Erro.</p>'; }
}

function selecionarDia(data, elemento) {
    slotEmEdicao = null; const diaSelecionadoAnterior = document.querySelector('.day.selected'); if(diaSelecionadoAnterior) diaSelecionadoAnterior.classList.remove('selected'); if(elemento) elemento.classList.add('selected'); dataSelecionada = data; exibirAgendamentos(data); atualizarBolinhasDisponibilidade(data); atualizarResumoSemanal(new Date(data + 'T12:00:00'));
    const hint = document.getElementById('floatingDateHint'); if (hint) { const dataObj = new Date(data + 'T12:00:00'); let dataTexto = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); dataTexto = dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1); hint.textContent = dataTexto; hint.classList.add('visible'); }
}

function goToToday() {
    const hoje = new Date(); mesAtual = hoje.getMonth(); anoAtual = hoje.getFullYear(); const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`; atualizarCalendario(); atualizarResumoMensal(); atualizarResumoSemanal(hoje); const diaEl = document.querySelector(`.day[data-date="${dataFormatada}"]`); if (diaEl && !diaEl.classList.contains('weekend')) { selecionarDia(dataFormatada, diaEl); } else { dataSelecionada = null; document.getElementById('appointmentsContainer').innerHTML = criarEmptyState(); esconderBolinhasDisponibilidade(); document.getElementById('floatingDateHint')?.classList.remove('visible'); }
}

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer'); if (!container) return; 
    const dataObj = new Date(data + 'T12:00:00'); let dataFmt = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); dataFmt = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);
    const bloqueio = diasBloqueados[data];

    if (bloqueio && (bloqueio.diaInteiro || (bloqueio.manha && bloqueio.tarde))) {
        container.innerHTML = criarBlockedState(dataFmt, bloqueio.motivo);
        document.getElementById('btnLockDay')?.addEventListener('click', () => gerenciarBloqueioDia(data));
        return;
    }

    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    let statsDiarios = { compareceu: 0, faltou: 0, justificou: 0 };
    [...(agendamentosDia.manha || []), ...(agendamentosDia.tarde || [])].forEach(ag => { if (ag.status === 'Compareceu') statsDiarios.compareceu++; else if (ag.status === 'Faltou') statsDiarios.faltou++; else if (ag.status === 'Justificou') statsDiarios.justificou++; });

    let statsHTML = (statsDiarios.compareceu > 0 || statsDiarios.faltou > 0 || statsDiarios.justificou > 0) ? `<p><strong>Compareceram:</strong> ${statsDiarios.compareceu}</p><p><strong>Faltaram:</strong> ${statsDiarios.faltou}</p><p><strong>Justificaram:</strong> ${statsDiarios.justificou}</p>` : '';

    container.innerHTML = `
        <div class="appointment-header"><h2 class="appointment-title">${dataFmt}</h2><div class="header-actions"><button id="btnPrint" class="btn btn-secondary btn-sm">Imprimir</button><button id="btnLockDay" class="btn-icon btn-lock" title="Bloquear Agenda"><i class="bi bi-lock-fill"></i></button></div></div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;"><div class="card-content"><div class="stats"><h4>Resumo de Ocupação:</h4><p>Manhã: ${agendamentosDia.manha?.length || 0} de ${VAGAS_POR_TURNO} preenchidas</p><p>Tarde: ${agendamentosDia.tarde?.length || 0} de ${VAGAS_POR_TURNO} preenchidas</p>${statsHTML}</div><div class="tabs"><button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="window.mostrarTurno('manha')">Manhã</button><button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="window.mostrarTurno('tarde')">Tarde</button></div><div id="turno-manha" class="turno-content ${turnoAtivo === 'manha' ? 'active' : ''}">${bloqueio?.manha ? criarBlockedTurnoState('Manhã', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(agendamentosDia.manha, 'manha', data)}</div><div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">${bloqueio?.tarde ? criarBlockedTurnoState('Tarde', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(agendamentosDia.tarde, 'tarde', data)}</div></div></div>`;

    document.getElementById('btnPrint')?.addEventListener('click', () => imprimirAgendaDiaria(data));
    document.getElementById('btnLockDay')?.addEventListener('click', () => gerenciarBloqueioDia(data));
    setTimeout(() => { document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento); document.querySelectorAll('input[name="agendadoPor"]').forEach(input => { input.addEventListener('blur', (event) => { const codeMap = { '01': 'Alessandra', '02': 'Nicole' }; if (codeMap[event.target.value.trim()]) event.target.value = codeMap[event.target.value.trim()]; }); }); }, 0);
}

// Helpers exportados
window.mostrarTurno = function(turno) { turnoAtivo = turno; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.querySelector(`.tab-btn.${turno}`)?.classList.add('active'); document.querySelectorAll('.turno-content').forEach(c => c.classList.remove('active')); document.getElementById(`turno-${turno}`)?.classList.add('active'); };
window.cancelarEdicao = function() { slotEmEdicao = null; exibirAgendamentos(dataSelecionada); };
window.limparFormulario = function(btn) { const form = btn.closest('form'); if(form) { form.reset(); form.querySelector('[name="numero"]')?.focus(); } };
window.pularParaAgendamento = pularParaAgendamento;
window.pularParaCard = pularParaCard;
window.pularParaVagaLivre = pularParaVagaLivre;
window.iniciarEdicao = iniciarEdicao;
window.iniciarProcessoDeclaracao = iniciarProcessoDeclaracao;
window.abrirModalConfirmacao = abrirModalConfirmacao; // Exportado
window.executarCancelamento = executarCancelamento;
window.marcarStatus = marcarStatus;
window.agendarPaciente = agendarPaciente;
window.verificarDuplicidadeAoDigitar = verificarDuplicidadeAoDigitar;

function gerarVagasTurno(agendamentosTurno, turno, data) {
    let html = '<div class="vagas-grid">';
    agendamentosTurno = agendamentosTurno || [];
    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = agendamentosTurno.find(a => a.vaga === i);
        const estaEditando = slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === i;
        const dados = estaEditando ? agendamento : {};
        const status = agendamento?.status || 'Aguardando';
        const cardId = `card-${data}-${turno}-${i}`;

        html += `<div id="${cardId}" class="vaga-card ${agendamento ? 'ocupada' : ''} ${estaEditando ? 'editing' : ''} status-${status.toLowerCase()} ${agendamento?.primeiraConsulta ? 'primeira-consulta' : ''}">
                <div class="vaga-header ${turno}"><div>Vaga ${i} - ${agendamento && !estaEditando ? 'Ocupada' : 'Disponível'}</div>${agendamento && !estaEditando ? `<span class="status-tag status-${status.toLowerCase()}">${status}</span>` : ''}</div>
                <div class="vaga-content">`;

        if (agendamento && !estaEditando) {
             const justHTML = (agendamento.status === 'Justificou' && agendamento.justificativa) ? `<div class="justificativa-display"><p><strong>Justif.:</strong> ${agendamento.justificativa.tipo}</p></div>` : '';
             html += `<div class="agendamento-info"><h4>${agendamento.nome}</h4><p>Nº ${agendamento.numero}</p><p>CNS: ${agendamento.cns}</p>${justHTML}
                <div class="status-buttons-container">
                    <button class="btn btn-sm btn-status ${status==='Compareceu'?'active':''}" onclick="window.marcarStatus('${data}','${turno}',${i},'Compareceu')">Compareceu</button>
                    <button class="btn btn-sm btn-status ${status==='Faltou'?'active':''}" onclick="window.marcarStatus('${data}','${turno}',${i},'Faltou')">Faltou</button>
                    <button class="btn btn-sm btn-status ${status==='Justificou'?'active':''}" onclick="window.marcarStatus('${data}','${turno}',${i},'Justificou')">Justificou</button>
                </div>
                <div class="agendamento-acoes">
                    <button class="btn btn-edit" onclick="iniciarEdicao('${data}', '${turno}', ${i})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}', '${turno}', ${i})">Declar.</button>
                    <button class="btn btn-danger" onclick="abrirModalConfirmacao('Cancelar?', () => executarCancelamento('${data}', '${turno}', ${i}))">X</button>
                </div></div>`;
        } else {
            html += `<form class="vaga-form" onsubmit="window.agendarPaciente(event, '${data}', '${turno}', ${i})">
                <div class="form-content-wrapper">
                    <div class="form-group-checkbox-single">
                        <input type="checkbox" name="primeiraConsulta" ${dados.primeiraConsulta?'checked':''}> <label>1ª Consulta</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group numero autocomplete-container">
                            <label>Nº</label>
                            <input type="text" name="numero" required class="form-input" value="${dados.numero||''}" onblur="window.verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})">
                            <div class="sugestoes-lista"></div>
                        </div>
                        <div class="form-group nome autocomplete-container">
                            <label>Nome</label>
                            <input type="text" name="nome" required class="form-input" value="${dados.nome||''}">
                            <div class="sugestoes-lista"></div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group autocomplete-container">
                            <label>CNS</label>
                            <input type="text" name="cns" required class="form-input" value="${dados.cns||''}">
                            <div class="sugestoes-lista"></div>
                        </div>
                        <div class="form-group">
                            <label>Distrito</label>
                            <input type="text" name="distrito" class="form-input" value="${dados.distrito||''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group autocomplete-container">
                            <label>Téc. Ref.</label>
                            <input type="text" name="tecRef" class="form-input" value="${dados.tecRef||''}">
                            <div class="sugestoes-lista"></div>
                        </div>
                        <div class="form-group">
                            <label>CID</label>
                            <input type="text" name="cid" class="form-input" value="${dados.cid||''}">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Obs</label>
                        <textarea name="observacao" class="form-input" rows="2">${dados.observacao||''}</textarea>
                    </div>
                </div>
                <div class="form-actions-wrapper">
                    <div class="form-group agendado-por">
                        <label>Por:</label>
                        <input type="text" name="agendadoPor" class="form-input" value="${dados.agendadoPor||''}">
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="btn btn-success">Salvar</button>
                        ${!estaEditando ? 
                            `<button type="button" class="btn btn-secondary" onclick="window.limparFormulario(this)">Limpar</button>` : 
                            `<button type="button" class="btn btn-secondary" onclick="window.cancelarEdicao()">Cancelar</button>`
                        }
                    </div>
                </div>
            </form>`;
        }
        html += '</div></div>';
    }
    return html + '</div>';
}

function criarBlockedState(fmt, motivo) { return `<div class="appointment-header"><h2>${fmt}</h2><button id="btnLockDay" class="btn-icon"><i class="bi bi-unlock-fill"></i></button></div><div class="glass-card"><div class="blocked-state"><h3>Bloqueado</h3><p>${motivo}</p></div></div>`; }
function criarBlockedTurnoState(turno, motivo) { return `<div class="blocked-state turno"><h4>${turno} Bloqueado</h4><p>${motivo}</p></div>`; }
function criarEmptyState() { return `<div class="glass-card empty-state-card"><div class="empty-state"><h3>Selecione uma Data</h3></div></div>`; }

function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault(); const form = event.target;
    const novoAgendamento = {
        vaga, numero: form.querySelector('[name="numero"]').value.trim(), nome: form.querySelector('[name="nome"]').value.trim(),
        cns: form.querySelector('[name="cns"]').value.trim(), distrito: form.querySelector('[name="distrito"]').value.trim(),
        tecRef: form.querySelector('[name="tecRef"]').value.trim(), cid: form.querySelector('[name="cid"]').value.trim().toUpperCase(),
        agendadoPor: form.querySelector('[name="agendadoPor"]').value.trim(), observacao: form.querySelector('[name="observacao"]').value.trim(),
        primeiraConsulta: form.querySelector('[name="primeiraConsulta"]').checked, solicitacoes: [], status: 'Aguardando'
    };
    if (!agendamentos[data]) agendamentos[data] = {};
    if (!agendamentos[data][turno]) agendamentos[data][turno] = [];
    const idx = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    if (idx !== -1) agendamentos[data][turno][idx] = {...agendamentos[data][turno][idx], ...novoAgendamento};
    else agendamentos[data][turno].push(novoAgendamento);
    salvarAgendamentos(); slotEmEdicao = null; mostrarNotificacao('Salvo!', 'success');
}

function iniciarEdicao(data, turno, vaga) { slotEmEdicao = { data, turno, vaga }; exibirAgendamentos(data); }
function executarCancelamento(data, turno, vaga) {
    const idx = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    if (idx !== -1) {
        agendamentos[data][turno].splice(idx, 1);
        if (agendamentos[data][turno].length === 0) delete agendamentos[data][turno];
        salvarAgendamentos(); mostrarNotificacao('Cancelado!', 'info');
    }
    fecharModalConfirmacao();
}
function marcarStatus(data, turno, vaga, st) {
    const ag = agendamentos[data]?.[turno]?.find(a => a.vaga === vaga);
    if (!ag) return;
    if (st === 'Justificou') { abrirModalJustificativa(data, turno, vaga); return; }
    ag.status = (ag.status === st) ? 'Aguardando' : st;
    if (ag.status !== 'Justificou') delete ag.justificativa;
    salvarAgendamentos();
}

function handleHtmlFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
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
            if (novosPacientes.length === 0) { mostrarNotificacao('Nenhum paciente válido.', 'warning'); return; }
            const mapaExistentes = new Map(pacientesGlobais.map(p => [p.numero, p]));
            novosPacientes.forEach(novo => {
                if (mapaExistentes.has(novo.numero)) Object.assign(mapaExistentes.get(novo.numero), novo);
                else mapaExistentes.set(novo.numero, novo);
            });
            pacientesGlobais = Array.from(mapaExistentes.values());
            salvarPacientesNoCloud();
            mostrarNotificacao('Pacientes importados com sucesso.', 'success');
            event.target.value = '';
        } catch (error) { mostrarNotificacao('Falha ao ler arquivo.', 'danger'); event.target.value = ''; }
    };
    reader.readAsText(file, 'windows-1252');
}

function fazerBackup() {
    const data = { agendamentos, pacientesGlobais, diasBloqueados, feriadosDesbloqueados };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_agenda_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    localStorage.setItem('ultimoBackupRealizado', new Date().toLocaleDateString('pt-BR'));
    mostrarNotificacao('Backup realizado!', 'success');
}

function restaurarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && typeof data.agendamentos === 'object') {
                 abrirModalConfirmacao(
                    'Tem certeza que deseja restaurar? Isso apagará os dados atuais da nuvem.',
                    () => {
                        update(ref(db), {
                            agendamentos: data.agendamentos || {},
                            pacientes_dados: data.pacientesGlobais || [],
                            dias_bloqueados: data.diasBloqueados || {},
                            feriados_desbloqueados: data.feriadosDesbloqueados || {}
                        }).then(() => {
                            mostrarNotificacao('Restauração concluída!', 'success');
                            setTimeout(() => location.reload(), 1500);
                        });
                    }
                );
            } else { mostrarNotificacao('Arquivo inválido.', 'danger'); }
        } catch (error) { mostrarNotificacao('Falha ao ler.', 'danger'); } finally { if(event.target) event.target.value = ''; }
    };
    reader.readAsText(file);
}

function executarLimpezaTotal() {
    if (document.getElementById('clearDataPassword').value === 'apocalipse') {
        set(ref(db), null).then(() => { location.reload(); });
    } else {
        document.getElementById('clearDataError').classList.remove('hidden');
    }
}

function mostrarNotificacao(msg, tipo) { const c = document.getElementById('floating-notifications'); if(!c) return; const n = document.createElement('div'); n.className = `floating-notification ${tipo}`; n.textContent = msg; c.appendChild(n); setTimeout(() => n.remove(), 3000); }
function verificarDuplicidadeAoDigitar(inputElement, data, turno, vaga) {
    const form = inputElement.closest('form'); const valorInput = inputElement.value.trim();
    if (valorInput === '') return;
    const campo = inputElement.name; const val = valorInput.toLowerCase();
    if (agendamentos[data]) {
        const dup = [...(agendamentos[data].manha||[]), ...(agendamentos[data].tarde||[])].find(ag => {
            let vAg = ''; if(campo==='numero')vAg=ag.numero; else if(campo==='nome')vAg=ag.nome.toLowerCase(); else if(campo==='cns')vAg=ag.cns;
            const mesmoSlot = slotEmEdicao && slotEmEdicao.data===data && slotEmEdicao.turno===turno && slotEmEdicao.vaga===vaga;
            return vAg===val && !mesmoSlot;
        });
        if (dup) {
            const erro = document.createElement('p'); erro.className = 'form-error-message'; erro.textContent = 'ERRO: Paciente já agendado hoje.';
            if(!form.querySelector('.form-error-message')) form.querySelector('.form-actions-wrapper').before(erro);
        }
    }
}

function configurarAutopreenchimento(form) {
    const inputs = form.querySelectorAll('input[name="numero"], input[name="nome"], input[name="cns"], input[name="tecRef"]');
    inputs.forEach(input => {
        const list = input.closest('.autocomplete-container')?.querySelector('.sugestoes-lista'); if(!list)return;
        input.addEventListener('input', () => {
            const val = input.value.toLowerCase();
            if(val.length<2) { list.style.display='none'; return; }
            const matches = pacientesGlobais.filter(p => (p[input.name]||'').toString().toLowerCase().includes(val)).slice(0,5);
            list.innerHTML = matches.map(p => `<div class="sugestao-item" data-num="${p.numero}"><strong>${p.nome}</strong> (${p.numero})</div>`).join('');
            list.style.display = matches.length?'block':'none';
        });
        list.addEventListener('click', e => {
            const item = e.target.closest('.sugestao-item'); if(!item)return;
            const p = pacientesGlobais.find(p=>p.numero===item.dataset.num);
            if(p) { form.querySelector('[name="numero"]').value=p.numero; form.querySelector('[name="nome"]').value=p.nome; form.querySelector('[name="cns"]').value=p.cns; form.querySelector('[name="distrito"]').value=p.distrito; form.querySelector('[name="tecRef"]').value=p.tecRef; form.querySelector('[name="cid"]').value=p.cid; }
            list.style.display='none';
        });
    });
    document.addEventListener('click', e => { if(!form.contains(e.target)) form.querySelectorAll('.sugestoes-lista').forEach(l=>l.style.display='none'); });
}

function configurarAutocompleteAssinatura() {
    const input = document.getElementById('assinaturaInput'); const list = document.getElementById('assinaturaSugestoes');
    if (!input || !list) return;
    const container = input.closest('.autocomplete-container');
    input.addEventListener('input', () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 2) { list.style.display='none'; return; }
        const matches = PROFISSIONAIS_LISTA.filter(p => p.nome.toLowerCase().includes(val));
        list.innerHTML = matches.map(p => `<div class="sugestao-item" data-nome="${p.nome}"><strong>${p.nome}</strong><br><small>${p.funcao}</small></div>`).join('');
        list.style.display = matches.length?'block':'none';
    });
    list.addEventListener('click', e => {
        const item = e.target.closest('.sugestao-item'); if(item) {
            const p = PROFISSIONAIS_LISTA.find(x=>x.nome===item.dataset.nome);
            if(p) { document.getElementById('assinaturaNomePrint').textContent=p.nome; document.getElementById('assinaturaFuncaoPrint').textContent=p.funcao; input.value=''; list.style.display='none'; }
        }
    });
    document.addEventListener('click', e => { if (container && !container.contains(e.target)) list.style.display='none'; });
}

function configurarHorarioBackup() {
    const btn = document.getElementById('saveBackupTimeBtn'); if(btn) btn.addEventListener('click', salvarHorarioBackup);
    const saved = localStorage.getItem('backupTime')||'16:00';
    if(document.getElementById('backupTimeDisplay')) document.getElementById('backupTimeDisplay').textContent=saved;
    if(document.getElementById('backupTimeInput')) document.getElementById('backupTimeInput').value=saved;
}
function salvarHorarioBackup() {
    const val = document.getElementById('backupTimeInput').value;
    localStorage.setItem('backupTime', val);
    document.getElementById('backupTimeDisplay').textContent=val;
    mostrarNotificacao(`Horário salvo: ${val}`, 'success');
}
function verificarNecessidadeBackup() {
    if(modalBackupAberto) return;
    const hoje = new Date().toLocaleDateString('pt-BR');
    if(localStorage.getItem('ultimoBackupRealizado')===hoje) return;
    const [h,m] = (localStorage.getItem('backupTime')||'16:00').split(':');
    const now = new Date();
    if(now.getDay()>=1 && now.getDay()<=5 && (now.getHours()>h || (now.getHours()==h && now.getMinutes()>=m))) abrirModalBackup();
}

function abrirModalBackup() { document.getElementById('backupModal').style.display='flex'; modalBackupAberto=true; }
function fecharModalBackup() { document.getElementById('backupModal').style.display='none'; modalBackupAberto=false; }
function abrirModalJustificativa(d,t,v) { justificativaEmEdicao={d,t,v}; document.getElementById('justificationModal').style.display='flex'; }
function fecharModalJustificativa() { document.getElementById('justificationModal').style.display='none'; }
function salvarJustificativa() { if(justificativaEmEdicao) { const {d,t,v}=justificativaEmEdicao; const ag=agendamentos[d][t].find(a=>a.vaga===v); if(ag){ag.status='Justificou';ag.justificativa={tipo:document.querySelector('input[name="justificativaTipo"]:checked').value};salvarAgendamentos();} fecharModalJustificativa(); } }
function abrirModalLimpeza() { document.getElementById('clearDataModal').style.display='flex'; }
function fecharModalLimpeza() { document.getElementById('clearDataModal').style.display='none'; }
function abrirModalBloqueio() { document.getElementById('blockDayModal').style.display='flex'; }
function fecharModalBloqueio() { document.getElementById('blockDayModal').style.display='none'; }
function confirmarBloqueio() { const d=dataSelecionada; const m=document.getElementById('blockReason').value; const t=document.getElementById('blockType').value; if(!diasBloqueados[d]) diasBloqueados[d]={}; diasBloqueados[d].diaInteiro=t==='all_day'; diasBloqueados[d].manha=t==='all_day'||t==='morning'; diasBloqueados[d].tarde=t==='all_day'||t==='afternoon'; diasBloqueados[d].motivo=m; diasBloqueados[d].manual=true; salvarBloqueios(); fecharModalBloqueio(); }
function buscarAgendamentosGlobais() {
    const val = document.getElementById('globalSearchInput').value.toLowerCase();
    const res = document.getElementById('searchResultsContainer');
    if(val.length<2) { res.innerHTML='<p class="search-feedback">Digite mais.</p>'; return; }
    let results = [];
    Object.keys(agendamentos).forEach(d => {
        ['manha','tarde'].forEach(t => {
            (agendamentos[d][t]||[]).forEach(ag => {
                if(ag.nome.toLowerCase().includes(val) || ag.numero.includes(val)) results.push({...ag, data:d, turno:t});
            });
        });
    });
    results.sort((a,b)=>new Date(b.data)-new Date(a.data));
    if(!results.length) res.innerHTML='<p class="search-feedback">Nada.</p>';
    else res.innerHTML = results.map(r => `<div class="search-result-item"><div class="result-info"><strong>${r.nome}</strong> (${r.numero})<br>${new Date(r.data+'T12:00:00').toLocaleDateString('pt-BR')} - ${r.turno}</div><button class="btn btn-jump" onclick="pularParaAgendamento('${r.data}')">Ir</button></div>`).join('');
}
function pularParaAgendamento(d) { mesAtual = new Date(d).getMonth(); atualizarCalendario(); setTimeout(()=>selecionarDia(d, document.querySelector(`.day[data-date="${d}"]`)), 100); }
function pularParaCard(d,t,v) { pularParaAgendamento(d); mostrarTurno(t); setTimeout(()=>document.getElementById(`card-${d}-${t}-${v}`).scrollIntoView(), 300); }
function pularParaVagaLivre(d,t) { pularParaAgendamento(d); mostrarTurno(t); }
function configurarBuscaGlobalAutocomplete() {
    const input = document.getElementById('globalSearchInput'); const list = document.getElementById('globalSugestoesLista');
    if(!input || !list) return;
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        if(val.length<2) { list.style.display='none'; return; }
        const matches = pacientesGlobais.filter(p => (p.nome||'').toLowerCase().includes(val)).slice(0,10);
        list.innerHTML = matches.map(p => `<div class="sugestao-item" data-val="${p.nome}"><strong>${p.nome}</strong> (${p.numero})</div>`).join('');
        list.style.display = matches.length?'block':'none';
    });
    list.addEventListener('click', e => {
        const item = e.target.closest('.sugestao-item'); if(item) { input.value=item.dataset.val; list.style.display='none'; buscarAgendamentosGlobais(); }
    });
    document.addEventListener('click', e => { if(!input.contains(e.target)) list.style.display='none'; });
}
function iniciarProcessoDeclaracao(d,t,v) { atestadoEmGeracao = agendamentos[d][t].find(a=>a.vaga===v); document.getElementById('choiceModal').style.display='flex'; }
function fecharModalEscolha() { document.getElementById('choiceModal').style.display='none'; }
function gerarDeclaracaoPaciente() { 
    if (!atestadoEmGeracao) return;
    const { nome, cns, data, turno } = atestadoEmGeracao;
    const dataObj = new Date(data + 'T12:00:00');
    const conteudoAtestado = `<h4>DECLARAÇÃO DE COMPARECIMENTO</h4><p>Declaramos... paciente <strong>${nome}</strong>...</p><p>Salvador, ${dataObj.toLocaleDateString('pt-BR')}.</p>`;
    document.getElementById('declaracao-content-wrapper').innerHTML = conteudoAtestado;
    fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; 
}
function gerarDeclaracaoAcompanhante() { document.getElementById('acompanhanteModal').style.display='flex'; }
function fecharModalAcompanhante() { document.getElementById('acompanhanteModal').style.display='none'; }
function confirmarNomeAcompanhante() { fecharModalAcompanhante(); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
function fecharModalAtestado() { document.getElementById('declaracaoModal').style.display='none'; }
function imprimirDeclaracao() { window.print(); }
function imprimirAgendaDiaria(d) { window.print(); }
function imprimirVagas() { window.print(); }
function fecharModalRelatorio() { document.getElementById('reportModal').style.display='none'; }
function aplicarFiltroRelatorio() {
    const tipo = document.getElementById('reportFilterType').value;
    const valor = document.getElementById('reportFilterValue').value;
    let dados = reportUnfilteredResults;
    if (reportCurrentStatus) dados = dados.filter(ag => ag.status === reportCurrentStatus);
    if (tipo && valor) dados = dados.filter(ag => ag[tipo] === valor);
    renderizarTabelaRelatorio(dados);
}
function limparFiltroRelatorio() { document.getElementById('reportFilterType').value=''; document.getElementById('reportFilterValue').innerHTML='<option value="">Selecione o valor</option>'; document.getElementById('reportFilterValue').disabled=true; let dados = reportUnfilteredResults; if(reportCurrentStatus) dados = dados.filter(ag => ag.status===reportCurrentStatus); renderizarTabelaRelatorio(dados); }
function atualizarValoresFiltro() {
    const tipo = document.getElementById('reportFilterType').value;
    const sel = document.getElementById('reportFilterValue');
    let vals = [];
    if(tipo==='tecRef') vals = JSON.parse(sel.dataset.tecRefs||'[]');
    else if(tipo==='distrito') vals = JSON.parse(sel.dataset.distritos||'[]');
    sel.innerHTML = '<option value="">Selecione o valor</option>' + vals.map(v => `<option value="${v}">${v}</option>`).join('');
    sel.disabled = (tipo==='');
}
function abrirModalRelatorio(status, periodo) {
    const modal = document.getElementById('reportModal');
    reportCurrentStatus = status;
    let dados = [];
    if (periodo === 'current_month') {
        let prefix = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-`;
        Object.keys(agendamentos).forEach(d => { if(d.startsWith(prefix)) ['manha','tarde'].forEach(t => (agendamentos[d][t]||[]).forEach(ag => dados.push({...ag, data:d, turno:t}))); });
        document.getElementById('reportModalTitle').textContent = `Relatório ${status||'Geral'} - ${meses[mesAtual]}`;
        document.getElementById('btnVerRelatorioAnual').classList.remove('hidden');
    } else {
        let prefix = `${anoAtual}-`;
        Object.keys(agendamentos).forEach(d => { if(d.startsWith(prefix)) ['manha','tarde'].forEach(t => (agendamentos[d][t]||[]).forEach(ag => dados.push({...ag, data:d, turno:t}))); });
        document.getElementById('reportModalTitle').textContent = `Relatório Anual ${anoAtual}`;
        document.getElementById('btnVerRelatorioAnual').classList.add('hidden');
    }
    dados.sort((a,b)=>new Date(a.data)-new Date(b.data));
    reportUnfilteredResults = dados;
    const tecRefs=new Set(), distritos=new Set(); dados.forEach(ag=>{if(ag.tecRef)tecRefs.add(ag.tecRef);if(ag.distrito)distritos.add(ag.distrito);});
    const sel=document.getElementById('reportFilterValue'); sel.dataset.tecRefs=JSON.stringify([...tecRefs].sort()); sel.dataset.distritos=JSON.stringify([...distritos].sort());
    if(status) dados = dados.filter(ag => ag.status === status);
    renderizarTabelaRelatorio(dados);
    limparFiltroRelatorio(false);
    modal.style.display='flex';
}
function renderizarTabelaRelatorio(dados) {
    const c = document.getElementById('reportTableContainer');
    document.getElementById('reportTotalCount').textContent = `Total: ${dados.length}`;
    if(dados.length===0) { c.innerHTML='<p style="text-align:center;padding:1rem">Nenhum registro.</p>'; return; }
    c.innerHTML = `<table class="report-table"><thead><tr><th>Data</th><th>Paciente</th><th>Nº</th><th>Téc. Ref.</th><th>Status</th></tr></thead><tbody>${dados.map(ag=>`<tr><td>${new Date(ag.data+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${ag.nome}</td><td>${ag.numero}</td><td>${ag.tecRef||''}</td><td>${ag.status}</td></tr>`).join('')}</tbody></table>`;
}
function isWeekend(d) { const day = new Date(d+'T00:00:00').getDay(); return day===0 || day===6; }
function procurarVagas() {
    const start=document.getElementById('vagasStartDate').value; const end=document.getElementById('vagasEndDate').value;
    const resC=document.getElementById('vagasResultadosContainer'); const printBtn=document.getElementById('btnPrintVagas');
    if(!start||!end){alert('Preencha as datas');return;}
    const d1=new Date(start+'T00:00:00'), d2=new Date(end+'T00:00:00');
    if((d2-d1)/(1000*60*60*24) >= MAX_DAYS_SEARCH) {alert('Máximo 10 dias');return;}
    let total=0, dias=[], curr=new Date(d1);
    while(curr<=d2) {
        const dStr=curr.toISOString().split('T')[0], wd=diasSemana[curr.getDay()];
        const bl=diasBloqueados[dStr], ag=agendamentos[dStr];
        if(isWeekend(dStr)) dias.push({date:dStr, weekday:wd, type:'Fim de Semana'});
        else {
            let lm=8, lt=8, om=[], ot=[];
            if(bl){if(bl.diaInteiro){lm=0;lt=0;}else{if(bl.manha)lm=0;if(bl.tarde)lt=0;}}
            if(ag){if(lm>0&&ag.manha){om=ag.manha.map(x=>({...x,turno:'manha'}));lm=Math.max(0,lm-om.length);} if(lt>0&&ag.tarde){ot=ag.tarde.map(x=>({...x,turno:'tarde'}));lt=Math.max(0,lt-ot.length);}}
            total+=lm+lt;
            dias.push({date:dStr, weekday:wd, type:bl?.motivo?'Bloqueio':(lm+lt>0?'Disponível':'Cheio'), manha:{livres:lm,ocupados:om}, tarde:{livres:lt,ocupados:ot}, motivo:bl?.motivo});
        }
        curr.setDate(curr.getDate()+1);
    }
    vagasResultadosAtuais=dias;
    renderizarResultadosVagas(d1,d2,total,dias);
    resC.classList.remove('hidden'); printBtn.classList.remove('hidden');
}
function renderizarResultadosVagas(d1,d2,total,dias) {
    document.getElementById('vagasPeriodoTitulo').textContent=`Vagas: ${d1.toLocaleDateString('pt-BR')} a ${d2.toLocaleDateString('pt-BR')}`;
    document.getElementById('vagasSumario').innerHTML = total===0 ? '<p style="color:var(--color-danger)">Nenhuma vaga.</p>' : '';
    let html='<div id="vagas-resultado-grid">';
    dias.forEach(d => {
        const dFmt=new Date(d.date+'T00:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
        if(d.type==='Fim de Semana') html+=`<div class="vaga-dia-card fim-de-semana"><div class="vaga-dia-header">${d.weekday}, ${dFmt}</div><p class="aviso-bloqueio">Fim de Semana</p></div>`;
        else if(d.type==='Bloqueio' && d.manha.livres===0 && d.tarde.livres===0) html+=`<div class="vaga-dia-card bloqueado"><div class="vaga-dia-header">${d.weekday}, ${dFmt}</div><p class="aviso-bloqueio">Bloqueado: ${d.motivo}</p></div>`;
        else {
            html+=`<div class="vaga-dia-card"><div class="vaga-dia-header">${d.weekday}, ${dFmt} <button class="btn-icon btn-jump-day" onclick="pularParaAgendamento('${d.date}')"><i class="bi bi-arrow-right-circle"></i></button></div>`;
            html+=`<div class="turno-detalhe"><h3 class="turno-titulo manha">Manhã (${d.manha.livres} Livres)</h3><ul class="vaga-lista">${d.manha.ocupados.map(o=>`<li class="vaga-lista-item ocupada"><span>Nº ${o.numero}</span> - ${o.nome}</li>`).join('')}${Array(d.manha.livres).fill(`<li class="vaga-lista-item livre" onclick="pularParaVagaLivre('${d.date}','manha')">Vaga Livre</li>`).join('')}</ul></div>`;
            html+=`<div class="turno-detalhe"><h3 class="turno-titulo tarde">Tarde (${d.tarde.livres} Livres)</h3><ul class="vaga-lista">${d.tarde.ocupados.map(o=>`<li class="vaga-lista-item ocupada"><span>Nº ${o.numero}</span> - ${o.nome}</li>`).join('')}${Array(d.tarde.livres).fill(`<li class="vaga-lista-item livre" onclick="pularParaVagaLivre('${d.date}','tarde')">Vaga Livre</li>`).join('')}</ul></div></div>`;
        }
    });
    document.getElementById('vagasBloqueiosDetalhes').innerHTML = html + '</div>';
}
function limparBuscaVagas() { document.getElementById('vagasStartDate').value=''; document.getElementById('vagasEndDate').value=''; document.getElementById('vagasResultadosContainer').classList.add('hidden'); document.getElementById('btnPrintVagas').classList.add('hidden'); }
function togglePasswordVisibility() { const i=document.getElementById('clearDataPassword'); i.type = i.type==='password'?'text':'password'; }
function handlePrint() { window.print(); }

// Inicialização
document.addEventListener('DOMContentLoaded', () => { inicializarLogin(); });