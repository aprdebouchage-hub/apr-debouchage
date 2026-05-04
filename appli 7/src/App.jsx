import { useState } from "react";

const GOOGLE_CLIENT_ID = "237866231071-4q5ghvk2708kaknndtl5bih4a9toqsuc.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.events";

function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) return resolve();
    const existing = document.getElementById("google-gsi");
    if (existing) { existing.onload = resolve; return; }
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

async function addEventToGoogleCalendar(svc, selectedDate, selectedHour, form) {
  await loadGoogleScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: async (tokenResponse) => {
        if (tokenResponse.error) return reject(tokenResponse.error);
        const [h, m] = selectedHour.split(":").map(Number);
        const start = new Date(selectedDate);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + svc.duration * 60 * 60 * 1000);
        const event = {
          summary: `${svc.label} — ${form.name}`,
          location: form.address,
          description: `👤 Client : ${form.name}\n📞 Tél : ${form.phone}\n📧 Email : ${form.email}${form.note ? "\n📝 Note : " + form.note : ""}`,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          colorId: "6",
        };
        try {
          const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenResponse.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
          });
          if (res.ok) resolve(await res.json());
          else reject(await res.text());
        } catch (e) { reject(e); }
      },
    });
    client.requestAccessToken();
  });
}

const SERVICES = [
  { id: "debouchage", label: "Débouchage", icon: "🔧", duration: 2, durationLabel: "À partir de 30 min", description: "Débouchage canalisations, WC, éviers — durée variable selon situation", color: "#e85d04" },
  { id: "citerne", label: "Nettoyage citerne d'eau", icon: "🛢️", duration: 8, durationLabel: "1 journée complète", description: "Nettoyage complet de citerne d'eau", color: "#1b4332" },
  { id: "panneaux", label: "Panneaux photovoltaïques", icon: "☀️", duration: 4, durationLabel: "Demi-journée", description: "Nettoyage complet de panneaux solaires", color: "#f4a100" },
  { id: "ramonage", label: "Ramonage cheminée", icon: "🏠", duration: 2, durationLabel: "2 heures", description: "Ramonage et entretien de cheminée", color: "#6d4c41" },
  { id: "inspection", label: "Inspection caméra", icon: "📷", duration: 1, durationLabel: "1 heure", description: "Inspection vidéo des canalisations", color: "#1d3557" },
  { id: "hydrocurage", label: "Hydrocurage", icon: "💧", duration: 1.5, durationLabel: "1h30", description: "Nettoyage haute pression des canalisations", color: "#0077b6" },
];

const HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7; }

export default function App() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const [rgpd, setRgpd] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [calStatus, setCalStatus] = useState("idle");

  const today = new Date(); today.setHours(0,0,0,0);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const svc = SERVICES.find(s => s.id === service);

  function isDisabled(day) {
    const d = new Date(calYear, calMonth, day);
    return d < today || d.getDay() === 0;
  }
  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1);
    setSelectedDate(null); setSelectedHour(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1);
    setSelectedDate(null); setSelectedHour(null);
  }
  function formatDate(d) {
    if (!d) return "";
    return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
  }

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.email || !form.address || !rgpd) return;
    setCalStatus("loading");
    setSubmitted(true);
    try {
      await addEventToGoogleCalendar(svc, selectedDate, selectedHour, form);
      setCalStatus("success");
    } catch (e) {
      console.error(e);
      setCalStatus("error");
    }
  }

  function reset() {
    setStep(1); setService(null); setSelectedDate(null); setSelectedHour(null);
    setForm({ name:"",phone:"",email:"",address:"",note:"" });
    setRgpd(false); setSubmitted(false); setCalStatus("idle");
  }

  const steps = ["Service","Date & Heure","Vos infos","Confirmation"];

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{fontSize:56, textAlign:"center", marginBottom:12}}>
            {calStatus === "success" ? "✅" : calStatus === "error" ? "⚠️" : "⏳"}
          </div>
          <h2 style={{textAlign:"center", fontSize:22, fontWeight:700, color:"#1b4332", marginBottom:20, marginTop:0}}>
            {calStatus === "loading" ? "Connexion à Google Calendar..." : "Rendez-vous confirmé !"}
          </h2>
          {calStatus === "success" && (
            <div style={{background:"#e8f5e9", borderRadius:10, padding:"12px 16px", marginBottom:16, textAlign:"center", fontSize:14, color:"#1b4332", fontWeight:600}}>
              📅 Ajouté automatiquement dans votre Google Calendar !
            </div>
          )}
          {calStatus === "error" && (
            <div style={{background:"#fff3e0", borderRadius:10, padding:"12px 16px", marginBottom:16, textAlign:"center", fontSize:13, color:"#e65100"}}>
              ⚠️ Le RDV est confirmé mais n'a pas pu être ajouté au calendrier.
            </div>
          )}
          <div style={S.summaryBox}>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Service</span><span>{svc?.icon} {svc?.label}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Durée</span><span>{svc?.durationLabel}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Date</span><span>{formatDate(selectedDate)}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Heure</span><span>{selectedHour}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Client</span><span>{form.name}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Tél</span><span>{form.phone}</span></div>
            <div style={S.summaryRow}><span style={S.summaryLabel}>Adresse</span><span>{form.address}</span></div>
          </div>
          <button style={{...S.nextBtn, width:"100%", marginTop:8}} onClick={reset}>+ Nouveau rendez-vous</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>🔧 APR Débouchage</div>
        <div style={S.headerSub}>Prise de rendez-vous en ligne</div>
      </div>

      <div style={S.progress}>
        {steps.map((s, i) => (
          <div key={i} style={S.progressStep}>
            <div style={{...S.progressDot, background: i+1<=step?"#e85d04":"#ddd", color: i+1<=step?"#fff":"#aaa"}}>{i+1}</div>
            <span style={{...S.progressLabel, color: i+1===step?"#e85d04":"#aaa"}}>{s}</span>
          </div>
        ))}
      </div>

      <div style={S.card}>

        {step === 1 && (
          <div>
            <h2 style={S.stepTitle}>Quel service souhaitez-vous ?</h2>
            <div style={S.serviceGrid}>
              {SERVICES.map(s => (
                <button key={s.id} style={{...S.serviceCard, borderColor: service===s.id?s.color:"#e9ecef", background: service===s.id?s.color+"10":"#fff", boxShadow: service===s.id?`0 0 0 2px ${s.color}`:"none"}} onClick={() => setService(s.id)}>
                  <div style={{fontSize:30, marginBottom:8}}>{s.icon}</div>
                  <div style={{fontWeight:700, fontSize:15, color:"#1a1a1a", marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:12, fontWeight:600, color:s.color, marginBottom:6}}>⏱ {s.durationLabel}</div>
                  <div style={{fontSize:12, color:"#888", lineHeight:1.4}}>{s.description}</div>
                </button>
              ))}
            </div>
            <button style={{...S.nextBtn, opacity: service?1:0.4}} disabled={!service} onClick={() => setStep(2)}>Choisir une date →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={S.stepTitle}>Choisissez une date et une heure</h2>
            {svc && <div style={S.durationBadge}>⏱ Durée estimée : <strong>{svc.durationLabel}</strong></div>}
            <div style={S.calendar}>
              <div style={S.calNav}>
                <button style={S.calNavBtn} onClick={prevMonth}>‹</button>
                <span style={{fontWeight:700, fontSize:16, color:"#222"}}>{MONTHS_FR[calMonth]} {calYear}</span>
                <button style={S.calNavBtn} onClick={nextMonth}>›</button>
              </div>
              <div style={S.calGrid}>
                {DAYS_FR.map(d => <div key={d} style={{textAlign:"center", fontSize:11, color:"#999", fontWeight:600, padding:"4px 0"}}>{d}</div>)}
                {Array(firstDay).fill(null).map((_,i) => <div key={"e"+i}/>)}
                {Array(daysInMonth).fill(null).map((_,i) => {
                  const day = i+1;
                  const d = new Date(calYear, calMonth, day);
                  const disabled = isDisabled(day);
                  const isSel = selectedDate && selectedDate.toDateString()===d.toDateString();
                  return (
                    <button key={day} disabled={disabled} style={{border:"1px solid #eee", borderRadius:8, padding:"8px 0", textAlign:"center", fontSize:14, cursor:disabled?"not-allowed":"pointer", background:isSel?"#e85d04":disabled?"#f5f5f5":"#fff", color:isSel?"#fff":disabled?"#ccc":"#222", fontWeight:isSel?700:400}} onClick={() => { setSelectedDate(d); setSelectedHour(null); }}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <div>
                <p style={{fontWeight:600, color:"#333", marginBottom:10, fontSize:14}}>Créneaux disponibles — {formatDate(selectedDate)}</p>
                <div style={S.hoursGrid}>
                  {HOURS.map(h => (
                    <button key={h} style={{border:"1px solid", borderRadius:8, padding:"10px 0", fontSize:14, fontWeight:600, cursor:"pointer", background:selectedHour===h?"#e85d04":"#fff", color:selectedHour===h?"#fff":"#333", borderColor:selectedHour===h?"#e85d04":"#ddd"}} onClick={() => setSelectedHour(h)}>{h}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={S.navRow}>
              <button style={S.backBtn} onClick={() => setStep(1)}>← Retour</button>
              <button style={{...S.nextBtn, opacity:selectedDate&&selectedHour?1:0.4}} disabled={!selectedDate||!selectedHour} onClick={() => setStep(3)}>Mes informations →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={S.stepTitle}>Vos coordonnées</h2>
            <div style={S.miniRecap}>
              <span>{svc?.icon} {svc?.label}</span>
              <span>📅 {formatDate(selectedDate)} à {selectedHour}</span>
              <span>⏱ {svc?.durationLabel}</span>
            </div>
            <div style={S.formGrid}>
              {[
                {key:"name", label:"Nom complet *", type:"text", placeholder:"Jean Dupont"},
                {key:"phone", label:"Téléphone *", type:"tel", placeholder:"06 12 34 56 78"},
                {key:"email", label:"Email *", type:"email", placeholder:"jean@example.com"},
                {key:"address", label:"Adresse d'intervention *", type:"text", placeholder:"12 rue des Lilas, 75001 Paris"},
              ].map(f => (
                <div key={f.key} style={S.formGroup}>
                  <label style={S.formLabel}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))} style={S.formInput}/>
                </div>
              ))}
              <div style={{...S.formGroup, gridColumn:"1 / -1"}}>
                <label style={S.formLabel}>Note complémentaire (optionnel)</label>
                <textarea placeholder="Accès difficile, code porte, informations utiles..." value={form.note} onChange={e => setForm(p => ({...p, note:e.target.value}))} style={{...S.formInput, minHeight:80, resize:"vertical"}}/>
              </div>
            </div>
            <div style={S.navRow}>
              <button style={S.backBtn} onClick={() => setStep(2)}>← Retour</button>
              <button style={{...S.nextBtn, opacity:form.name&&form.phone&&form.email&&form.address?1:0.4}} disabled={!form.name||!form.phone||!form.email||!form.address} onClick={() => setStep(4)}>Récapitulatif →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={S.stepTitle}>Récapitulatif de votre demande</h2>
            <div style={S.summaryBox}>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Service</span><span>{svc?.icon} {svc?.label}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Durée</span><span>{svc?.durationLabel}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Date</span><span>{formatDate(selectedDate)}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Heure</span><span>{selectedHour}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Nom</span><span>{form.name}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Téléphone</span><span>{form.phone}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Email</span><span>{form.email}</span></div>
              <div style={S.summaryRow}><span style={S.summaryLabel}>Adresse</span><span>{form.address}</span></div>
              {form.note && <div style={S.summaryRow}><span style={S.summaryLabel}>Note</span><span>{form.note}</span></div>}
            </div>

            {/* Case RGPD */}
            <div style={{background:"#f8f9fa", borderRadius:10, padding:"14px 16px", marginBottom:12, border: rgpd ? "1px solid #e85d04" : "1px solid #eee"}}>
              <label style={{display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer"}}>
                <input type="checkbox" checked={rgpd} onChange={e => setRgpd(e.target.checked)} style={{marginTop:3, width:16, height:16, cursor:"pointer", accentColor:"#e85d04"}}/>
                <span style={{color:"#444", fontSize:13, lineHeight:1.6}}>
                  J'accepte les <a href="/privacy.html" target="_blank" rel="noreferrer" style={{color:"#e85d04", fontWeight:600}}>conditions d'utilisation et la politique de confidentialité</a> d'APR Débouchage. Mes données personnelles sont utilisées uniquement pour la gestion de mon rendez-vous. ✅
                </span>
              </label>
            </div>

            <div style={{background:"#e8f5e9", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#1b4332"}}>
              📅 En confirmant, Google vous demandera l'accès à votre agenda pour y ajouter le RDV <strong>automatiquement</strong>.
            </div>
            <div style={S.navRow}>
              <button style={S.backBtn} onClick={() => setStep(3)}>← Modifier</button>
              <button style={{...S.nextBtn, background:"#1b4332", opacity: rgpd?1:0.4}} disabled={!rgpd} onClick={handleSubmit}>
                ✅ Confirmer & ajouter au calendrier
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={S.footer}>
        📞 Urgence ? Appelez le <strong>0479 80 13 87</strong> — Disponible 7j/7
      </div>
    </div>
  );
}

const S = {
  page: { minHeight:"100vh", background:"linear-gradient(135deg, #fff8f0 0%, #fdebd0 100%)", fontFamily:"'Georgia', serif", padding:"20px 16px 40px" },
  header: { textAlign:"center", marginBottom:24 },
  logo: { fontSize:28, fontWeight:700, color:"#e85d04", letterSpacing:-1 },
  headerSub: { color:"#888", fontSize:14, marginTop:4 },
  progress: { display:"flex", justifyContent:"center", gap:8, marginBottom:24, flexWrap:"wrap" },
  progressStep: { display:"flex", flexDirection:"column", alignItems:"center", gap:4 },
  progressDot: { width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, transition:"all 0.3s" },
  progressLabel: { fontSize:11, fontWeight:600, transition:"color 0.3s" },
  card: { maxWidth:640, margin:"0 auto", background:"#fff", borderRadius:20, padding:"28px 24px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)" },
  stepTitle: { fontSize:20, fontWeight:700, color:"#1a1a1a", marginBottom:20, marginTop:0 },
  serviceGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12, marginBottom:24 },
  serviceCard: { border:"2px solid #e9ecef", borderRadius:14, padding:"16px 12px", cursor:"pointer", textAlign:"center", transition:"all 0.2s", background:"#fff" },
  nextBtn: { background:"#e85d04", color:"#fff", border:"none", borderRadius:10, padding:"13px 28px", fontSize:15, fontWeight:700, cursor:"pointer", transition:"opacity 0.2s" },
  backBtn: { background:"transparent", color:"#888", border:"1px solid #ddd", borderRadius:10, padding:"13px 20px", fontSize:14, cursor:"pointer" },
  navRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:24, gap:12 },
  durationBadge: { background:"#fff3e0", color:"#e85d04", borderRadius:8, padding:"8px 14px", fontSize:14, marginBottom:18, display:"inline-block" },
  calendar: { border:"1px solid #f0f0f0", borderRadius:14, padding:16, marginBottom:20 },
  calNav: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  calNavBtn: { background:"none", border:"1px solid #ddd", borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:18, color:"#555" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4 },
  hoursGrid: { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:8 },
  miniRecap: { background:"#f8f9fa", borderRadius:10, padding:"12px 16px", display:"flex", flexWrap:"wrap", gap:12, fontSize:13, color:"#555", marginBottom:20 },
  formGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:8 },
  formGroup: { display:"flex", flexDirection:"column", gap:6 },
  formLabel: { fontSize:13, fontWeight:600, color:"#444" },
  formInput: { border:"1px solid #ddd", borderRadius:8, padding:"10px 12px", fontSize:14, color:"#222", outline:"none", fontFamily:"inherit" },
  summaryBox: { border:"1px solid #f0f0f0", borderRadius:14, overflow:"hidden", marginBottom:16 },
  summaryRow: { display:"flex", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid #f5f5f5", fontSize:14, flexWrap:"wrap", gap:4 },
  summaryLabel: { color:"#888", fontWeight:600, minWidth:90 },
  footer: { textAlign:"center", marginTop:28, fontSize:13, color:"#888" },
};
