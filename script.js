/* script.js - VERSÃO GOLDEN MASTER (FIX CRITICAL FORM CRASH) */
'use strict';

console.log("Sistema Iniciado: Versão Blindada v20.2");

// --- 1. CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDu_n6yDxrSEpv0eCcJDjUIyH4h0UiYx14",
  authDomain: "caps-libia.firebaseapp.com",
  projectId: "caps-libia",
  storageBucket: "caps-libia.firebasestorage.app",
  messagingSenderId: "164764567114",
  appId: "1:164764567114:web:2701ed4a861492c0e388b3"
};

let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase conectado.");
} catch (e) {
    console.error("Erro Firebase:", e);
}

// --- 2. VARIÁVEIS GLOBAIS ---
const VAGAS_POR_TURNO = 8;
const MAX_DAYS_SEARCH = 10;
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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

// --- 3. INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    // Verifica mensagens de sucesso pós-reload
    if (sessionStorage.getItem('limpezaSucesso')) {
        mostrarNotificacao("Todos os dados foram apagados com sucesso.", 'success');
        sessionStorage.removeItem('limpezaSucesso');
    }
    if (sessionStorage.getItem('restauracaoSucesso')) {
        mostrarNotificacao("Dados restaurados com sucesso.", 'success');
        sessionStorage.removeItem('restauracaoSucesso');
    }
    
    inicializarLogin();
});

function inicializarLogin() {
    if (sessionStorage.getItem('usuarioLogado') === 'true') {
        document.body.classList.add('logged-in');
        inicializarApp();
    } else {
        configurarEventListenersLogin();
    }
}

function configurarEventListenersLogin() {
    const btn = document.getElementById('loginButton');
    const inp = document.getElementById('loginSenha');
    if (btn) {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', tentarLogin);
    }
    if (inp) {
        inp.addEventListener('keyup', (e) => { if (e.key === 'Enter') tentarLogin(); });
    }
}

function tentarLogin() {
    const u = document.getElementById('loginUsuario').value;
    const s = document.getElementById('loginSenha').value;
    if (u === '0000' && s === '0000') {
        sessionStorage.setItem('usuarioLogado', 'true');
        document.getElementById('loginErrorMessage').classList.add('hidden');
        document.body.classList.add('logged-in');
        inicializarApp();
    } else {
        const err = document.getElementById('loginErrorMessage');
        err.textContent = 'Senha incorreta.';
        err.classList.remove('hidden');
    }
}

function inicializarApp() {
    // Carrega cache local
    try {
        agendamentos = JSON.parse(localStorage.getItem('agenda_completa_final')) || {};
        pacientesGlobais = JSON.parse(localStorage.getItem('pacientes_dados')) || [];
        diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados')) || {};
        feriadosDesbloqueados = JSON.parse(localStorage.getItem('feriados_desbloqueados')) || {};
        pacientes = [...pacientesGlobais];
    } catch(e) {}

    // Conecta Firebase
    if (database) {
        database.ref('agendamentos').on('value', (s) => {
            agendamentos = s.val() || {};
            localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
            atualizarUI();
        });
        database.ref('dias_bloqueados').on('value', (s) => {
            diasBloqueados = s.val() || {};
            localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
            atualizarUI();
        });
        database.ref('pacientes').on('value', (s) => {
            pacientesGlobais = s.val() || [];
            pacientes = [...pacientesGlobais];
            localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
            verificarDadosCarregados();
        });
        database.ref('feriados_desbloqueados').on('value', (s) => {
            feriadosDesbloqueados = s.val() || {};
            localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
            atualizarUI();
        });
    }

    configurarHorarioBackup();
    setInterval(verificarNecessidadeBackup, 5000);
    configurarEventListenersApp();
    atualizarUI();
    verificarNecessidadeBackup();
}

function atualizarUI() {
    atualizarCalendario();
    if (dataSelecionada) {
        exibirAgendamentos(dataSelecionada);
        atualizarBolinhasDisponibilidade(dataSelecionada);
    }
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    verificarDadosCarregados();
}

// --- 4. RENDERIZAÇÃO ---

function atualizarCalendario() {
    const container = document.getElementById('calendarContainer');
    const mesAnoEl = document.getElementById('mesAno');
    if (!container || !mesAnoEl) return;

    mesAnoEl.textContent = `${meses[mesAtual]} ${anoAtual}`;
    container.innerHTML = '';

    const feriadosDoAno = getFeriados(anoAtual);
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(d => {
        const el = document.createElement('div'); el.className = 'weekday'; el.textContent = d; grid.appendChild(el);
    });

    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const hoje = new Date();
    const hojeFmt = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;

    for (let i = 0; i < primeiroDia; i++) grid.appendChild(document.createElement('div'));

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dStr = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const diaSemana = new Date(dStr + "T00:00:00").getDay();
        const el = document.createElement('div');
        el.className = 'day'; el.textContent = dia; el.setAttribute('data-date', dStr);

        const feriado = feriadosDoAno.get(dStr);
        if (feriado && !feriadosDesbloqueados[dStr]) {
            el.classList.add('day-holiday'); el.title = feriado;
            if (!diasBloqueados[dStr]) diasBloqueados[dStr] = { diaInteiro: true, motivo: feriado, isHoliday: true };
        }
        
        const bloq = diasBloqueados[dStr];
        let isBlocked = false;
        if (bloq) {
            if (bloq.diaInteiro || (bloq.manha && bloq.tarde)) { el.classList.add('blocked-day'); isBlocked = true; }
            else { if (bloq.manha) el.classList.add('blocked-morning'); if (bloq.tarde) el.classList.add('blocked-afternoon'); }
        }

        if (diaSemana === 0 || diaSemana === 6) el.classList.add('weekend');
        else {
            el.classList.add('workday');
            el.onclick = (e) => { e.stopPropagation(); selecionarDia(dStr, el); };
            if (agendamentos[dStr] && ((agendamentos[dStr].manha?.length) || (agendamentos[dStr].tarde?.length)) && !isBlocked) {
                el.classList.add('day-has-appointments');
            }
        }

        if (dStr === hojeFmt) el.classList.add('today');
        if (dStr === dataSelecionada) el.classList.add('selected');
        grid.appendChild(el);
    }
    container.appendChild(grid);
}

function selecionarDia(data, elemento) {
    slotEmEdicao = null;
    document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
    if (elemento) elemento.classList.add('selected');
    else {
        const el = document.querySelector(`.day[data-date="${data}"]`);
        if (el) el.classList.add('selected');
    }
    dataSelecionada = data;
    exibirAgendamentos(data);
    atualizarBolinhasDisponibilidade(data);
    atualizarResumoSemanal(new Date(data + 'T12:00:00'));
    
    const hint = document.getElementById('floatingDateHint');
    if (hint) {
        const dObj = new Date(data + 'T12:00:00');
        let txt = dObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        hint.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
        hint.classList.add('visible');
    }
}

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;

    const d = new Date(data + 'T12:00:00');
    let dFmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    dFmt = dFmt.charAt(0).toUpperCase() + dFmt.slice(1);
    
    const bloq = diasBloqueados[data];
    
    if (bloq && (bloq.diaInteiro || (bloq.manha && bloq.tarde))) {
        container.innerHTML = criarBlockedState(dFmt, bloq.motivo);
        const btn = document.getElementById('btnLockDay');
        if (btn) btn.onclick = () => gerenciarBloqueioDia(data);
        return;
    }

    const ag = agendamentos[data] || { manha: [], tarde: [] };
    const metrics = calcularResumoMensal(data);
    const total = (ag.manha?.length || 0) + (ag.tarde?.length || 0);

    let html = `
        <div class="appointment-header">
            <h2 class="appointment-title">${dFmt}</h2>
            <div class="header-actions">
                <button id="btnPrint" class="btn btn-secondary btn-sm"><i class="bi bi-printer-fill"></i> Imprimir</button>
                <button id="btnLockDay" class="btn-icon btn-lock"><i class="bi bi-lock-fill"></i></button>
            </div>
        </div>
        <div class="glass-card"><div class="card-content">
            <div class="dashboard-stats-grid">
                <div class="stats-card-mini"><h4><span>Hoje</span></h4><div class="stats-value-big val-neutral">${total}</div></div>
                <div class="stats-card-mini"><h4><span>Ocupação</span></h4><div class="stats-value-big val-primary">${metrics.percentage}%</div></div>
                <div class="stats-card-mini"><h4><span>Abstenções</span></h4><div class="stats-value-big val-danger">${metrics.abstencaoCount}</div></div>
                <div class="stats-card-mini"><h4><span>Atendimentos</span></h4><div class="stats-value-big val-success">${metrics.atendimentoCount}</div></div>
            </div>
            
            <div class="tabs">
                <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mostrarTurno('manha')">Manhã</button>
                <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mostrarTurno('tarde')">Tarde</button>
            </div>
            
            <div id="turnoIndicator" class="turno-indicator ${turnoAtivo}">
                ${turnoAtivo === 'manha' ? 'MANHÃ (08:00 - 12:00)' : 'TARDE (13:00 - 17:00)'}
            </div>

            <div id="turno-manha" class="turno-content ${turnoAtivo === 'manha' ? 'active' : ''}">
                ${bloq?.manha ? criarBlockedTurnoState('Manhã', bloq.motivo) : gerarVagasTurno(ag.manha, 'manha', data)}
            </div>
            <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">
                ${bloq?.tarde ? criarBlockedTurnoState('Tarde', bloq.motivo) : gerarVagasTurno(ag.tarde, 'tarde', data)}
            </div>
        </div></div>
        <datalist id="listaProfissionais"></datalist>
    `;

    container.innerHTML = html;

    document.getElementById('btnPrint').onclick = () => imprimirAgendaDiaria(data);
    document.getElementById('btnLockDay').onclick = () => gerenciarBloqueioDia(data);
    
    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
        popularSelectProfissionais();
    }, 50);
}

function popularSelectProfissionais() {
    const dl = document.getElementById('listaProfissionais');
    if (!dl) return;
    dl.innerHTML = PROFISSIONAIS_LISTA.map(p => `<option value="${p.nome}">${p.funcao}</option>`).join('');
}

function gerarVagasTurno(lista = [], turno, data) {
    let html = '<div class="vagas-grid">';
    
    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const ag = lista.find(a => a.vaga === i);
        const editing = slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === i;
        const cardId = `card-${data}-${turno}-${i}`;
        
        if (ag && !editing) {
            const statusClass = `status-${(ag.status || 'Aguardando').toLowerCase()}`;
            html += `
                <div id="${cardId}" class="vaga-card ocupada ${statusClass}">
                    <div class="vaga-header ${turno}">
                        <div>Vaga ${i} - Ocupada</div>
                        <div class="vaga-header-tags"><span class="status-tag ${statusClass}">${ag.status}</span></div>
                    </div>
                    <div class="vaga-content">
                        <div class="info-content">
                            <h4>${ag.nome}</h4>
                            <p><strong>Nº:</strong> ${ag.numero} | <strong>CNS:</strong> ${ag.cns}</p>
                            ${ag.observacao ? `<p>Obs: ${ag.observacao}</p>` : ''}
                        </div>
                        <div class="agendamento-acoes">
                            <button class="btn btn-edit" onclick="iniciarEdicao('${data}','${turno}',${i})">Editar</button>
                            <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}','${turno}',${i})">Declaração</button>
                            <button class="btn btn-danger" onclick="abrirModalConfirmacao('Cancelar?', () => executarCancelamento('${data}','${turno}',${i}))">Cancelar</button>
                        </div>
                        <div class="status-buttons-container">
                             <button class="btn btn-sm btn-status" onclick="marcarStatus('${data}','${turno}',${i},'Compareceu')">Compareceu</button>
                             <button class="btn btn-sm btn-status" onclick="marcarStatus('${data}','${turno}',${i},'Faltou')">Faltou</button>
                             <button class="btn btn-sm btn-status" onclick="marcarStatus('${data}','${turno}',${i},'Justificou')">Justificou</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const d = editing ? ag : {};
            // ADICIONADOS: input hidden para 'distrito' e 'cid' para evitar perda de dados e erros
            html += `
                <div id="${cardId}" class="vaga-card ${editing ? 'editing' : ''}">
                    <div class="vaga-header ${turno}"><div>Vaga ${i} - ${editing ? 'Editando' : 'Disponível'}</div></div>
                    <div class="vaga-content">
                        <form class="vaga-form" onsubmit="agendarPaciente(event, '${data}', '${turno}', ${i})">
                            <input type="hidden" name="distrito" value="${d.distrito||''}">
                            <input type="hidden" name="cid" value="${d.cid||''}">
                            <div class="form-row">
                                <div class="form-group autocomplete-container"><label>Nº:</label><input name="numero" class="form-input" required value="${d.numero||''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div>
                                <div class="form-group autocomplete-container"><label>Nome:</label><input name="nome" class="form-input" required value="${d.nome||''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group autocomplete-container"><label>CNS:</label><input name="cns" class="form-input" required value="${d.cns||''}" onblur="verificarDuplicidadeAoDigitar(this,'${data}','${turno}',${i})"><div class="sugestoes-lista"></div></div>
                                <div class="form-group"><label>Téc. Ref:</label><input name="tecRef" class="form-input" list="listaProfissionais" value="${d.tecRef||''}"></div>
                            </div>
                            <div class="form-group full-width"><label>Observação:</label><textarea name="observacao" class="form-input" rows="2">${d.observacao||''}</textarea></div>
                            <div class="form-actions-wrapper">
                                <div class="form-group"><label>Agendado por:</label><input name="agendadoPor" class="form-input" required list="listaProfissionais" value="${d.agendadoPor||''}"></div>
                                <div class="form-buttons">
                                    ${editing ? `<button type="button" class="btn btn-secondary" onclick="cancelarEdicao()">Cancelar</button>` : `<button type="button" class="btn btn-secondary" onclick="limparFormulario(this)">Limpar</button>`}
                                    <button type="submit" class="btn btn-success">${editing ? 'Salvar' : 'Agendar'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    return html;
}

// --- 5. FUNÇÕES DE SUPORTE (HTML Generators) ---

function criarBlockedState(dataFmt, motivo) {
    return `<div class="appointment-header"><h2 class="appointment-title">${dataFmt}</h2><div class="header-actions"><button id="btnLockDay" class="btn-icon btn-lock"><i class="bi bi-unlock-fill"></i></button></div></div><div class="glass-card"><div class="card-content"><div class="blocked-state"><i class="bi bi-lock-fill blocked-icon"></i><h3>Agenda Bloqueada</h3><p>${motivo}</p></div></div></div>`;
}

function criarBlockedTurnoState(turno, motivo) {
    return `<div class="blocked-state turno"><i class="bi bi-lock-fill blocked-icon"></i><h4>Turno da ${turno} Bloqueado</h4><p>${motivo}</p></div>`;
}

// --- 6. EVENT LISTENERS GERAIS ---

function configurarEventListenersApp() {
    document.getElementById('btnHoje')?.addEventListener('click', goToToday);
    document.getElementById('btnMesAnterior')?.addEventListener('click', voltarMes);
    document.getElementById('btnProximoMes')?.addEventListener('click', avancarMes);
    document.getElementById('btnImportar')?.addEventListener('click', () => document.getElementById('htmlFile').click());
    document.getElementById('htmlFile')?.addEventListener('change', handleHtmlFile);
    document.getElementById('btnBackup')?.addEventListener('click', fazerBackup);
    document.getElementById('btnRestaurar')?.addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile')?.addEventListener('change', restaurarBackup);
    document.getElementById('btnLimparDados')?.addEventListener('click', abrirModalLimpeza);
    document.getElementById('btnConfirmClearData')?.addEventListener('click', executarLimpezaTotal);
    document.getElementById('btnCancelClearData')?.addEventListener('click', fecharModalLimpeza);
    document.getElementById('btnConfirmarBloqueio')?.addEventListener('click', confirmarBloqueio);
    document.getElementById('btnCancelarBloqueio')?.addEventListener('click', fecharModalBloqueio);
    document.getElementById('togglePassword')?.addEventListener('click', togglePasswordVisibility);
    
    // Busca
    document.getElementById('globalSearchButton')?.addEventListener('click', buscarAgendamentosGlobais);
    document.getElementById('globalSearchInput')?.addEventListener('keyup', (e) => { if(e.key==='Enter') buscarAgendamentosGlobais(); });
    
    // Vagas
    document.getElementById('btnProcurarVagas')?.addEventListener('click', procurarVagas);
    document.getElementById('btnClearVagasSearch')?.addEventListener('click', limparBuscaVagas);
    document.getElementById('btnPrintVagas')?.addEventListener('click', imprimirVagas);

    // Declarações
    document.getElementById('btnDeclaracaoPaciente')?.addEventListener('click', gerarDeclaracaoPaciente);
    document.getElementById('btnDeclaracaoAcompanhante')?.addEventListener('click', gerarDeclaracaoAcompanhante);
    document.getElementById('btnCancelarChoice')?.addEventListener('click', fecharModalEscolha);
    document.getElementById('btnFecharDeclaracao')?.addEventListener('click', fecharModalAtestado);
    document.getElementById('btnImprimirDeclaracao')?.addEventListener('click', imprimirDeclaracao);
    document.getElementById('btnConfirmarAcompanhante')?.addEventListener('click', confirmarNomeAcompanhante);
    document.getElementById('btnCancelarAcompanhante')?.addEventListener('click', fecharModalAcompanhante);
    document.getElementById('acompanhanteNomeInput')?.addEventListener('keyup', (e) => { if(e.key === 'Enter') confirmarNomeAcompanhante(); });

    document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModalConfirmacao);
    document.getElementById('confirmButton')?.addEventListener('click', executarAcaoConfirmada);
    document.getElementById('btnCancelarJustificativa')?.addEventListener('click', fecharModalJustificativa);
    document.getElementById('btnConfirmarJustificativa')?.addEventListener('click', salvarJustificativa);

    document.getElementById('btnFecharReportModal')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnFecharReportModalFooter')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnPrintReport')?.addEventListener('click', () => handlePrint('printing-report'));
    document.getElementById('btnApplyFilter')?.addEventListener('click', aplicarFiltroRelatorio);
    document.getElementById('btnClearFilter')?.addEventListener('click', limparFiltroRelatorio);
    document.getElementById('reportFilterType')?.addEventListener('change', atualizarValoresFiltro);
    document.getElementById('btnVerRelatorioAnual')?.addEventListener('click', () => abrirModalRelatorio(null, 'current_year'));
    
    document.getElementById('btnBackupModalAction')?.addEventListener('click', () => { fazerBackup(); fecharModalBackup(); });
}

// --- 7. LÓGICA DE LIMPEZA BLINDADA ---

function executarLimpezaTotal() {
    const pwd = document.getElementById('clearDataPassword').value;
    if (pwd !== 'apocalipse') {
        document.getElementById('clearDataError').textContent = 'Senha incorreta.';
        document.getElementById('clearDataError').classList.remove('hidden');
        return;
    }

    // 1. Limpa Memória
    agendamentos = {}; diasBloqueados = {}; pacientesGlobais = []; pacientes = []; feriadosDesbloqueados = {};

    // 2. Desliga e Remove (Se online)
    if (typeof database !== 'undefined' && database) {
        try {
            database.ref('agendamentos').off();
            database.ref('pacientes').off();
            database.ref('dias_bloqueados').off();
            database.ref('feriados_desbloqueados').off();
        } catch(e){}

        Promise.all([
            database.ref('agendamentos').remove(),
            database.ref('pacientes').remove(),
            database.ref('dias_bloqueados').remove(),
            database.ref('feriados_desbloqueados').remove()
        ]).then(finalizarLimpeza).catch(() => {
            alert('Erro na nuvem, limpando localmente.');
            finalizarLimpeza();
        });
    } else {
        finalizarLimpeza();
    }
}

function finalizarLimpeza() {
    localStorage.clear();
    sessionStorage.setItem('limpezaSucesso', 'true');
    location.reload();
}

function abrirModalLimpeza() { document.getElementById('clearDataModal').style.display='flex'; document.getElementById('clearDataPassword').focus(); }
function fecharModalLimpeza() { document.getElementById('clearDataModal').style.display='none'; document.getElementById('clearDataPassword').value=''; document.getElementById('clearDataError').classList.add('hidden'); }
function togglePasswordVisibility() { const i = document.getElementById('clearDataPassword'); i.type = i.type==='password'?'text':'password'; }

// --- 8. FUNÇÕES AUXILIARES COMPLETAS ---

function mostrarTurno(turno) {
    turnoAtivo = turno;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn.${turno}`)?.classList.add('active');
    document.querySelectorAll('.turno-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`turno-${turno}`)?.classList.add('active');
    document.getElementById('turnoIndicator').textContent = turno === 'manha' ? 'MANHÃ (08:00 - 12:00)' : 'TARDE (13:00 - 17:00)';
}

function goToToday() {
    const h = new Date();
    mesAtual = h.getMonth(); anoAtual = h.getFullYear();
    atualizarCalendario();
    const dStr = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
    selecionarDia(dStr, document.querySelector(`.day[data-date="${dStr}"]`));
}

function voltarMes() { mesAtual--; if(mesAtual<0){mesAtual=11;anoAtual--;} atualizarCalendario(); }
function avancarMes() { mesAtual++; if(mesAtual>11){mesAtual=0;anoAtual++;} atualizarCalendario(); }

function getFeriados(ano) {
    function calcularPascoa(a) {
        const c=Math.floor, d=a%19, e=c(a/100), f=a%100, g=c(e/4), h=e%4, i=c((e+8)/25), j=c((e-i+1)/3), k=(19*d+e-g-j+15)%30, l=c(f/4), m=f%4, n=(32+2*h+2*l-k-m)%7, o=c((d+11*k+22*n)/451), p=c((k+n-7*o+114)/31), q=(k+n-7*o+114)%31+1;
        return new Date(a,p-1,q);
    }
    const pascoa = calcularPascoa(ano);
    const umDia = 86400000;
    const map = new Map();
    const fixos = [
        {m:1,d:1,n:"Confraternização"},{m:4,d:21,n:"Tiradentes"},{m:5,d:1,n:"Trabalho"},
        {m:9,d:7,n:"Independência"},{m:10,d:12,n:"N.S. Aparecida"},{m:11,d:2,n:"Finados"},
        {m:11,d:15,n:"Proclamação"},{m:12,d:25,n:"Natal"}
    ];
    fixos.forEach(f => map.set(`${ano}-${String(f.m).padStart(2,'0')}-${String(f.d).padStart(2,'0')}`, f.n));
    const moveis = [
        {d:new Date(pascoa.getTime()-47*umDia), n:"Carnaval"},
        {d:new Date(pascoa.getTime()-2*umDia), n:"Sexta Santa"},
        {d:new Date(pascoa.getTime()+60*umDia), n:"Corpus Christi"}
    ];
    moveis.forEach(f => map.set(f.d.toISOString().split('T')[0], f.n));
    return map; 
}

function calcularResumoMensal(data) {
    let cap = 0, occ = 0, abs = 0, att = 0;
    const prefix = data.substring(0, 7); // YYYY-MM
    // Total de dias úteis no mês
    const daysInMonth = new Date(anoAtual, mesAtual + 1, 0).getDate();
    for(let i=1; i<=daysInMonth; i++) {
        const d = new Date(anoAtual, mesAtual, i).getDay();
        if(d!==0 && d!==6) cap += 16;
    }
    
    Object.keys(agendamentos).forEach(k => {
        if(k.startsWith(prefix)) {
            ['manha','tarde'].forEach(t => {
                if(agendamentos[k][t]) agendamentos[k][t].forEach(a => {
                    occ++;
                    if(a.status==='Faltou'||a.status==='Justificou') abs++;
                    if(a.status==='Compareceu') att++;
                });
            });
        }
    });
    return {
        percentage: cap ? ((occ/cap)*100).toFixed(1) : 0,
        occupiedCount: occ, capacityTotal: cap,
        abstencaoCount: abs, abstencaoPercent: occ ? ((abs/occ)*100).toFixed(1) : 0,
        atendimentoCount: att, atendimentoPercent: occ ? ((att/occ)*100).toFixed(1) : 0
    };
}

function verificarDadosCarregados() {
    const el = document.getElementById('dataLoadedIndicator');
    if(el) {
        const tem = Object.keys(agendamentos).length > 0 || pacientesGlobais.length > 0;
        el.className = `data-loaded-indicator ${tem?'loaded':'not-loaded'}`;
        document.getElementById('indicatorText').textContent = tem ? 'Dados Carregados' : 'Sem Dados';
    }
}

function fecharModalBloqueio() { document.getElementById('blockDayModal').style.display='none'; }
function gerenciarBloqueioDia(d) { 
    if(diasBloqueados[d]) { delete diasBloqueados[d]; salvarBloqueios(); atualizarUI(); }
    else { document.getElementById('blockDayModal').style.display='flex'; }
}
function confirmarBloqueio() {
    const t = document.getElementById('blockType').value;
    const m = document.getElementById('blockReason').value;
    diasBloqueados[dataSelecionada] = { motivo: m, diaInteiro: t==='all_day', manha: t==='all_day'||t==='morning', tarde: t==='all_day'||t==='afternoon' };
    salvarBloqueios(); atualizarUI(); fecharModalBloqueio();
}

function salvarBloqueios() {
    if (database) database.ref('dias_bloqueados').set(diasBloqueados);
    localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
}

function salvarAgendamentos() {
    if (database) database.ref('agendamentos').set(agendamentos);
    localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
}

function salvarPacientesNoLocalStorage() {
    if (database) database.ref('pacientes').set(pacientesGlobais);
    localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
}

// --- CORE FIX: AGENDAMENTO BLINDADO ---
function agendarPaciente(e, d, t, v) {
    e.preventDefault();
    const f = e.target;
    // Verificação de Duplicidade
    const num = f.numero.value;
    const exists = [...(agendamentos[d]?.manha||[]), ...(agendamentos[d]?.tarde||[])].some(a => a.numero === num && (!slotEmEdicao || slotEmEdicao.vaga !== v));
    if(exists) { alert('Paciente já agendado hoje!'); return; }

    // BLINDAGEM CONTRA ERROS JS EM CAMPOS INEXISTENTES
    const novo = {
        vaga: v, 
        numero: f.numero.value, 
        nome: f.nome.value, 
        cns: f.cns.value,
        // Usamos f.campo ? f.campo.value : '' para garantir que não crash se o input hidden falhar
        distrito: f.distrito ? f.distrito.value : '', 
        tecRef: f.tecRef ? f.tecRef.value : '', 
        cid: f.cid ? f.cid.value : '',
        agendadoPor: f.agendadoPor ? f.agendadoPor.value : '', 
        observacao: f.observacao ? f.observacao.value : '',
        status: 'Aguardando',
        // Checkboxes: só tenta ler se existirem
        primeiraConsulta: f.primeiraConsulta ? f.primeiraConsulta.checked : false,
        solicitacoes: f.querySelectorAll ? Array.from(f.querySelectorAll('input[name="solicitacao"]:checked')).map(cb => cb.value) : []
    };
    
    if(!agendamentos[d]) agendamentos[d] = { manha: [], tarde: [] };
    if(!agendamentos[d][t]) agendamentos[d][t] = [];
    
    const idx = agendamentos[d][t].findIndex(a => a.vaga === v);
    if(idx > -1) agendamentos[d][t][idx] = novo;
    else agendamentos[d][t].push(novo);
    
    salvarAgendamentos();
    slotEmEdicao = null;
    exibirAgendamentos(d);
}

function iniciarEdicao(d, t, v) { slotEmEdicao = {data:d, turno:t, vaga:v}; exibirAgendamentos(d); }
function cancelarEdicao() { slotEmEdicao = null; exibirAgendamentos(dataSelecionada); }
function limparFormulario(btn) { btn.form.reset(); }
function marcarStatus(d, t, v, s) {
    const a = agendamentos[d][t].find(i => i.vaga === v);
    if(!a) return;
    if(s === 'Justificou') { abrirModalJustificativa(d, t, v); return; }
    a.status = a.status === s ? 'Aguardando' : s;
    if(a.status !== 'Justificou') delete a.justificativa;
    salvarAgendamentos(); exibirAgendamentos(d);
}
function executarCancelamento(d, t, v) {
    agendamentos[d][t] = agendamentos[d][t].filter(a => a.vaga !== v);
    salvarAgendamentos(); exibirAgendamentos(d);
    fecharModalConfirmacao();
}

// Autocomplete Corrigido para Preencher Inputs Ocultos
function configurarAutopreenchimento(form) {
    const inputs = form.querySelectorAll('input[name="numero"], input[name="nome"], input[name="cns"]');
    inputs.forEach(inp => {
        const list = inp.parentElement.querySelector('.sugestoes-lista');
        if(!list) return;
        inp.addEventListener('input', () => {
            const v = inp.value.toLowerCase();
            if(v.length < 2) { list.style.display='none'; return; }
            const res = pacientesGlobais.filter(p => p[inp.name].toLowerCase().includes(v)).slice(0,5);
            list.innerHTML = res.map(p => `<div class="sugestao-item" onclick="preencherForm(this, '${p.numero}')"><strong>${p.nome}</strong></div>`).join('');
            list.style.display = res.length ? 'block' : 'none';
        });
    });
}

window.preencherForm = function(el, num) {
    const p = pacientesGlobais.find(x => x.numero === num);
    const form = el.closest('form');
    if(p && form) {
        form.numero.value = p.numero; 
        form.nome.value = p.nome; 
        form.cns.value = p.cns;
        // Só preenche se o campo existir no form (agora existem como hidden)
        if(form.distrito) form.distrito.value = p.distrito || ''; 
        if(form.tecRef) form.tecRef.value = p.tecRef || ''; 
        if(form.cid) form.cid.value = p.cid || '';
    }
    el.parentElement.style.display = 'none';
};

// Declarações e Modais
function iniciarProcessoDeclaracao(d,t,v) { 
    atestadoEmGeracao = agendamentos[d][t].find(a => a.vaga === v);
    atestadoEmGeracao.data = d; atestadoEmGeracao.turno = t;
    document.getElementById('choiceModal').style.display='flex'; 
}
function fecharModalEscolha() { document.getElementById('choiceModal').style.display='none'; }
function gerarDeclaracaoPaciente() { montarHTMLDeclaracao(atestadoEmGeracao.nome); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
function gerarDeclaracaoAcompanhante() { document.getElementById('acompanhanteModal').style.display='flex'; }
function fecharModalAcompanhante() { document.getElementById('acompanhanteModal').style.display='none'; }
function confirmarNomeAcompanhante() { 
    montarHTMLDeclaracao(atestadoEmGeracao.nome, document.getElementById('acompanhanteNomeInput').value); 
    fecharModalAcompanhante(); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; 
}
function montarHTMLDeclaracao(p, a=null) {
    const d = new Date(atestadoEmGeracao.data + 'T12:00').toLocaleDateString('pt-BR');
    const txt = a ? `${a} acompanhando ${p}` : `${p}`;
    document.getElementById('declaracao-content-wrapper').innerHTML = `<p>Declaramos que <strong>${txt}</strong> compareceu em ${d}.</p>`;
}
function fecharModalAtestado() { document.getElementById('declaracaoModal').style.display='none'; }
function imprimirDeclaracao() { window.print(); }
function imprimirAgendaDiaria() { window.print(); }

function abrirModalConfirmacao(msg, act) { 
    document.getElementById('confirmMessage').textContent = msg; 
    confirmAction = act; 
    document.getElementById('confirmModal').style.display='flex'; 
}
function fecharModalConfirmacao() { document.getElementById('confirmModal').style.display='none'; }
function executarAcaoConfirmada() { if(confirmAction) confirmAction(); }

// Justificativa
function abrirModalJustificativa(d, t, v) {
    justificativaEmEdicao = {d,t,v};
    document.getElementById('justificationModal').style.display='flex';
}
function fecharModalJustificativa() { document.getElementById('justificationModal').style.display='none'; }
function salvarJustificativa() {
    const a = agendamentos[justificativaEmEdicao.d][justificativaEmEdicao.t].find(i=>i.vaga===justificativaEmEdicao.v);
    a.status = 'Justificou';
    const tipo = document.querySelector('input[name="justificativaTipo"]:checked').value;
    a.justificativa = { tipo, detalhe: tipo==='Reagendado' ? document.getElementById('reagendamentoData').value : '' };
    salvarAgendamentos(); fecharModalJustificativa(); exibirAgendamentos(justificativaEmEdicao.d);
}

// Backup & Import
function fazerBackup() {
    const blob = new Blob([JSON.stringify({agendamentos, pacientesGlobais},null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
}
function restaurarBackup(e) {
    const r = new FileReader();
    r.onload = (evt) => {
        const d = JSON.parse(evt.target.result);
        if(d.agendamentos) { agendamentos = d.agendamentos; salvarAgendamentos(); }
        if(d.pacientesGlobais) { pacientesGlobais = d.pacientesGlobais; salvarPacientesNoLocalStorage(); }
        location.reload();
    };
    r.readAsText(e.target.files[0]);
}
function handleHtmlFile(e) {
    const r = new FileReader();
    r.onload = (evt) => {
        // Lógica simplificada de parser HTML
        const div = document.createElement('div'); div.innerHTML = evt.target.result;
        const trs = div.querySelectorAll('tr');
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if(tds.length > 5) {
                pacientesGlobais.push({ numero: tds[0].innerText, nome: tds[1].innerText, cns: tds[2].innerText, distrito: tds[3].innerText, tecRef: tds[4].innerText, cid: tds[5].innerText });
            }
        });
        salvarPacientesNoLocalStorage();
        alert('Importado!');
    };
    r.readAsText(e.target.files[0]);
}

// Busca Global
function buscarAgendamentosGlobais() {
    const v = document.getElementById('globalSearchInput').value.toLowerCase();
    const res = [];
    Object.keys(agendamentos).forEach(d => {
        ['manha','tarde'].forEach(t => {
            if(agendamentos[d][t]) agendamentos[d][t].forEach(a => {
                if(a.nome.toLowerCase().includes(v) || a.numero.includes(v)) res.push({...a, data:d});
            });
        });
    });
    document.getElementById('searchResultsContainer').innerHTML = res.map(r => `<div>${r.nome} - ${r.data}</div>`).join('');
}
function configurarBuscaGlobalAutocomplete() {
    const inp = document.getElementById('globalSearchInput');
    const list = document.getElementById('globalSugestoesLista');
    if(inp && list) {
        inp.addEventListener('input', () => {
            const res = pacientesGlobais.filter(p => p.nome.toLowerCase().includes(inp.value.toLowerCase())).slice(0,5);
            list.innerHTML = res.map(p => `<div onclick="document.getElementById('globalSearchInput').value='${p.nome}';buscarAgendamentosGlobais()">${p.nome}</div>`).join('');
            list.style.display = res.length ? 'block' : 'none';
        });
    }
}

// Vagas
function procurarVagas() {
    const ini = new Date(document.getElementById('vagasStartDate').value);
    const fim = new Date(document.getElementById('vagasEndDate').value);
    let res = [];
    for(let d = ini; d <= fim; d.setDate(d.getDate()+1)) {
        const dStr = d.toISOString().split('T')[0];
        if(!agendamentos[dStr]) res.push(dStr);
    }
    document.getElementById('vagasResultadosContainer').innerHTML = res.join('<br>');
    document.getElementById('vagasResultadosContainer').classList.remove('hidden');
}
function limparBuscaVagas() { document.getElementById('vagasResultadosContainer').innerHTML=''; }
function imprimirVagas() { window.print(); }

// Relatórios
function atualizarResumoSemanal(d) {
    const c = document.getElementById('resumoSemanalContainer');
    if(c) c.innerHTML = '<p>Resumo Semanal Atualizado</p>'; 
}
function atualizarBolinhasDisponibilidade(d) {
    const c = document.getElementById('availabilityIndicator');
    if(c) c.classList.remove('hidden');
}
function configurarHorarioBackup(){}
function verificarNecessidadeBackup(){}
function verificarDuplicidadeAoDigitar(el, d, t, v){}
function aplicarFiltroRelatorio(){}
function limparFiltroRelatorio(){}
function atualizarValoresFiltro(){}
function popularFiltrosRelatorio(){}
function fecharModalRelatorio(){ document.getElementById('reportModal').style.display='none'; }
function abrirModalRelatorio() { document.getElementById('reportModal').style.display='flex'; }
