'use strict';
/* =============================================================
   CES Field App — app/js/app.js
   Chris Energy Services · Field Operations
============================================================= */

// ── Storage Keys ────────────────────────────────────────────
const K = {
  sess:   'ces_session',
  appts:  'ces_appointments',
  stock:  'ces_stock',
  comps:  'ces_completions',
  acts:   'ces_activity',
  seeded: 'ces_seeded'
};

// ── Service types ────────────────────────────────────────────
const SVC = [
  { v: 'pipe-repair',        l: 'Pipe Repair' },
  { v: 'pipeline-services',  l: 'Pipeline Services' },
  { v: 'power-utilities',    l: 'Power & Utilities' },
  { v: 'inspection-testing', l: 'Inspection & Testing' }
];

// ── Users (hardcoded — no backend) ──────────────────────────
const USERS = [
  { id:'u1', name:'Chris Thompson', username:'chris', password:'admin123', role:'admin',       initials:'CT', color:'#f59e0b' },
  { id:'u2', name:'Jake Rivera',    username:'jake',  password:'tech123',  role:'technician',  initials:'JR', color:'#3b82f6' },
  { id:'u3', name:'Sarah Mitchell', username:'sarah', password:'tech123',  role:'technician',  initials:'SM', color:'#10b981' },
  { id:'u4', name:'Mike Davis',     username:'mike',  password:'tech123',  role:'technician',  initials:'MD', color:'#8b5cf6' }
];

// ── Categories ───────────────────────────────────────────────
const CATS = ['pipes','fittings','valves','seals','tools','welding','ppe'];

// ────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────
function uid()  { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function today(){ return new Date().toISOString().split('T')[0]; }
function dayOffset(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtDate(iso){
  if(!iso) return '—';
  const [y,m,d]=iso.split('-');
  return new Date(+y,+m-1,+d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function fmtTime(t24){
  if(!t24) return '';
  const [h,m]=t24.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
function fmtTs(iso){
  if(!iso) return '—';
  const d=new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+
         d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
}
function timeAgo(iso){
  if(!iso) return '';
  const s=Math.floor((Date.now()-new Date(iso))/1000);
  if(s<60)    return 'just now';
  if(s<3600)  return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function getUser(id)    { return USERS.find(u=>u.id===id)||null; }
function getSvcLabel(v) { return SVC.find(s=>s.v===v)?.l||v; }

function statusBadge(s){
  const map={pending:'badge-pending',
             'in-progress':'badge-progress',
             completed:'badge-completed',
             cancelled:'badge-cancelled'};
  const labels={pending:'Pending','in-progress':'In Progress',completed:'Completed',cancelled:'Cancelled'};
  return `<span class="badge ${map[s]||''}">${labels[s]||s}</span>`;
}
function priorityBadge(p){
  const map={emergency:'badge-emergency',routine:'badge-routine',scheduled:'badge-scheduled'};
  return `<span class="badge ${map[p]||''}">${p.charAt(0).toUpperCase()+p.slice(1)}</span>`;
}
function avatarHtml(user, sm=''){
  if(!user) return `<span class="av${sm?` av-sm`:''}" style="background:#516a84">?</span>`;
  return `<span class="av${sm?' av-sm':''}" style="background:${user.color}">${user.initials}</span>`;
}

// ────────────────────────────────────────────────────────────
// DATABASE (localStorage)
// ────────────────────────────────────────────────────────────
const DB = {
  get(key)       { try{ return JSON.parse(localStorage.getItem(key))||[];} catch{return [];} },
  set(key,val)   { localStorage.setItem(key,JSON.stringify(val)); },

  /* Appointments */
  getAppts()     { return this.get(K.appts); },
  addAppt(data)  {
    const list=this.getAppts();
    const a={id:uid(),createdAt:new Date().toISOString(),...data};
    list.unshift(a); this.set(K.appts,list);
    Activity.log('appt','New job: '+a.clientName,a.createdBy);
    return a;
  },
  putAppt(id,ch) {
    const list=this.getAppts().map(a=>a.id===id?{...a,...ch,updatedAt:new Date().toISOString()}:a);
    this.set(K.appts,list);
  },
  delAppt(id)    { this.set(K.appts,this.getAppts().filter(a=>a.id!==id)); },

  /* Stock */
  getStock()     { return this.get(K.stock); },
  addStock(data) {
    const list=this.getStock();
    const s={id:uid(),updatedAt:new Date().toISOString(),...data};
    list.push(s); this.set(K.stock,list); return s;
  },
  putStock(id,ch){
    const list=this.getStock().map(s=>s.id===id?{...s,...ch,updatedAt:new Date().toISOString()}:s);
    this.set(K.stock,list);
  },
  adjustQty(id,delta){
    const list=this.getStock();
    const item=list.find(s=>s.id===id);
    if(!item) return null;
    item.quantity=Math.max(0,item.quantity+delta);
    item.updatedAt=new Date().toISOString();
    this.set(K.stock,list); return item;
  },
  delStock(id)   { this.set(K.stock,this.getStock().filter(s=>s.id!==id)); },

  /* Completions */
  getComps()     { return this.get(K.comps); },
  addComp(data)  {
    const list=this.getComps();
    const c={id:uid(),completedAt:new Date().toISOString(),...data};
    list.unshift(c); this.set(K.comps,list); return c;
  }
};

// ────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ────────────────────────────────────────────────────────────
const Activity = {
  log(type,msg,userId){
    const list=DB.get(K.acts);
    list.unshift({id:uid(),type,msg,userId,ts:new Date().toISOString()});
    if(list.length>50) list.pop();
    DB.set(K.acts,list);
  },
  recent(n=8){ return DB.get(K.acts).slice(0,n); }
};

// ────────────────────────────────────────────────────────────
// SEED DATA (runs once on first load)
// ────────────────────────────────────────────────────────────
function seedData(){
  if(localStorage.getItem(K.seeded)) return;

  DB.set(K.stock,[
    {id:'s1',name:'Carbon Steel Pipe 6"',sku:'CSP-6IN-001',category:'pipes',    quantity:24,minLevel:5,  unit:'ft',   unitCost:45.00,location:'Warehouse A',updatedAt:new Date().toISOString()},
    {id:'s2',name:'Carbon Steel Pipe 4"',sku:'CSP-4IN-001',category:'pipes',    quantity:3, minLevel:5,  unit:'ft',   unitCost:28.00,location:'Warehouse A',updatedAt:new Date().toISOString()},
    {id:'s3',name:'Pipe Coupling 6"',    sku:'PCL-6IN-001',category:'fittings', quantity:15,minLevel:8,  unit:'pcs',  unitCost:22.50,location:'Shelf B3',   updatedAt:new Date().toISOString()},
    {id:'s4',name:'Gate Valve 4"',       sku:'GV-4IN-001', category:'valves',   quantity:2, minLevel:3,  unit:'pcs',  unitCost:180.00,location:'Shelf C1',  updatedAt:new Date().toISOString()},
    {id:'s5',name:'PTFE Thread Seal Tape',sku:'TST-001',   category:'seals',    quantity:50,minLevel:10, unit:'rolls',unitCost:3.50, location:'Shelf A2',   updatedAt:new Date().toISOString()},
    {id:'s6',name:'Pipe Wrench 18"',     sku:'PW-18-001',  category:'tools',    quantity:4, minLevel:2,  unit:'pcs',  unitCost:75.00,location:'Tool Cabinet',updatedAt:new Date().toISOString()},
    {id:'s7',name:'Weld Filler ER70S-6', sku:'WFR-7S6-001',category:'welding',  quantity:2, minLevel:5,  unit:'lbs',  unitCost:12.00,location:'Warehouse A', updatedAt:new Date().toISOString()},
    {id:'s8',name:'Safety Gloves (L)',   sku:'SG-L-001',   category:'ppe',      quantity:20,minLevel:10, unit:'pairs',unitCost:8.00, location:'Safety Cab', updatedAt:new Date().toISOString()}
  ]);

  const a4id='a4-'+uid();
  DB.set(K.appts,[
    {id:'a1-seed',clientName:'Gulf Coast Pipeline Co.',serviceType:'pipe-repair',       date:today(),        time:'09:00',location:'Baytown, TX',    assignedTech:'u2',priority:'emergency',status:'in-progress',notes:'Burst pipe on main line, 200ft segment needs replacement.',createdAt:new Date(Date.now()-86400000).toISOString(),   createdBy:'u1'},
    {id:'a2-seed',clientName:'TexOil Refinery',        serviceType:'inspection-testing',date:today(),        time:'14:00',location:'Pasadena, TX',   assignedTech:'u3',priority:'routine',  status:'pending',   notes:'Quarterly NDT inspection of Tank Farm C.',           createdAt:new Date(Date.now()-86400000*2).toISOString(), createdBy:'u1'},
    {id:'a3-seed',clientName:'Southwest Energy LLC',   serviceType:'pipeline-services', date:dayOffset(1),   time:'08:00',location:'Katy, TX',       assignedTech:'u4',priority:'scheduled',status:'pending',   notes:'Pipeline commissioning support, 3-day project.',     createdAt:new Date(Date.now()-86400000*3).toISOString(), createdBy:'u1'},
    {id:a4id,     clientName:'BrightPower Utilities',  serviceType:'power-utilities',   date:dayOffset(-2),  time:'10:00',location:'Sugar Land, TX', assignedTech:'u2',priority:'routine',  status:'completed', notes:'Power plant pipe maintenance, completed on schedule.',createdAt:new Date(Date.now()-86400000*5).toISOString(), createdBy:'u1'}
  ]);

  DB.set(K.comps,[
    {id:'c1-seed',appointmentId:a4id,clientName:'BrightPower Utilities',techId:'u2',completedAt:new Date(Date.now()-86400000*2).toISOString(),timeSpent:4.5,partsUsed:[{stockId:'s5',quantity:3,name:'PTFE Thread Seal Tape'},{stockId:'s6',quantity:1,name:'Pipe Wrench 18"'}],notes:'Replaced three pipe sections and re-sealed all connections. All pressure tests passed.',signOff:'JR'}
  ]);

  DB.set(K.acts,[
    {id:uid(),type:'appt',msg:'New job: Gulf Coast Pipeline Co.',userId:'u1',ts:new Date(Date.now()-86400000).toISOString()},
    {id:uid(),type:'comp',msg:'Job completed: BrightPower Utilities',userId:'u2',ts:new Date(Date.now()-86400000*2).toISOString()},
    {id:uid(),type:'stock',msg:'Stock adjusted: PTFE Thread Seal Tape (-3)',userId:'u2',ts:new Date(Date.now()-86400000*2).toISOString()}
  ]);

  localStorage.setItem(K.seeded,'1');
}

// ────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────
const Auth = {
  _user: null,
  login(username, password){
    const u=USERS.find(u=>u.username.toLowerCase()===username.toLowerCase()&&u.password===password);
    if(!u) return false;
    this._user=u;
    localStorage.setItem(K.sess,JSON.stringify({userId:u.id}));
    Activity.log('login',`${u.name} signed in`,u.id);
    return true;
  },
  logout(){
    this._user=null;
    localStorage.removeItem(K.sess);
    showLogin();
  },
  restore(){
    try{
      const s=JSON.parse(localStorage.getItem(K.sess));
      if(s?.userId){ this._user=USERS.find(u=>u.id===s.userId)||null; }
    }catch{}
    return !!this._user;
  },
  user(){ return this._user; },
  isAdmin(){ return this._user?.role==='admin'; }
};

// ────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ────────────────────────────────────────────────────────────
function toast(msg, type='info'){
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span class="toast-dot"></span>${esc(msg)}`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(),3500);
}

// ────────────────────────────────────────────────────────────
// MODAL
// ────────────────────────────────────────────────────────────
const Modal = {
  open(html){
    document.getElementById('modalInner').innerHTML=html;
    document.getElementById('modal').classList.remove('hidden');
  },
  close(){
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modalInner').innerHTML='';
  }
};

// ────────────────────────────────────────────────────────────
// ROUTER
// ────────────────────────────────────────────────────────────
let _view='dashboard';
const Views=['dashboard','appointments','stock','completions'];

function goTo(view){
  if(!Views.includes(view)) view='dashboard';
  _view=view;
  // Hide all views
  Views.forEach(v=>document.getElementById('v-'+v).classList.add('hidden'));
  document.getElementById('v-'+view).classList.remove('hidden');
  // Update bottom nav
  document.querySelectorAll('.bn-btn[data-view]').forEach(b=>{
    b.classList.toggle('active',b.dataset.view===view);
  });
  // Update sidebar nav
  document.querySelectorAll('.sb-link[data-view]').forEach(b=>{
    b.classList.toggle('active',b.dataset.view===view);
  });
  // Render the view
  const renders={dashboard:renderDashboard,appointments:renderAppointments,stock:renderStock,completions:renderCompletions};
  renders[view]?.();
}

// ────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ────────────────────────────────────────────────────────────
function showLogin(){
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  renderUserAvatars();
}

function renderUserAvatars(){
  const el=document.getElementById('userAvatars');
  el.innerHTML=USERS.map(u=>`
    <button class="u-chip" data-username="${u.username}" title="${esc(u.name)}">
      <span class="av" style="background:${u.color}">${u.initials}</span>
      ${esc(u.name.split(' ')[0])}
    </button>`).join('');
}

function showApp(){
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderShell();
  goTo('dashboard');
}

// ────────────────────────────────────────────────────────────
// SHELL (sidebar + top bar)
// ────────────────────────────────────────────────────────────
function renderShell(){
  const u=Auth.user();
  // Top bar avatar
  const tb=document.getElementById('tbAvatar');
  tb.style.background=u.color; tb.textContent=u.initials;

  // Sidebar nav
  const navItems=[
    {view:'dashboard',   icon:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',label:'Dashboard'},
    {view:'appointments',icon:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',label:'Jobs'},
    {view:'stock',       icon:'<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',label:'Stock'},
    {view:'completions', icon:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',label:'Completions'}
  ];
  document.getElementById('sbNav').innerHTML=navItems.map(n=>`
    <button class="sb-link" data-view="${n.view}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${n.icon}</svg>
      ${n.label}
    </button>`).join('');

  // Sidebar user
  document.getElementById('sbUser').innerHTML=`
    <span class="av" style="background:${u.color}">${u.initials}</span>
    <div class="sb-user-info">
      <strong>${esc(u.name)}</strong><small>${u.role}</small>
    </div>
    <button class="sb-logout" id="sbLogout" title="Logout">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>`;
}

// ────────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────────
function renderDashboard(){
  const u=Auth.user();
  const appts=DB.getAppts();
  const stock=DB.getStock();

  const todayAppts=appts.filter(a=>a.date===today());
  const pending=appts.filter(a=>a.status==='pending'||a.status==='in-progress');
  const lowStock=stock.filter(s=>s.quantity<=s.minLevel);

  // Completed this week
  const weekAgo=Date.now()-7*86400000;
  const doneWeek=appts.filter(a=>a.status==='completed'&&new Date(a.updatedAt||a.createdAt)>=weekAgo);

  const hr=new Date().getHours();

  const acts=Activity.recent(6);
  const actColors={appt:'#3b82f6',comp:'#10b981',stock:'#f59e0b',login:'#8b5cf6'};

  document.getElementById('v-dashboard').innerHTML=`
    <div class="dash-greeting">
      <h2>${hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}, ${esc(u.name.split(' ')[0])} 👋</h2>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi" onclick="goTo('appointments')">
        <div class="kpi-icon amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="kpi-num">${todayAppts.length}</div>
        <div class="kpi-label">Today's Jobs</div>
        <div class="kpi-glow amber"></div>
      </div>
      <div class="kpi" onclick="goTo('appointments')">
        <div class="kpi-icon blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="kpi-num">${pending.length}</div>
        <div class="kpi-label">Active Jobs</div>
        <div class="kpi-glow blue"></div>
      </div>
      <div class="kpi" onclick="goTo('stock')">
        <div class="kpi-icon ${lowStock.length>0?'red':'green'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        </div>
        <div class="kpi-num">${lowStock.length}</div>
        <div class="kpi-label">Low Stock Alerts</div>
        <div class="kpi-glow ${lowStock.length>0?'red':'green'}"></div>
      </div>
      <div class="kpi" onclick="goTo('completions')">
        <div class="kpi-icon green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <div class="kpi-num">${doneWeek.length}</div>
        <div class="kpi-label">Done This Week</div>
        <div class="kpi-glow green"></div>
      </div>
    </div>

    <div class="dash-sec-title">Quick Actions</div>
    <div class="quick-actions" style="margin-bottom:28px">
      <button class="btn btn-primary" onclick="Appointments.openNew()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Job
      </button>
      <button class="btn btn-ghost" onclick="goTo('appointments')">
        View All Jobs
      </button>
      <button class="btn btn-ghost" onclick="Stock.openAdd()">
        + Add Stock
      </button>
    </div>

    <div class="dash-sec-title">Recent Activity</div>
    <div class="activity-feed">
      ${acts.length===0?'<div class="act-item"><span class="act-msg">No activity yet.</span></div>':
        acts.map(a=>`
        <div class="act-item">
          <span class="act-dot" style="background:${actColors[a.type]||'#516a84'}"></span>
          <span class="act-msg">${esc(a.msg)}</span>
          <span class="act-time">${timeAgo(a.ts)}</span>
        </div>`).join('')}
    </div>`;
}

// ────────────────────────────────────────────────────────────
// APPOINTMENTS
// ────────────────────────────────────────────────────────────
let apptFilter='all';

const Appointments = {
  openNew(){ apptModal(); },
  setFilter(f){ apptFilter=f; renderAppointments(); }
};

function renderAppointments(){
  const filters=[
    {v:'all',l:'All'},
    {v:'today',l:'Today'},
    {v:'pending',l:'Pending'},
    {v:'in-progress',l:'In Progress'},
    {v:'completed',l:'Completed'},
    {v:'cancelled',l:'Cancelled'}
  ];

  let list=DB.getAppts();
  if(apptFilter==='today')      list=list.filter(a=>a.date===today());
  else if(apptFilter!=='all')   list=list.filter(a=>a.status===apptFilter);

  document.getElementById('v-appointments').innerHTML=`
    <div class="pg-header">
      <div><div class="pg-title">Jobs</div><div class="pg-sub">${list.length} appointment${list.length!==1?'s':''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="Appointments.openNew()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New
      </button>
    </div>

    <div class="filter-tabs">
      ${filters.map(f=>`<button class="ftab${apptFilter===f.v?' active':''}" onclick="Appointments.setFilter('${f.v}')">${f.l}</button>`).join('')}
    </div>

    <div class="appt-list">
      ${list.length===0?`
        <div class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h3>No jobs found</h3>
          <p>No appointments match this filter. Create a new job to get started.</p>
          <button class="btn btn-primary" onclick="Appointments.openNew()">+ New Job</button>
        </div>`:
        list.map(a=>{
          const tech=getUser(a.assignedTech);
          return `
          <div class="appt-card priority-${a.priority}" onclick="apptDetail('${a.id}')">
            <div class="appt-top">
              <div>
                <div class="appt-client">${esc(a.clientName)}</div>
                <div class="appt-type">${getSvcLabel(a.serviceType)}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                ${statusBadge(a.status)}
                ${priorityBadge(a.priority)}
              </div>
            </div>
            <div class="appt-meta">
              <span class="appt-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${fmtDate(a.date)} ${fmtTime(a.time)}
              </span>
              <span class="appt-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${esc(a.location||'—')}
              </span>
            </div>
            <div class="appt-footer">
              <div class="appt-tech">
                ${avatarHtml(tech,' av-sm')}
                <span>${tech?esc(tech.name):' Unassigned'}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3)"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>`;
        }).join('')}
    </div>`;
}

function apptDetail(id){
  const a=DB.getAppts().find(x=>x.id===id);
  if(!a) return;
  const tech=getUser(a.assignedTech);
  const statuses=[
    {v:'pending',l:'Pending',cls:'pending'},
    {v:'in-progress',l:'In Progress',cls:'progress'},
    {v:'completed',l:'Completed',cls:'completed'},
    {v:'cancelled',l:'Cancelled',cls:'cancelled'}
  ];
  Modal.open(`
    <div class="modal-title">${esc(a.clientName)}</div>
    <div class="modal-sub">${getSvcLabel(a.serviceType)}</div>

    <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-val">${fmtDate(a.date)} at ${fmtTime(a.time)}</span></div>
    <div class="detail-row"><span class="detail-label">Location</span><span class="detail-val">${esc(a.location||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Assigned Tech</span><span class="detail-val" style="display:flex;align-items:center;gap:8px">${avatarHtml(tech)} ${tech?esc(tech.name):'Unassigned'}</span></div>
    <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-val">${priorityBadge(a.priority)}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-val">${statusBadge(a.status)}</span></div>
    <div class="detail-row"><span class="detail-label">Notes</span><span class="detail-val">${esc(a.notes||'—')}</span></div>

    <div class="divider"></div>
    <div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:10px">Update Status</div>
    <div class="status-flow">
      ${statuses.map(s=>`<button class="status-btn ${s.cls}${a.status===s.v?' current':''}" onclick="apptSetStatus('${id}','${s.v}')">${s.l}</button>`).join('')}
    </div>

    <div class="modal-actions">
      ${a.status==='in-progress'?`<button class="btn btn-primary" onclick="Modal.close();Completions.openComplete('${id}')">✓ Complete Job</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="apptDelete('${id}')">Delete</button>
      <button class="btn btn-ghost" onclick="Modal.close()">Close</button>
    </div>`);
}

function apptSetStatus(id, status){
  DB.putAppt(id,{status});
  Activity.log('appt',`Job status updated to "${status}"`,Auth.user()?.id);
  toast(`Status updated: ${status}`,'success');
  Modal.close();
  renderAppointments();
}

function apptDelete(id){
  if(!confirm('Delete this appointment?')) return;
  DB.delAppt(id);
  toast('Appointment deleted','info');
  Modal.close();
  renderAppointments();
  renderDashboard();
}

function apptModal(prefill={}){
  const u=Auth.user();
  Modal.open(`
    <div class="modal-title">${prefill.id?'Edit Job':'New Job'}</div>
    <div class="modal-sub">Fill in the details below to schedule a service appointment.</div>
    <form class="form-grid" id="apptForm" onsubmit="apptSubmit(event,'${prefill.id||''}')">
      <div class="form-row">
        <div class="form-fld">
          <label>Client Name *</label>
          <input name="clientName" placeholder="Company name" value="${esc(prefill.clientName||'')}">
        </div>
        <div class="form-fld">
          <label>Service Type *</label>
          <select name="serviceType">
            ${SVC.map(s=>`<option value="${s.v}"${prefill.serviceType===s.v?' selected':''}>${s.l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-fld">
          <label>Date *</label>
          <input type="date" name="date" value="${prefill.date||today()}">
        </div>
        <div class="form-fld">
          <label>Time</label>
          <input type="time" name="time" value="${prefill.time||'09:00'}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-fld">
          <label>Location</label>
          <input name="location" placeholder="City, State" value="${esc(prefill.location||'')}">
        </div>
        <div class="form-fld">
          <label>Priority</label>
          <select name="priority">
            ${['emergency','routine','scheduled'].map(p=>`<option value="${p}"${prefill.priority===p?' selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-fld full">
        <label>Assign Technician</label>
        <select name="assignedTech">
          <option value="">Unassigned</option>
          ${USERS.map(u2=>`<option value="${u2.id}"${prefill.assignedTech===u2.id?' selected':''}>${esc(u2.name)} (${u2.role})</option>`).join('')}
        </select>
      </div>
      <div class="form-fld full">
        <label>Notes</label>
        <textarea name="notes" placeholder="Job details, special instructions...">${esc(prefill.notes||'')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Save Job</button>
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      </div>
    </form>`);
}

function apptSubmit(e, editId){
  e.preventDefault();
  const f=new FormData(e.target);
  const data={
    clientName:  f.get('clientName').trim(),
    serviceType: f.get('serviceType'),
    date:        f.get('date'),
    time:        f.get('time'),
    location:    f.get('location').trim(),
    priority:    f.get('priority'),
    assignedTech:f.get('assignedTech'),
    notes:       f.get('notes').trim(),
    status:      'pending',
    createdBy:   Auth.user()?.id
  };
  if(!data.clientName||!data.date){ toast('Client name and date are required','error'); return; }
  DB.addAppt(data);
  toast('Job created!','success');
  Modal.close();
  renderAppointments();
  renderDashboard();
}

// ────────────────────────────────────────────────────────────
// STOCK
// ────────────────────────────────────────────────────────────
let stockSearch='', stockCat='all';

const Stock = {
  openAdd(){ stockAddModal(); },
  setSearch(v){ stockSearch=v; renderStock(); },
  setCat(v){ stockCat=v; renderStock(); }
};

function renderStock(){
  let list=DB.getStock();
  if(stockCat!=='all') list=list.filter(s=>s.category===stockCat);
  if(stockSearch)      list=list.filter(s=>(s.name+s.sku).toLowerCase().includes(stockSearch.toLowerCase()));

  const lowCount=DB.getStock().filter(s=>s.quantity<=s.minLevel).length;

  document.getElementById('v-stock').innerHTML=`
    <div class="pg-header">
      <div>
        <div class="pg-title">Inventory</div>
        <div class="pg-sub">${list.length} item${list.length!==1?'s':''}${lowCount>0?` · <span style="color:var(--amber)">${lowCount} low stock</span>`:''}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Stock.openAdd()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>
    </div>

    <div class="stock-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" placeholder="Search by name or SKU…" value="${esc(stockSearch)}" oninput="Stock.setSearch(this.value)">
    </div>

    <div class="filter-tabs" style="margin-bottom:20px">
      ${['all',...CATS].map(c=>`<button class="ftab${stockCat===c?' active':''}" onclick="Stock.setCat('${c}')">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`).join('')}
    </div>

    <div class="stock-list">
      ${list.length===0?`
        <div class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          <h3>No items found</h3>
          <p>No stock items match your search. Try a different filter or add a new item.</p>
        </div>`:
        list.map(s=>{
          const low=s.quantity<=s.minLevel;
          return `
          <div class="stock-item${low?' low-stock':''}">
            <div class="stock-icon${low?' low':''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            </div>
            <div class="stock-info">
              <div class="stock-name">${esc(s.name)}</div>
              <div class="stock-sku">${esc(s.sku)}</div>
              <div class="stock-meta">
                <span class="badge badge-${low?'lowstock':'scheduled'}" style="font-size:10px;padding:2px 7px">${esc(s.category)}</span>
                &nbsp;${esc(s.location||'')}
                ${low?'&nbsp;<span style="color:var(--amber)">⚠ Low</span>':''}
              </div>
            </div>
            <div class="stock-qty-wrap">
              <div class="stock-qty${low?' low':''}">${s.quantity}</div>
              <div class="stock-unit">${esc(s.unit)}</div>
              <div class="qty-btns">
                <button class="qty-btn minus" onclick="stockAdjust('${s.id}',-1)" title="Remove 1">−</button>
                <button class="qty-btn plus"  onclick="stockAdjust('${s.id}',+1)" title="Add 1">+</button>
              </div>
            </div>
          </div>`;
        }).join('')}
    </div>`;
}

function stockAdjust(id, delta){
  const item=DB.adjustQty(id,delta);
  if(!item) return;
  if(item.quantity<=item.minLevel){
    toast(`⚠ Low stock: ${item.name} (${item.quantity} ${item.unit} left)`,'info');
    Activity.log('stock',`Low stock alert: ${item.name}`,Auth.user()?.id);
  } else {
    toast(`${item.name}: ${item.quantity} ${item.unit}`,'success');
  }
  Activity.log('stock',`Stock adjusted: ${item.name} (${delta>0?'+':''}${delta})`,Auth.user()?.id);
  renderStock();
}

function stockAddModal(){
  Modal.open(`
    <div class="modal-title">Add Stock Item</div>
    <div class="modal-sub">Add a new item to the inventory.</div>
    <form class="form-grid" id="stockForm" onsubmit="stockSubmit(event)">
      <div class="form-row">
        <div class="form-fld">
          <label>Item Name *</label>
          <input name="name" placeholder="e.g. Carbon Steel Pipe 6&quot;">
        </div>
        <div class="form-fld">
          <label>SKU</label>
          <input name="sku" placeholder="e.g. CSP-6IN-001">
        </div>
      </div>
      <div class="form-row">
        <div class="form-fld">
          <label>Category</label>
          <select name="category">
            ${CATS.map(c=>`<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-fld">
          <label>Unit</label>
          <input name="unit" placeholder="ft, pcs, lbs, rolls…">
        </div>
      </div>
      <div class="form-row">
        <div class="form-fld">
          <label>Quantity *</label>
          <input type="number" name="quantity" min="0" value="0">
        </div>
        <div class="form-fld">
          <label>Min Level (alert)</label>
          <input type="number" name="minLevel" min="0" value="5">
        </div>
      </div>
      <div class="form-row">
        <div class="form-fld">
          <label>Unit Cost ($)</label>
          <input type="number" name="unitCost" min="0" step="0.01" value="0">
        </div>
        <div class="form-fld">
          <label>Storage Location</label>
          <input name="location" placeholder="Warehouse A, Shelf B3…">
        </div>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Add to Inventory</button>
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      </div>
    </form>`);
}

function stockSubmit(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const name=f.get('name').trim();
  if(!name){ toast('Item name is required','error'); return; }
  DB.addStock({
    name,
    sku:       f.get('sku').trim()||('ITEM-'+Date.now()),
    category:  f.get('category'),
    unit:      f.get('unit').trim()||'pcs',
    quantity:  parseInt(f.get('quantity'))||0,
    minLevel:  parseInt(f.get('minLevel'))||5,
    unitCost:  parseFloat(f.get('unitCost'))||0,
    location:  f.get('location').trim()
  });
  toast('Item added to inventory!','success');
  Activity.log('stock',`New stock item added: ${name}`,Auth.user()?.id);
  Modal.close();
  renderStock();
}

// ────────────────────────────────────────────────────────────
// COMPLETIONS
// ────────────────────────────────────────────────────────────
const Completions={
  openComplete(apptId){ completeModal(apptId); }
};

function renderCompletions(){
  const comps=DB.getComps();
  document.getElementById('v-completions').innerHTML=`
    <div class="pg-header">
      <div>
        <div class="pg-title">Completions</div>
        <div class="pg-sub">${comps.length} job${comps.length!==1?'s':''} completed</div>
      </div>
    </div>
    <div class="comp-list">
      ${comps.length===0?`
        <div class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <h3>No completions yet</h3>
          <p>Mark a job as complete to see it here.</p>
        </div>`:
        comps.map(c=>{
          const tech=getUser(c.techId);
          const totalCost=c.partsUsed?.reduce((acc,p)=>{
            const stockItem=DB.getStock().find(s=>s.id===p.stockId);
            return acc+(stockItem?.unitCost||0)*p.quantity;
          },0)||0;
          return `
          <div class="comp-card">
            <div class="comp-header">
              <div>
                <div class="comp-client">${esc(c.clientName||'N/A')}</div>
                <div class="comp-date">${fmtTs(c.completedAt)}</div>
              </div>
              <span class="badge badge-completed">Completed</span>
            </div>
            ${c.notes?`<div style="font-size:13px;color:var(--text-2);margin-bottom:10px">${esc(c.notes)}</div>`:''}
            <div class="comp-detail">
              <span class="comp-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                ${tech?esc(tech.name):'—'}
              </span>
              <span class="comp-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${c.timeSpent||0}h
              </span>
              <span class="comp-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                ${c.partsUsed?.length||0} part type${c.partsUsed?.length!==1?'s':''}
              </span>
              ${totalCost>0?`<span class="comp-chip">$${totalCost.toFixed(2)} parts</span>`:''}
            </div>
          </div>`;
        }).join('')}
    </div>`;
}

function completeModal(apptId){
  const a=DB.getAppts().find(x=>x.id===apptId);
  if(!a) return;
  const stock=DB.getStock();
  const u=Auth.user();

  Modal.open(`
    <div class="modal-title">Complete Job</div>
    <div class="modal-sub">${esc(a.clientName)} — ${getSvcLabel(a.serviceType)}</div>
    <form class="form-grid" id="compForm" onsubmit="compSubmit(event,'${apptId}')">
      <div class="form-row">
        <div class="form-fld">
          <label>Time Spent (hours)</label>
          <input type="number" name="timeSpent" min="0" step="0.5" value="1" placeholder="e.g. 2.5">
        </div>
        <div class="form-fld">
          <label>Sign Off (initials)</label>
          <input name="signOff" placeholder="${u?.initials||'JR'}" value="${u?.initials||''}">
        </div>
      </div>
      <div class="form-fld full">
        <label>Parts / Stock Used</label>
        <div class="parts-list" id="partsList">
          ${stock.length===0?'<div class="part-check"><span class="act-msg">No stock items available.</span></div>':
            stock.map(s=>`
            <label class="part-check">
              <input type="checkbox" name="part_${s.id}" value="${s.id}">
              <div class="part-check-info">
                <div class="part-check-name">${esc(s.name)}</div>
                <div class="part-check-meta">${s.quantity} ${s.unit} available · SKU: ${esc(s.sku)}</div>
              </div>
              <div class="part-check-qty">
                <input type="number" name="qty_${s.id}" min="1" max="${s.quantity}" value="1" style="display:none" id="qty_${s.id}">
              </div>
            </label>`).join('')}
        </div>
      </div>
      <div class="form-fld full">
        <label>Completion Notes</label>
        <textarea name="notes" placeholder="Describe what was done, any issues, and final result…"></textarea>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Mark Complete
        </button>
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
      </div>
    </form>`);

  // Show qty fields when checkbox ticked
  stock.forEach(s=>{
    const cb=document.querySelector(`input[name="part_${s.id}"]`);
    const qf=document.getElementById(`qty_${s.id}`);
    if(cb&&qf) cb.addEventListener('change',()=>{ qf.style.display=cb.checked?'block':'none'; });
  });
}

function compSubmit(e, apptId){
  e.preventDefault();
  const a=DB.getAppts().find(x=>x.id===apptId);
  if(!a) return;
  const f=new FormData(e.target);
  const stock=DB.getStock();

  // Gather parts used
  const partsUsed=[];
  stock.forEach(s=>{
    const cb=document.querySelector(`input[name="part_${s.id}"]`);
    if(cb?.checked){
      const qty=parseInt(document.getElementById(`qty_${s.id}`)?.value)||1;
      partsUsed.push({stockId:s.id,name:s.name,quantity:qty});
      DB.adjustQty(s.id,-qty); // deduct from stock
    }
  });

  const comp={
    appointmentId: apptId,
    clientName:    a.clientName,
    techId:        Auth.user()?.id,
    timeSpent:     parseFloat(f.get('timeSpent'))||0,
    signOff:       (f.get('signOff')||'').trim(),
    partsUsed,
    notes:         (f.get('notes')||'').trim()
  };
  DB.addComp(comp);
  DB.putAppt(apptId,{status:'completed'});
  Activity.log('comp',`Job completed: ${a.clientName}`,Auth.user()?.id);
  toast('Job marked complete!','success');
  Modal.close();
  renderCompletions();
  goTo('completions');
}

// ────────────────────────────────────────────────────────────
// GLOBAL EVENT DELEGATION
// ────────────────────────────────────────────────────────────
document.addEventListener('click', e=>{
  // Bottom nav
  const bn=e.target.closest('.bn-btn[data-view]');
  if(bn){ goTo(bn.dataset.view); return; }

  // Sidebar nav
  const sb=e.target.closest('.sb-link[data-view]');
  if(sb){ goTo(sb.dataset.view); return; }

  // Logout buttons
  if(e.target.closest('#bnLogout')||e.target.closest('#sbLogout')){ Auth.logout(); return; }

  // Modal backdrop
  if(e.target.id==='modalBd'){ Modal.close(); return; }

  // User avatar quick-select on login screen
  const chip=e.target.closest('.u-chip');
  if(chip){
    document.querySelectorAll('.u-chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    document.getElementById('li-user').value=chip.dataset.username;
    document.getElementById('li-pass').focus();
  }
});

// Password toggle
// ────────────────────────────────────────────────────────────
// INIT — runs after DOM is fully parsed
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

  // Password toggle
  const toggleBtn = document.getElementById('togglePwd');
  const passInp   = document.getElementById('li-pass');
  if(toggleBtn && passInp){
    toggleBtn.addEventListener('click', function(){
      passInp.type = passInp.type === 'password' ? 'text' : 'password';
    });
  }

  // Login form submission
  document.getElementById('loginForm').addEventListener('submit', function(e){
    e.preventDefault();
    const username = document.getElementById('li-user').value.trim();
    const password = document.getElementById('li-pass').value;
    const errEl    = document.getElementById('loginErr');
    if(Auth.login(username, password)){
      errEl.classList.add('hidden');
      showApp();
    } else {
      errEl.classList.remove('hidden');
      document.getElementById('li-pass').value = '';
    }
  });

  // Seed data and restore session
  seedData();
  if(Auth.restore()){
    showApp();
  } else {
    showLogin();
  }
});
