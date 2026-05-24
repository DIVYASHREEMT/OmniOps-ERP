import os
import mysql.connector
from mysql.connector import Error

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("MYSQLHOST"),
            database=os.getenv("MYSQLDATABASE"),
            user=os.getenv("MYSQLUSER"),
            password=os.getenv("MYSQLPASSWORD"),
            port=os.getenv("MYSQLPORT")
        )
        return connection
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None
