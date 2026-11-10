
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
  Clock,
  LayoutDashboard,
  Trash2,
  BarChart3,
  GraduationCap,
  RefreshCw
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
  const [questions, setQuestions] = useState([]);
  const [active, setActive] = useState('courses');

  const [studentsCount, setStudentsCount] = useState(null);
  const [results, setResults] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('month');

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
  const isAdmin = profile?.role?.trim().toLowerCase() === 'admin';

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
      setQuestions([]);
      setResults([]);
      setStudentsCount(null);
      setActive('courses');
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

      const admin = data?.role?.trim().toLowerCase() === 'admin';

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

      if (admin) {
        const { data: questionData, error: questionError } =
          await supabase
            .from('exam_questions')
            .select('id,course_id,question_text,created_at')
            .order('created_at', { ascending: false });

        if (questionError) throw questionError;
        setQuestions(questionData || []);

        const { count, error: studentError } = await supabase
          .from('Profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        if (studentError) {
          setStudentsCount(null);
        } else {
          setStudentsCount(count || 0);
        }

        const { data: resultData, error: resultError } = await supabase
          .from('exam_results')
          .select('id,exam_id,user_id,score,total_questions,created_at')
          .order('created_at', { ascending: false });

        if (resultError) {
          setResults([]);
        } else {
          setResults(resultData || []);
        }

        setActive('dashboard');
      }
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

    if (!isAdmin) return;

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

  async function deleteCourse(course) {
    if (!isAdmin) return;

    const ok = window.confirm(
      `"${course.title}" хичээлийг устгах уу?\nХэрэв шалгалт эсвэл асуулттай холбоотой бол устгахгүй.`
    );

    if (!ok) return;

    setLoading(true);

    try {
      const { count: examCount, error: examCheckError } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);

      if (examCheckError) throw examCheckError;

      const { count: questionCount, error: questionCheckError } =
        await supabase
          .from('exam_questions')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

      if (questionCheckError) throw questionCheckError;

      if ((examCount || 0) > 0 || (questionCount || 0) > 0) {
        throw new Error(
          'Энэ хичээл шалгалт эсвэл асуулттай холбоотой байна. Эхлээд холбогдох шалгалт, асуултыг шалгана уу.'
        );
      }

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (error) throw error;

      if (course.file_path) {
        const { error: storageError } = await supabase.storage
          .from('training-materials')
          .remove([course.file_path]);

        if (storageError) {
          setMessage(
            'Хичээлийн бүртгэл устлаа. Харин файл хадгалалтаас устгахад алдаа гарлаа: ' +
            storageError.message
          );
          await loadProfile();
          return;
        }
      }

      await loadProfile();
      setMessage('Хичээл амжилттай устгагдлаа.');
    } catch (err) {
      setMessage('Хичээл устгахад алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createExam(e) {
    e.preventDefault();

    if (!isAdmin) return;

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

  async function deleteExam(exam) {
    if (!isAdmin) return;

    const ok = window.confirm(
      `"${exam.title}" шалгалтыг устгах уу?\nШалгалтын түүхтэй бол устгах боломжгүй.`
    );

    if (!ok) return;

    setLoading(true);

    try {
      const { count: attemptCount, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', exam.id);

      if (attemptError) throw attemptError;

      const { count: resultCount, error: resultError } = await supabase
        .from('exam_results')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', exam.id);

      if (resultError) throw resultError;

      if ((attemptCount || 0) > 0 || (resultCount || 0) > 0) {
        throw new Error(
          'Энэ шалгалтад суралцагчийн шалгалтын түүх эсвэл дүн байна. Түүхийг хамгаалахын тулд устгах боломжгүй.'
        );
      }

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', exam.id);

      if (error) throw error;

      await loadProfile();
      setMessage('Шалгалт амжилттай устгагдлаа.');
    } catch (err) {
      setMessage('Шалгалт устгахад алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion(e) {
    e.preventDefault();

    if (!isAdmin) return;

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

    let insertedQuestionId = null;

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

      insertedQuestionId = data.id;

      const { error: keyError } = await supabase
        .from('exam_answer_keys')
        .insert({
          question_id: data.id,
          correct_option: correctOption
        });

      if (keyError) {
        await supabase
          .from('exam_questions')
          .delete()
          .eq('id', insertedQuestionId);

        throw keyError;
      }

      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectOption('A');

      await loadProfile();
      setMessage('Асуулт амжилттай хадгалагдлаа.');
    } catch (err) {
      setMessage('Асуулт хадгалахад алдаа: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuestion(question) {
    if (!isAdmin) return;

    const ok = window.confirm(
      'Энэ асуултыг устгах уу?\nШалгалтын түүхтэй холбоотой бол устгахгүй.'
    );

    if (!ok) return;

    setLoading(true);

    try {
      const { count: usedCount, error: usedError } = await supabase
        .from('exam_attempt_questions')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', question.id);

      if (usedError) throw usedError;

      const { count: answerCount, error: answerError } = await supabase
        .from('exam_attempt_answers')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', question.id);

      if (answerError) throw answerError;

      if ((usedCount || 0) > 0 || (answerCount || 0) > 0) {
        throw new Error(
          'Энэ асуулт өмнөх шалгалтын түүхэнд ашиглагдсан байна. Дүн, түүхийг хамгаалахын тулд устгах боломжгүй.'
        );
      }

      const { error: keyError } = await supabase
        .from('exam_answer_keys')
        .delete()
        .eq('question_id', question.id);

      if (keyError) throw keyError;

      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      await loadProfile();
      setMessage('Асуулт амжилттай устгагдлаа.');
    } catch (err) {
      setMessage('Асуулт устгахад алдаа: ' + err.message);
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
    if (!attemptId || examFinished || loading) return;

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

  function getChartData() {
    const now = new Date();
    let groups = [];

    if (chartPeriod === 'month') {
      groups = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - 5 + i,
          1
        );

        return {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          label: `${date.getMonth() + 1} сар`,
          count: 0
        };
      });

      results.forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const group = groups.find(g => g.key === key);
        if (group) group.count++;
      });
    } else if (chartPeriod === 'quarter') {
      groups = Array.from({ length: 4 }, (_, i) => {
        const q = i + 1;
        return {
          key: q,
          label: `${q}-р улирал`,
          count: 0
        };
      });

      results.forEach(r => {
        const d = new Date(r.created_at);
        if (d.getFullYear() === now.getFullYear()) {
          const q = Math.floor(d.getMonth() / 3) + 1;
          groups[q - 1].count++;
        }
      });
    } else {
      groups = Array.from({ length: 5 }, (_, i) => {
        const year = now.getFullYear() - 4 + i;
        return {
          key: year,
          label: `${year}`,
          count: 0
        };
      });

      results.forEach(r => {
        const d = new Date(r.created_at);
        const group = groups.find(g => g.key === d.getFullYear());
        if (group) group.count++;
      });
    }

    return groups;
  }

  const chartData = getChartData();
  const chartMax = Math.max(1, ...chartData.map(x => x.count));

  const averageScore = results.length
    ? Math.round(
        results.reduce((sum, r) => {
          const total = Number(r.total_questions) || 0;
          const score = Number(r.score) || 0;
          return sum + (total > 0 ? (score / total) * 100 : 0);
        }, 0) / results.length
      )
    : 0;

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
            {isAdmin && (
              <button
                className={active === 'dashboard' ? 'selected' : ''}
                onClick={() => setActive('dashboard')}
              >
                <LayoutDashboard /> Dashboard
              </button>
            )}

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

            {active === 'dashboard' && isAdmin && (
              <>
                <div className="course">
                  <div className="grow">
                    <h2>Удирдлагын Dashboard</h2>
                    <p>Сургалтын платформын ерөнхий мэдээлэл</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={loadProfile}
                    disabled={loading}
                  >
                    <RefreshCw size={16} /> Шинэчлэх
                  </button>
                </div>

                <div className="dashboard-grid">
                  <article className="stat-card">
                    <Users size={28} />
                    <p>Нийт суралцагч</p>
                    <h2>
                      {studentsCount === null ? '—' : studentsCount}
                    </h2>
                  </article>

                  <article className="stat-card">
                    <BookOpen size={28} />
                    <p>Нийт хичээл</p>
                    <h2>{courses.length}</h2>
                  </article>

                  <article className="stat-card">
                    <ClipboardCheck size={28} />
                    <p>Нийт шалгалт</p>
                    <h2>{exams.length}</h2>
                  </article>

                  <article className="stat-card">
                    <GraduationCap size={28} />
                    <p>Өгсөн шалгалт</p>
                    <h2>{results.length}</h2>
                  </article>

                  <article className="stat-card">
                    <BarChart3 size={28} />
                    <p>Дундаж амжилт</p>
                    <h2>{averageScore}%</h2>
                  </article>

                  <article className="stat-card">
                    <BookOpen size={28} />
                    <p>Нийт асуулт</p>
                    <h2>{questions.length}</h2>
                  </article>
                </div>

                <section className="auth">
                  <h3>Сургалтын шалгалтын статистик</h3>
                  <p>Шалгалтын дүнгийн бүртгэлийн тоо</p>

                  <div className="chart-tabs">
                    <button
                      className={chartPeriod === 'month' ? 'selected' : ''}
                      onClick={() => setChartPeriod('month')}
                    >
                      Сар
                    </button>
                    <button
                      className={chartPeriod === 'quarter' ? 'selected' : ''}
                      onClick={() => setChartPeriod('quarter')}
                    >
                      Улирал
                    </button>
                    <button
                      className={chartPeriod === 'year' ? 'selected' : ''}
                      onClick={() => setChartPeriod('year')}
                    >
                      Жил
                    </button>
                  </div>

                  {results.length === 0 ? (
                    <p className="empty">
                      Одоогоор шалгалтын дүн бүртгэгдээгүй байна.
                    </p>
                  ) : (
                    <div className="chart">
                      {chartData.map(item => (
                        <div className="chart-column" key={item.key}>
                          <b>{item.count}</b>
                          <div className="chart-bar-area">
                            <div
                              className="chart-bar"
                              style={{
                                height: `${Math.max(
                                  5,
                                  (item.count / chartMax) * 100
                                )}%`
                              }}
                            />
                          </div>
                          <small>{item.label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="auth">
                  <h3>Сүүлийн шалгалтын үр дүн</h3>

                  {results.length === 0 ? (
                    <p className="empty">
                      Шалгалтын үр дүн одоогоор алга байна.
                    </p>
                  ) : (
                    results.slice(0, 10).map(result => {
                      const exam = exams.find(
                        e => String(e.id) === String(result.exam_id)
                      );

                      return (
                        <article className="course" key={result.id}>
                          <div className="courseicon">
                            <CheckCircle />
                          </div>
                          <div className="grow">
                            <b>{exam?.title || 'Шалгалт'}</b>
                            <p>
                              Оноо: {result.score} / {result.total_questions}
                            </p>
                            <small>
                              {new Date(result.created_at).toLocaleDateString('mn-MN')}
                            </small>
                          </div>
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            )}

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
                      {isAdmin && (
                        <button
                          className="danger"
                          disabled={loading}
                          onClick={() => deleteCourse(c)}
                        >
                          <Trash2 size={16} /> Устгах
                        </button>
                      )}
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
                        {isAdmin && (
                          <button
                            className="danger"
                            disabled={loading}
                            onClick={() => deleteExam(exam)}
                          >
                            <Trash2 size={16} /> Устгах
                          </button>
                        )}
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

                <section className="auth">
                  <h3>Оруулсан шалгалтын асуултууд</h3>

                  {questions.length === 0 ? (
                    <p className="empty">
                      Одоогоор асуулт оруулаагүй байна.
                    </p>
                  ) : (
                    questions.map((q, index) => {
                      const course = courses.find(
                        c => String(c.id) === String(q.course_id)
                      );

                      return (
                        <article className="course" key={q.id}>
                          <div className="courseicon">
                            <ClipboardCheck />
                          </div>
                          <div className="grow">
                            <b>{index + 1}. {q.question_text}</b>
                            <p>{course?.title || 'Хичээл'}</p>
                          </div>
                          <button
                            className="danger"
                            disabled={loading}
                            onClick={() => deleteQuestion(q)}
                          >
                            <Trash2 size={16} /> Устгах
                          </button>
                        </article>
                      );
                    })
                  )}
                </section>
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
                    onClick={() => setQuestionIndex(prev => prev - 1)}
                  >
                    Өмнөх
                  </button>

                  {questionIndex < examQuestions.length - 1 ? (
                    <button
                      className="primary"
                      onClick={() => setQuestionIndex(prev => prev + 1)}
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

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin: 20px 0;
}

.stat-card {
  background: #123c2b;
  color: white;
  border: 1px solid #c6a34a;
  border-radius: 14px;
  padding: 20px;
}

.stat-card p {
  margin: 10px 0 5px;
  color: #e8e8e8;
}

.stat-card h2 {
  margin: 0;
  color: #e5c45b;
  font-size: 28px;
}

.chart-tabs {
  display: flex;
  gap: 8px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.chart-tabs button {
  padding: 9px 16px;
  border: 1px solid #c6a34a;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.chart-tabs button.selected {
  background: #123c2b;
  color: white;
}

.chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 12px;
  height: 220px;
  padding: 15px 5px;
  border-bottom: 1px solid #ccc;
}

.chart-column {
  display: flex;
  flex: 1;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  min-width: 0;
}

.chart-bar-area {
  height: 145px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.chart-bar {
  width: 65%;
  max-width: 45px;
  min-height: 4px;
  background: #176b47;
  border-radius: 7px 7px 0 0;
}

.chart-column small {
  font-size: 11px;
  text-align: center;
}
}
