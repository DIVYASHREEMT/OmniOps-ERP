let onlineMode = true;
const statusBtn = document.getElementById("offline-toggle");
statusBtn.addEventListener("click", () => {
    onlineMode = !onlineMode;
    if (onlineMode) {
        statusBtn.innerText = "ONLINE";
        statusBtn.className = "btn-online";
        // syncing when back online
        syncPendingData();
    } else {
        statusBtn.innerText = "OFFLINE";
        statusBtn.className = "btn-offline";
    }
});
async function loadDashboard() {
    const dashboard = document.querySelector(".dashboard");
    dashboard.innerHTML = `
        <div class="card">

            <h2>Products</h2>

            <div class="product-form">
                <input type="text" id="prod-name" placeholder="Enter product name">

                <input type="number" id="prod-price" placeholder="Enter price">

                <input type="number" id="prod-qty" placeholder="Stock quantity">

                <button class="action-btn" id="add-product-btn">
                    Add Product
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody id="products-body">

                </tbody>
            </table>

        </div>
    `;
    document
        .getElementById("add-product-btn")
        .addEventListener("click", addProduct);
    displayProducts();
}
async function displayProducts() {
    const tbody = document.getElementById("products-body");
    tbody.innerHTML = "";
    const products = await getLocalData("products");
    products.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>₹${item.price}</td>
            <td>${item.stock_qty}</td>
            <td>
                <button 
                    class="action-btn"
                    onclick="deleteProduct('${item.id}')"
                    style="background-color:#dc3545;"
                >
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}
async function addProduct() {
    const name = document.getElementById("prod-name").value.trim();
    const price = document.getElementById("prod-price").value;
    const qty = document.getElementById("prod-qty").value;
    if (name === "" || price === "" || qty === "") {
        alert("Please enter all fields");
        return;
    }
    if (parseInt(qty) < 0) {
        alert("Stock cannot be negative");
        return;
    }
    const product = {
        id: generateUUID(),
        name: name,
        price: parseFloat(price),
        stock_qty: parseInt(qty),
        is_deleted: false
    };
    await saveLocalRecord("products", "CREATE", product);
    document.getElementById("prod-name").value = "";
    document.getElementById("prod-price").value = "";
    document.getElementById("prod-qty").value = "";
    displayProducts();
}
async function deleteProduct(id) {

    const item = {
        id: id
    };
    await saveLocalRecord("products", "DELETE", item);
    displayProducts();
}
async function syncPendingData() {
    if (!onlineMode) return;
    const db = await initDB();
    const queue = await db.getAll("outbox");
    if (queue.length === 0) return;
    statusBtn.classList.add("syncing");
    statusBtn.innerText = "SYNCING";
    try {
        const response = await fetch("/sync/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                changes: queue
            })
        });
        const result = await response.json();
        if (result.status === "success") {
            await db.clear("outbox");
            console.log("Sync completed");
        }
    } catch (err) {
        console.log("Sync error", err);
    }
    statusBtn.classList.remove("syncing");
    statusBtn.innerText = "ONLINE";
}
// auto sync every 10 sec
setInterval(syncPendingData, 10000);
window.onload = () => {
    loadDashboard();
};