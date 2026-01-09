/* script.js - VERSÃO FINAL (CORREÇÃO DE ACENTUAÇÃO E VISUAL) */
'use strict';

console.log("Sistema Iniciado: Correção de Encoding (ISO-8859-1) Aplicada");

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
    try {
        agendamentos = JSON.parse(localStorage.getItem('agenda_completa_final')) || {};
        pacientesGlobais = JSON.parse(localStorage.getItem('pacientes_dados')) || [];
        diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados')) || {};
        feriadosDesbloqueados = JSON.parse(localStorage.getItem('feriados_desbloqueados')) || {};
        pacientes = [...pacientesGlobais];
    } catch(e) {}

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
    atualizarResumoMensal();
    atualizarResumoSemanal(new Date());
    verificarDadosCarregados();
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}

// ============================================
// 3. RENDERIZAÇÃO
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
                    ${bloqueio?.manha ? criarBlockedTurnoState('Manhã', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(ag.manha, 'manha', data)}
                </div>
                <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">
                    ${bloqueio?.tarde ? criarBlockedTurnoState('Tarde', bloqueio.motivo, bloqueio.isHoliday) : gerarVagasTurno(ag.tarde, 'tarde', data)}
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
                        <button class="btn btn-danger btn-cancel-appointment" onclick="abrirModalConfirmacao('Cancelar?', () => executarCancelamento('${data}','${turno}',${i}))">Cancelar</button>
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

function agendarPaciente(event, data, turno, vaga) {
    event.preventDefault();
    const form = event.target;
    // Proteção básica para não quebrar se o HTML não tiver o campo
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

// --- FUNÇÕES COMPLEMENTARES ---

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

function iniciarEdicao(data, turno, vaga) { slotEmEdicao = { data, turno, vaga }; exibirAgendamentos(data); }
function cancelarEdicao() { slotEmEdicao = null; exibirAgendamentos(dataSelecionada); }
function limparFormulario(btn) { 
    const f = btn.closest('form'); 
    if(f) { f.reset(); f.querySelector('[name="numero"]')?.focus(); } 
}
function marcarStatus(d, t, v, s) {
    const ag = agendamentos[d]?.[t]?.find(a => a.vaga === v);
    if (!ag) return;
    if (s === 'Justificou') { abrirModalJustificativa(d, t, v); return; }
    ag.status = (ag.status === s) ? 'Aguardando' : s;
    if (ag.status !== 'Justificou') delete ag.justificativa;
    salvarAgendamentos(); exibirAgendamentos(d);
}

function executarCancelamento(d, t, v) {
    if (!agendamentos[d]?.[t]) return;
    const idx = agendamentos[d][t].findIndex(a=>a.vaga===v);
    if(idx !== -1) {
        agendamentos[d][t].splice(idx,1);
        if (agendamentos[d][t].length === 0) delete agendamentos[d][t];
        if (Object.keys(agendamentos[d]).length === 0) delete agendamentos[d];
        salvarAgendamentos(); selecionarDia(d, document.querySelector(`.day[data-date="${d}"]`)); mostrarNotificacao('Cancelado com sucesso.', 'info');
    }
    fecharModalConfirmacao();
}

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

function mostrarNotificacao(msg, tipo='info') {
    const c = document.getElementById('floating-notifications');
    if(!c) return;
    const n = document.createElement('div'); n.className = `floating-notification ${tipo}`; n.textContent = msg;
    c.appendChild(n); setTimeout(()=>n.remove(), 5000);
}

// Declarações, Modais e Impressão
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
    // [ARCOSAFE-FIX] Força leitura ANSI para corrigir erro de acentos ()
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

// INICIALIZAÇÃO FINAL
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('limpezaSucesso')) mostrarNotificacao("Dados apagados.", 'success');
    inicializarLogin();
});
