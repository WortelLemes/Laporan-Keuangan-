// Global Variables
let transactions = []; // Data akan dimuat dari Firestore
let currentEditId = null;

// Akses ke variabel global 'db' diasumsikan sudah diinisialisasi di HTML

/**
 * INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', function() {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
    document.getElementById('daily-date').value = today;
    document.getElementById('monthly-date').value = new Date().toISOString().slice(0, 7);
    
    // Inisialisasi input weekly (memerlukan fungsi helper)
    try {
        document.getElementById('weekly-date').value = getWeekString(new Date());
    } catch(e) {
        console.warn("Browser tidak mendukung input type='week' atau fungsi getWeekString bermasalah.");
    }
    
    
    // Load data
    loadTransactionsFromFirestore();
    
    // Event listeners
    document.getElementById('transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('edit-form').addEventListener('submit', handleEditTransaction);
    // Menggunakan displayTransactions sebagai handler filter
    document.getElementById('search-input').addEventListener('input', displayTransactions); 
    document.getElementById('filter-type').addEventListener('change', displayTransactions);
    document.getElementById('daily-date').addEventListener('change', updateDailyReport);
    document.getElementById('weekly-date').addEventListener('change', updateWeeklyReport);
    document.getElementById('monthly-date').addEventListener('change', updateMonthlyReport);

    // Close modals when clicking outside
    document.getElementById('edit-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });

    // Tambahkan event listener untuk modal konfirmasi
    if (document.getElementById('confirm-modal')) {
        document.getElementById('confirm-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeConfirmModal();
            }
        });
    }

    // Tampilkan dashboard saat aplikasi dimuat
    showSection('dashboard');
});

/**
 * FIREBASE FUNCTIONS (CRUD)
 */

// READ: Load transactions from Firestore
async function loadTransactionsFromFirestore() {
    try {
        // Query dengan urutan tanggal terbaru
        const querySnapshot = await db.collection("transactions")
                                      .orderBy("date", "desc") 
                                      .get();
        
        transactions = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                // Gunakan Number() untuk konversi yang konsisten.
                amount: Number(data.amount) 
            });
        });

        // Perbarui tampilan setelah data dimuat
        updateDashboard();
        displayTransactions();
        updateReports();

    } catch (error) {
        console.error("Error loading transactions: ", error);
        showNotification('Gagal memuat data dari server. Cek koneksi & aturan Firebase.', 'error');
    }
}

// CREATE: Add transaction to Firestore
async function handleAddTransaction(e) {
    e.preventDefault();
    
    const amountValue = document.getElementById('transaction-amount').value;
    const amount = Number(amountValue);

    if (isNaN(amount) || amount <= 0) {
        showNotification('Jumlah harus lebih besar dari 0!', 'error');
        return;
    }

    const newTransaction = {
        type: document.getElementById('transaction-type').value,
        amount: amount, // Disimpan sebagai Number
        category: document.getElementById('transaction-category').value,
        description: document.getElementById('transaction-description').value,
        date: document.getElementById('transaction-date').value
    };
    
    try {
        // Simpan ke Firestore
        await db.collection("transactions").add(newTransaction);
        
        // Muat ulang data
        await loadTransactionsFromFirestore(); 

        // Reset form
        document.getElementById('transaction-form').reset();
        document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        
        showNotification('Transaksi berhasil ditambahkan!', 'success');
        showSection('dashboard'); // Kembali ke dashboard
    } catch (error) {
        console.error("Error adding document: ", error);
        showNotification('Gagal menyimpan transaksi. Cek Konsol Browser.', 'error');
    }
}

// UPDATE: Handle transaction edit save
async function handleEditTransaction(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value; 
    
    const amount = Number(document.getElementById('edit-amount').value);
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Jumlah harus lebih besar dari 0!', 'error');
        return;
    }
    
    const updatedTransaction = {
        type: document.getElementById('edit-type').value,
        amount: amount,
        category: document.getElementById('edit-category').value,
        description: document.getElementById('edit-description').value,
        date: document.getElementById('edit-date').value
    };

    try {
        // Update di Firestore
        await db.collection("transactions").doc(id).update(updatedTransaction);
        
        // Muat ulang data dan tutup modal
        await loadTransactionsFromFirestore(); 
        closeEditModal();
        showNotification('Transaksi berhasil diperbarui!', 'success');

    } catch (error) {
        console.error("Error updating document: ", error);
        showNotification('Gagal memperbarui transaksi.', 'error');
    }
}

// DELETE: Delete transaction from Firestore (Dipanggil dari modal konfirmasi)
async function confirmAndDeleteTransaction(id) {
    closeConfirmModal(); // Tutup modal konfirmasi
    
    try {
        // Hapus di Firestore
        await db.collection("transactions").doc(id).delete();

        // Muat ulang data
        await loadTransactionsFromFirestore();
        showNotification('Transaksi berhasil dihapus!', 'success');

    } catch (error) {
        console.error("Error removing document: ", error);
        showNotification('Gagal menghapus transaksi.', 'error');
    }
}

/**
 * UI & REPORTING FUNCTIONS
 */

// Navigation function
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('fade-in');
    });

    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
    }


    document.querySelectorAll('button[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    const activeBtn = document.getElementById('btn-' + sectionName);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('bg-blue-600', 'text-white');
    }
}

// Update dashboard summary
function updateDashboard() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    document.getElementById('current-balance').textContent = formatCurrency(balance);
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expense').textContent = formatCurrency(totalExpense);

    // Update recent transactions (5 newest)
    const recentTransactions = transactions.slice(0, 5); 
    const recentContainer = document.getElementById('recent-transactions');

    if (recentTransactions.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Belum ada transaksi</p>';
    } else {
        recentContainer.innerHTML = recentTransactions.map(transaction => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                        ${transaction.type === 'income' ? '<svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M22 22H12C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12V9M2 2V5" stroke="#0090ff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M19.0002 7L15.8821 10.9264C15.4045 11.5278 15.1657 11.8286 14.8916 11.9751C14.47 12.2005 13.9663 12.2114 13.5354 12.0046C13.2551 11.8701 13.0035 11.5801 12.5002 11C11.9968 10.4199 11.7452 10.1299 11.4649 9.99535C11.034 9.78855 10.5303 9.7995 10.1088 10.0248C9.83461 10.1714 9.5958 10.4721 9.11819 11.0735L6 15" stroke="#0090ff" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>' : '<svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M19.0002 15L15.8821 11.0736C15.4045 10.4722 15.1657 10.1714 14.8916 10.0249C14.47 9.79953 13.9663 9.78857 13.5354 9.99537C13.2551 10.1299 13.0035 10.4199 12.5002 11C11.9968 11.5801 11.7452 11.8701 11.4649 12.0046C11.034 12.2115 10.5303 12.2005 10.1088 11.9752C9.83461 11.8286 9.5958 11.5279 9.11819 10.9265L6 7" stroke="#ff1717" stroke-width="1.5" stroke-linecap="round"></path> <path d="M22 22H12C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12V9M2 2V5" stroke="#ff1717" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>'}
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${transaction.description}</p>
                        <p class="text-sm text-gray-500">${formatDate(transaction.date)} • ${getCategoryName(transaction.category)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </p>
                </div>
            </div>
        `).join('');
    }
}

// Display transactions (History)
function displayTransactions() {
    const container = document.getElementById('transactions-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;

    let filteredTransactions = transactions;

    // Apply filters
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm) || 
            getCategoryName(t.category).toLowerCase().includes(searchTerm)
        );
    }

    if (filterType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
    }

    if (filteredTransactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Tidak ada transaksi yang ditemukan</p>';
        return;
    }

    container.innerHTML = filteredTransactions.map(transaction => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                    ${transaction.type === 'income' ? '<svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M22 22H12C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12V9M2 2V5" stroke="#0090ff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M19.0002 7L15.8821 10.9264C15.4045 11.5278 15.1657 11.8286 14.8916 11.9751C14.47 12.2005 13.9663 12.2114 13.5354 12.0046C13.2551 11.8701 13.0035 11.5801 12.5002 11C11.9968 10.4199 11.7452 10.1299 11.4649 9.99535C11.034 9.78855 10.5303 9.7995 10.1088 10.0248C9.83461 10.1714 9.5958 10.4721 9.11819 11.0735L6 15" stroke="#0090ff" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>' : '<svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M19.0002 15L15.8821 11.0736C15.4045 10.4722 15.1657 10.1714 14.8916 10.0249C14.47 9.79953 13.9663 9.78857 13.5354 9.99537C13.2551 10.1299 13.0035 10.4199 12.5002 11C11.9968 11.5801 11.7452 11.8701 11.4649 12.0046C11.034 12.2115 10.5303 12.2005 10.1088 11.9752C9.83461 11.8286 9.5958 11.5279 9.11819 10.9265L6 7" stroke="#ff1717" stroke-width="1.5" stroke-linecap="round"></path> <path d="M22 22H12C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12V9M2 2V5" stroke="#ff1717" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>'}
                </div>
                <div>
                    <p class="font-medium text-gray-800">${transaction.description}</p>
                    <p class="text-sm text-gray-500">${formatDate(transaction.date)} • ${getCategoryName(transaction.category)}</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right">
                    <p class="font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </p>
                </div>
                <div class="flex flex-col space-y-2"> 
                    <button onclick="editTransaction('${transaction.id}')" class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"> <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5 15L4 16V20H8L14 14M18 10L21 7L17 3L14 6M18 10L17 11M18 10L14 6M14 6L7.5 12.5" stroke="#ffffff" stroke-width="1.224" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg> </button>
                    <button onclick="openConfirmModal('${transaction.id}')" class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"> <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M20.5 6H3.49988" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M9.5 11L10 16" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M14.5 11L14 16" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> </g></svg> </button>
                </div>
                </div>
        </div>
    `).join('');
}

// Open Edit Modal
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    document.getElementById('edit-id').value = id; 
    document.getElementById('edit-type').value = transaction.type;
    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-description').value = transaction.description;
    document.getElementById('edit-date').value = transaction.date;

    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
}

// Close Edit Modal
function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-modal').classList.remove('flex');
}

// Open Confirm Modal
function openConfirmModal(id) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return; // Pastikan modal ada
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Set event listener untuk tombol konfirmasi di modal
    const confirmButton = document.getElementById('confirm-delete-button');
    // Hapus listener sebelumnya agar tidak terduplikasi
    confirmButton.onclick = null; 
    // Set listener baru dengan ID transaksi yang akan dihapus
    confirmButton.onclick = () => confirmAndDeleteTransaction(id);
}

// Close Confirm Modal
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Update all reports
function updateReports() {
    updateDailyReport();
    updateWeeklyReport();
    updateMonthlyReport();
}

function updateDailyReport() {
    const selectedDate = document.getElementById('daily-date').value;
    const dayTransactions = transactions.filter(t => t.date === selectedDate);
    
    const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('daily-income').textContent = formatCurrency(income);
    document.getElementById('daily-expense').textContent = formatCurrency(expense);
    document.getElementById('daily-balance').textContent = formatCurrency(income - expense);
}

function updateWeeklyReport() {
    const selectedWeek = document.getElementById('weekly-date').value;
    if (!selectedWeek || !selectedWeek.includes('-W')) return;
    
    const [year, weekStr] = selectedWeek.split('-W');
    const week = Number(weekStr);
    const yearNum = Number(year);
    
    const weekStart = getDateOfWeek(week, yearNum);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter(t => {
        // Atasi masalah zona waktu dengan menambahkan 'T00:00:00'
        const transactionDate = new Date(t.date + 'T00:00:00'); 
        
        return transactionDate >= weekStart && transactionDate <= weekEnd;
    });

    const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('weekly-income').textContent = formatCurrency(income);
    document.getElementById('weekly-expense').textContent = formatCurrency(expense);
    document.getElementById('weekly-balance').textContent = formatCurrency(income - expense);
}

function updateMonthlyReport() {
    const selectedMonth = document.getElementById('monthly-date').value;
    if (!selectedMonth || !selectedMonth.includes('-')) return;

    const [year, month] = selectedMonth.split('-');
    
    const monthTransactions = transactions.filter(t => {
        // Menggunakan perbandingan string untuk filter bulan
        return t.date.startsWith(`${year}-${month}`);
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('monthly-income').textContent = formatCurrency(income);
    document.getElementById('monthly-expense').textContent = formatCurrency(expense);
    document.getElementById('monthly-balance').textContent = formatCurrency(income - expense);
}

/**
 * UTILITY FUNCTIONS
 */

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00'); 
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function getCategoryName(category) {
    const categories = {
        'makanan': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'belanja': 'Belanja',
        'hiburan': 'Hiburan',
        'kesehatan': 'Kesehatan',
        'gaji': 'Gaji',
        'bonus': 'Bonus',
        'lainnya': 'Lainnya'
    };
    return categories[category] || category;
}

// Weekly date calculation helpers
function getWeekString(date) {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; 
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); 
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateOfWeek(week, year) {
    const d = new Date(year, 0, 1);
    let dayNum = d.getDay(); 
    if (dayNum === 0) dayNum = 7; 
    
    const offset = 4 - dayNum;
    d.setDate(d.getDate() + offset); 
    d.setDate(d.getDate() + (week - 1) * 7);
    d.setDate(d.getDate() - 3); // Kembali ke hari Senin
    d.setHours(0, 0, 0, 0);

    return d;
}

// Notification function
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 transition-all duration-300 transform ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} opacity-0 translate-y-[-10px]`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-y-[-10px]');
        notification.classList.add('opacity-100', 'translate-y-0');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('opacity-100', 'translate-y-0');
        notification.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => notification.remove(), 300); 
    }, 3000);
}

// Ekspor fungsi global agar dapat diakses oleh tombol/elemen HTML
window.showSection = showSection;
window.editTransaction = editTransaction;
window.openConfirmModal = openConfirmModal; 
window.closeEditModal = closeEditModal;
window.closeConfirmModal = closeConfirmModal;
window.confirmAndDeleteTransaction = confirmAndDeleteTransaction;
