export const corridors = [
  {id:'mex-qro',name:'México – Querétaro',road:'57D',stops:['Ciudad de México','Tepotzotlán','San Juan del Río','Querétaro']},
  {id:'pue-ver',name:'Puebla – Veracruz',road:'150D',stops:['Puebla','Orizaba','Córdoba','Veracruz']},
  {id:'gdl-leon',name:'Guadalajara – León',road:'80D',stops:['Guadalajara','Tepatitlán','Lagos de Moreno','León']},
  {id:'mty-salt',name:'Monterrey – Saltillo',road:'40D',stops:['Monterrey','Santa Catarina','Saltillo']},
] as const;
export type Journey = {id:string;corridor:string;origin:number;destination:number;departure:number;endsAt:number;status:'planned'|'active'|'complete';support:boolean;emergency:boolean;reason:string;location:string;nickname:string;phone?:string;contactName?:string;contactPhone?:string};
export type Profile = {nickname:string;phone:string;contactName:string;contactPhone:string};
export type Connection = {id:string;nickname:string;status:'pending'|'accepted'|'declined';incoming:boolean;tripId:string};
export type RoadState = {profile:Profile|null;trips:Journey[];peers:Journey[];connections:Connection[]};
export const emptyState:RoadState={profile:null,trips:[],peers:[],connections:[]};
export function getCorridor(id:string) { return corridors.find(c=>c.id===id); }
export function routeLabel(t:Pick<Journey,'corridor'|'origin'|'destination'>) { const c=getCorridor(t.corridor); return c?`${c.stops[t.origin]} → ${c.stops[t.destination]}`:'Tramo no disponible'; }
export function matches(a:Pick<Journey,'corridor'|'origin'|'destination'|'departure'|'endsAt'>,b:Pick<Journey,'corridor'|'origin'|'destination'|'departure'|'endsAt'>) {
  return a.corridor===b.corridor && Math.sign(a.destination-a.origin)===Math.sign(b.destination-b.origin) && Math.max(Math.min(a.origin,a.destination),Math.min(b.origin,b.destination)) < Math.min(Math.max(a.origin,a.destination),Math.max(b.origin,b.destination)) && a.departure<b.endsAt && b.departure<a.endsAt;
}
export function canSeeEmergency(viewer:Journey,target:Journey,now:number) { return target.emergency && viewer.status==='active' && target.status==='active' && viewer.departure<=now && target.departure<=now && viewer.endsAt>now && target.endsAt>now && matches(viewer,target); }
export function validateTrip(input:Record<string,unknown>,now:number) {
  const c=getCorridor(String(input.corridor)); const origin=Number(input.origin); const destination=Number(input.destination); const departure=Number(input.departure);
  if(!c||!Number.isInteger(origin)||!Number.isInteger(destination)||origin<0||destination<0||origin>=c.stops.length||destination>=c.stops.length||origin===destination) throw new Error('Elige un origen y un destino diferentes dentro del corredor.');
  if(!Number.isFinite(departure)||departure<now-300000||departure>now+7*86400000) throw new Error('Elige una salida entre ahora y los próximos siete días.');
  return {corridor:c.id,origin,destination,departure,endsAt:departure+6*3600000,support:input.support===true};
}
export function cleanPhone(value:unknown,required=false) {const p=String(value??'').trim().replace(/[\s()-]/g,'');if((required&&!p)||(p&&!/^\+?\d{7,15}$/.test(p))) throw new Error('Escribe un teléfono de 7 a 15 dígitos, con lada.');return p;}
export const emergencyNumbers=[{name:'Emergencias',number:'911',detail:'Emergencias en México'},{name:'CAPUFE',number:'074',detail:'Autopistas operadas por CAPUFE'},{name:'Ángeles Verdes',number:'078',detail:'Orientación y auxilio carretero'}];
export const emergencySource='https://www.gob.mx/sct/es/articulos/lleva-contigo-los-numeros-de-emergencia';
