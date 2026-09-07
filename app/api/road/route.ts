import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getRawDb} from '@/db';
import {canSeeEmergency,cleanPhone,matches,validateTrip,type Journey} from '@/lib/road';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
type Row={id:string;user_id:string;corridor:string;origin:number;destination:number;departure:number;ends_at:number;status:Journey['status'];support:number;emergency:number;reason:string;location:string;nickname:string;phone?:string;contact_name?:string;contact_phone?:string};
function journey(r:Row):Journey {return {id:r.id,corridor:r.corridor,origin:r.origin,destination:r.destination,departure:r.departure,endsAt:r.ends_at,status:r.status,support:!!r.support,emergency:!!r.emergency,reason:r.emergency?r.reason:'',location:r.emergency?r.location:'',nickname:r.nickname};}
const columns='t.id,t.user_id,t.corridor,t.origin,t.destination,t.departure,t.ends_at,t.status,t.support,t.emergency,t.reason,t.location,p.nickname';
async function state(userId:string){
 const db=getRawDb();const now=Date.now();
 const profile=await db.prepare('SELECT nickname,phone,contact_name AS contactName,contact_phone AS contactPhone FROM profiles WHERE user_id=?').bind(userId).first();
 const own=await db.prepare(`SELECT ${columns} FROM trips t JOIN profiles p ON p.user_id=t.user_id WHERE t.user_id=? ORDER BY t.departure DESC LIMIT 100`).bind(userId).all<Row>();
 const ownTrips=own.results.map(r=>journey(r.ends_at<=now?{...r,status:'complete',emergency:0}:r));
 const rawPeers=await db.prepare(`SELECT ${columns} FROM trips t JOIN profiles p ON p.user_id=t.user_id WHERE t.user_id<>? AND t.status IN ('planned','active') AND t.ends_at>? ORDER BY t.departure LIMIT 200`).bind(userId,now).all<Row>();
 const peers:Journey[]=[];
 for(const r of rawPeers.results){
   const peer=journey(r);const visible=ownTrips.some(t=>canSeeEmergency(t,peer,now));
   // Private contacts are queried only after server-side eligibility succeeds.
   if(visible){const p=await db.prepare('SELECT phone,contact_name,contact_phone FROM profiles WHERE user_id=?').bind(r.user_id).first<{phone:string;contact_name:string;contact_phone:string}>();if(p)Object.assign(peer,{phone:p.phone,contactName:p.contact_name,contactPhone:p.contact_phone});}
   else {peer.emergency=false;peer.reason='';peer.location='';}
   peers.push(peer);
 }
 const requests=await db.prepare(`SELECT c.id,c.status,CASE WHEN a.user_id=? THEN pb.nickname ELSE pa.nickname END AS nickname,CASE WHEN b.user_id=? THEN 1 ELSE 0 END AS incoming,CASE WHEN a.user_id=? THEN b.id ELSE a.id END AS tripId FROM connections c JOIN trips a ON a.id=c.from_trip JOIN trips b ON b.id=c.to_trip JOIN profiles pa ON pa.user_id=a.user_id JOIN profiles pb ON pb.user_id=b.user_id WHERE (a.user_id=? OR b.user_id=?) AND a.status<>'complete' AND b.status<>'complete' AND a.ends_at>? AND b.ends_at>? ORDER BY c.created_at DESC LIMIT 100`).bind(userId,userId,userId,userId,userId,now,now).all();
 return {profile,trips:ownTrips,peers,connections:requests.results.map(r=>({...r,incoming:!!r.incoming}))};
}
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para usar tus datos.'},401);return json(await state(user.userId));}catch{return json({error:'No pudimos cargar tus viajes. Vuelve a intentarlo.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para continuar.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Solicitud no permitida.'},403);
 let body:Record<string,unknown>;try{const raw=await request.text();if(raw.length>5000)return json({error:'Solicitud demasiado larga.'},413);body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json({error:'Datos no válidos.'},400);}
 try{
 const db=getRawDb();const now=Date.now();const id=String(body.id??'');
 if(body.action==='profile'){
  const nickname=String(body.nickname??'').trim();if(!/^[\p{L}\p{N}_-]{3,24}$/u.test(nickname))throw new Error('Tu nickname debe tener de 3 a 24 letras, números, guiones o guiones bajos.');
  const phone=cleanPhone(body.phone,true);const contactPhone=cleanPhone(body.contactPhone);const contactName=String(body.contactName??'').trim().slice(0,60);
  if(contactPhone&&!contactName)throw new Error('Agrega el nombre de tu contacto de emergencia.');
  const taken=await db.prepare('SELECT user_id FROM profiles WHERE lower(nickname)=lower(?) AND user_id<>?').bind(nickname,user.userId).first();if(taken)throw new Error('Ese nickname ya está en uso. Elige otro.');
  await db.prepare('INSERT INTO profiles (user_id,nickname,phone,contact_name,contact_phone) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname,phone=excluded.phone,contact_name=excluded.contact_name,contact_phone=excluded.contact_phone').bind(user.userId,nickname,phone,contactName,contactPhone).run();
 }else if(body.action==='publish'){
  const p=await db.prepare('SELECT user_id FROM profiles WHERE user_id=?').bind(user.userId).first();if(!p)throw new Error('Completa tu perfil antes de publicar tu viaje.');
  const t=validateTrip(body,now);const existing=await db.prepare("SELECT id FROM trips WHERE user_id=? AND status IN ('active','planned') AND ends_at>? LIMIT 1").bind(user.userId,now).first();if(existing)throw new Error('Finaliza tu viaje actual antes de publicar otro.');
  await db.prepare('INSERT INTO trips (id,user_id,corridor,origin,destination,departure,ends_at,status,support) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,t.corridor,t.origin,t.destination,t.departure,t.endsAt,t.departure<=now?'active':'planned',t.support?1:0).run();
 }else if(['finish','start','sos','resolve'].includes(String(body.action))){
  const trip=await db.prepare('SELECT * FROM trips WHERE id=? AND user_id=?').bind(id,user.userId).first<Row>();if(!trip||trip.status==='complete'||trip.ends_at<=now)throw new Error('No tienes un viaje vigente para esta acción.');
  if(body.action==='finish')await db.prepare("UPDATE trips SET status='complete',emergency=0,reason='',location='' WHERE id=? AND user_id=?").bind(id,user.userId).run();
  if(body.action==='start')await db.prepare("UPDATE trips SET status='active',departure=?,ends_at=? WHERE id=? AND user_id=?").bind(now,now+6*3600000,id,user.userId).run();
  if(body.action==='resolve')await db.prepare("UPDATE trips SET emergency=0,reason='',location='' WHERE id=? AND user_id=?").bind(id,user.userId).run();
  if(body.action==='sos'){
   if(body.consent!==true)throw new Error('Confirma que quieres compartir tus datos durante esta emergencia.');
   if(trip.status!=='active'||trip.departure>now)throw new Error('Inicia tu viaje para activar una alerta a otros viajeros.');
   const reason=String(body.reason??'');if(!['Avería mecánica','Emergencia médica','Me siento en riesgo','Otra emergencia'].includes(reason))throw new Error('Selecciona el tipo de emergencia.');
   const location=String(body.location??'').trim().slice(0,240);if(!location)throw new Error('Indica un kilómetro, caseta o referencia para localizarte.');
   await db.prepare('UPDATE trips SET emergency=1,reason=?,location=? WHERE id=? AND user_id=?').bind(reason,location,id,user.userId).run();
  }
 }else if(body.action==='request'){
  const mine=await db.prepare(`SELECT ${columns} FROM trips t JOIN profiles p ON p.user_id=t.user_id WHERE t.user_id=? AND t.status IN ('active','planned') AND t.ends_at>? ORDER BY t.departure LIMIT 1`).bind(user.userId,now).first<Row>();
  const other=await db.prepare(`SELECT ${columns} FROM trips t JOIN profiles p ON p.user_id=t.user_id WHERE t.id=? AND t.user_id<>? AND t.status IN ('active','planned') AND t.ends_at>?`).bind(id,user.userId,now).first<Row>();
  if(!mine||!other||!matches(journey(mine),journey(other)))throw new Error('Para solicitar compañía, publica un viaje que coincida en tramo, sentido y horario.');
  const existing=await db.prepare('SELECT id FROM connections WHERE (from_trip=? AND to_trip=?) OR (from_trip=? AND to_trip=?)').bind(mine.id,other.id,other.id,mine.id).first();
  if(!existing)await db.prepare('INSERT INTO connections (id,from_trip,to_trip,created_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(),mine.id,other.id,now).run();
 }else if(body.action==='respond'){
  if(!['accepted','declined'].includes(String(body.status)))throw new Error('Respuesta no válida.');
  const connection=await db.prepare("SELECT c.id FROM connections c JOIN trips a ON a.id=c.from_trip JOIN trips b ON b.id=c.to_trip WHERE c.id=? AND b.user_id=? AND c.status='pending' AND a.status<>'complete' AND b.status<>'complete' AND a.ends_at>? AND b.ends_at>?").bind(id,user.userId,now,now).first();
  if(!connection)throw new Error('Esta solicitud ya no está disponible.');
  await db.prepare("UPDATE connections SET status=? WHERE id=? AND status='pending'").bind(String(body.status),id).run();
 }else return json({error:'Acción no reconocida.'},400);
 return json(await state(user.userId));
 }catch(error){const message=error instanceof Error?error.message:'';if(/D1|SQLITE|binding|database|UNIQUE/i.test(message))return json({error:'No pudimos guardar el cambio. Revisa los datos e inténtalo de nuevo.'},503);return json({error:message||'No se pudo completar la acción.'},400);}
}
