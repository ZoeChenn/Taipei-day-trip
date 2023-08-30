import json
import os, re
import mysql.connector
from dotenv import load_dotenv

with open('taipei-attractions.json','r',encoding='utf-8') as file:
  data = json.load(file)

# 載入環境變數配置文件
load_dotenv()

# 使用 os.getenv() 讀取環境變數
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")

connection = mysql.connector.connect(
  host = DB_HOST,
  user = DB_USER,
  password = DB_PASSWORD,
  database = DB_NAME,
)

cursor = connection.cursor()

for result in data['result']['results']:
  name = result['name']
  category = result['CAT']
  description = result['description']
  address = result['address']
  transport = result['direction']
  mrt = result['MRT']
  lat = result['latitude']
  lng = result['longitude']

  validImageUrls = re.findall(r'https://.*?\.(?:jpg|JPG)', result['file'])
  images = [url for url in validImageUrls if re.match(r'^.*\.(jpg|png)$', url, re.IGNORECASE)]

  insertSQL = "INSERT INTO attractions (name, category, description, address, transport, mrt, lat, lng, images) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
  data = (name, category, description, address, transport, mrt, lat, lng, ','.join(images))
  cursor.execute(insertSQL, data)
  connection.commit()


cursor.close()
connection.close()

print("資料已成功存入資料庫。")