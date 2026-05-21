let onlineMode = true;
let lastSyncTimestamp =
    localStorage.getItem("lastSyncTimestamp")
    || "1970-01-01 00:00:00";
let editingProductId = null;
const statusBtn = document.getElementById("offline-toggle");

function updateNetworkStatus() {
    const statusBtn = document.getElementById("offline-toggle");

    if (!statusBtn) return;
    onlineMode = navigator.onLine;
    if (onlineMode) {
        statusBtn.innerText = "ONLINE";
        statusBtn.className = "btn-online";
        syncPendingData();
    } else {
        statusBtn.innerText = "OFFLINE";
        statusBtn.className = "btn-offline";
    }
}

window.onload = async () => {

    await pullServerChanges();

    loadDashboardScreen();
};
// dashboard
async function loadDashboardScreen() {
    const dashboard = document.querySelector(".dashboard");
    const sales = await getLocalData("sales");
    const products = await getLocalData("products");
    const customers = await getLocalData("customers");
    // calculate daily & total KPIs
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.created_at.startsWith(todayStr));
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_value || 0), 0);
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_value || 0), 0);
    const lowStockProducts = products.filter(p => p.stock_qty < 10);
    const lowStockCount = lowStockProducts.length;
    const lowStockNames = lowStockProducts.map(p => p.name).join(', ');
    // low stock alert 
    let bannerHtml = '';
    if (lowStockCount > 0) {
        bannerHtml = `
            <div style="background-color: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.4); color: #ffc107; padding: 12px 20px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                 Low stock: ${lowStockNames}
            </div>
        `;
    }
    // calculate last 7 days data for the bar chart
    const last7days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let dateStr = d.toISOString().split('T')[0];
        let daySales = sales.filter(s => s.created_at.startsWith(dateStr));
        let dayTotal = daySales.reduce((sum, s) => sum + (s.total_value || 0), 0);
        last7days.push({
            day: dayNames[d.getDay()],
            total: dayTotal
        });
    }
    // find highest revenue in last 7 days
    const maxRevenue = Math.max(...last7days.map(d => d.total), 1); 
    // barchart
    let chartHtml = `
        <div class="card" style="margin-top: 20px;">
            <h4 style="color: #aaa; letter-spacing: 1px; margin-top: 0; margin-bottom: 30px; font-size: 14px; text-transform: uppercase;">Last 7 Days Revenue</h4>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 200px; padding-bottom: 30px; position: relative;">
    `;
    last7days.forEach(item => {
        let heightPct = (item.total / maxRevenue) * 100;
        let showLabel = item.total > 0;
        // formatting
        let valueStr = item.total >= 1000 ? '₹' + (item.total/1000).toFixed(1) + 'k' : '₹' + item.total;
        chartHtml += `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; position: relative;">
                ${showLabel ? `<span style="color: #fff; font-size: 13px; margin-bottom: 8px;">${valueStr}</span>` : ''}
                <div style="background-color: #28a745; width: 45px; border-radius: 4px; height: ${heightPct}%; min-height: ${item.total > 0 ? '4' : '0'}px; transition: height 0.5s ease;"></div>
                <span style="color: #888; position: absolute; bottom: -25px; font-size: 16px;">${item.day}</span>
            </div>
        `;
    });
    chartHtml += `</div></div>`;
    dashboard.innerHTML = `
        ${bannerHtml}
        <div style="display: flex; gap: 20px;">
            <div class="card" style="flex: 1; margin-bottom: 0;">
                <p style="color: #aaa; font-size: 12px; letter-spacing: 1px; margin: 0 0 10px 0; text-transform: uppercase;">Today's Revenue</p>
                <h1 style="color: #28a745; margin: 0; font-size: 36px;">₹${todayRevenue.toFixed(2)}</h1>
                <p style="color: #777; font-size: 13px; margin: 10px 0 0 0;">${todaySales.length} sales today</p>
            </div>
            <div class="card" style="flex: 1; margin-bottom: 0;">
                <p style="color: #aaa; font-size: 12px; letter-spacing: 1px; margin: 0 0 10px 0; text-transform: uppercase;">Total Revenue</p>
                <h1 style="color: #4da6ff; margin: 0; font-size: 36px;">₹${totalRevenue.toFixed(2)}</h1>
                <p style="color: #777; font-size: 13px; margin: 10px 0 0 0;">${sales.length} total sales</p>
            </div>
            <div class="card" style="flex: 1; margin-bottom: 0;">
                <p style="color: #aaa; font-size: 12px; letter-spacing: 1px; margin: 0 0 10px 0; text-transform: uppercase;">Low Stock</p>
                <h1 style="color: #dc3545; margin: 0; font-size: 36px;">${lowStockCount}</h1>
                <p style="color: #777; font-size: 13px; margin: 10px 0 0 0;">items below 10 units</p>
            </div>
            <div class="card" style="flex: 1; margin-bottom: 0;">
                <p style="color: #aaa; font-size: 12px; letter-spacing: 1px; margin: 0 0 10px 0; text-transform: uppercase;">Customers</p>
                <h1 style="color: #ffc107; margin: 0; font-size: 36px;">${customers.length}</h1>
                <p style="color: #777; font-size: 13px; margin: 10px 0 0 0;">registered</p>
            </div>
        </div>
        ${chartHtml}
    `;
}

async function loadProductsScreen() {
    const dashboard = document.querySelector(".dashboard");
    dashboard.innerHTML = `
        <div class="card">
            <h2>Products</h2>
            <div class="product-form">
                <input type="text" id="prod-name" placeholder="Enter product name">
                <input type="number" id="prod-price" placeholder="Enter price">
                <input type="number" id="prod-qty" placeholder="Stock quantity">
                <button class="action-btn" id="add-product-btn">Save Product</button>
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
    document.getElementById("add-product-btn").addEventListener("click", addProduct);
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
                onclick="editProduct('${item.id}')"
                style="background-color:#ffc107; color:black;"
            >
                Edit
            </button>
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
    if (parseFloat(price) < 0) {
        alert("Price cannot be negative");
        return;
    }
    if (parseInt(qty) < 0) {
        alert("Stock cannot be negative");
        return;
    }
    let action = "CREATE";
    let productId = generateUUID();
    if (editingProductId) {
        action = "UPDATE";
        productId = editingProductId;
    }
    const product = {
        id: productId,
        name: name,
        price: parseFloat(price),
        stock_qty: parseInt(qty),
        is_deleted: false
    };
    await saveLocalRecord("products", action, product);
    document.getElementById("prod-name").value = "";
    document.getElementById("prod-price").value = "";
    document.getElementById("prod-qty").value = "";
    editingProductId = null;
    displayProducts();
}
async function editProduct(id) {
    const products = await getLocalData("products");
    const product = products.find(item => item.id === id);
    if (!product) {
        alert("Product not found");
        return;
    }
    document.getElementById("prod-name").value = product.name;
    document.getElementById("prod-price").value = product.price;
    document.getElementById("prod-qty").value = product.stock_qty;
    editingProductId = id;
    document.getElementById("add-product-btn").innerText = "Update Product";
}
async function deleteProduct(id) {
    const item = { id: id };
    await saveLocalRecord("products", "DELETE", item);
    displayProducts();
}

async function loadCustomersScreen() {
    const dashboard = document.querySelector(".dashboard");
    dashboard.innerHTML = `
        <div class="card">
            <h2>Customers</h2>
            <div class="product-form">
                <input type="text" id="cust-name" placeholder="Customer Name">
                <input type="text" id="cust-email" placeholder="Customer Email">
                <button class="action-btn" onclick="addCustomer()">Add Customer</button>
            </div>
            <table>
                <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                <tbody id="customers-body"></tbody>
            </table>
        </div>
    `;
    displayCustomers();
}

async function displayCustomers() {
    const tbody = document.getElementById("customers-body");
    tbody.innerHTML = "";
    const customers = await getLocalData("customers");
    customers.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.email}</td>
                <td><button class="action-btn" style="background-color:#dc3545;" onclick="deleteCustomer('${item.id}')">Delete</button></td>
            </tr>`;
    });
}

async function addCustomer() {
    const name = document.getElementById("cust-name").value.trim();
    const email = document.getElementById("cust-email").value.trim();
    if (!name || !email) return alert("Fill all fields");
    await saveLocalRecord("customers", "CREATE", { id: generateUUID(), name, email, is_deleted: false });
    loadCustomersScreen(); 
}

async function deleteCustomer(id) {
    await saveLocalRecord("customers", "DELETE", { id });
    loadCustomersScreen();
}

async function loadNewSaleScreen() {
    const dashboard = document.querySelector(".dashboard");
    const customers = await getLocalData("customers");
    const products = await getLocalData("products");
    let custOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    let prodOptions = products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (₹${p.price} | Stock: ${p.stock_qty})</option>`).join('');
    dashboard.innerHTML = `
        <div class="card">
            <h2>Fast Checkout</h2>
            <select id="sale-customer"><option value="">Select Customer...</option>${custOptions}</select>
            <select id="sale-product"><option value="">Select Product...</option>${prodOptions}</select>
            <input type="number" id="sale-qty" placeholder="Quantity">
            <button class="action-btn" onclick="completeSimpleSale()" style="background-color: #28a745; width: 100%; font-size: 16px; padding: 12px;">Create Sale</button>
        </div>
    `;
}

async function completeSimpleSale() {
    const custId = document.getElementById("sale-customer").value;
    const prodSelect = document.getElementById("sale-product");
    const prodId = prodSelect.value;
    const price = parseFloat(prodSelect.options[prodSelect.selectedIndex]?.dataset.price || 0);
    const qty = parseInt(document.getElementById("sale-qty").value);
    if (!custId || !prodId || !qty) return alert("Select all fields");
    if (qty <= 0) return alert("Quantity must be greater than 0");
    const products = await getLocalData("products");
    const currentProduct = products.find(p => p.id === prodId);
    if (!currentProduct) return alert("Product not found");
    if (qty > currentProduct.stock_qty) return alert("Not enough stock available");
    const total = price * qty;
    const saleId = generateUUID();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    //sale
    await saveLocalRecord("sales", "CREATE", {
        id: saleId,
        customer_id: custId,
        total_value: total,
        created_at: now,
        updated_at: now,
        is_deleted: false
    });
//sales items
    await saveLocalRecord("sale_items", "CREATE", {
        id: generateUUID(),
        sale_id: saleId,
        product_id: prodId,
        quantity: qty,
        price_at_sale: price,
        updated_at: now,
        is_deleted: false
    });
    currentProduct.stock_qty -= qty;
    await saveLocalRecord("products", "UPDATE", {
        ...currentProduct,
        updated_at: now
    });
    alert("Sale Completed! Total: ₹" + total);
    loadNewSaleScreen();
}

async function loadSalesListScreen() {
    const dashboard = document.querySelector(".dashboard");
    const sales = await getLocalData("sales");
    sales.reverse();
    let rows = sales.map(s => `
        <tr>
            <td>${s.created_at}</td>
            <td>${s.id.substring(0, 8)}...</td>
            <td style="color: #28a745; font-weight: bold;">₹${s.total_value}</td>
        </tr>
    `).join('');
    dashboard.innerHTML = `
        <div class="card">
            <h2>Recent Sales</h2>
            <table>
                <thead><tr><th>Date</th><th>Sale ID</th><th>Total</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

async function syncPendingData() {
    if (!onlineMode) return;
    const db = await initDB();
    const queue = await db.getAll("outbox");
    if (queue.length === 0) return;
    if (!navigator.onLine) return;
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
            const tx =
                db.transaction("outbox", "readwrite");
            for (let item of queue) {
                tx.store.delete(item.id);
            }
            await tx.done;
            console.log("Sync completed successfully");
            await pullServerChanges();
        }
    } catch (err) {
        console.log("Sync error", err);
    }
    statusBtn.classList.remove("syncing");
    statusBtn.innerText = "ONLINE";
}
async function pullServerChanges() {
    try {
        const response =
            await fetch(
                `/sync/pull?since=${encodeURIComponent(lastSyncTimestamp)}`
            );
        const result = await response.json();
        if (result.status !== "success") {
            return;
        }
        const db = await initDB();
        const data = result.data;
        for (let table in data) {
            const records = data[table];
            for (let record of records) {
                await db.put(table, record);
            }
        }
        lastSyncTimestamp = result.timestamp;
        localStorage.setItem(
            "lastSyncTimestamp",
            result.timestamp
        );
        console.log("Pull sync completed");
    } catch (err) {
        console.log("Pull sync failed", err);
    }
}
// Auto sync every 10 sec
setInterval(syncPendingData, 10000);
window.addEventListener("load", () => {
    updateNetworkStatus();
});

window.addEventListener("load", () => {
    updateNetworkStatus();
    setInterval(updateNetworkStatus, 3000);
});
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);