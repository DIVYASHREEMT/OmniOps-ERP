# OmniOps-ERP (Mini ERP System)

OmniOps-ERP is a simple offline-first ERP system built using Flask, MySQL, and vanilla JavaScript.  
The main idea behind this project is to make sure the application still works even when there is no internet, and then syncs data automatically once the connection is back.

This project was built as a learning + placement-focused system to understand real-world concepts like offline storage, syncing, and basic ERP workflows.

---

## 🚀 Features

- **Offline-first system** – works even without internet using IndexedDB  
- **Sync system (Outbox pattern)** – pushes local changes to server when online  
- **Pull sync** – updates local data from server periodically  
- **Dashboard with live KPIs** – revenue, sales count, low stock, customers  
- **Inventory management** – add/edit/delete products  
- **Customer management** – basic CRUD operations  
- **Sales module** – quick checkout with stock update  
- **Offline mode toggle** – used for demo/testing purposes  
- **Simple UI** – built using plain HTML, CSS, and JavaScript (no frameworks)

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask  
- **Database**: MySQL  
- **Frontend**: HTML, CSS, JavaScript  
- **Local Storage**: IndexedDB  

---

## 📦 Requirements

- Python 3.8+
- MySQL installed and running
- Any modern browser (Chrome recommended)

---
