import jwt from "jsonwebtoken";
export function auth(req,res,next){
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(!token) return res.status(401).json({message:"برای ادامه وارد حساب کاربری شوید."});
  try { req.user=jwt.verify(token,process.env.JWT_SECRET||"dev-only-change-me"); next(); }
  catch { return res.status(401).json({message:"نشست شما معتبر نیست؛ دوباره وارد شوید."}); }
}
export function adminOnly(req,res,next){
  if(req.user?.role!=="admin") return res.status(403).json({message:"دسترسی مدیر لازم است."});
  next();
}
