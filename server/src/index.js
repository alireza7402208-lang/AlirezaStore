import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { auth, adminOnly } from "./middleware.js";

const app=express();
const PORT=process.env.PORT||4000;
const SECRET=process.env.JWT_SECRET||"dev-only-change-me";
const uploadDir=path.resolve("uploads");
fs.mkdirSync(uploadDir,{recursive:true});
app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"}}));
app.use(cors({origin:process.env.CLIENT_ORIGIN||"http://localhost:5173"}));
app.use(express.json({limit:"1mb"}));
app.use("/uploads",express.static(uploadDir));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,max:100}));
const storage=multer.diskStorage({
 destination:(_,__,cb)=>cb(null,uploadDir),
 filename:(_,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase())
});
const upload=multer({storage,limits:{fileSize:5*1024*1024,files:5},fileFilter:(_,file,cb)=>{
 const ok=["image/jpeg","image/png","image/webp"].includes(file.mimetype);
 cb(ok?null:new Error("فقط تصویر JPG، PNG یا WEBP مجاز است."),ok);
}});
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
const tokenFor=u=>jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},SECRET,{expiresIn:"7d"});
const adSelect=`SELECT ads.*, users.name AS seller_name FROM ads JOIN users ON users.id=ads.user_id`;
const shapeAd=a=>({...a,images:JSON.parse(a.images||"[]"),price:Number(a.price)});
app.get("/api/health",(_,res)=>res.json({ok:true,name:"Bazarino API"}));

app.post("/api/auth/register",(req,res)=>{
 const {name,email,password}=req.body||{};
 if(!name?.trim()||!email?.trim()||!password||password.length<8) return res.status(400).json({message:"نام، ایمیل و رمز حداقل ۸ کاراکتری لازم است."});
 try{
  const info=db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name.trim(),email.trim().toLowerCase(),bcrypt.hashSync(password,10));
  const u=db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
  res.status(201).json({token:tokenFor(u),user:publicUser(u)});
 }catch(e){res.status(409).json({message:"این ایمیل قبلاً ثبت شده است."});}
});
app.post("/api/auth/login",(req,res)=>{
 const {email,password}=req.body||{};
 const u=db.prepare("SELECT * FROM users WHERE email=?").get(String(email||"").toLowerCase());
 if(!u||!bcrypt.compareSync(password||"",u.password)) return res.status(401).json({message:"ایمیل یا رمز عبور اشتباه است."});
 res.json({token:tokenFor(u),user:publicUser(u)});
});
app.get("/api/auth/me",auth,(req,res)=>{
 const u=db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(req.user.id);
 res.json({user:u});
});

app.get("/api/categories",(_,res)=>res.json([
 "وسایل نقلیه","املاک","موبایل، تبلت و کامپیوتر","خانه و آشپزخانه","لوازم شخصی","ورزش و سرگرمی","خدمات","صنعتی و تجاری","موسیقی و هنر","حیوانات"
]));
app.get("/api/ads",(req,res)=>{
 const {q="",category="",city="",sort="newest"}=req.query;
 let sql=adSelect+" WHERE ads.status='active'";
 const args=[];
 if(q){sql+=" AND (ads.title LIKE ? OR ads.description LIKE ?)";args.push(`%${q}%`,`%${q}%`);}
 if(category){sql+=" AND ads.category=?";args.push(category);}
 if(city){sql+=" AND ads.city LIKE ?";args.push(`%${city}%`);}
 sql+=sort==="cheap"?" ORDER BY ads.price ASC":sort==="expensive"?" ORDER BY ads.price DESC":" ORDER BY ads.created_at DESC";
 res.json(db.prepare(sql).all(...args).map(shapeAd));
});
app.get("/api/ads/:id",(req,res)=>{
 const a=db.prepare(adSelect+" WHERE ads.id=? AND ads.status='active'").get(req.params.id);
 if(!a)return res.status(404).json({message:"آگهی پیدا نشد."});
 res.json(shapeAd(a));
});
app.post("/api/ads",auth,upload.array("images",5),(req,res)=>{
 const {title,description,price,category,city,condition}=req.body;
 const n=Number(price);
 if(!title?.trim()||!description?.trim()||!category||!city?.trim()||!Number.isSafeInteger(n)||n<0) return res.status(400).json({message:"لطفاً همه فیلدهای ضروری را درست تکمیل کنید."});
 const images=(req.files||[]).map(f=>`/uploads/${f.filename}`);
 const info=db.prepare("INSERT INTO ads(user_id,title,description,price,category,city,condition,images) VALUES(?,?,?,?,?,?,?,?)")
 .run(req.user.id,title.trim(),description.trim(),n,category,city.trim(),condition||"کارکرده",JSON.stringify(images));
 res.status(201).json(shapeAd(db.prepare(adSelect+" WHERE ads.id=?").get(info.lastInsertRowid)));
});
app.get("/api/my/ads",auth,(req,res)=>res.json(db.prepare(adSelect+" WHERE ads.user_id=? ORDER BY ads.created_at DESC").all(req.user.id).map(shapeAd)));
app.delete("/api/ads/:id",auth,(req,res)=>{
 const a=db.prepare("SELECT * FROM ads WHERE id=?").get(req.params.id);
 if(!a)return res.status(404).json({message:"آگهی پیدا نشد."});
 if(a.user_id!==req.user.id&&req.user.role!=="admin")return res.status(403).json({message:"اجازه حذف این آگهی را ندارید."});
 db.prepare("DELETE FROM ads WHERE id=?").run(a.id);res.json({ok:true});
});
app.post("/api/favorites/:id",auth,(req,res)=>{
 const id=Number(req.params.id), exists=db.prepare("SELECT 1 FROM favorites WHERE user_id=? AND ad_id=?").get(req.user.id,id);
 if(exists)db.prepare("DELETE FROM favorites WHERE user_id=? AND ad_id=?").run(req.user.id,id);
 else if(db.prepare("SELECT 1 FROM ads WHERE id=?").get(id))db.prepare("INSERT INTO favorites(user_id,ad_id) VALUES(?,?)").run(req.user.id,id);
 res.json({favorite:!exists});
});
app.get("/api/favorites",auth,(req,res)=>res.json(db.prepare(adSelect+" JOIN favorites ON favorites.ad_id=ads.id WHERE favorites.user_id=? ORDER BY favorites.rowid DESC").all(req.user.id).map(shapeAd)));
app.get("/api/messages/:adId",auth,(req,res)=>{
 const rows=db.prepare(`SELECT messages.*,u.name AS sender_name FROM messages JOIN users u ON u.id=messages.sender_id
 WHERE ad_id=? AND (sender_id=? OR receiver_id=?) ORDER BY created_at ASC`).all(req.params.adId,req.user.id,req.user.id);
 res.json(rows);
});
app.post("/api/messages/:adId",auth,(req,res)=>{
 const body=String(req.body?.body||"").trim();
 const ad=db.prepare("SELECT * FROM ads WHERE id=?").get(req.params.adId);
 if(!ad)return res.status(404).json({message:"آگهی پیدا نشد."});
 if(!body||body.length>2000)return res.status(400).json({message:"متن پیام معتبر نیست."});
 let receiverId=ad.user_id;
 if(ad.user_id===req.user.id){
   const previous=db.prepare("SELECT sender_id,receiver_id FROM messages WHERE ad_id=? AND (sender_id=? OR receiver_id=?) ORDER BY id DESC LIMIT 1").get(ad.id,req.user.id,req.user.id);
   if(!previous)return res.status(400).json({message:"برای پاسخ‌دادن ابتدا باید خریدار به شما پیام داده باشد."});
   receiverId=previous.sender_id===req.user.id?previous.receiver_id:previous.sender_id;
 }
 const info=db.prepare("INSERT INTO messages(ad_id,sender_id,receiver_id,body) VALUES(?,?,?,?)").run(ad.id,req.user.id,receiverId,body);
 res.status(201).json(db.prepare("SELECT messages.*,u.name AS sender_name FROM messages JOIN users u ON u.id=messages.sender_id WHERE messages.id=?").get(info.lastInsertRowid));
});
app.get("/api/admin/ads",auth,adminOnly,(_,res)=>res.json(db.prepare(adSelect+" ORDER BY ads.created_at DESC").all().map(shapeAd)));
app.delete("/api/admin/ads/:id",auth,adminOnly,(req,res)=>{db.prepare("DELETE FROM ads WHERE id=?").run(req.params.id);res.json({ok:true});});
app.use((err,req,res,next)=>{
 console.error(err);
 res.status(err instanceof multer.MulterError?400:500).json({message:err.message||"خطای داخلی سرور"});
});
app.listen(PORT,()=>console.log(`Bazarino API running: http://localhost:${PORT}`));
