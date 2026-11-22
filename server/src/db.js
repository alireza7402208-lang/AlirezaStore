import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const dataDir = path.resolve("data");
fs.mkdirSync(dataDir, { recursive: true });
export const db = new Database(path.join(dataDir, "bazarino.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'کارکرده',
  images TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, ad_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
if (!count) {
  const insertUser = db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)");
  const admin = insertUser.run("مدیر بازارینو","admin@bazarino.local",bcrypt.hashSync("Admin123!",10),"admin").lastInsertRowid;
  const user = insertUser.run("کاربر نمونه","user@bazarino.local",bcrypt.hashSync("User123!",10),"user").lastInsertRowid;
  const insertAd = db.prepare("INSERT INTO ads(user_id,title,description,price,category,city,condition,images) VALUES(?,?,?,?,?,?,?,?)");
  [
    [user,"لپ‌تاپ لنوو ThinkPad","لپ‌تاپ سالم و مناسب کارهای روزمره و دانشجویی. امکان بررسی حضوری.",18500000,"موبایل، تبلت و کامپیوتر","ساری","کارکرده",["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900"]],
    [user,"دوچرخه شهری","دوچرخه تمیز با ترمز سالم؛ مناسب رفت‌وآمد شهری.",4200000,"ورزش و سرگرمی","تهران","کارکرده",["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900"]],
    [admin,"میز کار چوبی","میز کار مینیمال، محکم و کم‌جا. ابعاد ۱۲۰ در ۶۰ سانتی‌متر.",2900000,"خانه و آشپزخانه","رشت","نو",["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900"]],
    [user,"گوشی سامسونگ","گوشی سالم با جعبه و لوازم؛ قیمت قابل مذاکره.",12500000,"موبایل، تبلت و کامپیوتر","مشهد","کارکرده",["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900"]]
  ].forEach(a=>insertAd.run(a[0],a[1],a[2],a[3],a[4],a[5],a[6],JSON.stringify(a[7])));
}
