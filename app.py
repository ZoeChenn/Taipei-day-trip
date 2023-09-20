import jwt
import json
import os, re
import datetime
import traceback
import mysql.connector
from dotenv import load_dotenv
from mysql.connector import pooling
from flask import *
app=Flask(
  __name__, 
  static_folder = 'static',
)
app.config["JSON_AS_ASCII"]=False
app.config["TEMPLATES_AUTO_RELOAD"]=True

# 載入環境變數配置文件
load_dotenv()

# 使用 os.getenv() 讀取環境變數
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")

# 建立並設定連接池
pool = pooling.MySQLConnectionPool(
  pool_name = "myPool",  # 連接池名稱
  pool_size = 10,  # 連接池大小
  user = DB_USER,
  password = DB_PASSWORD,
  host = DB_HOST,
  database = DB_NAME,
)

# 設定 Session 密鑰
app.secret_key = SECRET_KEY

# 建立連線
def getConn():
  conn = pool.get_connection()
  cursor = conn.cursor()
  return conn, cursor

# 關閉連線
def dispose(cursor, conn):
  cursor.close()
  conn.close()

# Pages
@app.route("/")
def index():
  return render_template("index.html")
@app.route("/attraction/<id>")
def attraction(id):
  return render_template("attraction.html")
@app.route("/booking")
def booking():
  return render_template("booking.html")
@app.route("/thankyou")
def thankyou():
  return render_template("thankyou.html")

# 完全比對捷運站名稱 or 模糊比對景點名稱的關鍵字
def find_mrt_or_attraction(keyword, page):
  conn, cursor = getConn()
  params = (keyword, "%" + keyword + "%")
  cursor.execute("SELECT COUNT(*) FROM attractions WHERE mrt = %s OR name LIKE %s", params )
  resultsNum = cursor.fetchone()[0]
  query = "SELECT * FROM attractions WHERE mrt = %s OR name LIKE %s"
  offset = page * 12
  cursor.execute(query + " LIMIT 12 OFFSET %s", params + (offset,))
  results = cursor.fetchall()
  dispose(cursor, conn)
  return results , resultsNum

# 檢查帳號是否重複
def check_account(email):
  conn, cursor = getConn()
  cursor.execute("SELECT * FROM member WHERE username = %s", (email,))
  result = cursor.fetchone()
  dispose(cursor, conn)
  return result is not None

# 檢查帳號密碼是否吻合已註冊之會員資料
def check_member(email, password):
  conn, cursor = getConn()
  cursor.execute("SELECT * FROM member WHERE (username, password) = (%s, %s)", (email, password))
  result = cursor.fetchone()
  dispose(cursor, conn)
  return result

# 確認會員資訊
def get_member_info(id):
  conn, cursor = getConn()
  cursor.execute("SELECT * FROM member WHERE id = %s", (id, ))
  result = cursor.fetchone()
  dispose(cursor, conn)
  return result

# 新增帳號到資料庫
def add_account(name, email, password):
  conn, cursor = getConn()
  cursor.execute("INSERT INTO member (name, username, password) VALUES (%s, %s, %s)", (name, email, password))
  conn.commit()
  dispose(cursor, conn)

# 取得景點資料列表
@app.route("/api/attractions", methods=['GET'])
def api_attractions():
  try:
    page = int(request.args.get('page', 0))
    keyword = request.args.get('keyword', '')
    
    if keyword:
      results, resultsNum = find_mrt_or_attraction(keyword, page)
    else:
      conn, cursor = getConn()
      cursor.execute("SELECT COUNT(*) FROM attractions")
      resultsNum = cursor.fetchone()[0]
      offset = page * 12
      cursor.execute("SELECT * FROM attractions LIMIT 12 OFFSET %s", (offset,))
      results = cursor.fetchall()
      dispose(cursor, conn)
    
    attractions_data = []
    for result in results:
      attraction = {
        "id": result[0],
        "name": result[1],
        "category": result[2],
        "description": result[3],
        "address": result[4],
        "transport": result[5],
        "mrt": result[6],
        "lat": float(result[7]),
        "lng": float(result[8]),
        "images": result[9].split(',')
      }
      attractions_data.append(attraction)

    if (page + 1) * 12 < resultsNum:
      next_page = page + 1
    else:
      next_page = None

    api_response = {
      "data": attractions_data,
      "nextPage": next_page
    }
    return jsonify(api_response)
  except Exception as e:
    current_app.logger.error(traceback.format_exc())
    return jsonify({"error": True, "message": "伺服器內部錯誤"})

# 取得某景點編號的景點資料
@app.route("/api/attraction/<int:attractionId>", methods=['GET'])
def api_id_attraction(attractionId):
  try:
    conn, cursor = getConn()
    cursor.execute("SELECT * FROM attractions WHERE id = %s", (attractionId, ))
    result = cursor.fetchone()
    dispose(cursor, conn)
    
    if result is None:
      return jsonify({"error": True, "message": "景點編號不正確"})

    attraction = {
      "id": result[0],
      "name": result[1],
      "category": result[2],
      "description": result[3],
      "address": result[4],
      "transport": result[5],
      "mrt": result[6],
      "lat": float(result[7]),
      "lng": float(result[8]),
      "images": result[9].split(',')
    }

    api_response = {
      "data": attraction
    }
    return jsonify(api_response)
  except Exception as e:
    current_app.logger.error(traceback.format_exc())
    return jsonify({"error": True, "message": "伺服器內部錯誤"})

# 取得捷運名稱列表
@app.route("/api/mrts", methods=['GET'])
def api_mrts():
  try:
    conn, cursor = getConn()
    query = """
      SELECT mrt, COUNT(id) as num_attractions
      FROM attractions
      WHERE mrt IS NOT NULL
      GROUP BY mrt
      ORDER BY num_attractions DESC
      LIMIT 40
    """
    cursor.execute(query)
    results = cursor.fetchall()
    dispose(cursor, conn)

    mrts = [result[0] for result in results]

    api_response = {
      "data": mrts
    }
    return jsonify(api_response)
  except Exception as e:
    current_app.logger.error(traceback.format_exc())
    return jsonify({"error": True, "message": "伺服器內部錯誤"})

# 註冊
@app.route("/api/user", methods=["POST"])
def api_signup():
  try:
    data = request.get_json()
    name = data['name']
    email = data['email']
    password = data['password']

    if check_account(email):
      return jsonify({"error": True, "message": "註冊失敗，此帳號已被註冊"}), 400
    else:
      add_account(name, email, password)
      return jsonify({"ok": True}), 200
  except Exception as e:
    return jsonify({"error": True, "message": "伺服器內部錯誤"}), 500

# 登入
@app.route("/api/user/auth", methods=["PUT"])
def api_login():
  try:
    data = request.get_json()
    email = data['email']
    password = data['password']
    result = check_member(email, password)

    if result is not None:
      expTime = datetime.datetime.utcnow() + datetime.timedelta(days=7)
      payload = {
        "member_id": result[0],
        "name": result[1],
        "email": result[2],
        "exp": expTime
      }
      encoded_jwt = jwt.encode(payload, "secretKey", algorithm="HS256")
      return jsonify({"token": encoded_jwt}), 200
    else:
      return jsonify({"error": True, "message": "登入失敗，帳號或密碼錯誤"}), 400
  except Exception as e:
    return jsonify({"error": True, "message": "伺服器內部錯誤"}), 500

# 取得當前登入的會員資訊
@app.route("/api/user/auth", methods=["GET"])
def api_get_status():
  token = request.headers.get("Authorization")
  if token != "null":
    decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
    member_info = get_member_info(decoded_token.get('member_id'))
    user_data = {
      "id": member_info[0],
      "name": member_info[1],
      "email": member_info[2]
    }
    return jsonify({"data": user_data}), 200
  else:
    return jsonify({"data": None}), 200

app.run(host="0.0.0.0", port=3000)