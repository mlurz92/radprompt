
const KEY='radprompt:state:v3';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(typeof data==='string'?data:JSON.stringify(data),{status,headers});
export async function onRequestGet({env}){
 if(!env.RADPROMPT_KV)return reply({error:'RADPROMPT_KV ist nicht gebunden.'},503);
 const state=await env.RADPROMPT_KV.get(KEY,'json');
 return state?reply(state):reply({error:'Noch keine Daten vorhanden.'},404);
}
export async function onRequestPut({request,env}){
 if(!env.RADPROMPT_KV)return reply({error:'RADPROMPT_KV ist nicht gebunden.'},503);
 let body;try{body=await request.json()}catch{return reply({error:'Ungültiges JSON.'},400)}
 if(!body||!Array.isArray(body.folders)||!Array.isArray(body.prompts)||typeof body.documents!=='object')return reply({error:'Ungültiges RadPrompt-Datenmodell.'},422);
 const size=new TextEncoder().encode(JSON.stringify(body)).byteLength;if(size>20_000_000)return reply({error:'Datensatz zu groß.'},413);
 body.schemaVersion=3;body.revision=(Number(body.revision)||0)+1;body.updatedAt=new Date().toISOString();
 await env.RADPROMPT_KV.put(KEY,JSON.stringify(body));
 return reply({ok:true,revision:body.revision,updatedAt:body.updatedAt,bytes:size});
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{allow:'GET, PUT, OPTIONS'}})}
