from flask import Flask, jsonify, request, render_template
from db import get_db_connection
app = Flask(__name__)
@app.route('/')
def home():
    return render_template('index.html')
@app.route('/health', methods=['GET'])
def health_check():
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({
            "status": "healthy",
            "database": "connected"
        }), 200
    return jsonify({
        "status": "unhealthy",
        "database": "disconnected"
    }), 500
@app.route('/sync/push', methods=['POST'])
def sync_push():
    data = request.json or {}
    changes = data.get("changes", [])
    if not changes:
        return jsonify({"status": "success", "message": "No changes"}), 200
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    cursor = conn.cursor()
    allowed_tables = ["products", "customers", "sales", "sale_items"]
    try:
        def sort_key(x):
            order = {
                "customers": 0,
                "products": 1,
                "sales": 2,
                "sale_items": 3
            }
            return order.get(x.get("entity_type"), 99)
        changes.sort(key=sort_key)
        for change in changes:
            action = change.get("action")
            table = change.get("entity_type")
            payload = change.get("payload")
            if table not in allowed_tables:
                continue
            if action in ["CREATE", "UPDATE"]:
                columns = ", ".join(payload.keys())
                placeholders = ", ".join(["%s"] * len(payload))
                updates = ", ".join(
                    [f"{k}=VALUES({k})" for k in payload.keys()]
                )
                sql = f"""
                    INSERT INTO {table} ({columns})
                    VALUES ({placeholders})
                    ON DUPLICATE KEY UPDATE {updates}
                """
                cursor.execute(sql, list(payload.values()))
            elif action == "DELETE":
                cursor.execute(
                    f"UPDATE {table} SET is_deleted = TRUE WHERE id = %s",
                    (payload["id"],)
                )
        conn.commit()
        return jsonify({
            "status": "success",
            "processed": len(changes)
        }), 200
    except Exception as e:
        conn.rollback()
        print("SYNC PUSH ERROR:", str(e))
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()
@app.route('/sync/pull', methods=['GET'])
def sync_pull():
    last_sync = request.args.get("since", "1970-01-01 00:00:00")
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error"}), 500
    cursor = conn.cursor(dictionary=True)
    tables = ["products", "customers", "sales", "sale_items"]
    result = {}
    try:
        for table in tables:
            cursor.execute(
                f"SELECT * FROM {table} WHERE updated_at > %s",
                (last_sync,)
            )
            result[table] = cursor.fetchall()
        cursor.execute("SELECT CURRENT_TIMESTAMP as ts")
        server_time = cursor.fetchone()["ts"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify({
            "status": "success",
            "data": result,
            "timestamp": server_time
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()
if __name__ == '__main__':
    app.run(debug=True, port=5000)