// @ts-nocheck
/* eslint-disable */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
type BudgetInitOptions = {
  initialPage?: "tracker" | "assets" | "all-transactions" | "analytics";
};

export function initBudgetDashboard(options: BudgetInitOptions = {}) {
  if (typeof window === "undefined") return;
  const win = window as Window & { __budgetDashboardInit?: boolean };
  if (win.__budgetDashboardInit) return;
  win.__budgetDashboardInit = true;
  // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------
    
    const PREDEFINED_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef'];
    const getRandomColor = () => PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
    const createDefaultState = () => ({
        assets: [],
        transactions: [],
        categories: [],
        incomeCategories: [],
        expenseCategories: [],
        ui: {
            currentPage: 'tracker', // 'tracker', 'assets', 'all-transactions', or 'analytics'
            formMode: 'add', // 'add' or 'edit'
            editingId: null,
            activeType: 'expense',
            isBalanceVisible: true, 
            filters: {
                description: '',
                type: 'all',
                category: 'all',
                startDate: '',
                endDate: ''
            },
            analytics: {
                period: 'this-month',
                year: new Date().getFullYear(),
                month: new Date().getMonth(),
                hiddenCategories: []
            }
        }
    });
    const pageRoutes = {
        'tracker': '/dashboard',
        'assets': '/dashboard/assets',
        'all-transactions': '/dashboard/transactions',
        'analytics': '/dashboard/analytics'
    };

    const pageFromPath = (path) => {
        if (path.startsWith('/dashboard/assets')) return 'assets';
        if (path.startsWith('/dashboard/transactions')) return 'all-transactions';
        if (path.startsWith('/dashboard/analytics')) return 'analytics';
        return 'tracker';
    };

    const resolveInitialPage = () => {
        if (options.initialPage) return options.initialPage;
        return pageFromPath(window.location.pathname);
    };

    let state = createDefaultState();
    state.ui.currentPage = resolveInitialPage();

    const supabase = createSupabaseBrowserClient();
    let currentUserId = null;
    let lastEmittedUserId = null;
    let lastEmittedUserEmail = null;
    let lastRenderedPage = null;

    const requireUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
            window.location.href = '/login';
            return null;
        }
        currentUserId = data.user.id;
        if (currentUserId !== lastEmittedUserId || data.user.email !== lastEmittedUserEmail) {
            lastEmittedUserId = currentUserId;
            lastEmittedUserEmail = data.user.email || null;
            window.dispatchEvent(new CustomEvent('budget:user-change', {
                detail: { id: currentUserId, email: data.user.email || '' }
            }));
        }
        return data.user;
    };

    const rebuildCategoryLists = () => {
        const income = [];
        const expense = [];
        state.categories.forEach(cat => {
            if (cat.is_system) return;
            if (cat.type === 'income') {
                income.push(cat.name);
            } else {
                expense.push({ name: cat.name, color: cat.color });
            }
        });
        state.incomeCategories = income;
        state.expenseCategories = expense;
    };

    const loadState = async () => {
        const user = await requireUser();
        if (!user) return;

        const [assetsRes, categoriesRes, transactionsRes] = await Promise.all([
            supabase.from('assets').select('*').order('created_at', { ascending: true }),
            supabase.from('categories').select('*').order('created_at', { ascending: true }),
            supabase
                .from('transactions')
                .select('id, type, amount, description, note, transaction_date, created_at, asset_id, category:categories(name)')
                .order('transaction_date', { ascending: false })
        ]);

        if (assetsRes.error || categoriesRes.error || transactionsRes.error) {
            console.error('Failed to load data', assetsRes.error || categoriesRes.error || transactionsRes.error);
            return;
        }

        state.assets = (assetsRes.data || []).map(asset => ({
            ...asset,
            balance: Number(asset.balance)
        }));
        state.categories = categoriesRes.data || [];
        rebuildCategoryLists();

        state.transactions = (transactionsRes.data || []).map(row => {
            const categoryName = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name;
            return ({
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            description: row.description,
            note: row.note,
            date: row.transaction_date,
            createdAt: row.created_at,
            assetId: row.asset_id,
            category: categoryName || 'Unknown'
        });
        });
    };

    const saveState = () => {};

    const getCategoryRecord = (type, name) => {
        return state.categories.find(cat => cat.type === type && cat.name === name);
    };

    const getSystemCategory = (type, name) => {
        return state.categories.find(cat => cat.type === type && cat.name === name && cat.is_system);
    };

    // -------------------------------------------------------------------------
    // DOM ELEMENTS
    // -------------------------------------------------------------------------

    const pageTracker = document.getElementById('page-tracker');
    const pageAssets = document.getElementById('page-assets');
    const pageAllTransactions = document.getElementById('page-all-transactions');
    const pageAnalytics = document.getElementById('page-analytics');
    
    const incomeAmountEl = document.getElementById('income-amount');
    const expenseAmountEl = document.getElementById('expense-amount');
    const netWorthAmountEl = document.getElementById('net-worth-amount');
    const monthlySavingsAmountEl = document.getElementById('monthly-savings-amount');

    const form = document.getElementById('transaction-form');
    const formIdInput = document.getElementById('transaction-id');
    const formTypeInput = document.getElementById('transaction-type');
    const formAssetSelect = document.getElementById('transaction-asset');
    const formDateInput = document.getElementById('transaction-date');
    const formCategorySelect = document.getElementById('transaction-category');
    const formAmountInput = document.getElementById('transaction-amount');
    const formDescriptionInput = document.getElementById('transaction-description');
    const formNoteTextarea = document.getElementById('transaction-note');
    const typeBtnIncome = document.getElementById('type-btn-income');
    const typeBtnExpense = document.getElementById('type-btn-expense');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    const visibilityToggleBtn = document.getElementById('visibility-toggle');
    const eyeIconOpen = document.getElementById('eye-icon-open');
    const eyeIconSlashed = document.getElementById('eye-icon-slashed');

    const transactionListContainer = document.getElementById('transaction-list-container');
    const noTransactionsMsg = document.getElementById('no-transactions-msg');
    
    // All Transactions Page Elements
    const fullTransactionListContainer = document.getElementById('full-transaction-list-container');
    const searchDescriptionInput = document.getElementById('search-description');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterDateStartInput = document.getElementById('filter-date-start');
    const filterDateEndInput = document.getElementById('filter-date-end');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const eraseDataBtn = document.getElementById('erase-data-btn');

    // Assets Page Elements
    const assetListEl = document.getElementById('asset-list');
    const manageAssetsBtn = document.getElementById('manage-assets-btn');
    const transferForm = document.getElementById('transfer-form');
    const totalAssetsAmountEl = document.getElementById('total-assets-amount'); // <-- Added this
 
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    const dataOptionsBtn = document.getElementById('data-options-btn');
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');

    // Analytics elements
    const analyticsPeriodSelect = document.getElementById('analytics-period');
    const analyticsYearSelect = document.getElementById('analytics-year');
    const analyticsMonthSelect = document.getElementById('analytics-month');
    const analyticsSavingsEl = document.getElementById('analytics-savings');
    const analyticsIncomeEl = document.getElementById('analytics-income');
    const analyticsExpensesEl = document.getElementById('analytics-expenses');
    const chartTooltip = document.getElementById('chart-tooltip');

    // -------------------------------------------------------------------------
    // UTILITY FUNCTIONS
    // -------------------------------------------------------------------------

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDateForInput = (date) => {
        return new Date(date).toISOString().split('T')[0];
    };
    
    const formatDateForDisplay = (date) => {
        // Adjust for timezone offset to display the correct local date
        const d = new Date(date);
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // -------------------------------------------------------------------------
    // RENDER FUNCTIONS (Updating the UI)
    // -------------------------------------------------------------------------
    
    const render = () => {
        renderSummary();
        renderTransactionList(state.transactions, transactionListContainer, noTransactionsMsg); // Show all for sorting demo
        renderForm();
        renderPage();
    };
    
    const renderVisibilityToggle = () => {
        const isVisible = state.ui.isBalanceVisible;
        eyeIconOpen.classList.toggle('hidden', !isVisible);
        eyeIconSlashed.classList.toggle('hidden', isVisible);
    };

    const renderSummary = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const isVisible = state.ui.isBalanceVisible;
        const censoredText = '₹ ******';

        // Calculate totals for the current month for the income/expense cards
        const monthlyIncome = state.transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'income' && t.category !== 'Internal Transfer' && transactionDate.getFullYear() === currentYear && transactionDate.getMonth() === currentMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpense = state.transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return t.type === 'expense' && t.category !== 'Internal Transfer' && transactionDate.getFullYear() === currentYear && transactionDate.getMonth() === currentMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlySavings = monthlyIncome - monthlyExpense;

        // Calculate Net Worth
        const netWorth = state.assets.reduce((sum, asset) => sum + asset.balance, 0);

        incomeAmountEl.textContent = isVisible ? formatCurrency(monthlyIncome) : censoredText;
        expenseAmountEl.textContent = isVisible ? formatCurrency(monthlyExpense) : censoredText;
        monthlySavingsAmountEl.textContent = isVisible ? formatCurrency(monthlySavings) : censoredText;
        netWorthAmountEl.textContent = isVisible ? formatCurrency(netWorth) : censoredText;
        
        monthlySavingsAmountEl.className = `text-3xl font-bold ${monthlySavings >= 0 ? 'text-purple-600' : 'text-orange-500'}`;
        netWorthAmountEl.className = `text-3xl font-bold ${netWorth >= 0 ? 'text-blue-600' : 'text-orange-500'}`;
        
        renderVisibilityToggle();
    };

    const renderTransactionList = (transactions, container, emptyMsgEl) => {
        container.innerHTML = '';

        if (transactions.length === 0) {
            emptyMsgEl.style.display = 'block';
             if (container.id === 'full-transaction-list-container') {
                emptyMsgEl.innerHTML = `<div class="text-center py-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <h3 class="mt-2 text-sm font-medium text-slate-900">No transactions found</h3>
                                        <p class="mt-1 text-sm text-slate-500">Try adjusting your filters or adding a new transaction.</p>
                                    </div>`;
            } else {
                 emptyMsgEl.innerHTML = `<div class="text-center py-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <h3 class="mt-2 text-sm font-medium text-slate-900">No recent transactions</h3>
                                        <p class="mt-1 text-sm text-slate-500">Get started by adding a new transaction.</p>
                                    </div>`;
            }
            return;
        }
        
        emptyMsgEl.style.display = 'none';

        const sortedTransactions = [...transactions].sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) {
                return dateComparison;
            }
            // If dates are the same, sort by creation timestamp, descending
            // Fallback to 0 for transactions without a timestamp (older ones)
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        const transactionsToDisplay = (container.id === 'transaction-list-container') ? sortedTransactions.slice(0, 10) : sortedTransactions;


        transactionsToDisplay.forEach(t => {
            const isIncome = t.type === 'income';
            const sign = isIncome ? '+' : '-';
            const amountClass = isIncome ? 'text-green-600' : 'text-red-600';
            const assetName = state.assets.find(a => a.id === t.assetId)?.name || 'Unknown';

            const li = document.createElement('div');
            li.className = 'transaction-item p-4 border-b border-slate-200 transition-all duration-200';
            li.innerHTML = `
                <div class="flex items-start justify-between w-full flex-wrap">
                    <!-- Main content row -->
                    <div class="flex items-center space-x-4">
                        <div class="p-3 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}">
                            ${isIncome ? 
                                `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>` :
                                `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`
                            }
                        </div>
                        <div>
                            <p class="font-semibold text-slate-800">${t.description}</p>
                            <p class="text-sm text-slate-500">${t.category} on ${assetName} &bull; ${formatDateForDisplay(t.date)}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <p class="font-semibold text-right ${amountClass}">${state.ui.isBalanceVisible ? `${sign}${formatCurrency(Math.abs(t.amount))}`: '******'}</p>
                        ${t.note ? `
                            <button class="note-toggle-btn p-1 text-slate-400 hover:text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                            </button>
                        ` : '<div class="w-7"></div>' /* Placeholder for alignment */}
                        <button data-id="${t.id}" class="edit-btn p-1 text-slate-500 hover:text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                        </button>
                        <button data-id="${t.id}" class="delete-btn p-1 text-slate-500 hover:text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                        </button>
                    </div>

                    <!-- Note content row -->
                    ${t.note ? `
                        <div class="note-content w-full border-t border-slate-100">
                            <p class="text-sm text-slate-600 whitespace-pre-wrap font-mono pl-16">${t.note}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(li);
        });
    };

    const renderForm = (preserveCategory = true) => {
        const activeStyles = ['bg-indigo-600', 'text-white', 'border-indigo-600', 'z-10'];
        const inactiveStyles = ['border-gray-300', 'bg-white', 'text-gray-700', 'hover:bg-gray-50'];

        [typeBtnIncome, typeBtnExpense].forEach(btn => btn.classList.remove(...activeStyles, ...inactiveStyles));

        if (state.ui.activeType === 'income') {
            typeBtnIncome.classList.add(...activeStyles);
            typeBtnExpense.classList.add(...inactiveStyles);
        } else {
            typeBtnExpense.classList.add(...activeStyles);
            typeBtnIncome.classList.add(...inactiveStyles);
        }

        formTypeInput.value = state.ui.activeType;
        
        const currentCategory = preserveCategory ? formCategorySelect.value : '';
        formCategorySelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select category';
        placeholder.disabled = true;
        formCategorySelect.appendChild(placeholder);
        const categories = state.ui.activeType === 'income' ? [...state.incomeCategories] : state.expenseCategories.map(c => c.name);
        if (currentCategory && !categories.includes(currentCategory)) {
            categories.push(currentCategory);
        }
        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            formCategorySelect.appendChild(option);
        });
        if (preserveCategory && currentCategory && categories.includes(currentCategory)) {
            formCategorySelect.value = currentCategory;
        } else if (preserveCategory && categories.length > 0) {
            formCategorySelect.value = categories[0];
        } else {
            formCategorySelect.value = '';
            placeholder.selected = true;
        }

        const currentAsset = formAssetSelect.value;
        formAssetSelect.innerHTML = '';
        state.assets.forEach(asset => {
             const option = document.createElement('option');
            option.value = asset.id;
            option.textContent = asset.name;
            formAssetSelect.appendChild(option);
        });
        if(state.assets.find(a => a.id === currentAsset)) {
            formAssetSelect.value = currentAsset;
        }
    };

    const renderPage = () => {
        pageTracker.classList.add('hidden');
        pageAssets.classList.add('hidden');
        pageAllTransactions.classList.add('hidden');
        pageAnalytics.classList.add('hidden');

        if (state.ui.currentPage === 'tracker') {
            pageTracker.classList.remove('hidden');
        } else if (state.ui.currentPage === 'assets') {
            pageAssets.classList.remove('hidden');
             setTimeout(() => {
                const assetChartCanvas = document.getElementById('asset-chart');
                if (assetChartCanvas) {
                    const container = assetChartCanvas.parentElement;
                    if(container && container.clientWidth > 0) {
                        assetChartCanvas.width = container.clientWidth;
                        assetChartCanvas.height = container.clientHeight;
                    }
                    renderAssetsPage();
                }
            }, 0);
        } else if (state.ui.currentPage === 'all-transactions') {
            pageAllTransactions.classList.remove('hidden');
            renderAllTransactionsPage();
        } else if (state.ui.currentPage === 'analytics') {
            pageAnalytics.classList.remove('hidden');
            
            setTimeout(() => {
                renderAnalytics(); 
            }, 0);
        }

        if (lastRenderedPage !== state.ui.currentPage) {
            lastRenderedPage = state.ui.currentPage;
            window.dispatchEvent(new CustomEvent('budget:page-change', {
                detail: { page: state.ui.currentPage }
            }));
        }
    };
    
    // -------------------------------------------------------------------------
    // "ALL TRANSACTIONS" PAGE LOGIC
    // -------------------------------------------------------------------------
    
    const renderFilters = () => {
        // Populate category dropdown
        const allCategories = [...new Set(['Internal Transfer', ...state.incomeCategories, ...state.expenseCategories.map(c => c.name)])];
        filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
        allCategories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategorySelect.appendChild(option);
        });

        // Set values from state
        searchDescriptionInput.value = state.ui.filters.description;
        filterTypeSelect.value = state.ui.filters.type;
        filterCategorySelect.value = state.ui.filters.category;
        filterDateStartInput.value = state.ui.filters.startDate;
        filterDateEndInput.value = state.ui.filters.endDate;
    };

    const renderAllTransactionsPage = () => {
        renderFilters();
        
        let filtered = [...state.transactions];
        const { description, type, category, startDate, endDate } = state.ui.filters;

        if (description) {
            filtered = filtered.filter(t => t.description.toLowerCase().includes(description.toLowerCase()));
        }
        if (type !== 'all') {
            filtered = filtered.filter(t => t.type === type);
        }
        if (category !== 'all') {
            filtered = filtered.filter(t => t.category === category);
        }
        if (startDate) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(startDate));
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.date) <= endOfDay);
        }
        
        renderTransactionList(filtered, fullTransactionListContainer, document.createElement('div'));
    };
    
    searchDescriptionInput.addEventListener('input', () => {
        state.ui.filters.description = searchDescriptionInput.value;
        renderAllTransactionsPage();
    });

    [filterTypeSelect, filterCategorySelect, filterDateStartInput, filterDateEndInput].forEach(el => {
        el.addEventListener('change', () => {
            state.ui.filters.type = filterTypeSelect.value;
            state.ui.filters.category = filterCategorySelect.value;
            state.ui.filters.startDate = filterDateStartInput.value;
            state.ui.filters.endDate = filterDateEndInput.value;
            renderAllTransactionsPage();
        });
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        state.ui.filters = {
            description: '',
            type: 'all',
            category: 'all',
            startDate: '',
            endDate: ''
        };
        renderAllTransactionsPage();
    });

    eraseDataBtn.addEventListener('click', () => {
        // Use a custom modal instead of confirm()
        const modalHTML = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path></svg>
                </div>
                <h3 class="mt-2 text-lg font-semibold text-gray-900">Erase All Data?</h3>
                <p class="mt-2 text-sm text-gray-500">Are you sure you want to erase ALL data, including transactions and categories? This action is permanent and cannot be undone.</p>
                <div class="mt-5 sm:mt-6 flex justify-center space-x-3">
                    <button id="confirm-erase" class="btn-danger w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Yes, Erase Everything</button>
                    <button class="close-modal-btn btn-secondary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Cancel</button>
                </div>
            </div>`;
        openModal(modalHTML);

        document.getElementById('confirm-erase').addEventListener('click', async () => {
            const user = await requireUser();
            if (!user) return;

            await supabase.from('transactions').delete().eq('user_id', currentUserId);
            await supabase.from('categories').delete().eq('user_id', currentUserId).eq('is_system', false);
            await supabase.from('assets').delete().eq('user_id', currentUserId).eq('is_default', false);
            await supabase.from('assets').update({ balance: 0 }).eq('user_id', currentUserId).eq('is_default', true);

            await supabase.from('categories').upsert([
                { user_id: currentUserId, type: 'income', name: 'Salary', color: null, is_system: false },
                { user_id: currentUserId, type: 'income', name: 'Freelance', color: null, is_system: false },
                { user_id: currentUserId, type: 'income', name: 'Investment', color: null, is_system: false },
                { user_id: currentUserId, type: 'income', name: 'Internal Transfer', color: '#94a3b8', is_system: true },
                { user_id: currentUserId, type: 'expense', name: 'Food', color: '#ef4444', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Transport', color: '#f97316', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Utilities', color: '#f59e0b', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Entertainment', color: '#10b981', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Health', color: '#14b8a6', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Internal Transfer', color: '#94a3b8', is_system: true }
            ], { onConflict: 'user_id,type,name_normalized' });

            await supabase.from('assets').upsert([
                { user_id: currentUserId, name: 'Cash', balance: 0, is_default: true },
                { user_id: currentUserId, name: 'Bank', balance: 0, is_default: true }
            ], { onConflict: 'user_id,name_normalized' });

            await loadState();
            closeModal();
            render();
        });
    });

    // -------------------------------------------------------------------------
    // BUSINESS LOGIC & FORM ACTIONS
    // -------------------------------------------------------------------------
    
    const updateAssetBalance = () => {};
    
    const handleTypeChange = (type) => {
        const typeChanged = state.ui.activeType !== type;
        state.ui.activeType = type;
        renderForm(!typeChanged);
    };

    const resetForm = () => {
        state.ui.formMode = 'add';
        state.ui.editingId = null;
        form.reset();
        formIdInput.value = '';
        formDateInput.value = formatDateForInput(new Date());
        cancelEditBtn.classList.add('hidden');
        form.querySelector('button[type="submit"]').textContent = 'Save Transaction';
        handleTypeChange('expense');
    };

    const startEditing = (id) => {
        const transaction = state.transactions.find(t => t.id === id);
        if (!transaction) return;
        
        if (state.ui.currentPage !== 'tracker') {
            setPage('tracker');
        }

        state.ui.formMode = 'edit';
        state.ui.editingId = id;
        
        formIdInput.value = transaction.id;
        handleTypeChange(transaction.type);
        formDateInput.value = formatDateForInput(transaction.date);
        formAssetSelect.value = transaction.assetId;
        formCategorySelect.value = transaction.category;
        formAmountInput.value = transaction.amount;
        formDescriptionInput.value = transaction.description;
        formNoteTextarea.value = transaction.note || '';

        cancelEditBtn.classList.remove('hidden');
        form.querySelector('button[type="submit"]').textContent = 'Update Transaction';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteTransaction = async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
            console.error('Failed to delete transaction', error);
            return;
        }
        await loadState();
        render();
        if (state.ui.currentPage === 'all-transactions') renderAllTransactionsPage();
        if (state.ui.currentPage === 'assets') renderAssetsPage();
        if (state.ui.currentPage === 'analytics') renderAnalytics();
    };

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await requireUser();
        if (!user) return;

        const id = formIdInput.value;
        const amount = parseFloat(formAmountInput.value);
        const type = formTypeInput.value;
        const assetId = formAssetSelect.value;
        
        const transactionData = {
            date: formDateInput.value,
            category: formCategorySelect.value,
            description: formDescriptionInput.value.trim(),
            note: formNoteTextarea.value.trim(),
            amount,
            type,
            assetId,
        };
        if (!transactionData.date || !transactionData.amount || !transactionData.description || !assetId || !transactionData.category) { return; }

        const categoryRecord = getCategoryRecord(type, transactionData.category) || getSystemCategory(type, transactionData.category);
        if (!categoryRecord) {
            console.error('Category not found', transactionData.category);
            return;
        }
        
        if (state.ui.formMode === 'edit') {
            const { error } = await supabase
                .from('transactions')
                .update({
                    user_id: currentUserId,
                    asset_id: assetId,
                    category_id: categoryRecord.id,
                    type,
                    amount,
                    description: transactionData.description,
                    note: transactionData.note || null,
                    transaction_date: transactionData.date
                })
                .eq('id', id);
            if (error) {
                console.error('Failed to update transaction', error);
                return;
            }
        } else {
            const { error } = await supabase.from('transactions').insert({
                user_id: currentUserId,
                asset_id: assetId,
                category_id: categoryRecord.id,
                type,
                amount,
                description: transactionData.description,
                note: transactionData.note || null,
                transaction_date: transactionData.date
            });
            if (error) {
                console.error('Failed to add transaction', error);
                return;
            }
        }
        resetForm();
        await loadState();
        render();
        if (state.ui.currentPage === 'analytics') renderAnalytics();
    });
    
    typeBtnIncome.addEventListener('click', () => handleTypeChange('income'));
    typeBtnExpense.addEventListener('click', () => handleTypeChange('expense'));
    
    visibilityToggleBtn.addEventListener('click', () => {
        state.ui.isBalanceVisible = !state.ui.isBalanceVisible;
        saveState();
        render();
        if (state.ui.currentPage === 'all-transactions') {
            renderAllTransactionsPage();
        }
        if (state.ui.currentPage === 'analytics') {
            renderAnalytics();
        }
    });
    
    // Combined event listener for all transaction lists
    [transactionListContainer, fullTransactionListContainer].forEach(container => {
        container.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                startEditing(editBtn.dataset.id);
            }

            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                 const idToDelete = deleteBtn.dataset.id;
                 const transaction = state.transactions.find(t => t.id === idToDelete);
                 const modalHTML = `
                    <div class="text-center">
                        <h3 class="mt-2 text-lg font-semibold text-gray-900">Delete Transaction?</h3>
                        <p class="mt-2 text-sm text-gray-500">Are you sure you want to delete this transaction: <br><strong>${transaction.description} (${formatCurrency(transaction.amount)})</strong>?</p>
                        <div class="mt-5 sm:mt-6 flex justify-center space-x-3">
                            <button id="confirm-delete" class="btn-danger w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Yes, Delete</button>
                            <button class="close-modal-btn btn-secondary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Cancel</button>
                        </div>
                    </div>`;
                openModal(modalHTML);
                document.getElementById('confirm-delete').addEventListener('click', async () => {
                    await deleteTransaction(idToDelete);
                    closeModal();
                });
            }
            
            const noteToggleBtn = e.target.closest('.note-toggle-btn');
            if(noteToggleBtn) {
                const noteContent = noteToggleBtn.closest('.transaction-item').querySelector('.note-content');
                if (noteContent) {
                    noteToggleBtn.classList.toggle('rotated');
                    noteContent.classList.toggle('visible');
                }
            }
        });
    });

    cancelEditBtn.addEventListener('click', resetForm);

    const setPage = (page, options = {}) => {
        if (!pageRoutes[page]) return;
        const { updateHistory = true } = options;

        if (updateHistory && window.location.pathname !== pageRoutes[page]) {
            window.history.pushState({ page }, '', pageRoutes[page]);
        }

        state.ui.currentPage = page;
        renderPage();
    };

    window.__budgetDashboardSetPage = setPage;

    window.addEventListener('popstate', () => {
        const page = pageFromPath(window.location.pathname);
        if (page !== state.ui.currentPage) {
            setPage(page, { updateHistory: false });
        }
    });

    // -------------------------------------------------------------------------
    // MODALS (Categories & Data Options)
    // -------------------------------------------------------------------------

    const openModal = (content) => {
        modalContent.innerHTML = content;
        modalContainer.classList.remove('hidden');
    };

    const closeModal = () => {
        modalContainer.classList.add('hidden');
        modalContent.innerHTML = '';
    };

    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer || e.target.closest('.close-modal-btn')) {
            closeModal();
        }
    });

    manageCategoriesBtn.addEventListener('click', () => {
        const renderColorPalette = (selectedColor) => {
            return PREDEFINED_COLORS.map(color => `
                <div class="color-swatch ${color === selectedColor ? 'selected' : ''}" style="background-color: ${color};" data-color="${color}"></div>
            `).join('');
        };
        
        const renderCategoryList = (type) => {
            const categories = type === 'income' ? state.incomeCategories.map(name => ({name})) : state.expenseCategories;
            return categories.map(cat => `
                <li class="category-item flex justify-between items-center p-2 bg-slate-100 rounded hover:bg-slate-200" data-name="${cat.name}" data-type="${type}">
                    <span class="category-name flex items-center">
                        ${cat.color ? `<span class="inline-block w-4 h-4 rounded-full mr-2" style="background-color: ${cat.color};"></span>` : ''}
                        ${cat.name}
                    </span>
                    <div class="category-actions flex items-center space-x-2">
                        <button class="rename-category-btn text-slate-400 hover:text-indigo-600 p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                        </button>
                        <button class="delete-category-btn text-slate-400 hover:text-red-600 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                    </div>
                </li>
            `).join('');
        };

        const modalHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Manage Categories</h2>
                <button class="close-modal-btn p-1 text-2xl leading-none">&times;</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="font-semibold mb-2">Income Categories</h3>
                    <ul id="income-cat-list" class="space-y-2 mb-2">${renderCategoryList('income')}</ul>
                    <form id="add-income-cat-form" class="flex gap-2">
                        <input type="text" placeholder="New income category" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                        <button type="submit" class="btn-primary px-3 py-1 rounded-md text-sm font-bold">+</button>
                    </form>
                </div>
                <div>
                    <h3 class="font-semibold mb-2">Expense Categories</h3>
                    <ul id="expense-cat-list" class="space-y-2 mb-2">${renderCategoryList('expense')}</ul>
                    <form id="add-expense-cat-form" class="space-y-2">
                         <div class="flex gap-2">
                             <input type="text" name="name" placeholder="New expense category" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" required>
                             <button type="submit" class="btn-primary px-3 py-1 rounded-md text-sm font-bold">+</button>
                        </div>
                        <div class="flex flex-wrap gap-2 color-palette">
                            ${renderColorPalette(getRandomColor())}
                        </div>
                        <input type="hidden" name="color" value="${getRandomColor()}">
                    </form>
                </div>
            </div>`;
        openModal(modalHTML);
        
    });

    dataOptionsBtn.addEventListener('click', () => {
        const modalHTML = `
             <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold">Data Options</h2>
                 <button class="close-modal-btn text-2xl">&times;</button>
             </div>
             <div class="space-y-4">
                 <div>
                     <h3 class="font-semibold mb-2">Export Data</h3>
                     <div class="flex space-x-2">
                         <button id="export-json-btn" class="w-full btn-secondary py-2 px-4 rounded-md text-sm">Export as JSON</button>
                         <button id="export-csv-btn" class="w-full btn-secondary py-2 px-4 rounded-md text-sm">Export as CSV</button>
                     </div>
                 </div>
                  <div>
                     <h3 class="font-semibold mb-2">Import Data</h3>
                     <p class="text-sm text-slate-500 mb-1">Import a JSON file. This will overwrite current data.</p>
                     <div class="flex gap-2">
                         <input type="file" id="import-json-input" accept=".json" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                         <button id="submit-json-import" class="btn-primary px-3 py-1 rounded-md text-sm">Import</button>
                     </div>
                     <p id="json-error" class="text-red-500 text-sm mt-1"></p>

                     <p class="text-sm text-slate-500 mb-1 mt-4">Import a CSV file. This will add to current data.</p>
                     <div class="flex gap-2">
                         <input type="file" id="import-csv-input" accept=".csv" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                         <button id="submit-csv-import" class="btn-primary px-3 py-1 rounded-md text-sm">Import</button>
                     </div>
                     <p id="csv-error" class="text-red-500 text-sm mt-1"></p>
                 </div>
             </div>`;
        openModal(modalHTML);
    });

    modalContent.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await requireUser();
        if (!user) return;

        if (e.target.id === 'add-income-cat-form') {
            const input = e.target.querySelector('input[type="text"]');
            const newCategory = input.value.trim();
            if (newCategory) {
                const { error } = await supabase.from('categories').insert({
                    user_id: currentUserId,
                    type: 'income',
                    name: newCategory
                });
                if (error) console.error('Failed to add category', error);
            }
        } else if (e.target.id === 'add-expense-cat-form') {
            const nameInput = e.target.querySelector('input[name="name"]');
            const colorInput = e.target.querySelector('input[name="color"]');
            const newCategory = { name: nameInput.value.trim(), color: colorInput.value };
            if (newCategory.name) {
                const { error } = await supabase.from('categories').insert({
                    user_id: currentUserId,
                    type: 'expense',
                    name: newCategory.name,
                    color: newCategory.color
                });
                if (error) console.error('Failed to add category', error);
            }
        } else if (e.target.id === 'add-asset-form') {
             const nameInput = e.target.querySelector('input[name="name"]');
             const balanceInput = e.target.querySelector('input[name="balance"]');
             if (nameInput.value.trim()) {
                 const { error } = await supabase.from('assets').insert({
                     user_id: currentUserId,
                     name: nameInput.value.trim(),
                     balance: parseFloat(balanceInput.value) || 0
                 });
                 if (error) console.error('Failed to add asset', error);
             }
        }

        await loadState();
        if (state.ui.currentPage === 'assets') manageAssetsBtn.click();
        else manageCategoriesBtn.click();
        render();
    });

    modalContent.addEventListener('click', async (e) => {
        
        // Delegated listener for color swatches
        const swatch = e.target.closest('.color-swatch');
        if (swatch) {
            const palette = swatch.closest('.color-palette');
            if (!palette) return;

            // Update the visual selection
            palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');

            // Find the parent form/container to update the correct hidden input
            const addForm = swatch.closest('#add-expense-cat-form');
            const editContainer = swatch.closest('.edit-category-container');

            if (addForm) {
                addForm.querySelector('input[name="color"]').value = swatch.dataset.color;
            } else if (editContainer) {
                editContainer.querySelector('input[name="color"]').value = swatch.dataset.color;
            }
        }

        const deleteBtn = e.target.closest('.delete-category-btn');
        if (deleteBtn) {
            const listItem = deleteBtn.closest('.category-item');
            const name = listItem.dataset.name;
            const type = listItem.dataset.type;
            const categoryRecord = getCategoryRecord(type, name);
            const transactionCount = state.transactions.filter(t => t.type === type && t.category === name).length;

            if (transactionCount > 0) {
                const modalHTML = `
                    <div class="text-center">
                        <h3 class="mt-2 text-lg font-semibold text-gray-900">Cannot Delete Category</h3>
                        <p class="mt-2 text-sm text-gray-500">Cannot delete "${name}" because it has ${transactionCount} transactions linked to it.</p>
                        <div class="mt-5 sm:mt-6">
                            <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                        </div>
                    </div>`;
                openModal(modalHTML);
                return;
            }
            
            const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-gray-900">Delete Category?</h3>
                    <p class="mt-2 text-sm text-gray-500">Are you sure you want to delete the category "${name}"? This cannot be undone.</p>
                    <div class="mt-5 sm:mt-6 flex justify-center space-x-3">
                        <button id="confirm-cat-delete" class="btn-danger w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Yes, Delete</button>
                        <button class="close-modal-btn btn-secondary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Cancel</button>
                    </div>
                </div>`;
            openModal(modalHTML);
            
            document.getElementById('confirm-cat-delete').addEventListener('click', async () => {
                if (!categoryRecord) {
                    closeModal();
                    return;
                }
                const { error } = await supabase.from('categories').delete().eq('id', categoryRecord.id);
                if (error) {
                    console.error('Failed to delete category', error);
                }
                await loadState();
                manageCategoriesBtn.click(); // Re-opens and re-renders the manage categories modal
                renderForm();
            });
        }

        const renameBtn = e.target.closest('.rename-category-btn');
        if (renameBtn) {
            const listItem = renameBtn.closest('.category-item');
            const categoryNameSpan = listItem.querySelector('.category-name');
            const categoryActions = listItem.querySelector('.category-actions');
            const oldName = listItem.dataset.name;
            const type = listItem.dataset.type;
            const category = type === 'expense' ? state.expenseCategories.find(c => c.name === oldName) : { name: oldName };

            categoryNameSpan.classList.add('hidden');
            categoryActions.classList.add('hidden');

            const editContainer = document.createElement('div');
            editContainer.className = 'edit-category-container flex-grow space-y-2';
            let colorPaletteHTML = '';
            if(type === 'expense') {
                const renderColorPalette = (selectedColor) => PREDEFINED_COLORS.map(color => `<div class="color-swatch ${color === selectedColor ? 'selected' : ''}" style="background-color: ${color};" data-color="${color}"></div>`).join('');
                colorPaletteHTML = `<div class="flex flex-wrap gap-2 color-palette">${renderColorPalette(category.color)}</div><input type="hidden" name="color" value="${category.color}">`;
            }
            editContainer.innerHTML = `
                <div class="flex items-center gap-2">
                    <input type="text" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" value="${oldName}">
                    <button class="save-rename-btn btn-primary px-3 py-1 rounded-md text-sm">Save</button>
                    <button class="cancel-rename-btn btn-secondary px-3 py-1 rounded-md text-sm">X</button>
                </div>
                ${colorPaletteHTML}
            `;
            
            listItem.prepend(editContainer);
            editContainer.querySelector('input').focus();
        }
        
        const saveRenameBtn = e.target.closest('.save-rename-btn');
        if (saveRenameBtn) {
            const listItem = saveRenameBtn.closest('.category-item');
            const input = listItem.querySelector('input[type="text"]');
            const newName = input.value.trim();
            const oldName = listItem.dataset.name;
            const type = listItem.dataset.type;
            const categoryRecord = getCategoryRecord(type, oldName);

            let hasChanged = false;
            let nameHasChanged = newName && newName !== oldName;
            let newColor = null;

            if (type === 'income') {
                if (nameHasChanged) {
                    hasChanged = true;
                }
            } else { // type is 'expense'
                const colorInput = listItem.querySelector('input[name="color"]');
                newColor = colorInput ? colorInput.value : null;
                const category = state.expenseCategories.find(c => c.name === oldName);
                if (category) {
                    const colorHasChanged = newColor && newColor !== category.color;
                    if (nameHasChanged || colorHasChanged) {
                        hasChanged = true;
                    }
                }
            }
            
            if (hasChanged && categoryRecord) {
                const updates = {};
                if (nameHasChanged) updates.name = newName;
                if (type === 'expense' && newColor) updates.color = newColor;
                if (Object.keys(updates).length > 0) {
                    const { error } = await supabase.from('categories').update(updates).eq('id', categoryRecord.id);
                    if (error) console.error('Failed to rename category', error);
                    await loadState();
                    render(); // Full re-render to update UI everywhere
                }
            }
            manageCategoriesBtn.click(); // Re-render the modal to show the updated list or cancel edit view
        }
    
        const cancelRenameBtn = e.target.closest('.cancel-rename-btn');
        if (cancelRenameBtn) {
            manageCategoriesBtn.click(); 
        }

        if (e.target.id === 'export-json-btn') exportToJSON();
        if (e.target.id === 'export-csv-btn') exportToCSV();

        if (e.target.id === 'submit-json-import') {
            const fileInput = modalContent.querySelector('#import-json-input');
            const errorEl = modalContent.querySelector('#json-error');
            errorEl.textContent = ''; // Clear previous errors
            if (fileInput.files.length > 0) {
                importFromJSON(fileInput.files[0]);
            } else {
                errorEl.textContent = 'Please select a JSON file first.';
            }
        }

        if (e.target.id === 'submit-csv-import') {
            const fileInput = modalContent.querySelector('#import-csv-input');
            const errorEl = modalContent.querySelector('#csv-error');
            errorEl.textContent = ''; // Clear previous errors
            if (fileInput.files.length > 0) {
                importFromCSV(fileInput.files[0]);
            } else {
                errorEl.textContent = 'Please select a CSV file first.';
            }
        }
    });
    
    // -------------------------------------------------------------------------
    // DATA IMPORT/EXPORT
    // -------------------------------------------------------------------------

    const exportToJSON = () => {
        const dataStr = JSON.stringify(state, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `budget_tracker_data_${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        closeModal();
    };
    
    const exportToCSV = () => {
        const headers = 'ID,Date,Type,Category,Description,Amount,Note,AssetID';
        const rows = state.transactions.map(t => {
            const description = `"${(t.description || '').replace(/"/g, '""')}"`;
            const note = `"${(t.note || '').replace(/"/g, '""')}"`;
            return [t.id, t.date, t.type, t.category, description, t.amount, note, t.assetId].join(',');
        }).join('\n');

        const csvContent = `${headers}\n${rows}`;
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `budget_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        linkElement.click();
        closeModal();
    };

    const importFromJSON = () => {
        const errorEl = modalContent.querySelector('#json-error');
        if (errorEl) {
            errorEl.textContent = 'Import is not available yet with cloud sync.';
        }
    };
    
    const importFromCSV = () => {
        const errorEl = modalContent.querySelector('#csv-error');
        if (errorEl) {
            errorEl.textContent = 'Import is not available yet with cloud sync.';
        }
    };


    // -------------------------------------------------------------------------
    // ANALYTICS & CHARTING (using Chart.js)
    // -------------------------------------------------------------------------

    let expensePieChart, expenseTrendChart, assetPieChart;

    const destroyCharts = () => {
        if (expensePieChart) expensePieChart.destroy();
        if (expenseTrendChart) expenseTrendChart.destroy();
        if (assetPieChart) assetPieChart.destroy();
        expensePieChart = null;
        expenseTrendChart = null;
        assetPieChart = null;
    };

    const renderAnalytics = () => {
        if (state.ui.currentPage !== 'analytics') return;
        destroyCharts();
        populateAnalyticsFilters();
        const filtered = getFilteredTransactions();

        const isVisible = state.ui.isBalanceVisible;
        const censoredText = '₹ ******';

        const income = filtered.filter(t => t.type === 'income' && t.category !== 'Internal Transfer').reduce((s, t) => s + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'expense' && t.category !== 'Internal Transfer').reduce((s, t) => s + t.amount, 0);
        const savings = income - expense;

        analyticsSavingsEl.textContent = isVisible ? formatCurrency(savings) : censoredText;
        analyticsIncomeEl.textContent = isVisible ? formatCurrency(income) : censoredText;
        analyticsExpensesEl.textContent = isVisible ? formatCurrency(expense) : censoredText;

        analyticsSavingsEl.className = `text-3xl font-bold ${savings >= 0 ? 'text-purple-600' : 'text-orange-500'}`;
        analyticsIncomeEl.className = 'text-3xl font-bold text-green-600';
        analyticsExpensesEl.className = 'text-3xl font-bold text-red-600';
        
        const chartTransactions = filtered.filter(t => t.category !== 'Internal Transfer');
        renderExpensePieChart(chartTransactions);
        renderExpenseTrendChart(chartTransactions);
    };
    
    const populateAnalyticsFilters = () => {
        const years = [...new Set(state.transactions.map(t => new Date(t.date).getFullYear()))];
        if (!years.includes(new Date().getFullYear())) { years.push(new Date().getFullYear()); }
        analyticsYearSelect.innerHTML = years.sort((a,b) => b-a).map(y => `<option value="${y}" ${y === state.ui.analytics.year ? 'selected' : ''}>${y}</option>`).join('');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        analyticsMonthSelect.innerHTML = months.map((m, i) => `<option value="${i}" ${i === state.ui.analytics.month ? 'selected' : ''}>${m}</option>`).join('');
    };

    [analyticsPeriodSelect, analyticsYearSelect, analyticsMonthSelect].forEach(el => {
        el.addEventListener('change', () => {
            state.ui.analytics.period = analyticsPeriodSelect.value;
            state.ui.analytics.year = parseInt(analyticsYearSelect.value);
            state.ui.analytics.month = parseInt(analyticsMonthSelect.value);
            analyticsYearSelect.disabled = !['this-month', 'this-year'].includes(state.ui.analytics.period);
            analyticsMonthSelect.disabled = state.ui.analytics.period !== 'this-month';
            renderAnalytics();
        });
    });

    const getFilteredTransactions = () => {
        const now = new Date();
        const { period, year, month } = state.ui.analytics;
        let start, end;
        switch (period) {
            case 'this-week':
                start = new Date(now.setDate(now.getDate() - now.getDay()));
                end = new Date(new Date(start).setDate(start.getDate() + 7));
                break;
            case 'this-month':
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 1);
                break;
            case 'this-year':
                start = new Date(year, 0, 1);
                end = new Date(year + 1, 0, 1);
                break;
            case 'ytd':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'all-time': return state.transactions;
            default: return [];
        }
        return state.transactions.filter(t => {
            const d = new Date(t.date);
            const adjD = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
            return adjD >= start && adjD < end;
        });
    };
    
    const renderExpensePieChart = (transactions) => {
        const emptyMsg = document.getElementById('expense-chart-empty');
        const ctx = document.getElementById('expense-chart').getContext('2d');
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            emptyMsg.classList.remove('hidden');
            return;
        }
        emptyMsg.classList.add('hidden');

        const byCat = expenses.reduce((a, t) => {
            a[t.category] = (a[t.category] || 0) + t.amount;
            return a;
        }, {});

        const labels = Object.keys(byCat);
        const data = Object.values(byCat);
        const backgroundColors = labels.map(label => state.expenseCategories.find(c => c.name === label)?.color || getRandomColor());

        expensePieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#fff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        onClick: (e, legendItem, legend) => {
                            const chart = legend.chart;
                            // 1. Manually replicate default Chart.js v4+ behavior for pie/doughnut charts
                            chart.toggleDataVisibility(legendItem.index);
                            chart.update();
                            
                            // 2. Sync our state with the chart's legend state
                            state.ui.analytics.hiddenCategories = legend.legendItems
                                .filter(item => item.hidden)
                                .map(item => item.text);
                            
                            // 3. Re-render ONLY the trend chart with the updated filter state
                            const filteredTimeTxs = getFilteredTransactions();
                            const chartTxs = filteredTimeTxs.filter(t => t.category !== 'Internal Transfer');
                            renderExpenseTrendChart(chartTxs);
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderExpenseTrendChart = (transactions) => {
        const emptyMsg = document.getElementById('expense-trend-chart-empty');
        const ctx = document.getElementById('expense-trend-chart').getContext('2d');
        
        // Filter out hidden categories from state
        const visibleTransactions = transactions.filter(t => !state.ui.analytics.hiddenCategories.includes(t.category));
        
        const expenses = visibleTransactions.filter(t => t.type === 'expense');

        const grouped = expenses.reduce((a, t) => {
            const key = new Date(t.date).toISOString().split('T')[0];
            a[key] = (a[key] || 0) + t.amount;
            return a;
        }, {});
        
        const labels = Object.keys(grouped).sort();
        
        if (expenseTrendChart) {
            expenseTrendChart.destroy();
            expenseTrendChart = null;
        }

        if (labels.length < 2) {
            emptyMsg.classList.remove('hidden');
            return;
        }
        emptyMsg.classList.add('hidden');

        const data = labels.map(k => grouped[k]);
        
        expenseTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expense',
                    data: data,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: value => formatCurrency(value) }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                 plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => `Expense: ${formatCurrency(context.parsed.y)}`
                        }
                    }
                }
            }
        });
    };
    
    // -------------------------------------------------------------------------
    // ASSETS PAGE LOGIC
    // -------------------------------------------------------------------------
    
    const renderAssetsPage = () => {
        const isVisible = state.ui.isBalanceVisible;
        const censoredText = '₹ ******';

        // Calculate and display Total Assets
        const totalAssets = state.assets.reduce((sum, asset) => sum + asset.balance, 0);
        if (totalAssetsAmountEl) { // Check if element exists
             totalAssetsAmountEl.textContent = isVisible ? formatCurrency(totalAssets) : censoredText;
             totalAssetsAmountEl.className = `text-3xl font-bold ${totalAssets >= 0 ? 'text-blue-600' : 'text-orange-500'}`;
        }

        // Render list of assets
        assetListEl.innerHTML = state.assets.map(asset => `
            <li class="flex justify-between items-center">
                <span class="font-medium">${asset.name}</span>
                <span class="text-slate-600">${state.ui.isBalanceVisible ? formatCurrency(asset.balance) : '******'}</span>
            </li>
        `).join('');

        // Populate transfer form dropdowns
        const transferFromSelect = document.getElementById('transfer-from');
        const transferToSelect = document.getElementById('transfer-to');
        transferFromSelect.innerHTML = state.assets.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        transferToSelect.innerHTML = state.assets.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        
        renderAssetPieChart();
    };

    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await requireUser();
        if (!user) return;

        const fromId = document.getElementById('transfer-from').value;
        const toId = document.getElementById('transfer-to').value;
        const amount = parseFloat(document.getElementById('transfer-amount').value);

        if(!amount || amount <= 0 || fromId === toId) {
             const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-gray-900">Invalid Transfer</h3>
                    <p class="mt-2 text-sm text-gray-500">Please check the amount and ensure the 'From' and 'To' accounts are different.</p>
                    <div class="mt-5 sm:mt-6">
                        <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                    </div>
                </div>`;
            openModal(modalHTML);
            return;
        }

        // Create two transactions to log the transfer
        const date = new Date().toISOString().split('T')[0];
        const fromAsset = state.assets.find(a=>a.id === fromId);
        const toAsset = state.assets.find(a=>a.id === toId);

        if (!fromAsset || !toAsset) {
            // Handle case where asset is not found, although it shouldn't happen with the dropdowns.
             const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-gray-900">Error</h3>
                    <p class="mt-2 text-sm text-gray-500">Could not find the selected accounts.</p>
                    <div class="mt-5 sm:mt-6">
                        <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                    </div>
                </div>`;
            openModal(modalHTML);
            return;
        }

        const expenseCategory = getSystemCategory('expense', 'Internal Transfer') || getCategoryRecord('expense', 'Internal Transfer');
        const incomeCategory = getSystemCategory('income', 'Internal Transfer') || getCategoryRecord('income', 'Internal Transfer');

        if (!expenseCategory || !incomeCategory) {
            const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-gray-900">Missing Category</h3>
                    <p class="mt-2 text-sm text-gray-500">Internal Transfer categories are missing. Please refresh and try again.</p>
                    <div class="mt-5 sm:mt-6">
                        <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                    </div>
                </div>`;
            openModal(modalHTML);
            return;
        }

        const { error } = await supabase.from('transactions').insert([
            {
                user_id: currentUserId,
                asset_id: fromId,
                category_id: expenseCategory.id,
                type: 'expense',
                amount,
                description: `Transfer to ${toAsset.name}`,
                note: '',
                transaction_date: date
            },
            {
                user_id: currentUserId,
                asset_id: toId,
                category_id: incomeCategory.id,
                type: 'income',
                amount,
                description: `Transfer from ${fromAsset.name}`,
                note: '',
                transaction_date: date
            }
        ]);

        if (error) {
            console.error('Failed to create transfer', error);
            return;
        }

        await loadState();
        render(); // Full re-render
        renderAssetsPage();
        transferForm.reset();
    });

    const renderAssetPieChart = () => {
        if(assetPieChart) assetPieChart.destroy();
        const emptyMsg = document.getElementById('asset-chart-empty');
        const ctx = document.getElementById('asset-chart').getContext('2d');
        
        if(state.assets.length === 0 || state.assets.every(a => a.balance <= 0)) {
            emptyMsg.classList.remove('hidden');
            return;
        }
        emptyMsg.classList.add('hidden');

        const labels = state.assets.map(a => a.name);
        const data = state.assets.map(a => a.balance);
        const backgroundColors = state.assets.map((_, index) => PREDEFINED_COLORS[index % PREDEFINED_COLORS.length]);

        assetPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#fff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.label}: ${formatCurrency(context.parsed)}`
                        }
                    }
                }
            }
        });
    };

    manageAssetsBtn.addEventListener('click', () => {
        const modalHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Manage Assets</h2>
                <button class="close-modal-btn p-1 text-2xl leading-none">&times;</button>
            </div>
            <div>
                <h3 class="font-semibold mb-2">Your Accounts</h3>
                <ul id="manage-asset-list" class="space-y-2 mb-4">
                    ${state.assets.map(asset => `
                        <li class="asset-item flex justify-between items-center p-2 bg-slate-100 rounded" data-id="${asset.id}" data-name="${asset.name}">
                             <span class="asset-name">${asset.name}</span>
                             <div class="asset-actions flex items-center space-x-2">
                                 <button class="rename-asset-btn text-slate-400 hover:text-indigo-600 p-1 rounded-full">
                                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                                 </button>
                                 <button class="delete-asset-btn text-slate-400 hover:text-red-600 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                             </div>
                        </li>
                    `).join('')}
                </ul>
                <h3 class="font-semibold mb-2 mt-6">Add New Asset</h3>
                <form id="add-asset-form" class="flex gap-2">
                    <input type="text" name="name" placeholder="Asset Name" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" required>
                    <input type="number" name="balance" placeholder="Initial Balance" class="block w-32 rounded-md border-gray-300 shadow-sm sm:text-sm" step="0.01">
                    <button type="submit" class="btn-primary px-3 py-1 rounded-md text-sm font-bold">+</button>
                </form>
            </div>`;
        openModal(modalHTML);
    });

     modalContent.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-asset-btn');
        if(deleteBtn) {
            const listItem = deleteBtn.closest('.asset-item');
            const assetId = listItem.dataset.id;
            const assetName = listItem.dataset.name;
            const transactionCount = state.transactions.filter(t => t.assetId === assetId).length;

            if (transactionCount > 0) {
                 const modalHTML = `
                    <div class="text-center">
                        <h3 class="mt-2 text-lg font-semibold text-gray-900">Cannot Delete Asset</h3>
                        <p class="mt-2 text-sm text-gray-500">Cannot delete "${assetName}" because it has ${transactionCount} transactions linked to it. Please reassign or delete them first.</p>
                        <div class="mt-5 sm:mt-6">
                            <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                        </div>
                    </div>`;
                openModal(modalHTML);
                return;
            }
             const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-gray-900">Delete Asset?</h3>
                    <p class="mt-2 text-sm text-gray-500">Are you sure you want to delete the asset "${assetName}"?</p>
                    <div class="mt-5 sm:mt-6 flex justify-center space-x-3">
                        <button id="confirm-asset-delete" class="btn-danger w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Yes, Delete</button>
                        <button class="close-modal-btn btn-secondary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Cancel</button>
                    </div>
                </div>`;
            openModal(modalHTML);

            document.getElementById('confirm-asset-delete').addEventListener('click', async () => {
                const { error } = await supabase.from('assets').delete().eq('id', assetId);
                if (error) {
                    console.error('Failed to delete asset', error);
                }
                await loadState();
                render();
                manageAssetsBtn.click();
            });
        }

        const renameBtn = e.target.closest('.rename-asset-btn');
        if(renameBtn) {
             const listItem = renameBtn.closest('.asset-item');
             const assetNameSpan = listItem.querySelector('.asset-name');
             const assetActions = listItem.querySelector('.asset-actions');
             const oldName = listItem.dataset.name;
             const assetId = listItem.dataset.id;
             const asset = state.assets.find(a => a.id === assetId);
             if (!asset) return;

             assetNameSpan.classList.add('hidden');
             assetActions.classList.add('hidden');
             const editContainer = document.createElement('div');
             editContainer.className = 'flex-grow grid grid-cols-1 md:grid-cols-2 gap-2 items-center';
             editContainer.innerHTML = `
                <input type="text" class="asset-name-input block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" value="${oldName}">
                <div class="relative">
                     <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-gray-500 sm:text-sm">₹</span></div>
                     <input type="number" step="0.01" class="asset-balance-input block w-full rounded-md border-gray-300 shadow-sm sm:text-sm pl-7" value="${asset.balance}">
                </div>
                 <div class="md:col-span-2 flex gap-2">
                    <button class="save-rename-asset-btn btn-primary px-3 py-1 rounded-md text-sm w-full">Save</button>
                    <button class="cancel-rename-asset-btn btn-secondary px-3 py-1 rounded-md text-sm w-full">Cancel</button>
                 </div>
            `;
             listItem.prepend(editContainer);
             editContainer.querySelector('input').focus();
        }

        const saveRenameBtn = e.target.closest('.save-rename-asset-btn');
        if(saveRenameBtn) {
            const listItem = saveRenameBtn.closest('.asset-item');
            const nameInput = listItem.querySelector('.asset-name-input');
            const balanceInput = listItem.querySelector('.asset-balance-input');
            const newName = nameInput.value.trim();
            const newBalance = parseFloat(balanceInput.value);
            const assetId = listItem.dataset.id;

            if (newName && !isNaN(newBalance)) {
                const { error } = await supabase
                    .from('assets')
                    .update({ name: newName, balance: newBalance })
                    .eq('id', assetId);
                if (error) {
                    console.error('Failed to update asset', error);
                }
                await loadState();
                render();
                manageAssetsBtn.click();
            }
        }

        const cancelRenameAssetBtn = e.target.closest('.cancel-rename-asset-btn');
        if(cancelRenameAssetBtn) {
            manageAssetsBtn.click();
        }
     });

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------

    const init = async () => {
        await loadState();
        formDateInput.value = formatDateForInput(new Date());
        render();
        // Resize charts on window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (state.ui.currentPage === 'analytics') renderAnalytics();
                if (state.ui.currentPage === 'assets') renderAssetsPage();
            }, 250);
        });
    };

    init();
}

