import jwt
import json
import os, re
import requests
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
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config["JSON_AS_ASCII"] = False
app.config["TEMPLATES_AUTO_RELOAD"] = True

# 載入環境變數配置文件
load_dotenv()

# 使用 os.getenv() 讀取環境變數
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
PARTNER_KEY = os.getenv("PARTNER_KEY")

# 建立並設定連接池
pool = pooling.MySQLConnectionPool(
  pool_name = "myPool",  # 連接池名稱
  pool_size = 30,  # 連接池大小
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
@app.route("/member")
def member():
  return render_template("member.html")

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

# 取得會員預訂資訊
def get_member_booking(memberId):
  conn, cursor = getConn()
  cursor.execute("SELECT attractions.id, attractions.name, attractions.address, attractions.images, booking.date, booking.time, booking.price FROM booking INNER JOIN attractions ON attraction_id = attractions.id WHERE member_id = %s", (memberId, ))
  result = cursor.fetchone()
  return result

# 新增會員訂單
def create_booking(memberId, attractionId, date, time, price):
  conn, cursor = getConn()
  try:
    cursor.execute("SELECT COUNT(*) FROM booking WHERE member_id = %s", (memberId,))
    result = cursor.fetchone()
    if result and result[0] > 0:
      cursor.execute("DELETE FROM booking WHERE member_id = %s", (memberId,))

    cursor.execute("INSERT INTO booking (member_id, attraction_id, date, time, price) VALUES (%s, %s, %s, %s, %s)",(memberId, attractionId, date, time, price,))
    conn.commit()
    dispose(cursor, conn)
    return True
  except Exception as e:
    print("Error in create_booking:", str(e))
    conn.rollback()
    dispose(cursor, conn)
    return False

# 刪除預定行程
def delete_booking(memberId):
  conn, cursor = getConn()
  cursor.execute("DELETE FROM booking WHERE member_id = %s", (memberId,))
  conn.commit()
  dispose(cursor, conn)
  return True

# 生成訂單資訊
def create_order(memberId, attractionId, date, time, price, contactName, contactEmail, contactTel):
  timestamp = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
  order_number = f'{timestamp}{memberId}'
  try:
    conn, cursor = getConn()
    cursor.execute(
      "INSERT INTO orders (number, status, message, date, time, price, attraction_id, member_id, contact_name, contact_email, contact_tel) VALUES (%s, NULL, '未付款', %s, %s, %s, %s, %s, %s, %s, %s)",
      (order_number, date, time, price, attractionId, memberId, contactName, contactEmail, contactTel)
    )
    conn.commit()
    dispose(cursor, conn)
    delete_booking(memberId)
    payment_status = {
      "status": None,
      "message": "未付款"
    }
    return order_number, payment_status
  except Exception as e:
    print("Error in create_order:", str(e))
    conn.rollback()
    dispose(cursor, conn)
    return None

# 發送付款請求到金流 api:
def request_payment(prime, orderData):
  api_url = "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime"

  request_data = {
    "prime": prime,
    "partner_key": PARTNER_KEY,
    "merchant_id": "zoetrypayment_TAISHIN",
    "details": "One Day Tour in Taipei",
    "amount": orderData['price'],
    "cardholder": {
      "phone_number": orderData['contact']['phone'],
      "name": orderData['contact']['name'],
      "email": orderData['contact']['email']
    },
    "remember": False
  }

  headers = {
    "Content-Type": "application/json",
    "x-api-key": PARTNER_KEY
  }

  try:
    response = requests.post(api_url, json=request_data, headers=headers)
    response_data = response.json()
    print("付款 API 回應：", response_data)

    if response_data.get("status") == 0:
      return True
    else:
      return False
  except requests.exceptions.RequestException as e:
    print("發送請求失敗：", str(e))
    return False

# 修改訂單狀態為已付款
def update_order_status(order_number):
  try:
    conn, cursor = getConn()
    cursor.execute("UPDATE orders SET status = 0, message = '已付款' WHERE number = %s", (order_number, ))
    conn.commit()
    cursor.execute("SELECT number, status, message FROM orders WHERE number = %s", (order_number, ))
    result = cursor.fetchone()
    return result
  except Exception as e:
    print("Error in record_payment:", str(e))
    conn.rollback()

# 獲得會員歷史訂單
def get_member_history(memberId):
  conn, cursor = getConn()
  cursor.execute("SELECT attractions.id, attractions.name, attractions.address, attractions.images, orders.number, orders.date, orders.time, orders.price, orders.creation_time, orders.contact_name, orders.contact_email, orders.contact_tel FROM orders INNER JOIN attractions ON attraction_id = attractions.id WHERE member_id = %s ORDER BY orders.creation_time DESC", (memberId,))
  results = cursor.fetchall()
  dispose(cursor, conn)
  return results

# 彙整會員歷史訂單
def parse_order_history(orderHistory):
  parsed_data = []
  for item in orderHistory:
    attraction_images = item[3].split(',')
    data_item = {
      "attraction": {
        "id": item[0],
        "name": item[1],
        "address": item[2],
        "image": attraction_images[0] if attraction_images else ''
      },
      "number": item[4],
      "creation_time": item[8].strftime('%Y-%m-%d %H:%M:%S'),
      "date": item[5].strftime('%Y-%m-%d'),
      "time": item[6],
      "price": item[7],
      "contact_name": item[9],
      "contact_email": item[10],
      "contact_tel": item[11],
    }
    parsed_data.append(data_item)
  return parsed_data

# 更新會員資料
def update_member_data(memberId, name, phone, profile_url):
  conn, cursor = getConn()
  try:
    cursor.execute("UPDATE member SET name = %s, phone = %s, profile_url = %s WHERE id = %s",(name, phone, profile_url, memberId,))
    conn.commit()
    dispose(cursor, conn)
    return True
  except Exception as e:
    print("Error in update_member_data:", str(e))
    conn.rollback()
    dispose(cursor, conn)
    return False

# 檢查新增檔案的類型
def allowed_file(filename):
  return '.' in filename and \
    filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

# 確保圖片檔名安全
def secure_filename(filename):
  # 只保留英文字母、數字、底線和點，並移除其他特殊字符
  return re.sub(r'[^\w.]', '_', filename)

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
      "email": member_info[2],
      "phone": member_info[6],
      "profileUrl": member_info[7]
    }
    return jsonify({"data": user_data}), 200
  else:
    return jsonify({"data": None}), 200

# 取得尚未確認下單的預定行程
@app.route("/api/booking", methods=["GET"])
def api_check_booking_status():
  try:
    token = request.headers.get("Authorization")

    if token != "null":
      decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
      memberId = get_member_info(decoded_token.get('member_id'))[0]
      bookingData = get_member_booking(memberId)

      if bookingData is not None:
        data = {
          "attraction" : {
            "id": bookingData[0],
            "name": bookingData[1],
            "address": bookingData[2],
            "image": bookingData[3].split(',')[0]
          },
          "date": bookingData[4].strftime('%Y-%m-%d'),
          "time": bookingData[5],
          "price": bookingData[6]
        }
      else:
        data = {}
      
      api_response = {
        "data": data
      }
      return jsonify(api_response), 200
    else:
      return jsonify({"data": None}), 200
  except jwt.ExpiredSignatureError:
    return jsonify({"error": True, "message": "未登入系統，拒絕存取"}), 403

# 建立新的預定行程
@app.route("/api/booking", methods=["POST"])
def api_create_booking():
  try:
    token = request.headers.get("Authorization")

    if token == "null":
      return jsonify({"error": True, "message": "未登入系統，拒絕存取"}), 403

    decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
    memberId = get_member_info(decoded_token.get('member_id'))[0]

    data = request.get_json()
    attractionId, date, time, price = data['attractionId'], data['date'], data['time'], data['price']

    if create_booking(memberId, attractionId, date, time, price):
      return jsonify({"ok": True}), 200
    else:
      return jsonify({"error": True, "message": "建立失敗，輸入不正確或其他原因"}), 400
  except Exception as e:
    return jsonify({"error": True, "message": "伺服器內部錯誤"}), 500

# 刪除目前的預定行程
@app.route("/api/booking", methods=["DELETE"])
def api_delete_booking():
  token = request.headers.get("Authorization")

  if token == "null":
    return jsonify({"error": True, "message": "未登入系統，拒絕存取"}), 403

  decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
  memberId = get_member_info(decoded_token.get('member_id'))[0]

  if delete_booking(memberId):
    return jsonify({"ok": True}), 200

# 建立新的訂單，並完成付款程序
@app.route('/api/orders', methods=['POST'])
def api_orders():
  try:
    token = request.headers.get("Authorization")

    if token == "null":
      return jsonify({"error": True, "message": "未登入系統，拒絕存取"}), 403

    decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
    memberId = get_member_info(decoded_token.get('member_id'))[0]
    bookingData = get_member_booking(memberId)
    attractionId = bookingData[0]
    date = bookingData[4].strftime('%Y-%m-%d')
    time = bookingData[5]
    price = bookingData[6]

    data = request.get_json()
    prime = data.get('prime')
    orderData = data.get('order')
    contact = orderData.get('contact', {})
    contactName = contact.get('name', '')
    contactEmail = contact.get('email', '')
    contactTel = contact.get('phone', '')
    

    order_number, payment_status = create_order(memberId, attractionId, date, time, price, contactName, contactEmail, contactTel)

    response_data = {
      "data": {
        "number": order_number,
        "payment": payment_status
      }
    }

    if request_payment(prime, orderData):
      result = update_order_status(order_number)
      response_data = {
        "data": {
          "number": result[0],
          "payment": {
            "status": result[1],
            "message": result[2]
          }
        }
      }
      return jsonify(response_data), 200
    else:
      return jsonify({"error": True, "message": "訂單建立失敗，輸入不正確或其他原因"}), 400
  except Exception as e:
    print(e)
    return jsonify({"error": True, "message": "伺服器內部錯誤"}), 500

# 取得會員的歷史訂單
@app.route("/api/user/history", methods=["GET"])
def api_get_order_history():
  try:
    token = request.headers.get("Authorization")

    if token != "null":
      decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
      memberId = get_member_info(decoded_token.get('member_id'))[0]
      orderHistory = get_member_history(memberId)

      if orderHistory:
        parsed_order_history = parse_order_history(orderHistory)
        return jsonify({"data": parsed_order_history}), 200
      else:
        return jsonify({"data": None}), 200
  except jwt.ExpiredSignatureError:
    return jsonify({"error": True, "message": "未登入系統，拒絕存取"}), 403

# 更新會員資料
@app.route("/api/user/member", methods=["POST"])
def api_update_member_data():
  try:
    token = request.headers.get("Authorization")

    if token != "null":
      decoded_token = jwt.decode(token, "secretKey", algorithms=["HS256"])
      memberId = get_member_info(decoded_token.get('member_id'))[0]

      name = request.form.get('name')
      phone = request.form.get('phone')
      image_file = request.files['croppedImage']

      if allowed_file(image_file.filename):
        filename = secure_filename(image_file.filename)
        image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        profile_url = f"{request.url_root}uploads/{filename}"

        if update_member_data(memberId, name, phone, profile_url):
          present_member_info = get_member_info(memberId)
          member_data = {
            "id": present_member_info[0],
            "name": present_member_info[1],
            "email": present_member_info[2],
            "phone": present_member_info[6],
            "profile_url": present_member_info[7]
          }
          return jsonify(member_data), 200
      else:
        return jsonify({"error": True, "message": "Invalid file type"}), 400
  except Exception as e:
    print("Error in api_update_member_data:", str(e))
    return jsonify({"error": True, "message": "Server error"}), 500

# 新增路由來提供圖片的存取
@app.route('/uploads/<filename>')
def uploaded_file(filename):
  return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

app.run(host="0.0.0.0", port=3000)