import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, BookOpen, ClipboardCheck, LogOut, Users, PlusCircle } from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export default function App() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [mode,setMode] = useState('login');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [fullName,setFullName] = useState('');
  const [phone,setPhone] = useState('');
  const [message,setMessage] = useState('');
  const [courses,setCourses] = useState([]);
  const [active,setActive] = useState('courses');
  const [loading,setLoading] = useState(false);
  const configured = Boolean(supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => setSession(s));
    return () => subscription.unsubscribe();
  },[]);
  useEffect(() => { if(session) loadProfile(); else {setProfile(null);setCourses([]);} },[session]);
  async function loadProfile() {
    const {data,error} = await supabase.from('Profiles').select('*').eq('user_id',session.user.id).maybeSingle();
    if(error) setMessage('Профайл уншихад алдаа: '+error.message);
    setProfile(data);
    const {data:cs,error:ce} = await supabase.from('courses').select('id,title,description,file_path,created_at').order('created_at',{ascending:false});
    if(ce) setMessage('Хичээл уншихад алдаа: '+ce.message); else setCourses(cs||[]);
  }
  async function authenticate(e) {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      if(mode==='register') {
  const {data,error} = await supabase.auth.signUp({email,password});
  if(error) throw error;

  if(data.user && data.session) {
    const { error: pe } = await supabase
      .from('Profiles')
      .insert({
        user_id: data.user.id,
        Full_name: fullName,
        phone: phone,
        role: 'student'
      });
    if(pe) throw pe;
  } else if(data.user) {
    alert('Бүртгэл үүслээ. Имэйлээ шалгаж баталгаажуулна уу.');
  }

  setMessage('Бүртгэл амжилттай. Имэйлээ шалгаарай.');
} else {
  const {error} = await supabase.auth.signInWithPassword({email,password});
  if(error) throw error;
}
} catch(err) {
  setMessage(err.message || 'Алдаа гарлаа');
}
finally {
  setLoading(false);
}
  async function openCourse(course) {
    if(!course.file_path) {setMessage('Энэ хичээлд материалын файл хараахан холбогдоогүй байна.');return;}
    const {data,error} = await supabase.storage.from('training-materials').createSignedUrl(course.file_path,3600);
    if(error) setMessage(error.message); else window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }
  if(!configured) return <main className="setup"><div className="brand"><ShieldCheck size={38}/><span>Шалгагч-0101</span></div><h1>Сургалтын платформын тохиргоо</h1><p>Supabase холболтын мэдээллийг Netlify-д оруулсны дараа сайт ажиллана.</p><p>Шаардлагатай хувьсагч: <b>VITE_SUPABASE_URL</b> болон <b>VITE_SUPABASE_ANON_KEY</b>.</p><small>Supabase-ийн service_role түлхүүрийг энд эсвэл GitHub-д хэзээ ч бүү оруулаарай.</small></main>;
  return <div className="app">
    <header><div className="brand"><ShieldCheck size={34}/><div><b>Шалгагч-0101</b><small>МЭДЛЭГ • САХИЛГА • МЭРГЭШИЛ</small></div></div>{session&&<button className="out" onClick={logout}><LogOut size={17}/> Гарах</button>}</header>
    {!session ? <main className="auth"><div className="emblem"><ShieldCheck size={42}/></div><h1>{mode==='login'?'Системд нэвтрэх':'Шинэ хэрэглэгчийн бүртгэл'}</h1><p>Хилийн шалгагчийн сургалтын цахим платформ</p><form onSubmit={authenticate}>
      {mode==='register'&&<><label>Овог нэр<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Овог нэр"/></label><label>Утас<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Утасны дугаар"/></label></>}
      <label>Имэйл<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
      <label>Нууц үг<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Дор хаяж 6 тэмдэгт"/></label>
      <button className="primary" disabled={loading}>{loading?'Түр хүлээнэ үү…':mode==='login'?'Нэвтрэх':'Бүртгүүлэх'}</button>
    </form><button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setMessage('')}}>{mode==='login'?'Бүртгэлгүй юу? Шинээр бүртгүүлэх':'Бүртгэлтэй юу? Нэвтрэх'}</button>{message&&<p className="notice">{message}</p>}</main>:
    <><section className="welcome"><div><span className="eyebrow">ТАВТАЙ МОРИЛ</span><h1>{profile?.Full_name||session.user.email}</h1><p>Сургалтын материал, шалгалт болон үр дүнгээ эндээс хараарай.</p></div><span className="role">{profile?.role==='admin'?'АДМИН':'СУРАЛЦАГЧ'}</span></section>
    <nav><button className={active==='courses'?'selected':''} onClick={()=>setActive('courses')}><BookOpen/> Хичээлүүд</button><button className={active==='exams'?'selected':''} onClick={()=>setActive('exams')}><ClipboardCheck/> Шалгалт</button>{profile?.role==='admin'&&<button className={active==='admin'?'selected':''} onClick={()=>setActive('admin')}><Users/> Удирдлага</button>}</nav>
    <main className="content">{active==='courses'?<><h2>Сургалтын хичээлүүд</h2>{courses.length?courses.map(c=><article className="course" key={c.id}><div className="courseicon"><BookOpen/></div><div className="grow"><h3>{c.title}</h3><p>{c.description||'Хичээлийн тайлбар'}</p></div><button className="secondary" onClick={()=>openCourse(c)}>Үзэх</button></article>):<p className="empty">Одоогоор хичээл оруулаагүй байна.</p>}</>:active==='exams'?<><h2>Шалгалт</h2><p className="empty">Идэвхтэй шалгалтууд энд харагдана. Шалгалтын интерфэйсийг дараагийн шатанд холбоно.</p></>:<><h2>Админ удирдлага</h2><p className="empty">Хичээл, асуулт, хэрэглэгчийн удирдлагын хэсгийг дараагийн шатанд нэмнэ.</p></>}</main></>}
    <footer>© 2026 Шалгагч-0101 · Сургалтын платформ</footer>
    {message&&session&&<div className="toast" onClick={()=>setMessage('')}>{message}　×</div>}
  </div>;
}
