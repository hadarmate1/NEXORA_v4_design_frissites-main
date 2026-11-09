
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { db, testConnection } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 3000;

// --------------------------------------------------
// SEGÉDFÜGGVÉNYEK
// --------------------------------------------------

function asyncHandler(callback) {
    return (req, res, next) => {
        Promise.resolve(callback(req, res, next)).catch(next);
    };
}

function isValidId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0;
}

function isValidText(value, maxLength = 180) {
    return (
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= maxLength
    );
}

function parseJson(value) {
    if (Array.isArray(value)) return value;

    try {
        return JSON.parse(value || "[]") || [];
    } catch {
        return [];
    }
}

// --------------------------------------------------
// FELHASZNÁLÓI FIÓKOK / AUTHENTIKÁCIÓ
// --------------------------------------------------

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeUser(row) {
    return { id: row.id, name: row.name, email: row.email, company: row.company || "", role: row.role || "entrepreneur" };
}

async function authenticate(req, res, next) {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Bejelentkezés szükséges." });
    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const [rows] = await db.execute(`SELECT u.id,u.name,u.email,u.company,u.role
            FROM auth_sessions s JOIN users u ON u.id=s.user_id
            WHERE s.token_hash=? AND s.expires_at>NOW() LIMIT 1`, [tokenHash]);
        if (!rows.length) return res.status(401).json({ message: "A munkamenet lejárt." });
        req.user = safeUser(rows[0]);
        next();
    } catch (error) { next(error); }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Ehhez adminisztrátori jogosultság szükséges." });
    next();
}

app.post("/api/auth/register", asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const company = String(req.body.company || "").trim();
    const requestedRole = String(req.body.role || "entrepreneur");
    const adminCode = String(req.body.adminCode || "");
    if (requestedRole === "admin" && (!process.env.ADMIN_REGISTRATION_CODE || adminCode !== process.env.ADMIN_REGISTRATION_CODE)) {
        return res.status(403).json({ message: "Admin fiók csak érvényes adminisztrátori meghívókóddal hozható létre." });
    }
    const role = requestedRole === "admin" ? "admin" : "entrepreneur";
    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: "A név legalább 2, legfeljebb 120 karakter legyen." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Adj meg érvényes e-mail-címet." });
    if (password.length < 8 || password.length > 200) return res.status(400).json({ message: "A jelszó legalább 8 karakter legyen." });
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    try {
        const [result] = await db.execute("INSERT INTO users (name,email,password_hash,password_salt,company,role) VALUES (?,?,?,?,?,?)", [name,email,passwordHash,salt,company,role]);
        const token = crypto.randomBytes(32).toString("hex");
        await db.execute("INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 7 DAY))", [result.insertId, crypto.createHash("sha256").update(token).digest("hex")]);
        res.status(201).json({ success: true, token, user: { id: result.insertId, name, email, company, role } });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Ezzel az e-mail-címmel már létezik fiók." });
        throw error;
    }
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows.length) return res.status(401).json({ message: "Hibás e-mail-cím vagy jelszó." });
    const user = rows[0];
    const actual = Buffer.from(hashPassword(password, user.password_salt), "hex");
    const expected = Buffer.from(user.password_hash, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return res.status(401).json({ message: "Hibás e-mail-cím vagy jelszó." });
    const token = crypto.randomBytes(32).toString("hex");
    await db.execute("INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 7 DAY))", [user.id, crypto.createHash("sha256").update(token).digest("hex")]);
    res.json({ success: true, token, user: safeUser(user) });
}));

app.get("/api/auth/me", asyncHandler(async (req, res) => {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Nincs bejelentkezve." });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await db.execute("SELECT u.id,u.name,u.email,u.company,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() LIMIT 1", [tokenHash]);
    if (!rows.length) return res.status(401).json({ message: "A munkamenet lejárt." });
    res.json({ user: safeUser(rows[0]) });
}));

app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (token) await db.execute("DELETE FROM auth_sessions WHERE token_hash=?", [crypto.createHash("sha256").update(token).digest("hex")]);
    res.json({ success: true });
}));

// --------------------------------------------------
// API ÁLLAPOT
// --------------------------------------------------

app.get("/api/health", asyncHandler(async (req, res) => {
    await db.query("SELECT 1");

    const [[productCount]] = await db.query("SELECT COUNT(*) AS total FROM products");
    const [[componentCount]] = await db.query("SELECT COUNT(*) AS total FROM components");
    res.json({ success: true, message: "A NEXORA API működik!", database: "connected", products: productCount.total, components: componentCount.total });
}));

// --------------------------------------------------
// TERMÉKEK
// --------------------------------------------------

app.get("/api/products", asyncHandler(async (req, res) => {
    const { search, category } = req.query;

    let sql = `
        SELECT *
        FROM products
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        sql += " AND name LIKE ?";
        params.push(`%${search}%`);
    }

    if (category && category !== "all") {
        sql += " AND category = ?";
        params.push(category);
    }

    sql += " ORDER BY created_at DESC";

    const [products] = await db.execute(sql, params);

    res.json(products);
}));

app.get("/api/products/:id", asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            message: "Érvénytelen termékazonosító."
        });
    }

    const [products] = await db.execute(
        "SELECT * FROM products WHERE id = ?",
        [req.params.id]
    );

    if (products.length === 0) {
        return res.status(404).json({
            message: "A termék nem található."
        });
    }

    res.json(products[0]);
}));

// --------------------------------------------------
// KONFIGURÁTOR ALKATRÉSZEK
// --------------------------------------------------

app.get("/api/components", asyncHandler(async (req, res) => {
    const [components] = await db.execute(`
        SELECT *, ram_type AS ramType
        FROM components
        ORDER BY type, name
    `);

    res.json(components);
}));

app.get("/api/components/:type", asyncHandler(async (req, res) => {
    const allowedTypes = [
        "cpu",
        "motherboard",
        "ram",
        "gpu",
        "storage",
        "psu",
        "case"
    ];

    if (!allowedTypes.includes(req.params.type)) {
        return res.status(400).json({
            message: "Ismeretlen alkatrésztípus."
        });
    }

    const [components] = await db.execute(
        "SELECT * FROM components WHERE type = ? ORDER BY name",
        [req.params.type]
    );

    res.json(components);
}));

// --------------------------------------------------
// RENDELÉSEK LEKÉRÉSE
// --------------------------------------------------

app.get("/api/orders", authenticate, asyncHandler(async (req, res) => {
    const [orders] = await db.execute(`
        SELECT
            o.id,
            o.order_number,
            o.company_name,
            o.status,
            o.total,
            o.created_at,
            COALESCE(SUM(oi.quantity), 0) AS quantity,
            COUNT(oi.id) AS itemCount
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE (? = 'admin' OR o.user_id = ?)
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `, [req.user.role, req.user.id]);

    res.json(orders);
}));

app.get("/api/orders/:id", authenticate, asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            message: "Érvénytelen rendelésazonosító."
        });
    }

    const [orders] = await db.execute(
        "SELECT * FROM orders WHERE id = ? AND (? = 'admin' OR user_id = ?)",
        [req.params.id, req.user.role, req.user.id]
    );

    if (orders.length === 0) {
        return res.status(404).json({
            message: "A rendelés nem található."
        });
    }

    const [items] = await db.execute(
        "SELECT * FROM order_items WHERE order_id = ?",
        [req.params.id]
    );

    const formattedItems = items.map(item => ({
        ...item,
        component_ids: parseJson(item.component_ids),
        license_ids: parseJson(item.license_ids)
    }));

    res.json({
        ...orders[0],
        items: formattedItems
    });
}));

// --------------------------------------------------
// ÚJ RENDELÉS
// --------------------------------------------------

app.post("/api/orders", authenticate, asyncHandler(async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "A rendelés legalább egy tételt tartalmazzon."
        });
    }

    if (items.length > 500) {
        return res.status(400).json({
            message: "Túl sok különböző rendelési tétel."
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [profiles] = await connection.execute(
            "SELECT company_name FROM company_profile WHERE id = 1"
        );

        const companyName =
            req.body.companyName ||
            req.user.company || profiles[0]?.company_name ||
            "Nincs megadva";

        const orderNumber =
            "NXR-" +
            Date.now() +
            "-" +
            crypto.randomBytes(3).toString("hex").toUpperCase();

        const [orderResult] = await connection.execute(
            `INSERT INTO orders
                (order_number, company_name, status, total, user_id)
             VALUES (?, ?, ?, 0, ?)`,
            [
                orderNumber,
                companyName,
                "Feldolgozás alatt",
                req.user.id
            ]
        );

        const orderId = orderResult.insertId;
        let orderTotal = 0;

        for (const item of items) {
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 10000
            ) {
                const error = new Error("Érvénytelen rendelési mennyiség.");
                error.status = 400;
                throw error;
            }

            const productId = item.productId
                ? Number(item.productId)
                : null;

            if (
                productId !== null &&
                (!Number.isInteger(productId) || productId <= 0)
            ) {
                const error = new Error("Érvénytelen termékazonosító.");
                error.status = 400;
                throw error;
            }

            let name = isValidText(item.name)
                ? item.name.trim()
                : "Egyedi konfiguráció";

            let unitPrice = 0;

            // Termék árának lekérése az adatbázisból
            if (productId) {
                const [products] = await connection.execute(
                    "SELECT name, price FROM products WHERE id = ?",
                    [productId]
                );

                if (products.length === 0) {
                    const error = new Error("A termék nem található.");
                    error.status = 404;
                    throw error;
                }

                name = products[0].name;
                unitPrice = Number(products[0].price);
            }

            // Konfiguráció alkatrészei
            const componentIds = Array.isArray(item.componentIds)
                ? item.componentIds.map(Number)
                : [];

            if (
                componentIds.some(id =>
                    !Number.isInteger(id) || id <= 0
                )
            ) {
                const error = new Error("Érvénytelen alkatrészazonosító.");
                error.status = 400;
                throw error;
            }

            if (componentIds.length > 0) {
                const placeholders = componentIds.map(() => "?").join(",");

                const [components] = await connection.execute(
                    `SELECT id, price FROM components
                     WHERE id IN (${placeholders})`,
                    componentIds
                );

                if (components.length !== componentIds.length) {
                    const error = new Error(
                        "Egy vagy több alkatrész nem található."
                    );
                    error.status = 400;
                    throw error;
                }

                // Egyedi konfiguráció árának kiszámítása
                if (!productId) {
                    unitPrice = components.reduce(
                        (sum, component) =>
                            sum + Number(component.price),
                        0
                    );
                }
            }

            // Licencek ellenőrzése
            const licenseIds = Array.isArray(item.licenseIds)
                ? item.licenseIds.map(Number)
                : [];

            if (
                licenseIds.some(id =>
                    !Number.isInteger(id) || id <= 0
                )
            ) {
                const error = new Error("Érvénytelen licencazonosító.");
                error.status = 400;
                throw error;
            }

            if (licenseIds.length > 0) {
                const placeholders = licenseIds.map(() => "?").join(",");

                const [licenses] = await connection.execute(
                    `SELECT id, order_id FROM licenses
                     WHERE id IN (${placeholders})`,
                    licenseIds
                );

                if (licenses.length !== licenseIds.length) {
                    const error = new Error("Egy licenc nem található.");
                    error.status = 400;
                    throw error;
                }

                if (licenses.some(license =>
                    license.order_id !== null && Number(license.order_id) !== Number(orderId)
                )) {
                    const error = new Error("Egy kiválasztott licenc már másik rendeléshez tartozik.");
                    error.status = 409;
                    throw error;
                }

                await connection.execute(
                    `UPDATE licenses SET order_id = ?
                     WHERE id IN (${placeholders})`,
                    [orderId, ...licenseIds]
                );
            }

            const lineTotal = unitPrice * quantity;
            orderTotal += lineTotal;

            await connection.execute(
                `INSERT INTO order_items
                    (
                        order_id,
                        product_id,
                        name,
                        type,
                        quantity,
                        component_ids,
                        license_ids,
                        unit_price
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    productId,
                    name,
                    item.type || "computer",
                    quantity,
                    JSON.stringify(componentIds),
                    JSON.stringify(licenseIds),
                    unitPrice
                ]
            );
        }

        await connection.execute(
            "UPDATE orders SET total = ? WHERE id = ?",
            [orderTotal, orderId]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "A rendelés sikeresen létrejött.",
            orderId,
            orderNumber,
            total: orderTotal
        });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

// --------------------------------------------------
// LICENCEK
// --------------------------------------------------

app.get("/api/licenses", authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const [licenses] = await db.execute(`
        SELECT
            l.id,
            l.name,
            l.license_key,
            l.order_id,
            l.status,
            l.valid_until,
            l.created_at,
            o.order_number
        FROM licenses l
        LEFT JOIN orders o ON o.id = l.order_id
        ORDER BY l.created_at DESC
    `);

    res.json(licenses);
}));

app.post(
    "/api/licenses/check/:orderId",
    authenticate, requireAdmin,
    asyncHandler(async (req, res) => {
        const orderId = Number(req.params.orderId);

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                message: "Érvénytelen rendelésazonosító."
            });
        }

        const [orders] = await db.execute(
            "SELECT id FROM orders WHERE id = ?",
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "A rendelés nem található."
            });
        }

        await db.execute(`
            UPDATE licenses
            SET status = CASE
                WHEN valid_until IS NOT NULL
                    AND valid_until < CURRENT_DATE()
                THEN 'Lejárt'
                ELSE 'Aktív'
            END
            WHERE order_id = ?
        `, [orderId]);

        const [licenses] = await db.execute(
            `SELECT id, name, status, valid_until
             FROM licenses
             WHERE order_id = ?`,
            [orderId]
        );

        const validCount = licenses.filter(item =>
            ["aktív", "active", "érvényes", "aktiv"].includes(String(item.status).toLowerCase())
        ).length;
        const invalidCount = licenses.length - validCount;

        res.json({
            success: true,
            valid: invalidCount === 0,
            message: invalidCount === 0
                ? "A rendeléshez tartozó licencek rendben vannak."
                : "A rendeléshez tartozó licencek között lejárt vagy problémás tétel van.",
            checked: licenses.length,
            validCount,
            invalidCount,
            licenses
        });
    })
);

// --------------------------------------------------
// ÁRKERESŐ
// --------------------------------------------------

app.get("/api/prices/search", asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();

    if (query.length < 2) {
        return res.json([]);
    }

    const [offers] = await db.execute(`
        SELECT
            id,
            product_name AS productName,
            merchant,
            price,
            url
        FROM price_offers
        WHERE product_name LIKE ?
        ORDER BY price ASC
        LIMIT 50
    `, [`%${query}%`]);

    res.json(offers);
}));

// --------------------------------------------------
// FÓRUM
// --------------------------------------------------

app.get("/api/forum", asyncHandler(async (req, res) => {
    const [topics] = await db.execute(`
        SELECT
            id,
            title,
            category,
            description,
            author,
            replies,
            created_at
        FROM forum_topics
        ORDER BY created_at DESC
    `);

    res.json(topics);
}));

app.post("/api/forum", authenticate, asyncHandler(async (req, res) => {
    const { title, category, description } = req.body;

    if (!isValidText(title, 220)) {
        return res.status(400).json({
            message: "Adj meg egy érvényes címet."
        });
    }

    if (!isValidText(category, 100)) {
        return res.status(400).json({
            message: "Adj meg egy érvényes kategóriát."
        });
    }

    if (!isValidText(description, 10000)) {
        return res.status(400).json({
            message: "A leírás nem lehet üres."
        });
    }

    const [result] = await db.execute(
        `INSERT INTO forum_topics
            (title, category, description)
         VALUES (?, ?, ?)`,
        [
            title.trim(),
            category.trim(),
            description.trim()
        ]
    );

    res.status(201).json({
        success: true,
        message: "A fórumtéma sikeresen létrejött.",
        id: result.insertId
    });
}));

// --------------------------------------------------
// CÉGES PROFIL
// --------------------------------------------------

app.get("/api/profile", authenticate, asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT u.company AS companyName, u.name AS contactName, u.email AS accountEmail,
               COALESCE(p.contact_email, u.email) AS contactEmail,
               COALESCE(p.tax_number, '') AS taxNumber,
               COALESCE(p.company_address, '') AS companyAddress
        FROM users u LEFT JOIN user_company_profiles p ON p.user_id=u.id
        WHERE u.id=? LIMIT 1
    `, [req.user.id]);
    res.json(rows[0] || {});
}));

app.put("/api/profile", authenticate, asyncHandler(async (req, res) => {
    const companyName = String(req.body.companyName || "").trim().slice(0,180);
    const contactName = String(req.body.contactName || "").trim().slice(0,120);
    const contactEmail = String(req.body.contactEmail || "").trim().toLowerCase().slice(0,190);
    const taxNumber = String(req.body.taxNumber || "").trim().slice(0,80);
    const companyAddress = String(req.body.companyAddress || "").trim().slice(0,255);
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ message: "Érvénytelen e-mail-cím." });
    await db.execute("UPDATE users SET name=?, company=? WHERE id=?", [contactName || req.user.name, companyName, req.user.id]);
    await db.execute(`INSERT INTO user_company_profiles (user_id,contact_email,tax_number,company_address)
        VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE contact_email=VALUES(contact_email),tax_number=VALUES(tax_number),company_address=VALUES(company_address)`,
        [req.user.id, contactEmail || req.user.email, taxNumber, companyAddress]);
    res.json({ success:true, message:"A céges profil mentése sikeres.", companyName, contactName, contactEmail, taxNumber, companyAddress });
}));

// --------------------------------------------------
// HIBAKEZELÉS
// --------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "A kért API-végpont nem található."
    });
});

app.use((error, req, res, next) => {
    console.error("Backend hiba:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(error.status || 500).json({
        success: false,
        message: error.status
            ? error.message
            : "Szerverhiba történt."
    });
});

// --------------------------------------------------
// SZERVER INDÍTÁSA
// --------------------------------------------------

async function startServer() {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log("--------------------------------");
            console.log(" NEXORA BACKEND ELINDULT");
            console.log(` http://localhost:${PORT}`);
            console.log(` http://localhost:${PORT}/api/health`);
            console.log("--------------------------------");
        });

    } catch (error) {
        console.error(
            "Nem sikerült elindítani a backendet:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
