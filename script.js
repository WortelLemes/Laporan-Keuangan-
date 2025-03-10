const form = document.getElementById("transactionForm");
const tableBody = document.getElementById("transactionTable");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const balance = document.getElementById("balance");
const clearAll = document.getElementById("clearAll");

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

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
                <td>${t.type === "income" ? t.amount : "-"}</td>
                <td>${t.type === "expense" ? t.amount : "-"}</td>
                <td>${saldo}</td>
                <td><button class="btn red" onclick="deleteTransaction(${i})">Hapus</button></td>
            </tr>`;
    });

    totalIncome.textContent = income;
    totalExpense.textContent = expense;
    balance.textContent = saldo;

    localStorage.setItem("transactions", JSON.stringify(transactions));
};

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = form.date.value;
    const description = form.description.value;
    const type = form.type.value;
    const amount = parseInt(form.amount.value);

    transactions.push({ date, description, type, amount });
    form.reset();
    renderTable();
});

clearAll.addEventListener("click", () => {
    transactions = [];
    renderTable();
});

const deleteTransaction = (index) => {
    transactions.splice(index, 1);
    renderTable();
};

renderTable();