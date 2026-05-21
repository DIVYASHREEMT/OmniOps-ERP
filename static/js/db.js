import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';
const dbName = "omniops_local_db";
const version = 1;
async function initDB() {
    const db = await openDB(dbName, version, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("products")) {
                db.createObjectStore("products", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("customers")) {
                db.createObjectStore("customers", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("sales")) {
                db.createObjectStore("sales", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("sale_items")) {
                db.createObjectStore("sale_items", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("outbox")) {
                db.createObjectStore("outbox", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        }
    });
    console.log("DB ready");
    return db;
}
async function getLocalData(store) {
    const db = await initDB();
    const data = await db.getAll(store);
    return data.filter(item =>
        item.is_deleted !== 1 && item.is_deleted !== true
    );
}
function generateUUID() {
    return crypto.randomUUID();
}
async function addToOutbox(type, action, payload) {
    const db = await initDB();
    await db.add("outbox", {
        entity_type: type,
        action: action,
        payload: payload,
        timestamp: new Date().toISOString()
    });
}
async function saveLocalRecord(store, action, record) {
    const db = await initDB();
    if (!record.id) {
        record.id = generateUUID();
    }
    record.updated_at =
        new Date().toISOString().slice(0, 19).replace("T", " ");
    if (action === "DELETE") {
        record.is_deleted = true;
    }
    await db.put(store, record);
    await addToOutbox(store, action, record);
}
window.initDB = initDB;
window.getLocalData = getLocalData;
window.generateUUID = generateUUID;
window.addToOutbox = addToOutbox;
window.saveLocalRecord = saveLocalRecord;
initDB();