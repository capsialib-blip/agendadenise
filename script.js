// --- 1. CONFIGURAÇÃO FIREBASE ---
// (Mantenha suas chaves originais aqui)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:00000000:web:00000000"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. ESTADO GLOBAL ---
let currentDate = new Date();
let agendamentos = {}; 
const LIMITE_VAGAS = 8; // Por turno

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Define data no Dashboard
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataFormatada = new Date().toLocaleDateString('pt-BR', options);
    const elData = document.getElementById('data-hoje-extenso'); // Ajustado para o ID do HTML anterior
    if(elData) elData.innerText = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

    // Listeners de Arquivo (Restore)
    const fileInput = document.getElementById('file-restore');
    if(fileInput) fileInput.addEventListener('change', restaurarBackup);

    // Carrega dados
    carregarDadosFirebase();

    // Renderiza calendário
    renderCalendar();

    // [CRÍTICO] Força Dashboard para evitar layout quebrado
    showSection('dashboard');

    // Configura Busca
    setupSearchListener();
}

// --- 4. NAVEGAÇÃO (CORREÇÃO DE LAYOUT) ---
function showSection(sectionId) {
    // Esconde tudo
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    
    // Mostra a seção certa
    const target = document.getElementById(sectionId);
    if(target) target.style.display = 'block';

    // Atualiza Menu
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(sectionId)) {
            btn.classList.add('active');
        }
    });
}

// --- 5. FIREBASE ---
function carregarDadosFirebase() {
    const ref = database.ref('agendamentos');
    ref.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            agendamentos = data;
        } else {
            agendamentos = {};
        }
        renderCalendar();
        atualizarDashboard();
    });
}

// --- 6. CALENDÁRIO ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('current-month-display').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Cabeçalhos
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekDays.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-header-day'; // Classe auxiliar se precisar CSS extra
        div.style.textAlign = 'center';
        div.style.fontWeight = 'bold';
        div.style.color = '#8E8E93';
        div.style.fontSize = '0.8rem';
        div.style.paddingBottom = '10px';
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
        div.id = `day-${dateStr}`; 
        div.className = 'calendar-day';
        
        // [AÇÃO] Clique abre o modal de CRUD
        div.onclick = () => abrirModalDia(dateStr);

        // Vagas
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

        // Hoje
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
    // Formata data para título
    const [ano, mes, dia] = data.split('-');
    const titulo = `Agendamentos: ${dia}/${mes}/${ano}`;
    
    // Prepara HTML do Modal
    const modalOverlay = document.getElementById('print-container'); // Usando container temporário ou criando um
    // Na verdade, vamos usar o modal genérico do HTML fornecido anteriormente
    
    // Injeta o HTML do Modal dinamicamente se não existir, ou usa o existente
    let modal = document.getElementById('modal-overlay');
    if(!modal) {
        alert('Erro: Modal não encontrado no HTML.');
        return;
    }

    document.getElementById('modal-title').innerText = titulo;
    
    // Renderiza lista de pacientes
    renderizarListaModal(data);

    // Mostra modal
    modal.style.display = 'flex';
}

function renderizarListaModal(data) {
    const corpo = document.getElementById('modal-body'); // Certifique-se que esse ID existe no HTML
    if(!corpo) return;

    const manha = agendamentos[data]?.['manhã'] || [];
    const tarde = agendamentos[data]?.['tarde'] || [];

    let html = `
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <!-- Coluna Manhã -->
            <div style="flex:1; min-width:250px;">
                <h4 style="color:var(--ios-orange)">Manhã (${manha.length}/${LIMITE_VAGAS})</h4>
                <ul style="list-style:none; padding:0;">
                    ${manha.map((p, idx) => `
                        <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                            <span>${p.paciente}</span>
                            <button onclick="removerPaciente('${data}', 'manhã', ${idx})" style="color:red; border:none; background:none; cursor:pointer;">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
                ${manha.length < LIMITE_VAGAS ? `
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="input-manha" placeholder="Nome do Paciente" style="flex:1; padding:5px;">
                        <button class="btn-primary btn-sm" onclick="adicionarPaciente('${data}', 'manhã')">+</button>
                    </div>
                ` : '<small style="color:red">Lotado</small>'}
            </div>

            <!-- Coluna Tarde -->
            <div style="flex:1; min-width:250px;">
                <h4 style="color:var(--ios-blue)">Tarde (${tarde.length}/${LIMITE_VAGAS})</h4>
                <ul style="list-style:none; padding:0;">
                    ${tarde.map((p, idx) => `
                        <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                            <span>${p.paciente}</span>
                            <button onclick="removerPaciente('${data}', 'tarde', ${idx})" style="color:red; border:none; background:none; cursor:pointer;">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
                ${tarde.length < LIMITE_VAGAS ? `
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="input-tarde" placeholder="Nome do Paciente" style="flex:1; padding:5px;">
                        <button class="btn-primary btn-sm" onclick="adicionarPaciente('${data}', 'tarde')">+</button>
                    </div>
                ` : '<small style="color:red">Lotado</small>'}
            </div>
        </div>
    `;
    
    corpo.innerHTML = html;
    
    // Esconde botão "Salvar" genérico pois estamos salvando direto
    const btnSalvar = document.getElementById('modal-action-btn');
    if(btnSalvar) btnSalvar.style.display = 'none';
}

function adicionarPaciente(data, turno) {
    const input = document.getElementById(`input-${turno}`);
    const nome = input.value.trim();
    
    if (!nome) return alert('Digite o nome do paciente.');

    // Recupera lista atual
    let lista = agendamentos[data]?.[turno] || [];
    
    // Adiciona
    lista.push({ paciente: nome, status: 'agendado' });
    
    // Salva no Firebase
    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => {
            renderizarListaModal(data); // Atualiza modal
            // O listener global vai atualizar o calendário
        })
        .catch(err => alert('Erro ao salvar: ' + err.message));
}

function removerPaciente(data, turno, index) {
    if(!confirm('Remover este paciente?')) return;

    let lista = agendamentos[data]?.[turno] || [];
    lista.splice(index, 1);

    database.ref(`agendamentos/${data}/${turno}`).set(lista)
        .then(() => renderizarListaModal(data));
}

function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// --- 8. BUSCA GLOBAL ---
function setupSearchListener() {
    const input = document.getElementById('global-search');
    let timeout;
    if (input) {
        input.addEventListener('keyup', () => {
            clearTimeout(timeout);
            timeout = setTimeout(buscarAgendamentosGlobais, 300);
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

    resultados.sort((a, b) => new Date(b.data) - new Date(a.data));

    let html = `
        <div class="search-header">
            <h4>Resultados: ${resultados.length}</h4>
            <button class="btn-clear-search" onclick="limparBuscaGlobal()">
                <i class="bi bi-x-circle-fill" style="font-size: 1.2rem;"></i>
            </button>
        </div>
        <div class="search-scroll-area">
    `;

    if (resultados.length === 0) {
        html += `<p style="padding:15px; text-align:center; color:#666;">Nenhum resultado.</p>`;
    } else {
        resultados.forEach(res => {
            const dataPt = res.data.split('-').reverse().join('/');
            html += `
            <div class="search-result-item">
                <div>
                    <strong>${res.paciente}</strong><br>
                    <small>${dataPt} • ${res.turno}</small>
                </div>
                <button class="btn-secondary btn-sm" onclick="pularParaAgendamento('${res.data}')">Ver</button>
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
    currentDate = new Date(ano, mes - 1, 1);
    showSection('calendario');
    renderCalendar();
    limparBuscaGlobal();

    setTimeout(() => {
        const dayId = `day-${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const el = document.getElementById(dayId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-day');
            setTimeout(() => el.classList.remove('highlight-day'), 2000);
        }
    }, 200);
}

// --- 9. BACKUP E RESTAURAÇÃO ---
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
            if (confirm('Isso substituirá TODOS os dados atuais. Tem certeza?')) {
                database.ref('agendamentos').set(json)
                    .then(() => alert('Backup restaurado com sucesso!'))
                    .catch(err => alert('Erro ao restaurar: ' + err.message));
            }
        } catch (err) {
            alert('Arquivo inválido.');
        }
    };
    reader.readAsText(file);
}

// --- 10. PROCURAR VAGAS ---
function procurarVagas() {
    const inicio = document.getElementById('vaga-inicio').value;
    const fim = document.getElementById('vaga-fim').value;

    if (!inicio || !fim) return alert('Selecione data inicial e final.');

    let current = new Date(inicio);
    const end = new Date(fim);
    let diasLivres = [];

    while (current <= end) {
        const ano = current.getFullYear();
        const mes = String(current.getMonth() + 1).padStart(2, '0');
        const dia = String(current.getDate()).padStart(2, '0');
        const dataStr = `${ano}-${mes}-${dia}`;

        // Ignora finais de semana (0=Dom, 6=Sab)
        const diaSemana = current.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
            const manha = agendamentos[dataStr]?.['manhã']?.length || 0;
            const tarde = agendamentos[dataStr]?.['tarde']?.length || 0;
            
            if (manha < LIMITE_VAGAS || tarde < LIMITE_VAGAS) {
                diasLivres.push(`${dia}/${mes} (M:${LIMITE_VAGAS-manha}, T:${LIMITE_VAGAS-tarde})`);
            }
        }
        current.setDate(current.getDate() + 1);
    }

    if (diasLivres.length > 0) {
        alert(`Vagas encontradas nos dias:\n\n${diasLivres.slice(0, 10).join('\n')}${diasLivres.length > 10 ? '\n...' : ''}`);
    } else {
        alert('Nenhuma vaga encontrada neste período.');
    }
}

// --- 11. DASHBOARD ---
function atualizarDashboard() {
    let total = 0;
    const hoje = new Date().toISOString().split('T')[0];
    
    if (agendamentos[hoje]) {
        total += (agendamentos[hoje]['manhã']?.length || 0);
        total += (agendamentos[hoje]['tarde']?.length || 0);
    }
    
    const elTotal = document.getElementById('dash-total');
    if(elTotal) elTotal.innerText = total;
}

// --- EXPORTAÇÃO GLOBAL ---
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
