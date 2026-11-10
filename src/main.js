import './style.css';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ---- Empresa de este despliegue (un proyecto de Vercel por empresa) ----
const MARCA=String(import.meta.env.VITE_MARCA||'marathon').toLowerCase()==='equinox'?'equinox':'marathon';
const SCHEMA=import.meta.env.VITE_SCHEMA||(MARCA==='equinox'?'ptg_eqx':'ptg');
const BRAND={marathon:{nombre:'Marathon',ejemploTienda:'Marathon Quicentro',fondo:'#0a0f1e',acento:'#1B4B8A'},
             equinox:{nombre:'Equinox',ejemploTienda:'Equinox CCI',fondo:'#0b0b0b',acento:'#F26522'}}[MARCA];
document.documentElement.dataset.marca=MARCA;document.title=`Play the Game · ${BRAND.nombre}`;
{const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=BRAND.fondo;
 const ic=document.querySelector('link[rel="icon"]');if(ic)ic.href=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='${BRAND.acento}'/><path d='M12 9l11 7-11 7z' fill='#fff'/></svg>`)}`;
 const tn=document.getElementById('ti-nombre');if(tn)tn.placeholder=BRAND.ejemploTienda;}

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL, SUPABASE_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY)document.body.insertAdjacentHTML('afterbegin','<p style="padding:16px;background:#fff;color:#000">Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Revisa el archivo .env o las variables de entorno en Vercel.</p>');
const sb=createClient(SUPABASE_URL||'http://localhost',SUPABASE_KEY||'x',{db:{schema:SCHEMA},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});


const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAISES={EC:'Ecuador',PE:'Perú',CL:'Chile',BO:'Bolivia',CO:'Colombia'};
let U={};let UORD=[];
const uPais=c=>(U[c]&&U[c].pais)||String(c||'').split('-')[1]||'EC';
const uEmp=c=>(U[c]&&U[c].empresa)||'';
const uName=c=>c==='*'?'Todas las empresas':`${uEmp(c)} ${PAISES[uPais(c)]||''}`.trim();
function parseUnidad(x){const v=String(x||'').trim().toUpperCase();if(U[v]&&inScope(v))return v;
  const su=scopeUnits();if(!v&&su.length===1)return su[0];
  const emps=[...new Set(UORD.map(uEmp))];const emp=emps.length===1?emps[0]:(/EQU|EQX/.test(v)?'Equinox':'Marathon');
  const pa=(v.match(/\b(EC|PE|CL|BO|CO)\b/)||[])[1]||(/PER/.test(v)?'PE':/CHI/.test(v)?'CL':/BOL/.test(v)?'BO':/ECU/.test(v)?'EC':'')||(S.adminPais!=='*'?S.adminPais:'');
  return su.find(c=>uEmp(c)===emp&&uPais(c)===pa)||'';}
const firmaDef=c=>`Talento, Clima y Cultura – ${uEmp(c)||BRAND.nombre}`;
const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DOW=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const pl=(n,s,p)=>n===1?s:(p||s+'s');
function parseF(f){const[y,m,d]=f.split('-').map(Number);return new Date(y,m-1,d)}
function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmtF(f){const d=parseF(f);return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`}
const toMin=h=>{const[a,b]=String(h).split(':').map(Number);return a*60+(b||0)};
const hoy=()=>ymd(new Date());
const addDays=(f,n)=>{const d=parseF(f);d.setDate(d.getDate()+n);return ymd(d)};
const okMail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim());
const lc=s=>String(s||'').trim().toLowerCase();

const S={unidad:null,wantAdmin:false,grants:[],pinFor:null,pinEstado:[],started:false,email:null,role:null,perfil:null,equipo:[],dominios:[],avisos:[],editTienda:null,editTurno:null,pais:null,adminPais:null,owner:false,cfgs:{},rosters:{},uid:null,admin:false,ready:false,cfg:null,tiendas:[],turnos:[],reservas:[],
  got:{t:0,u:0,r:0},tab:'reservar',tabTouched:false,sub:'resumen',busy:false,calY:null,calM:null,selDay:null,lastBooked:null};

let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,4200)}
const tiendaMap=()=>Object.fromEntries(S.tiendas.map(t=>[t.id,t]));
const resDe=tid=>S.reservas.filter(r=>r.turnoId===tid);
const fechaRes=r=>(S.turnos.find(t=>t.id===r.turnoId)||{}).fecha||'';
const miPend=()=>S.reservas.filter(r=>r.userId===S.uid&&!r.enOutlook&&fechaRes(r)>=hoy()).sort((a,b)=>String(b.creado).localeCompare(String(a.creado)))[0]||null;
const cupos=t=>Math.max(1,Number(t.cupos)||1);
const libres=t=>Math.max(0,cupos(t)-resDe(t.id).length);
const misRes=()=>S.reservas.filter(r=>r.userId&&r.userId===S.uid);
const maxPP=()=>{const n=Number(S.cfg?.maxPorPersona);return n>0?n:Infinity};
const abiertas=()=>S.cfg?.abiertas!==false;
const nombreR=r=>(r&&(r.nombre||r.email))||'Colaborador';
const sortT=(a,b)=>a.fecha.localeCompare(b.fecha)||a.inicio.localeCompare(b.inicio);
let A={tiendas:[],turnos:[],reservas:[],roster:[],avisos:[]};
const tKey=(tid,f,i,e)=>`${tid}|${f}|${i}|${e}`;
const sKey=(n,c,p)=>`${lc(n)}|${lc(c)}|${p}`;
const inScope=u=>S.adminPais==='*'||uPais(u)===S.adminPais;
function computeA(){
  const ti=S.tiendas.filter(t=>inScope(t.unidad)),ids=new Set(ti.map(t=>t.id));
  const tu=S.turnos.filter(t=>ids.has(t.tiendaId)),tids=new Set(tu.map(t=>t.id));
  const roster=S.adminPais==='*'?Object.values(S.rosters).flat():(S.rosters[S.adminPais]||[]);
  A={tiendas:ti,turnos:tu,reservas:S.reservas.filter(r=>tids.has(r.turnoId)),roster,avisos:S.avisos.filter(a=>!a.enviado&&inScope(a.unidad)&&S.tiendas.some(t=>t.id===a.tiendaId))};
}
const cfgFor=p=>({...(S.cfgs.temporada||{}),...((p&&S.cfgs[p])||{})});
const scopeUnits=()=>S.adminPais==='*'?UORD:UORD.filter(c=>uPais(c)===S.adminPais);
const cfgKeys=()=>S.adminPais==='*'?['temporada']:scopeUnits();
const cfgKey=()=>cfgKeys()[0];
const PAISORD=()=>[...new Set(UORD.map(uPais))];
const empsDe=p=>[...new Set(UORD.filter(c=>uPais(c)===p).map(uEmp))];
const paisName=p=>p==='*'?'Todos los países':(PAISES[p]||p);
const scopeName=()=>paisName(S.adminPais);
const ss={get:k=>{try{return sessionStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(_){}}};

/* ---------- Calendario externo (Outlook / Google) ---------- */
const TZ={EC:'America/Guayaquil',PE:'America/Lima',CL:'America/Santiago',BO:'America/La_Paz'};
const FALLBACK_OFF={EC:'-05:00',PE:'-05:00',CL:'-03:00',BO:'-04:00'};
function offset(fecha,hora,pais){
  try{const tz=TZ[pais]||TZ.EC;const[y,m,d]=fecha.split('-').map(Number);const[h,mi]=hora.split(':').map(Number);
    const guess=Date.UTC(y,m-1,d,h,mi);
    const ps=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(guess));
    const g=k=>Number(ps.find(p=>p.type===k).value);
    const off=Math.round((Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'))-guess)/60000);
    const a=Math.abs(off);return (off<0?'-':'+')+String(Math.floor(a/60)).padStart(2,'0')+':'+String(a%60).padStart(2,'0');
  }catch(_){return FALLBACK_OFF[pais]||'-05:00'}
}
function calData(t){
  const ti=tiendaMap()[t.tiendaId];if(!ti)return null;const c=S.cfg||{};
  return{ti,subject:`Play the Game – Apoyo en ${ti.nombre}`,location:`${ti.nombre}, ${ti.ciudad}`,
    body:`Turno de Play the Game en ${ti.nombre} (${ti.ciudad}), ${fmtF(t.fecha)} de ${t.inicio} a ${t.fin}.${c.mensaje?'\n'+c.mensaje:''}\n\nReservado en Play the Game – Talento, Clima y Cultura.`};
}
function outlookUrl(t){
  const c=calData(t);if(!c)return'#';
  const p={path:'/calendar/action/compose',rru:'addevent',subject:c.subject,body:c.body,location:c.location,
    startdt:`${t.fecha}T${t.inicio}:00${offset(t.fecha,t.inicio,c.ti.pais)}`,enddt:`${t.fecha}T${t.fin}:00${offset(t.fecha,t.fin,c.ti.pais)}`};
  if(c.ti.email)p.to=c.ti.email;
  return 'https://outlook.office.com/calendar/0/deeplink/compose?'+new URLSearchParams(p).toString();
}
function googleUrl(t){
  const c=calData(t);if(!c)return'#';const f=t.fecha.replace(/-/g,''),hh=x=>x.replace(':','')+'00';
  const p={action:'TEMPLATE',text:c.subject,dates:`${f}T${hh(t.inicio)}/${f}T${hh(t.fin)}`,ctz:TZ[c.ti.pais]||TZ.EC,details:c.body,location:c.location};
  if(c.ti.email)p.add=c.ti.email;
  return 'https://calendar.google.com/calendar/render?'+new URLSearchParams(p).toString();
}
const calButtons=t=>`<a class="btn small" target="_blank" rel="noopener" href="${esc(outlookUrl(t))}">Agregar en Outlook</a><a class="btn ghost small" target="_blank" rel="noopener" href="${esc(googleUrl(t))}">Google Calendar</a>`;

/* ---------- Render general ---------- */
function paint(){
  const tf=Object.fromEntries(S.turnos.map(t=>[t.id,t.fecha]));S.reservas.forEach(r=>{r.fecha=tf[r.turnoId]||''});
  S.cfg=cfgFor(S.unidad);const eb=$('#eyebrow');if(eb)eb.textContent=`${S.unidad?uEmp(S.unidad)+' · ':''}Talento, Clima y Cultura`;if(S.admin&&S.adminPais)computeA();
  const c=S.cfg||{};
  const lim=c.limite?` · Elige antes del ${fmtF(c.limite).toLowerCase()}`:'';
  $('#season').innerHTML=`<b>${esc(c.nombre||'Turnos de apoyo en tienda')}</b>${(c.mensaje||lim)?`<span>${esc((c.mensaje||'')+lim)}</span>`:''}`;
  const st=$('#status');st.classList.toggle('off',!abiertas());st.querySelector('span').textContent=abiertas()?'Reservas abiertas':'Reservas cerradas';
  const pc=$('#pais-chip');pc.hidden=!S.unidad;if(S.unidad)pc.innerHTML=`${esc(uName(S.unidad))} <span style="color:var(--muted)">· Cambiar</span>`;
  $('#tab-admin').hidden=!(S.admin||S.wantAdmin);const rb=$('#rrhh-btn');if(rb)rb.hidden=S.admin||!S.started;
  $('#n-mios').textContent=misRes().filter(r=>r.fecha>=hoy()).length;
  renderGates();fillFilters();renderSteps();renderBooked();renderCal();renderDay();renderMios();
  if(S.admin||S.wantAdmin){renderAdminGate();if(S.adminPais&&S.admin){
    $('#c-tiendas').textContent=A.tiendas.length||'';$('#c-turnos').textContent=A.turnos.filter(t=>t.fecha>=hoy()).length||'';$('#c-personal').textContent=A.roster.length||'';const ca=$('#c-avisos');ca.textContent=A.avisos.length||'';ca.classList.toggle('hot',A.avisos.length>0);
    renderScope();renderResumen();renderTiendas();renderTurnos();renderPersonal();renderAsist();renderAvisos();renderCorreos();fillTurnoSelect();fillTemp();renderAcceso();
  }}
}
function showTab(t){S.tab=t;$$('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));['reservar','mios','admin'].forEach(v=>$('#v-'+v).hidden=v!==t)}
function showSub(s){S.sub=s;$$('#anav [data-sub]').forEach(b=>b.setAttribute('aria-selected',b.dataset.sub===s));$$('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==s)}

/* ---------- Colaborador ---------- */
function fillFilters(){
  const cs=[...new Set(S.tiendas.filter(t=>t.unidad===S.unidad).map(t=>t.ciudad))].sort();
  const fc=$('#f-ciudad'),cc=fc.value;
  fc.innerHTML='<option value="">Todas las ciudades</option>'+cs.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');fc.value=cs.includes(cc)?cc:'';fc.hidden=cs.length<2;
}
function paisBtns(attr){
  const emps=[...new Set(UORD.map(c=>uEmp(c)))];
  return emps.map(e=>`<div class="emp-group">${emps.length>1?`<div class="emp-h">${esc(e)}</div>`:''}<div class="paises">${UORD.filter(c=>uEmp(c)===e).map(c=>{const n=S.tiendas.filter(t=>t.unidad===c).length;
    return `<button class="pais-b" data-${attr}="${c}"><span class="c">${esc(e.toUpperCase())}</span><span class="n">${esc(PAISES[uPais(c)]||uPais(c))}</span><span class="s">${n} ${pl(n,'tienda')}</span></button>`}).join('')}</div></div>`).join('');
}
function renderGates(){
  const need=!S.unidad;$('#pais-gate').hidden=!need;$('#u-main').hidden=need;
  const una=new Set(UORD.map(uEmp)).size<2;
  if(need)$('#pais-gate').innerHTML=`<div class="eyebrow">Antes de empezar</div><h2>${una?'¿En qué país trabajas?':'¿Dónde trabajas?'}</h2><p>${una?'Elige tu país':'Elige tu empresa y país'}. Te mostramos solo sus tiendas y turnos. Puedes cambiarlo cuando quieras desde la cabecera.</p>${paisBtns('pais')}`;
}
function visibles(){
  const tm=tiendaMap(),p=S.unidad,c=$('#f-ciudad').value,h=hoy();
  return S.turnos.filter(t=>tm[t.tiendaId]&&t.fecha>=h&&tm[t.tiendaId].unidad===p&&(!c||tm[t.tiendaId].ciudad===c));
}
function datosOk(){return !!(S.perfil&&S.perfil.nombre.trim()&&S.perfil.area.trim())}
function renderSteps(){
  const d=datosOk(),proximos=misRes().filter(r=>r.fecha>=hoy()),r=proximos.length>0;
  const m=maxPP();
  $('#steps').innerHTML=[
    [d,'Completa tus datos','Nombre y área, una sola vez.'],
    [r,'Elige día y horario',r?(m===Infinity?`Tienes ${proximos.length} ${pl(proximos.length,'turno')}. Puedes elegir más.`:`Tienes ${proximos.length} de ${m} ${pl(m,'turno')}.`):'Los días con cupo están resaltados. Al reservar, tu cupo se bloquea.'],
    [false,'Agrégalo a tu Outlook','Y pulsa Enviar: así la tienda recibe la invitación.']
  ].map(([done,t,s],i)=>{const now=!done&&(i===0||(i===1&&d)||(i===2&&r));return `<div class="step ${done?'done':''} ${now?'now':''}"><div><b>${esc(t)}</b>${esc(s)}</div></div>`}).join('');
}
function dayStats(ts){
  const tot=ts.reduce((s,t)=>s+cupos(t),0),lib=ts.reduce((s,t)=>s+libres(t),0);
  return{tot,lib,occ:tot?Math.round((tot-lib)/tot*100):0,mine:ts.some(t=>resDe(t.id).some(r=>r.userId===S.uid))};
}
function renderCal(){
  const el=$('#cal');
  if(!S.ready){el.innerHTML='<div class="empty"><h3>Cargando turnos</h3>Un momento.</div>';$('#cal-title').textContent='Calendario';$('#prev').disabled=$('#next').disabled=true;return}
  const ts=visibles();
  if(!ts.length){
    el.innerHTML=`<div class="empty"><h3>Aún no hay turnos publicados</h3>${S.admin?'Crea tiendas y turnos en el Panel RRHH.':'Recursos Humanos publicará aquí las tiendas y horarios disponibles.'}</div>`;
    $('#cal-title').textContent='Calendario';$('#prev').disabled=$('#next').disabled=true;S.selDay=null;return}
  const byDay={};ts.forEach(t=>(byDay[t.fecha]=byDay[t.fecha]||[]).push(t));
  const days=Object.keys(byDay).sort();
  const months=[...new Set(days.map(d=>d.slice(0,7)))];
  if(!S.selDay||!byDay[S.selDay]){S.selDay=days.find(d=>dayStats(byDay[d]).lib>0)||days[0]}
  let key=S.calY!=null?`${S.calY}-${String(S.calM+1).padStart(2,'0')}`:S.selDay.slice(0,7);
  if(!months.includes(key))key=S.selDay.slice(0,7);
  S.calY=Number(key.slice(0,4));S.calM=Number(key.slice(5,7))-1;
  const mi=months.indexOf(key);$('#prev').disabled=mi<=0;$('#next').disabled=mi>=months.length-1;
  $('#cal-title').textContent=`${cap(MESES[S.calM])} ${S.calY}`;
  const first=new Date(S.calY,S.calM,1),lead=(first.getDay()+6)%7,nd=new Date(S.calY,S.calM+1,0).getDate(),h=hoy();
  let html=DOW.map(d=>`<div class="dow">${d}</div>`).join('')+'<div></div>'.repeat(lead);
  for(let d=1;d<=nd;d++){
    const f=ymd(new Date(S.calY,S.calM,d)),arr=byDay[f];
    if(!arr){html+=`<button class="dc ${f===h?'today':''}" disabled aria-label="${esc(fmtF(f))}, sin turnos"><span class="dn">${d}</span></button>`;continue}
    const s=dayStats(arr);
    html+=`<button class="dc ${s.lib?'':'full'} ${f===S.selDay?'sel':''} ${f===h?'today':''}" data-day="${f}" aria-pressed="${f===S.selDay}" aria-label="${esc(fmtF(f))}, ${s.lib} cupos libres">
      <span class="dn">${d}</span><span class="dl">${s.lib?`${s.lib}<span class="w"> ${pl(s.lib,'libre')}</span>`:'Lleno'}</span>
      <span class="bar"><i style="width:${s.occ}%"></i></span>${s.mine?'<span class="dot" title="Tienes turno este día"></span>':''}</button>`;
  }
  el.innerHTML=`<div class="cal">${html}</div>`;
}
function slotHTML(t){
  const rs=resDe(t.id),cup=cupos(t),mine=rs.some(r=>r.userId===S.uid),full=rs.length>=cup;
  const seats=Array.from({length:cup},(_,i)=>`<i class="${i<rs.length?'on':''}"></i>`).join('');
  let btn;
  if(mine)btn=`<button class="btn ghost small" data-act="cancel" data-id="${esc(t.id)}">Cancelar</button>`;
  else if(full)btn=`<button class="btn small" disabled>Completo</button>`;
  else btn=`<button class="btn small" data-act="book" data-id="${esc(t.id)}" ${abiertas()?'':'disabled'}>Reservar</button>`;
  const names=rs.length?`<span class="names">${rs.map(r=>esc(r.userId===S.uid?'Tú':nombreR(r))).join(', ')}</span>`:'<span>Nadie inscrito todavía</span>';
  return `<div class="slot ${mine?'mine':''} ${full&&!mine?'full':''}">
    <div class="time">${esc(t.inicio)}–${esc(t.fin)}</div>
    <div class="info"><span><span class="seats" title="${rs.length} de ${cup} cupos">${seats}</span> &nbsp;${libres(t)} ${pl(libres(t),'cupo libre','cupos libres')}${mine?(rs.find(r=>r.userId===S.uid).enOutlook?' · <span class="tag me">Tu turno</span>':' · <span class="tag lo">Falta agregar a Outlook</span>'):''}</span>${names}</div>
    ${btn}${mine&&!rs.find(r=>r.userId===S.uid).enOutlook?`<div class="cal-links"><a class="btn small" href="${esc(outlookUrl(t))}" target="_blank" rel="noopener" data-act="cal-open" data-id="${esc(rs.find(r=>r.userId===S.uid).id)}">Agregar a Outlook</a><span>${RECUERDA}</span></div>`:''}</div>`;
}
function renderDay(){
  const el=$('#day');if(!S.ready||!S.selDay){el.innerHTML='';return}
  const tm=tiendaMap(),ts=visibles().filter(t=>t.fecha===S.selDay);
  if(!ts.length){el.innerHTML='';return}
  const byT={};ts.forEach(t=>(byT[t.tiendaId]=byT[t.tiendaId]||[]).push(t));
  const groups=Object.entries(byT).map(([id,arr])=>({ti:tm[id],arr:arr.sort(sortT),prio:arr.some(t=>t.prioridad&&libres(t)>0),lib:arr.reduce((s,t)=>s+libres(t),0)}))
    .sort((a,b)=>(b.prio-a.prio)||((b.lib>0)-(a.lib>0))||a.ti.nombre.localeCompare(b.ti.nombre));
  const s=dayStats(ts);
  el.innerHTML=`<div class="day-h"><h2>${esc(fmtF(S.selDay))}</h2><span class="hint">${groups.length} ${pl(groups.length,'tienda')} · ${s.lib} ${pl(s.lib,'cupo libre','cupos libres')}</span></div>
    <div class="stores">${groups.map(g=>`<div class="store"><div class="store-h"><h3>${esc(g.ti.nombre)}</h3>${g.prio?'<span class="tag hi">Alta demanda</span>':''}
      <span class="loc">${esc(g.ti.ciudad)}, ${esc(PAISES[g.ti.pais]||g.ti.pais)}</span></div>${g.arr.map(slotHTML).join('')}</div>`).join('')}</div>`;
}
function renderBooked(){
  const el=$('#booked');const t=S.lastBooked&&S.turnos.find(x=>x.id===S.lastBooked);
  const mine=t&&S.reservas.some(r=>r.turnoId===t.id&&r.userId===S.uid);const c=t&&calData(t);
  if(!t||!mine||!c){el.hidden=true;return}
  el.hidden=false;
  el.innerHTML=`<div class="row" style="justify-content:space-between"><span class="eyebrow" style="color:var(--fg)">Cupo bloqueado</span><button class="btn ghost tiny" data-act="close-booked">Cerrar</button></div>
    <h3>${esc(c.ti.nombre)} · ${esc(fmtF(t.fecha))} · ${esc(t.inicio)}–${esc(t.fin)}</h3>
    <p>${c.ti.email?`Agrégalo a tu calendario. La invitación incluye a la tienda (<span class="sel-txt">${esc(c.ti.email)}</span>), así que también queda en su calendario.`:'Agrégalo a tu calendario. Esta tienda no tiene correo registrado, así que solo quedará en el tuyo.'}</p>
    <div class="row">${calButtons(t)}</div>
    <p class="hint">En Outlook pulsa Enviar. En Google pulsa Guardar y luego Enviar a los invitados.</p>`;
}
function renderMios(){
  const el=$('#mios');const tm=tiendaMap();const h=hoy();
  const ids=new Set(misRes().map(r=>r.turnoId));
  const ts=S.turnos.filter(t=>ids.has(t.id)&&tm[t.tiendaId]).sort(sortT);
  if(!ts.length){el.innerHTML='<div class="empty"><h3>No tienes turnos todavía</h3>Elige un día con cupo en la pestaña Elegir turno.</div>';return}
  el.innerHTML=ts.map(t=>{const ti=tm[t.tiendaId],d=parseF(t.fecha),past=t.fecha<h;
    return `<div class="mi ${past?'past':''}"><div class="dateblk"><div class="w">${esc(cap(DIAS[d.getDay()]).slice(0,3))}</div><div class="d">${d.getDate()}</div><div class="m">${esc(MESES[d.getMonth()].slice(0,3))}</div></div>
      <div style="min-width:0"><h3>${esc(ti.nombre)}</h3><div class="meta"><span class="mono" style="color:var(--fg)">${esc(t.inicio)}–${esc(t.fin)}</span><span>${esc(ti.ciudad)}, ${esc(PAISES[ti.pais]||ti.pais)}</span></div>
      ${past?'<span class="tag lo">Turno pasado</span>':(()=>{const r=misRes().find(x=>x.turnoId===t.id);return r&&r.enOutlook
        ?`<div class="row"><span class="tag hi">En tu Outlook</span>${calButtons(t)}<button class="btn ghost small" data-act="cancel" data-id="${esc(t.id)}">Cancelar turno</button></div>`
        :`<div class="row"><span class="tag lo">Falta agregar a Outlook</span><a class="btn small" href="${esc(outlookUrl(t))}" target="_blank" rel="noopener" data-act="cal-open" data-id="${esc(r?r.id:'')}">Agregar a Outlook</a><button class="btn ghost small" data-act="cancel" data-id="${esc(t.id)}">Cancelar turno</button></div><p class="hint" style="margin-top:8px">${RECUERDA}</p>`})()}</div></div>`}).join('');
}

/* ---------- RRHH ---------- */
function stats(){
  const h=hoy(),h7=addDays(h,7);const ts=A.turnos.filter(t=>t.fecha>=h);
  const tot=ts.reduce((s,t)=>s+cupos(t),0),occ=ts.reduce((s,t)=>s+Math.min(resDe(t.id).length,cupos(t)),0);
  const personas=new Set(A.reservas.filter(r=>r.fecha>=h).map(r=>r.userId)).size;
  const riesgo=ts.filter(t=>t.fecha<h7&&libres(t)>0).sort(sortT);
  const pasadas=A.reservas.filter(r=>r.fecha<h);const marc=pasadas.filter(r=>r.asistencia);const si=marc.filter(r=>r.asistencia==='si').length;
  const inscritos=new Set(A.reservas.map(r=>lc(r.email)).filter(Boolean));
  const pend=A.roster.filter(p=>!inscritos.has(lc(p.email)));
  return{ts,tot,occ,pct:tot?Math.round(occ/tot*100):0,personas,riesgo,pasadas,marc,si,pend,rosterN:A.roster.length};
}
function kpi(v,l,pct,lead){return `<div class="kpi ${lead?'lead':''}"><div class="v">${v}</div><div class="l">${esc(l)}</div>${pct!=null?`<div class="meter"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div>`:''}</div>`}
function renderResumen(){
  const s=stats();const na=A.avisos.length,nt=new Set(A.avisos.map(a=>a.tiendaId)).size;
  $('#avisos-banner').innerHTML=na?`<div class="banner"><span><b>${na} ${pl(na,'cambio')}</b>por avisar a ${nt} ${pl(nt,'tienda')}: cancelaciones, cambios de horario o turnos eliminados.</span><button class="btn small" data-sub="correos">Ver avisos</button></div>`:'';
  $('#kpis').innerHTML=kpi(`${s.pct}<small>%</small>`,'Cobertura de cupos',s.pct,true)+
    kpi(`${s.occ}<small> / ${s.tot}</small>`,'Cupos ocupados',s.tot?s.occ/s.tot*100:0)+
    kpi(s.rosterN?`${s.rosterN-s.pend.length}<small> / ${s.rosterN}</small>`:`${s.personas}`,s.rosterN?'Convocados con turno':'Personas inscritas',s.rosterN?(s.rosterN-s.pend.length)/s.rosterN*100:null)+
    kpi(`${s.riesgo.length}`,'Turnos con cupo libre esta semana',null);
  // heatmap
  const h=hoy(),dias=Array.from({length:21},(_,i)=>addDays(h,i));
  const cols=dias.filter(d=>A.turnos.some(t=>t.fecha===d));
  if(!A.tiendas.length||!cols.length){$('#heat').innerHTML='<p class="hint">Aparecerá cuando haya tiendas con turnos en los próximos 21 días.</p>'}
  else{
    const tiendas=[...A.tiendas].sort((a,b)=>(a.ciudad+a.nombre).localeCompare(b.ciudad+b.nombre));
    $('#heat').innerHTML=`<table class="heat"><thead><tr><th></th>${cols.map(d=>{const x=parseF(d);return `<th class="dh">${DOW[(x.getDay()+6)%7]}<b>${x.getDate()}</b></th>`}).join('')}</tr></thead><tbody>${
      tiendas.map(ti=>`<tr><th class="st">${esc(ti.nombre)}<div class="hint" style="font-size:11px">${esc(ti.ciudad)}</div></th>${cols.map(d=>{
        const ts=A.turnos.filter(t=>t.tiendaId===ti.id&&t.fecha===d);if(!ts.length)return '<td class="none">·</td>';
        const c=ts.reduce((s,t)=>s+cupos(t),0),o=ts.reduce((s,t)=>s+Math.min(resDe(t.id).length,cupos(t)),0),a=c?Math.round(12+88*o/c):12;
        return `<td class="${a>60?'hot':''}" style="--a:${a}%" title="${esc(ti.nombre)} · ${esc(fmtF(d))}: ${o} de ${c}">${o}/${c}</td>`}).join('')}</tr>`).join('')}</tbody></table>`;
  }
  const tm=tiendaMap();
  $('#risk').innerHTML=s.riesgo.length?s.riesgo.slice(0,8).map(t=>`<div class="risk-i"><span class="d">${esc(fmtF(t.fecha).split(' de ')[0])} · ${esc(t.inicio)}</span><span>${esc(tm[t.tiendaId]?.nombre||'')}${t.prioridad?' <span class="tag hi">Alta demanda</span>':''}</span><span class="mono">${libres(t)} ${pl(libres(t),'libre')}</span></div>`).join('')+(s.riesgo.length>8?`<p class="hint">Y ${s.riesgo.length-8} más.</p>`:''):'<p class="hint">Todos los turnos de los próximos 7 días están completos.</p>';
}
function renderTiendas(){
  const el=$('#tiendas-list');if(S.editTienda&&el.contains(document.activeElement))return;
  if(!A.tiendas.length){el.innerHTML=`<div class="empty"><h3>Sin tiendas</h3>Agrega la primera arriba o carga un ejemplo para probar el flujo.<div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" data-act="seed">Cargar ejemplo de prueba</button></div></div>`;return}
  const ts=[...A.tiendas].sort((a,b)=>(a.unidad+a.ciudad+a.nombre).localeCompare(b.unidad+b.ciudad+b.nombre));
  el.innerHTML=`<div class="card"><h3>${ts.length} ${pl(ts.length,'tienda')}</h3><div class="scroll"><table class="t"><thead><tr><th>Tienda</th><th>Ciudad</th><th>Correo</th><th></th></tr></thead><tbody>${ts.map(t=>S.editTienda===t.id?`<tr class="editing"><td><input type="text" id="ed-nombre" value="${esc(t.nombre)}" aria-label="Nombre de la tienda"></td><td><input type="text" id="ed-ciudad" value="${esc(t.ciudad)}" aria-label="Ciudad">${scopeUnits().length>1?`<select id="ed-pais" aria-label="Empresa y país" style="margin-top:6px">${scopeUnits().map(k=>`<option value="${k}" ${k===t.unidad?'selected':''}>${esc(uName(k))}</option>`).join('')}</select>`:''}</td><td><input type="email" id="ed-email" value="${esc(t.email||'')}" placeholder="tienda@empresa.com" aria-label="Correo de la tienda"></td><td><div class="row" style="gap:4px"><button class="btn tiny" data-act="save-tienda" data-id="${esc(t.id)}">Guardar</button><button class="btn ghost tiny" data-act="edit-cancel">Cancelar</button></div></td></tr>`
  :`<tr><td>${esc(t.nombre)}</td><td>${esc(t.ciudad)}<div class="hint">${esc(uName(t.unidad))}</div></td><td class="num">${t.email?esc(t.email):'<span class="hint">Sin correo: no recibirá invitación</span>'}</td><td><div class="row" style="gap:4px"><button class="btn ghost tiny" data-act="edit-tienda" data-id="${esc(t.id)}">Editar</button><button class="btn ghost tiny" data-act="del-tienda" data-id="${esc(t.id)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
}
function fillTurnoSelect(){
  const s=$('#tu-tienda'),cur=s.value;
  const ts=[...A.tiendas].sort((a,b)=>(a.ciudad+a.nombre).localeCompare(b.ciudad+b.nombre));
  const ciudades=[...new Set(ts.map(t=>t.ciudad))].sort();
  s.innerHTML=(ts.length?'<option value="*">Todas las tiendas</option>':'<option value="">Primero agrega tiendas</option>')+
    (ciudades.length>1?ciudades.map(c=>`<option value="c:${esc(c)}">Todas las tiendas de ${esc(c)}</option>`).join(''):'')+
    ts.map(t=>`<option value="${esc(t.id)}">${esc(t.nombre)} · ${esc(t.ciudad)}</option>`).join('');
  if([...s.options].some(o=>o.value===cur))s.value=cur;
  previewTurnos();
}
function fechasForm(){
  const d1=$('#tu-desde').value,d2=$('#tu-hasta').value;if(!d1||!d2||d2<d1)return[];
  const dias=new Set($$('#tu-dias input:checked').map(i=>Number(i.value)));
  const out=[];const d=parseF(d1),end=parseF(d2);
  while(d<=end&&out.length<120){if(dias.has(d.getDay()))out.push(ymd(d));d.setDate(d.getDate()+1)}
  return out;
}
function targetsForm(){
  const v=$('#tu-tienda').value;if(!v)return[];
  if(v==='*')return A.tiendas;if(v.startsWith('c:'))return A.tiendas.filter(t=>t.ciudad===v.slice(2));
  return A.tiendas.filter(t=>t.id===v);
}
function previewTurnos(){
  const f=fechasForm().length,t=targetsForm().length,n=f*t;const ex=new Set(S.turnos.map(x=>tKey(x.tiendaId,x.fecha,x.inicio,x.fin)));const ini=$('#tu-ini').value,fin=$('#tu-fin').value;
  let dup=0;if(n&&n<=2000)for(const x of targetsForm())for(const d of fechasForm())if(ex.has(tKey(x.id,d,ini,fin)))dup++;
  $('#tu-prev').textContent=n?`Se crearán ${n-dup} ${pl(n-dup,'turno')}: ${f} ${pl(f,'día')} × ${t} ${pl(t,'tienda')}${dup?` (${dup} ya ${pl(dup,'existe','existen')})`:''}.`:'';
}
function renderTurnos(){
  const el=$('#turnos-list');if(S.editTurno&&el.contains(document.activeElement))return;const tm=tiendaMap(),h=hoy();
  const ts=A.turnos.filter(t=>tm[t.tiendaId]&&t.fecha>=h).sort((a,b)=>sortT(a,b)||tm[a.tiendaId].nombre.localeCompare(tm[b.tiendaId].nombre));
  if(!ts.length){el.innerHTML='<div class="empty"><h3>Sin turnos próximos</h3>Crea el primer bloque con el formulario de arriba.</div>';return}
  el.innerHTML=`<div class="card"><h3>${ts.length} ${pl(ts.length,'turno próximo','turnos próximos')}</h3><div class="scroll"><table class="t"><thead><tr><th>Fecha</th><th>Tienda</th><th>Horario</th><th>Personas</th><th></th></tr></thead><tbody>${ts.map(t=>{const rs=resDe(t.id);
    if(S.editTurno===t.id)return `<tr class="editing"><td>${esc(fmtF(t.fecha))}</td><td>${esc(tm[t.tiendaId].nombre)}</td><td><div class="row" style="gap:4px;flex-wrap:nowrap"><input type="time" id="ed-ini" value="${esc(t.inicio)}" aria-label="Entrada"><input type="time" id="ed-fin" value="${esc(t.fin)}" aria-label="Salida"></div></td>
      <td><input type="number" id="ed-cup" min="${Math.max(1,rs.length)}" max="20" value="${cupos(t)}" aria-label="Personas por turno" style="width:80px"><div class="hint">${rs.length} ${pl(rs.length,'inscrita','inscritas')}</div></td>
      <td><div class="row" style="gap:4px"><button class="btn tiny" data-act="save-turno" data-id="${esc(t.id)}">Guardar</button><button class="btn ghost tiny" data-act="edit-cancel">Cancelar</button></div></td></tr>`;
    return `<tr><td>${esc(fmtF(t.fecha))}</td><td>${esc(tm[t.tiendaId].nombre)}${t.prioridad?' <span class="tag hi">Alta demanda</span>':''}</td><td class="num">${esc(t.inicio)}–${esc(t.fin)}</td>
    <td><span class="mono">${rs.length}/${cupos(t)}</span>${rs.map(r=>`<div class="row" style="gap:6px;margin-top:4px"><span>${esc(nombreR(r))}${r.enOutlook?'':' <span class="tag lo">Sin Outlook</span>'}</span><button class="btn ghost tiny" data-act="kick" data-id="${esc(r.id)}">Quitar</button></div>`).join('')}</td>
    <td><div class="row" style="gap:4px"><button class="btn ghost tiny" data-act="edit-turno" data-id="${esc(t.id)}">Editar</button><button class="btn ghost tiny" data-act="prio" data-id="${esc(t.id)}">${t.prioridad?'Quitar alta demanda':'Alta demanda'}</button><button class="btn ghost tiny" data-act="del-turno" data-id="${esc(t.id)}">Eliminar</button></div></td></tr>`}).join('')}</tbody></table></div></div>`;
}
function renderPersonal(){
  const s=stats();const el=$('#personal-list');
  $('#remind').hidden=!s.pend.length;
  $('#p-kpis').innerHTML=s.rosterN?kpi(`${s.rosterN-s.pend.length}<small> / ${s.rosterN}</small>`,'Ya eligieron turno',(s.rosterN-s.pend.length)/s.rosterN*100,true)+kpi(`${s.pend.length}`,'Pendientes',null):'';
  if(!s.rosterN){el.innerHTML='<div class="empty"><h3>Sin lista cargada</h3>Pega arriba la lista del personal administrativo convocado.</div>';return}
  const res=new Map();A.reservas.forEach(r=>{const k=lc(r.email);if(k)res.set(k,(res.get(k)||0)+1)});
  const rows=[...A.roster].sort((a,b)=>((res.get(lc(a.email))||0)>0)-((res.get(lc(b.email))||0)>0)||(a.area||'').localeCompare(b.area||'')||a.nombre.localeCompare(b.nombre));
  el.innerHTML=`<div class="card"><div class="scroll"><table class="t"><thead><tr><th>Persona</th><th>Área</th><th>Estado</th></tr></thead><tbody>${rows.map(p=>{const n=res.get(lc(p.email))||0;
    return `<tr><td>${esc(p.nombre||p.email)}<div class="hint mono">${esc(p.email)}</div></td><td>${esc(p.area||'—')}</td><td>${n?`<span class="tag hi">${n} ${pl(n,'turno')}</span>`:'<span class="tag lo">Pendiente</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}
function renderAsist(){
  const s=stats();const tm=tiendaMap();
  $('#as-kpis').innerHTML=kpi(s.marc.length?`${Math.round(s.si/s.marc.length*100)}<small>%</small>`:'—','Asistencia de turnos marcados',s.marc.length?s.si/s.marc.length*100:0,true)+
    kpi(`${s.marc.length}<small> / ${s.pasadas.length}</small>`,'Turnos pasados marcados',s.pasadas.length?s.marc.length/s.pasadas.length*100:0);
  const el=$('#asist-list');
  const rs=A.reservas.filter(r=>r.fecha<=hoy()).map(r=>({r,t:A.turnos.find(x=>x.id===r.turnoId)})).filter(x=>x.t&&tm[x.t.tiendaId]).sort((a,b)=>sortT(b.t,a.t));
  if(!rs.length){el.innerHTML='<div class="empty"><h3>Nada que marcar aún</h3>Los turnos aparecerán aquí desde el día en que ocurren.</div>';return}
  el.innerHTML=`<div class="card"><div class="scroll"><table class="t"><thead><tr><th>Fecha</th><th>Tienda</th><th>Persona</th><th>¿Asistió?</th></tr></thead><tbody>${rs.map(({r,t})=>`<tr><td>${esc(fmtF(t.fecha))}<div class="hint mono">${esc(t.inicio)}–${esc(t.fin)}</div></td><td>${esc(tm[t.tiendaId].nombre)}</td><td>${esc(nombreR(r))}${r.area?'<div class="hint">'+esc(r.area)+'</div>':''}</td>
    <td><span class="att"><button class="btn tiny ${r.asistencia==='si'?'on':'ghost'}" data-act="att" data-v="si" data-id="${esc(r.id)}">Sí</button><button class="btn tiny ${r.asistencia==='no'?'on':'ghost'}" data-act="att" data-v="no" data-id="${esc(r.id)}">No</button></span></td></tr>`).join('')}</tbody></table></div></div>`;
}
function correoDe(tienda){
  const h=hoy();const c=cfgFor(tienda.unidad);
  const ts=A.turnos.filter(t=>t.tiendaId===tienda.id&&t.fecha>=h&&resDe(t.id).length).sort(sortT);
  if(!ts.length)return null;
  const temp='Play the Game';
  let body=`Hola equipo ${tienda.nombre}:\n\nLes compartimos el personal administrativo que acompañará en tienda durante ${temp}:\n`;
  let last='',n=0;
  ts.forEach(t=>{if(t.fecha!==last){body+=`\n${fmtF(t.fecha)}\n`;last=t.fecha}
    resDe(t.id).forEach(r=>{n++;body+=`• ${t.inicio}–${t.fin} · ${nombreR(r)}${r.area?' ('+r.area+')':''}${r.email?' – '+r.email:''}\n`})});
  body+=`\nAdjuntamos el detalle en Excel.\n\nPor favor recíbanlos y asígnenles apoyo según la necesidad de la tienda. Cualquier ajuste lo coordinamos con Recursos Humanos.\n\nSaludos,\n${c.firma||firmaDef(tienda.unidad)}`;
  return{subject:`${temp} – Apoyo administrativo en ${tienda.nombre}`,body,n};
}
const TIPOS={cancelacion:'Canceló',retirado:'Retirado por RRHH',turno_eliminado:'Turno eliminado',cambio_horario:'Cambio de horario'};
function avisoDe(tienda,list){
  const c=cfgFor(tienda.unidad);const L=[...list].sort((a,b)=>sortT(a,b));const afectados=new Set();
  let body=`Hola equipo ${tienda.nombre}:\n\nHay cambios en el apoyo de Play the Game:\n`;
  L.forEach(a=>{const who=a.userId?nombreR(a)+(a.area?' ('+a.area+')':''):'';
    if(a.tipo==='cambio_horario'){body+=`\n• Cambio de horario – ${fmtF(a.fecha)}: antes ${a.antes}, ahora ${a.inicio}–${a.fin}${who?' · '+who:''}`;if(a.email)afectados.add(a.email)}
    else body+=`\n• ${TIPOS[a.tipo]||'Cambio'} – ${fmtF(a.fecha)}, ${a.inicio}–${a.fin}${who?' · '+who+' ya no asistirá':''}`});
  body+=`\n\nCualquier duda la coordinamos con Recursos Humanos.\n\nSaludos,\n${c.firma||firmaDef(tienda.unidad)}`;
  return{subject:`Play the Game – Cambios en el apoyo a ${tienda.nombre}`,body,n:L.length,afectados:[...afectados]};
}
function renderAvisos(){
  const el=$('#avisos');const tm=tiendaMap();
  const by={};A.avisos.forEach(a=>(by[a.tiendaId]=by[a.tiendaId]||[]).push(a));
  const ids=Object.keys(by);
  if(!ids.length){el.innerHTML='';return}
  el.innerHTML=`<div class="card-h" style="margin:0"><h3 style="margin:0">Cambios por avisar</h3><span class="hint">Cancelaciones, cambios de horario y turnos eliminados</span></div>`+ids.map(id=>{const t=tm[id],m=avisoDe(t,by[id]);
    return `<div class="mail aviso"><div class="to"><div><strong>${esc(t.nombre)}</strong> <span class="hint">· ${m.n} ${pl(m.n,'cambio')}</span><div class="sel-txt">${esc(t.email||'Sin correo registrado')}</div></div>
    <div class="row"><button class="btn small" data-act="copy-aviso" data-id="${esc(id)}">Copiar aviso</button><button class="btn ghost small" data-act="avisado" data-id="${esc(id)}">Marcar como enviado</button></div></div>
    <div class="hint">Asunto: <span style="user-select:all">${esc(m.subject)}</span></div><pre>${esc(m.body)}</pre>
    ${m.afectados.length?`<div class="hint">Avisa también del nuevo horario a: <span class="sel-txt">${esc(m.afectados.join(', '))}</span></div>`:''}</div>`}).join('')+'<div class="card-h" style="margin:8px 0 0"><h3 style="margin:0">Quiénes van a cada tienda</h3></div>';
}
const XCOLS=['Fecha','Día','Entrada','Salida','Colaborador','Área','Correo'];
function filasTienda(t){
  const h=hoy();
  return A.turnos.filter(x=>x.tiendaId===t.id&&x.fecha>=h).sort(sortT).flatMap(x=>{const d=parseF(x.fecha);
    return resDe(x.id).map(r=>[`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`,cap(DIAS[d.getDay()]),x.inicio,x.fin,nombreR(r),r.area||'',r.email||''])});
}
function hojaTienda(t){
  const aoa=[[`Play the Game – ${uEmp(t.unidad)} ${t.nombre}`],[`${t.ciudad}, ${PAISES[t.pais]||t.pais} · Actualizado al ${fmtF(hoy()).toLowerCase()}`],[],XCOLS,...filasTienda(t)];
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:12},{wch:11},{wch:9},{wch:9},{wch:28},{wch:20},{wch:32}];ws['!autofilter']={ref:`A4:G${Math.max(4,aoa.length)}`};return ws;
}
function sheetName(n,used){const b=(n.replace(/[\[\]:*?\/\\]/g,' ').trim()||'Tienda').slice(0,31);let s=b,i=2;while(used.has(s)){s=b.slice(0,27)+' ('+(i++)+')'}used.add(s);return s}
const fileSafe=n=>n.replace(/[\\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim();
function renderCorreos(){
  const el=$('#correos');
  const items=A.tiendas.map(t=>({t,m:correoDe(t)})).filter(x=>x.m);
  if(!items.length){el.innerHTML='<div class="empty"><h3>Nada que enviar aún</h3>Cuando alguien reserve, aquí aparecerá el correo para su tienda.</div>';return}
  el.innerHTML=items.map(({t,m})=>`<div class="mail"><div class="to"><div><strong>${esc(t.nombre)}</strong> <span class="hint">· ${m.n} ${pl(m.n,'persona')}</span><div class="sel-txt">${esc(t.email||'Sin correo registrado')}</div></div>
    <div class="row"><button class="btn small" data-act="copy" data-id="${esc(t.id)}">Copiar correo</button><button class="btn ghost small" data-act="xls" data-id="${esc(t.id)}">Descargar Excel</button></div></div>
    <div class="hint">Asunto: <span style="user-select:all">${esc(m.subject)}</span></div><pre>${esc(m.body)}</pre></div>`).join('');
}
let tempFilled=false;
function fillTemp(){
  if(tempFilled&&$('#f-temp').contains(document.activeElement))return;
  const c=S.cfgs[cfgKey()]||{};
  $('#te-nombre').value=c.nombre||'';$('#te-max').value=c.maxPorPersona||'';$('#te-abiertas').value=c.abiertas===false?'0':'1';$('#te-msg').value=c.mensaje||'';$('#te-firma').value=c.firma||'';$('#te-limite').value=c.limite||'';
  tempFilled=true;
}

// =====================================================================
// Play the Game · lógica nueva para Vercel + Supabase
// (login, datos, roles por correo, acciones). Las funciones de dibujo
// vienen de src/render.js.
// =====================================================================

/* ---------- Supabase: lectura ---------- */
const q=async p=>{const{data,error}=await p;if(error)throw error;return data};
async function fetchAll(table,cols,build){
  const out=[];const step=1000;
  for(let from=0;;from+=step){
    let qb=sb.from(table).select(cols).range(from,from+step-1);if(build)qb=build(qb);
    const d=await q(qb);out.push(...d);if(d.length<step)break;
  }
  return out;
}
const hhmm=t=>String(t||'').slice(0,5);
function cfgRow(r){const o={abiertas:r.abiertas!==false};if(r.nombre)o.nombre=r.nombre;if(r.mensaje)o.mensaje=r.mensaje;if(r.firma)o.firma=r.firma;if(r.limite)o.limite=r.limite;if(r.max_por_persona>0)o.maxPorPersona=r.max_por_persona;return o}
async function reload(k){
  switch(k){
    case 'unidades':{const rows=await q(sb.from('unidades').select('codigo,empresa,pais,orden').order('orden'));U=Object.fromEntries(rows.map(r=>[r.codigo,r]));UORD=rows.map(r=>r.codigo);break}
    case 'tiendas':S.tiendas=(await fetchAll('tiendas','id,nombre,ciudad,unidad,email')).map(t=>({...t,pais:uPais(t.unidad)}));break;
    case 'turnos':{const desde=addDays(hoy(),-90);
      S.turnos=(await fetchAll('turnos','id,tienda_id,fecha,inicio,fin,cupos,prioridad',qb=>qb.gte('fecha',desde)))
        .map(t=>({id:t.id,tiendaId:t.tienda_id,fecha:t.fecha,inicio:hhmm(t.inicio),fin:hhmm(t.fin),cupos:t.cupos,prioridad:t.prioridad}));break}
    case 'reservas':S.reservas=(await fetchAll('reservas','id,turno_id,user_id,email,nombre,area,asistencia,en_outlook,creado'))
        .map(r=>({id:r.id,turnoId:r.turno_id,userId:r.user_id,email:r.email,nombre:r.nombre,area:r.area,asistencia:r.asistencia,enOutlook:!!r.en_outlook,creado:r.creado}));break;
    case 'config':S.cfgs=Object.fromEntries((await q(sb.from('config').select('*'))).map(r=>[r.unidad,cfgRow(r)]));tempFilled=false;break;
    case 'avisos':if(!S.admin)return;S.avisos=(await fetchAll('avisos','id,tipo,tienda_id,unidad,turno_id,fecha,inicio,fin,user_id,email,nombre,area,antes,enviado',qb=>qb.eq('enviado',false)))
        .map(a=>({id:a.id,tipo:a.tipo,tiendaId:a.tienda_id,unidad:a.unidad,turnoId:a.turno_id,fecha:a.fecha,inicio:hhmm(a.inicio),fin:hhmm(a.fin),userId:a.user_id,email:a.email,nombre:a.nombre,area:a.area,antes:a.antes,enviado:a.enviado}));break;
    case 'convocados':if(!S.admin)return;S.rosters=Object.fromEntries((await q(sb.from('convocados').select('pais,personas'))).map(r=>[r.pais,Array.isArray(r.personas)?r.personas:[]]));break;
    case 'admins':if(!S.owner)return;S.equipo=(await q(sb.from('admins').select('email,pais,hasta').order('pais').order('email'))).filter(r=>!r.hasta||new Date(r.hasta)>new Date());S.pinEstado=(await q(sb.rpc('pin_estado')))||[];S.dominios=(await q(sb.from('dominios').select('dominio').order('dominio'))).map(d=>d.dominio);break;
  }
}
const timers={};
function sched(k){clearTimeout(timers[k]);timers[k]=setTimeout(async()=>{try{await reload(k);paint()}catch(_){}} ,250)}
async function refresh(...ks){try{await Promise.all(ks.map(reload))}catch(e){toast(errMsg(e))}paint()}

/* ---------- Errores ---------- */
const RPC_MSG={LLENO:'Ese turno se llenó hace un momento. Elige otro.',CRUCE:'Ya tienes un turno que se cruza con ese horario.',MAX:'Llegaste al máximo de turnos permitido. Cancela uno para elegir otro.',CERRADAS:'Las reservas están cerradas por ahora.',YA:'Ya estás inscrito en ese turno.',SIN_PERFIL:'Completa tu nombre y área antes de reservar.',PASADO:'Ese turno ya pasó.',NO_TURNO:'Ese turno ya no existe.',CUPOS_MENORES:'Hay más personas inscritas que esos cupos. Quita a alguien antes de bajarlos.',NO_AUTH:'Tu sesión expiró. Vuelve a entrar.',PIN_INVALIDO:'El PIN debe tener de 4 a 6 números.',NO_REGIONAL:'Solo RRHH regional puede cambiar los PIN.',NO_RESERVA:'No encontramos esa reserva. Recarga la página.',UNIDAD_INVALIDA:'Esa empresa y país no existe.',PAIS_INVALIDO:'Ese país no existe en la app.'};
function errMsg(e){
  const m=String(e?.message||'');for(const k in RPC_MSG)if(m.includes(k))return RPC_MSG[k];
  if(e?.code==='23505')return 'Eso ya existe.';
  if(e?.code==='42501'||/row-level security|permission denied/i.test(m))return 'No tienes permiso para esto.';
  if(e?.code==='PGRST301'||/JWT/i.test(m))return 'Tu sesión expiró. Recarga la página.';
  return 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
}

/* ---------- Descargas ---------- */
function descargar(filename,blob){
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function saveXlsx(wb,filename){
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  descargar(filename,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
}

/* ---------- Perfil del colaborador ---------- */
let perfilT;
async function savePerfil(now){
  clearTimeout(perfilT);
  const run=async()=>{try{await q(sb.from('perfiles').upsert({user_id:S.uid,email:S.email,nombre:S.perfil.nombre.trim(),area:S.perfil.area.trim(),unidad:S.perfil.unidad||null,actualizado:new Date().toISOString()}))}catch(e){toast(errMsg(e))}};
  if(now)return run();perfilT=setTimeout(run,600);
}

/* ---------- RRHH: acceso por país ---------- */
async function loadRole(){
  const rows=(await q(sb.from('admins').select('pais,hasta').eq('email',S.email))).filter(r=>!r.hasta||new Date(r.hasta)>new Date());
  S.owner=rows.some(r=>r.pais==='*');S.grants=rows.filter(r=>r.pais!=='*').map(r=>r.pais);S.admin=S.owner||S.grants.length>0;
  const rl=$('#role');rl.hidden=false;rl.textContent=S.admin?'Recursos Humanos':'Colaborador';
}
function countryBtns(attr){return PAISORD().map(p=>{const n=S.tiendas.filter(t=>t.pais===p).length;
  return `<button class="pais-b" data-${attr}="${p}"><span class="c">${esc(empsDe(p).join(' · ').toUpperCase())}</span><span class="n">${esc(PAISES[p]||p)}</span><span class="s">${n} ${pl(n,'tienda')}</span></button>`}).join('')}
function renderAdminGate(){
  const g=$('#a-gate'),m=$('#a-main');
  if(S.adminPais&&S.admin){g.hidden=true;m.hidden=false;g.dataset.k='';return}
  g.hidden=false;m.hidden=true;
  const key=S.pinFor?`pin:${S.pinFor}`:`list:${S.owner}:${S.grants.join('')}:${S.tiendas.map(t=>t.unidad).join('')}:${UORD.join('')}`;
  if(g.dataset.k===key)return;g.dataset.k=key;
  if(S.pinFor){
    g.innerHTML=`<div class="eyebrow">Panel RRHH · ${esc(paisName(S.pinFor))}</div><h2>Ingresa el PIN</h2><p>Escribe el PIN de Recursos Humanos de ${esc(paisName(S.pinFor))}. Gestionarás ${esc(empsDe(S.pinFor).join(' y '))} de ese país. Queda activo por 12 horas en tu cuenta.</p>
      <form class="pin-form" id="pin-form"><input type="password" id="pin-in" inputmode="numeric" autocomplete="off" maxlength="6" aria-label="PIN" required><button class="btn" type="submit" id="pin-go">Entrar</button></form>
      <button class="btn ghost small" data-act="pin-back">Elegir otro país</button>`;
    setTimeout(()=>$('#pin-in')?.focus(),30);return;
  }
  g.innerHTML=S.owner
    ?`<div class="eyebrow">Panel RRHH · Regional</div><h2>¿Qué vas a gestionar?</h2><p>Como RRHH regional entras sin PIN a todo o a cualquier país.</p>
      <div class="paises"><button class="pais-b reg" data-apais="*"><span class="c">REGIONAL</span><span class="n">Todo</span><span class="s">Todos los países</span></button>${countryBtns('apais')}</div>`
    :`<div class="eyebrow">Panel RRHH</div><h2>¿Qué país vas a gestionar?</h2><p>Cada país entra con su propio PIN y gestiona solo sus tiendas.</p><div class="paises">${countryBtns('apais')}</div>`;
}
function renderScope(){
  $('#a-scope').innerHTML=`<span class="lbl">Gestionando</span><span class="n">${esc(scopeName())}</span>${S.adminPais!=='*'?`<span class="hint" style="font-size:12px">${esc(empsDe(S.adminPais).join(' y '))}</span>`:''}<button class="btn ghost tiny" data-act="a-change">${S.owner?'Cambiar':'Salir del panel'}</button>`;
  $('#nav-acceso').hidden=!S.owner;
  const su=scopeUnits(),sel=$('#ti-pais');if(sel.dataset.k!==su.join()){sel.dataset.k=su.join();sel.innerHTML=su.map(k=>`<option value="${k}">${esc(uName(k))}</option>`).join('')}
  const reg=S.adminPais==='*';$('#ti-pais-f').hidden=su.length<2;
  $('#roster-go').disabled=reg;$('#roster-go').title=reg?'Elige una empresa y país para cargar su lista':'';
  $('#temp-desc').textContent=reg?'Valores por defecto para todas las empresas. Cada empresa y país puede ajustarlos en su propio panel.':`Lo que ve el equipo de ${scopeName()} en la cabecera y sus reglas de reserva.`;
}
function renderAcceso(){
  if(!S.owner)return;
  const pl2=$('#pines-list');
  if(!pl2.contains(document.activeElement))pl2.innerHTML=PAISORD().map(k=>[k,`${PAISES[k]||k} · ${empsDe(k).join(' y ')}`]).map(([k,v])=>{const ok=S.pinEstado.includes(k);return `<div class="pin-row"><strong>${esc(v)}</strong>${ok?'<span class="tag hi">Configurado</span>':'<span class="tag lo">Sin PIN</span>'}<input type="password" inputmode="numeric" maxlength="6" id="pin-${k}" placeholder="4 a 6 dígitos" aria-label="Nuevo PIN para ${esc(v)}"><button class="btn small" data-act="pin-save" data-id="${k}">${ok?'Cambiar':'Guardar'}</button></div>`}).join('');
  const rows=(S.equipo||[]).filter(r=>r.pais!=='*');const el=$('#equipo-list');
  el.innerHTML=rows.length?`<table class="t"><thead><tr><th>Correo</th><th>Gestiona</th><th>Activo hasta</th><th></th></tr></thead><tbody>${rows.map(r=>{const h=r.hasta?new Date(r.hasta):null;
    return `<tr><td class="num">${esc(r.email)}</td><td>${esc(PAISES[r.pais]||r.pais)}</td><td class="num">${h?`${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')} · ${h.getDate()}/${h.getMonth()+1}`:'Permanente'}</td><td><button class="btn ghost tiny" data-act="del-admin" data-id="${esc(r.email)}|${esc(r.pais)}">Quitar acceso</button></td></tr>`}).join('')}</tbody></table>`
    :'<p class="hint">Nadie ha entrado con PIN en las últimas 12 horas.</p>';
  const dl=$('#dominios-list');
  dl.innerHTML=(S.dominios||[]).length?(S.dominios.map(d=>`<span class="tag me" style="font-size:12px;text-transform:none;letter-spacing:0">@${esc(d)} <button class="btn ghost tiny" style="margin-left:4px;padding:0 6px" data-act="del-dominio" data-id="${esc(d)}" aria-label="Quitar ${esc(d)}">×</button></span>`).join(' ')):'<span class="hint">Todavía no hay dominios: solo RRHH regional puede entrar. Agrega el dominio de correo de la empresa para que entren los colaboradores.</span>';
}
async function unlock(p){S.adminPais=p;S.pinFor=null;ss.set('ptg-admin',p);tempFilled=false;showSub('resumen');await refresh('avisos','convocados','admins')}

/* ---------- Acciones ---------- */
async function reservar(tid,btn){
  if(S.busy)return;const t=S.turnos.find(x=>x.id===tid);if(!t)return;
  if(!abiertas())return toast('Las reservas están cerradas por ahora.');
  if(!datosOk()){$(!S.perfil.nombre.trim()?'#nombre':'#area').focus();return toast('Completa tu nombre y área antes de reservar.')}
  const mias=misRes().filter(r=>r.fecha>=hoy());
  if(mias.length>=maxPP())return toast(`Ya tienes ${mias.length} de ${maxPP()} ${pl(maxPP(),'turno')}. Cancela uno para elegir otro.`);
  const choque=mias.map(r=>S.turnos.find(x=>x.id===r.turnoId)).filter(x=>x&&x.fecha===t.fecha).find(x=>toMin(x.inicio)<toMin(t.fin)&&toMin(t.inicio)<toMin(x.fin));
  if(choque)return toast('Ya tienes un turno que se cruza con ese horario.');
  S.busy=true;btn.disabled=true;btn.textContent='Reservando…';
  try{
    await savePerfil(true);
    await q(sb.rpc('reservar',{p_turno:tid}));
    await reload('reservas');S.modalDone=null;openCalModal();
  }catch(e){toast(errMsg(e));await reload('reservas').catch(()=>{})}
  finally{S.busy=false;paint()}
}
/* ---------- Agregar a Outlook ---------- */
const RECUERDA='Por favor, no olvides pulsar <b>Enviar</b> en Outlook: así la invitación le llega a la tienda y el turno queda en tu calendario.';
function openCalModal(){const r=miPend();if(!r){closeCalModal();return}S.modalRes=r.id;S.modalDone=null;renderCalModal();$('#cal-modal').hidden=false;document.body.style.overflow='hidden'}
function closeCalModal(){$('#cal-modal').hidden=true;document.body.style.overflow='';S.modalRes=null;S.modalDone=null}
function renderCalModal(){
  const box=$('#cal-modal-box');
  const r=S.reservas.find(x=>x.id===S.modalRes),t=r&&S.turnos.find(x=>x.id===r.turnoId),c=t&&calData(t);if(!c){box.innerHTML='';return}
  if(S.modalDone){
    box.innerHTML=`<div class="eyebrow">Turno reservado</div><h2>¡Nos vemos en tienda!</h2>
      <div class="cal-sum"><b>${esc(c.ti.nombre)}</b><span>${esc(fmtF(t.fecha))} · ${esc(t.inicio)}–${esc(t.fin)}</span></div>
      <p class="cal-warn">${RECUERDA}</p>
      <button class="btn big" data-act="cal-close">Entendido</button>`;return}
  box.innerHTML=`<div class="eyebrow">Turno reservado · falta un paso</div>
    <h2>Agrégalo a tu Outlook</h2>
    <div class="cal-sum"><b>${esc(c.ti.nombre)}</b><span>${esc(fmtF(t.fecha))} · ${esc(t.inicio)}–${esc(t.fin)}</span></div>
    <p class="hint" style="margin:0">El evento ya viene lleno${c.ti.email?' y la tienda va como invitada':''}.</p>
    <a class="btn big" href="${esc(outlookUrl(t))}" target="_blank" rel="noopener" data-act="cal-open" data-id="${esc(r.id)}">Agregar a Outlook</a>
    <p class="cal-warn">${RECUERDA}</p>
    <div class="row" style="justify-content:space-between">
      <a class="link-sm" href="${esc(googleUrl(t))}" target="_blank" rel="noopener" data-act="cal-open" data-id="${esc(r.id)}">Uso Google Calendar</a>
      <button class="link-sm" data-act="cal-close">Lo haré después</button></div>`;
}
async function cancelar(tid){
  const r=S.reservas.find(x=>x.turnoId===tid&&x.userId===S.uid);if(!r)return;
  try{await q(sb.from('reservas').delete().eq('id',r.id));if(S.lastBooked===tid)S.lastBooked=null;
    toast('Turno cancelado. Borra también el evento de tu calendario: así la tienda recibe la cancelación.')}catch(e){toast(errMsg(e))}
  await refresh('reservas');
}
async function addTienda(d){
  if(S.tiendas.some(t=>sKey(t.nombre,t.ciudad,t.unidad)===sKey(d.nombre,d.ciudad,d.unidad)))return null;
  const r=await q(sb.from('tiendas').insert({nombre:d.nombre,ciudad:d.ciudad,unidad:d.unidad,email:d.email||''}).select('id').single());
  S.tiendas.push({id:r.id,nombre:d.nombre,ciudad:d.ciudad,unidad:d.unidad,pais:uPais(d.unidad),email:d.email||''});return r;
}
async function insertTurnos(rows){
  let n=0;for(let i=0;i<rows.length;i+=200){const d=await q(sb.from('turnos').upsert(rows.slice(i,i+200),{onConflict:'tienda_id,fecha,inicio,fin',ignoreDuplicates:true}).select('id'));n+=d.length}
  return n;
}
async function seed(){
  const base=hoy();
  try{
    const P=scopeUnits()[0];const ej=[['Tienda Ejemplo Norte (ejemplo)','Ciudad A',P],['Tienda Ejemplo Sur (ejemplo)','Ciudad A',P],['Tienda Ejemplo Mall (ejemplo)','Ciudad B',P]];
    const rows=[];
    for(const[n,c,p]of ej){const ref=await addTienda({nombre:n,ciudad:c,unidad:p});if(!ref)continue;
      for(let k=2;k<9;k++)rows.push({tienda_id:ref.id,fecha:addDays(base,k),inicio:'17:00',fin:'19:00',cupos:2,prioridad:k%3===0})}
    await insertTurnos(rows);
    toast('Ejemplo cargado: 3 tiendas y 21 turnos. Elimínalo antes de cargar las tiendas reales.');
  }catch(e){toast(errMsg(e))}
  await refresh('tiendas','turnos');
}
function csv(){
  const tm=tiendaMap();const qq=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['Fecha','Empresa','Tienda','Ciudad','País','Entrada','Salida','Colaborador','Correo','Área','Asistió']];
  A.reservas.map(r=>({r,t:S.turnos.find(x=>x.id===r.turnoId)})).filter(x=>x.t&&tm[x.t.tiendaId]).sort((a,b)=>sortT(a.t,b.t))
    .forEach(({r,t})=>{const ti=tm[t.tiendaId];rows.push([t.fecha,uEmp(ti.unidad),ti.nombre,ti.ciudad,PAISES[ti.pais]||ti.pais,t.inicio,t.fin,nombreR(r),r.email||'',r.area||'',r.asistencia==='si'?'Sí':r.asistencia==='no'?'No':''])});
  return '﻿'+rows.map(r=>r.map(qq).join(';')).join('\r\n');
}
async function copyText(txt,fallbackEl){
  try{await navigator.clipboard.writeText(txt);toast('Copiado.')}
  catch(_){if(fallbackEl){const rg=document.createRange();rg.selectNodeContents(fallbackEl);const s=getSelection();s.removeAllRanges();s.addRange(rg)}toast('Texto seleccionado. Cópialo con Ctrl+C.')}
}

/* ---------- Eventos ---------- */
document.addEventListener('click',async e=>{
  const tab=e.target.closest('[data-tab]');if(tab){S.tabTouched=true;showTab(tab.dataset.tab);return}
  const sub=e.target.closest('[data-sub]');if(sub){showSub(sub.dataset.sub);return}
  const day=e.target.closest('[data-day]');if(day){S.selDay=day.dataset.day;renderCal();renderDay();return}
  if(e.target.closest('#pais-chip')){S.unidad=null;showTab('reservar');paint();return}
  const pb=e.target.closest('[data-pais]');if(pb){S.unidad=S.perfil.unidad=pb.dataset.pais;savePerfil(true);S.selDay=null;S.calY=null;$('#f-ciudad').value='';paint();return}
  const ab=e.target.closest('[data-apais]');if(ab){const p=ab.dataset.apais;if(S.owner||S.grants.includes(p))unlock(p);else{S.pinFor=p;renderAdminGate()}return}
  if(e.target.closest('#rrhh-btn')){S.wantAdmin=true;S.tabTouched=true;paint();showTab('admin');return}
  const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id,act=b.dataset.act;
  if(act==='logout'){await sb.auth.signOut();location.reload();return}
  if(act==='book')return reservar(id,b);
  if(act==='cal-open'){if(id){const inModal=!!b.closest('#cal-modal');q(sb.rpc('confirmar_calendario',{p_reserva:id})).then(()=>reload('reservas')).then(()=>{paint();if(inModal&&S.modalRes===id){S.modalDone=true;renderCalModal()}}).catch(()=>{})}return}
  if(act==='cal-close'){closeCalModal();return}
  if(act==='a-change'){const p=S.adminPais;S.adminPais=null;S.pinFor=null;ss.set('ptg-admin',null);
    if(!S.owner&&p&&p!=='*'){try{await q(sb.rpc('salir_rrhh',{p_pais:p}));await loadRole();S.wantAdmin=true}catch(err){toast(errMsg(err))}}
    paint();return}
  if(act==='pin-back'){S.pinFor=null;renderAdminGate();return}
  if(act==='pin-save'){const i=$('#pin-'+id),v=i?i.value.trim():'';if(!/^\d{4,6}$/.test(v))return toast('El PIN debe tener de 4 a 6 números.');
    try{await q(sb.rpc('set_pin',{p_pais:id,p_pin:v}));i.value='';toast(`PIN de ${paisName(id)} guardado. Quien estaba dentro con el PIN anterior tendrá que volver a entrar.`)}catch(err){toast(errMsg(err))}
    await refresh('admins');return}
  if(/^(edit-|save-)/.test(act)&&document.activeElement&&document.activeElement.blur)document.activeElement.blur();
  if(act==='edit-tienda'){S.editTienda=id;S.editTurno=null;renderTiendas();setTimeout(()=>$('#ed-nombre')?.focus(),20);return}
  if(act==='edit-turno'){S.editTurno=id;S.editTienda=null;renderTurnos();setTimeout(()=>$('#ed-ini')?.focus(),20);return}
  if(act==='edit-cancel'){S.editTienda=S.editTurno=null;paint();return}
  if(act==='save-tienda'){const t=S.tiendas.find(x=>x.id===id);if(!t)return;
    const d={nombre:$('#ed-nombre').value.trim(),ciudad:$('#ed-ciudad').value.trim(),email:$('#ed-email').value.trim(),unidad:$('#ed-pais')?$('#ed-pais').value:t.unidad};
    if(!d.nombre||!d.ciudad)return toast('La tienda necesita nombre y ciudad.');
    if(d.email&&!okMail(d.email))return toast('Revisa el correo de la tienda.');
    if(S.tiendas.some(x=>x.id!==id&&sKey(x.nombre,x.ciudad,x.unidad)===sKey(d.nombre,d.ciudad,d.unidad)))return toast('Ya existe una tienda con ese nombre en esa ciudad.');
    b.disabled=true;try{await q(sb.from('tiendas').update(d).eq('id',id));S.editTienda=null;toast('Tienda actualizada.')}catch(err){toast(errMsg(err))}
    await refresh('tiendas');return}
  if(act==='save-turno'){const t=S.turnos.find(x=>x.id===id);if(!t)return;
    const ini=$('#ed-ini').value,fin=$('#ed-fin').value,cup=Number($('#ed-cup').value)||1,rs=resDe(id);
    if(!ini||!fin||toMin(fin)<=toMin(ini))return toast('La salida debe ser después de la entrada.');
    if(cup<rs.length)return toast(`Ya hay ${rs.length} ${pl(rs.length,'persona inscrita','personas inscritas')}. Quita a alguien antes de bajar los cupos.`);
    if(cup>20)return toast('Máximo 20 personas por turno.');
    if(S.turnos.some(x=>x.id!==id&&tKey(x.tiendaId,x.fecha,x.inicio,x.fin)===tKey(t.tiendaId,t.fecha,ini,fin)))return toast('Ya existe un turno igual en esa tienda y fecha.');
    const cambia=ini!==t.inicio||fin!==t.fin;b.disabled=true;
    try{await q(sb.from('turnos').update({inicio:ini,fin,cupos:cup}).eq('id',id));S.editTurno=null;
      toast(cambia&&rs.length?'Turno actualizado. Quedó un aviso para la tienda y las personas inscritas.':'Turno actualizado.')}catch(err){toast(errMsg(err))}
    await refresh('turnos','avisos');return}
  if(act==='close-booked'){S.lastBooked=null;renderBooked();return}
  if(act==='seed'){b.disabled=true;return seed()}
  if(act==='xls'){const t=S.tiendas.find(x=>x.id===id);if(!t)return;const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,hojaTienda(t),sheetName(t.nombre,new Set()));return saveXlsx(wb,`Play the Game - ${fileSafe(t.nombre)}.xlsx`)}
  if(act==='copy'){const t=S.tiendas.find(x=>x.id===id),m=t&&correoDe(t);if(!m)return;return copyText(`Para: ${t.email||''}\nAsunto: ${m.subject}\n\n${m.body}`,b.closest('.mail').querySelector('pre'))}
  if(act==='copy-aviso'){const t=S.tiendas.find(x=>x.id===id),m=t&&avisoDe(t,A.avisos.filter(a=>a.tiendaId===id));if(!m)return;return copyText(`Para: ${t.email||''}\nAsunto: ${m.subject}\n\n${m.body}`,b.closest('.mail').querySelector('pre'))}
  if(act==='avisado'){b.disabled=true;try{await q(sb.from('avisos').update({enviado:true,enviado_en:new Date().toISOString()}).eq('tienda_id',id).eq('enviado',false));toast('Aviso marcado como enviado.')}catch(err){toast(errMsg(err))}await refresh('avisos');return}
  if(act==='att'){const r=S.reservas.find(x=>x.id===id);try{await q(sb.from('reservas').update({asistencia:r&&r.asistencia===b.dataset.v?null:b.dataset.v}).eq('id',id))}catch(err){toast(errMsg(err))}await refresh('reservas');return}
  if(act==='prio'){const t=S.turnos.find(x=>x.id===id);try{await q(sb.from('turnos').update({prioridad:!(t&&t.prioridad)}).eq('id',id))}catch(err){toast(errMsg(err))}await refresh('turnos');return}
  if(act==='del-dominio'){try{await q(sb.from('dominios').delete().eq('dominio',id));toast('Dominio quitado.')}catch(err){toast(errMsg(err))}await refresh('admins');return}
  if(['del-tienda','del-turno','kick','cancel','del-admin'].includes(act)){
    if(!b.classList.contains('armed')){b.classList.add('armed');b.dataset.t=b.textContent;b.textContent=act==='cancel'?'¿Cancelar?':'¿Seguro?';setTimeout(()=>{if(b.isConnected){b.classList.remove('armed');b.textContent=b.dataset.t}},3500);return}
    b.disabled=true;
    try{
      if(act==='cancel')return cancelar(id);
      if(act==='kick'){await q(sb.from('reservas').delete().eq('id',id));toast('Persona retirada. Quedó un aviso para la tienda en Correos a tiendas.')}
      if(act==='del-turno'){const n=resDe(id).length;await q(sb.from('turnos').delete().eq('id',id));toast(n?'Turno eliminado. Quedó un aviso para la tienda en Correos a tiendas.':'Turno eliminado.')}
      if(act==='del-tienda'){await q(sb.from('tiendas').delete().eq('id',id));toast('Tienda eliminada con sus turnos.')}
      if(act==='del-admin'){const[em,pa]=id.split('|');await q(sb.from('admins').delete().eq('email',em).eq('pais',pa));toast('Acceso quitado. Tendrá que volver a escribir el PIN.')}
    }catch(err){toast(errMsg(err))}
    await refresh('tiendas','turnos','reservas','avisos','admins');
  }
});
$('#prev').addEventListener('click',()=>{S.calM--;if(S.calM<0){S.calM=11;S.calY--}renderCal()});
$('#next').addEventListener('click',()=>{S.calM++;if(S.calM>11){S.calM=0;S.calY++}renderCal()});
$('#f-ciudad').addEventListener('change',()=>{renderCal();renderDay()});
for(const k of ['nombre','area'])$('#'+k).addEventListener('input',()=>{S.perfil[k]=$('#'+k).value;savePerfil();renderSteps()});
$('#f-tienda').addEventListener('submit',async e=>{e.preventDefault();
  const d={nombre:$('#ti-nombre').value.trim(),ciudad:$('#ti-ciudad').value.trim(),unidad:$('#ti-pais').value,email:$('#ti-email').value.trim()};
  if(!d.nombre||!d.ciudad)return;if(d.email&&!okMail(d.email))return toast('Revisa el correo de la tienda.');
  try{const ref=await addTienda(d);if(!ref)return toast('Esa tienda ya existe en esa ciudad.');['#ti-nombre','#ti-email'].forEach(s=>$(s).value='');toast('Tienda agregada.')}catch(err){toast(errMsg(err))}
  await refresh('tiendas');
});
$('#bulk-go').addEventListener('click',async()=>{
  const lines=$('#bulk').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);if(!lines.length)return toast('Pega al menos una tienda.');
  let ok=0,bad=0,dup=0;
  for(const l of lines){const p=l.split(/\t|;/).map(x=>x.trim());const pais=parseUnidad(p[2]);
    if(!p[0]||!p[1]||!pais){bad++;continue}
    try{const ref=await addTienda({nombre:p[0],ciudad:p[1],unidad:pais,email:p[3]||''});if(ref)ok++;else dup++}catch(err){if(err?.code==='23505'){dup++;continue}toast(errMsg(err));break}}
  $('#bulk').value='';toast(`${ok} ${pl(ok,'tienda importada','tiendas importadas')}${dup?`. ${dup} ya ${pl(dup,'existía','existían')}`:''}${bad?`. ${bad} ${pl(bad,'línea')} con formato incorrecto`:''}.`);
  await refresh('tiendas');
});
['#tu-tienda','#tu-desde','#tu-hasta','#tu-ini','#tu-fin'].forEach(s=>$(s).addEventListener('change',previewTurnos));
$('#tu-dias').addEventListener('change',previewTurnos);
$('#f-turno').addEventListener('submit',async e=>{e.preventDefault();
  const fs=fechasForm(),tg=targetsForm(),ini=$('#tu-ini').value,fin=$('#tu-fin').value,cup=Math.max(1,Math.min(20,Number($('#tu-cupos').value)||1)),prio=$('#tu-prio').checked;
  if(!fs.length||!tg.length)return toast('Revisa dónde, las fechas y los días.');
  if(toMin(fin)<=toMin(ini))return toast('La salida debe ser después de la entrada.');
  const ex=new Set(S.turnos.map(t=>tKey(t.tiendaId,t.fecha,t.inicio,t.fin)));
  const rows=[];for(const t of tg)for(const f of fs){if(!ex.has(tKey(t.id,f,ini,fin)))rows.push({tienda_id:t.id,fecha:f,inicio:ini,fin,cupos:cup,prioridad:prio})}
  const total=fs.length*tg.length;
  if(!rows.length)return toast('Todos esos turnos ya existen. No se creó nada.');
  if(rows.length>2000)return toast(`Son ${rows.length} turnos. Crea bloques de máximo 2000.`);
  const go=$('#tu-go');go.disabled=true;go.textContent='Creando…';
  try{const n=await insertTurnos(rows);const dup=total-n;toast(`${n} ${pl(n,'turno creado','turnos creados')}${dup?`. ${dup} ya ${pl(dup,'existía','existían')} y no se ${pl(dup,'duplicó','duplicaron')}`:''}.`)}catch(err){toast(errMsg(err))}
  finally{go.disabled=false;go.textContent='Crear turnos'}
  await refresh('turnos');
});
$('#f-temp').addEventListener('submit',async e=>{e.preventDefault();
  try{const base={nombre:$('#te-nombre').value.trim(),max_por_persona:Math.max(0,Number($('#te-max').value)||0),abiertas:$('#te-abiertas').value==='1',limite:$('#te-limite').value||null,mensaje:$('#te-msg').value.trim(),firma:$('#te-firma').value.trim(),actualizado:new Date().toISOString()};await q(sb.from('config').upsert(cfgKeys().map(k=>({unidad:k,...base}))));toast('Temporada guardada.')}catch(err){toast(errMsg(err))}
  await refresh('config');
});
$('#roster-go').addEventListener('click',async()=>{
  if(S.adminPais==='*')return toast('Elige una empresa y país para cargar su lista.');
  const lines=$('#roster').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const personas=[];let bad=0;const seen=new Set();
  for(const l of lines){const p=l.split(/\t|;/).map(x=>x.trim());const em=p.find(okMail);if(!em){bad++;continue}
    if(seen.has(lc(em)))continue;seen.add(lc(em));
    const rest=p.filter(x=>x!==em);personas.push({nombre:rest[0]||em,email:lc(em),area:rest[1]||''})}
  if(!personas.length)return toast('No encontré correos válidos. Revisa el formato.');
  try{await q(sb.from('convocados').upsert({pais:S.adminPais,personas,actualizado:new Date().toISOString()}));$('#roster').value='';toast(`Lista guardada: ${personas.length} ${pl(personas.length,'persona')}${bad?`. ${bad} ${pl(bad,'línea')} sin correo`:''}.`)}catch(err){toast(errMsg(err))}
  await refresh('convocados');
});
$('#remind').addEventListener('click',()=>{
  const s=stats();const c=cfgFor(S.adminPais==='*'?null:scopeUnits()[0]);
  const txt=`Hola equipo, aún no han elegido su turno de apoyo en tienda para Play the Game:\n\n${s.pend.map(p=>'• '+(p.nombre||p.email)).join('\n')}\n\nEntren a Play the Game (${location.origin}), elijan día, tienda y horario, y agréguenlo a su calendario.${c.limite?` La fecha límite es el ${fmtF(c.limite).toLowerCase()}.`:''}\n\n${c.firma||'Talento, Clima y Cultura'}`;
  copyText(txt,null);
});
$('#xls-all').addEventListener('click',()=>{
  const ts=A.tiendas.filter(t=>filasTienda(t).length).sort((a,b)=>(a.ciudad+a.nombre).localeCompare(b.ciudad+b.nombre));
  if(!ts.length)return toast('Todavía no hay reservas próximas para exportar.');
  const wb=XLSX.utils.book_new(),used=new Set();ts.forEach(t=>XLSX.utils.book_append_sheet(wb,hojaTienda(t),sheetName(t.nombre,used)));
  saveXlsx(wb,`Play the Game - ${fileSafe(scopeName())} - ${hoy()}.xlsx`);
});
$('#csv').addEventListener('click',()=>descargar(`play-the-game-${hoy()}.csv`,new Blob([csv()],{type:'text/csv;charset=utf-8'})));
document.addEventListener('submit',async e=>{if(e.target.id!=='pin-form')return;e.preventDefault();
  const p=S.pinFor,i=$('#pin-in'),go=$('#pin-go'),v=i.value.trim();if(!p||!v)return;go.disabled=true;
  try{const r=await q(sb.rpc('entrar_rrhh',{p_pais:p,p_pin:v}));
    if(r==='ok'){await loadRole();toast(`Entraste al panel de ${paisName(p)}.`);return unlock(p)}
    i.value='';i.focus();
    toast(r==='bloqueado'?'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.':r==='sin_pin'?'Todavía no hay PIN para este país. Pídele a RRHH regional que lo configure.':'PIN incorrecto.');
  }catch(err){toast(errMsg(err))}finally{if(go.isConnected)go.disabled=false}
});
$('#f-dominio').addEventListener('submit',async e=>{e.preventDefault();
  const d=lc($('#do-dominio').value).replace(/^@/,'');if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))return toast('Escribe un dominio como empresa.com.ec');
  try{await q(sb.from('dominios').upsert({dominio:d}));$('#do-dominio').value='';toast(`Dominio @${d} permitido.`)}catch(err){toast(errMsg(err))}
  await refresh('admins');
});

/* ---------- Login ---------- */
function showLogin(state){
  $('#app').hidden=true;$('#status').hidden=true;const el=$('#auth');el.hidden=false;
  $('#season').innerHTML='<b>Turnos de apoyo en tienda</b>';
  if(state==='blocked'){
    el.innerHTML=`<div class="gate"><div class="eyebrow">Acceso</div><h2>Usa tu correo de ${esc(BRAND.nombre)}</h2><p>El correo <b>${esc(S.email)}</b> no está habilitado para Play the Game. Entra con tu correo corporativo o pide acceso a Recursos Humanos.</p><button class="btn" data-act="logout">Entrar con otro correo</button></div>`;return}
  el.innerHTML=`<div class="gate"><div class="eyebrow">${esc(BRAND.nombre)} · Talento, Clima y Cultura</div><h2>Entra con tu correo</h2><p>Te enviamos un enlace para entrar. No necesitas contraseña.</p>
    <form class="login-form" id="login-form"><input type="email" id="login-email" required placeholder="tu correo de trabajo" autocomplete="email" aria-label="Tu correo"><button class="btn" type="submit" id="login-go">Enviar enlace</button></form>
    <p class="hint" id="login-msg" role="status"></p></div>`;
  $('#login-form').addEventListener('submit',async e=>{e.preventDefault();
    const email=lc($('#login-email').value);if(!okMail(email))return;const go=$('#login-go');go.disabled=true;go.textContent='Enviando…';
    const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});
    go.disabled=false;go.textContent='Enviar enlace';
    $('#login-msg').textContent=error?(/rate|seconds|too many/i.test(error.message)?'Espera un minuto antes de pedir otro enlace.':'No se pudo enviar el enlace. Revisa el correo e inténtalo de nuevo.')
      :`Listo. Revisa ${email} (también la carpeta de spam) y abre el enlace en este mismo dispositivo.`;
  });
}

/* ---------- Arranque ---------- */
async function start(session){
  if(S.started)return;S.started=true;
  S.uid=session.user.id;S.email=lc(session.user.email);
  try{
    if(!(await q(sb.rpc('permitido')))){S.started=false;return showLogin('blocked')}
    $('#auth').hidden=true;$('#app').hidden=false;$('#status').hidden=false;
    await loadRole();
    {const a=ss.get('ptg-admin');if(a&&((S.owner&&(a==='*'||PAISES[a]))||S.grants.includes(a)))S.adminPais=a;else if(!S.owner&&S.grants.length===1)S.adminPais=S.grants[0]}
    const pf=await q(sb.from('perfiles').select('nombre,area,unidad').eq('user_id',S.uid).maybeSingle());
    S.perfil={nombre:pf?.nombre||'',area:pf?.area||'',unidad:pf?.unidad||null};S.unidad=S.perfil.unidad;
    $('#nombre').value=S.perfil.nombre;$('#area').value=S.perfil.area;$('#mi-correo').textContent=S.email;
    $('#me').innerHTML=`<div style="text-align:right"><div class="n"></div><div class="row" style="gap:4px;justify-content:flex-end;margin-top:4px"><button class="btn ghost tiny" id="rrhh-btn" hidden>Acceso RRHH</button><button class="btn ghost tiny" data-act="logout">Salir</button></div></div>`;$('#me .n').textContent=S.perfil.nombre||S.email;
    await reload('unidades');if(S.unidad&&!U[S.unidad])S.unidad=S.perfil.unidad=null;
    await Promise.all(['tiendas','turnos','reservas','config','avisos','convocados','admins'].map(reload));
    S.ready=true;
    if(S.admin&&!S.tabTouched)showTab('admin');
    paint();
    if(miPend())openCalModal();
    const ch=sb.channel('ptg');
    for(const t of ['tiendas','turnos','reservas','config'])ch.on('postgres_changes',{event:'*',schema:SCHEMA,table:t},()=>sched(t));
    ch.on('postgres_changes',{event:'*',schema:SCHEMA,table:'avisos'},()=>sched('avisos'));
    ch.subscribe();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh('tiendas','turnos','reservas','config','avisos')});
  }catch(e){S.started=false;toast(errMsg(e))}
}
(async()=>{
  paint();
  const{data:{session}}=await sb.auth.getSession();
  sb.auth.onAuthStateChange((ev,sess)=>{if(sess&&(ev==='SIGNED_IN'||ev==='INITIAL_SESSION'))start(sess)});
  if(session)start(session);else showLogin();
})();
