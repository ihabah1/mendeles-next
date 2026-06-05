"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { extractApiError } from "@/lib/api/client";
import { lottoService } from "@/lib/api/lotto";
import { formatPrintSuccessMessage } from "@/lib/api/print-feedback";
import { DEMO_ORDER, isDemoMode as checkDemoMode } from "@/lib/demo";

interface TableSel { nums: Set<number>; strong: number | null; }
type Selections = Record<number, TableSel>;
interface LottoData { order_number: string; customer_name: string; draw_date: string; sets: RawSet[]; total_ils: string; status: string; }
interface RawSet { set_index: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; strong: number; draw_date: string; }
interface ParsedSet { nums: number[]; strong: number; }

const ROWS = [[1,2,3,4,5,6,7,8,9,10],[11,12,13,14,15,16,17,18,19,20],[21,22,23,24,25,26,27,28,29,30],[31,32,33,34,35,36,37]];
const STRONG_NUMS = [1,2,3,4,5,6,7];
const TABLE_PRICE = 2.5, COMMISSION = 5.0;

function emptyTables(): Selections {
  const s: Selections = {};
  for (let i = 1; i <= 14; i++) s[i] = { nums: new Set(), strong: null };
  return s;
}

function LottoToast({ toast }: { toast: { msg: string; type: string } | null }) {
  if (!toast) return null;
  const border =
    toast.type === "err" ? "#ff6b7a" : toast.type === "info" ? "var(--gold)" : "var(--green)";
  const color =
    toast.type === "err" ? "#ff6b7a" : toast.type === "info" ? "var(--gold)" : "var(--green)";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--navy-c)",
        border: `1px solid ${border}`,
        borderRadius: 9,
        padding: "10px 18px",
        fontSize: ".85rem",
        fontWeight: 700,
        color,
        maxWidth: "min(92vw, 420px)",
        textAlign: "center",
        lineHeight: 1.45,
        pointerEvents: "none",
        boxShadow: "0 4px 24px rgba(0,0,0,.45)",
      }}
    >
      {toast.msg}
    </div>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  if (!open) return null;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--navy-c)', border: '1px solid var(--navy-b)', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.6)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, left: 12, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        {children}
      </div>
    </div>
  );
}

function AutoFillModal({ open, onClose, onFill }: { open: boolean; onClose: () => void; onFill: (count: number) => void }) {
  const [selected, setSelected] = useState<number | 'custom'>(2);
  const [custom, setCustom] = useState(2);
  const opts = [
    { val: 2, label: '2 טבלאות', sub: 'מינימום לשליחה' },
    { val: 4, label: '4 טבלאות', sub: 'הכי נפוץ' },
    { val: 6, label: '6 טבלאות', sub: 'חצי טופס' },
    { val: 14, label: '14 טבלאות', sub: 'מלא את כל הטופס' },
    { val: 'custom' as const, label: 'מספר מותאם אישית', sub: 'בחר כמה שתרצה' },
  ];
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚡</div>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '1.1rem', fontWeight: 900, color: 'var(--cream)', marginBottom: 8 }}>מילוי אוטומטי — איך זה עובד?</div>
        <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6, textAlign: 'right' }}>
          המספרים שיוכנסו לטבלאות <strong style={{ color: 'var(--gold)' }}>נלקחים מתוך 200 הסטים שרכשת</strong>.<br />
          כל סט כולל 6 מספרים + חזק שנבחרו במיוחד עבורך.<br />
          המילוי האוטומטי ממלא לפי הסטים שלך — <strong style={{ color: 'var(--gold)' }}>לא מספרים אקראיים</strong>.<br /><br />
          בחר כמה טבלאות למלות:
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {opts.map(o => (
          <div key={String(o.val)} onClick={() => setSelected(o.val as number | 'custom')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy)', border: `1px solid ${selected === o.val ? 'var(--gold)' : 'var(--navy-b)'}`, borderRadius: 9, padding: '10px 14px', cursor: 'pointer', transition: 'all .15s' }}>
            <div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: selected === o.val ? 'var(--gold)' : 'var(--cream)' }}>{o.label}</div>
              <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{o.sub}</div>
            </div>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === o.val ? 'var(--gold)' : 'var(--navy-b)'}`, background: selected === o.val ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontSize: '.7rem', fontWeight: 900, flexShrink: 0 }}>
              {selected === o.val ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>
      {selected === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <label style={{ fontSize: '.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>כמה טבלאות:</label>
          <input type="number" min={2} max={14} step={2} value={custom} onChange={e => setCustom(parseInt(e.target.value)||2)}
            style={{ width: 70, background: 'var(--navy)', border: '1px solid var(--navy-b)', borderRadius: 7, color: 'var(--cream)', fontFamily: 'Heebo,sans-serif', fontSize: '.88rem', padding: '6px 10px', textAlign: 'center' }} />
        </div>
      )}
      <button onClick={() => { const c = selected === 'custom' ? custom : selected as number; onFill(c % 2 === 0 ? c : c - 1); onClose(); }}
        style={{ width: '100%', padding: 11, border: 'none', borderRadius: 9, background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'Heebo,sans-serif', fontSize: '.88rem', fontWeight: 800, cursor: 'pointer' }}>
        ⚡ מלא עכשיו
      </button>
    </Modal>
  );
}

function PasteModal({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (sets: ParsedSet[], count: number) => void }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedSet[]>([]);
  const [n, setN] = useState(14);

  const parse = (t: string): ParsedSet[] => t.split('\n').map(l=>l.trim()).filter(Boolean).reduce<ParsedSet[]>((acc, line) => {
    const nums = line.split(/[\s,،]+/).map(x=>parseInt(x)).filter(x=>!isNaN(x)&&x>=1&&x<=37);
    if(nums.length<7) return acc;
    const main=nums.slice(0,6),strong=nums[6];
    if(new Set(main).size!==6||strong<1||strong>7) return acc;
    return [...acc,{nums:main,strong}];
  }, []);

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 8 }}>🎯</div>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '1.1rem', fontWeight: 900, color: 'var(--cream)', textAlign: 'center', marginBottom: 8 }}>מלא לפי הסטים שלך</div>
      <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
        הדבק את הסטים שלך — כל שורה היא סט אחד.<br />
        <strong>פורמט:</strong> 6 מספרים ואז מספר חזק, מופרדים בפסיקים או רווחים.<br />
        <span style={{ color: 'var(--gold)', fontSize: '.68rem' }}>לדוגמה: 3, 7, 12, 25, 33, 36, 5</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
          <span>הסטים שלך (שורה = סט אחד):</span>
          {parsed.length > 0 && <span style={{ color: 'var(--gold)' }}>✓ {parsed.length} סטים זוהו</span>}
        </div>
        <textarea value={text} onChange={e => { setText(e.target.value); setParsed(parse(e.target.value)); }}
          placeholder={"הדבק כאן את הסטים שלך...\n3, 7, 12, 25, 33, 36, 5\n1, 8, 14, 20, 29, 37, 3\n..."}
          style={{ width: '100%', height: 150, background: 'var(--navy)', border: '1px solid var(--navy-b)', borderRadius: 9, color: 'var(--cream)', fontFamily: 'monospace', fontSize: '.8rem', padding: '10px 12px', resize: 'vertical', textAlign: 'right', lineHeight: 1.8, outline: 'none' }} />
      </div>
      {parsed.length > 0 && (
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginBottom: 10, maxHeight: 60, overflowY: 'auto', lineHeight: 1.7 }}>
          {parsed.slice(0,4).map((s,i)=><div key={i}><span style={{color:'var(--gold)'}}>סט {i+1}:</span> {s.nums.join(' – ')} | 💪{s.strong}</div>)}
          {parsed.length > 4 && <div>...ועוד {parsed.length-4}</div>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <label style={{ fontSize: '.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>כמה טבלאות למלות:</label>
        <input type="number" min={2} max={14} step={2} value={n} onChange={e=>setN(parseInt(e.target.value)||14)}
          style={{ width: 70, background: 'var(--navy)', border: '1px solid var(--navy-b)', borderRadius: 7, color: 'var(--cream)', fontFamily: 'Heebo,sans-serif', fontSize: '.88rem', padding: '6px 10px', textAlign: 'center' }} />
        <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>(זוגי בלבד)</span>
      </div>
      <button onClick={() => { if(!parsed.length) return; onApply(parsed, n%2===0?n:n-1); onClose(); }}
        style={{ width: '100%', padding: 11, border: 'none', borderRadius: 9, background: parsed.length ? 'linear-gradient(135deg,#1db96a,#17a25d)' : 'var(--navy-b)', color: '#fff', fontFamily: "'Frank Ruhl Libre',serif", fontSize: '.95rem', fontWeight: 900, cursor: parsed.length ? 'pointer' : 'not-allowed', marginBottom: 8 }}>
        ✅ מלא טבלאות לפי הסטים שלי
      </button>
      <button onClick={onClose} style={{ width: '100%', padding: 9, border: '1px solid var(--navy-b)', borderRadius: 9, background: 'none', color: 'var(--muted)', fontFamily: 'Heebo,sans-serif', fontSize: '.78rem', cursor: 'pointer' }}>ביטול</button>
    </Modal>
  );
}

export default function LottoPage() {
  return (
    <ProtectedRoute allowDemo>
      <LottoPageInner />
    </ProtectedRoute>
  );
}

function LottoPageInner() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<LottoData | null>(null);
  const [sel, setSel] = useState<Selections>(emptyTables());
  const [allSets, setAllSets] = useState<RawSet[]>([]);
  const [userTier, setUserTier] = useState<'premium'|'registered'>('registered');
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [isDouble, setIsDouble] = useState(false);
  const [result, setResult] = useState<{orderNumber:string;total:number;count:number}|null>(null);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [showAuto, setShowAuto] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const isDemo = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type = "ok", ms = 2800) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ msg, type });
    if (ms > 0) {
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, ms);
    }
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  useEffect(()=>{
    isDemo.current = checkDemoMode();
    const load = async () => {
      if(isDemo.current){
        const d = DEMO_ORDER as unknown as LottoData;
        setData(d); setAllSets(d.sets); setSel(emptyTables()); setUserTier('premium'); return;
      }
      if(!isAuthenticated){ router.push('/auth?redirect=/lotto'); return; }
      try{
        const d = await lottoService.mySets();
        const sets: RawSet[] = (d.sets || []).map(s => ({
          ...s,
          draw_date: s.draw_date || new Date().toISOString().slice(0, 10),
        }));
        setAllSets(sets); setSel(emptyTables());
        setData({order_number:'טופס חדש',customer_name:'',draw_date:new Date().toISOString().slice(0,10),sets,total_ils:'0',status:'new'});
        setUserTier(d.tier === 'premium' ? 'premium' : 'registered');
      }catch(e){
        console.error(e);
        showToast(extractApiError(e, 'שגיאה בטעינת הסטים'), 'err');
      }
    };
    load();
  },[router, isAuthenticated, showToast]);

  const toggleNum = useCallback((tIdx:number,n:number)=>{
    setSel(prev=>{
      const d={...prev[tIdx],nums:new Set(prev[tIdx].nums)};
      if(d.nums.has(n)) d.nums.delete(n);
      else if(d.nums.size<6) d.nums.add(n);
      else{ showToast('כבר 6 מספרים בטבלה '+tIdx,'err'); return prev; }
      return{...prev,[tIdx]:d};
    });
  },[showToast]);

  const toggleStrong = useCallback((tIdx:number,n:number)=>{
    setSel(prev=>({...prev,[tIdx]:{...prev[tIdx],strong:prev[tIdx].strong===n?null:n}}));
  },[]);

  const handleAutoFill = useCallback((count:number)=>{
    if(userTier!=='premium'){ showToast('מילוי אוטומטי מהסטים זמין למנויים בלבד 🔒','err'); return; }
    const even=count%2===0?count:count-1;
    setSel(prev=>{
      const next={...prev};
      const usedIdx=new Set<number>();
      let filled=0;
      for(let i=1;i<=14&&filled<even;i++){
        if(next[i].nums.size===0){
          const avail=allSets.filter(s=>!usedIdx.has(s.set_index)&&s.n1>0);
          if(avail.length>0){
            const s=avail[0]; usedIdx.add(s.set_index);
            next[i]={nums:new Set([s.n1,s.n2,s.n3,s.n4,s.n5,s.n6].map(Number)),strong:Number(s.strong)};
          } else {
            const pool=Array.from({length:37},(_,j)=>j+1);
            for(let k=pool.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[pool[k],pool[j]]=[pool[j],pool[k]];}
            next[i]={nums:new Set(pool.slice(0,6)),strong:Math.floor(Math.random()*7)+1};
          }
          filled++;
        }
      }
      return next;
    });
    showToast(`⚡ ${even} טבלאות מולאו מהסטים שלך!`,'info');
  },[userTier,allSets,showToast]);

  const handlePasteApply = useCallback((sets:ParsedSet[],count:number)=>{
    const even=count%2===0?count:count-1;
    setSel(prev=>{
      const next={...prev}; let idx=0;
      for(let t=1;t<=14&&idx<Math.min(sets.length,even);t++){
        if(next[t].nums.size===0){ next[t]={nums:new Set(sets[idx].nums),strong:sets[idx].strong}; idx++; }
      }
      return next;
    });
    showToast(`✅ ${Math.min(sets.length,even)} סטים הוחלו`);
  },[showToast]);

  const clearAll=useCallback(()=>{ setSel(emptyTables()); showToast('🗑️ נוקה'); },[showToast]);

  const countFilled=useCallback(()=>Object.values(sel).filter(d=>d.nums.size===6&&d.strong).length,[sel]);

  const buildPrintTables=useCallback(()=>
    Object.entries(sel)
      .filter(([,d])=>d.nums.size===6&&d.strong)
      .map(([k,d])=>({
        number:parseInt(k,10),
        numbers:[...d.nums].sort((a,b)=>a-b),
        strong:d.strong as number,
      })),
  [sel]);

  const handlePrint=async()=>{
    if(printing){
      showToast('הדפסה בתהליך…','info',0);
      return;
    }
    const tables=buildPrintTables();
    if(!tables.length){
      showToast('לבחירת הדפסה: מלא לפחות טבלה אחת — 6 מספרים + מספר חזק','err',5000);
      return;
    }
    if(isDemo.current){ showToast('הדפסה לשרת לא זמינה בדמו','err',4000); return; }
    if(!isAuthenticated){
      showToast('יש להתחבר לפני הדפסה','err',3000);
      router.push('/auth?redirect=/lotto');
      return;
    }
    setPrinting(true);
    showToast('הדפסה בתהליך…','info',0);
    try{
      const res=await lottoService.printSummary({ tables, order_id: 0 });
      showToast(formatPrintSuccessMessage(res, tables.length),'ok',5000);
    }catch(err){
      showToast(extractApiError(err,'הדפסה נכשלה'),'err',6000);
    }finally{
      setPrinting(false);
    }
  };

  const submit=async()=>{
    const demo=isDemo.current;
    const filledEntries=Object.entries(sel).filter(([,d])=>d.nums.size===6&&d.strong);
    const canSend=filledEntries.length%2===0?filledEntries.length:filledEntries.length-1;
    if(canSend<2){ showToast('מלא לפחות 2 טבלאות','err'); return; }
    if(!isAuthenticated&&!demo){ router.push('/auth'); return; }
    setSubmitting(true);
    const sets=filledEntries.slice(0,canSend).map(([k,d])=>{
      const sorted=[...d.nums].sort((a,b)=>a-b);
      return{set_index:parseInt(k),n1:sorted[0],n2:sorted[1],n3:sorted[2],n4:sorted[3],n5:sorted[4],n6:sorted[5],strong:d.strong!};
    });
    if(demo){
      await new Promise(r=>setTimeout(r,800));
      setResult({orderNumber:'DEMO-'+Math.floor(Math.random()*9000+1000),total:canSend*(TABLE_PRICE+COMMISSION),count:canSend});
      setSubmitting(false); return;
    }
    try{
      const d=await lottoService.submit({sets,draw_date:data?.draw_date,is_double:isDouble});
      setResult({orderNumber:d.order_number,total:d.total_ils,count:canSend});
    }catch(err){
      const msg=extractApiError(err,'שגיאה');
      const axiosErr=err as {response?:{data?:{need_topup?:boolean;shortfall?:number}}};
      if(axiosErr.response?.data?.need_topup){
        showToast(`יתרה לא מספיקה — חסר ₪${axiosErr.response.data.shortfall?.toFixed(0)}`,'err');
      }else{
        showToast(msg,'err');
      }
    }finally{
      setSubmitting(false);
    }
  };

  const filled=countFilled();
  const canSend=filled>=2?(filled%2===0?filled:filled-1):0;

  if(result) return(
    <><Nav />
    <LottoToast toast={toast} />
    <div style={{maxWidth:520,margin:'0 auto',padding:'40px 16px',textAlign:'center'}}>
      <div style={{fontSize:'2.5rem',marginBottom:12}}>🎉</div>
      <h2 style={{fontFamily:"'Frank Ruhl Libre',serif",fontSize:'1.3rem',fontWeight:900,color:'var(--green)',marginBottom:8}}>{result.count} טבלאות נשלחו!</h2>
      <p style={{color:'var(--muted)',fontSize:'.82rem',marginBottom:6}}>הזמנה: <strong style={{color:'var(--gold)'}}>{result.orderNumber}</strong></p>
      <p style={{color:'var(--muted)',fontSize:'.78rem',marginBottom:24}}>סה"כ: ₪{Number(result.total).toFixed(2)} — תקבל עדכון SMS ואימייל</p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button type="button" className="btn btn-outline" disabled={printing} onClick={handlePrint}>
          {printing?'הדפסה בתהליך…':'🖨️ הדפס למדפסת'}
        </button>
        <button className="btn btn-gold" onClick={()=>{setSel(emptyTables());setResult(null);}}>מלא טפסים נוספים</button>
        <button className="btn btn-outline" onClick={()=>router.push('/profile')}>← פרופיל</button>
      </div>
    </div></>
  );

  if(!data) return <><Nav /><div style={{padding:60,textAlign:'center',color:'var(--muted)'}}>טוען...</div></>;

  return(
    <><Nav />
    <LottoToast toast={toast} />
    <AutoFillModal open={showAuto} onClose={()=>setShowAuto(false)} onFill={handleAutoFill}/>
    <PasteModal open={showPaste} onClose={()=>setShowPaste(false)} onApply={handlePasteApply}/>

    <div style={{maxWidth:520,margin:'0 auto',padding:'20px 14px 80px'}}>
      {userTier==='premium'?(
        <div style={{background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.22)',borderRadius:9,padding:'8px 14px',marginBottom:12,fontSize:'.74rem',color:'var(--gold)'}}>
          ✨ <strong>מנוי פעיל</strong> — גישה מלאה ל-200 הסטים ולכל הפונקציות
        </div>
      ):(
        <div style={{background:'rgba(138,170,190,.06)',border:'1px solid rgba(138,170,190,.18)',borderRadius:9,padding:'8px 14px',marginBottom:12,fontSize:'.74rem',color:'var(--muted)'}}>
          ℹ️ <strong>גישה חינמית</strong> — ממלא טבלאות לבד או עם הסטים שלך.{' '}
          <span style={{color:'var(--gold)',cursor:'pointer',textDecoration:'underline'}} onClick={()=>router.push('/')}>שדרג לפרימיום</span>
        </div>
      )}

      <div style={{background:'rgba(26,45,66,.85)',border:'1px solid var(--navy-b)',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',fontSize:'.76rem',color:'var(--muted)',flexWrap:'wrap',gap:8}}>
        <span>הזמנה: <strong style={{color:'var(--gold)'}}>{data.order_number}</strong></span>
        <span>הגרלה: <strong style={{color:'var(--cream)'}}>{data.draw_date}</strong></span>
        <span>סטים זמינים: <strong style={{color:'var(--gold)'}}>{allSets.length}</strong></span>
        <span>מולאו: <strong style={{color:'var(--gold)'}}>{filled}</strong>/14</span>
      </div>

      <div style={{display:'flex',gap:7,marginBottom:12,flexWrap:'wrap'}}>
        <button onClick={()=>userTier==='premium'?setShowAuto(true):showToast('מילוי אוטומטי זמין למנויים בלבד 🔒','err')}
          style={{display:'inline-flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,fontFamily:'Heebo,sans-serif',fontSize:'.78rem',fontWeight:700,cursor:'pointer',background:userTier==='premium'?'linear-gradient(135deg,var(--gold),var(--gold-l))':'var(--navy-b)',color:userTier==='premium'?'var(--navy)':'var(--muted)',border:'none',flex:1,justifyContent:'center'}}>
          ⚡ מילוי אוטומטי מהסטים שלי {userTier!=='premium'&&'🔒'}
        </button>
        <button onClick={()=>setShowPaste(true)}
          style={{display:'inline-flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,fontFamily:'Heebo,sans-serif',fontSize:'.78rem',fontWeight:700,cursor:'pointer',background:'rgba(29,185,106,.15)',border:'1px solid rgba(29,185,106,.35)',color:'var(--green)',flex:1,justifyContent:'center'}}>
          🎯 מלא לפי המספרים שלי
        </button>
        <button onClick={clearAll} style={{display:'inline-flex',alignItems:'center',padding:'8px 12px',borderRadius:8,fontFamily:'Heebo,sans-serif',fontSize:'.78rem',fontWeight:700,cursor:'pointer',background:'transparent',border:'1px solid rgba(232,0,30,.3)',color:'#ff6b7a'}}>🗑️</button>
      </div>

      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.45)',display:'flex',direction:'rtl',marginBottom:14}}>
        <div style={{background:'#e8001e',width:36,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',borderLeft:'2px solid #b50017'}}>
          <div style={{writingMode:'vertical-rl',transform:'rotate(180deg)',color:'#fff',fontFamily:"'Frank Ruhl Libre',serif",fontSize:'1rem',fontWeight:900,letterSpacing:3,flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>לוטו</div>
          <div style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontSize:'.42rem',color:'rgba(255,255,255,.6)',padding:'5px 0',borderTop:'1px solid #b50017'}}>מפעל הפיס</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{background:'#e8001e',padding:'7px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'2px solid #b50017'}}>
            <span style={{color:'#fff',fontFamily:"'Frank Ruhl Libre',serif",fontSize:'1rem',fontWeight:900}}>לוטו מפעל הפיס</span>
            <span style={{color:'rgba(255,255,255,.8)',fontSize:'.6rem'}}>{data.draw_date}</span>
          </div>
          {Array.from({length:14},(_,ti)=>{
            const tIdx=ti+1;
            const d=sel[tIdx]||{nums:new Set(),strong:null};
            const full=d.nums.size>=6;
            const isFilled=d.nums.size===6&&d.strong;
            return(
              <div key={tIdx} style={{display:'flex',borderBottom:ti<13?'1px solid #e8e8e8':'none',background:isFilled?'#f5fff8':undefined,alignItems:'stretch'}}>
                <div style={{background:'#e8001e',color:'#fff',width:28,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderLeft:'1px solid #b50017',padding:'2px 0'}}>
                  <div style={{fontSize:'.44rem',opacity:.7}}>טבלה</div>
                  <div style={{fontSize:'.82rem',fontWeight:900}}>{tIdx}</div>
                </div>
                <div style={{flex:1,padding:'2px 3px',display:'flex',flexDirection:'column',gap:1}}>
                  {ROWS.map((row,ri)=>(
                    <div key={ri} style={{display:'flex',gap:1}}>
                      {row.map(n=>{
                        const isSel=d.nums.has(n),locked=full&&!isSel;
                        return <button key={n} onClick={()=>!locked&&toggleNum(tIdx,n)}
                          style={{width:23,height:23,borderRadius:'50%',border:`1.5px solid ${isSel?'#e8001e':'#d5d5d5'}`,background:isSel?'#e8001e':'#fff',color:isSel?'#fff':'#333',fontSize:'.6rem',fontWeight:700,cursor:locked?'default':'pointer',opacity:locked?.22:1,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transform:isSel?'scale(1.08)':undefined,transition:'all .1s'}}>{n}</button>;
                      })}
                    </div>
                  ))}
                </div>
                <div style={{background:'#fff5f5',borderRight:'1px solid #ffd0d0',width:27,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',padding:'2px 2px',gap:1,justifyContent:'space-evenly'}}>
                  <div style={{fontSize:'.42rem',fontWeight:900,color:'#e8001e',textAlign:'center'}}>חזק</div>
                  {STRONG_NUMS.map(n=>(
                    <button key={n} onClick={()=>toggleStrong(tIdx,n)}
                      style={{width:23,height:23,borderRadius:'50%',border:`1.5px solid ${d.strong===n?'#8b0000':'#d5d5d5'}`,background:d.strong===n?'#8b0000':'#fff',color:d.strong===n?'#fff':'#333',fontSize:'.6rem',fontWeight:700,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{n}</button>
                  ))}
                </div>
                <div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:2,padding:'2px 3px',borderRight:'1px solid #ebebeb',flexShrink:0}}>
                  <button onClick={()=>{
                    const avail=allSets.filter(s=>s.n1>0);
                    if(avail.length>0){const s=avail[Math.floor(Math.random()*Math.min(avail.length,50))];setSel(prev=>({...prev,[tIdx]:{nums:new Set([s.n1,s.n2,s.n3,s.n4,s.n5,s.n6].map(Number)),strong:Number(s.strong)}}))}
                    else{const pool=Array.from({length:37},(_,i)=>i+1);for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}setSel(prev=>({...prev,[tIdx]:{nums:new Set(pool.slice(0,6)),strong:Math.floor(Math.random()*7)+1}}));}
                  }} style={{background:'none',border:'1px solid #e5e5e5',borderRadius:4,fontSize:'.54rem',padding:'2px 4px',cursor:'pointer',color:'#888'}}>⚡</button>
                  <button onClick={()=>setSel(prev=>({...prev,[tIdx]:{nums:new Set(),strong:null}}))} style={{background:'none',border:'1px solid #e5e5e5',borderRadius:4,fontSize:'.54rem',padding:'2px 4px',cursor:'pointer',color:'#888'}}>✕</button>
                </div>
              </div>
            );
          })}
          <div style={{background:'#f3f3f3',borderTop:'1px solid #e0e0e0',padding:'5px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'.64rem',color:'#555',fontWeight:600}}>{filled>0?`${filled}/14 מולאו`:'בחר מספרים בטבלאות'}</span>
            <span style={{fontSize:'.58rem',color:'#aaa'}}>pais.co.il</span>
          </div>
        </div>
      </div>

      <div style={{background:'rgba(26,45,66,.85)',border:'1px solid var(--navy-b)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--cream)'}}>🎯 דאבל לוטו</div>
          <div style={{fontSize:'.68rem',color:'var(--muted)',marginTop:2}}>הכפל את הסיכוי — מחיר כפול לכל טבלה</div>
        </div>
        <div onClick={()=>setIsDouble(p=>!p)} style={{width:44,height:24,borderRadius:12,background:isDouble?'var(--gold)':'var(--navy-b)',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
          <div style={{position:'absolute',top:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',left:isDouble?22:2}}/>
        </div>
      </div>
      <div style={{background:'rgba(26,45,66,.9)',border:`2px solid ${canSend>=2?'rgba(29,185,106,.35)':'var(--navy-b)'}`,borderRadius:14,padding:'16px 18px',marginBottom:12}}>
        <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--cream)',marginBottom:6}}>שליחה</div>
        <div style={{fontSize:'.74rem',color:'var(--muted)',marginBottom:12,lineHeight:1.7}}>
          {filled===0&&'מלא לפחות 2 טבלאות לשליחה'}
          {filled===1&&'מלאת טבלה אחת — צריך עוד אחת'}
          {filled>=2&&<>מולאו <strong style={{color:'var(--green)'}}>{filled}</strong> טבלאות — ניתן לשלוח <strong style={{color:'var(--gold)'}}>{canSend}</strong>{filled%2!==0&&<span style={{color:'#ffb347'}}> · טבלה אחת לא תישלח (צריך זוג)</span>}</>}
        </div>
        <button disabled={canSend<2||submitting} onClick={submit}
          style={{width:'100%',background:canSend>=2?'linear-gradient(135deg,#1db96a,#17a25d)':'var(--navy-b)',color:'#fff',fontFamily:"'Frank Ruhl Libre',serif",fontSize:'1rem',fontWeight:900,padding:13,borderRadius:10,border:'none',cursor:canSend<2?'not-allowed':'pointer',opacity:canSend<2?.4:1,display:'block'}}>
          {submitting?'...שולח':canSend>=2?`שליחה — ${canSend} טבלאות ✉️`:'שליחה ✉️'}
        </button>
        <div style={{fontSize:'.63rem',color:'var(--muted)',textAlign:'center',marginTop:7}}>שליחה בזוגות בלבד · ₪{((TABLE_PRICE+COMMISSION)*(isDouble?2:1)).toFixed(1)} לטבלה{isDouble?' (דאבל)':''}</div>
      </div>

      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-outline" onClick={()=>router.push('/profile')}>← פרופיל</button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={printing}
          onClick={handlePrint}
          title={filled===0?'מלא 6 מספרים + חזק בטבלה אחת לפחות':undefined}
          style={{
            flex:1,
            opacity:filled===0&&!printing?0.55:1,
            cursor:printing?'wait':filled===0?'help':'pointer',
          }}
        >
          {printing?'הדפסה בתהליך…':filled===0?'🖨️ הדפס (מלא טבלה)':'🖨️ הדפס'}
        </button>
      </div>
    </div></>
  );
}
