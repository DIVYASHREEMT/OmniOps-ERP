from flask import Flask, jsonify
from db import get_db_connection
app = Flask(__name__)
@app.route('/health', methods=['GET'])
def health_check():
    #Simple endpoint to check backend is running and db is connected
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"}), 200
    else:
        return jsonify({"status": "unhealthy", "database": "disconnected"}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)
