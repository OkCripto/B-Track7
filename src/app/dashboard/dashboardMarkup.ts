export const dashboardMarkup = `
<div id="app" class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        <!-- App Header and Navigation -->
        <header class="mb-8">
            <div class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div class="flex items-center">
                    <h1 class="text-3xl font-bold text-slate-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-3 text-indigo-600" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" /></svg>
                        Budget Tracker
                    </h1>
                    <button id="visibility-toggle" class="ml-4 p-2 rounded-full text-slate-500 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <svg id="eye-icon-open" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <svg id="eye-icon-slashed" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243l-4.243-4.243zM11.828 15c-.623.623-1.478 1-2.428 1-1.933 0-3.5-1.567-3.5-3.5 0-.95.377-1.805 1-2.428M14.122 14.122L12 12" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c1.206 0 2.362.248 3.44.686M21 12c-1.274 4.057-5.064 7-9.542 7A9.97 9.97 0 015.025 15.025" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
                        </svg>
                    </button>
                </div>
                <div class="flex items-center gap-3">
                    <nav class="flex space-x-2 p-1 bg-slate-200 rounded-lg">
                        <button id="nav-tracker" class="px-4 py-2 text-sm font-medium rounded-md transition-colors tab-active">Tracker</button>
                        <button id="nav-assets" class="px-4 py-2 text-sm font-medium rounded-md text-slate-600 transition-colors">Assets</button>
                        <button id="nav-all-transactions" class="px-4 py-2 text-sm font-medium rounded-md text-slate-600 transition-colors">All Transactions</button>
                        <button id="nav-analytics" class="px-4 py-2 text-sm font-medium rounded-md text-slate-600 transition-colors">Analytics</button>
                    </nav>
                    <div class="relative">
                        <button id="user-menu-btn" class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <span class="sr-only">Open user menu</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a5 5 0 00-3.535 8.535A7.5 7.5 0 002.5 17.5a.75.75 0 001.5 0A6 6 0 0110 11.5a6 6 0 016 6 .75.75 0 001.5 0 7.5 7.5 0 00-3.965-6.965A5 5 0 0010 2zm0 2.5a3 3 0 100 6 3 3 0 000-6z" clip-rule="evenodd" /></svg>
                        </button>
                        <div id="user-menu" class="hidden absolute right-0 mt-3 w-56 rounded-xl bg-slate-900 text-white shadow-xl ring-1 ring-black/10">
                            <div class="px-4 py-3 border-b border-slate-700">
                                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
                                <p id="user-email" class="mt-1 text-sm font-semibold truncate">user@example.com</p>
                            </div>
                            <button id="signout-btn" class="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-800">Sign out</button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content Area -->
        <main>
            <!-- Tracker Page -->
            <div id="page-tracker">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="card p-6 flex justify-between items-center">
                        <div>
                            <p class="text-sm font-medium text-slate-500">Monthly Income</p>
                            <p id="income-amount" class="text-3xl font-bold text-green-600">₹0.00</p>
                        </div>
                         <div class="p-3 bg-green-100 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>
                        </div>
                    </div>
                    <div class="card p-6 flex justify-between items-center">
                        <div>
                            <p class="text-sm font-medium text-slate-500">Monthly Expense</p>
                            <p id="expense-amount" class="text-3xl font-bold text-red-600">₹0.00</p>
                        </div>
                        <div class="p-3 bg-red-100 rounded-full">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        </div>
                    </div>
                    <div class="card p-6 flex justify-between items-center">
                        <div>
                            <p class="text-sm font-medium text-slate-500">Monthly Savings</p>
                            <p id="monthly-savings-amount" class="text-3xl font-bold text-purple-600">₹0.00</p>
                        </div>
                        <div class="p-3 bg-purple-100 rounded-full">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                    </div>
                    <div class="card p-6 flex justify-between items-center">
                        <div>
                            <p class="text-sm font-medium text-slate-500">Net Worth</p>
                            <p id="net-worth-amount" class="text-3xl font-bold text-blue-600">₹0.00</p>
                        </div>
                        <div class="p-3 bg-blue-100 rounded-full">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                    </div>
                </div>

                <!-- Add Transaction and Transactions List -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left Column: Add Transaction Form -->
                    <div class="lg:col-span-1 card p-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Add Transaction</h2>
                        <form id="transaction-form" class="space-y-4">
                            <input type="hidden" id="transaction-id">
                            <div>
                                <label for="transaction-type" class="block text-sm font-medium text-slate-700">Type</label>
                                <div class="mt-1 flex rounded-md shadow-sm">
                                    <button type="button" id="type-btn-income" class="type-toggle-btn w-1/2 relative inline-flex items-center justify-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Income</button>
                                    <button type="button" id="type-btn-expense" class="type-toggle-btn w-1/2 -ml-px relative inline-flex items-center justify-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Expense</button>
                                    <input type="hidden" id="transaction-type" value="expense">
                                </div>
                            </div>
                             <div>
                                <label for="transaction-asset" class="block text-sm font-medium text-slate-700">Account / Asset</label>
                                <select id="transaction-asset" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                    <!-- Assets populated by JS -->
                                </select>
                            </div>
                            <div>
                                <label for="transaction-date" class="block text-sm font-medium text-slate-700">Date</label>
                                <input type="date" id="transaction-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                            </div>
                            <div>
                                <label for="transaction-category" class="block text-sm font-medium text-slate-700">Category</label>
                                <select id="transaction-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                    <!-- Categories populated by JS -->
                                </select>
                            </div>
                            <div>
                                <label for="transaction-amount" class="block text-sm font-medium text-slate-700">Amount</label>
                                <div class="mt-1 relative rounded-md shadow-sm">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span class="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input type="number" id="transaction-amount" class="block w-full rounded-md border-gray-300 pl-7 pr-2 sm:text-sm" placeholder="0.00" step="0.01">
                                </div>
                            </div>
                            <div>
                                <label for="transaction-description" class="block text-sm font-medium text-slate-700">Description</label>
                                <input type="text" id="transaction-description" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="e.g., Groceries">
                            </div>
                            <div>
                                <label for="transaction-note" class="block text-sm font-medium text-slate-700">Note (Optional)</label>
                                <textarea id="transaction-note" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Add any extra details..."></textarea>
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
                            <h2 class="text-xl font-semibold text-slate-800">Recent Transactions</h2>
                             <div class="flex space-x-2">
                                <button id="manage-categories-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Manage Categories
                                </button>
                                <button id="data-options-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v1.333a1 1 0 01-.786.973l-1.637.545a1 1 0 01-1.156-1.156l.545-1.637A1 1 0 0110 4.333V3z" /><path d="M10 8a1 1 0 011 1v1.333a1 1 0 01-.786.973l-1.637.545a1 1 0 01-1.156-1.156l.545-1.637A1 1 0 0110 9.333V8z" /><path d="M10 13a1 1 0 011 1v1.333a1 1 0 01-.786.973l-1.637.545a1 1 0 01-1.156-1.156l.545-1.637A1 1 0 0110 14.333V13z" /></svg>
                                    Data Options
                                </button>
                            </div>
                        </div>
                        <div id="transaction-list-container" class="transaction-list h-[450px] overflow-y-auto pr-2">
                            <!-- JS will render transactions here -->
                            <div id="no-transactions-msg" class="text-center py-16">
                                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <h3 class="mt-2 text-sm font-medium text-slate-900">No transactions</h3>
                                <p class="mt-1 text-sm text-slate-500">Get started by adding a new transaction.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Assets Page -->
            <div id="page-assets" class="hidden">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 space-y-8">

                        <!-- Added Total Assets Card -->
                        <div class="card p-6 flex justify-between items-center">
                            <div>
                                <p class="text-sm font-medium text-slate-500">Total Assets</p>
                                <p id="total-assets-amount" class="text-3xl font-bold text-blue-600">₹0.00</p>
                            </div>
                            <div class="p-3 bg-blue-100 rounded-full">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                        </div>
                        <!-- End Added Card -->

                        <div class="card p-6">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4">Transfer Funds</h2>
                            <form id="transfer-form" class="space-y-4">
                                <div>
                                    <label for="transfer-from" class="block text-sm font-medium text-slate-700">From</label>
                                    <select id="transfer-from" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></select>
                                </div>
                                <div>
                                    <label for="transfer-to" class="block text-sm font-medium text-slate-700">To</label>
                                    <select id="transfer-to" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></select>
                                </div>
                                <div>
                                    <label for="transfer-amount" class="block text-sm font-medium text-slate-700">Amount</label>
                                    <div class="mt-1 relative rounded-md shadow-sm">
                                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-gray-500 sm:text-sm">₹</span></div>
                                        <input type="number" id="transfer-amount" class="block w-full rounded-md border-gray-300 pl-7 pr-2 sm:text-sm" placeholder="0.00" step="0.01">
                                    </div>
                                </div>
                                <button type="submit" class="w-full btn-primary py-2 px-4 rounded-md">Transfer</button>
                            </form>
                        </div>

                         <div class="card p-6">
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-xl font-semibold text-slate-800">Your Assets</h2>
                                <button id="manage-assets-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Manage</button>
                            </div>
                            <ul id="asset-list" class="space-y-3">
                                <!-- Asset list rendered by JS -->
                            </ul>
                        </div>
                    </div>
                    <div class="lg:col-span-2 card p-6">
                         <h2 class="text-xl font-semibold text-slate-800 mb-4">Asset Distribution</h2>
                         <div id="asset-chart-container">
                            <canvas id="asset-chart"></canvas>
                             <div id="asset-chart-empty" class="absolute inset-0 flex items-center justify-center text-slate-500 hidden">Add assets to see distribution.</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- All Transactions Page -->
            <div id="page-all-transactions" class="hidden">
                <div class="card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">All Transactions</h2>
                    
                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
                        <div class="lg:col-span-3">
                             <label for="search-description" class="block text-sm font-medium text-slate-700">Search</label>
                             <input type="text" id="search-description" placeholder="Search by description..." class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                        </div>
                        <div class="lg:col-span-2">
                             <label for="filter-type" class="block text-sm font-medium text-slate-700">Type</label>
                             <select id="filter-type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                 <option value="all">All Types</option>
                                 <option value="income">Income</option>
                                 <option value="expense">Expense</option>
                             </select>
                        </div>
                        <div class="lg:col-span-3">
                             <label for="filter-category" class="block text-sm font-medium text-slate-700">Category</label>
                             <select id="filter-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                 <!-- JS Populated -->
                             </select>
                        </div>
                        <div class="lg:col-span-4 grid grid-cols-2 gap-2">
                            <div>
                                <label for="filter-date-start" class="block text-sm font-medium text-slate-700">From</label>
                                <input type="date" id="filter-date-start" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                            </div>
                            <div>
                                <label for="filter-date-end" class="block text-sm font-medium text-slate-700">To</label>
                                <input type="date" id="filter-date-end" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
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
            <div id="page-analytics" class="hidden">
                <!-- Filters -->
                <div class="card p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center">
                    <h3 class="text-lg font-semibold text-slate-700">Analytics Filters</h3>
                    <div class="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label for="analytics-period" class="block text-sm font-medium text-slate-700">Period</label>
                            <select id="analytics-period" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                <option value="this-week">This Week</option>
                                <option value="this-month" selected>This Month</option>
                                <option value="this-year">This Year</option>
                                <option value="ytd">Year to Date</option>
                                <option value="all-time">All Time</option>
                            </select>
                        </div>
                         <div>
                            <label for="analytics-year" class="block text-sm font-medium text-slate-700">Year</label>
                            <select id="analytics-year" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                <!-- JS Populated -->
                            </select>
                        </div>
                        <div>
                            <label for="analytics-month" class="block text-sm font-medium text-slate-700">Month</label>
                            <select id="analytics-month" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                                <!-- JS Populated -->
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Analytics Summary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                     <div class="card p-6">
                        <p class="text-sm font-medium text-slate-500">Net Savings</p>
                        <p id="analytics-savings" class="text-3xl font-bold text-slate-800">₹0.00</p>
                    </div>
                    <div class="card p-6">
                        <p class="text-sm font-medium text-slate-500">Total Income</p>
                        <p id="analytics-income" class="text-3xl font-bold text-green-600">₹0.00</p>
                    </div>
                    <div class="card p-6">
                        <p class="text-sm font-medium text-slate-500">Total Expenses</p>
                        <p id="analytics-expenses" class="text-3xl font-bold text-red-600">₹0.00</p>
                    </div>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card p-6">
                        <h3 class="text-xl font-semibold text-slate-800 mb-4">Expense by Category</h3>
                        <div id="expense-chart-container">
                            <canvas id="expense-chart"></canvas>
                             <div id="expense-chart-empty" class="absolute inset-0 flex items-center justify-center text-slate-500 hidden">No expense data for this period.</div>
                        </div>
                    </div>
                    <div class="card p-6">
                        <h3 class="text-xl font-semibold text-slate-800 mb-4">Expense Trend</h3>
                        <div id="expense-trend-chart-container">
                            <canvas id="expense-trend-chart"></canvas>
                            <div id="expense-trend-chart-empty" class="absolute inset-0 flex items-center justify-center text-slate-500 hidden">Not enough data to show a trend.</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Modals -->
    <!-- Generic Modal Shell -->
    <div id="modal-container" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden modal-backdrop">
        <div id="modal-content" class="w-full max-w-md bg-white rounded-lg shadow-xl p-6 modal-content">
            <!-- Modal content will be injected here by JS -->
        </div>
    </div>
    
    <!-- Chart Tooltip -->
    <div id="chart-tooltip"></div>
`;

