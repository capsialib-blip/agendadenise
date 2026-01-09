/* script.js - VERSÃO FINAL (FUNCIONALIDADE RESTAURADA BASEADA NO SCRIPT.TXT) */
'use strict';

console.log("Sistema Iniciado: Funcionalidade de Botões e Exclusão Restaurada");

// [ARCOSAFE] Configuração do Firebase
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
    console.log("Firebase inicializado com sucesso.");
} catch (e) {
    console.error("Erro ao inicializar Firebase.", e);
}

// ============================================
// 1. VARIÁVEIS GLOBAIS
// ============================================
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

// ============================================
// 2. LOGIN E INICIALIZAÇÃO
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
    
    // Recuperação de dados locais
    try {
        agendamentos = JSON.parse(localStorage.getItem('agenda_completa_final')) || {};
        pacientesGlobais = JSON.parse(localStorage.getItem('pacientes_dados')) || [];
        diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados')) || {};
        feriadosDesbloqueados = JSON.parse(localStorage.getItem('feriados_desbloqueados')) || {};
        pacientes = [...pacientesGlobais];
    } catch(e) {
        agendamentos = {};
        pacientesGlobais = [];
        diasBloqueados = {};
        feriadosDesbloqueados = {};
    }

    // Sincronização Firebase
    if (database) {
        database.ref('agendamentos').on('value', (s) => {
            if (s.val()) {
                agendamentos = s.val();
                localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
                atualizarUI();
            }
        });
        database.ref('dias_bloqueados').on('value', (s) => {
            if (s.val()) {
                diasBloqueados = s.val();
                localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
                atualizarUI();
            }
        });
        database.ref('pacientes').on('value', (s) => {
            if (s.val()) {
                pacientesGlobais = s.val();
                pacientes = [...pacientesGlobais];
                localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
                verificarDadosCarregados();
            }
        });
        database.ref('feriados_desbloqueados').on('value', (s) => {
            if (s.val()) {
                feriadosDesbloqueados = s.val();
                localStorage.setItem('feriados_desbloqueados', JSON.stringify(feriadosDesbloqueados));
                atualizarUI();
            }
        });
    }

    configurarHorarioBackup();
    setInterval(verificarNecessidadeBackup, 5000);
    configurarEventListenersApp();
    atualizarUI();
    verificarNecessidadeBackup();
    configurarBuscaGlobalAutocomplete();
    configurarVagasEventListeners();
    configurarAutocompleteAssinatura();
}

function atualizarUI() {
    atualizarCalendario();
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    verificarDadosCarregados();
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}

// ============================================
// 3. CALENDÁRIO E DATA
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

function getFeriados(ano) {
    function calcularPascoa(a) {
        const c=Math.floor, d=a%19, e=c(a/100), f=a%100, g=c(e/4), h=e%4, i=c((e+8)/25), j=c((e-i+1)/3), k=(19*d+e-g-j+15)%30, l=c(f/4), m=f%4, n=(32+2*h+2*l-k-m)%7, o=c((d+11*k+22*n)/451), p=c((k+n-7*o+114)/31), q=(k+n-7*o+114)%31+1;
        return new Date(a,p-1,q);
    }
    const pascoa = calcularPascoa(ano);
    const umDia = 86400000;
    const map = new Map();
    const fixos = [
        {m:1,d:1,n:"Confraternização Universal"},{m:4,d:21,n:"Tiradentes"},{m:5,d:1,n:"Dia do Trabalho"},
        {m:9,d:7,n:"Independência do Brasil"},{m:10,d:12,n:"Nossa Senhora Aparecida"},{m:11,d:2,n:"Finados"},
        {m:11,d:15,n:"Proclamação da República"},{m:12,d:25,n:"Natal"}
    ];
    fixos.forEach(f => map.set(`${ano}-${String(f.m).padStart(2,'0')}-${String(f.d).padStart(2,'0')}`, f.n));
    const moveis = [
        {d:new Date(pascoa.getTime()-47*umDia), n:"Carnaval"},
        {d:new Date(pascoa.getTime()-2*umDia), n:"Sexta-feira Santa"},
        {d:new Date(pascoa.getTime()+60*umDia), n:"Corpus Christi"}
    ];
    moveis.forEach(f => map.set(f.d.toISOString().split('T')[0], f.n));
    return map;
}

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
    const hoje = new Date().toISOString().split('T')[0];

    for (let i = 0; i < primeiroDia; i++) grid.appendChild(document.createElement('div'));

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dStr = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const diaSemana = new Date(dStr + "T00:00:00").getDay();
        const el = document.createElement('div');
        el.className = 'day'; el.textContent = dia; el.setAttribute('data-date', dStr);

        const feriado = feriadosDoAno.get(dStr);
        if (feriado && !feriadosDesbloqueados[dStr]) {
            el.classList.add('day-holiday'); el.title = feriado;
            if (!diasBloqueados[dStr] || !diasBloqueados[dStr].manual) {
                diasBloqueados[dStr] = { diaInteiro: true, motivo: feriado, isHoliday: true };
            }
        }
        
        const bloq = diasBloqueados[dStr];
        let isBlocked = false;
        if (bloq) {
            if (bloq.diaInteiro || (bloq.manha && bloq.tarde)) { el.classList.add('blocked-day'); isBlocked = true; }
            else { if (bloq.manha) el.classList.add('blocked-morning'); if (bloq.tarde) el.classList.add('blocked-afternoon'); }
        }

        if (diaSemana === 0 || diaSemana === 6) {
            el.classList.add('weekend');
        } else {
            el.classList.add('workday');
            el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); selecionarDia(dStr, el); };
            const temAgendamentos = agendamentos[dStr] && ((agendamentos[dStr].manha?.length) || (agendamentos[dStr].tarde?.length));
            if (temAgendamentos && !isBlocked) el.classList.add('day-has-appointments');
        }

        if (dStr === hoje) el.classList.add('today');
        if (dStr === dataSelecionada) el.classList.add('selected');
        grid.appendChild(el);
    }
    container.appendChild(grid);
}

// ============================================
// 4. RENDERIZAÇÃO DOS CARDS
// ============================================

function calcularResumoMensal(data) {
    const ano = new Date(data).getFullYear();
    const mes = new Date(data).getMonth();
    const daysInMonth = new Date(ano, mes + 1, 0).getDate();
    let businessDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(ano, mes, i).getDay();
        if (d !== 0 && d !== 6) businessDays++;
    }
    const capTotal = businessDays * 16;
    let occ = 0, abs = 0, att = 0;
    const prefix = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    
    Object.keys(agendamentos).forEach(k => {
        if (k.startsWith(prefix)) {
            ['manha', 'tarde'].forEach(t => {
                if (agendamentos[k][t]) agendamentos[k][t].forEach(a => {
                    occ++;
                    if (a.status === 'Faltou' || a.status === 'Justificou') abs++;
                    if (a.status === 'Compareceu') att++;
                });
            });
        }
    });

    return {
        percentage: capTotal ? ((occ/capTotal)*100).toFixed(1) : 0,
        occupiedCount: occ, capacityTotal: capTotal,
        abstencaoCount: abs, abstencaoPercent: occ ? ((abs/occ)*100).toFixed(1) : 0,
        atendimentoCount: att, atendimentoPercent: occ ? ((att/occ)*100).toFixed(1) : 0
    };
}

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
        const btn = document.getElementById('btnLockDay');
        if (btn) btn.addEventListener('click', () => gerenciarBloqueioDia(data));
        return;
    }

    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    const totalHoje = (agendamentosDia.manha?.length || 0) + (agendamentosDia.tarde?.length || 0);

    container.innerHTML = `
        <div class="appointment-header">
            <h2 class="appointment-title">${dataFmt}</h2>
            <div class="header-actions">
                <button id="btnPrint" class="btn btn-secondary btn-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer-fill" viewBox="0 0 16 16"><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2z"/><path d="M11 6.5a.5.5 0 0 1-1 0V3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3z"/><path d="M2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg> <span>Imprimir</span></button>
                <button id="btnLockDay" class="btn-icon btn-lock"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock-fill" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg></button>
            </div>
        </div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">
            <div class="card-content">
                <div class="dashboard-stats-grid">
                    <div class="stats-card-mini"><h4><span>Hoje</span><i class="bi bi-calendar-event"></i></h4><div class="stats-value-big val-neutral">${totalHoje}</div></div>
                    <div class="stats-card-mini"><h4><span>Ocupação</span><i class="bi bi-graph-up"></i></h4><div class="stats-value-big val-primary">${metrics.percentage}%</div></div>
                    <div class="stats-card-mini"><h4><span>Abstenções</span><i class="bi bi-x-circle" style="color: var(--color-danger);"></i></h4><div class="stats-value-big val-danger">${metrics.abstencaoCount}</div></div>
                    <div class="stats-card-mini"><h4><span>Atendimentos</span><i class="bi bi-check-circle" style="color: var(--color-success);"></i></h4><div class="stats-value-big val-success">${metrics.atendimentoCount}</div></div>
                </div>
                <div class="tabs">
                    <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mostrarTurno('manha')">Manhã</button>
                    <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mostrarTurno('tarde')">Tarde</button>
                </div>
                <div id="turnoIndicator" class="turno-indicator ${turnoAtivo}">
                    ${turnoAtivo === 'manha' ? '<i class="bi bi-brightness-high-fill"></i> MANHÃ (08:00 - 12:00)' : '<i class="bi bi-moon-stars-fill"></i> TARDE (13:00 - 17:00)'}
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

    document.getElementById('btnPrint')?.addEventListener('click', () => imprimirAgendaDiaria(data));
    document.getElementById('btnLockDay')?.addEventListener('click', () => gerenciarBloqueioDia(data));
    
    setTimeout(() => {
        document.querySelectorAll('.vaga-form').forEach(configurarAutopreenchimento);
        document.querySelectorAll('input[name="agendadoPor"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                const map = {'01': 'Alessandra', '02': 'Nicole'};
                if (map[e.target.value.trim()]) e.target.value = map[e.target.value.trim()];
            });
        });
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
                    ${agendamento && !estaEditando ? `
                    <div class="vaga-header-tags">
                        ${agendamento.primeiraConsulta ? '<span class="primeira-consulta-tag" title="Primeira Consulta">1ª Consulta</span>' : ''}
                        <span class="status-tag ${statusClassName}">${status}</span>
                    </div>` : ''}
                </div>
                <div class="vaga-content">
        `;

        if (agendamento && !estaEditando) {
            const justificativaHTML = (agendamento.status === 'Justificou' && agendamento.justificativa) ? 
                `<div class="justificativa-display"><p><strong>Justificativa:</strong> ${agendamento.justificativa.tipo === 'Reagendado' ? `Reagendado para ${new Date(agendamento.justificativa.detalhe + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Entrará em contato com o TR.'}</p></div>` : '';
            
            html += `
                <div class="agendamento-info">
                    <div class="info-content">
                        <div class="paciente-header">
                            <h4 class="paciente-nome">${agendamento.nome}</h4>
                            <div class="paciente-numero"><span class="paciente-numero-value">Nº ${agendamento.numero}</span></div>
                        </div>
                        <div class="paciente-info">
                            <p class="info-line"><span class="info-icon icon-cns"><i class="bi bi-person-vcard"></i></span><strong>CNS:</strong> ${agendamento.cns}</p>
                            ${agendamento.distrito ? `<p class="info-line"><span class="info-icon icon-distrito"><i class="bi bi-geo-alt-fill"></i></span><strong>Distrito:</strong> ${agendamento.distrito}</p>` : ''}
                            ${agendamento.tecRef ? `<p class="info-line"><span class="info-icon icon-tecref"><i class="bi bi-people-fill"></i></span><strong>Téc. Ref.:</strong> ${agendamento.tecRef}</p>` : ''}
                            ${agendamento.agendadoPor ? `<p class="info-line"><span class="info-icon"><i class="bi bi-person-check-fill"></i></span><strong>Agendado por:</strong> ${agendamento.agendadoPor}</p>` : ''}
                            ${agendamento.cid ? `<p class="info-line"><span class="info-icon icon-cid"><i class="bi bi-search"></i></span><strong>CID:</strong> ${agendamento.cid.toUpperCase()}</p>` : ''}
                        </div>
                        ${justificativaHTML}
                        <div class="status-buttons-container">
                            <button class="btn btn-sm btn-status ${status === 'Compareceu' ? 'active' : ''}" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Compareceu')"><i class="bi bi-check-circle-fill"></i> Compareceu</button>
                            <button class="btn btn-sm btn-status ${status === 'Faltou' ? 'active' : ''}" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Faltou')"><i class="bi bi-x-circle-fill"></i> Faltou</button>
                            <button class="btn btn-sm btn-status ${status === 'Justificou' ? 'active' : ''}" onclick="marcarStatus('${data}', '${turno}', ${i}, 'Justificou')"><i class="bi bi-exclamation-circle-fill"></i> Justificou</button>
                        </div>
                        ${(agendamento.solicitacoes && agendamento.solicitacoes.length > 0) ? `<div class="solicitacoes-display"><strong class="solicitacoes-display-title">Solicitações:</strong><div class="tags-container">${agendamento.solicitacoes.map(item => `<span class="solicitacao-tag">${item}</span>`).join('')}</div></div>` : ''}
                        ${agendamento.observacao ? `<div class="observacao-display"><p><strong>Observação:</strong> ${agendamento.observacao.replace(/\n/g, '<br>')}</p></div>` : ''}
                    </div>
                    <div class="agendamento-acoes">
                        <button class="btn btn-edit" onclick="iniciarEdicao('${data}', '${turno}', ${i})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg> <span>Editar</span></button>
                        <button class="btn btn-secondary btn-sm" onclick="iniciarProcessoDeclaracao('${data}', '${turno}', ${i})">Imprimir Declaração</button>
                        <button class="btn btn-danger btn-cancel-appointment" onclick="abrirModalConfirmacao('Cancelar?', () => executarCancelamento('${data}', '${turno}', ${i}))">Cancelar</button>
                    </div>
                </div>`;
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
                                <input type="text" name="numero" required class="form-input" maxlength="5" pattern="[0-9]{4,5}" value="${dadosPreenchimento.numero || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}', '${turno}', ${i})">
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
                                <input type="text" name="cns" required class="form-input" maxlength="15" pattern="[0-9]{15}" value="${dadosPreenchimento.cns || ''}" onblur="verificarDuplicidadeAoDigitar(this, '${data}', '${turno}', ${i})">
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
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Passe Livre Municipal" id="pl_municipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Municipal') ? 'checked' : ''}><label for="pl_municipal_${uniqueIdPrefix}">Passe Livre Municipal</label></div>
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Passe Livre Intermunicipal" id="pl_intermunicipal_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Intermunicipal') ? 'checked' : ''}><label for="pl_intermunicipal_${uniqueIdPrefix}">Passe Livre Intermunicipal</label></div>
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Passe Livre Interestadual" id="pl_interestadual_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Passe Livre Interestadual') ? 'checked' : ''}><label for="pl_interestadual_${uniqueIdPrefix}">Passe Livre Interestadual</label></div>
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Atestado INSS" id="atestado_inss_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Atestado INSS') ? 'checked' : ''}><label for="atestado_inss_${uniqueIdPrefix}">Atestado INSS</label></div>
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Atestado Escola" id="atestado_escola_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Atestado Escola') ? 'checked' : ''}><label for="atestado_escola_${uniqueIdPrefix}">Atestado para Escola</label></div>
                                <div class="checkbox-item"><input type="checkbox" name="solicitacao" value="Fraldas" id="fraldas_${uniqueIdPrefix}" ${solicitacoesSalvas.includes('Fraldas') ? 'checked' : ''}><label for="fraldas_${uniqueIdPrefix}">Fraldas</label></div>
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
                            ${estaEditando ? 
                                `<button type="button" class="btn btn-secondary ${turno}" onclick="cancelarEdicao()">Cancelar Edição</button><button type="submit" class="btn btn-success ${turno}">Salvar Alterações</button>` : 
                                `<button type="submit" class="btn btn-success ${turno}">Agendar</button><button type="button" class="btn btn-secondary ${turno}" onclick="limparFormulario(this)">Limpar</button>`}
                        </div>
                    </div>
                </form>
            `;
        }
        html += '</div></div>';
    }
    return html + '</div>';
}

// --- FUNÇÕES DE AÇÃO DOS BOTÕES (RESTAURADAS) ---

function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault();
    const form = event.target;
    const solicitacoes = Array.from(form.querySelectorAll('input[name="solicitacao"]:checked')).map(cb => cb.value);
    const numeroPaciente = form.querySelector('[name="numero"]').value.trim();

    if (agendamentos[data]) {
        const dia = [...(agendamentos[data].manha || []), ...(agendamentos[data].tarde || [])];
        const dup = dia.find(ag => ag.numero === numeroPaciente && (!slotEmEdicao || slotEmEdicao.vaga !== vaga));
        if (dup) {
            const erroAntigo = form.querySelector('.form-error-message');
            if(erroAntigo) erroAntigo.remove();
            const erroEl = document.createElement('p'); erroEl.className='form-error-message'; erroEl.textContent='ERRO: Paciente já agendado para este dia.';
            const act = form.querySelector('.form-actions-wrapper');
            if(act) form.insertBefore(erroEl, act);
            return;
        }
    }

    const novoAgendamento = {
        vaga: vaga,
        numero: numeroPaciente,
        nome: form.querySelector('[name="nome"]')?.value.trim() || '',
        cns: form.querySelector('[name="cns"]')?.value.trim() || '',
        distrito: form.querySelector('[name="distrito"]')?.value.trim() || '',
        tecRef: form.querySelector('[name="tecRef"]')?.value.trim() || '',
        cid: form.querySelector('[name="cid"]')?.value.trim().toUpperCase() || '',
        agendadoPor: form.querySelector('[name="agendadoPor"]')?.value.trim() || '',
        observacao: form.querySelector('[name="observacao"]')?.value.trim() || '',
        primeiraConsulta: form.querySelector('[name="primeiraConsulta"]')?.checked || false,
        solicitacoes: solicitacoes,
        status: 'Aguardando'
    };

    if (!agendamentos[data]) agendamentos[data] = {};
    if (!agendamentos[data][turno]) agendamentos[data][turno] = [];

    const index = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    if (index !== -1) agendamentos[data][turno][index] = { ...agendamentos[data][turno][index], ...novoAgendamento };
    else agendamentos[data][turno].push(novoAgendamento);

    agendamentos[data][turno].sort((a, b) => a.vaga - b.vaga);
    salvarAgendamentos();
    slotEmEdicao = null;
    selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`));
    mostrarNotificacao('Agendamento salvo com sucesso!', 'success');
}

function iniciarEdicao(data, turno, vaga) { slotEmEdicao = { data, turno, vaga }; exibirAgendamentos(data); }
function cancelarEdicao() { slotEmEdicao = null; exibirAgendamentos(dataSelecionada); }
function limparFormulario(btn) { 
    const f = btn.closest('form'); 
    if(f) { f.reset(); f.querySelector('[name="numero"]')?.focus(); } 
}

// CORREÇÃO CRÍTICA: A função marcarStatus estava com parâmetros incorretos na versão anterior
function marcarStatus(data, turno, vaga, novoStatus) {
    const agendamento = agendamentos[data]?.[turno]?.find(a => a.vaga === vaga);
    if (!agendamento) return;
    if (novoStatus === 'Justificou') { abrirModalJustificativa(data, turno, vaga); return; }
    
    agendamento.status = (agendamento.status === novoStatus) ? 'Aguardando' : novoStatus;
    if (agendamento.status !== 'Justificou') delete agendamento.justificativa;
    
    salvarAgendamentos();
    exibirAgendamentos(data);
    atualizarResumoMensal();
}

// CORREÇÃO CRÍTICA: A exclusão estava falhando silenciosamente
function executarCancelamento(data, turno, vaga) {
    if (!agendamentos[data]?.[turno]) return;
    const index = agendamentos[data][turno].findIndex(a => a.vaga === vaga);
    
    if (index !== -1) {
        agendamentos[data][turno].splice(index, 1);
        
        // Limpa objetos vazios para evitar sujeira no DB
        if (agendamentos[data][turno].length === 0) delete agendamentos[data][turno];
        if (Object.keys(agendamentos[data]).length === 0) delete agendamentos[data];

        salvarAgendamentos();
        
        // Atualiza a UI imediatamente
        selecionarDia(data, document.querySelector(`.day[data-date="${data}"]`));
        atualizarCalendario();
        atualizarResumoMensal();
        atualizarResumoSemanal(new Date(data + 'T12:00:00'));
        mostrarNotificacao('Cancelado com sucesso.', 'info');
    }
    fecharModalConfirmacao();
}

function mostrarTurno(turno) {
    turnoAtivo = turno;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn.${turno}`)?.classList.add('active');
    document.querySelectorAll('.turno-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`turno-${turno}`)?.classList.add('active');
    const ind = document.getElementById('turnoIndicator');
    if (ind) {
        ind.className = `turno-indicator ${turno}`;
        ind.innerHTML = turno==='manha' ? '<i class="bi bi-brightness-high-fill"></i> MANHÃ (08:00 - 12:00)' : '<i class="bi bi-moon-stars-fill"></i> TARDE (13:00 - 17:00)';
    }
}

// --- OUTRAS FUNÇÕES ---

function configurarAutopreenchimento(form) {
    const inputs = form.querySelectorAll('input[name="numero"], input[name="nome"], input[name="cns"], input[name="tecRef"]');
    inputs.forEach(input => {
        const container = input.closest('.autocomplete-container');
        if (!container) return;
        const lista = container.querySelector('.sugestoes-lista');
        if (!lista) return;
        input.addEventListener('input', () => {
            const v = input.value.toLowerCase();
            const campo = input.name;
            if (v.length < 2) { lista.style.display = 'none'; return; }
            const res = pacientesGlobais.filter(p => (p[campo] ? p[campo].toString().toLowerCase() : '').includes(v)).slice(0, 5);
            lista.innerHTML = res.map(p => `<div class="sugestao-item" data-numero="${p.numero}"><strong>${p.nome}</strong> (Nº: ${p.numero})</div>`).join('');
            lista.style.display = res.length ? 'block' : 'none';
        });
        lista.addEventListener('click', (e) => {
            const item = e.target.closest('.sugestao-item');
            if (item) {
                const p = pacientesGlobais.find(x => x.numero === item.dataset.numero);
                if (p) {
                    const f = form;
                    if(f.querySelector('[name="numero"]')) f.querySelector('[name="numero"]').value = p.numero||'';
                    if(f.querySelector('[name="nome"]')) f.querySelector('[name="nome"]').value = p.nome||'';
                    if(f.querySelector('[name="cns"]')) f.querySelector('[name="cns"]').value = p.cns||'';
                    if(f.querySelector('[name="distrito"]')) f.querySelector('[name="distrito"]').value = p.distrito||'';
                    if(f.querySelector('[name="tecRef"]')) f.querySelector('[name="tecRef"]').value = p.tecRef||'';
                    if(f.querySelector('[name="cid"]')) f.querySelector('[name="cid"]').value = p.cid||'';
                }
                lista.style.display='none';
            }
        });
    });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) form.querySelectorAll('.sugestoes-lista').forEach(l => l.style.display='none'); });
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
        const dia = [...(agendamentos[data].manha || []), ...(agendamentos[data].tarde || [])];
        const duplicado = dia.find(ag => {
            let valorAgendamento = '';
            if (campoVerificacao === 'numero') valorAgendamento = ag.numero;
            else if (campoVerificacao === 'nome') valorAgendamento = ag.nome.toLowerCase();
            else if (campoVerificacao === 'cns') valorAgendamento = ag.cns;
            const encontrado = valorAgendamento === valorVerificacao;
            if (slotEmEdicao && slotEmEdicao.data === data && slotEmEdicao.turno === turno && slotEmEdicao.vaga === vaga) return false;
            return encontrado;
        });
        if (duplicado) {
            const erroEl = document.createElement('p'); erroEl.className = 'form-error-message'; erroEl.textContent = 'ERRO: Paciente já agendado para este dia.';
            const actionsWrapper = form.querySelector('.form-actions-wrapper');
            if (actionsWrapper) form.insertBefore(erroEl, actionsWrapper);
        }
    }
}

// --- MODAIS, IMPRESSÃO E HELPERS ---

function criarBlockedState(data, dataFmt, motivo, tipo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x-fill' : 'bi-lock-fill';
    return `<div class="appointment-header"><h2 class="appointment-title">${dataFmt}</h2><div class="header-actions"><button id="btnLockDay" class="btn-icon btn-lock"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-unlock-fill" viewBox="0 0 16 16"><path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2"/></svg></button></div></div><div class="glass-card" style="border-top-left-radius:0;border-top-right-radius:0;border-top:none;"><div class="card-content"><div class="blocked-state"><i class="bi ${icon} blocked-icon"></i><h3>Agenda Bloqueada</h3><p>Motivo: <strong>${motivo||'Não especificado'}</strong></p></div></div></div>`;
}
function criarBlockedTurnoState(turno, motivo, isHoliday) {
    const icon = isHoliday ? 'bi-calendar-x' : 'bi-lock-fill';
    return `<div class="blocked-state turno"><i class="bi ${icon} blocked-icon"></i><h4>Turno da ${turno} Bloqueado</h4><p>Motivo: <strong>${motivo||'Não especificado'}</strong></p></div>`;
}

function iniciarProcessoDeclaracao(d,t,v) { atestadoEmGeracao = { ...agendamentos[d][t].find(a=>a.vaga===v), data:d, turno:t }; document.getElementById('choiceModal').style.display='flex'; }
function fecharModalEscolha() { document.getElementById('choiceModal').style.display='none'; atestadoEmGeracao=null; }
function gerarDeclaracaoPaciente() { if(!atestadoEmGeracao)return; montarHTMLDeclaracao(atestadoEmGeracao.nome); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
function gerarDeclaracaoAcompanhante() { if(!atestadoEmGeracao)return; document.getElementById('acompanhanteModal').style.display='flex'; }
function fecharModalAcompanhante() { document.getElementById('acompanhanteModal').style.display='none'; }
function confirmarNomeAcompanhante() { 
    const nome = document.getElementById('acompanhanteNomeInput').value.trim();
    if(nome) { montarHTMLDeclaracao(atestadoEmGeracao.nome, nome); fecharModalAcompanhante(); fecharModalEscolha(); document.getElementById('declaracaoModal').style.display='flex'; }
}
function montarHTMLDeclaracao(p, a=null) {
    const dObj = new Date(atestadoEmGeracao.data + 'T12:00:00');
    const d = dObj.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
    const t = atestadoEmGeracao.turno === 'manha' ? 'manhã' : 'tarde';
    const cns = atestadoEmGeracao.cns;
    const txt = a ? `<strong>${a}</strong>, esteve presente nesta unidade, CAPS ia Liberdade, no período da ${t}, acompanhando o(a) paciente <strong>${p.toUpperCase()}</strong>, CNS <strong>${cns}</strong>` : `o(a) paciente <strong>${p.toUpperCase()}</strong>, CNS <strong>${cns}</strong>, esteve presente nesta unidade... no período da ${t}`;
    document.getElementById('declaracao-content-wrapper').innerHTML = `<h4>DECLARAÇÃO DE COMPARECIMENTO</h4><p>Declaramos, para os devidos fins, que ${txt}, participando de atividades relacionadas ao PTS.</p><br><br><p style="text-align:center">Salvador, ${d}.</p>`;
}
function fecharModalAtestado() { document.getElementById('declaracaoModal').style.display='none'; atestadoEmGeracao=null; try{document.getElementById('assinaturaInput').value='';}catch(e){} }
function imprimirDeclaracao() { 
    const n = document.getElementById('assinaturaNomePrint');
    if(!n || n.textContent.trim()==='' || n.textContent==='\u00A0') { mostrarNotificacao('Selecione um profissional para assinatura.', 'warning'); return; }
    handlePrint('printing-declaracao'); 
}
function imprimirAgendaDiaria(d) {
    const c = document.getElementById('print-container');
    if(!c) return;
    const dObj = new Date(d+'T12:00:00');
    const dia = String(dObj.getDate()).padStart(2,'0'); const mes = String(dObj.getMonth()+1).padStart(2,'0'); const ano = dObj.getFullYear();
    let html = `<h1>Agendamentos em ${dia}/${mes}/${ano}</h1>`;
    const criarT = (t, list) => {
        let tb = `<h2>${t}</h2><table class="agenda-table"><thead><tr><th>Nº</th><th>Paciente</th><th>Téc. Ref.</th><th>Obs</th></tr></thead><tbody>`;
        if(!list || !list.length) tb+='<tr><td colspan="4">Vazio</td></tr>';
        else list.forEach(a => tb+=`<tr><td>${a.numero}</td><td>${a.nome}</td><td>${a.tecRef||''}</td><td>${a.observacao||''}</td></tr>`);
        return tb+'</tbody></table>';
    };
    html += criarT('Manhã', agendamentos[d]?.manha) + criarT('Tarde', agendamentos[d]?.tarde);
    c.innerHTML = html;
    handlePrint('printing-agenda');
    setTimeout(()=>c.innerHTML='', 1000);
}
function imprimirVagas() { handlePrint('printing-vagas'); }
function handlePrint(cls) { 
    document.body.classList.add(cls); 
    window.print(); 
    document.body.classList.remove(cls); 
}

function abrirModalConfirmacao(msg, act) { document.getElementById('confirmMessage').textContent = msg; confirmAction = act; document.getElementById('confirmModal').style.display='flex'; }
function fecharModalConfirmacao() { document.getElementById('confirmModal').style.display='none'; confirmAction=null; }
function executarAcaoConfirmada() { if(confirmAction) confirmAction(); fecharModalConfirmacao(); }

function abrirModalJustificativa(d, t, v) { justificativaEmEdicao = {data:d, turno:t, vaga:v}; document.getElementById('justificationModal').style.display='flex'; }
function fecharModalJustificativa() { document.getElementById('justificationModal').style.display='none'; justificativaEmEdicao=null; }
function salvarJustificativa() {
    if(!justificativaEmEdicao) return;
    const ag = agendamentos[justificativaEmEdicao.data][justificativaEmEdicao.turno].find(a=>a.vaga===justificativaEmEdicao.vaga);
    ag.status = 'Justificou';
    const tipo = document.querySelector('input[name="justificativaTipo"]:checked').value;
    ag.justificativa = { tipo, detalhe: tipo==='Reagendado' ? document.getElementById('reagendamentoData').value : '' };
    salvarAgendamentos(); fecharModalJustificativa(); exibirAgendamentos(justificativaEmEdicao.data);
    mostrarNotificacao('Justificativa salva.', 'success');
}

function fazerBackup() { 
    const b = new Blob([JSON.stringify({agendamentos, pacientesGlobais, diasBloqueados, feriadosDesbloqueados},null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
}
function restaurarBackup(e) {
    const r = new FileReader(); r.onload=ev=>{
        try{ const d=JSON.parse(ev.target.result); agendamentos=d.agendamentos||{}; pacientesGlobais=d.pacientesGlobais||[]; diasBloqueados=d.diasBloqueados||{}; feriadosDesbloqueados=d.feriadosDesbloqueados||{}; salvarAgendamentos(); salvarPacientesNoLocalStorage(); location.reload(); }catch(err){alert('Erro backup');}
    }; r.readAsText(e.target.files[0]);
}
function handleHtmlFile(e) {
    const r = new FileReader(); r.onload=ev=>{
        const div=document.createElement('div'); div.innerHTML=ev.target.result;
        div.querySelectorAll('tr').forEach(tr=>{
             const tds=tr.querySelectorAll('td');
             if(tds.length>=6) {
                 const n={numero:tds[0].innerText.trim(), nome:tds[1].innerText.trim(), cns:tds[2].innerText.trim(), distrito:tds[3].innerText.trim(), tecRef:tds[4].innerText.trim(), cid:tds[5].innerText.trim()};
                 if(n.numero && /^\d+$/.test(n.numero)) {
                     const idx = pacientesGlobais.findIndex(p=>p.numero===n.numero);
                     if(idx>-1) pacientesGlobais[idx]=n; else pacientesGlobais.push(n);
                 }
             }
        });
        salvarPacientesNoLocalStorage(); mostrarNotificacao('Pacientes importados.', 'success');
    }; 
    // [ARCOSAFE-FIX] Força leitura ANSI para corrigir erro de acentos
    r.readAsText(e.target.files[0], 'ISO-8859-1');
}
function buscarAgendamentosGlobais() {
    const val = document.getElementById('globalSearchInput').value.toLowerCase();
    const res = [];
    Object.keys(agendamentos).forEach(d => {
        ['manha','tarde'].forEach(t => {
            if(agendamentos[d][t]) agendamentos[d][t].forEach(a => {
                if(a.nome.toLowerCase().includes(val) || a.numero.includes(val)) res.push({...a, data:d, turno:t});
            });
        });
    });
    const c = document.getElementById('searchResultsContainer');
    c.innerHTML = res.length ? res.map(r => `<div onclick="pularParaAgendamento('${r.data}')"><strong>${r.nome}</strong> - ${new Date(r.data+'T12:00:00').toLocaleDateString('pt-BR')} (${r.turno})</div>`).join('') : 'Nenhum encontrado.';
}
function pularParaAgendamento(d) {
    const obj = new Date(d+'T12:00:00'); mesAtual=obj.getMonth(); anoAtual=obj.getFullYear(); atualizarCalendario();
    setTimeout(()=>{ selecionarDia(d, document.querySelector(`.day[data-date="${d}"]`)); }, 100);
}
function procurarVagas() {
    const ini = new Date(document.getElementById('vagasStartDate').value);
    const fim = new Date(document.getElementById('vagasEndDate').value);
    const res = [];
    for(let d=new Date(ini); d<=fim; d.setDate(d.getDate()+1)) {
        const s = d.toISOString().split('T')[0];
        if(!agendamentos[s]) res.push(s);
    }
    document.getElementById('vagasResultadosContainer').innerHTML = res.join('<br>') || 'Nenhuma vaga livre.';
    document.getElementById('vagasResultadosContainer').classList.remove('hidden');
}
function limparBuscaVagas() { document.getElementById('vagasResultadosContainer').innerHTML=''; }
function configurarHorarioBackup(){}
function verificarNecessidadeBackup(){}
function aplicarFiltroRelatorio(){}
function limparFiltroRelatorio(){}
function atualizarValoresFiltro(){}
function popularFiltrosRelatorio(){}
function fecharModalRelatorio(){ document.getElementById('reportModal').style.display='none'; }
function abrirModalRelatorio() { document.getElementById('reportModal').style.display='flex'; }
function configurarBuscaGlobalAutocomplete(){}
function configurarAutocompleteAssinatura(){}
function selecionarDia(data, elemento) {
    slotEmEdicao = null;
    document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
    if (elemento) elemento.classList.add('selected');
    dataSelecionada = data;
    exibirAgendamentos(data);
    atualizarBolinhasDisponibilidade(data);
    atualizarResumoSemanal(new Date(data + 'T12:00:00'));
    const hint = document.getElementById('floatingDateHint');
    if (hint) {
        let txt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        hint.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
        hint.classList.add('visible');
    }
}
function goToToday() {
    const h = new Date(); mesAtual = h.getMonth(); anoAtual = h.getFullYear();
    atualizarCalendario();
    const dStr = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
    const el = document.querySelector(`.day[data-date="${dStr}"]`);
    if(el) selecionarDia(dStr, el);
}
function atualizarBolinhasDisponibilidade(d){}
function mostrarNotificacao(msg, tipo='info') {
    const c = document.getElementById('floating-notifications');
    if(!c) return;
    const n = document.createElement('div'); n.className = `floating-notification ${tipo}`; n.textContent = msg;
    c.appendChild(n); setTimeout(()=>n.remove(), 5000);
}
function confirmarBloqueio() {
    const t = document.getElementById('blockType').value;
    const m = document.getElementById('blockReason').value;
    diasBloqueados[dataSelecionada] = { motivo: m, diaInteiro: t==='all_day', manha: t==='all_day'||t==='morning', tarde: t==='all_day'||t==='afternoon' };
    salvarBloqueios(); atualizarUI(); document.getElementById('blockDayModal').style.display='none';
}
function abrirModalBloqueio() { document.getElementById('blockDayModal').style.display='flex'; }
function fecharModalBloqueio() { document.getElementById('blockDayModal').style.display='none'; }
function gerenciarBloqueioDia(d) {
    if(diasBloqueados[d]) {
        abrirModalConfirmacao("Desbloquear?", ()=> { delete diasBloqueados[d]; salvarBloqueios(); atualizarUI(); });
    } else {
        abrirModalBloqueio();
    }
}
function abrirModalLimpeza() { document.getElementById('clearDataModal').style.display='flex'; }
function fecharModalLimpeza() { document.getElementById('clearDataModal').style.display='none'; }
function executarLimpezaTotal() {
    if(document.getElementById('clearDataPassword').value==='apocalipse') {
        localStorage.clear(); sessionStorage.setItem('limpezaSucesso','true'); location.reload();
    } else { alert('Senha incorreta'); }
}
function togglePasswordVisibility() { const x=document.getElementById('clearDataPassword'); x.type=x.type==='password'?'text':'password'; }

// ============================================
// 3. CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================

function configurarEventListenersApp() {
    document.getElementById('btnHoje')?.addEventListener('click', goToToday);
    document.getElementById('btnMesAnterior')?.addEventListener('click', voltarMes);
    document.getElementById('btnProximoMes')?.addEventListener('click', avancarMes);
    
    const btnImportar = document.getElementById('btnImportar');
    if (btnImportar) btnImportar.addEventListener('click', () => document.getElementById('htmlFile')?.click());
    document.getElementById('htmlFile')?.addEventListener('change', handleHtmlFile);

    document.getElementById('btnLimparDados')?.addEventListener('click', abrirModalLimpeza);
    document.getElementById('btnBackup')?.addEventListener('click', fazerBackup);
    
    const btnRestaurar = document.getElementById('btnRestaurar');
    if (btnRestaurar) btnRestaurar.addEventListener('click', () => document.getElementById('restoreFile')?.click());
    document.getElementById('restoreFile')?.addEventListener('change', restaurarBackup);

    document.getElementById('btnDeclaracaoPaciente')?.addEventListener('click', gerarDeclaracaoPaciente);
    document.getElementById('btnDeclaracaoAcompanhante')?.addEventListener('click', gerarDeclaracaoAcompanhante);
    document.getElementById('btnCancelarChoice')?.addEventListener('click', fecharModalEscolha);
    document.getElementById('btnFecharDeclaracao')?.addEventListener('click', fecharModalAtestado);
    document.getElementById('btnImprimirDeclaracao')?.addEventListener('click', imprimirDeclaracao);
    document.getElementById('btnConfirmarAcompanhante')?.addEventListener('click', confirmarNomeAcompanhante);
    document.getElementById('btnCancelarAcompanhante')?.addEventListener('click', fecharModalAcompanhante);
    
    document.getElementById('acompanhanteNomeInput')?.addEventListener('keyup', (e) => { if (e.key === 'Enter') confirmarNomeAcompanhante(); });
    document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModalConfirmacao);
    document.getElementById('confirmButton')?.addEventListener('click', executarAcaoConfirmada);
    document.getElementById('btnCancelarJustificativa')?.addEventListener('click', fecharModalJustificativa);
    document.getElementById('btnConfirmarJustificativa')?.addEventListener('click', salvarJustificativa);
    document.getElementById('btnCancelarBloqueio')?.addEventListener('click', fecharModalBloqueio);
    document.getElementById('btnConfirmarBloqueio')?.addEventListener('click', confirmarBloqueio);
    document.getElementById('btnCancelClearData')?.addEventListener('click', fecharModalLimpeza);
    document.getElementById('btnConfirmClearData')?.addEventListener('click', executarLimpezaTotal);
    document.getElementById('togglePassword')?.addEventListener('click', togglePasswordVisibility);

    document.querySelectorAll('input[name="justificativaTipo"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const container = document.getElementById('reagendamentoDataContainer');
            if (container) container.style.display = e.target.value === 'Reagendado' ? 'block' : 'none';
        });
    });

    document.getElementById('globalSearchButton')?.addEventListener('click', buscarAgendamentosGlobais);
    document.getElementById('globalSearchInput')?.addEventListener('keyup', (e) => { if (e.key === 'Enter') buscarAgendamentosGlobais(); });

    document.getElementById('btnFecharReportModal')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnFecharReportModalFooter')?.addEventListener('click', fecharModalRelatorio);
    document.getElementById('btnPrintReport')?.addEventListener('click', () => handlePrint('printing-report'));
    document.getElementById('btnApplyFilter')?.addEventListener('click', aplicarFiltroRelatorio);
    document.getElementById('btnClearFilter')?.addEventListener('click', limparFiltroRelatorio);
    document.getElementById('reportFilterType')?.addEventListener('change', atualizarValoresFiltro);
    document.getElementById('btnVerRelatorioAnual')?.addEventListener('click', () => abrirModalRelatorio(null, 'current_year'));
    document.getElementById('btnBackupModalAction')?.addEventListener('click', () => { fazerBackup(); fecharModalBackup(); });
}

// INICIALIZAÇÃO FINAL
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('limpezaSucesso')) mostrarNotificacao("Dados apagados.", 'success');
    inicializarLogin();
});
