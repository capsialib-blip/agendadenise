/* script.js - [ARCOSAFE RECOVERY BUILD V40.2] */
'use strict';

// ============================================
// 1. CONFIGURAÇÃO DO FIREBASE (CRÍTICA)
// ============================================
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
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        console.log("🛡️ ARCOSAFE: Firebase conectado com sucesso.");
    } else {
        console.warn("⚠️ ARCOSAFE: SDK Firebase não encontrado. Operando em modo Local.");
    }
} catch (e) {
    console.error("❌ Erro fatal Firebase:", e);
}

// ============================================
// 2. CONSTANTES E DADOS DO SISTEMA
// ============================================
const VAGAS_POR_TURNO = 8;
const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Lista Integral de Profissionais (Preservação Estrita)
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
// 3. VARIÁVEIS DE ESTADO GLOBAL
// ============================================
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
let confirmAction = null;
let tentativaSenha = 1;

// Referências de UI que serão usadas nos próximos blocos
console.log("🛡️ BLOCO A Carregado: Estado Global Pronto.");
// ============================================
// 4. SISTEMA DE NOTIFICAÇÃO (TOAST)
// ============================================

function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('floating-notifications');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = `floating-notification ${tipo}`;
    
    // Mapeamento de ícones conforme style.css
    let icon = '';
    if (tipo === 'success') icon = '<i class="bi bi-check-circle-fill"></i> ';
    if (tipo === 'warning') icon = '<i class="bi bi-exclamation-triangle-fill"></i> ';
    if (tipo === 'danger') icon = '<i class="bi bi-x-circle-fill"></i> ';
    if (tipo === 'info') icon = '<i class="bi bi-info-circle-fill"></i> ';

    notif.innerHTML = `${icon}${mensagem}`;
    container.appendChild(notif);

    // Timing de animação iOS-style
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 400);
    }, 4000);
}

// ============================================
// 5. LÓGICA DE LOGIN E SEGURANÇA
// ============================================

function inicializarLogin() {
    console.log('🛡️ ARCOSAFE: Verificando integridade da sessão...');
    try {
        if (sessionStorage.getItem('usuarioLogado') === 'true') {
            document.body.classList.add('logged-in');
            inicializarApp();
        } else {
            configurarEventListenersLogin();
        }
    } catch (e) {
        console.error('❌ Erro crítico no login:', e);
    }
}

function configurarEventListenersLogin() {
    const loginButton = document.getElementById('loginButton');
    const loginSenhaInput = document.getElementById('loginSenha');
    
    if (loginButton) {
        // Safe-cloning para evitar duplicação de eventos em re-inicializações
        const novoBotao = loginButton.cloneNode(true);
        loginButton.parentNode.replaceChild(novoBotao, loginButton);
        novoBotao.addEventListener('click', (e) => {
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
        mostrarNotificacao("Bem-vindo ao CAPS ia Liberdade", "success");
        inicializarApp();
    } else {
        if (errorMessage) {
            errorMessage.textContent = 'Credenciais incorretas.';
            errorMessage.classList.remove('hidden');
        }
    }
}

// ============================================
// 6. INICIALIZAÇÃO DA APLICAÇÃO (CORE SYNC)
// ============================================

function inicializarApp() {
    console.log('🛡️ ARCOSAFE: Sincronizando Base de Dados...');

    // 1. Carregamento Imediato do Cache Local (Evita "Calendário Sumido")
    const cacheAgenda = localStorage.getItem('agenda_completa_final');
    const cachePacientes = localStorage.getItem('pacientes_dados');
    const cacheBloqueios = localStorage.getItem('dias_bloqueados');

    if (cacheAgenda) agendamentos = JSON.parse(cacheAgenda);
    if (cachePacientes) {
        pacientesGlobais = JSON.parse(cachePacientes);
        pacientes = [...pacientesGlobais];
    }
    if (cacheBloqueios) diasBloqueados = JSON.parse(cacheBloqueios);

    // 2. Renderização Visual Inicial (Failsafe)
    atualizarCalendario();
    verificarDadosCarregados();

    // 3. Conexão Realtime Firebase (Se disponível)
    if (database) {
        // Sincronia de Agendamentos
        database.ref('agendamentos').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                agendamentos = data;
                localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
                // Refresh da UI reativo
                atualizarCalendario();
                if (dataSelecionada) exibirAgendamentos(dataSelecionada);
                verificarDadosCarregados();
            }
        });

        // Sincronia de Bloqueios
        database.ref('dias_bloqueados').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                diasBloqueados = data;
                localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
                atualizarCalendario();
            }
        });

        // Sincronia de Pacientes
        database.ref('pacientes').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                pacientesGlobais = Array.isArray(data) ? data : Object.values(data);
                pacientes = [...pacientesGlobais];
                localStorage.setItem('pacientes_dados', JSON.stringify(pacientesGlobais));
                verificarDadosCarregados();
            }
        });
    }

    // 4. Ativação de Listeners da Interface
    configurarEventListenersApp();
    configurarBuscaGlobalAutocomplete();
    configurarAutocompleteAssinatura();
}

function verificarDadosCarregados() {
    const indicator = document.getElementById('dataLoadedIndicator');
    const text = document.getElementById('indicatorText');
    if (!indicator || !text) return;

    const temDados = Object.keys(agendamentos).length > 0;

    if (temDados) {
        indicator.className = 'data-loaded-indicator loaded animate-highlight';
        text.textContent = "Base Conectada";
    } else {
        indicator.className = 'data-loaded-indicator not-loaded';
        text.textContent = "Base Vazia / Offline";
    }
}
// ============================================
// 7. NAVEGAÇÃO DO CALENDÁRIO
// ============================================

function configurarEventListenersApp() {
    const btnHoje = document.getElementById('btnHoje');
    if (btnHoje) btnHoje.addEventListener('click', goToToday);

    const btnMesAnterior = document.getElementById('btnMesAnterior');
    if (btnMesAnterior) btnMesAnterior.addEventListener('click', voltarMes);

    const btnProximoMes = document.getElementById('btnProximoMes');
    if (btnProximoMes) btnProximoMes.addEventListener('click', avancarMes);
    
    // Listener para o botão de limpeza (com modal de senha)
    const btnConfirmClear = document.getElementById('btnConfirmClearData');
    if (btnConfirmClear) {
        btnConfirmClear.addEventListener('click', executarLimpezaTotal);
    }
}

function goToToday() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    atualizarCalendario();
    const dataFmt = hoje.toISOString().split('T')[0];
    selecionarDia(dataFmt);
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

// ============================================
// 8. RENDERIZAÇÃO DO CALENDÁRIO (FIX VISUAL)
// ============================================

function atualizarCalendario() {
    const container = document.getElementById('calendarContainer');
    const displayMesAno = document.getElementById('mesAno');
    if (!container || !displayMesAno) return;

    // Atualiza o Título (ex: Janeiro 2026)
    displayMesAno.textContent = `${meses[mesAtual]} ${anoAtual}`;

    // Limpa o container e cria a Grade
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    // 1. Adiciona Cabeçalhos dos Dias da Semana
    diasSemana.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'weekday';
        header.textContent = dia;
        grid.appendChild(header);
    });

    // 2. Cálculos de Datas
    const primeiroDiaMes = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

    // 3. Espaços vazios (Início do mês)
    for (let i = 0; i < primeiroDiaMes; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        grid.appendChild(empty);
    }

    // 4. Renderização dos Dias
    const hoje = new Date();
    const hojeISO = hoje.toISOString().split('T')[0];

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaEl = document.createElement('div');
        diaEl.className = 'day';
        
        const dataISO = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        diaEl.textContent = dia;
        diaEl.dataset.date = dataISO;

        // Estilização baseada em estados
        if (dataISO === hojeISO) diaEl.classList.add('today');
        if (dataISO === dataSelecionada) diaEl.classList.add('selected');
        
        // Fim de semana (Sábado=6, Domingo=0)
        const dataObj = new Date(anoAtual, mesAtual, dia);
        if (dataObj.getDay() === 0 || dataObj.getDay() === 6) diaEl.classList.add('weekend');

        // Indicadores de Conteúdo
        if (agendamentos[dataISO]) {
            const temManha = agendamentos[dataISO].manha?.length > 0;
            const temTarde = agendamentos[dataISO].tarde?.length > 0;
            if (temManha || temTarde) diaEl.classList.add('day-has-appointments');
        }

        if (diasBloqueados[dataISO]) diaEl.classList.add('blocked-day');

        // Evento de Clique
        diaEl.addEventListener('click', () => selecionarDia(dataISO));
        grid.appendChild(diaEl);
    }

    container.appendChild(grid);
}

function selecionarDia(data) {
    dataSelecionada = data;
    
    // Atualiza visual no calendário
    document.querySelectorAll('.day').forEach(el => {
        el.classList.toggle('selected', el.dataset.date === data);
    });

    exibirAgendamentos(data);
}

// ============================================
// 9. DASHBOARD DE AGENDAMENTOS (DIREITA)
// ============================================

function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;

    // Formatação da data para o cabeçalho
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const dataExtenso = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const agendamentosDia = agendamentos[data] || { manha: [], tarde: [] };
    const bloqueio = diasBloqueados[data];

    // Se o dia estiver bloqueado totalmente
    if (bloqueio && bloqueio.diaInteiro) {
        container.innerHTML = `
            <div class="glass-card blocked-state">
                <i class="bi bi-lock-fill blocked-icon"></i>
                <h3>Dia Bloqueado</h3>
                <p>Motivo: ${bloqueio.motivo}</p>
                <button class="btn btn-secondary" onclick="removerBloqueio('${data}')">Desbloquear</button>
            </div>
        `;
        return;
    }

    // Renderização do Painel Ativo
    container.innerHTML = `
        <div class="appointment-header">
            <span class="appointment-title">${dataExtenso.toUpperCase()}</span>
            <div class="header-actions">
                <button class="btn btn-secondary btn-sm" onclick="imprimirDia('${data}')">
                    <i class="bi bi-printer"></i> Imprimir
                </button>
                <button class="btn-icon btn-lock" onclick="abrirModalBloqueio('${data}')">
                    <i class="bi bi-lock"></i>
                </button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="alternarTurno('manha')">Manhã</button>
            <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="alternarTurno('tarde')">Tarde</button>
        </div>

        <div id="turno-manha" class="turno-content ${turnoAtivo === 'manha' ? 'active' : ''}">
            ${gerarVagasTurno(agendamentosDia.manha, 'manha', data)}
        </div>
        <div id="turno-tarde" class="turno-content ${turnoAtivo === 'tarde' ? 'active' : ''}">
            ${gerarVagasTurno(agendamentosDia.tarde, 'tarde', data)}
        </div>
    `;
}

function alternarTurno(turno) {
    turnoAtivo = turno;
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}

function gerarVagasTurno(lista, turno, data) {
    let html = '<div class="vagas-grid">';
    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = lista ? lista.find(a => a.vaga === i) : null;
        const estaEditando = slotEmEdicao && slotEmEdicao.vaga === i && slotEmEdicao.turno === turno;

        html += `
            <div class="vaga-card ${agendamento ? 'ocupada' : ''} ${estaEditando ? 'editing' : ''}" id="card-${data}-${turno}-${i}">
                <div class="vaga-header ${turno}">
                    Vaga ${i} ${agendamento ? '- Ocupada' : '- Disponível'}
                </div>
                <div class="vaga-content">
                    ${agendamento && !estaEditando ? 
                        `<div class="agendamento-info">
                            <span class="paciente-nome">${agendamento.nome}</span>
                            <span class="paciente-numero-value">Prontuário: ${agendamento.numero}</span>
                            <div class="agendamento-acoes">
                                <button class="btn btn-edit btn-sm" onclick="iniciarEdicao('${data}', '${turno}', ${i})">Editar</button>
                                <button class="btn btn-danger btn-sm" onclick="cancelarAgendamento('${data}', '${turno}', ${i})">Excluir</button>
                            </div>
                        </div>` : 
                        `<form class="vaga-form" onsubmit="salvarAgendamento(event, '${data}', '${turno}', ${i})">
                            <div class="form-row">
                                <div class="form-group numero">
                                    <label>Prontuário</label>
                                    <input type="text" name="numero" class="form-input" required value="${agendamento?.numero || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Nome do Paciente</label>
                                    <input type="text" name="nome" class="form-input" required value="${agendamento?.nome || ''}">
                                </div>
                            </div>
                            <div class="form-buttons">
                                <button type="submit" class="btn btn-success btn-sm ${turno}">Salvar</button>
                                ${estaEditando ? `<button type="button" class="btn btn-secondary btn-sm" onclick="cancelarEdicao()">Cancelar</button>` : ''}
                            </div>
                        </form>`
                    }
                </div>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

// ============================================
// 10. LÓGICA DE PERSISTÊNCIA E EDIÇÃO
// ============================================

function iniciarEdicao(data, turno, vaga) {
    slotEmEdicao = { data, turno, vaga };
    exibirAgendamentos(data);
}

function cancelarEdicao() {
    slotEmEdicao = null;
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}

function salvarAgendamento(event, data, turno, vaga) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const novo = {
        vaga: vaga,
        nome: formData.get('nome').toUpperCase(),
        numero: formData.get('numero'),
        status: 'Agendado'
    };

    if (!agendamentos[data]) agendamentos[data] = { manha: [], tarde: [] };
    
    // Remove se já existir (Update)
    agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);
    agendamentos[data][turno].push(novo);

    // Salva no Firebase e Local
    if (database) database.ref(`agendamentos/${data}`).set(agendamentos[data]);
    localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));

    slotEmEdicao = null;
    mostrarNotificacao("Agendamento atualizado", "success");
    exibirAgendamentos(data);
    atualizarCalendario();
}

function cancelarAgendamento(data, turno, vaga) {
    if (confirm("Deseja realmente excluir este agendamento?")) {
        agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);
        if (database) database.ref(`agendamentos/${data}`).set(agendamentos[data]);
        localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
        mostrarNotificacao("Agendamento removido", "warning");
        exibirAgendamentos(data);
        atualizarCalendario();
    }
}

// ============================================
// 11. BOOTSTRAP FINAL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o sistema de login (que por sua vez chama inicializarApp)
    inicializarLogin();
});

// Funções de Autocomplete (Placeholders funcionais)
function configurarBuscaGlobalAutocomplete() {}
function configurarAutocompleteAssinatura() {}
function executarLimpezaTotal() {
    const pass = document.getElementById('clearDataPassword')?.value;
    if (pass === '0000') {
        if(confirm("CERTEZA ABSOLUTA? Isso apagará tudo no Firebase.")) {
            if(database) database.ref('/').remove();
            localStorage.clear();
            location.reload();
        }
    } else {
        alert("Senha de segurança incorreta.");
    }
}
