import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  LogOut,
  Users
} from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [courses, setCourses] = useState([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseFile, setCourseFile] = useState(null);
  const [active, setActive] = useState('courses');
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [examCourseId, setExamCourseId] = useState('');
  const [examQuestionCount, setExamQuestionCount] = useState(10);
  const [examDuration, setExamDuration] = useState(30);

  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const configured = Boolean(supabase);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, s) => {
        setSession(s);

        if (event === 'PASSWORD_RECOVERY') {
          setRecovery(true);
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadProfile();
    } else {
      setProfile(null);
      setCourses([]);
    }
  }, [session]);

  async function loadProfile() {
    if (!session) return;

    const { data, error } = await supabase
      .from('Profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      setMessage('Профайл уншихад алдаа: ' + error.message);
    }

    setProfile(data);

    const { data: cs, error: ce } = await supabase
      .from('courses')
      .select('id,title,description,file_path,created_at')
      .order('created_at', { ascending: false });

    if (ce) {
      setMessage('Хичээл уншихад алдаа: ' + ce.message);
    } else {
      setCourses(cs || []);
    }
  }

  async function addCourse(e) {
    e.preventDefault();

    if (!courseTitle.trim()) {
      setMessage('Хичээлийн нэрээ оруулна уу.');
      return;
    }

    setLoading(true);

    try {
      let filePath = null;

      if (courseFile) {
        const fileName = `${Date.now()}-${courseFile.name}`;

        const { data, error } = await supabase.storage
          .from('training-materials')
          .upload(fileName, courseFile);

        if (error) throw error;

        filePath = data.path;
      }

      const { error } = await supabase
        .from('courses')
        .insert({
          title: courseTitle,
          description: courseDescription,
          file_path: filePath
        });

      if (error) throw error;

      setCourseTitle('');
      setCourseDescription('');
      setCourseFile(null);

      await loadProfile();
      setMessage('Хичээл амжилттай нэмэгдлээ.');
    } catch (err) {
      setMessage('Алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setRecovery(false);
      setNewPassword('');
      setMessage('Нууц үг амжилттай шинэчлэгдлээ.');
    }
  }

  async function sendRecovery() {
    if (!email) {
      setMessage('Имэйл хаягаа оруулна уу.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Нууц үг сэргээх холбоос имэйлээр илгээгдлээ.');
    }
  }

  async function authenticate(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        if (data.user && data.session) {
          const { error: pe } = await supabase
            .from('Profiles')
            .insert({
              user_id: data.user.id,
              Full_name: fullName,
              phone: phone,
              role: 'student'
            });

          if (pe) throw pe;
        } else if (data.user) {
          setMessage('Бүртгэл үүслээ. Имэйлээ шалгаж баталгаажуулна уу.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }
    } catch (err) {
      setMessage(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setRecovery(false);
    setMessage('');
  }

  async function openCourse(course) {
    if (!course.file_path) {
      setMessage('Энэ хичээлд материалын файл хараахан холбогдоогүй байна.');
      return;
    }

    const { data, error } = await supabase.storage
      .from('training-materials')
      .createSignedUrl(course.file_path, 3600);

    if (error) {
      setMessage(error.message);
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  }

  if (!configured) {
    return (
      <main className="setup">
        <div className="brand">
          <ShieldCheck size={38} />
          <span>Шалгагч-0101</span>
        </div>
        <h1>Сургалтын платформын тохиргоо</h1>
        <p>Supabase холболтын мэдээллийг Netlify-д оруулсны дараа сайт ажиллана.</p>
        <p>
          Шаардлагатай хувьсагч:
          <b> VITE_SUPABASE_URL</b> болон
          <b> VITE_SUPABASE_ANON_KEY</b>.
        </p>
        <small>
          Supabase-ийн service_role түлхүүрийг энд эсвэл GitHub-д хэзээ ч бүү оруулаарай.
        </small>
      </main>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <ShieldCheck size={34} />
          <div>
            <b>Шалгагч-0101</b>
            <small>МЭДЛЭГ • САХИЛГА • МЭРГЭШИЛ</small>
          </div>
        </div>

        {session && (
          <button className="out" onClick={logout}>
            <LogOut size={17} /> Гарах
          </button>
        )}
      </header>

      {recovery ? (
        <main className="auth">
          <h1>Шинэ нууц үг тохируулах</h1>

          <form onSubmit={updatePassword}>
            <label>
              Шинэ нууц үг
              <input
                type="password"
                minLength="6"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Шинэ нууц үгээ оруулна уу"
              />
            </label>

            <button className="primary" disabled={loading}>
              Нууц үг шинэчлэх
            </button>
          </form>

          {message && <p className="notice">{message}</p>}
        </main>
      ) : !session ? (
        <main className="auth">
          <div className="emblem">
            <ShieldCheck size={42} />
          </div>

          <h1>
            {mode === 'login'
              ? 'Системд нэвтрэх'
              : 'Шинэ хэрэглэгчийн бүртгэл'}
          </h1>

          <p>Хилчин шалгагчийн сургалтын цахим платформ</p>

          <form onSubmit={authenticate}>
            {mode === 'register' && (
              <>
                <label>
                  Овог нэр
                  <input
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Овог нэр"
                  />
                </label>

                <label>
                  Утас
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Утасны дугаар"
                  />
                </label>
              </>
            )}

            <label>
              Имэйл
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label>
              Нууц үг
              <input
                type="password"
                minLength="6"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Дор хаяж 6 тэмдэгт"
              />
            </label>

            <button className="primary" disabled={loading}>
              {loading
                ? 'Түр хүлээнэ үү…'
                : mode === 'login'
                  ? 'Нэвтрэх'
                  : 'Бүртгүүлэх'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              className="link"
              onClick={sendRecovery}
            >
              Нууц үг мартсан?
            </button>
          )}

          <button
            className="link"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setMessage('');
            }}
          >
            {mode === 'login'
              ? 'Бүртгэлгүй юу? Шинээр бүртгүүлэх'
              : 'Бүртгэлтэй юу? Нэвтрэх'}
          </button>

          {message && <p className="notice">{message}</p>}
        </main>
      ) : (
        <>
          <section className="welcome">
            <div>
              <span className="eyebrow">ТАВТАЙ МОРИЛ</span>
              <h1>{profile?.Full_name || session.user.email}</h1>
              <p>
                Сургалтын материал, шалгалт болон үр дүнгээ эндээс хараарай.
              </p>
            </div>

            <span className="role">
              {profile?.role?.trim().toLowerCase() === 'admin'
                ? 'АДМИН'
                : 'СУРАЛЦАГЧ'}
            </span>
          </section>

          <nav>
            <button
              className={active === 'courses' ? 'selected' : ''}
              onClick={() => setActive('courses')}
            >
              <BookOpen /> Хичээлүүд
            </button>

            <button
              className={active === 'exams' ? 'selected' : ''}
              onClick={() => setActive('exams')}
            >
              <ClipboardCheck /> Шалгалт
            </button>

            {profile?.role?.trim().toLowerCase() === 'admin' && (
              <button
                className={active === 'admin' ? 'selected' : ''}
                onClick={() => setActive('admin')}
              >
                <Users /> Удирдлага
              </button>
            )}
          </nav>

          <main className="content">
            {active === 'courses' ? (
              <>
                <h2>Сургалтын хичээлүүд</h2>

                {courses.length ? (
                  courses.map(c => (
                    <article className="course" key={c.id}>
                      <div className="courseicon">
                        <BookOpen />
                      </div>

                      <div className="grow">
                        <h3>{c.title}</h3>
                        <p>{c.description || 'Хичээлийн тайлбар'}</p>
                      </div>

                      <button
                        className="secondary"
                        onClick={() => openCourse(c)}
                      >
                        Үзэх
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="empty">
                    Одоогоор хичээл оруулаагүй байна.
                  </p>
                )}
              </>
            ) : active === 'exams' ? (
              <>
                <h2>Шалгалт</h2>
                <p className="empty">
                  Идэвхтэй шалгалтууд энд харагдана.
                  Шалгалтын интерфэйсийг дараагийн шатанд холбоно.
                </p>
              </>
            ) : active === 'admin' ? (
              <>
                <h2>Админ удирдлага</h2>

                <form onSubmit={addCourse} className="auth">
                  <h3>Шинэ хичээл нэмэх</h3>

                  <label>
                    Хичээлийн нэр
                    <input
                      value={courseTitle}
                      onChange={e => setCourseTitle(e.target.value)}
                      placeholder="Хичээлийн нэр"
                      required
                    />
                  </label>

                  <label>
                    Хичээлийн тайлбар
                    <textarea
                      value={courseDescription}
                      onChange={e => setCourseDescription(e.target.value)}
                      placeholder="Хичээлийн тайлбар"
                    />
                  </label>

                  <label>
                    Сургалтын материал
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx,.mp4,.doc,.docx"
                      onChange={e => setCourseFile(e.target.files[0])}
                    />
                  </label>

                  <button className="primary" disabled={loading}>
                    {loading ? 'Хадгалж байна...' : 'Хичээл хадгалах'}
                  </button>
                </form>
              </>
            ) : null}
          </main>
        </>
      )}

      <footer>© 2026 Шалгагч-0101 · Сургалтын платформ</footer>

      {message && session && (
        <div className="toast" onClick={() => setMessage('')}>
          {message}　×
        </div>
      )}
    </div>
  );
}
