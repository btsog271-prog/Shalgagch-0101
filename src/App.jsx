
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  LogOut,
  Users,
  PlusCircle,
  CheckCircle,
  Clock
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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [active, setActive] = useState('courses');

  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseFile, setCourseFile] = useState(null);

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

  const [attemptId, setAttemptId] = useState(null);
  const [currentExam, setCurrentExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState(null);

  const configured = Boolean(supabase);
  const isAdmin =
    profile?.role?.trim().toLowerCase() === 'admin';

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, s) => {
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
      setExams([]);
    }
  }, [session]);

  async function loadProfile() {
    if (!session || !supabase) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('Profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile(data);

      const { data: cs, error: ce } = await supabase
        .from('courses')
        .select('id,title,description,file_path,created_at')
        .order('created_at', { ascending: false });

      if (ce) throw ce;

      setCourses(cs || []);

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id,course_id,title,question_count,duration_minutes,is_active,created_at')
        .order('created_at', { ascending: false });

      if (examError) throw examError;

      setExams(examData || []);
    } catch (err) {
      setMessage('Мэдээлэл уншихад алдаа: ' + err.message);
    } finally {
      setLoading(false);
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
              phone,
              role: 'student'
            });

          if (pe) throw pe;
        } else if (data.user) {
          setMessage(
            'Бүртгэл үүслээ. Имэйлээ шалгаж баталгаажуулна уу.'
          );
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
    setAttemptId(null);
    setCurrentExam(null);
    setExamQuestions([]);
    setExamFinished(false);
    setRecovery(false);
    setMessage('');
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

    setMessage(
      error
        ? error.message
        : 'Нууц үг сэргээх холбоос имэйлээр илгээгдлээ.'
    );
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
      setMessage('Хичээл нэмэхэд алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCourse(course) {
    if (!course.file_path) {
      setMessage('Энэ хичээлд материалын файл байхгүй байна.');
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

  async function createExam(e) {
    e.preventDefault();

    if (!examTitle.trim() || !examCourseId) {
      setMessage('Шалгалтын нэр болон хичээлээ сонгоно уу.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          course_id: examCourseId,
          title: examTitle,
          question_count: Number(examQuestionCount),
          duration_minutes: Number(examDuration),
          is_active: true
        });

      if (error) throw error;

      setExamTitle('');
      setExamCourseId('');
      setExamQuestionCount(10);
      setExamDuration(30);

      await loadProfile();
      setMessage('Шалгалт амжилттай үүслээ.');
    } catch (err) {
      setMessage('Шалгалт үүсгэхэд алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion(e) {
    e.preventDefault();

    if (!examCourseId || !questionText.trim()) {
      setMessage('Хичээл болон асуултаа оруулна уу.');
      return;
    }

    if (
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      setMessage('Дөрвөн хариултын сонголтоо бүрэн оруулна уу.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .insert({
          course_id: examCourseId,
          question_text: questionText,
          options: {
            A: optionA,
            B: optionB,
            C: optionC,
            D: optionD
          }
        })
        .select('id')
        .single();

      if (error) throw error;

      const { error: keyError } = await supabase
        .from('exam_answer_keys')
        .insert({
          question_id: data.id,
          correct_option: correctOption
        });

      if (keyError) throw keyError;

      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectOption('A');

      setMessage('Асуулт амжилттай хадгалагдлаа.');
    } catch (err) {
      setMessage('Асуулт хадгалахад алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startExam(exam) {
    if (attemptId) {
      setMessage('Өмнөх шалгалтаа эхлээд дуусгана уу.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: newAttemptId, error } = await supabase.rpc(
        'start_exam',
        { p_exam_id: exam.id }
      );

      if (error) throw error;

      const { data: questions, error: questionError } =
        await supabase.rpc('get_attempt_questions', {
          p_attempt_id: newAttemptId
        });

      if (questionError) throw questionError;

      if (!questions || questions.length === 0) {
        throw new Error('Шалгалтын асуулт олдсонгүй.');
      }

      setAttemptId(newAttemptId);
      setCurrentExam(exam);
      setExamQuestions(questions);
      setQuestionIndex(0);
      setSelectedAnswers({});
      setRemainingSeconds(Number(exam.duration_minutes) * 60);
      setExamFinished(false);
      setExamResult(null);
      setActive('taking');
    } catch (err) {
      setMessage('Шалгалт эхлүүлэхэд алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function chooseAnswer(questionId, answer) {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    if (!attemptId) return;

    const { error } = await supabase.rpc('save_exam_answer', {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_selected_option: answer
    });

    if (error) {
      setMessage('Хариулт хадгалахад алдаа: ' + error.message);
    }
  }

  async function finishExam() {
    if (!attemptId || examFinished) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('finish_exam', {
        p_attempt_id: attemptId
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      setExamResult(result);
      setExamFinished(true);
      setAttemptId(null);
      setActive('result');
      await loadProfile();
    } catch (err) {
      setMessage('Шалгалт дуусгахад алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!attemptId || examFinished || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptId, examFinished]);

  useEffect(() => {
    if (attemptId && remainingSeconds === 0 && !examFinished) {
      finishExam();
    }
  }, [remainingSeconds, attemptId, examFinished]);

  if (!configured) {
    return (
      <main className="setup">
        <div className="brand">
          <ShieldCheck size={38} />
          <span>Шалгагч-0101</span>
        </div>
        <h1>Сургалтын платформын тохиргоо</h1>
        <p>Supabase холболтын мэдээллийг Netlify-д оруулна уу.</p>
        <p>
          VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY
        </p>
        <small>
          service_role түлхүүрийг хэзээ ч нийтэд бүү гаргаарай.
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
                ? 'Түр хүлээнэ үү...'
                : mode === 'login'
                  ? 'Нэвтрэх'
                  : 'Бүртгүүлэх'}
            </button>
          </form>

          {mode === 'login' && (
            <button className="link" onClick={sendRecovery}>
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
              {isAdmin ? 'АДМИН' : 'СУРАЛЦАГЧ'}
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

            {isAdmin && (
              <button
                className={active === 'admin' ? 'selected' : ''}
                onClick={() => setActive('admin')}
              >
                <Users /> Удирдлага
              </button>
            )}
          </nav>

          <main className="content">
            {active === 'courses' && (
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
            )}

            {active === 'exams' && (
              <>
                <h2>Шалгалтууд</h2>

                {exams.filter(e => isAdmin || e.is_active).length ? (
                  exams
                    .filter(e => isAdmin || e.is_active)
                    .map(exam => (
                      <article className="course" key={exam.id}>
                        <div className="courseicon">
                          <ClipboardCheck />
                        </div>
                        <div className="grow">
                          <h3>{exam.title}</h3>
                          <p>
                            {exam.question_count} асуулт · {exam.duration_minutes} минут
                          </p>
                        </div>
                        <button
                          className="secondary"
                          disabled={loading || Boolean(attemptId)}
                          onClick={() => startExam(exam)}
                        >
                          Эхлэх
                        </button>
                      </article>
                    ))
                ) : (
                  <p className="empty">
                    Одоогоор идэвхтэй шалгалт байхгүй байна.
                  </p>
                )}
              </>
            )}

            {active === 'admin' && isAdmin && (
              <>
                <h2>Админ удирдлага</h2>

                <form onSubmit={addCourse} className="auth">
                  <h3>Шинэ хичээл нэмэх</h3>

                  <label>
                    Хичээлийн нэр
                    <input
                      required
                      value={courseTitle}
                      onChange={e => setCourseTitle(e.target.value)}
                    />
                  </label>

                  <label>
                    Хичээлийн тайлбар
                    <textarea
                      value={courseDescription}
                      onChange={e => setCourseDescription(e.target.value)}
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
                    Хичээл хадгалах
                  </button>
                </form>

                <form onSubmit={createExam} className="auth">
                  <h3>Шинэ шалгалт үүсгэх</h3>

                  <label>
                    Шалгалтын нэр
                    <input
                      required
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      placeholder="Шалгалтын нэр"
                    />
                  </label>

                  <label>
                    Хичээл сонгох
                    <select
                      required
                      value={examCourseId}
                      onChange={e => setExamCourseId(e.target.value)}
                    >
                      <option value="">Хичээл сонгоно уу</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Асуултын тоо
                    <input
                      type="number"
                      min="1"
                      required
                      value={examQuestionCount}
                      onChange={e => setExamQuestionCount(e.target.value)}
                    />
                  </label>

                  <label>
                    Хугацаа (минут)
                    <input
                      type="number"
                      min="1"
                      required
                      value={examDuration}
                      onChange={e => setExamDuration(e.target.value)}
                    />
                  </label>

                  <button className="primary" disabled={loading}>
                    Шалгалт үүсгэх
                  </button>
                </form>

                <form onSubmit={addQuestion} className="auth">
                  <h3>Шалгалтын асуулт нэмэх</h3>

                  <label>
                    Хичээл сонгох
                    <select
                      required
                      value={examCourseId}
                      onChange={e => setExamCourseId(e.target.value)}
                    >
                      <option value="">Хичээл сонгоно уу</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Асуулт
                    <textarea
                      required
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      placeholder="Асуултаа бичнэ үү"
                    />
                  </label>

                  <label>
                    A сонголт
                    <input
                      required
                      value={optionA}
                      onChange={e => setOptionA(e.target.value)}
                    />
                  </label>

                  <label>
                    B сонголт
                    <input
                      required
                      value={optionB}
                      onChange={e => setOptionB(e.target.value)}
                    />
                  </label>

                  <label>
                    C сонголт
                    <input
                      required
                      value={optionC}
                      onChange={e => setOptionC(e.target.value)}
                    />
                  </label>

                  <label>
                    D сонголт
                    <input
                      required
                      value={optionD}
                      onChange={e => setOptionD(e.target.value)}
                    />
                  </label>

                  <label>
                    Зөв хариулт
                    <select
                      value={correctOption}
                      onChange={e => setCorrectOption(e.target.value)}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </label>

                  <button className="primary" disabled={loading}>
                    <PlusCircle size={17} /> Асуулт хадгалах
                  </button>
                </form>
              </>
            )}

            {active === 'taking' && currentExam && (
              <section className="auth">
                <h2>{currentExam.title}</h2>

                <p>
                  <Clock size={17} /> Үлдсэн хугацаа: {' '}
                  {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, '0')}
                </p>

                <p>
                  Асуулт {questionIndex + 1} / {examQuestions.length}
                </p>

                {examQuestions[questionIndex] && (
                  <>
                    <h3>
                      {examQuestions[questionIndex].question_text}
                    </h3>

                    {['A', 'B', 'C', 'D'].map(letter => (
                      <label key={letter}>
                        <input
                          type="radio"
                          name="exam-answer"
                          checked={
                            selectedAnswers[
                              examQuestions[questionIndex].question_id
                            ] === letter
                          }
                          onChange={() =>
                            chooseAnswer(
                              examQuestions[questionIndex].question_id,
                              letter
                            )
                          }
                        />
                        {letter}. {' '}
                        {examQuestions[questionIndex].options?.[letter]}
                      </label>
                    ))}
                  </>
                )}

                <div className="course">
                  <button
                    className="secondary"
                    disabled={questionIndex === 0}
                    onClick={() =>
                      setQuestionIndex(prev => prev - 1)
                    }
                  >
                    Өмнөх
                  </button>

                  {questionIndex < examQuestions.length - 1 ? (
                    <button
                      className="primary"
                      onClick={() =>
                        setQuestionIndex(prev => prev + 1)
                      }
                    >
                      Дараагийн
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={loading}
                      onClick={finishExam}
                    >
                      Шалгалт дуусгах
                    </button>
                  )}
                </div>

                <button
                  className="link"
                  disabled={loading}
                  onClick={finishExam}
                >
                  Шалгалтаа одоо дуусгах
                </button>
              </section>
            )}

            {active === 'result' && (
              <section className="auth">
                <CheckCircle size={42} />
                <h2>Шалгалт дууслаа</h2>
                {examResult && (
                  <>
                    <h3>
                      Таны оноо: {examResult.score} / {examResult.total_questions}
                    </h3>
                    <p>
                      {examResult.total_questions > 0
                        ? Math.round(
                            examResult.score /
                            examResult.total_questions * 100
                          )
                        : 0}
                      % амжилт
                    </p>
                  </>
                )}
                <button
                  className="primary"
                  onClick={() => setActive('exams')}
                >
                  Шалгалтууд руу буцах
                </button>
              </section>
            )}
          </main>
        </>
      )}

      <footer>
        © 2026 Шалгагч-0101 · Сургалтын платформ
      </footer>

      {message && session && (
        <div className="toast" onClick={() => setMessage('')}>
          {message}　×
        </div>
      )}
    </div>
  );
}

