// @ts-nocheck
/* eslint-disable */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
type BudgetInitOptions = {
  initialPage?: "tracker" | "assets" | "all-transactions" | "analytics" | "settings";
};

export function initBudgetDashboard(options: BudgetInitOptions = {}) {
  if (typeof window === "undefined") return;
  const win = window as Window & { __budgetDashboardInit?: boolean };
  if (win.__budgetDashboardInit) return;
  win.__budgetDashboardInit = true;
  // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------
    
    const PREDEFINED_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#0ea5e9', '#38bdf8', '#22d3ee', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];
    const getRandomColor = () => PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
    const createDefaultState = () => ({
        assets: [],
        transactions: [],
        categories: [],
        incomeCategories: [],
        expenseCategories: [],
        settings: {
            monthlySavingsTarget: 500,
            useCompactCurrency: true
        },
        ui: {
            currentPage: 'tracker', // 'tracker', 'assets', 'all-transactions', 'analytics', or 'settings'
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
        'analytics': '/dashboard/analytics',
        'settings': '/dashboard/settings'
    };

    const pageFromPath = (path) => {
        if (path.startsWith('/dashboard/assets')) return 'assets';
        if (path.startsWith('/dashboard/transactions')) return 'all-transactions';
        if (path.startsWith('/dashboard/analytics')) return 'analytics';
        if (path.startsWith('/dashboard/settings')) return 'settings';
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

        const [assetsRes, categoriesRes, transactionsRes, settingsRes] = await Promise.all([
            supabase.from('assets').select('*').order('created_at', { ascending: true }),
            supabase.from('categories').select('*').order('created_at', { ascending: true }),
            supabase
                .from('transactions')
                .select('id, type, amount, description, note, transaction_date, created_at, asset_id, category:categories(name)')
                .order('transaction_date', { ascending: false }),
            supabase
                .from('user_settings')
                .select('monthly_savings_target, use_compact_currency')
                .eq('user_id', currentUserId)
                .maybeSingle()
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

        if (settingsRes?.error) {
            console.error('Failed to load settings', settingsRes.error);
            const fallbackSettings = await supabase
                .from('user_settings')
                .select('monthly_savings_target')
                .eq('user_id', currentUserId)
                .maybeSingle();
            if (fallbackSettings?.data?.monthly_savings_target != null) {
                state.settings.monthlySavingsTarget = Number(fallbackSettings.data.monthly_savings_target);
            }
        } else if (settingsRes?.data) {
            if (settingsRes.data.monthly_savings_target != null) {
                state.settings.monthlySavingsTarget = Number(settingsRes.data.monthly_savings_target);
            }
            if (settingsRes.data.use_compact_currency != null) {
                state.settings.useCompactCurrency = Boolean(settingsRes.data.use_compact_currency);
            }
        } else {
            const fallbackTarget = Number(state.settings.monthlySavingsTarget || 500);
            const { data: insertedSettings, error: insertError } = await supabase
                .from('user_settings')
                .insert({
                    user_id: currentUserId,
                    monthly_savings_target: fallbackTarget,
                    use_compact_currency: state.settings.useCompactCurrency
                })
                .select('monthly_savings_target, use_compact_currency')
                .single();
            if (insertError) {
                console.error('Failed to create settings row', insertError);
                const fallbackInsert = await supabase
                    .from('user_settings')
                    .insert({
                        user_id: currentUserId,
                        monthly_savings_target: fallbackTarget
                    })
                    .select('monthly_savings_target')
                    .single();
                if (fallbackInsert?.data?.monthly_savings_target != null) {
                    state.settings.monthlySavingsTarget = Number(fallbackInsert.data.monthly_savings_target);
                }
            } else if (insertedSettings) {
                if (insertedSettings.monthly_savings_target != null) {
                    state.settings.monthlySavingsTarget = Number(insertedSettings.monthly_savings_target);
                }
                if (insertedSettings.use_compact_currency != null) {
                    state.settings.useCompactCurrency = Boolean(insertedSettings.use_compact_currency);
                }
            }
        }
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
    const pageSettings = document.getElementById('page-settings');
    
    const incomeAmountEl = document.getElementById('income-amount');
    const incomeDeltaEl = document.getElementById('income-delta');
    const expenseAmountEl = document.getElementById('expense-amount');
    const expenseDeltaEl = document.getElementById('expense-delta');
    const netWorthAmountEl = document.getElementById('net-worth-amount');
    const netWorthDeltaEl = document.getElementById('networth-delta');
    const expenseCategoryBarsEl = document.getElementById('expense-category-bars');
    const expenseCategoryEmptyEl = document.getElementById('expense-category-empty');
    const savingsDeltaEl = document.getElementById('savings-delta');
    const cashflowTrendCanvas = document.getElementById('cashflow-trend-chart');
    const cashflowTrendEmptyEl = document.getElementById('cashflow-trend-empty');
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
    const viewAllTransactionsBtn = document.getElementById('view-all-transactions-btn');
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const settingsForm = document.getElementById('settings-form');
    const monthlySavingsTargetInput = document.getElementById('monthly-savings-target');
    const compactCurrencyToggle = document.getElementById('compact-currency-toggle');
    const settingsStatus = document.getElementById('settings-status');

    // Analytics elements
    const analyticsPeriodSelect = document.getElementById('analytics-period');
    const analyticsYearSelect = document.getElementById('analytics-year');
    const analyticsMonthSelect = document.getElementById('analytics-month');
    const analyticsSavingsEl = document.getElementById('analytics-savings');
    const analyticsIncomeEl = document.getElementById('analytics-income');
    const analyticsExpensesEl = document.getElementById('analytics-expenses');
    const analyticsTransactionsCountEl = document.getElementById('analytics-transactions-count');
    const analyticsAverageExpenseEl = document.getElementById('analytics-average-expense');
    const analyticsSavingsRateEl = document.getElementById('analytics-savings-rate');
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

    const formatCompactCurrency = (amount) => {
        const abs = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        if (abs >= 1_000_000) {
            const value = abs / 1_000_000;
            const fixed = value >= 10 ? value.toFixed(0) : value.toFixed(1);
            return `${sign}₹${fixed}M`;
        }
        if (abs >= 1_000) {
            const value = abs / 1_000;
            const fixed = value >= 10 ? value.toFixed(0) : value.toFixed(1);
            return `${sign}₹${fixed}K`;
        }
        return formatCurrency(amount);
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

    const showInsufficientFundsModal = (assetName, balance, attempted) => {
        const safeName = assetName || 'This account';
        const modalHTML = `
            <div class="text-center">
                <h3 class="mt-2 text-lg font-semibold text-foreground">Insufficient Funds</h3>
                <p class="mt-2 text-sm text-muted-foreground">
                    ${safeName} would fall below zero. Balance: ${formatCurrency(balance)}. Attempted: ${formatCurrency(attempted)}.
                </p>
                <div class="mt-5 sm:mt-6">
                    <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                </div>
            </div>`;
        openModal(modalHTML);
    };

    const getTransactionEffect = (type, amount) => (type === 'income' ? amount : -amount);


    const applyDelta = (el, current, previous) => {
        if (!el) return;
        const container = el.closest('.delta-indicator') || el.parentElement;
        const upIcon = container?.querySelector('.delta-icon-up');
        const downIcon = container?.querySelector('.delta-icon-down');

        const setIconState = (state) => {
            if (upIcon && downIcon) {
                upIcon.classList.toggle('hidden', state !== 'up');
                downIcon.classList.toggle('hidden', state !== 'down');
                upIcon.classList.remove('text-emerald-400', 'text-rose-400', 'text-muted-foreground');
                downIcon.classList.remove('text-emerald-400', 'text-rose-400', 'text-muted-foreground');
                const colorClass = state === 'up' ? 'text-emerald-400' : state === 'down' ? 'text-rose-400' : 'text-muted-foreground';
                upIcon.classList.add(colorClass);
                downIcon.classList.add(colorClass);
            }
        };

        if (previous === 0) {
            if (current === 0) {
                el.textContent = '0.0%';
                el.className = 'font-semibold text-muted-foreground';
                setIconState('neutral');
                return;
            }
            el.textContent = '+100.0%';
            el.className = 'font-semibold text-emerald-400';
            setIconState('up');
            return;
        }

        const change = ((current - previous) / Math.abs(previous)) * 100;
        const isUp = change >= 0;
        el.textContent = `${isUp ? '+' : ''}${change.toFixed(1)}%`;
        el.className = `font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`;
        setIconState(isUp ? 'up' : 'down');
    };

    // -------------------------------------------------------------------------
    // RENDER FUNCTIONS (Updating the UI)
    // -------------------------------------------------------------------------
    
    const render = () => {
        renderSummary();
        renderTransactionList(state.transactions, transactionListContainer, noTransactionsMsg); // Show all for sorting demo
        renderForm();
        renderSettings();
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

        let monthlyIncome = 0;
        let monthlyExpense = 0;
        const trendTransactions = state.transactions;
        const expenseByCategory = new Map();
        const categoryColorMap = new Map();

        state.categories.forEach(cat => {
            if (cat.type === 'expense') {
                categoryColorMap.set(cat.name, cat.color || '#38bdf8');
            }
        });

        state.transactions.forEach(t => {
            const transactionDate = new Date(t.date);
            if (transactionDate.getFullYear() !== currentYear || transactionDate.getMonth() !== currentMonth) return;
            if (t.category === 'Internal Transfer') return;

            if (t.type === 'income') {
                monthlyIncome += t.amount;
            } else {
                monthlyExpense += t.amount;
                const color = categoryColorMap.get(t.category) || '#38bdf8';
                const current = expenseByCategory.get(t.category) || { amount: 0, color };
                expenseByCategory.set(t.category, { amount: current.amount + t.amount, color: current.color || color });
            }
        });

        const monthlySavings = monthlyIncome - monthlyExpense;

        const prevDate = new Date(currentYear, currentMonth - 1, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth();
        let prevIncome = 0;
        let prevExpense = 0;

        state.transactions.forEach(t => {
            const transactionDate = new Date(t.date);
            if (transactionDate.getFullYear() !== prevYear || transactionDate.getMonth() !== prevMonth) return;
            if (t.category === 'Internal Transfer') return;
            if (t.type === 'income') {
                prevIncome += t.amount;
            } else {
                prevExpense += t.amount;
            }
        });

        const prevSavings = prevIncome - prevExpense;

        // Calculate Net Worth
        const netWorth = state.assets.reduce((sum, asset) => sum + asset.balance, 0);
        const prevNetWorth = netWorth - monthlySavings;

        const useCompact = state.settings.useCompactCurrency !== false;
        const formatSummaryCurrency = useCompact ? formatCompactCurrency : formatCurrency;

        incomeAmountEl.textContent = isVisible ? formatSummaryCurrency(monthlyIncome) : censoredText;
        expenseAmountEl.textContent = isVisible ? formatSummaryCurrency(monthlyExpense) : censoredText;
        monthlySavingsAmountEl.textContent = isVisible ? formatSummaryCurrency(monthlySavings) : censoredText;
        netWorthAmountEl.textContent = isVisible ? formatSummaryCurrency(netWorth) : censoredText;

        renderExpenseCategoryBars(expenseByCategory, monthlyExpense, isVisible, censoredText);
        renderCumulativeExpenseTrendChart(trendTransactions, currentYear, currentMonth);
        applyDelta(incomeDeltaEl, monthlyIncome, prevIncome);
        applyDelta(expenseDeltaEl, monthlyExpense, prevExpense);
        applyDelta(savingsDeltaEl, monthlySavings, prevSavings);
        applyDelta(netWorthDeltaEl, netWorth, prevNetWorth);

        renderVisibilityToggle();
    };

    const renderSettings = () => {
        if (!monthlySavingsTargetInput) return;
        const targetValue = Number(state.settings.monthlySavingsTarget ?? 500);
        if (document.activeElement !== monthlySavingsTargetInput) {
            monthlySavingsTargetInput.value = Number.isFinite(targetValue) ? String(targetValue) : '500';
        }
        if (compactCurrencyToggle) {
            compactCurrencyToggle.checked = state.settings.useCompactCurrency !== false;
        }
        if (settingsStatus) {
            settingsStatus.textContent = '';
        }
    };

    const renderExpenseCategoryBars = (categoryTotals, totalExpense, isVisible, censoredText) => {
        if (!expenseCategoryBarsEl || !expenseCategoryEmptyEl) return;
        expenseCategoryBarsEl.innerHTML = '';

        if (!totalExpense || categoryTotals.size === 0) {
            expenseCategoryEmptyEl.classList.remove('hidden');
            return;
        }

        expenseCategoryEmptyEl.classList.add('hidden');

        const entries = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .slice(0, 4);

        entries.forEach(([name, details]) => {
            const amount = details.amount || 0;
            const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
            const barColor = details.color || '#38bdf8';
            const row = document.createElement('div');
            row.className = 'space-y-2';
            row.innerHTML = `
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span class="text-sm font-medium text-foreground">${name}</span>
                    <span>${isVisible ? formatCompactCurrency(amount) : censoredText} &bull; ${percent}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div class="h-full" style="width: ${percent}%; background-color: ${barColor};"></div>
                </div>
            `;
            expenseCategoryBarsEl.appendChild(row);
        });
    };

    const renderCumulativeExpenseTrendChart = (transactions, year, month) => {
        if (!cashflowTrendCanvas) return;
        const ctx = cashflowTrendCanvas.getContext('2d');
        if (!ctx) return;

        if (cashflowTrendChart) {
            cashflowTrendChart.destroy();
            cashflowTrendChart = null;
        }

        const expenseTransactions = transactions.filter(t => t.type === 'expense' && t.category !== 'Internal Transfer');
        const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
        const uniqueMonths = new Set(expenseTransactions.map(t => monthKey(new Date(t.date))));
        const monthCount = uniqueMonths.size;
        const useMonthlyView = monthCount >= 3;

        let labels = [];
        let currentSeries = [];
        let previousSeries = [];

        if (useMonthlyView) {
            const windowSize = Math.min(12, monthCount);
            const buildMonthRange = (endDate, count) =>
                Array.from({ length: count }, (_, i) =>
                    new Date(endDate.getFullYear(), endDate.getMonth() - (count - 1 - i), 1)
                );

            const endMonth = new Date(year, month, 1);
            const currentMonths = buildMonthRange(endMonth, windowSize);
            const previousMonths = currentMonths.map(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

            const monthlyTotals = new Map();
            expenseTransactions.forEach(t => {
                const d = new Date(t.date);
                const key = monthKey(d);
                monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + t.amount);
            });

            const getMonthlyTotal = (targetDate) =>
                monthlyTotals.get(monthKey(targetDate)) || 0;

            const currentTotals = currentMonths.map(getMonthlyTotal);
            const previousTotals = previousMonths.map(getMonthlyTotal);

            let runningCurrent = 0;
            let runningPrevious = 0;
            currentSeries = currentTotals.map(value => {
                runningCurrent += value;
                return runningCurrent;
            });
            previousSeries = previousTotals.map(value => {
                runningPrevious += value;
                return runningPrevious;
            });

            const spansYear = currentMonths[0].getFullYear() !== currentMonths[currentMonths.length - 1].getFullYear();
            labels = currentMonths.map(d => {
                if (!spansYear) {
                    return d.toLocaleDateString('en-US', { month: 'short' });
                }
                const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
                const yearLabel = String(d.getFullYear()).slice(-2);
                return `${monthLabel} '${yearLabel}`;
            });
        } else {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const previousMonthDate = new Date(year, month - 1, 1);
            const prevYear = previousMonthDate.getFullYear();
            const prevMonth = previousMonthDate.getMonth();
            const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

            labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
            const currentDaily = Array(daysInMonth).fill(0);
            const previousDaily = Array(daysInMonth).fill(0);

            expenseTransactions.forEach(t => {
                const d = new Date(t.date);
                const dayIndex = d.getDate() - 1;
                if (d.getFullYear() === year && d.getMonth() === month) {
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                        currentDaily[dayIndex] += t.amount;
                    }
                } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
                    if (dayIndex >= 0 && dayIndex < daysInPrevMonth && dayIndex < daysInMonth) {
                        previousDaily[dayIndex] += t.amount;
                    }
                }
            });

            let runningCurrent = 0;
            let runningPrevious = 0;
            currentSeries = currentDaily.map(value => {
                runningCurrent += value;
                return runningCurrent;
            });
            previousSeries = previousDaily.map(value => {
                runningPrevious += value;
                return runningPrevious;
            });
        }

        const hasData = currentSeries.some(v => v > 0) || previousSeries.some(v => v > 0);
        if (!hasData) {
            if (cashflowTrendEmptyEl) cashflowTrendEmptyEl.classList.remove('hidden');
            return;
        }
        if (cashflowTrendEmptyEl) cashflowTrendEmptyEl.classList.add('hidden');

        const currentGradient = ctx.createLinearGradient(0, 0, 0, cashflowTrendCanvas.height || 300);
        currentGradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        currentGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

        const previousGradient = ctx.createLinearGradient(0, 0, 0, cashflowTrendCanvas.height || 300);
        previousGradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
        previousGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

        cashflowTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Current',
                        data: currentSeries,
                        borderColor: '#38bdf8',
                        backgroundColor: currentGradient,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        borderWidth: 2,
                        pointStyle: 'circle'
                    },
                    {
                        label: 'Previous',
                        data: previousSeries,
                        borderColor: '#22c55e',
                        backgroundColor: previousGradient,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        borderWidth: 2,
                        pointStyle: 'circle'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', maxTicksLimit: 8 }
                    },
                    y: {
                        ticks: {
                            color: '#94a3b8',
                            callback: value => formatCompactCurrency(value),
                            maxTicksLimit: 5
                        },
                        grid: {
                            color: 'rgba(148,163,184,0.12)',
                            borderDash: [4, 4]
                        }
                    }
                }
            }
        });
    };

    const renderTransactionList = (transactions, container, emptyMsgEl) => {
        container.innerHTML = '';

        if (transactions.length === 0) {
            emptyMsgEl.style.display = 'block';
             if (container.id === 'full-transaction-list-container') {
                emptyMsgEl.innerHTML = `<div class="text-center py-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <h3 class="mt-2 text-sm font-medium text-foreground">No transactions found</h3>
                                        <p class="mt-1 text-sm text-muted-foreground">Try adjusting your filters or adding a new transaction.</p>
                                    </div>`;
            } else {
                 emptyMsgEl.innerHTML = `<div class="text-center py-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <h3 class="mt-2 text-sm font-medium text-foreground">No recent transactions</h3>
                                        <p class="mt-1 text-sm text-muted-foreground">Get started by adding a new transaction.</p>
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
            const amountClass = isIncome ? 'text-sky-400' : 'text-rose-400';
            const assetName = state.assets.find(a => a.id === t.assetId)?.name || 'Unknown';

                                    const li = document.createElement('div');
            li.className = 'transaction-item group rounded-xl border border-border/60 bg-card/60 p-4 transition-all duration-200 hover:border-accent/40 hover:bg-card/80';
            li.innerHTML = `
                <div class="flex flex-col gap-3">
                    <div class="flex items-start gap-4">
                        <div class="h-11 w-11 rounded-xl ${isIncome ? 'bg-sky-500/10' : 'bg-rose-500/10'} flex items-center justify-center">
                            ${isIncome ? 
                                `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>` :
                                `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 17l-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></svg>`
                            }
                        </div>
                        <div class="flex-1">
                            <div class="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center md:gap-3">
                                <div class="md:col-span-5">
                                    <p class="text-sm text-muted-foreground">${t.category} &bull; ${assetName}</p>
                                    <p class="text-base font-semibold text-foreground">${t.description}</p>
                                </div>
                                <div class="md:col-span-3 text-xs text-muted-foreground md:text-center">${formatDateForDisplay(t.date)}</div>
                                <div class="md:col-span-4 flex items-center justify-between md:justify-end gap-2">
                                    <p class="font-semibold text-right ${amountClass}">${state.ui.isBalanceVisible ? `${sign}${formatCurrency(Math.abs(t.amount))}`: '******'}</p>
                                    ${t.note ? `
                                        <button class="note-toggle-btn p-1 text-muted-foreground hover:text-accent">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                        </button>
                                    ` : '<div class="w-7"></div>'}
                                    <div class="relative transaction-actions">
                                        <button class="more-btn p-1 text-muted-foreground hover:text-foreground" aria-label="More actions">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                        </button>
                                        <div class="transaction-actions-menu hidden absolute right-0 mt-2 w-28 rounded-md border border-border bg-card shadow-lg z-20">
                                            <button data-id="${t.id}" class="edit-btn w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40">Edit</button>
                                            <button data-id="${t.id}" class="delete-btn w-full text-left px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${t.note ? `
                        <div class="note-content w-full rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
                            <p class="text-xs text-muted-foreground whitespace-pre-wrap font-mono">${t.note}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(li);
        });
    };

    const renderForm = (preserveCategory = true) => {
        const activeStyles = ['bg-accent', 'text-accent-foreground', 'border-accent', 'z-10'];
        const inactiveStyles = ['border-border', 'bg-card', 'text-foreground', 'hover:bg-muted/50'];

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

    const animatePage = (pageEl) => {
        if (!pageEl) return;
        pageEl.classList.remove('page-enter');
        void pageEl.offsetWidth;
        pageEl.classList.add('page-enter');
    };

    const applyCardStagger = (pageEl) => {
        if (!pageEl) return;
        const cards = Array.from(pageEl.querySelectorAll('.card'));
        const ordered = cards.slice().sort((a, b) => {
            const topDiff = a.offsetTop - b.offsetTop;
            if (Math.abs(topDiff) > 8) return topDiff;
            return a.offsetLeft - b.offsetLeft;
        });
        ordered.forEach((card, index) => {
            card.classList.add('card-stagger');
            card.style.setProperty('--card-delay', `${index * 50}ms`);
        });
    };

    const renderPage = () => {
        pageTracker.classList.add('hidden');
        pageAssets.classList.add('hidden');
        pageAllTransactions.classList.add('hidden');
        pageAnalytics.classList.add('hidden');
        pageSettings.classList.add('hidden');

        if (state.ui.currentPage === 'tracker') {
            pageTracker.classList.remove('hidden');
            applyCardStagger(pageTracker);
            animatePage(pageTracker);
            setTimeout(() => {
                renderSummary();
            }, 0);
        } else if (state.ui.currentPage === 'assets') {
            pageAssets.classList.remove('hidden');
            applyCardStagger(pageAssets);
            animatePage(pageAssets);
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
            applyCardStagger(pageAllTransactions);
            animatePage(pageAllTransactions);
            renderAllTransactionsPage();
        } else if (state.ui.currentPage === 'analytics') {
            pageAnalytics.classList.remove('hidden');
            applyCardStagger(pageAnalytics);
            animatePage(pageAnalytics);
            
            setTimeout(() => {
                renderAnalytics(); 
            }, 0);
        } else if (state.ui.currentPage === 'settings') {
            pageSettings.classList.remove('hidden');
            applyCardStagger(pageSettings);
            animatePage(pageSettings);
            renderSettings();
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
        const today = new Date();
        const expectedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        const expectedPhrase = 'I want to delete all my data';
        // Use a custom modal instead of confirm()
        const modalHTML = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path></svg>
                </div>
                <h3 class="mt-2 text-lg font-semibold text-foreground">Erase All Data?</h3>
                <p class="mt-2 text-sm text-muted-foreground">Are you sure you want to erase ALL data, including transactions and categories? This action is permanent and cannot be undone.</p>
                <div class="mt-4 space-y-3 text-left">
                    <div>
                        <label class="block text-xs font-medium text-muted-foreground">Type today's date (dd/mm/yyyy)</label>
                        <input id="erase-date-input" type="text" placeholder="${expectedDate}" class="mt-1 block w-full rounded-md border-border bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-muted-foreground">Type this exact phrase</label>
                        <input id="erase-phrase-input" type="text" placeholder="${expectedPhrase}" class="mt-1 block w-full rounded-md border-border bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm">
                    </div>
                    <p id="erase-validation-error" class="text-xs text-rose-400 hidden">Both fields must match exactly.</p>
                </div>
                <div class="mt-5 sm:mt-6 flex justify-center space-x-3">
                    <button id="confirm-erase" class="btn-danger w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm" disabled>Yes, Erase Everything</button>
                    <button class="close-modal-btn btn-secondary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">Cancel</button>
                </div>
            </div>`;
        openModal(modalHTML);

        const dateInput = document.getElementById('erase-date-input');
        const phraseInput = document.getElementById('erase-phrase-input');
        const confirmBtn = document.getElementById('confirm-erase');
        const errorEl = document.getElementById('erase-validation-error');

        const validateEraseInputs = () => {
            const isDateValid = dateInput?.value === expectedDate;
            const isPhraseValid = phraseInput?.value === expectedPhrase;
            const isValid = isDateValid && isPhraseValid;
            if (confirmBtn) {
                confirmBtn.disabled = !isValid;
            }
            if (errorEl) {
                errorEl.classList.toggle('hidden', isValid || (!dateInput?.value && !phraseInput?.value));
            }
            return isValid;
        };

        dateInput?.addEventListener('input', validateEraseInputs);
        phraseInput?.addEventListener('input', validateEraseInputs);

        document.getElementById('confirm-erase').addEventListener('click', async () => {
            if (!validateEraseInputs()) {
                return;
            }
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
                { user_id: currentUserId, type: 'expense', name: 'Entertainment', color: '#38bdf8', is_system: false },
                { user_id: currentUserId, type: 'expense', name: 'Health', color: '#0ea5e9', is_system: false },
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

        const selectedAsset = state.assets.find(a => a.id === assetId);
        const newEffect = getTransactionEffect(type, amount);

        if (state.ui.formMode === 'edit') {
            const existing = state.transactions.find(t => t.id === id);
            if (existing) {
                const oldEffect = getTransactionEffect(existing.type, existing.amount);
                if (existing.assetId === assetId) {
                    if (selectedAsset) {
                        const nextBalance = selectedAsset.balance - oldEffect + newEffect;
                        if (nextBalance < 0) {
                            showInsufficientFundsModal(selectedAsset.name, selectedAsset.balance, amount);
                            return;
                        }
                    }
                } else {
                    const oldAsset = state.assets.find(a => a.id === existing.assetId);
                    if (oldAsset) {
                        const nextOldBalance = oldAsset.balance - oldEffect;
                        if (nextOldBalance < 0) {
                            showInsufficientFundsModal(oldAsset.name, oldAsset.balance, existing.amount);
                            return;
                        }
                    }
                    if (selectedAsset) {
                        const nextNewBalance = selectedAsset.balance + newEffect;
                        if (nextNewBalance < 0) {
                            showInsufficientFundsModal(selectedAsset.name, selectedAsset.balance, amount);
                            return;
                        }
                    }
                }
            } else if (type === 'expense' && selectedAsset && selectedAsset.balance - amount < 0) {
                showInsufficientFundsModal(selectedAsset.name, selectedAsset.balance, amount);
                return;
            }
        } else if (type === 'expense' && selectedAsset && selectedAsset.balance - amount < 0) {
            showInsufficientFundsModal(selectedAsset.name, selectedAsset.balance, amount);
            return;
        }

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
            const moreBtn = e.target.closest('.more-btn');
            if (moreBtn) {
                const wrapper = moreBtn.closest('.transaction-actions');
                const menu = wrapper?.querySelector('.transaction-actions-menu');
                if (menu) {
                    document.querySelectorAll('.transaction-actions-menu').forEach(el => {
                        if (el !== menu) el.classList.add('hidden');
                    });
                    menu.classList.toggle('hidden');
                }
                return;
            }

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
                        <h3 class="mt-2 text-lg font-semibold text-foreground">Delete Transaction?</h3>
                        <p class="mt-2 text-sm text-muted-foreground">Are you sure you want to delete this transaction: <br><strong>${transaction.description} (${formatCurrency(transaction.amount)})</strong>?</p>
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

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.transaction-actions')) {
            document.querySelectorAll('.transaction-actions-menu').forEach(el => el.classList.add('hidden'));
        }
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

    if (viewAllTransactionsBtn) {
        viewAllTransactionsBtn.addEventListener('click', () => setPage('all-transactions'));
    }

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
                <li class="category-item flex justify-between items-center p-2 bg-muted/60 rounded hover:bg-muted/70" data-name="${cat.name}" data-type="${type}">
                    <span class="category-name flex items-center">
                        ${cat.color ? `<span class="inline-block w-4 h-4 rounded-full mr-2" style="background-color: ${cat.color};"></span>` : ''}
                        ${cat.name}
                    </span>
                    <div class="category-actions flex items-center space-x-2">
                        <button class="rename-category-btn text-muted-foreground hover:text-accent p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                        </button>
                        <button class="delete-category-btn text-muted-foreground hover:text-red-600 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
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
                        <input type="text" placeholder="New income category" class="flex-grow block w-full rounded-md border-border shadow-sm sm:text-sm">
                        <button type="submit" class="btn-primary px-3 py-1 rounded-md text-sm font-bold">+</button>
                    </form>
                </div>
                <div>
                    <h3 class="font-semibold mb-2">Expense Categories</h3>
                    <ul id="expense-cat-list" class="space-y-2 mb-2">${renderCategoryList('expense')}</ul>
                    <form id="add-expense-cat-form" class="space-y-2">
                         <div class="flex gap-2">
                             <input type="text" name="name" placeholder="New expense category" class="flex-grow block w-full rounded-md border-border shadow-sm sm:text-sm" required>
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
                         <button id="export-csv-btn" class="w-full btn-secondary py-2 px-4 rounded-md text-sm">Export as CSV</button>
                     </div>
                 </div>
                  <div>
                     <h3 class="font-semibold mb-2">Import Data</h3>
                     <p class="text-sm text-muted-foreground mb-1">Import a CSV file. This will add to current data.</p>
                     <div class="flex gap-2">
                         <input type="file" id="import-csv-input" accept=".csv" class="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent-foreground hover:file:bg-accent/20"/>
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
                        <h3 class="mt-2 text-lg font-semibold text-foreground">Cannot Delete Category</h3>
                        <p class="mt-2 text-sm text-muted-foreground">Cannot delete "${name}" because it has ${transactionCount} transactions linked to it.</p>
                        <div class="mt-5 sm:mt-6">
                            <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                        </div>
                    </div>`;
                openModal(modalHTML);
                return;
            }
            
            const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-foreground">Delete Category?</h3>
                    <p class="mt-2 text-sm text-muted-foreground">Are you sure you want to delete the category "${name}"? This cannot be undone.</p>
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
                    <input type="text" class="flex-grow block w-full rounded-md border-border shadow-sm sm:text-sm" value="${oldName}">
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

        if (e.target.id === 'export-csv-btn') exportToCSV();

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

    const csvEscape = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        const escaped = stringValue.replace(/"/g, '""');
        return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const parseCSV = (text) => {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (next === '"') {
                        field += '"';
                        i += 1;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
                continue;
            }

            if (char === '"') {
                inQuotes = true;
                continue;
            }

            if (char === ',') {
                row.push(field);
                field = '';
                continue;
            }

            if (char === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                continue;
            }

            if (char === '\r') {
                if (next === '\n') {
                    i += 1;
                }
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                continue;
            }

            field += char;
        }

        if (field.length > 0 || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows;
    };

    const normalizeHeaderName = (value) => {
        if (!value) return '';
        return value
            .toString()
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
    };

    const HEADER_ALIASES = {
        id: 'transaction_id',
        transactionid: 'transaction_id',
        date: 'transaction_date',
        transactiondate: 'transaction_date',
        type: 'transaction_type',
        transactiontype: 'transaction_type',
        amount: 'amount',
        description: 'description',
        note: 'note',
        assetid: 'asset_id',
        assetname: 'asset_name',
        category: 'category_name',
        categoryname: 'category_name',
        categorytype: 'category_type',
        categorycolor: 'category_color',
        categoryissystem: 'category_is_system',
        createdat: 'transaction_created_at',
        transactioncreatedat: 'transaction_created_at'
    };

    const buildHeaderMap = (headers) => {
        const map = {};
        headers.forEach((header, index) => {
            const normalized = normalizeHeaderName(header);
            if (!normalized) return;
            const canonical = HEADER_ALIASES[normalized] || normalized;
            map[canonical] = index;
        });
        return map;
    };

    const parseBoolean = (value) => {
        if (value === true || value === false) return value;
        if (value === null || value === undefined) return false;
        const normalized = String(value).trim().toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n', ''].includes(normalized)) return false;
        return false;
    };

    const chunkArray = (items, size) => {
        const chunks = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    };

    const setCsvStatus = (message, isError = false) => {
        const errorEl = modalContent.querySelector('#csv-error');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.classList.toggle('text-red-500', isError);
        errorEl.classList.toggle('text-emerald-400', !isError);
    };

    const exportToCSV = () => {
        const headers = [
            'transaction_id',
            'transaction_date',
            'transaction_type',
            'amount',
            'description',
            'note',
            'asset_id',
            'asset_name',
            'category_name',
            'category_type',
            'category_color',
            'category_is_system',
            'transaction_created_at'
        ].join(',');

        const assetsById = new Map(state.assets.map(asset => [asset.id, asset]));
        const categoriesByKey = new Map(state.categories.map(cat => [`${cat.type}:${cat.name}`, cat]));

        const rows = state.transactions.map(t => {
            const asset = assetsById.get(t.assetId);
            const category = categoriesByKey.get(`${t.type}:${t.category}`);
            return [
                t.id,
                t.date,
                t.type,
                t.amount,
                t.description,
                t.note,
                t.assetId,
                asset?.name || '',
                t.category,
                category?.type || t.type,
                category?.color || '',
                category?.is_system ?? false,
                t.createdAt || ''
            ].map(csvEscape).join(',');
        }).join('\n');

        const csvContent = `${headers}\n${rows}`;
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `budget_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        linkElement.click();
        closeModal();
    };

    const importFromCSV = async (file) => {
        const user = await requireUser();
        if (!user) return;

        setCsvStatus('Reading CSV...', false);

        let text;
        try {
            text = await file.text();
        } catch (error) {
            console.error('Failed to read CSV file', error);
            setCsvStatus('Failed to read the CSV file.', true);
            return;
        }

        const rows = parseCSV(text).filter(row => row.some(cell => String(cell || '').trim() !== ''));
        if (rows.length < 2) {
            setCsvStatus('CSV file has no data rows.', true);
            return;
        }

        const headerMap = buildHeaderMap(rows[0]);
        const requiredHeaders = ['transaction_date', 'transaction_type', 'amount', 'description', 'category_name'];
        const missingHeaders = requiredHeaders.filter(key => headerMap[key] === undefined);
        const hasAssetHeader = headerMap.asset_id !== undefined || headerMap.asset_name !== undefined;

        if (!hasAssetHeader) {
            missingHeaders.push('asset_id or asset_name');
        }

        if (missingHeaders.length > 0) {
            setCsvStatus(`Missing required columns: ${missingHeaders.join(', ')}`, true);
            return;
        }

        await loadState();

        const existingAssetsById = new Map(state.assets.map(asset => [asset.id, asset]));
        const existingAssetsByName = new Map(state.assets.map(asset => [asset.name.toLowerCase(), asset]));
        const existingCategoriesByKey = new Map(state.categories.map(cat => [`${cat.type}:${cat.name}`, cat]));

        const preparedRows = [];
        const rowErrors = [];

        const getValue = (row, key) => {
            const index = headerMap[key];
            if (index === undefined) return '';
            return String(row[index] ?? '').trim();
        };

        rows.slice(1).forEach((row, index) => {
            const rowNumber = index + 2;
            const date = getValue(row, 'transaction_date');
            const typeRaw = getValue(row, 'transaction_type');
            const type = typeRaw.toLowerCase();
            const amountRaw = getValue(row, 'amount');
            const amount = parseFloat(amountRaw.replace(/,/g, ''));
            const description = getValue(row, 'description');
            const note = getValue(row, 'note');
            const assetId = getValue(row, 'asset_id');
            const assetName = getValue(row, 'asset_name');
            const categoryName = getValue(row, 'category_name');
            const categoryTypeRaw = getValue(row, 'category_type');
            const categoryTypeCandidate = categoryTypeRaw ? categoryTypeRaw.toLowerCase() : '';
            const categoryType = ['income', 'expense'].includes(categoryTypeCandidate) ? categoryTypeCandidate : type;
            const categoryColor = getValue(row, 'category_color');
            const categoryIsSystem = parseBoolean(getValue(row, 'category_is_system'));

            if (!date) {
                rowErrors.push(`Row ${rowNumber}: missing transaction_date`);
                return;
            }
            if (!type || !['income', 'expense'].includes(type)) {
                rowErrors.push(`Row ${rowNumber}: invalid transaction_type`);
                return;
            }
            if (Number.isNaN(amount)) {
                rowErrors.push(`Row ${rowNumber}: invalid amount`);
                return;
            }
            if (!description) {
                rowErrors.push(`Row ${rowNumber}: missing description`);
                return;
            }
            if (!categoryName) {
                rowErrors.push(`Row ${rowNumber}: missing category_name`);
                return;
            }
            if (!assetId && !assetName) {
                rowErrors.push(`Row ${rowNumber}: missing asset_id or asset_name`);
                return;
            }

            preparedRows.push({
                date,
                type,
                amount,
                description,
                note,
                assetId,
                assetName,
                categoryName,
                categoryType,
                categoryColor,
                categoryIsSystem
            });
        });

        const invalidRows = rowErrors.length;
        if (preparedRows.length === 0) {
            const preview = rowErrors.slice(0, 4).join(' | ');
            const suffix = rowErrors.length > 4 ? ` (and ${rowErrors.length - 4} more)` : '';
            setCsvStatus(`No valid rows to import. ${preview}${suffix}`, true);
            return;
        }

        const categoriesToCreateMap = new Map();
        preparedRows.forEach(row => {
            const type = row.categoryType || row.type;
            const key = `${type}:${row.categoryName}`;
            if (existingCategoriesByKey.has(key) || categoriesToCreateMap.has(key)) return;
            const isExpense = type === 'expense';
            const color = isExpense ? (row.categoryColor || getRandomColor()) : null;
            categoriesToCreateMap.set(key, {
                user_id: currentUserId,
                type,
                name: row.categoryName,
                color,
                is_system: row.categoryIsSystem || false
            });
        });

        if (categoriesToCreateMap.size > 0) {
            const { error } = await supabase.from('categories').insert(Array.from(categoriesToCreateMap.values()));
            if (error) {
                console.error('Failed to create categories', error);
                setCsvStatus('Failed to create categories during import.', true);
                return;
            }
            await loadState();
        }

        const assetsToCreateMap = new Map();
        const resolveExistingAssetId = (row, assetsById, assetsByName) => {
            if (row.assetId && assetsById.has(row.assetId)) return row.assetId;
            if (row.assetName) {
                const match = assetsByName.get(row.assetName.toLowerCase());
                if (match) return match.id;
            }
            return null;
        };

        preparedRows.forEach(row => {
            const existingId = resolveExistingAssetId(row, existingAssetsById, existingAssetsByName);
            if (existingId) return;
            if (!row.assetName) return;
            const key = row.assetName.toLowerCase();
            if (!assetsToCreateMap.has(key)) {
                assetsToCreateMap.set(key, row.assetName);
            }
        });

        if (assetsToCreateMap.size > 0) {
            const assetsToCreate = Array.from(assetsToCreateMap.values()).map(name => ({
                user_id: currentUserId,
                name,
                balance: 0
            }));
            const { error } = await supabase.from('assets').insert(assetsToCreate);
            if (error) {
                console.error('Failed to create assets', error);
                setCsvStatus('Failed to create assets during import.', true);
                return;
            }
            await loadState();
        }

        const categoriesByKey = new Map(state.categories.map(cat => [`${cat.type}:${cat.name}`, cat]));
        const assetsById = new Map(state.assets.map(asset => [asset.id, asset]));
        const assetsByName = new Map(state.assets.map(asset => [asset.name.toLowerCase(), asset]));

        const transactionsToInsert = [];
        let skipped = 0;

        preparedRows.forEach(row => {
            const assetId = resolveExistingAssetId(row, assetsById, assetsByName);
            const categoryKey = `${row.categoryType || row.type}:${row.categoryName}`;
            const category = categoriesByKey.get(categoryKey);
            if (!assetId || !category) {
                skipped += 1;
                return;
            }
            transactionsToInsert.push({
                user_id: currentUserId,
                asset_id: assetId,
                category_id: category.id,
                type: row.type,
                amount: row.amount,
                description: row.description,
                note: row.note || null,
                transaction_date: row.date
            });
        });

        if (transactionsToInsert.length === 0) {
            setCsvStatus('No valid transactions to import after validation.', true);
            return;
        }

        const chunks = chunkArray(transactionsToInsert, 500);
        for (let i = 0; i < chunks.length; i += 1) {
            const { error } = await supabase.from('transactions').insert(chunks[i]);
            if (error) {
                console.error('Failed to import transactions', error);
                setCsvStatus(`Failed to import transactions (batch ${i + 1}).`, true);
                return;
            }
        }

        await loadState();
        render();

        const totalSkipped = skipped + invalidRows;
        const skippedMessage = totalSkipped > 0 ? ` Skipped ${totalSkipped} row${totalSkipped === 1 ? '' : 's'}.` : '';
        setCsvStatus(`Imported ${transactionsToInsert.length} transaction${transactionsToInsert.length === 1 ? '' : 's'}.${skippedMessage}`, false);
    };


    // -------------------------------------------------------------------------
    // ANALYTICS & CHARTING (using Chart.js)
    // -------------------------------------------------------------------------

    let expensePieChart, expenseTrendChart, assetPieChart, cashflowTrendChart;

    const destroyCharts = () => {
        if (expensePieChart) expensePieChart.destroy();
        if (expenseTrendChart) expenseTrendChart.destroy();
        if (assetPieChart) assetPieChart.destroy();
        if (cashflowTrendChart) cashflowTrendChart.destroy();
        expensePieChart = null;
        expenseTrendChart = null;
        assetPieChart = null;
        cashflowTrendChart = null;
    };

    const renderAnalytics = () => {
        if (state.ui.currentPage !== 'analytics') return;
        destroyCharts();
        populateAnalyticsFilters();
        const filtered = getFilteredTransactions();

        const isVisible = state.ui.isBalanceVisible;
        const censoredText = '₹ ******';

        const visibleTransactions = filtered.filter(t => t.category !== 'Internal Transfer');
        const income = visibleTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = visibleTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savings = income - expense;
        const expenseTransactions = visibleTransactions.filter(t => t.type === 'expense');
        const averageExpense = expenseTransactions.length ? expense / expenseTransactions.length : 0;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        analyticsSavingsEl.textContent = isVisible ? formatCurrency(savings) : censoredText;
        analyticsIncomeEl.textContent = isVisible ? formatCurrency(income) : censoredText;
        analyticsExpensesEl.textContent = isVisible ? formatCurrency(expense) : censoredText;

        if (analyticsTransactionsCountEl) {
            analyticsTransactionsCountEl.textContent = `${visibleTransactions.length}`;
        }
        if (analyticsAverageExpenseEl) {
            analyticsAverageExpenseEl.textContent = isVisible ? formatCurrency(averageExpense) : censoredText;
        }
        if (analyticsSavingsRateEl) {
            analyticsSavingsRateEl.textContent = isVisible ? `${savingsRate.toFixed(1)}%` : '--';
        }

        analyticsSavingsEl.className = `text-3xl font-bold ${savings >= 0 ? 'text-sky-400' : 'text-amber-400'}`;
        analyticsIncomeEl.className = 'text-3xl font-bold text-sky-400';
        analyticsExpensesEl.className = 'text-3xl font-bold text-rose-400';
        
        renderExpensePieChart(visibleTransactions);
        renderExpenseTrendChart(visibleTransactions);
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
        const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'Internal Transfer');
        const byCat = expenses.reduce((a, t) => {
            a[t.category] = (a[t.category] || 0) + t.amount;
            return a;
        }, {});

        const entries = Object.entries(byCat)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        const colorMap = new Map(state.expenseCategories.map(cat => [cat.name, cat.color || '#38bdf8']));
        const formattedEntries = entries.map(entry => ({
            name: entry.name,
            amount: entry.amount,
            color: colorMap.get(entry.name) || '#38bdf8'
        }));

        const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
        window.dispatchEvent(new CustomEvent('budget:expense-breakdown', {
            detail: {
                total,
                entries: formattedEntries
            }
        }));
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
             totalAssetsAmountEl.className = `text-2xl lg:text-3xl font-semibold ${totalAssets >= 0 ? 'text-sky-400' : 'text-amber-400'}`;
        }

        // Render list of assets
        assetListEl.innerHTML = state.assets.map(asset => `
            <li class="flex justify-between items-center">
                <span class="font-medium">${asset.name}</span>
                <span class="text-muted-foreground">${state.ui.isBalanceVisible ? formatCurrency(asset.balance) : '******'}</span>
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
                    <h3 class="mt-2 text-lg font-semibold text-foreground">Invalid Transfer</h3>
                    <p class="mt-2 text-sm text-muted-foreground">Please check the amount and ensure the 'From' and 'To' accounts are different.</p>
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
                    <h3 class="mt-2 text-lg font-semibold text-foreground">Error</h3>
                    <p class="mt-2 text-sm text-muted-foreground">Could not find the selected accounts.</p>
                    <div class="mt-5 sm:mt-6">
                        <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                    </div>
                </div>`;
            openModal(modalHTML);
            return;
        }

        if (fromAsset.balance - amount < 0) {
            showInsufficientFundsModal(fromAsset.name, fromAsset.balance, amount);
            return;
        }

        const expenseCategory = getSystemCategory('expense', 'Internal Transfer') || getCategoryRecord('expense', 'Internal Transfer');
        const incomeCategory = getSystemCategory('income', 'Internal Transfer') || getCategoryRecord('income', 'Internal Transfer');

        if (!expenseCategory || !incomeCategory) {
            const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-foreground">Missing Category</h3>
                    <p class="mt-2 text-sm text-muted-foreground">Internal Transfer categories are missing. Please refresh and try again.</p>
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

    if (settingsForm && monthlySavingsTargetInput) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = await requireUser();
            if (!user) return;

            const nextTarget = Number(monthlySavingsTargetInput.value);
            const nextCompact = compactCurrencyToggle ? compactCurrencyToggle.checked : true;
            if (!Number.isFinite(nextTarget) || nextTarget < 0) {
                if (settingsStatus) {
                    settingsStatus.textContent = 'Enter a valid monthly target.';
                    settingsStatus.className = 'text-xs text-rose-400';
                }
                return;
            }

            if (settingsStatus) {
                settingsStatus.textContent = 'Saving...';
                settingsStatus.className = 'text-xs text-muted-foreground';
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert(
                    {
                        user_id: currentUserId,
                        monthly_savings_target: nextTarget,
                        use_compact_currency: nextCompact
                    },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Failed to save settings', error);
                if (settingsStatus) {
                    settingsStatus.textContent = 'Could not save settings. Please try again.';
                    settingsStatus.className = 'text-xs text-rose-400';
                }
                return;
            }

            state.settings.monthlySavingsTarget = nextTarget;
            state.settings.useCompactCurrency = nextCompact;
            if (settingsStatus) {
                settingsStatus.textContent = 'Settings saved.';
                settingsStatus.className = 'text-xs text-emerald-400';
            }
            renderSummary();
        });
    }

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
                        <li class="asset-item flex justify-between items-center p-2 bg-muted/60 rounded" data-id="${asset.id}" data-name="${asset.name}">
                             <span class="asset-name">${asset.name}</span>
                             <div class="asset-actions flex items-center space-x-2">
                                 <button class="rename-asset-btn text-muted-foreground hover:text-accent p-1 rounded-full">
                                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                                 </button>
                                 <button class="delete-asset-btn text-muted-foreground hover:text-red-600 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                             </div>
                        </li>
                    `).join('')}
                </ul>
                <h3 class="font-semibold mb-2 mt-6">Add New Asset</h3>
                <form id="add-asset-form" class="flex gap-2">
                    <input type="text" name="name" placeholder="Asset Name" class="flex-grow block w-full rounded-md border-border shadow-sm sm:text-sm" required>
                    <input type="number" name="balance" placeholder="Initial Balance" class="block w-32 rounded-md border-border shadow-sm sm:text-sm" step="0.01">
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
                        <h3 class="mt-2 text-lg font-semibold text-foreground">Cannot Delete Asset</h3>
                        <p class="mt-2 text-sm text-muted-foreground">Cannot delete "${assetName}" because it has ${transactionCount} transactions linked to it. Please reassign or delete them first.</p>
                        <div class="mt-5 sm:mt-6">
                            <button class="close-modal-btn btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold shadow-sm">OK</button>
                        </div>
                    </div>`;
                openModal(modalHTML);
                return;
            }
             const modalHTML = `
                <div class="text-center">
                    <h3 class="mt-2 text-lg font-semibold text-foreground">Delete Asset?</h3>
                    <p class="mt-2 text-sm text-muted-foreground">Are you sure you want to delete the asset "${assetName}"?</p>
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
                <input type="text" class="asset-name-input block w-full rounded-md border-border shadow-sm sm:text-sm" value="${oldName}">
                <div class="relative">
                     <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-muted-foreground sm:text-sm">₹</span></div>
                     <input type="number" step="0.01" class="asset-balance-input block w-full rounded-md border-border shadow-sm sm:text-sm pl-7" value="${asset.balance}">
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

            if (!isNaN(newBalance) && newBalance < 0) {
                showInsufficientFundsModal(newName || listItem.dataset.name, newBalance, newBalance);
                return;
            }

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

