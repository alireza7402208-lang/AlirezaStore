const BASE="http://localhost:4000/api";
export const getToken=()=>localStorage.getItem("bazarino_token");
export async function api(path,options={}){
 const headers={...(options.headers||{})};
 if(getToken())headers.Authorization=`Bearer ${getToken()}`;
 if(options.body && !(options.body instanceof FormData))headers["Content-Type"]="application/json";
 const response=await fetch(BASE+path,{...options,headers});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||"ارتباط با سرور برقرار نشد.");
 return data;
}
export const imageUrl=(src)=>src?.startsWith("http")?src:`http://localhost:4000${src||""}`;
export const money=(v)=>Number(v)===0?"توافقی":new Intl.NumberFormat("fa-IR").format(v)+" تومان";
