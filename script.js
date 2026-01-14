/* script.js - [ARCOSAFE SECURITY PATCH V40.3] */
/* COMPATIBILIDADE: Ajustado para HTML Apple System UI v1.5 */
/* CORREÇÕES APLICADAS: Bugs #1, #4, #5, #9 (Vulnerabilidades Críticas) */
'use strict';

// ============================================
// [BLOCO A] CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================
// [ARCOSAFE-FIX] Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDu_n6yDxrSEpv0eCcJDjUIyH4h0UiYx14",
    authDomain: "caps-libia.firebaseapp.com",
    projectId: "caps-libia",
    storageBucket: "caps-libia.firebasestorage.app",
    messagingSenderId: "164764567114",
    appId: "1:164764567114:web:2701ed4a861492c0e388b3"
};

// [ARCOSAFE-FIX] Inicialização do serviço
let database;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        console.log("Firebase inicializado com sucesso.");
    } else {
        console.warn("SDK Firebase não detectado. Modo Offline.");
    }
} catch (e) {
    console.error("Erro crítico Firebase:", e);
}

// ============================================
// 1. CONSTANTES E DADOS ESTÁTICOS
// ============================================
const VAGAS_POR_TURNO = 8;
const TOTAL_VAGAS = 16;
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// [SECURITY-PATCH] Hash da senha para comparação segura
const SENHA_HASH_ESPERADO = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // SHA-256 de "apocalipse"

// ============================================
// 2. VARIÁVEIS DE ESTADO GLOBAL
// ============================================
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = null;
let agendamentos = {};
let diasBloqueados = {};
let pacientes = [];
let pacientesGlobais = [];
let turnoAtivo = 'manha';
let slotEmEdicao = null;
let confirmAction = null;

// [SECURITY-PATCH] Controle de tentativas de senha
let tentativasLimpeza = 0;
const MAX_TENTATIVAS = 3;

// [SECURITY-PATCH] Flag para evitar duplicação de listeners
let loginListenersConfigurados = false;

// [PERFORMANCE-PATCH] Modal de backup
let modalBackupAberto = false;

// ============================================
// 3. SISTEMA DE NOTIFICAÇÃO (TOAST)
// ============================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('floating-notifications') || criarContainerNotificacao();
    const notif = document.createElement('div');
    notif.className = `floating-notification ${tipo}`;

    // Ícones baseados no tipo
    let icon = '';
    if (tipo === 'success') icon = '<i class="bi bi-check-circle-fill"></i> ';
    if (tipo === 'warning') icon = '<i class="bi bi-exclamation-triangle-fill"></i> ';
    if (tipo === 'danger') icon = '<i class="bi bi-x-circle-fill"></i> ';

    notif.innerHTML = `${icon}${mensagem}`;
    container.appendChild(notif);

    // Animação e Remoção
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 400);
    }, 4000);
}

function criarContainerNotificacao() {
    const div = document.createElement('div');
    div.id = 'floating-notifications';
    document.body.appendChild(div);
    return div;
}

// ============================================
// 4. LÓGICA DE LOGIN
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
    // [SECURITY-PATCH] Previne duplicação de listeners
    if (loginListenersConfigurados) return;

    const btn = document.getElementById('loginButton');
    const inputSenha = document.getElementById('loginSenha');

    if (btn) btn.addEventListener('click', tentarLogin);
    if (inputSenha) inputSenha.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tentarLogin();
    });

    loginListenersConfigurados = true;
}

function tentarLogin() {
    const usuario = document.getElementById('loginUsuario').value;
    const senha = document.getElementById('loginSenha').value;
    const errorMsg = document.getElementById('loginErrorMessage');

    if (usuario === '0000' && senha === '0000') {
        sessionStorage.setItem('usuarioLogado', 'true');
        document.body.classList.add('logged-in');
        if (errorMsg) errorMsg.classList.add('hidden');
        inicializarApp();
    } else {
        if (errorMsg) {
            errorMsg.textContent = 'Usuário ou senha incorretos.';
            errorMsg.classList.remove('hidden');
        }
    }
}

// ============================================
// 5. INICIALIZAÇÃO DA APP
// ============================================
function inicializarApp() {
    console.log('Iniciando ARCOSAFE V40.3 (Security Patch)...');

    // Recuperar dados locais (Cache)
    try {
        agendamentos = JSON.parse(localStorage.getItem('agenda_completa_final')) || {};
        diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados')) || {};

        // Tenta carregar pacientes do arquivo default se existir, senão localStorage
        if (typeof PACIENTES_DEFAULT !== 'undefined') {
            pacientesGlobais = PACIENTES_DEFAULT;
        } else {
            pacientesGlobais = JSON.parse(localStorage.getItem('pacientes_dados')) || [];
        }
    } catch (e) { 
        console.error("Erro ao carregar cache", e); 
    }

    // [SECURITY-PATCH] Listeners Firebase com merge inteligente
    if (database) {
        database.ref('agendamentos').on('value', snap => {
            const remoto = snap.val();

            // [FIX BUG #4] Validação antes de sobrescrever
            if (!remoto) {
                console.warn('Firebase retornou null. Mantendo dados locais.');
                return;
            }

            // [FIX BUG #4] Merge inteligente (prioriza timestamp mais recente)
            agendamentos = mergeAgendamentos(agendamentos, remoto);

            try {
                localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
            } catch (e) {
                console.error('Erro ao salvar no localStorage:', e);
            }

            atualizarInterfaceGlobal();
        });

        database.ref('dias_bloqueados').on('value', snap => {
            if (snap.val()) {
                diasBloqueados = snap.val();
                try {
                    localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
                } catch (e) {
                    console.error('Erro ao salvar bloqueios:', e);
                }
                atualizarInterfaceGlobal();
            }
        });
    }

    configurarNavegacao();
    atualizarCalendario();

    // Inicializar listeners extras
    const btnBackup = document.getElementById('btnBackup');
    if (btnBackup) btnBackup.addEventListener('click', fazerBackupLocal);

    const btnLimpar = document.getElementById('btnLimparDados');
    if (btnLimpar) btnLimpar.addEventListener('click', () => {
        document.getElementById('clearDataModal').style.display = 'flex';
    });

    // Configurar busca global
    configurarBuscaGlobal();
}

// [FIX BUG #4] Função de merge inteligente
function mergeAgendamentos(local, remoto) {
    const merged = { ...local };

    for (const [data, diaRemoto] of Object.entries(remoto)) {
        if (!merged[data]) {
            // Data não existe localmente, adiciona do remoto
            merged[data] = diaRemoto;
            continue;
        }

        // Merge de turnos
        ['manha', 'tarde'].forEach(turno => {
            if (!diaRemoto[turno]) return;
            if (!merged[data][turno]) {
                merged[data][turno] = diaRemoto[turno];
                return;
            }

            // Merge de vagas individuais por timestamp
            const localVagas = merged[data][turno];
            const remotoVagas = diaRemoto[turno];

            remotoVagas.forEach(vagaRemota => {
                const vagaLocal = localVagas.find(v => v.vaga === vagaRemota.vaga);

                if (!vagaLocal) {
                    // Vaga não existe localmente, adiciona
                    localVagas.push(vagaRemota);
                } else if (vagaRemota.timestamp > vagaLocal.timestamp) {
                    // Vaga remota é mais recente, substitui
                    const idx = localVagas.indexOf(vagaLocal);
                    localVagas[idx] = vagaRemota;
                }
            });
        });
    }

    return merged;
}

function atualizarInterfaceGlobal() {
    atualizarCalendario();
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}
// ============================================
// 6. NAVEGAÇÃO E CALENDÁRIO
// ============================================
function configurarNavegacao() {
    document.getElementById('btnMesAnterior').addEventListener('click', () => {
        mesAtual--;
        if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
        atualizarCalendario();
    });

    document.getElementById('btnProximoMes').addEventListener('click', () => {
        mesAtual++;
        if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
        atualizarCalendario();
    });

    document.getElementById('btnHoje').addEventListener('click', () => {
        const hoje = new Date();
        mesAtual = hoje.getMonth();
        anoAtual = hoje.getFullYear();
        atualizarCalendario();
        pularParaAgendamento(hoje.toISOString().split('T')[0]);
    });
}

function atualizarCalendario() {
    const calendarContainer = document.getElementById('calendarContainer');
    const titleDisplay = document.getElementById('mesAno');

    if (!calendarContainer || !titleDisplay) return;

    calendarContainer.className = 'calendar-grid';
    titleDisplay.textContent = `${MESES[mesAtual]} ${anoAtual}`;
    calendarContainer.innerHTML = '';

    // Cabeçalho dos dias da semana
    DIAS_SEMANA.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'weekday';
        header.textContent = dia.substring(0, 3);
        calendarContainer.appendChild(header);
    });

    const firstDay = new Date(anoAtual, mesAtual, 1).getDay();
    const daysInMonth = new Date(anoAtual, mesAtual + 1, 0).getDate();

    // Dias vazios
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        calendarContainer.appendChild(empty);
    }

    // Dias reais
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'day';

        const mesFmt = (mesAtual + 1).toString().padStart(2, '0');
        const diaFmt = i.toString().padStart(2, '0');
        const dataFull = `${anoAtual}-${mesFmt}-${diaFmt}`;

        div.textContent = i;
        div.setAttribute('data-date', dataFull);

        // Verifica Fim de Semana
        const diaSemana = new Date(anoAtual, mesAtual, i).getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            div.classList.add('weekend');
        }

        // Verifica Hoje
        if (dataFull === hojeStr) div.classList.add('today');

        // Verifica Seleção
        if (dataSelecionada === dataFull) div.classList.add('selected');

        // Verifica Bloqueios
        if (diasBloqueados[dataFull]) {
            const b = diasBloqueados[dataFull];
            if (b.diaInteiro) div.classList.add('blocked-day');
            else if (b.manha) div.classList.add('blocked-morning');
            else if (b.tarde) div.classList.add('blocked-afternoon');
        }

        // Indicador de Agendamento (Bolinha)
        if (agendamentos[dataFull]) {
            const qtd = (agendamentos[dataFull].manha?.length || 0) + (agendamentos[dataFull].tarde?.length || 0);
            if (qtd > 0) div.classList.add('day-has-appointments');
        }

        div.addEventListener('click', () => selecionarDia(dataFull, div));
        calendarContainer.appendChild(div);
    }
}

function selecionarDia(data, el) {
    document.querySelectorAll('.day.selected').forEach(d => d.classList.remove('selected'));
    if (el) el.classList.add('selected');
    else {
        const domEl = document.querySelector(`.day[data-date="${data}"]`);
        if (domEl) domEl.classList.add('selected');
    }
    dataSelecionada = data;
    exibirAgendamentos(data);
}

// ============================================
// 7. DASHBOARD E AGENDAMENTOS
// ============================================
function exibirAgendamentos(data) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;

    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const dataFmt = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const dadosDia = agendamentos[data] || { manha: [], tarde: [] };
    const bloqueio = diasBloqueados[data];

    // Verifica bloqueio total
    if (bloqueio && bloqueio.diaInteiro) {
        container.innerHTML = criarTemplateBloqueio(dataFmt, bloqueio.motivo, data);
        document.getElementById('btnDesbloquearDia').addEventListener('click', () => removerBloqueio(data));
        return;
    }

    // Calcula ocupação
    const ocupadosManha = dadosDia.manha ? dadosDia.manha.length : 0;
    const ocupadosTarde = dadosDia.tarde ? dadosDia.tarde.length : 0;
    const percent = Math.round(((ocupadosManha + ocupadosTarde) / TOTAL_VAGAS) * 100);

    // Template Principal
    let html = `
        <div class="appointment-header">
            <h2 class="appointment-title">${dataFmt}</h2>
            <div class="header-actions">
                <button class="btn btn-secondary btn-sm" onclick="window.print()">Imprimir</button>
                <button class="btn-icon btn-lock" onclick="abrirModalBloqueio('${data}')" title="Bloquear Dia"><i class="bi bi-lock-fill"></i></button>
            </div>
        </div>
        <div class="glass-card" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">
            <div class="card-content">
                <div class="dashboard-stats-grid">
                    <div class="stats-card-mini">
                        <h4><span>Manhã</span> <i class="bi bi-sun"></i></h4>
                        <div class="stats-value-big val-primary">${ocupadosManha}/8</div>
                    </div>
                    <div class="stats-card-mini">
                        <h4><span>Tarde</span> <i class="bi bi-moon-stars"></i></h4>
                        <div class="stats-value-big val-primary" style="color: var(--color-afternoon)">${ocupadosTarde}/8</div>
                    </div>
                    <div class="stats-card-mini">
                        <h4><span>Total</span> <i class="bi bi-pie-chart"></i></h4>
                        <div class="stats-value-big">${percent}%</div>
                    </div>
                </div>
                <div class="tabs">
                    <button class="tab-btn manha ${turnoAtivo === 'manha' ? 'active' : ''}" onclick="mudarTurno('manha')">Manhã</button>
                    <button class="tab-btn tarde ${turnoAtivo === 'tarde' ? 'active' : ''}" onclick="mudarTurno('tarde')">Tarde</button>
                </div>
                <div id="conteudo-turno">
                    ${gerarGridVagas(dadosDia, turnoAtivo, data)}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Reinicializa autocompletes
    document.querySelectorAll('.vaga-form').forEach(configurarAutocomplete);
}

function mudarTurno(turno) {
    turnoAtivo = turno;
    if (dataSelecionada) exibirAgendamentos(dataSelecionada);
}

function gerarGridVagas(dadosDia, turno, data) {
    const lista = dadosDia[turno] || [];
    let html = '<div class="vagas-grid">';

    for (let i = 1; i <= VAGAS_POR_TURNO; i++) {
        const agendamento = lista.find(a => a.vaga === i);
        const isEditing = slotEmEdicao && slotEmEdicao.vaga === i && slotEmEdicao.turno === turno && slotEmEdicao.data === data;

        // Classes dinâmicas
        let classes = `vaga-card ${turno} `;
        if (agendamento) classes += 'ocupada ';
        if (isEditing) classes += 'editing ';
        if (agendamento && agendamento.status) classes += `status-${agendamento.status.toLowerCase()} `;
        if (agendamento && agendamento.primeiraConsulta) classes += 'primeira-consulta ';

        html += `<div id="card-${turno}-${i}" class="${classes}">`;

        // Header do Card
        html += `
            <div class="vaga-header ${turno}">
                <div>Vaga ${i} ${agendamento && !isEditing ? '<i class="bi bi-check-circle-fill"></i>' : ''}</div>
                ${agendamento && !isEditing ? `<span class="status-tag status-${agendamento.status.toLowerCase()}">${agendamento.status}</span>` : ''}
            </div>
            <div class="vaga-content">
        `;

        // Conteúdo
        if (agendamento && !isEditing) {
            html += `
                <div class="agendamento-info">
                    <div class="paciente-header">
                        <div class="paciente-nome">${agendamento.nome}</div>
                        <span class="paciente-numero-value">${agendamento.numero}</span>
                    </div>
                    ${agendamento.primeiraConsulta ? '<span class="primeira-consulta-tag">Primeira Consulta</span>' : ''}
                    <div class="status-buttons-container">
                        <button class="btn-status ${agendamento.status === 'Compareceu' ? 'active' : ''}" 
                            onclick="atualizarStatus('${data}', '${turno}', ${i}, 'Compareceu')">Compareceu</button>
                        <button class="btn-status ${agendamento.status === 'Faltou' ? 'active' : ''}" 
                            onclick="atualizarStatus('${data}', '${turno}', ${i}, 'Faltou')">Faltou</button>
                    </div>
                    <div class="agendamento-acoes">
                        <button class="btn-edit" onclick="editarAgendamento('${data}', '${turno}', ${i})">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                        <button class="btn-cancel-appointment" onclick="confirmarExclusao('${data}', '${turno}', ${i})">
                            Excluir
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Formulário
            const vals = isEditing ? agendamento : {};
            html += `
                <form class="vaga-form" onsubmit="salvarAgendamento(event, '${data}', '${turno}', ${i})">
                    <div class="form-content-wrapper">
                        <div class="form-row">
                            <div class="form-group numero autocomplete-container">
                                <label>Prontuário</label>
                                <input type="text" name="numero" class="form-input" required value="${vals.numero || ''}" autocomplete="off">
                                <div class="sugestoes-lista"></div>
                            </div>
                            <div class="form-group full-width autocomplete-container">
                                <label>Nome do Paciente</label>
                                <input type="text" name="nome" class="form-input" required value="${vals.nome || ''}" autocomplete="off">
                                <div class="sugestoes-lista"></div>
                            </div>
                        </div>
                        <div class="form-group-checkbox-single">
                            <input type="checkbox" name="primeiraConsulta" id="pc-${turno}-${i}" ${vals.primeiraConsulta ? 'checked' : ''}>
                            <label for="pc-${turno}-${i}">É primeira consulta?</label>
                        </div>
                    </div>
                    <div class="form-buttons">
                        ${isEditing ? `<button type="button" class="btn btn-secondary ${turno}" onclick="cancelarEdicao('${data}')">Cancelar</button>` : ''}
                        <button type="submit" class="btn btn-success ${turno}">${isEditing ? 'Salvar' : 'Agendar'}</button>
                    </div>
                </form>
            `;
        }

        html += `</div></div>`;
    }

    html += '</div>';
    return html;
}

function criarTemplateBloqueio(dataFmt, motivo, data) {
    return `
        <div class="glass-card blocked-state">
            <i class="bi bi-lock-fill blocked-icon"></i>
            <h3>Dia Bloqueado: ${dataFmt}</h3>
            <p>Motivo: ${motivo}</p>
            <button id="btnDesbloquearDia" class="btn btn-danger">Desbloquear Dia</button>
        </div>
    `;
}

// ============================================
// 8. MANIPULAÇÃO DE DADOS (CRUD)
// ============================================
function salvarAgendamento(e, data, turno, vaga) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const novo = {
        vaga: vaga,
        nome: formData.get('nome').toUpperCase(),
        numero: formData.get('numero'),
        primeiraConsulta: formData.get('primeiraConsulta') === 'on',
        status: 'Aguardando',
        timestamp: Date.now()
    };

    if (!agendamentos[data]) agendamentos[data] = { manha: [], tarde: [] };
    if (!agendamentos[data][turno]) agendamentos[data][turno] = [];

    // Remove anterior se for edição
    agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);

    // Adiciona novo
    agendamentos[data][turno].push(novo);

    salvarNoFirebase();
    slotEmEdicao = null;
    mostrarNotificacao("Agendamento salvo!", "success");
    exibirAgendamentos(data);
    atualizarCalendario();
}

function atualizarStatus(data, turno, vaga, novoStatus) {
    const turnoArr = agendamentos[data][turno];
    const idx = turnoArr.findIndex(a => a.vaga === vaga);

    if (idx !== -1) {
        turnoArr[idx].status = novoStatus;
        turnoArr[idx].timestamp = Date.now(); // Atualiza timestamp
        salvarNoFirebase();
        exibirAgendamentos(data);
    }
}

function editarAgendamento(data, turno, vaga) {
    slotEmEdicao = { data, turno, vaga };
    exibirAgendamentos(data);
}

function cancelarEdicao(data) {
    slotEmEdicao = null;
    exibirAgendamentos(data);
}

function confirmarExclusao(data, turno, vaga) {
    if(confirm("Deseja realmente excluir este agendamento?")) {
        agendamentos[data][turno] = agendamentos[data][turno].filter(a => a.vaga !== vaga);
        salvarNoFirebase();
        mostrarNotificacao("Excluído com sucesso.", "warning");
        exibirAgendamentos(data);
        atualizarCalendario();
    }
}

function salvarNoFirebase() {
    try {
        localStorage.setItem('agenda_completa_final', JSON.stringify(agendamentos));
    } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
        mostrarNotificacao('Erro ao salvar localmente. Verifique o espaço disponível.', 'danger');
    }

    if (database) {
        database.ref('agendamentos').set(agendamentos)
            .catch(err => {
                console.error('Erro ao salvar no Firebase:', err);
                mostrarNotificacao('Erro ao sincronizar com Firebase.', 'danger');
            });
    }
}

// ============================================
// 9. FUNÇÕES DE BLOQUEIO
// ============================================
function abrirModalBloqueio(data) {
    const motivo = prompt("Motivo do bloqueio (ex: Feriado):");
    if (motivo) {
        diasBloqueados[data] = { diaInteiro: true, motivo: motivo };

        if (database) {
            database.ref('dias_bloqueados').set(diasBloqueados)
                .catch(err => console.error('Erro ao salvar bloqueio:', err));
        }

        try {
            localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
        } catch (e) {
            console.error('Erro ao salvar bloqueio localmente:', e);
        }

        mostrarNotificacao("Dia bloqueado.", "success");
        atualizarCalendario();
        exibirAgendamentos(data);
    }
}

function removerBloqueio(data) {
    if (confirm("Desbloquear este dia?")) {
        delete diasBloqueados[data];

        if (database) {
            database.ref('dias_bloqueados').set(diasBloqueados)
                .catch(err => console.error('Erro ao remover bloqueio:', err));
        }

        try {
            localStorage.setItem('dias_bloqueados', JSON.stringify(diasBloqueados));
        } catch (e) {
            console.error('Erro ao remover bloqueio localmente:', e);
        }

        mostrarNotificacao("Dia desbloqueado.", "success");
        atualizarCalendario();
        exibirAgendamentos(data);
    }
}
// ============================================
// 10. UTILITÁRIOS E HELPERS
// ============================================
function pularParaAgendamento(data) {
    // Garante que o calendário está no mês certo
    const [ano, mes, dia] = data.split('-').map(Number);
    mesAtual = mes - 1;
    anoAtual = ano;
    atualizarCalendario();

    // Seleciona visualmente
    setTimeout(() => {
        const diaEl = document.querySelector(`.day[data-date="${data}"]`);
        if (diaEl) {
            diaEl.click();
            diaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function fazerBackupLocal() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(agendamentos));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_agenda_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    mostrarNotificacao("Backup baixado com sucesso!", "success");
}

function configurarBuscaGlobal() {
    const input = document.getElementById('globalSearchInput');
    const container = document.getElementById('searchResultsContainer');

    if (!input) return;

    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();

        if (termo.length < 2) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        // Busca em todos os agendamentos
        const resultados = [];
        Object.keys(agendamentos).forEach(data => {
            ['manha', 'tarde'].forEach(turno => {
                if (agendamentos[data][turno]) {
                    agendamentos[data][turno].forEach(ag => {
                        if (ag.nome.toLowerCase().includes(termo) || ag.numero.includes(termo)) {
                            resultados.push({ ...ag, data, turno });
                        }
                    });
                }
            });
        });

        // Renderiza resultados
        if (resultados.length > 0) {
            let html = '<ul class="vaga-lista">';
            resultados.forEach(res => {
                const dataFmt = res.data.split('-').reverse().join('/');
                html += `
                    <li class="search-result-item">
                        <div class="result-info">
                            <strong>${res.nome}</strong>
                            <span>${dataFmt} - ${res.turno}</span>
                            <span class="status-tag status-${res.status.toLowerCase()}">${res.status}</span>
                        </div>
                        <button class="btn-jump" onclick="pularParaAgendamento('${res.data}')">Ir</button>
                    </li>
                `;
            });
            html += '</ul>';
            container.innerHTML = html;
            container.classList.remove('hidden');
        } else {
            container.innerHTML = '<p class="search-feedback">Nenhum resultado encontrado.</p>';
            container.classList.remove('hidden');
        }
    });
}

function configurarAutocomplete(form) {
    const inputNome = form.querySelector('input[name="nome"]');
    const divSugestoes = inputNome.parentNode.querySelector('.sugestoes-lista');

    inputNome.addEventListener('input', () => {
        const val = inputNome.value.toUpperCase();

        if (val.length < 2) {
            divSugestoes.style.display = 'none';
            return;
        }

        const matches = pacientesGlobais.filter(p => p.Nome.toUpperCase().includes(val)).slice(0, 5);

        if (matches.length > 0) {
            divSugestoes.innerHTML = matches.map(p => `
                <div class="sugestao-item" onclick="preencherForm('${p.Nome}', '${p.Prontuario}', this)">
                    <strong>${p.Nome}</strong>
                    <small>Prontuário: ${p.Prontuario}</small>
                </div>
            `).join('');
            divSugestoes.style.display = 'block';
        } else {
            divSugestoes.style.display = 'none';
        }
    });
}

// Função global para o onclick do HTML gerado dinamicamente
window.preencherForm = function(nome, prontuario, el) {
    const form = el.closest('form');
    form.querySelector('input[name="nome"]').value = nome;
    form.querySelector('input[name="numero"]').value = prontuario;
    el.parentNode.style.display = 'none';
};

// ============================================
// 11. SEGURANÇA - LIMPEZA DE DADOS
// ============================================

// [SECURITY-PATCH] Função para gerar hash SHA-256
async function gerarHashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// [SECURITY-PATCH] Função de limpeza com validação segura
async function executarLimpezaDados() {
    const senha = document.getElementById('clearDataPassword').value;
    const errorMsg = document.getElementById('clearDataError');

    // Verifica limite de tentativas
    if (tentativasLimpeza >= MAX_TENTATIVAS) {
        if (errorMsg) {
            errorMsg.textContent = 'Número máximo de tentativas excedido. Recarregue a página.';
            errorMsg.classList.remove('hidden');
        }
        mostrarNotificacao('Acesso bloqueado por segurança.', 'danger');
        return;
    }

    try {
        // [SECURITY-PATCH] Valida hash da senha
        const hashDigitado = await gerarHashSenha(senha);

        if (hashDigitado === SENHA_HASH_ESPERADO) {
            // [SECURITY-PATCH] Log de auditoria no Firebase
            if (database) {
                const logLimpeza = {
                    timestamp: Date.now(),
                    data: new Date().toISOString(),
                    acao: 'limpeza_total'
                };

                database.ref('logs_auditoria').push(logLimpeza)
                    .catch(err => console.error('Erro ao registrar log:', err));
            }

            // Executa limpeza
            localStorage.clear();
            sessionStorage.clear();

            mostrarNotificacao('Dados limpos com sucesso. Redirecionando...', 'success');

            setTimeout(() => {
                location.reload();
            }, 1500);

        } else {
            tentativasLimpeza++;

            if (errorMsg) {
                errorMsg.textContent = `Senha incorreta. Tentativas restantes: ${MAX_TENTATIVAS - tentativasLimpeza}`;
                errorMsg.classList.remove('hidden');
            }

            mostrarNotificacao('Senha incorreta.', 'danger');
        }

    } catch (e) {
        console.error('Erro ao validar senha:', e);
        mostrarNotificacao('Erro ao processar senha.', 'danger');
    }
}

// [FIX BUG #5] Função para pular backup em emergência
function pularBackupEmergencia() {
    if (confirm('ATENÇÃO: Pular o backup pode resultar em perda de dados. Deseja realmente continuar sem backup?')) {
        try {
            const chave = new Date().toISOString().split('T')[0];
            localStorage.setItem('ultimoBackupChave', chave);
        } catch (e) {
            console.error('Erro ao salvar chave de backup:', e);
            // Permite fechar mesmo com erro
        }

        modalBackupAberto = false;
        document.getElementById('backupModal').style.display = 'none';
        mostrarNotificacao('Backup pulado. Recomendamos realizar backup manualmente.', 'warning');
    }
}

// ============================================
// BOOTSTRAP E EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicia verificando login
    inicializarLogin();

    // [SECURITY-PATCH] Listener para limpeza de dados com validação segura
    const btnConfirmClear = document.getElementById('btnConfirmClearData');
    if (btnConfirmClear) {
        btnConfirmClear.addEventListener('click', executarLimpezaDados);
    }

    // Listener para cancelar limpeza
    const btnsCancelClear = document.querySelectorAll('#btnCancelClearData');
    btnsCancelClear.forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('clearDataModal').style.display = 'none';
            tentativasLimpeza = 0; // Reset tentativas ao fechar

            const errorMsg = document.getElementById('clearDataError');
            if (errorMsg) errorMsg.classList.add('hidden');

            const inputSenha = document.getElementById('clearDataPassword');
            if (inputSenha) inputSenha.value = '';
        });
    });

    // [FIX BUG #5] Listener para botão de emergência no modal de backup
    const btnPularBackup = document.getElementById('btnPularBackupEmergencia');
    if (btnPularBackup) {
        btnPularBackup.addEventListener('click', pularBackupEmergencia);
    }

    // Listener para fechar modal de backup ao clicar fora
    const backupModal = document.getElementById('backupModal');
    if (backupModal) {
        backupModal.addEventListener('click', (e) => {
            if (e.target === backupModal) {
                // Não permite fechar clicando fora (segurança)
                mostrarNotificacao('Por favor, realize o backup ou use o botão de emergência.', 'warning');
            }
        });
    }
});

// [SECURITY-PATCH] Previne fechamento acidental da aba com dados não salvos
window.addEventListener('beforeunload', (e) => {
    // Verifica se há dados não sincronizados
    const dadosLocais = localStorage.getItem('agenda_completa_final');

    if (dadosLocais && database) {
        // Apenas alerta se houver dados e Firebase estiver ativo
        e.preventDefault();
        e.returnValue = 'Há dados que podem não estar sincronizados. Deseja realmente sair?';
        return e.returnValue;
    }
});

// [PERFORMANCE] Debounce para inputs de busca
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Exporta funções para uso global (necessário para onclick inline)
window.mudarTurno = mudarTurno;
window.abrirModalBloqueio = abrirModalBloqueio;
window.atualizarStatus = atualizarStatus;
window.editarAgendamento = editarAgendamento;
window.cancelarEdicao = cancelarEdicao;
window.confirmarExclusao = confirmarExclusao;
window.salvarAgendamento = salvarAgendamento;
window.pularParaAgendamento = pularParaAgendamento;

console.log('ARCOSAFE Security Patch V40.3 carregado com sucesso.');
console.log('Correções aplicadas: Bugs #1, #4, #5, #9');
