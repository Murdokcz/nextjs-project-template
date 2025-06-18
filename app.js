// Data structure initialization
const initialData = {
    transactions: [],
    goals: [],
    incomeCategories: ['Corrida', 'Gorjeta', 'Bônus', 'Vendas'],
    expenseCategories: [
        'Combustível',
        'Manutenção',
        'Alimentação',
        'Lavagem',
        'Pedágio',
        'Estacionamento',
        'Aluguel',
        'Seguro',
        'IPVA',
        'Licenciamento',
        'Multas',
        'Internet',
        'Reserva',
        'Outros'
    ],
    apps: ['Uber', '99', 'inDriver']
};

// Initialize localStorage if empty
if (!localStorage.getItem('driverFinanceData')) {
    localStorage.setItem('driverFinanceData', JSON.stringify(initialData));
}

// Get data from localStorage
function getData() {
    return JSON.parse(localStorage.getItem('driverFinanceData'));
}

// Save data to localStorage
function saveData(data) {
    localStorage.setItem('driverFinanceData', JSON.stringify(data));
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    initializeApp();
});

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Transaction Management
const transactionForm = document.getElementById('transactionForm');
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transaction = {
        id: Date.now(),
        type: document.getElementById('transactionType').value,
        date: document.getElementById('transactionDate').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        category: document.getElementById('transactionCategory').value,
        app: document.getElementById('transactionApp').value,
        notes: document.getElementById('transactionNotes').value
    };

    const data = getData();
    data.transactions.push(transaction);
    saveData(data);

    // Reset form and update views
    transactionForm.reset();
    updateDashboard();
    updateTransactionsList();
    showNotification('Transação registrada com sucesso!');
});

// Update transaction categories based on type
function updateTransactionCategories(type) {
    const categorySelect = document.getElementById('transactionCategory');
    const appSelectGroup = document.getElementById('appSelectGroup');
    const data = getData();
    
    categorySelect.innerHTML = '';
    const categories = type === 'income' ? data.incomeCategories : data.expenseCategories;
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Show/hide app select for income
    appSelectGroup.style.display = type === 'income' ? 'block' : 'none';
}

// Update apps dropdown
function updateAppsDropdown() {
    const appSelect = document.getElementById('transactionApp');
    const data = getData();
    
    appSelect.innerHTML = '';
    data.apps.forEach(app => {
        const option = document.createElement('option');
        option.value = app;
        option.textContent = app;
        appSelect.appendChild(option);
    });
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initial category population
    updateTransactionCategories('income');
    updateAppsDropdown();
    
    // Update categories when transaction type changes
    document.getElementById('transactionType').addEventListener('change', (e) => {
        updateTransactionCategories(e.target.value);
    });

    // Fuel consumption form handling
    const fuelForm = document.getElementById('fuelForm');
    if (fuelForm) {
        fuelForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const km = parseFloat(document.getElementById('fuelKm').value);
                const efficiency = parseFloat(document.getElementById('fuelEfficiency').value);
                const price = parseFloat(document.getElementById('fuelPrice').value);
                const priceType = document.querySelector('input[name="priceType"]:checked').value;

                if (isNaN(km) || isNaN(efficiency) || isNaN(price) || km <= 0 || efficiency <= 0 || price < 0) {
                    throw new Error("Por favor, insira valores válidos para todos os campos.");
                }

                const litrosConsumidos = km / efficiency;
                let totalGasto;
                if (priceType === 'perLiter') {
                    totalGasto = litrosConsumidos * price;
                } else {
                    totalGasto = price;
                }
                const consumoMedio = km / litrosConsumidos;

                const resultHTML = `
                    <p><strong>Litros Consumidos:</strong> ${litrosConsumidos.toFixed(2)} L</p>
                    <p><strong>Valor Total Gasto:</strong> R$ ${totalGasto.toFixed(2)}</p>
                    <p><strong>Consumo Médio:</strong> ${consumoMedio.toFixed(2)} km/l</p>
                `;

                document.getElementById('fuelResults').innerHTML = resultHTML;

                const fuelRecord = {
                    id: Date.now(),
                    km,
                    efficiency,
                    price,
                    priceType,
                    litrosConsumidos,
                    totalGasto,
                    consumoMedio,
                    date: new Date().toISOString()
                };
                let fuelRecords = JSON.parse(localStorage.getItem('fuelRecords') || '[]');
                fuelRecords.push(fuelRecord);
                localStorage.setItem('fuelRecords', JSON.stringify(fuelRecords));
            } catch (error) {
                document.getElementById('fuelResults').innerHTML = `<p class="text-danger">${error.message}</p>`;
            }
        });
    }
});

// Update Dashboard
function updateDashboard() {
    const data = getData();
    const currentMonth = new Date().getMonth();
    
    // Filter transactions for current month
    const monthTransactions = data.transactions.filter(t => {
        const transactionMonth = new Date(t.date).getMonth();
        return transactionMonth === currentMonth;
    });

    // Calculate totals
    const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = monthIncome - monthExpenses;

    // Update dashboard cards
    document.querySelector('.balance').textContent = formatCurrency(balance);
    document.querySelector('.income').textContent = formatCurrency(monthIncome);
    document.querySelector('.expenses').textContent = formatCurrency(monthExpenses);

    // Update goal progress
    updateGoalProgress(monthIncome);
    
    // Update dashboard chart
    if (monthTransactions.length > 0) {
        updateDashboardChart(monthTransactions);
    }
}

// Update Dashboard Chart
function updateDashboardChart(transactions) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const days = {};
    
    // Group transactions by day
    transactions.forEach(t => {
        const day = new Date(t.date).getDate();
        if (!days[day]) {
            days[day] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            days[day].income += t.amount;
        } else {
            days[day].expense += t.amount;
        }
    });

    // Clear previous chart
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Set chart dimensions
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 40;
    const availableWidth = width - (padding * 2);
    const availableHeight = height - (padding * 2);
    
    // Find max value for scaling
    const maxValue = Math.max(
        ...Object.values(days).map(d => Math.max(d.income, d.expense))
    );
    
    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.strokeStyle = '#64748b';
    ctx.stroke();
    
    // Plot data
    const dayWidth = availableWidth / Object.keys(days).length;
    
    Object.entries(days).forEach(([day, data], index) => {
        const x = padding + (index * dayWidth);
        
        // Draw income bar
        const incomeHeight = (data.income / maxValue) * availableHeight;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(
            x + (dayWidth * 0.2),
            height - padding - incomeHeight,
            dayWidth * 0.3,
            incomeHeight
        );
        
        // Draw expense bar
        const expenseHeight = (data.expense / maxValue) * availableHeight;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
            x + (dayWidth * 0.5),
            height - padding - expenseHeight,
            dayWidth * 0.3,
            expenseHeight
        );
        
        // Draw day label
        ctx.fillStyle = '#64748b';
        ctx.fillText(day, x + (dayWidth / 2), height - (padding / 2));
    });
    
    // Draw legend
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(padding, padding / 2, 20, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Ganhos', padding + 30, padding / 2 + 8);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding + 100, padding / 2, 20, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Despesas', padding + 130, padding / 2 + 8);
}

// Update Goal Progress
function updateGoalProgress(currentIncome) {
    const data = getData();
    const currentGoal = data.goals[0]; // Get most recent goal
    
    if (currentGoal) {
        const progress = (currentIncome / currentGoal.amount) * 100;
        const progressBar = document.querySelector('.progress');
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        document.querySelector('.goal-progress p').textContent = `${Math.round(progress)}%`;
    }
}

// Goals Management
const goalForm = document.getElementById('goalForm');
goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const goal = {
        id: Date.now(),
        description: document.getElementById('goalDescription').value,
        amount: parseFloat(document.getElementById('goalAmount').value),
        date: document.getElementById('goalDate').value,
        completed: false
    };

    const data = getData();
    data.goals.push(goal);
    saveData(data);

    goalForm.reset();
    updateGoalsList();
    updateDashboard();
    showNotification('Meta adicionada com sucesso!');
});

// Update Goals List
function updateGoalsList() {
    const goalsList = document.getElementById('goalsList');
    const data = getData();
    
    goalsList.innerHTML = data.goals.map(goal => `
        <div class="goal-card ${goal.completed ? 'completed' : ''}">
            <h4>${goal.description}</h4>
            <p>Meta: ${formatCurrency(goal.amount)}</p>
            <p>Data Limite: ${new Date(goal.date).toLocaleDateString()}</p>
            <button onclick="toggleGoalCompletion(${goal.id})" class="btn-secondary">
                ${goal.completed ? 'Reabrir' : 'Completar'}
            </button>
        </div>
    `).join('');
}

// Toggle Goal Completion
function toggleGoalCompletion(goalId) {
    const data = getData();
    const goal = data.goals.find(g => g.id === goalId);
    if (goal) {
        goal.completed = !goal.completed;
        saveData(data);
        updateGoalsList();
    }
}

// Reports
function updateReports() {
    const data = getData();
    const period = document.getElementById('reportPeriod').value;
    const selectedApp = document.getElementById('reportApp').value;
    
    // Filter transactions based on period and app
    const filteredTransactions = filterTransactionsByPeriod(data.transactions, period);
    const appTransactions = selectedApp === 'all' 
        ? filteredTransactions 
        : filteredTransactions.filter(t => t.app === selectedApp);

    updateCategoryChart(appTransactions);
    updateAppChart(filteredTransactions);
    updateTaxSummary(filteredTransactions);
}

// Filter transactions by period
function filterTransactionsByPeriod(transactions, period) {
    const now = new Date();
    const startDate = new Date();
    
    switch(period) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth(), 1);
            break;
        case 'year':
            startDate.setMonth(0, 1);
            break;
    }
    
    return transactions.filter(t => new Date(t.date) >= startDate);
}

// Update Category Chart
function updateCategoryChart(transactions) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const categories = {};
    
    transactions.forEach(t => {
        if (!categories[t.category]) categories[t.category] = 0;
        categories[t.category] += t.amount;
    });

    // Create simple bar chart using canvas
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const barWidth = width / Object.keys(categories).length;
    
    ctx.clearRect(0, 0, width, height);
    
    let x = 0;
    for (const [category, amount] of Object.entries(categories)) {
        const barHeight = (amount / Math.max(...Object.values(categories))) * height;
        
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x, height - barHeight, barWidth - 5, barHeight);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillText(category, x, height - 10);
        
        x += barWidth;
    }
}

// Update App Chart
function updateAppChart(transactions) {
    const ctx = document.getElementById('appChart').getContext('2d');
    const apps = {};
    
    transactions
        .filter(t => t.type === 'income')
        .forEach(t => {
            if (!apps[t.app]) apps[t.app] = 0;
            apps[t.app] += t.amount;
        });

    // Create simple pie chart using canvas
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    let startAngle = 0;
    const total = Object.values(apps).reduce((sum, amount) => sum + amount, 0);
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    Object.entries(apps).forEach(([app, amount], index) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = `hsl(${index * 60}, 70%, 60%)`;
        ctx.fill();
        
        startAngle += sliceAngle;
    });
}

// Update Tax Summary
function updateTaxSummary(transactions) {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const deductibleExpenses = transactions
        .filter(t => t.type === 'expense' && ['Combustível', 'Manutenção', 'Seguro'].includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const taxableIncome = totalIncome - deductibleExpenses;
    const suggestedReserve = taxableIncome * 0.275; // 27.5% tax rate
    
    document.getElementById('taxTotalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('taxDeductibleExpenses').textContent = formatCurrency(deductibleExpenses);
    document.getElementById('taxReserve').textContent = formatCurrency(suggestedReserve);
}

// Settings Management
function updateCategorySettings() {
    const data = getData();
    
    // Update income categories
    const incomeCategories = document.getElementById('incomeCategories');
    incomeCategories.innerHTML = data.incomeCategories.map(category => `
        <div class="category-item">
            <span>${category}</span>
            <button onclick="deleteCategory('income', '${category}')" class="btn-danger">Excluir</button>
        </div>
    `).join('');
    
    // Update expense categories
    const expenseCategories = document.getElementById('expenseCategories');
    expenseCategories.innerHTML = data.expenseCategories.map(category => `
        <div class="category-item">
            <span>${category}</span>
            <button onclick="deleteCategory('expense', '${category}')" class="btn-danger">Excluir</button>
        </div>
    `).join('');
}

// Add new category
document.getElementById('addIncomeCategory').addEventListener('click', () => {
    const category = prompt('Digite o nome da nova categoria de ganhos:');
    if (category) {
        const data = getData();
        if (!data.incomeCategories.includes(category)) {
            data.incomeCategories.push(category);
            saveData(data);
            updateCategorySettings();
        }
    }
});

document.getElementById('addExpenseCategory').addEventListener('click', () => {
    const category = prompt('Digite o nome da nova categoria de despesas:');
    if (category) {
        const data = getData();
        if (!data.expenseCategories.includes(category)) {
            data.expenseCategories.push(category);
            saveData(data);
            updateCategorySettings();
        }
    }
});

// Delete category
function deleteCategory(type, category) {
    if (confirm(`Deseja realmente excluir a categoria "${category}"?`)) {
        const data = getData();
        const categories = type === 'income' ? 'incomeCategories' : 'expenseCategories';
        data[categories] = data[categories].filter(c => c !== category);
        saveData(data);
        updateCategorySettings();
    }
}

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update Transactions List
function updateTransactionsList() {
    const tbody = document.querySelector('#transactionsTable tbody');
    const data = getData();
    
    tbody.innerHTML = data.transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(t => `
            <tr class="${t.type}">
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.type === 'income' ? 'Ganho' : 'Despesa'}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td>${t.category}</td>
                <td>${t.type === 'income' ? t.app : '-'}</td>
                <td>
                    <button onclick="deleteTransaction(${t.id})" class="btn-danger">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');
}

// Delete Transaction
function deleteTransaction(id) {
    if (confirm('Deseja realmente excluir esta transação?')) {
        const data = getData();
        data.transactions = data.transactions.filter(t => t.id !== id);
        saveData(data);
        
        updateTransactionsList();
        updateDashboard();
        updateReports();
        showNotification('Transação excluída com sucesso!');
    }
}

// Initialize app
function initializeApp() {
    // Set initial data if not exists
    if (!localStorage.getItem('driverFinanceData')) {
        localStorage.setItem('driverFinanceData', JSON.stringify(initialData));
    }

    // Add click handlers to navigation buttons
    document.querySelectorAll('.nav-button').forEach(button => {
        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const clickedButton = e.target.closest('.nav-button');
            if (!clickedButton) return;
            
            console.log('Button clicked:', {
                button: clickedButton,
                pageId: clickedButton.getAttribute('data-page'),
                buttonText: clickedButton.textContent
            });
            
            const pageId = clickedButton.getAttribute('data-page');
            if (pageId) {
                navigateToPage(pageId);
            }
        };

        // Add click listener to both the button and its text content
        button.addEventListener('click', handleClick);
        Array.from(button.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                button.addEventListener('click', handleClick);
            }
        });
    });

    // Show dashboard by default
    navigateToPage('dashboard');
}

// Navigation function
function navigateToPage(pageId) {
    console.log('Navigating to:', pageId);

    // First hide all pages and deactivate all buttons
    document.querySelectorAll('.page').forEach(page => {
        console.log('Page:', page.id, 'Hidden:', page.classList.contains('hidden'));
        page.classList.remove('block');
        page.classList.add('hidden', 'md:hidden');
    });
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('bg-blue-800');
    });

    // Show selected page and activate its button
    const page = document.getElementById(pageId);
    const button = document.querySelector(`[data-page="${pageId}"]`);

    if (page && button) {
        page.classList.remove('hidden', 'md:hidden');
        page.classList.add('block');
        button.classList.add('bg-blue-800');

        // Update content based on the page
        switch(pageId) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'transactions':
                updateTransactionsList();
                break;
            case 'goals':
                updateGoalsList();
                break;
            case 'reports':
                updateReports();
                break;
            case 'settings':
                updateCategorySettings();
                break;
        }
    }
}
