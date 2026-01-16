/**
 * ARCOSAFE - Agenda CAPS (Versão Final Completa)
 * 
 * Funcionalidades:
 * 1. Autenticação (Login/Logout) com controle de interface.
 * 2. Calendário Dinâmico com controle de vagas (8 por turno).
 * 3. CRUD Completo (Modal de Agendamento).
 * 4. Busca Global com navegação inteligente (Scroll + Highlight).
 * 5. Backup (JSON) e Restauração.
 */

// --- 1. CONFIGURAÇÃO FIREBASE (Mantenha suas chaves) ---
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:00000000:web:00000000"
};

// Inicializa Firebase apenas se não existir
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

// --- 2. ESTADO GLOBAL ---
let currentDate = new Date();
let agendamentos = {}; 
const LIMITE_VAGAS = 8; // Vagas por turno (Manhã/Tarde)

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Listener de Autenticação
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Usuário autenticado:", user.email);
            carregarDadosFirebase();
            renderCalendar();
            showSection('dashboard'); // Vai para o sistema
        } else {
            console.log("Usuário não autenticado.");
            showSection('login'); // Vai para o login
        }
    });

    // Listener para Upload de Backup
    const fileInput = document.getElementById('file-restore');
    if(fileInput) {
        fileInput.addEventListener('change', restaurarBackup);
    }

    // Configura a Busca Global
    setupSearchListener();
}

// --- 4. AUTENTICAÇÃO & NAVEGAÇÃO ---

function fazerLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    // Feedback visual
    const btn = event.target.querySelector('button');
    const textoOriginal = btn.innerText;
    btn.innerText = "Autenticando...";
    btn.disabled = true;

    auth.signInWithEmailAndPassword(email, senha)
        .then(() => {
            // O listener onAuthStateChanged fará o redirecionamento
        })
        .catch((error) => {
            alert("Erro ao entrar: " + error.message);
            btn.innerText = textoOriginal;
            btn.disabled = false;
        });
}

function logout() {
    if(confirm("Deseja realmente sair do sistema?")) {
        auth.signOut();
    }
}

function showSection(sectionId) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // 2. Mostra a seção desejada
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';

    // 3. Controla o Header (Menu)
    const header = document.getElementById('main-header');
    if (sectionId === 'login') {
        header.style.display = 'none'; // Esconde menu no login
    } else {
        header.style.display = 'flex'; // Mostra menu no sistema
        
        // Atualiza data no dashboard se necessário
        if(sectionId === 'dashboard') {
            atualizarDataDashboard();
        }
    }

    // 4. Atualiza botões do menu (Visual Ativo)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(sectionId)) {
            btn.classList.add('active');
        }
    });
}

// --- 5. FIREBASE DADOS ---

function carregarDadosFirebase() {
    const ref = database.ref('agendamentos');
    ref.on('value', (snapshot) => {
        const data = snapshot.val();
        agendamentos = data || {}; // Garante que seja um objeto
        renderCalendar();
        atualizarDashboard();
        
        // Se houver busca ativa, atualiza os resultados em tempo real
        const searchInput = document.getElementById('global-search');
        if (searchInput && searchInput.value.length >= 3) {
            buscarAgendamentosGlobais();
        }
    });
}

// --- 6. CALENDÁRIO ---

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Atualiza Título
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('current-month-display').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Domingo

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Cabeçalhos
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekDays.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-header-day';
        div.innerText = d;
        grid.appendChild(div);
    });

    // Espaços vazios
    for (let i = 0; i < startingDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Dias
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const div = document.createElement('div');
        
        // ID CRÍTICO PARA A BUSCA
        div.id = `day-${dateStr}`; 
        div.className = 'calendar-day';
        div.onclick = () => abrirModalDia(dateStr);

        // Cálculo de Vagas
        const totalManha = agendamentos[dateStr]?.['manhã']?.length || 0;
        const totalTarde = agendamentos[dateStr]?.['tarde']?.length || 0;
        const total = totalManha + totalTarde;
        const vagasRestantes = (LIMITE_VAGAS * 2) - total;

        let badgeClass = 'bg-livre';
        let textoVagas = `${vagasRestantes} vagas`;
        
        if (vagasRestantes <= 0) {
            badgeClass = 'bg-lotado';
            textoVagas = 'Lotado';
        } else if (total > 0) {
            badgeClass = 'bg-parcial';
        }

        div.innerHTML = `
            <span class="day-number">${i}</span>
            <span class="vagas-badge ${badgeClass}">${textoVagas}</span>
        `;

        // Marca Hoje
        const hoje = new Date();
        if (i === hoje.getDate() && month === hoje.getMonth() && year === hoje.getFullYear()) {
            div.classList.add('today');
        }

        grid.appendChild(div);
    }
}

function prevMonth() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); }
function nextMonth() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); }
function pularParaHoje() { currentDate = new Date(); renderCalendar(); }

// --- 7. CRUD (MODAL DE AGENDAMENTO) ---

function abrirModalDia(data) {
    const [ano, mes, dia] = data.split('-');
    document.getElementById('modal-title').innerText = `Agendamentos: ${dia}/${mes}/${ano}`;
    
    renderizarListaModal(data);
    
    const modal = document.getElementById('modal-overlay');
    modal.style.display = 'flex';
}

function renderizarListaModal(data) {
    const corpo = document.getElementById('modal-body');
    const manha = agendamentos[data]?.['manhã'] || [];
    const tarde = agendamentos[data]?.['tarde'] || [];

    // Função auxiliar para gerar HTML da lista
    const gerarHTMLLista = (lista, turno, cor) => `
        <div style="flex: 1; min-width: 280px; margin-bottom: 20px;">
            <h4 style="color: var(--ios-${cor}); margin-bottom: 10px; border-bottom: 2px solid var(--ios-${cor}); padding-bottom: 5px;">
                ${turno.charAt(0).toUpperCase() + turno.slice(1)} 
                <span style="float:right; font-size:0.8em;">${lista.length}/${LIMITE_VAGAS}</span>
            </h4>
            
            <ul style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">
                ${lista.map((p, idx) => `
                    <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight:500;">${p.paciente}</span>
                        <button onclick="removerPaciente('${data}', '${turno}', ${idx})" 
                                style="color: var(--ios-red); background: none; border: none; cursor: pointer; padding: 5px;">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </li>
                `).join('')}
                ${lista.length === 0 ? '<li style="color:#999; padding:10px; font-style:italic;">Nenhum paciente.</li>' : ''}
            </ul>

            ${lista.length < LIMITE_VAGAS ? `
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <input type="text" id="input-${turno}" placeholder="Nome do Paciente" 
                           style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 8px;">
                    <button class="btn-primary btn-sm" onclick="adicionarPaciente('${data}', '${turno}')">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
            ` : `<div style="margin-top:10px; padding:10px; background:rgba(255,59,48,0.1); color:var(--ios-red); border-radius:8px; text-align:center; font-weight:600;">Turno Lotado</div>`}
        </div>
    `;

    corpo.innerHTML = `
        <div style="display: flex; gap: 30px; flex-wrap: wrap;">
            ${gerarHTMLLista(manha, 'manhã', 'orange')}
            ${gerarHTMLLista(tarde, 'tarde', 'blue')}
        </div>
    `;
}

function adicionarPaciente(data, turno) {
    const input = document.getElementById(`input-${turno}`);
    const nome = input.value.trim();
    
    if (!nome) return alert("Por favor, digite o nome do paciente.");

    let lista = agendamentos[data]?.[turno] || [];
    lista.push({ paciente: nome, status: 'agendado', timestamp: Date.now() });

    // Salva no Firebase
    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => {
            renderizarListaModal(data); // Atualiza a tela
        })
        .catch(err => alert("Erro ao salvar: " + err.message));
}

function removerPaciente(data, turno, index) {
    if(!confirm("Tem certeza que deseja remover este paciente?")) return;

    let lista = agendamentos[data]?.[turno] || [];
    lista.splice(index, 1); // Remove do array

    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => {
            renderizarListaModal(data);
        })
        .catch(err => alert("Erro ao remover: " + err.message));
}

function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// --- 8. BUSCA GLOBAL ---

function setupSearchListener() {
    const input = document.getElementById('global-search');
    let timeout = null;
    
    if (input) {
        input.addEventListener('keyup', () => {
            clearTimeout(timeout);
            timeout = setTimeout(buscarAgendamentosGlobais, 300); // Debounce de 300ms
        });
    }
}

function buscarAgendamentosGlobais() {
    const termo = document.getElementById('global-search').value.toLowerCase();
    const container = document.getElementById('search-results-container');
    
    if (termo.length < 3) {
        container.style.display = 'none';
        return;
    }

    const resultados = [];
    
    // Varredura nos dados
    if (agendamentos) {
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
    }

    // Ordenação por data (mais recente primeiro)
    resultados.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Gera HTML
    let html = `
        <div class="search-header">
            <h4>Resultados encontrados: ${resultados.length}</h4>
            <button class="btn-clear-search" onclick="limparBuscaGlobal()" title="Fechar">
                <i class="bi bi-x-circle-fill" style="font-size: 1.2rem;"></i>
            </button>
        </div>
        <div class="search-scroll-area">
    `;

    if (resultados.length === 0) {
        html += `<p style="padding: 20px; text-align: center; color: #888;">Nenhum paciente encontrado.</p>`;
    } else {
        resultados.forEach(res => {
            const dataFormatada = res.data.split('-').reverse().join('/');
            const turnoFmt = res.turno.charAt(0).toUpperCase() + res.turno.slice(1);
            
            html += `
            <div class="search-result-item">
                <div>
                    <strong style="color: var(--ios-blue);">${res.paciente}</strong><br>
                    <small style="color: #666;">${dataFormatada} • ${turnoFmt}</small>
                </div>
                <button class="btn-secondary btn-sm" onclick="pularParaAgendamento('${res.data}')">
                    Ver na Agenda
                </button>
            </div>`;
        });
    }
    html += `</div>`;

    container.innerHTML = html;
    container.style.display = 'block';
}

function limparBuscaGlobal() {
    document.getElementById('global-search').value = '';
    document.getElementById('search-results-container').style.display = 'none';
}

function pularParaAgendamento(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    
    // 1. Muda a data global
    currentDate = new Date(ano, mes - 1, 1);
    
    // 2. Vai para o calendário
    showSection('calendario');
    renderCalendar();
    
    // 3. Limpa a busca
    limparBuscaGlobal();

    // 4. Scroll e Highlight (com delay para renderização)
    setTimeout(() => {
        const dayId = `day-${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const element = document.getElementById(dayId);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-day');
            
            setTimeout(() => {
                element.classList.remove('highlight-day');
            }, 2000);
        }
    }, 200);
}

// --- 9. BACKUP, RESTAURAÇÃO E VAGAS ---

function fazerBackup() {
    const dataStr = JSON.stringify(agendamentos, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_agenda_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function restaurarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (confirm("ATENÇÃO: Isso substituirá TODOS os dados atuais da agenda. Deseja continuar?")) {
                database.ref('agendamentos').set(json)
                    .then(() => alert("Backup restaurado com sucesso!"))
                    .catch(err => alert("Erro ao restaurar: " + err.message));
            }
        } catch (err) {
            alert("Arquivo de backup inválido.");
        }
    };
    reader.readAsText(file);
}

function procurarVagas() {
    const inicio = document.getElementById('vaga-inicio').value;
    const fim = document.getElementById('vaga-fim').value;

    if (!inicio || !fim) return alert("Selecione a data inicial e final.");

    let current = new Date(inicio);
    const end = new Date(fim);
    let diasLivres = [];

    while (current <= end) {
        // Ignora Sábado (6) e Domingo (0)
        if (current.getDay() !== 0 && current.getDay() !== 6) {
            const ano = current.getFullYear();
            const mes = String(current.getMonth() + 1).padStart(2, '0');
            const dia = String(current.getDate()).padStart(2, '0');
            const dataStr = `${ano}-${mes}-${dia}`;

            const manha = agendamentos[dataStr]?.['manhã']?.length || 0;
            const tarde = agendamentos[dataStr]?.['tarde']?.length || 0;

            if (manha < LIMITE_VAGAS || tarde < LIMITE_VAGAS) {
                diasLivres.push(`${dia}/${mes}/${ano} (M:${LIMITE_VAGAS-manha}, T:${LIMITE_VAGAS-tarde})`);
            }
        }
        current.setDate(current.getDate() + 1);
    }

    if (diasLivres.length > 0) {
        alert(`Vagas encontradas:\n\n${diasLivres.slice(0, 15).join('\n')}${diasLivres.length > 15 ? '\n...e mais.' : ''}`);
    } else {
        alert("Nenhuma vaga encontrada neste período.");
    }
}

// --- 10. UTILITÁRIOS ---

function atualizarDataDashboard() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataFormatada = new Date().toLocaleDateString('pt-BR', options);
    const el = document.getElementById('data-hoje-extenso');
    if (el) el.innerText = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

function atualizarDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    let total = 0;
    
    if (agendamentos[hoje]) {
        total += (agendamentos[hoje]['manhã']?.length || 0);
        total += (agendamentos[hoje]['tarde']?.length || 0);
    }
    
    const elTotal = document.getElementById('dash-total');
    if (elTotal) elTotal.innerText = total;
}

// Expor funções para o HTML (Global Scope)
window.fazerLogin = fazerLogin;
window.logout = logout;
window.showSection = showSection;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.pularParaHoje = pularParaHoje;
window.limparBuscaGlobal = limparBuscaGlobal;
window.pularParaAgendamento = pularParaAgendamento;
window.fazerBackup = fazerBackup;
window.restaurarBackup = restaurarBackup;
window.procurarVagas = procurarVagas;
window.abrirModalDia = abrirModalDia;
window.fecharModal = fecharModal;
window.adicionarPaciente = adicionarPaciente;
window.removerPaciente = removerPaciente;
