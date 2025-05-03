const form = document.getElementById("transactionForm");
const tableBody = document.getElementById("transactionTable");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const balance = document.getElementById("balance");
const clearAll = document.getElementById("clearAll");

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Fungsi untuk format mata uang dengan koma (Rp)
const formatCurrency = (value) => {
    return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }).replace(',00', '');
};

const renderTable = () => {
    tableBody.innerHTML = "";
    let income = 0, expense = 0, saldo = 0;

    transactions.forEach((t, i) => {
        income += t.type === "income" ? t.amount : 0;
        expense += t.type === "expense" ? t.amount : 0;
        saldo = income - expense;

        tableBody.innerHTML += `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${t.type === "income" ? formatCurrency(t.amount) : "-"}</td>
                <td>${t.type === "expense" ? formatCurrency(t.amount) : "-"}</td>
                <td>${formatCurrency(saldo)}</td>
                <td>
                    <button class="btn red" onclick="deleteTransaction(${i})">Hapus</button>
                </td>
            </tr>`;
    });

    totalIncome.textContent = formatCurrency(income);
    totalExpense.textContent = formatCurrency(expense);
    balance.textContent = formatCurrency(saldo);

    localStorage.setItem("transactions", JSON.stringify(transactions));
};

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = form.date.value;
    const description = form.description.value;
    const type = form.type.value;
    const amount = parseInt(form.amount.value) || 0;

    transactions.push({ date, description, type, amount });
    form.reset();
    renderTable();
});

// Konfirmasi Hapus Semua Data
clearAll.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data?")) {
        transactions = [];
        localStorage.removeItem("transactions");
        renderTable();
        alert("Semua data telah dihapus.");
    }
});

// Konfirmasi Hapus Transaksi Biasa
const deleteTransaction = (index) => {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        transactions.splice(index, 1);
        renderTable();
        alert("Transaksi berhasil dihapus.");
    }
};

const exportTelegram = document.getElementById("exportTelegram");

exportTelegram.addEventListener("click", () => {
    if (transactions.length === 0) {
        alert("Tidak ada data untuk dikirim.");
        return;
    }

    let message = "*Laporan Keuangan Harian*\n\n";
    let saldo = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t, i) => {
        const pemasukan = t.type === "income" ? t.amount : 0;
        const pengeluaran = t.type === "expense" ? t.amount : 0;
        saldo += pemasukan - pengeluaran;
        totalIncome += pemasukan;
        totalExpense += pengeluaran;

        message += `🗓️ *${t.date}*\n`;
        message += `📝 ${t.description}\n`;
        message += `💵 Pemasukan: ${pemasukan ? formatCurrency(pemasukan) : "-"}\n`;
        message += `🧾 Pengeluaran: ${pengeluaran ? formatCurrency(pengeluaran) : "-"}\n`;
        message += `💰 Saldo: ${formatCurrency(saldo)}\n\n`;
    });

    message += `===============================\n`;
    message += `*Total Pemasukan:* ${formatCurrency(totalIncome)}\n`;
    message += `*Total Pengeluaran:* ${formatCurrency(totalExpense)}\n`;
    message += `*Saldo Akhir:* ${formatCurrency(saldo)}`;

    const BOT_TOKEN = "7544131853:AAFfd_SDdS15lVYuhJtuU5MlzM7-TB8NieY";
    const CHAT_ID = "-4796263519";
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            alert("Laporan berhasil dikirim ke Telegram.");
        } else {
            alert("Gagal mengirim laporan.");
        }
    })
    .catch(error => {
        console.error("Telegram error:", error);
        alert("Terjadi kesalahan saat mengirim.");
    });
});


renderTable();
