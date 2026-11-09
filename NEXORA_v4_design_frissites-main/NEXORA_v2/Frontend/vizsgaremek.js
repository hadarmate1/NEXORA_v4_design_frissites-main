
"use strict";

/*
    NEXORA FRONTEND
    REST API alapú kliensoldali alkalmazás.

    A backend végpontjait az API_BASE változó alatt
    lehet beállítani.
*/

const API_BASE = "http://localhost:3000/api";

const state = {
    products: [],
    components: [],
    orders: [],
    licenses: [],
    topics: [],
    bulkItems: [],
    profile: null,
    user: null,
    editingOrder: null
};

const PAGE_NAMES = {
    dashboard: "Áttekintés",
    catalog: "Termékkatalógus",
    builder: "Gépösszerakó",
    bulk: "Tömeges rendelés",
    licenses: "Licenckezelés",
    price: "Árösszehasonlító",
    forum: "Közösségi fórum",
    orders: "Rendeléseim",
    profile: "Profilom",
    admin: "Adminisztráció"
};


/* =====================================================
   API KEZELÉS
===================================================== */

async function apiRequest(endpoint, options = {}) {
    const config = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("nexora_token") ? { Authorization: `Bearer ${localStorage.getItem("nexora_token")}` } : {}),
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `HTTP ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error(`API hiba (${endpoint}):`, error);
        throw error;
    }
}

async function loadData(endpoint, target, renderFunction) {
    try {
        const result = await apiRequest(endpoint);

        state[target] = Array.isArray(result)
            ? result
            : result?.data || [];

        renderFunction();

    } catch (error) {
        state[target] = [];
        renderFunction();
        if (target === "products") {
            setHTML("productGrid", `<div class="api-empty"><strong>Nem sikerült betölteni a termékeket.</strong><span>${escapeHTML(error.message || "Ellenőrizd a backend és az adatbázis kapcsolatát.")}</span><small>API: ${API_BASE}/products</small></div>`);
        }
    }
}


/* =====================================================
   SEGÉDFÜGGVÉNYEK
===================================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatPrice(value) {
    return new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency: "HUF",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function getValue(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return "";
}

function getProductPrice(product) {
    return Number(getValue(product, "price", "unitPrice")) || 0;
}

function getProductName(product) {
    return getValue(product, "name", "productName", "title") || "Ismeretlen termék";
}

function showNotification(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showNotification.timeout);

    showNotification.timeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function emptyMessage(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function setHTML(elementId, html) {
    const element = document.getElementById(elementId);

    if (element) {
        element.innerHTML = html;
    }
}

function getInitials(name = "Admin User") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("");
}


/* =====================================================
   NAVIGÁCIÓ
===================================================== */

function navigate(pageName) {
    const page = document.getElementById(pageName);
    if (!page) return;
    const protectedPages = ["bulk", "orders", "profile"];
    if (protectedPages.includes(pageName) && !state.user) {
        window.pendingPage = pageName;
        showAuth("login");
        authNotice("Ehhez a funkcióhoz be kell jelentkezned.");
        return;
    }
    if (pageName === "licenses" && state.user?.role !== "admin") {
        showNotification("A licenckezelés adminisztrátori jogosultsághoz kötött.");
        return;
    }
    if (pageName === "admin" && state.user?.role !== "admin") {
        showNotification("Nincs jogosultságod az adminisztrációhoz.");
        return;
    }

    document.querySelectorAll(".page").forEach(item => {
        item.classList.remove("active");
    });

    page.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    document.getElementById("breadcrumbTitle").textContent =
        PAGE_NAMES[pageName] || "NEXORA";

    document.getElementById("sidebar").classList.remove("open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (pageName === "orders") renderOrders();
    if (pageName === "forum") renderForum();
    if (pageName === "licenses") renderLicenses();
    if (pageName === "catalog") renderProducts();
    if (pageName === "admin") renderAdminPanel();
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        navigate(button.dataset.page);
    });
});

document.getElementById("mobileMenu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});


/* =====================================================
   MODAL KEZELÉS
===================================================== */

function openModal(id) {
    document.getElementById(id).classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});


/* =====================================================
   ADATOK BETÖLTÉSE
===================================================== */

async function initializeApp() {
    await restoreSession();
    refreshSystemStatus();
    const tasks = [
        loadData("/products", "products", renderProducts),
        loadData("/components", "components", populateComponents),
        loadData("/forum", "topics", renderForum)
    ];
    if (state.user) {
        tasks.push(loadData("/orders", "orders", renderOrders), loadProfile());
        if (state.user.role === "admin") tasks.push(loadData("/licenses", "licenses", renderLicenses));
    }
    await Promise.allSettled(tasks);
    applyRoleView();
    renderDashboard();
    populateOrderSelect();
}

async function loadProfile() {
    try {
        const result = await apiRequest("/profile");

        state.profile = result;

        renderProfile();

    } catch (error) {
        state.profile = null;
    }
}


/* =====================================================
   DASHBOARD
===================================================== */

function renderDashboard() {
    const activeOrders = state.orders.filter(order => {
        const status = String(order.status || "").toLowerCase();

        return !["completed", "cancelled", "teljesített", "törölt"].includes(status);
    });

    document.getElementById("statOrders").textContent =
        activeOrders.length;

    document.getElementById("statProducts").textContent =
        state.products.length;

    document.getElementById("statLicenses").textContent =
        state.licenses.length;

    document.getElementById("statForum").textContent =
        state.topics.length;

    const recent = state.orders.slice(0, 5);

    if (!recent.length) {
        setHTML("recentOrders", emptyMessage("Még nincsenek rendelési adatok."));
        return;
    }

    setHTML("recentOrders", `
        <table>
            <thead>
                <tr>
                    <th>Rendelés</th>
                    <th>Dátum</th>
                    <th>Összeg</th>
                    <th>Állapot</th>
                </tr>
            </thead>
            <tbody>
                ${recent.map(order => `
                    <tr>
                        <td>#${escapeHTML(order.id)}</td>
                        <td>${escapeHTML(order.date || order.createdAt || order.created_at || "-")}</td>
                        <td>${formatPrice(order.total || order.totalPrice)}</td>
                        <td>${renderStatus(order.status)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `);
}

function renderStatus(status) {
    const value = String(status || "Feldolgozás alatt");
    const normalized = value.toLowerCase();

    let className = "pending";

    if (["completed", "teljesített", "active", "érvényes"].includes(normalized)) {
        className = "";
    }

    if (["expired", "lejárt", "cancelled", "törölt"].includes(normalized)) {
        className = "expired";
    }

    return `<span class="status ${className}">${escapeHTML(value)}</span>`;
}


/* =====================================================
   TERMÉKKATALÓGUS
===================================================== */

function renderProducts() {
    const search = (
        document.getElementById("productSearch")?.value || ""
    ).toLowerCase();

    const category =
        document.getElementById("categoryFilter")?.value || "";

    const sort =
        document.getElementById("sortProducts")?.value || "default";

    let products = [...state.products];

    products = products.filter(product => {
        const name = getProductName(product).toLowerCase();
        const description = String(product.description || "").toLowerCase();
        const searchableSpecs = [product.manufacturer, product.model, product.processor, product.memory, product.storage]
            .join(" ").toLowerCase();
        const productCategory = String(product.category || "");

        const matchesSearch =
            name.includes(search) ||
            description.includes(search) ||
            searchableSpecs.includes(search);

        const matchesCategory =
            !category || productCategory === category;

        return matchesSearch && matchesCategory;
    });

    if (sort === "asc") {
        products.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    }

    if (sort === "desc") {
        products.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    }

    if (!products.length) {
        setHTML("productGrid", emptyMessage("Nem található megfelelő termék."));
        return;
    }

    setHTML("productGrid", products.map(product => `
        <article class="product-card">
            <div class="product-image-wrap">
                <img class="product-image"
                    src="${escapeHTML(product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80")}"
                    alt="${escapeHTML(getProductName(product))}"
                    loading="lazy"
                    onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'">
                <span class="product-category">${escapeHTML(product.category || "Egyéb")}</span>
                <span class="stock-pill ${Number(product.stock || 0) > 0 ? "in-stock" : "out-stock"}">
                    ${Number(product.stock || 0) > 0 ? "Készleten" : "Érdeklődjön"}
                </span>
            </div>

            <div class="product-info">
                <div class="product-brand">${escapeHTML(product.manufacturer || "NEXORA partner")} · ${escapeHTML(product.model || product.sku || "")}</div>
                <h3>${escapeHTML(getProductName(product))}</h3>
                <p>${escapeHTML(product.description || "Vállalati felhasználásra tervezett eszköz.")}</p>

                <div class="product-specs">
                    ${product.processor ? `<span><b>CPU</b>${escapeHTML(product.processor)}</span>` : ""}
                    ${product.memory ? `<span><b>MEMÓRIA</b>${escapeHTML(product.memory)}</span>` : ""}
                    ${product.storage ? `<span><b>TÁRHELY</b>${escapeHTML(product.storage)}</span>` : ""}
                    ${product.graphics ? `<span><b>GRAFIKA</b>${escapeHTML(product.graphics)}</span>` : ""}
                    ${product.display && product.display !== "Nincs" ? `<span><b>KIJELZŐ</b>${escapeHTML(product.display)}</span>` : ""}
                    ${product.warranty_months ? `<span><b>GARANCIA</b>${Number(product.warranty_months)} hónap</span>` : ""}
                </div>

                <div class="product-meta">
                    <span>${escapeHTML(product.form_factor || "Vállalati kivitel")}</span>
                    <span class="product-stock-count">${Number(product.stock || 0)} db</span>
                </div>

                <div class="product-card-bottom">
                    <div class="product-price">${formatPrice(getProductPrice(product))}</div>
                    <button class="primary-button"
                        onclick="addProductToBulk('${escapeHTML(product.id)}')"
                        ${Number(product.stock || 0) <= 0 ? "disabled" : ""}>
                        Hozzáadás <span>↗</span>
                    </button>
                </div>
            </div>
        </article>
    `).join(""));
}

document.getElementById("productSearch").addEventListener("input", renderProducts);
document.getElementById("categoryFilter").addEventListener("change", renderProducts);
document.getElementById("sortProducts").addEventListener("change", renderProducts);


/* =====================================================
   GÉPÖSSZERAKÓ
===================================================== */

const COMPONENT_TYPES = [
    { id: "cpuSelect", type: "cpu", socket: "cpuSocket" },
    { id: "motherboardSelect", type: "motherboard", socket: "boardSocket" },
    { id: "ramSelect", type: "ram", socket: "ramSocket" },
    { id: "gpuSelect", type: "gpu" },
    { id: "storageSelect", type: "storage" },
    { id: "psuSelect", type: "psu" },
    { id: "caseSelect", type: "case" }
];

function populateComponents() {
    COMPONENT_TYPES.forEach(config => {
        const select = document.getElementById(config.id);

        const components = state.components.filter(component => {
            return String(component.type).toLowerCase() === config.type;
        });

        const placeholder = config.type === "gpu"
            ? "Nincs külön videokártya"
            : "Válassz alkatrészt";

        select.innerHTML = `
            <option value="">${placeholder}</option>
            ${components.map(component => `
                <option value="${escapeHTML(component.id)}">
                    ${escapeHTML(component.name)} · ${escapeHTML(component.manufacturer || "")} · ${formatPrice(component.price)}
                </option>
            `).join("")}
        `;
    });

    COMPONENT_TYPES.forEach(config => {
        document.getElementById(config.id).addEventListener(
            "change",
            updateConfiguration
        );
    });
}

function getSelectedComponent(type) {
    const config = COMPONENT_TYPES.find(item => item.type === type);

    if (!config) return null;

    const id = document.getElementById(config.id).value;

    return state.components.find(component =>
        String(component.id) === String(id)
    ) || null;
}

function updateConfiguration() {
    const cpu = getSelectedComponent("cpu");
    const board = getSelectedComponent("motherboard");
    const ram = getSelectedComponent("ram");

    document.getElementById("cpuSocket").textContent =
        cpu?.socket || "Nincs kiválasztva";

    document.getElementById("boardSocket").textContent =
        board?.socket || "Nincs kiválasztva";

    document.getElementById("ramSocket").textContent =
        ram?.ram_type || ram?.ramType || "Nincs kiválasztva";

    const selected = COMPONENT_TYPES.map(config => {
        const id = document.getElementById(config.id).value;

        return state.components.find(component =>
            String(component.id) === String(id)
        );
    }).filter(Boolean);

    const total = selected.reduce((sum, item) => {
        return sum + Number(item.price || 0);
    }, 0);

    const compatibilityIssues = [];
    if (cpu && board && cpu.socket && board.socket && cpu.socket !== board.socket) {
        compatibilityIssues.push(`A processzor (${cpu.socket}) és az alaplap (${board.socket}) foglalata nem egyezik.`);
    }
    if (board && ram && board.ram_type && ram.ram_type && board.ram_type !== ram.ram_type) {
        compatibilityIssues.push(`Az alaplap ${board.ram_type} memóriát támogat, a kiválasztott RAM ${ram.ram_type}.`);
    }

    if (!selected.length) {
        setHTML("configSummary", "Még nincs kiválasztott alkatrész.");
    } else {
        setHTML("configSummary", selected.map(item => `
            <div class="summary-component">
                <img src="${escapeHTML(item.image || "")}"
                     alt="${escapeHTML(item.name)}" loading="lazy">
                <div class="summary-component-copy">
                    <strong>${escapeHTML(item.name)}</strong>
                    <small>${escapeHTML([item.manufacturer, item.capacity, item.speed, item.socket, item.ram_type].filter(Boolean).join(" · "))}</small>
                </div>
                <b>${formatPrice(item.price)}</b>
            </div>
        `).join("") + (compatibilityIssues.length ? `
            <div class="compatibility-warning">
                <strong>Kompatibilitási figyelmeztetés</strong>
                ${compatibilityIssues.map(issue => `<p>${escapeHTML(issue)}</p>`).join("")}
            </div>
        ` : `
            <div class="compatibility-ok">✓ A kiválasztott CPU / alaplap / memória alapellenőrzése rendben.</div>
        `));
    }

    document.getElementById("configTotal").textContent =
        formatPrice(total);
}

document.getElementById("saveConfig").addEventListener("click", () => {
    const name = document.getElementById("configName").value.trim();

    if (!name) {
        showNotification("Adj nevet a konfigurációnak!");
        return;
    }

    const selected = COMPONENT_TYPES.map(config => {
        const id = document.getElementById(config.id).value;

        return state.components.find(component =>
            String(component.id) === String(id)
        );
    }).filter(Boolean);

    if (!selected.length) {
        showNotification("Válassz legalább egy alkatrészt!");
        return;
    }

    const selectedCpu = selected.find(item => item.type === "cpu");
    const selectedBoard = selected.find(item => item.type === "motherboard");
    const selectedRam = selected.find(item => item.type === "ram");
    if (selectedCpu && selectedBoard && selectedCpu.socket && selectedBoard.socket &&
        selectedCpu.socket !== selectedBoard.socket) {
        showNotification("A processzor és az alaplap foglalata nem kompatibilis.");
        return;
    }
    if (selectedBoard && selectedRam && selectedBoard.ram_type && selectedRam.ram_type &&
        selectedBoard.ram_type !== selectedRam.ram_type) {
        showNotification("A kiválasztott memória típusa nem kompatibilis az alaplappal.");
        return;
    }

    const quantity = Number(
        document.getElementById("configQuantity").value
    );

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        showNotification("Adj meg 1 és 1000 közötti darabszámot!");
        return;
    }

    const item = {
        name,
        type: document.getElementById("configType").value,
        quantity,
        components: selected.map(component => component.id),
        price: selected.reduce((sum, component) =>
            sum + Number(component.price || 0), 0)
    };

    state.bulkItems.push(item);

    renderBulkItems();

    showNotification("Konfiguráció hozzáadva a rendeléshez.");

    navigate("bulk");
});


/* =====================================================
   TÖMEGES RENDELÉS
===================================================== */

function addProductToBulk(productId) {
    const product = state.products.find(item =>
        String(item.id) === String(productId)
    );

    if (!product) {
        showNotification("A termék nem található.");
        return;
    }

    state.bulkItems.push({
        name: getProductName(product),
        productId: product.id,
        type: product.category || "Egyéb",
        quantity: 1,
        price: getProductPrice(product),
        licenses: []
    });

    renderBulkItems();

    showNotification("Termék hozzáadva a rendeléshez.");

    navigate("bulk");
}

document.getElementById("addBulkItem").addEventListener("click", () => {
    state.bulkItems.push({
        name: "",
        type: "Laptop",
        quantity: 1,
        price: 0,
        productId: null,
        licenses: []
    });

    renderBulkItems();
});

function renderBulkItems() {
    if (!state.bulkItems.length) {
        setHTML("bulkItems", emptyMessage("Még nincs hozzáadott gépcsoport."));
        updateBulkSummary();
        return;
    }

    setHTML("bulkItems", state.bulkItems.map((item, index) => `
        <div class="bulk-item" data-index="${index}">

            <div class="bulk-item-header">
                <h3>${index + 1}. konfigurációs csoport</h3>
                <button class="remove-item" onclick="removeBulkItem(${index})">
                    ✕ Eltávolítás
                </button>
            </div>

            <div class="bulk-fields">

                <div>
                    <label>Gép / konfiguráció neve</label>
                    <input
                        value="${escapeHTML(item.name)}"
                        placeholder="Pl. Irodai laptop"
                        onchange="updateBulkField(${index}, 'name', this.value)"
                    >
                </div>

                <div>
                    <label>Kategória</label>
                    <select onchange="updateBulkField(${index}, 'type', this.value)">
                        ${["Laptop", "Asztali PC", "Szerver", "Workstation"].map(type => `
                            <option value="${type}" ${item.type === type ? "selected" : ""}>
                                ${type}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div>
                    <label>Darabszám</label>
                    <input
                        type="number"
                        min="1"
                        max="1000"
                        value="${item.quantity}"
                        onchange="updateBulkField(${index}, 'quantity', this.value)"
                    >
                </div>

            </div>

            <div class="bulk-item-footer">
                <span>Egységár: ${formatPrice(item.price)}</span>
                <strong>Részösszeg: ${formatPrice(item.price * item.quantity)}</strong>
            </div>

            <label>Hozzárendelt licencek</label>

            <select multiple size="3"
                onchange="updateBulkLicenses(${index}, this)"
                aria-label="Hozzárendelt licencek">
                ${state.licenses.map(license => `
                    <option value="${escapeHTML(license.id)}"
                        ${(item.licenses || []).some(id => String(id) === String(license.id)) ? "selected" : ""}>
                        ${escapeHTML(license.name || license.productName || "Licenc")}
                    </option>
                `).join("")}
            </select>

        </div>
    `).join(""));

    updateBulkSummary();
}

function updateBulkField(index, field, value) {
    const item = state.bulkItems[index];

    if (!item) return;

    if (field === "quantity") {
        const quantity = Number(value);

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
            showNotification("A mennyiség 1 és 1000 között lehet.");
            renderBulkItems();
            return;
        }

        item.quantity = quantity;
    } else {
        item[field] = value;
    }

    renderBulkItems();
}

function updateBulkLicenses(index, select) {
    state.bulkItems[index].licenses =
        Array.from(select.selectedOptions).map(option => option.value);
}

function removeBulkItem(index) {
    state.bulkItems.splice(index, 1);
    renderBulkItems();
}

function updateBulkSummary() {
    const quantity = state.bulkItems.reduce((sum, item) => {
        return sum + Number(item.quantity || 0);
    }, 0);

    const total = state.bulkItems.reduce((sum, item) => {
        return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);

    document.getElementById("bulkQuantity").textContent =
        `${quantity} db`;

    document.getElementById("bulkTotal").textContent =
        formatPrice(total);
}


/* =====================================================
   RENDELÉS ELLENŐRZÉSE ÉS LEADÁSA
===================================================== */

document.getElementById("submitBulkOrder").addEventListener("click", () => {
    if (!state.bulkItems.length) {
        showNotification("A rendelés üres.");
        return;
    }

    const invalid = state.bulkItems.some(item =>
        !item.name.trim() ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
    );

    if (invalid) {
        showNotification("Ellenőrizd a rendelési tételek adatait!");
        return;
    }

    const quantity = state.bulkItems.reduce((sum, item) =>
        sum + Number(item.quantity), 0);

    const total = state.bulkItems.reduce((sum, item) =>
        sum + Number(item.price) * Number(item.quantity), 0);

    setHTML("orderReview", `
        <div class="summary-line">
            <span>Konfigurációs csoportok</span>
            <strong>${state.bulkItems.length}</strong>
        </div>
        <div class="summary-line">
            <span>Összes gép</span>
            <strong>${quantity} db</strong>
        </div>
        <div class="summary-line">
            <span>Teljes összeg</span>
            <strong>${formatPrice(total)}</strong>
        </div>

        ${state.bulkItems.map(item => `
            <div class="summary-line">
                <span>${escapeHTML(item.name)} × ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join("")}

        <p class="muted-note">
            A rendelés véglegesítése előtt a backend ellenőrzi a megadott licencjogosultságokat.
        </p>
    `);

    openModal("orderModal");
});

document.getElementById("confirmOrder").addEventListener("click", async () => {
    if (!state.user) { closeModal("orderModal"); showAuth("login"); authNotice("Jelentkezz be a rendelés véglegesítéséhez."); return; }
    const button = document.getElementById("confirmOrder");

    button.disabled = true;

    try {
        const result = await apiRequest("/orders", {
            method: "POST",
            body: JSON.stringify({
                items: state.bulkItems.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    type: item.type,
                    quantity: Number(item.quantity),
                    componentIds: item.components || [],
                    licenseIds: item.licenses || []
                }))
            })
        });

        state.bulkItems = [];

        renderBulkItems();
        closeModal("orderModal");

        showNotification(
            `A rendelés sikeresen rögzítve. Azonosító: ${result?.orderId || result?.id || "-"}`
        );

        await loadData("/orders", "orders", renderOrders);

        renderDashboard();
        populateOrderSelect();

    } catch (error) {
        showNotification(
            "A rendelést nem sikerült rögzíteni. Ellenőrizd a backend kapcsolatot!"
        );
    } finally {
        button.disabled = false;
    }
});


/* =====================================================
   LICENCKEZELÉS
===================================================== */

function renderLicenses() {
    const active = state.licenses.filter(item =>
        ["active", "érvényes", "aktív", "aktiv"].includes(
            String(item.status).toLowerCase()
        )
    );

    const expired = state.licenses.filter(item =>
        ["expired", "lejárt"].includes(
            String(item.status).toLowerCase()
        )
    );

    const pending = state.licenses.filter(item =>
        ["pending", "ellenőrzésre vár"].includes(
            String(item.status).toLowerCase()
        )
    );

    document.getElementById("licenseTotal").textContent =
        state.licenses.length;

    document.getElementById("licenseActive").textContent =
        active.length;

    document.getElementById("licenseExpired").textContent =
        expired.length;

    document.getElementById("licensePending").textContent =
        pending.length;

    if (!state.licenses.length) {
        setHTML("licenseList", emptyMessage("Nincsenek elérhető licencadatok."));
        return;
    }

    setHTML("licenseList", `
        <table>
            <thead>
                <tr>
                    <th>Licenc</th>
                    <th>Típus</th>
                    <th>Érvényesség</th>
                    <th>Darabszám</th>
                    <th>Állapot</th>
                </tr>
            </thead>
            <tbody>
                ${state.licenses.map(license => `
                    <tr>
                        <td>${escapeHTML(license.name || license.productName)}</td>
                        <td>${escapeHTML(license.type || "Vállalati")}</td>
                        <td>${escapeHTML(license.expirationDate || license.validUntil || "-")}</td>
                        <td>${Number(license.quantity || 1)}</td>
                        <td>${renderStatus(license.status)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `);
}

function populateOrderSelect() {
    const select = document.getElementById("licenseOrderSelect");

    select.innerHTML = `
        <option value="">Válassz rendelést</option>
        ${state.orders.map(order => `
            <option value="${escapeHTML(order.id)}">
                #${escapeHTML(order.id)} - ${formatPrice(order.total || order.totalPrice)}
            </option>
        `).join("")}
    `;
}

document.getElementById("checkLicenses").addEventListener("click", async () => {
    const orderId = document.getElementById("licenseOrderSelect").value;

    if (!orderId) {
        showNotification("Válassz ki egy rendelést!");
        return;
    }

    try {
        const result = await apiRequest(
            `/licenses/check/${encodeURIComponent(orderId)}`,
            { method: "POST" }
        );

        const valid = Boolean(result.valid);

        setHTML("licenseCheckResult", `
            <div class="license-check-result">
                <strong>${valid ? "✓ A licencek érvényesek" : "⚠ Licencprobléma található"}</strong>
                <p>${escapeHTML(result.message || "Az ellenőrzés befejeződött.")}</p>
                <p>Érvényes: ${Number(result.validCount || 0)}</p>
                <p>Problémás: ${Number(result.invalidCount || 0)}</p>
            </div>
        `);

    } catch (error) {
        showNotification("A licencellenőrzés nem sikerült.");
    }
});


/* =====================================================
   ÁRÖSSZEHASONLÍTÓ
===================================================== */

document.getElementById("searchPrices").addEventListener("click", searchPrices);

document.getElementById("priceSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") searchPrices();
});

async function searchPrices() {
    const query = document.getElementById("priceSearch").value.trim();

    if (!query) {
        showNotification("Írd be a keresett terméket!");
        return;
    }

    setHTML("priceResults", emptyMessage("Ajánlatok keresése..."));

    try {
        const result = await apiRequest(
            `/prices/search?q=${encodeURIComponent(query)}`
        );

        const offers = Array.isArray(result)
            ? result
            : result.offers || result.data || [];

        if (!offers.length) {
            setHTML("priceResults", emptyMessage("Nem található ajánlat."));
            return;
        }

        offers.sort((a, b) => Number(a.price) - Number(b.price));

        setHTML("priceResults", offers.map((offer, index) => `
            <div class="offer-card">

                <div>
                    <h3>${escapeHTML(offer.productName || query)}</h3>
                    <p>Beszállító: ${escapeHTML(offer.supplier || offer.merchant || "Ismeretlen")}</p>
                    <p>${escapeHTML(offer.delivery || "Szállítási információ nem elérhető")}</p>
                    ${index === 0 ? '<span class="status">Legjobb ár</span>' : ""}
                </div>

                <div>
                    <div class="offer-price">${formatPrice(offer.price)}</div>
                    ${offer.url ? `
                        <a href="${escapeHTML(offer.url)}"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="text-button">
                            Ajánlat megtekintése →
                        </a>
                    ` : ""}
                </div>

            </div>
        `).join(""));

    } catch (error) {
        setHTML("priceResults", emptyMessage(
            "Az árösszehasonlító szolgáltatás jelenleg nem érhető el."
        ));
    }
}


/* =====================================================
   FÓRUM
===================================================== */

function renderForum() {
    const search = (
        document.getElementById("forumSearch")?.value || ""
    ).toLowerCase();

    const category =
        document.getElementById("forumCategory")?.value || "";

    const topics = state.topics.filter(topic => {
        const title = String(topic.title || "").toLowerCase();
        const description = String(topic.description || "").toLowerCase();

        return (
            (!search || title.includes(search) || description.includes(search)) &&
            (!category || topic.category === category)
        );
    });

    if (!topics.length) {
        setHTML("forumTopics", emptyMessage("Még nincsenek fórumtémák."));
        return;
    }

    setHTML("forumTopics", topics.map(topic => `
        <article class="forum-topic">

            <div class="topic-top">
                <span class="topic-category">
                    ${escapeHTML(topic.category || "Egyéb")}
                </span>
                <span class="topic-date">
                    ${escapeHTML(topic.createdAt || topic.date || "")}
                </span>
            </div>

            <h3>${escapeHTML(topic.title)}</h3>

            <p>${escapeHTML(topic.description)}</p>

            <div class="topic-bottom">
                <span class="topic-author">
                    Szerző: ${escapeHTML(topic.author || "Felhasználó")}
                </span>

                <span class="topic-replies">
                    ${Number(topic.replyCount || 0)} válasz
                </span>
            </div>

        </article>
    `).join(""));
}

document.getElementById("forumSearch").addEventListener("input", renderForum);
document.getElementById("forumCategory").addEventListener("change", renderForum);

document.getElementById("newTopicButton").addEventListener("click", () => {
    openModal("topicModal");
});

document.getElementById("topicForm").addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("topicTitle").value.trim();
    const category = document.getElementById("topicType").value;
    const description = document.getElementById("topicDescription").value.trim();

    if (!title || !description) {
        showNotification("Töltsd ki az összes kötelező mezőt!");
        return;
    }

    try {
        await apiRequest("/forum", {
            method: "POST",
            body: JSON.stringify({
                title,
                category,
                description
            })
        });

        event.target.reset();

        closeModal("topicModal");

        await loadData("/forum", "topics", renderForum);

        renderDashboard();

        showNotification("A fórumtéma sikeresen közzétéve.");

    } catch (error) {
        showNotification("Nem sikerült közzétenni a fórumtémát.");
    }
});


/* =====================================================
   RENDELÉSEK
===================================================== */

function renderOrders() {
    if (!state.orders.length) {
        setHTML("ordersList", emptyMessage("Még nincsenek rendelések."));
        return;
    }

    setHTML("ordersList", `
        <table>
            <thead>
                <tr>
                    <th>Azonosító</th>
                    <th>Dátum</th>
                    <th>Gépek száma</th>
                    <th>Összeg</th>
                    <th>Állapot</th>
                </tr>
            </thead>

            <tbody>
                ${state.orders.map(order => `
                    <tr>
                        <td>#${escapeHTML(order.id)}</td>
                        <td>${escapeHTML(order.date || order.createdAt || order.created_at || "-")}</td>
                        <td>${Number(order.quantity || order.itemCount || 0)} db</td>
                        <td>${formatPrice(order.total || order.totalPrice)}</td>
                        <td>${renderStatus(order.status)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `);
}


/* =====================================================
   VÁLLALATI PROFIL
===================================================== */

function renderProfile() {
    if (!state.profile) return;

    const profile = state.profile;

    const name = profile.contactName || profile.name || "Admin User";

    document.getElementById("profileName").textContent = name;

    document.getElementById("profileEmail").textContent =
        profile.contactEmail || profile.email || "";

    document.querySelectorAll(".avatar").forEach(element => {
        element.textContent = getInitials(name);
    });

    document.getElementById("companyName").value =
        profile.companyName || "";

    document.getElementById("contactName").value =
        profile.contactName || name;

    document.getElementById("contactEmail").value =
        profile.contactEmail || profile.email || "";

    document.getElementById("taxNumber").value =
        profile.taxNumber || "";

    document.getElementById("companyAddress").value =
        profile.companyAddress || profile.address || "";
}

document.getElementById("saveProfile").addEventListener("click", async () => {
    const profile = {
        companyName: document.getElementById("companyName").value.trim(),
        contactName: document.getElementById("contactName").value.trim(),
        contactEmail: document.getElementById("contactEmail").value.trim(),
        taxNumber: document.getElementById("taxNumber").value.trim(),
        companyAddress: document.getElementById("companyAddress").value.trim()
    };

    if (!profile.companyName || !profile.contactEmail) {
        showNotification("A cégnév és az e-mail cím kötelező.");
        return;
    }

    try {
        const result = await apiRequest("/profile", {
            method: "PUT",
            body: JSON.stringify(profile)
        });

        state.profile = result;

        renderProfile();

        showNotification("A vállalati adatok sikeresen mentve.");

    } catch (error) {
        showNotification("Nem sikerült menteni a profiladatokat.");
    }
});


/* =====================================================
   ALKALMAZÁS INDÍTÁSA
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});


/* =====================================================
   BEJELENTKEZÉS ÉS REGISZTRÁCIÓ
===================================================== */
function authNotice(message, isError = true) {
    const el = document.getElementById("authMessage");
    if (!el) return;
    el.textContent = message;
    el.className = `auth-message ${isError ? "error" : "success"}`;
}

function switchAuthMode(mode) {
    const register = mode === "register";
    document.getElementById("authTitle").textContent = register ? "Fiók létrehozása" : "Bejelentkezés";
    document.getElementById("authSubmit").textContent = register ? "Regisztráció" : "Bejelentkezés";
    ["authNameField", "authCompanyField", "authRoleField"].forEach(id => document.getElementById(id).hidden = !register);
    document.getElementById("adminCodeField").hidden = !register || document.getElementById("authRole").value !== "admin";
    document.getElementById("authSwitchText").textContent = register ? "Már van fiókod?" : "Még nincs fiókod?";
    document.getElementById("authSwitch").textContent = register ? "Bejelentkezés" : "Regisztráció";
    document.getElementById("authForm").dataset.mode = mode;
    authNotice("");
}
function showAuth(mode = "login") { switchAuthMode(mode); document.getElementById("authOverlay").classList.add("visible"); }
function hideAuth() {
    document.getElementById("authOverlay").classList.remove("visible");
    // A megszakított, védett művelet ne induljon el később véletlenül.
    window.pendingPage = null;
}

function applyRoleView() {
    const user = state.user;
    document.getElementById("guestActions").hidden = !!user;
    document.getElementById("signedActions").hidden = !user;
    document.querySelectorAll(".user-mini").forEach(el => el.hidden = !user);
    document.body.classList.toggle("guest-view", !user);
    const systemStatus = document.querySelector(".system-status");
    if (systemStatus) systemStatus.hidden = user?.role !== "admin";
    const dashboardStats = document.querySelector("#dashboard .stats-grid");
    if (dashboardStats) dashboardStats.hidden = !user;
    const metricsHeading = document.getElementById("dashboardMetricsHeading");
    if (metricsHeading) metricsHeading.hidden = !user;
    const privatePanels = document.getElementById("dashboardPrivatePanels");
    if (privatePanels) privatePanels.hidden = !user;
    document.querySelectorAll(".admin-only").forEach(el => el.hidden = user?.role !== "admin");
    document.querySelectorAll('[data-page="orders"], [data-page="profile"], [data-page="bulk"]').forEach(el => el.hidden = !user);
    document.querySelectorAll('[data-page="licenses"]').forEach(el => el.hidden = user?.role !== "admin");
    document.getElementById("roleLabel").textContent = user?.role === "admin" ? "Adminisztrátor" : "Vállalkozói fiók";
    if (user) {
        document.querySelectorAll(".topbar-user span, .user-mini strong").forEach(el => el.textContent = user.name);
        document.querySelectorAll(".avatar").forEach(el => el.textContent = user.name.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase());
    }
}
function setSignedIn(user) {
    state.user = user;
    localStorage.setItem("nexora_user", JSON.stringify(user));
    document.querySelectorAll(".topbar-user span, .user-mini strong").forEach(el => el.textContent = user.name);
    document.querySelectorAll(".avatar").forEach(el => el.textContent = user.name.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase());
    applyRoleView();
    hideAuth();
}
async function restoreSession() {
    const token = localStorage.getItem("nexora_token");
    if (!token) { state.user = null; applyRoleView(); return; }
    try {
        const result = await apiRequest("/auth/me");
        state.user = result.user;
        localStorage.setItem("nexora_user", JSON.stringify(result.user));
    } catch {
        localStorage.removeItem("nexora_token"); localStorage.removeItem("nexora_user"); state.user = null;
    }
    applyRoleView();
}
async function refreshSystemStatus() {
    const status = document.querySelector(".system-status");
    if (!status) return;
    try {
        const result = await apiRequest("/health");
        status.innerHTML = `<span class="status-dot"></span> ${Number(result.products)} termék elérhető`;
        status.title = `${result.components} konfigurátor-alkatrész`;
    } catch { status.innerHTML = `<span class="status-dot offline"></span> Katalógus átmenetileg nem elérhető`; }
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authForm");
    if (!form) return;
    document.getElementById("openLogin").addEventListener("click", () => showAuth("login"));
    document.getElementById("closeAuth").addEventListener("click", hideAuth);
    document.getElementById("authOverlay").addEventListener("click", event => {
        if (event.target.id === "authOverlay") hideAuth();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && document.getElementById("authOverlay").classList.contains("visible")) hideAuth();
    });
    document.getElementById("openRegister").addEventListener("click", () => showAuth("register"));
    document.getElementById("authRole").addEventListener("change", () => { document.getElementById("adminCodeField").hidden = document.getElementById("authRole").value !== "admin"; });
    document.getElementById("authSwitch").addEventListener("click", () => switchAuthMode(form.dataset.mode === "register" ? "login" : "register"));
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const mode = form.dataset.mode || "login";
        const payload = { name: document.getElementById("authName").value.trim(), company: document.getElementById("authCompany").value.trim(), email: document.getElementById("authEmail").value.trim(), password: document.getElementById("authPassword").value, role: document.getElementById("authRole").value, adminCode: document.getElementById("adminCode").value };
        const submit = document.getElementById("authSubmit"); submit.disabled = true;
        try {
            const result = await apiRequest(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
            localStorage.setItem("nexora_token", result.token); setSignedIn(result.user);
            await Promise.allSettled([loadData("/orders", "orders", renderOrders), loadProfile()]);
            if (result.user.role === "admin") await loadData("/licenses", "licenses", renderLicenses);
            const nextPage = window.pendingPage; window.pendingPage = null;
            if (nextPage) navigate(nextPage);
            authNotice(""); showNotification(mode === "register" ? "A fiók elkészült." : "Sikeres bejelentkezés.");
        } catch (error) { let message = error.message || "Nem sikerült csatlakozni a backendhez."; try { message = JSON.parse(message).message || message; } catch {} authNotice(message, true); }
        finally { submit.disabled = false; }
    });
    async function logout() {
        try { await apiRequest("/auth/logout", { method: "POST" }); } catch {}
        localStorage.removeItem("nexora_token"); localStorage.removeItem("nexora_user"); state.user = null; state.orders = []; state.profile = null; applyRoleView(); navigate("dashboard"); showNotification("Sikeresen kijelentkeztél.");
    }
    document.getElementById("logoutButton")?.addEventListener("click", logout);
    document.getElementById("headerLogout")?.addEventListener("click", logout);

    document.getElementById("contactForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const status = document.getElementById("contactFormMessageStatus");
        const payload = { name: document.getElementById("contactFormName").value.trim(), email: document.getElementById("contactFormEmail").value.trim(), subject: document.getElementById("contactFormSubject").value.trim(), message: document.getElementById("contactFormMessage").value.trim() };
        try {
            await apiRequest("/contact", { method: "POST", body: JSON.stringify(payload) });
            status.textContent = "Köszönjük, üzenetedet sikeresen elküldtük."; status.className = "auth-message success"; event.target.reset();
        } catch (error) { let message = error.message || "Az üzenetet nem sikerült elküldeni."; try { message = JSON.parse(message).message || message; } catch {} status.textContent = message; status.className = "auth-message error"; }
    });
});



async function renderAdminPanel() {
  if (state.user?.role !== "admin") return;
  try {
    const [users, messages] = await Promise.all([apiRequest("/admin/users"), apiRequest("/admin/messages")]);
    setHTML("adminUsers", users.map(u => `<div class="admin-row"><strong>${escapeHTML(u.name)}</strong><span>${escapeHTML(u.email)} · ${escapeHTML(u.role)}</span></div>`).join("") || emptyMessage("Nincs felhasználó."));
    setHTML("adminMessages", messages.map(m => `<div class="admin-row"><strong>${escapeHTML(m.subject)}</strong><span>${escapeHTML(m.name)} · ${escapeHTML(m.email)}</span><p>${escapeHTML(m.message)}</p><small>${escapeHTML(m.status)}</small></div>`).join("") || emptyMessage("Még nem érkezett üzenet."));
  } catch (error) { setHTML("adminUsers", emptyMessage("Az admin adatok nem tölthetők be.")); }
}
