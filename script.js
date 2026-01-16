/**
 * ARCOSAFE - Agenda CAPS (Versão Restaurada & Corrigida)
 * Compatível com o HTML de Backup fornecido.
 */

// --- 1. CONFIGURAÇÃO FIREBASE ---
// Substitua pelas suas credenciais reais
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:00000000:web:00000000"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. ESTADO GLOBAL ---
let currentDate = new Date();
let agendamentos = {}; 
const LIMITE_VAGAS = 8; // 8 vagas por turno

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Configura Botão de Login
    const btnLogin = document.getElementById('loginButton');
    if (btnLogin) {
        btnLogin.addEventListener('click', realizarLogin);
    }

    // Configura Navegação do Calendário
    document.getElementById('btnMesAnterior').addEventListener('click', () => mudarMes(-1));
    document.getElementById('btnProximoMes').addEventListener('click', () => mudarMes(1));
    document.getElementById('btnHoje').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Configura Busca Global (Correção Solicitada)
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(timeout);
            timeout = setTimeout(buscarAgendamentosGlobais, 300);
        });
    }

    // Configura Botões de Gerenciamento
    document.getElementById('btnBackup').addEventListener('click', fazerBackup);
    document.getElementById('btnRestaurar').addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile').addEventListener('change', restaurarBackup);
    document.getElementById('btnProcurarVagas').addEventListener('click', procurarVagas);
    document.getElementById('btnClearVagasSearch').addEventListener('click', () => {
        document.getElementById('vagasResultadosContainer').classList.add('hidden');
    });

    // Carrega dados iniciais (mas mantém tela de login visível)
    carregarDadosFirebase();
}

// --- 4. LOGIN ---
function realizarLogin() {
    const usuario = document.getElementById('loginUsuario').value;
    const senha = document.getElementById('loginSenha').value;
    const errorMsg = document.getElementById('loginErrorMessage');

    // Simulação de Login (ou integração com Firebase Auth se configurado)
    // Como o HTML veio com value="0000", mantivemos essa lógica simples para destravar
    if (usuario && senha) {
        document.getElementById('loginScreen').classList.add('hidden');
        renderCalendar(); // Renderiza o calendário ao entrar
    } else {
        errorMsg.innerText = "Usuário ou senha inválidos.";
        errorMsg.classList.remove('hidden');
    }
}

// --- 5. FIREBASE DADOS ---
function carregarDadosFirebase() {
    const indicator = document.getElementById('indicatorText');
    if(indicator) indicator.innerText = "Carregando...";

    database.ref('agendamentos').on('value', (snapshot) => {
        agendamentos = snapshot.val() || {};
        
        // Atualiza UI
        if(indicator) {
            indicator.innerText = "Dados Atualizados";
            document.querySelector('.icon-loaded').style.display = 'inline';
            document.querySelector('.icon-not-loaded').style.display = 'none';
        }
        
        renderCalendar();
        
        // Se houver busca ativa, atualiza resultados
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput && searchInput.value.length >= 3) {
            buscarAgendamentosGlobais();
        }
    });
}

// --- 6. CALENDÁRIO ---
function mudarMes(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Atualiza Título (Ex: Janeiro 2026)
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('mesAno').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Domingo

    const container = document.getElementById('calendarContainer');
    container.innerHTML = '';

    // Cabeçalhos
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekDays.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-header-day';
        div.innerText = d;
        div.style.textAlign = 'center';
        div.style.fontWeight = 'bold';
        div.style.color = '#666';
        container.appendChild(div);
    });

    // Espaços vazios
    for (let i = 0; i < startingDay; i++) {
        container.appendChild(document.createElement('div'));
    }

    // Dias
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const div = document.createElement('div');
        
        // [CORREÇÃO] ID necessário para o scroll da busca funcionar
        div.id = `day-${dateStr}`; 
        div.className = 'calendar-day-cell';
        
        // Evento de clique para abrir detalhes (Appointments)
        div.onclick = () => mostrarAgendamentosDoDia(dateStr);

        // Verifica Vagas/Lotação
        const totalManha = agendamentos[dateStr]?.['manhã']?.length || 0;
        const totalTarde = agendamentos[dateStr]?.['tarde']?.length || 0;
        const total = totalManha + totalTarde;
        
        // Indicadores visuais (bolinhas ou cores)
        if (total > 0) {
            div.classList.add('has-event');
            // Lógica extra de cor se estiver lotado
            if (total >= (LIMITE_VAGAS * 2)) {
                div.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'; // Vermelho claro
            }
        }

        div.innerText = i;

        // Marca Hoje
        const hoje = new Date();
        if (i === hoje.getDate() && month === hoje.getMonth() && year === hoje.getFullYear()) {
            div.classList.add('today');
        }

        container.appendChild(div);
    }
}

// --- 7. EXIBIÇÃO DE AGENDAMENTOS (Lado Direito) ---
function mostrarAgendamentosDoDia(data) {
    const container = document.getElementById('appointmentsContainer');
    const [ano, mes, dia] = data.split('-');
    
    const manha = agendamentos[data]?.['manhã'] || [];
    const tarde = agendamentos[data]?.['tarde'] || [];

    // Gera HTML da lista lateral
    let html = `
        <div class="glass-card">
            <div class="card-header">
                <h3 class="card-title">Agendamentos: ${dia}/${mes}/${ano}</h3>
            </div>
            <div class="card-content">
                <!-- Manhã -->
                <h4 style="color:var(--color-warning); margin-bottom:10px;">Manhã (${manha.length}/${LIMITE_VAGAS})</h4>
                <ul style="list-style:none; padding:0; margin-bottom:20px;">
                    ${manha.map((p, idx) => `
                        <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                            ${p.paciente}
                            <button onclick="removerPaciente('${data}', 'manhã', ${idx})" style="color:red; border:none; background:none; cursor:pointer;"><i class="bi bi-trash"></i></button>
                        </li>
                    `).join('')}
                </ul>
                ${manha.length < LIMITE_VAGAS ? `
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="input-manha" class="form-input" placeholder="Nome Paciente">
                        <button class="btn btn-primary btn-sm" onclick="adicionarPaciente('${data}', 'manhã')">+</button>
                    </div>
                ` : '<small style="color:red">Lotado</small>'}

                <hr style="margin: 20px 0; border:0; border-top:1px solid #eee;">

                <!-- Tarde -->
                <h4 style="color:var(--color-primary); margin-bottom:10px;">Tarde (${tarde.length}/${LIMITE_VAGAS})</h4>
                <ul style="list-style:none; padding:0; margin-bottom:20px;">
                    ${tarde.map((p, idx) => `
                        <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                            ${p.paciente}
                            <button onclick="removerPaciente('${data}', 'tarde', ${idx})" style="color:red; border:none; background:none; cursor:pointer;"><i class="bi bi-trash"></i></button>
                        </li>
                    `).join('')}
                </ul>
                ${tarde.length < LIMITE_VAGAS ? `
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="input-tarde" class="form-input" placeholder="Nome Paciente">
                        <button class="btn btn-primary btn-sm" onclick="adicionarPaciente('${data}', 'tarde')">+</button>
                    </div>
                ` : '<small style="color:red">Lotado</small>'}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// --- 8. CRUD (Adicionar/Remover) ---
function adicionarPaciente(data, turno) {
    const input = document.getElementById(`input-${turno}`);
    const nome = input.value.trim();
    if (!nome) return alert("Digite o nome.");

    let lista = agendamentos[data]?.[turno] || [];
    lista.push({ paciente: nome, status: 'agendado' });

    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => mostrarAgendamentosDoDia(data));
}

function removerPaciente(data, turno, index) {
    if(!confirm("Remover paciente?")) return;
    
    let lista = agendamentos[data]?.[turno] || [];
    lista.splice(index, 1);

    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => mostrarAgendamentosDoDia(data));
}

// --- 9. BUSCA GLOBAL (CORRIGIDA) ---
function buscarAgendamentosGlobais() {
    const termo = document.getElementById('globalSearchInput').value.toLowerCase();
    const container = document.getElementById('searchResultsContainer');
    
    if (termo.length < 3) {
        container.style.display = 'none';
        return;
    }

    const resultados = [];
    Object.keys(agendamentos).forEach(data => {
        ['manhã', 'tarde'].forEach(turno => {
            if (agendamentos[data][turno]) {
                agendamentos[data][turno].forEach(ag => {
                    if (ag.paciente && ag.paciente.toLowerCase().includes(termo)) {
                        resultados.push({ ...ag, data, turno });
                    }
                });
            }
        });
    });

    // Ordena por data
    resultados.sort((a, b) => new Date(b.data) - new Date(a.data));

    // [CORREÇÃO] Ícone X-Circle-Fill e Botão Limpar Funcional
    let html = `
        <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <strong>Resultados: ${resultados.length}</strong>
            <button class="btn-clear-search" onclick="limparBuscaGlobal()" title="Fechar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                </svg>
            </button>
        </div>
    `;

    if (resultados.length === 0) {
        html += `<div style="padding:15px; text-align:center; color:#888;">Nenhum resultado.</div>`;
    } else {
        resultados.forEach(res => {
            const dataFmt = res.data.split('-').reverse().join('/');
            html += `
            <div class="search-result-item" onclick="pularParaAgendamento('${res.data}')">
                <div>
                    <div style="font-weight:600; color:var(--color-primary)">${res.paciente}</div>
                    <small style="color:#666">${dataFmt} - ${res.turno}</small>
                </div>
                <button class="btn btn-sm btn-secondary">Ver</button>
            </div>`;
        });
    }

    container.innerHTML = html;
    container.style.display = 'block';
}

// [CORREÇÃO] Função Global para Limpar Busca
function limparBuscaGlobal() {
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('searchResultsContainer').style.display = 'none';
}

// [CORREÇÃO] Navegação Segura (Race Condition Fix)
function pularParaAgendamento(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    
    // 1. Muda o mês global
    currentDate = new Date(ano, mes - 1, 1);
    
    // 2. Renderiza o calendário
    renderCalendar();
    
    // 3. Limpa a busca
    limparBuscaGlobal();

    // 4. Espera renderizar e faz o scroll
    setTimeout(() => {
        const dayId = `day-${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const el = document.getElementById(dayId);
        
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-day');
            setTimeout(() => el.classList.remove('highlight-day'), 2000);
            
            // Abre os detalhes automaticamente
            mostrarAgendamentosDoDia(dataString);
        }
    }, 200);
}

// --- 10. BACKUP E VAGAS ---
function fazerBackup() {
    const dataStr = JSON.stringify(agendamentos, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_agenda_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function restaurarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if(confirm("Substituir todos os dados?")) {
            database.ref('agendamentos').set(JSON.parse(e.target.result));
        }
    };
    reader.readAsText(file);
}

function procurarVagas() {
    const inicio = document.getElementById('vagasStartDate').value;
    const fim = document.getElementById('vagasEndDate').value;
    const container = document.getElementById('vagasResultadosContainer');
    const sumario = document.getElementById('vagasSumario');

    if (!inicio || !fim) return alert("Selecione as datas.");

    let current = new Date(inicio);
    const end = new Date(fim);
    let html = '<ul style="list-style:none; padding:0;">';
    let encontrou = false;

    while (current <= end) {
        if (current.getDay() !== 0 && current.getDay() !== 6) {
            const dStr = current.toISOString().split('T')[0];
            const m = agendamentos[dStr]?.['manhã']?.length || 0;
            const t = agendamentos[dStr]?.['tarde']?.length || 0;

            if (m < LIMITE_VAGAS || t < LIMITE_VAGAS) {
                encontrou = true;
                html += `
                <li style="padding:8px; border-bottom:1px solid #eee;">
                    <strong>${dStr.split('-').reverse().join('/')}</strong>: 
                    Manhã (${LIMITE_VAGAS-m} livres), Tarde (${LIMITE_VAGAS-t} livres)
                </li>`;
            }
        }
        current.setDate(current.getDate() + 1);
    }
    html += '</ul>';

    sumario.innerHTML = encontrou ? html : '<p>Nenhuma vaga no período.</p>';
    container.classList.remove('hidden');
}

// --- EXPORTAÇÃO GLOBAL ---
window.limparBuscaGlobal = limparBuscaGlobal;
window.pularParaAgendamento = pularParaAgendamento;
window.adicionarPaciente = adicionarPaciente;
window.removerPaciente = removerPaciente;
