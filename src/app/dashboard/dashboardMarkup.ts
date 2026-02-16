export type DashboardPage = "tracker" | "assets" | "all-transactions" | "analytics" | "settings";

const resolvePageClass = (page: DashboardPage, activePage: DashboardPage) =>
  page === activePage ? "" : "hidden";

export const dashboardMarkup = (initialPage: DashboardPage = "tracker") => {
  const activePage = initialPage ?? "tracker";
  const trackerClass = resolvePageClass("tracker", activePage);
  const assetsClass = resolvePageClass("assets", activePage);
  const transactionsClass = resolvePageClass("all-transactions", activePage);
  const analyticsClass = resolvePageClass("analytics", activePage);
  const settingsClass = resolvePageClass("settings", activePage);

  return `
<div class="space-y-6">
            <!-- Tracker Page -->
            <div id="page-tracker" class="${trackerClass}">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div class="card card-glow p-5">
                        <div class="flex items-start justify-between mb-3">
                            <span class="text-sm text-muted-foreground font-medium">Monthly Income</span>
                            <div class="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
                            </div>
                        </div>
                        <div class="flex items-end justify-between gap-4">
                            <div>
                                <p id="income-amount" class="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">₹0.00</p>
                                <span class="text-xs text-muted-foreground">This month</span>
                            </div>
                            <div class="text-xs flex items-center gap-1">
                                <span id="income-delta" class="font-semibold text-muted-foreground">0.0%</span>
                                <span class="text-muted-foreground">vs last month</span>
                            </div>
                        </div>
                    </div>
                    <div class="card card-glow p-5">
                        <div class="flex items-start justify-between mb-3">
                            <span class="text-sm text-muted-foreground font-medium">Monthly Expense</span>
                            <div class="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17l-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></svg>
                            </div>
                        </div>
                        <div class="flex items-end justify-between gap-4">
                            <div>
                                <p id="expense-amount" class="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">₹0.00</p>
                                <span class="text-xs text-muted-foreground">This month</span>
                            </div>
                            <div class="text-xs flex items-center gap-1">
                                <span id="expense-delta" class="font-semibold text-muted-foreground">0.0%</span>
                                <span class="text-muted-foreground">vs last month</span>
                            </div>
                        </div>
                    </div>
                    <div class="card card-glow p-5">
                        <div class="flex items-start justify-between mb-3">
                            <span class="text-sm text-muted-foreground font-medium">Monthly Savings</span>
                            <div class="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M8 10h8" /></svg>
                            </div>
                        </div>
                        <div class="flex items-end justify-between gap-4">
                            <div>
                                <p id="monthly-savings-amount" class="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">₹0.00</p>
                                <span class="text-xs text-muted-foreground">This month</span>
                            </div>
                            <div class="text-xs flex items-center gap-1">
                                <span id="savings-delta" class="font-semibold text-muted-foreground">0.0%</span>
                                <span class="text-muted-foreground">vs last month</span>
                            </div>
                        </div>
                    </div>
                    <div class="card card-glow p-5">
                        <div class="flex items-start justify-between mb-3">
                            <span class="text-sm text-muted-foreground font-medium">Net Worth</span>
                            <div class="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" /><path d="M3 7h18" /><path d="M16 10h2" /></svg>
                            </div>
                        </div>
                        <div class="flex items-end justify-between gap-4">
                            <div>
                                <p id="net-worth-amount" class="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">₹0.00</p>
                                <span class="text-xs text-muted-foreground">All accounts</span>
                            </div>
                            <div class="text-xs flex items-center gap-1">
                                <span id="networth-delta" class="font-semibold text-muted-foreground">0.0%</span>
                                <span class="text-muted-foreground">vs last month</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Trend + Category Breakdown -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div class="card card-glow p-6 lg:col-span-2">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                            <div>
                                <h3 class="text-lg font-semibold text-foreground">Monthly Savings Trend</h3>
                                <p class="text-sm text-muted-foreground">Savings vs target</p>
                            </div>
                            <div class="text-sm text-muted-foreground">This month</div>
                        </div>
                        <div id="cashflow-trend-chart-container">
                            <canvas id="cashflow-trend-chart"></canvas>
                            <div id="cashflow-trend-empty" class="absolute inset-0 flex items-center justify-center text-muted-foreground hidden">No savings data for this month.</div>
                        </div>
                    </div>
                    <div class="card card-glow p-6">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                            <div>
                                <h3 class="text-lg font-semibold text-foreground">Expense by Category</h3>
                                <p class="text-sm text-muted-foreground">This month</p>
                            </div>
                        </div>
                        <div id="expense-category-bars" class="space-y-4"></div>
                        <div id="expense-category-empty" class="text-sm text-muted-foreground hidden">No expense data for this month.</div>
                    </div>
                </div>

                <!-- Add Transaction and Transactions List -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left Column: Add Transaction Form -->
                    <div class="lg:col-span-1 card p-6">
                        <h2 class="text-xl font-semibold text-foreground mb-4">Add Transaction</h2>
                        <form id="transaction-form" class="space-y-4">
                            <input type="hidden" id="transaction-id">
                            <div>
                                <label for="transaction-type" class="block text-sm font-medium text-muted-foreground">Type</label>
                                <div class="mt-1 flex rounded-md shadow-sm">
                                    <button type="button" id="type-btn-income" class="type-toggle-btn w-1/2 relative inline-flex items-center justify-center px-4 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/40 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">Income</button>
                                    <button type="button" id="type-btn-expense" class="type-toggle-btn w-1/2 -ml-px relative inline-flex items-center justify-center px-4 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/40 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">Expense</button>
                                    <input type="hidden" id="transaction-type" value="expense">
                                </div>
                            </div>
                             <div>
                                <label for="transaction-asset" class="block text-sm font-medium text-muted-foreground">Account / Asset</label>
                                <select id="transaction-asset" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                    <!-- Assets populated by JS -->
                                </select>
                            </div>
                            <div>
                                <label for="transaction-date" class="block text-sm font-medium text-muted-foreground">Date</label>
                                <input type="date" id="transaction-date" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                            </div>
                            <div>
                                <label for="transaction-category" class="block text-sm font-medium text-muted-foreground">Category</label>
                                <select id="transaction-category" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                    <!-- Categories populated by JS -->
                                </select>
                            </div>
                            <div>
                                <label for="transaction-amount" class="block text-sm font-medium text-muted-foreground">Amount</label>
                                <div class="mt-1 relative rounded-md shadow-sm">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span class="text-muted-foreground sm:text-sm">â‚¹</span>
                                    </div>
                                    <input type="number" id="transaction-amount" class="block w-full rounded-md border-border pl-7 pr-2 sm:text-sm" placeholder="0.00" step="0.01">
                                </div>
                            </div>
                            <div>
                                <label for="transaction-description" class="block text-sm font-medium text-muted-foreground">Description</label>
                                <input type="text" id="transaction-description" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm" placeholder="e.g., Groceries">
                            </div>
                            <div>
                                <label for="transaction-note" class="block text-sm font-medium text-muted-foreground">Note (Optional)</label>
                                <textarea id="transaction-note" rows="2" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm" placeholder="Add any extra details..."></textarea>
                            </div>
                            <div class="flex space-x-2">
                                <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium btn-primary">Save Transaction</button>
                                <button type="button" id="cancel-edit-btn" class="w-full hidden justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium btn-secondary">Cancel Edit</button>
                            </div>
                        </form>
                    </div>

                    <!-- Right Column: Transactions List -->
                    <div class="lg:col-span-2 card p-6">
                        <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                            <div><div><h2 class="text-xl font-semibold text-foreground">Recent Transactions</h2><p class="text-sm text-muted-foreground">Latest activity across your accounts</p></div></div>
                             <div class="flex flex-wrap items-center gap-2">
                                <button id="view-all-transactions-btn" class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">View all</button>
                                <button id="manage-categories-btn" class="text-sm font-medium text-accent hover:text-accent flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41 11 3H4a2 2 0 0 0-2 2v7l10.59 9.59a2 2 0 0 0 2.82 0l5.18-5.18a2 2 0 0 0 0-2.82Z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                                    Manage Categories
                                </button>
                                <button id="data-options-btn" class="text-sm font-medium text-accent hover:text-accent flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>
                                    Data Options
                                </button>
                            </div>
                        </div>
                        <div id="transaction-list-container" class="transaction-list h-[450px] overflow-y-auto pr-2">
                            <!-- JS will render transactions here -->
                            <div id="no-transactions-msg" class="text-center py-16">
                                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <h3 class="mt-2 text-sm font-medium text-foreground">No transactions</h3>
                                <p class="mt-1 text-sm text-muted-foreground">Get started by adding a new transaction.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Assets Page -->
            <div id="page-assets" class="${assetsClass}">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 space-y-8">

                        <!-- Added Total Assets Card -->
                        <div class="card card-glow p-6 flex justify-between items-center">
                            <div>
                                <p class="text-sm font-medium text-muted-foreground">Total Assets</p>
                                <p id="total-assets-amount" class="text-3xl font-bold text-sky-400">â‚¹0.00</p>
                            </div>
                            <div class="p-3 bg-sky-500/10 rounded-full">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 7h18" /><path d="M4 7v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7" /><path d="M12 11v6" /><path d="M9 14h6" /></svg>
                            </div>
                        </div>
                        <!-- End Added Card -->

                        <div class="card card-glow p-6">
                            <h2 class="text-xl font-semibold text-foreground mb-4">Transfer Funds</h2>
                            <form id="transfer-form" class="space-y-4">
                                <div>
                                    <label for="transfer-from" class="block text-sm font-medium text-muted-foreground">From</label>
                                    <select id="transfer-from" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm"></select>
                                </div>
                                <div>
                                    <label for="transfer-to" class="block text-sm font-medium text-muted-foreground">To</label>
                                    <select id="transfer-to" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm"></select>
                                </div>
                                <div>
                                    <label for="transfer-amount" class="block text-sm font-medium text-muted-foreground">Amount</label>
                                    <div class="mt-1 relative rounded-md shadow-sm">
                                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-muted-foreground sm:text-sm">â‚¹</span></div>
                                        <input type="number" id="transfer-amount" class="block w-full rounded-md border-border pl-7 pr-2 sm:text-sm" placeholder="0.00" step="0.01">
                                    </div>
                                </div>
                                <button type="submit" class="w-full btn-primary py-2 px-4 rounded-md">Transfer</button>
                            </form>
                        </div>

                         <div class="card card-glow p-6">
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-xl font-semibold text-foreground">Your Assets</h2>
                                <button id="manage-assets-btn" class="text-sm font-medium text-accent hover:text-accent">Manage</button>
                            </div>
                            <ul id="asset-list" class="space-y-3">
                                <!-- Asset list rendered by JS -->
                            </ul>
                        </div>
                    </div>
                    <div class="lg:col-span-2 card p-6">
                         <h2 class="text-xl font-semibold text-foreground mb-4">Asset Distribution</h2>
                         <div id="asset-chart-container">
                            <canvas id="asset-chart"></canvas>
                             <div id="asset-chart-empty" class="absolute inset-0 flex items-center justify-center text-muted-foreground hidden">Add assets to see distribution.</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- All Transactions Page -->
            <div id="page-all-transactions" class="${transactionsClass}">
                <div class="card card-glow p-6">
                    <h2 class="text-2xl font-bold text-foreground mb-6">All Transactions</h2>
                    
                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6 p-4 bg-card/70 rounded-xl border border-border/60">
                        <div class="lg:col-span-3">
                             <label for="search-description" class="block text-sm font-medium text-muted-foreground">Search</label>
                             <input type="text" id="search-description" placeholder="Search by description..." class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                        </div>
                        <div class="lg:col-span-2">
                             <label for="filter-type" class="block text-sm font-medium text-muted-foreground">Type</label>
                             <select id="filter-type" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                 <option value="all">All Types</option>
                                 <option value="income">Income</option>
                                 <option value="expense">Expense</option>
                             </select>
                        </div>
                        <div class="lg:col-span-3">
                             <label for="filter-category" class="block text-sm font-medium text-muted-foreground">Category</label>
                             <select id="filter-category" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                 <!-- JS Populated -->
                             </select>
                        </div>
                        <div class="lg:col-span-4 grid grid-cols-2 gap-2">
                            <div>
                                <label for="filter-date-start" class="block text-sm font-medium text-muted-foreground">From</label>
                                <input type="date" id="filter-date-start" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                            </div>
                            <div>
                                <label for="filter-date-end" class="block text-sm font-medium text-muted-foreground">To</label>
                                <input type="date" id="filter-date-end" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                            </div>
                        </div>
                        <div class="col-span-full flex items-center justify-end space-x-2 mt-2">
                            <button id="reset-filters-btn" class="h-9 px-4 btn-secondary rounded-md text-sm">Reset Filters</button>
                            <button id="erase-data-btn" class="h-9 px-4 btn-danger rounded-md text-sm">Erase All Data</button>
                        </div>
                    </div>

                    <!-- Full Transaction List -->
                    <div id="full-transaction-list-container" class="transaction-list h-[600px] overflow-y-auto pr-2">
                        <!-- JS renders full list here -->
                    </div>
                </div>
            </div>

            <!-- Analytics Page -->
            <div id="page-analytics" class="${analyticsClass}">
                <!-- Filters -->
                <div class="card card-glow p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center">
                    <h3 class="text-lg font-semibold text-muted-foreground">Analytics Filters</h3>
                    <div class="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label for="analytics-period" class="block text-sm font-medium text-muted-foreground">Period</label>
                            <select id="analytics-period" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                <option value="this-week">This Week</option>
                                <option value="this-month" selected>This Month</option>
                                <option value="this-year">This Year</option>
                                <option value="ytd">Year to Date</option>
                                <option value="all-time">All Time</option>
                            </select>
                        </div>
                         <div>
                            <label for="analytics-year" class="block text-sm font-medium text-muted-foreground">Year</label>
                            <select id="analytics-year" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                <!-- JS Populated -->
                            </select>
                        </div>
                        <div>
                            <label for="analytics-month" class="block text-sm font-medium text-muted-foreground">Month</label>
                            <select id="analytics-month" class="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm">
                                <!-- JS Populated -->
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Analytics Summary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                     <div class="card card-glow p-6">
                        <p class="text-sm font-medium text-muted-foreground">Net Savings</p>
                        <p id="analytics-savings" class="text-3xl font-bold text-sky-400">â‚¹0.00</p>
                    </div>
                    <div class="card card-glow p-6">
                        <p class="text-sm font-medium text-muted-foreground">Total Income</p>
                        <p id="analytics-income" class="text-3xl font-bold text-sky-400">â‚¹0.00</p>
                    </div>
                    <div class="card card-glow p-6">
                        <p class="text-sm font-medium text-muted-foreground">Total Expenses</p>
                        <p id="analytics-expenses" class="text-3xl font-bold text-rose-400">â‚¹0.00</p>
                    </div>
                </div>

                <!-- Analytics Metrics -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="card card-glow p-5">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Transactions</p>
                        <div class="mt-3 flex items-end justify-between">
                            <p id="analytics-transactions-count" class="text-xl font-semibold text-foreground">0</p>
                            <span class="text-xs text-muted-foreground">This period</span>
                        </div>
                    </div>
                    <div class="card card-glow p-5">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Avg Expense</p>
                        <div class="mt-3 flex items-end justify-between">
                            <p id="analytics-average-expense" class="text-xl font-semibold text-foreground">?0.00</p>
                            <span class="text-xs text-muted-foreground">Per txn</span>
                        </div>
                    </div>
                    <div class="card card-glow p-5">
                        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Savings Rate</p>
                        <div class="mt-3 flex items-end justify-between">
                            <p id="analytics-savings-rate" class="text-xl font-semibold text-foreground">0%</p>
                            <span class="text-xs text-muted-foreground">Income</span>
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card card-glow p-6">
                        <h3 class="text-xl font-semibold text-foreground mb-4">Expense by Category</h3>
                        <div id="expense-chart-container">
                            <canvas id="expense-chart"></canvas>
                             <div id="expense-chart-empty" class="absolute inset-0 flex items-center justify-center text-muted-foreground hidden">No expense data for this period.</div>
                        </div>
                    </div>
                    <div class="card card-glow p-6">
                        <h3 class="text-xl font-semibold text-foreground mb-4">Expense Trend</h3>
                        <div id="expense-trend-chart-container">
                            <canvas id="expense-trend-chart"></canvas>
                            <div id="expense-trend-chart-empty" class="absolute inset-0 flex items-center justify-center text-muted-foreground hidden">Not enough data to show a trend.</div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Settings Page -->
            <div id="page-settings" class="${settingsClass}">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card card-glow p-6">
                        <h2 class="text-xl font-semibold text-foreground mb-2">Settings</h2>
                        <p class="text-sm text-muted-foreground mb-6">Update your monthly savings target.</p>
                        <form id="settings-form" class="space-y-4">
                            <div>
                                <label for="monthly-savings-target" class="block text-sm font-medium text-muted-foreground">Monthly Savings Target</label>
                                <div class="mt-1 relative rounded-md shadow-sm">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span class="text-muted-foreground sm:text-sm">?</span>
                                    </div>
                                    <input type="number" id="monthly-savings-target" class="block w-full rounded-md border-border pl-7 pr-2 sm:text-sm" step="0.01" min="0" value="500">
                                </div>
                            </div>
                            <button type="submit" class="btn-primary px-4 py-2 rounded-md">Save Settings</button>
                            <p id="settings-status" class="text-xs text-muted-foreground"></p>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    <!-- Modals -->
    <!-- Generic Modal Shell -->
    <div id="modal-container" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden modal-backdrop">
        <div id="modal-content" class="w-full max-w-md bg-card rounded-lg shadow-xl p-6 modal-content">
            <!-- Modal content will be injected here by JS -->
        </div>
    </div>
    
    <!-- Chart Tooltip -->
    <div id="chart-tooltip"></div>
`;
};
