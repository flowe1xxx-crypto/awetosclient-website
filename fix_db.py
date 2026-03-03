import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'database.db')
conn = sqlite3.connect(db_path)
conn.execute('DROP TABLE IF EXISTS keys')
conn.commit()
conn.close()

from app import init_db
init_db()
print("Database schema successfully recreated!")
