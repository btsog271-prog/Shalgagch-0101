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
// Хэрэглэгчийн өмнө өгсөн 0101 ангийн эмблем
const officialLogo = ''; // Эмблемийг админ хэсгээс site-assets санд оруулж холбоно.
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
const [students, setStudents] = useState([]);
const [results, setResults] = useState([]);
const [certificates, setCertificates] = useState([]);
const [siteSettings, setSiteSettings] = useState({ hero_title: 'Шалгагч-0101', hero_subtitle: 'Мэдлэг бол хүч!', hero_description: 'Хилийн аюулгүй байдал — Миний үүрэг, миний хариуцлага', banner_path: null, banner_url: '' });
const [bannerFile, setBannerFile] = useState(null);
const [logoFile, setLogoFile] = useState(null);
const [courseImageFile, setCourseImageFile] = useState(null);
const [courseEditValues, setCourseEditValues] = useState({});
const [courseEditImages, setCourseEditImages] = useState({});
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
setCertificates([]);
setStudentsCount(null);
setStudents([]);
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
let currentProfile = data;
// Имэйл баталгаажуулалттай үед signUp-ийн дараа session байхгүй байж болно.
// Нэвтэрсний дараа профайл үүсээгүй бол тухайн хэрэглэгчийн профайлыг нөхөж үүсгэнэ.
if (!currentProfile) {
const metadata = session.user.user_metadata || {};
const { data: createdProfile, error: createError } = await supabase
.from('Profiles')
.insert({
user_id: session.user.id,
Full_name: metadata.full_name || metadata.Full_name || '',
phone: metadata.phone || '',
role: 'student'
})
.select('*')
.single();
if (createError) throw createError;
currentProfile = createdProfile;
}
setProfile(currentProfile);
const admin = currentProfile?.role?.trim().toLowerCase() === 'admin';
const { data: cs, error: ce } = await supabase
.from('courses')
.select('id,title,description,file_path,image_path,created_at')
.order('created_at', { ascending: false });
if (ce) throw ce;
const coursesWithImages = await Promise.all((cs || []).map(async course => {
if (!course.image_path) return { ...course, image_url: '' };
const { data: imageData } = await supabase.storage.from('site-assets').getPublicUrl(course.image_path);
return { ...course, image_url: imageData?.publicUrl || '' };
}));
setCourses(
  [...coursesWithImages].sort(
    (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
  )
);
const { data: settingsRows, error: settingsError } = await supabase
.from('site_settings')
.select('setting_key,setting_value');
if (!settingsError && settingsRows) {
const settings = Object.fromEntries(settingsRows.map(row => [row.setting_key, row.setting_value || '']));
const bannerPath = settings.banner_image || '';
const bannerUrl = bannerPath
? (bannerPath.startsWith('http') ? bannerPath : supabase.storage.from('site-assets').getPublicUrl(bannerPath).data.publicUrl)
: '';
const logoPath = settings.logo_image || '';
const logoUrl = logoPath
? (logoPath.startsWith('http') ? logoPath : supabase.storage.from('site-assets').getPublicUrl(logoPath).data.publicUrl)
: '';
setSiteSettings({
hero_title: settings.banner_title || settings.site_title || 'Шалгагч-0101',
hero_subtitle: settings.banner_subtitle || 'Мэдлэг бол хүч!',
hero_description: settings.banner_description || settings.site_description || 'Хилийн аюулгүй байдал — Миний үүрэг, миний хариуцлага',
banner_path: bannerPath,
banner_url: bannerUrl,
logo_image: logoPath,
logo_url: logoUrl
});
}
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
const { data: certificateData, error: certificateError } = await supabase
.from('training_certificates')
.select('id,certificate_no,user_id,student_name,achievement,average_score,exam_count,issued_at')
.order('issued_at', { ascending: false });
if (certificateError) {
// Гэрчилгээний хүснэгтийг SQL тохиргоо ажиллуулсны дараа уншина.
setCertificates([]);
} else {
setCertificates(certificateData || []);
}
const { data: studentData, error: studentListError } = await supabase
.from('Profiles')
.select('id,user_id,Full_name,phone,Phone,role,created_name')
.eq('role', 'student')
.order('id', { ascending: false });
if (studentListError) {
setStudents([]);
} else {
setStudents(studentData || []);
}
setActive('dashboard');
} else {
const { data: ownResults, error: ownResultsError } = await supabase
.from('exam_results')
.select('id,exam_id,user_id,score,total_questions,created_at')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false });
if (ownResultsError) {
setResults([]);
} else {
setResults(ownResults || []);
}
const { data: ownCertificates, error: ownCertificatesError } = await supabase
.from('training_certificates')
.select('id,certificate_no,user_id,student_name,achievement,average_score,exam_count,issued_at')
.eq('user_id', session.user.id)
.order('issued_at', { ascending: false });
setCertificates(ownCertificatesError ? [] : (ownCertificates || []));
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
password,
options: { data: { full_name: fullName, phone } }
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
let imagePath = null;
if (courseImageFile) {
const imageName = `courses/${Date.now()}-${courseImageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
const { data: imageData, error: imageError } = await supabase.storage.from('site-assets').upload(imageName.replace(/^site-assets\//, ''), courseImageFile, { upsert: false });
if (imageError) throw imageError;
imagePath = imageData.path;
}
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
file_path: filePath,
image_path: imagePath
});
if (error) throw error;
setCourseTitle('');
setCourseDescription('');
setCourseFile(null);
setCourseImageFile(null);
await loadProfile();
setMessage('Хичээл амжилттай нэмэгдлээ.');
} catch (err) {
setMessage('Хичээл нэмэхэд алдаа: ' + err.message);
} finally {
setLoading(false);
}
}
async function saveSiteSettings(e) {
e.preventDefault();
if (!isAdmin || !supabase) return;
setLoading(true);
try {
let bannerPath = siteSettings.banner_path || null;
let logoPath = siteSettings.logo_image || '';
if (logoFile) {
const safeLogoName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
const logoUploadPath = `logo/${Date.now()}-${safeLogoName}`;
const { data: logoData, error: logoError } = await supabase.storage.from('site-assets').upload(logoUploadPath, logoFile, { upsert: false });
if (logoError) throw logoError;
logoPath = logoData.path;
}
if (bannerFile) {
const safeName = bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
const path = `banner/${Date.now()}-${safeName}`;
const { data, error } = await supabase.storage.from('site-assets').upload(path.replace(/^site-assets\//, ''), bannerFile, { upsert: false });
if (error) throw error;
bannerPath = data.path;
}
const rows = [
{ setting_key: 'site_title', setting_value: siteSettings.hero_title || 'Шалгагч-0101' },
{ setting_key: 'banner_title', setting_value: siteSettings.hero_title || 'Шалгагч-0101' },
{ setting_key: 'banner_subtitle', setting_value: siteSettings.hero_subtitle || 'Мэдлэг бол хүч!' },
{ setting_key: 'banner_description', setting_value: siteSettings.hero_description || '' },
{ setting_key: 'banner_image', setting_value: bannerPath || '' },
{ setting_key: 'logo_image', setting_value: logoPath || '' },
{ setting_key: 'site_description', setting_value: siteSettings.hero_description || '' }
];
const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
if (error) throw error;
setBannerFile(null);
setLogoFile(null);
await loadProfile();
setMessage('Нүүр хуудасны зураг, бичвэр амжилттай хадгалагдлаа.');
} catch (err) {
setMessage('Загварын тохиргоо хадгалахад алдаа: ' + err.message);
} finally {
setLoading(false);
}
}
async function updateCourseDetails(e, course) {
e.preventDefault();
if (!isAdmin || !supabase) return;
const draft = courseEditValues[course.id] || {};
const imageFile = courseEditImages[course.id];
setLoading(true);
try {
let imagePath = course.image_path || null;
if (imageFile) {
const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
const path = `courses/${Date.now()}-${safeName}`;
const { data, error } = await supabase.storage.from('site-assets').upload(path.replace(/^site-assets\//, ''), imageFile, { upsert: false });
if (error) throw error;
imagePath = data.path;
}
const { error } = await supabase.from('courses').update({
title: draft.title ?? course.title,
description: draft.description ?? course.description,
image_path: imagePath
}).eq('id', course.id);
if (error) throw error;
setCourseEditImages(prev => ({...prev, [course.id]: null}));
await loadProfile();
setMessage('Хичээлийн мэдээлэл, зураг шинэчлэгдлээ.');
} catch (err) {
setMessage('Хичээл засахад алдаа: ' + err.message);
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
    const ok = window.confirm('Энэ асуултыг устгах уу?\nШалгалтын түүхтэй холбоотой бол устгахгүй.');
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
        throw new Error('Энэ асуулт өмнөх шалгалтын түүхэнд ашиглагдсан байна. Дүн, түүхийг хамгаалахын тулд устгах боломжгүй.');
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
        'start_exam', { p_exam_id: exam.id }
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
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (!attemptId) return;
    const { error } = await supabase.rpc('save_exam_answer', {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_selected_option: answer
    });
    if (error) setMessage('Хариулт хадгалахад алдаа: ' + error.message);
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
    if (attemptId && remainingSeconds === 0 && !examFinished) finishExam();
  }, [remainingSeconds, attemptId, examFinished]);

  function getChartData() {
    const now = new Date();
    let groups = [];
    if (chartPeriod === 'month') {
      groups = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
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
      groups = Array.from({ length: 4 }, (_, i) => ({
        key: i + 1, label: `${i + 1}-р улирал`, count: 0
      }));
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
        return { key: year, label: `${year}`, count: 0 };
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
    ? Math.round(results.reduce((sum, r) => {
        const total = Number(r.total_questions) || 0;
        const score = Number(r.score) || 0;
        return sum + (total > 0 ? (score / total) * 100 : 0);
      }, 0) / results.length)
    : 0;

  const leaderboard = students.map(student => {
    const own = results.filter(r => r.user_id === student.user_id);
    const percentages = own.map(r => {
      const total = Number(r.total_questions) || 0;
      return total ? (Number(r.score || 0) / total) * 100 : 0;
    });
    const average = percentages.length
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : 0;
    return {
      ...student,
      examCount: own.length,
      average: Math.round(average * 10) / 10
    };
  }).filter(student => student.examCount > 0)
    .sort((a, b) => b.average - a.average || b.examCount - a.examCount)
    .slice(0, 5);

  async function issueCertificate(student) {
    if (!supabase || !isAdmin || !student?.user_id) return;
    const alreadyIssued = certificates.some(c => c.user_id === student.user_id);
    if (alreadyIssued) {
      setMessage('Энэ суралцагчид гэрчилгээ өмнө нь олгогдсон байна.');
      return;
    }
    const certificateNo = `SH-0101-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    setLoading(true);
    try {
      const { error } = await supabase.from('training_certificates').insert({
        certificate_no: certificateNo,
        user_id: student.user_id,
        student_name: student.Full_name || 'Нэр оруулаагүй',
        achievement: 'Шилдэг суралцагч',
        average_score: student.average,
        exam_count: student.examCount,
        issued_by: session.user.id
      });
      if (error) throw error;
      setMessage('Гэрчилгээ амжилттай бүртгэгдлээ.');
      await loadProfile();
    } catch (err) {
      setMessage('Гэрчилгээ олгоход алдаа гарлаа. Эхлээд гэрчилгээний SQL тохиргоог ажиллуулна уу: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function printCertificate(cert) {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setMessage('Хэвлэх цонх нээгдсэнгүй. Браузерын popup зөвшөөрлийг шалгана уу.');
      return;
    }
    const issued = new Date(cert.issued_at || Date.now()).toLocaleDateString('mn-MN');
    printWindow.document.write(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Гэрчилгээ ${cert.certificate_no}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;background:#f4f1e5;font-family:Arial,sans-serif;color:#173b2b}
      .paper{min-height:570px;border:10px double #b89a3e;background:#fffdf5;padding:42px;text-align:center;position:relative}
      .logo{width:92px;height:92px;object-fit:contain}.eyebrow{letter-spacing:4px;font-size:13px;font-weight:bold;color:#8a722a}
      h1{font-family:Georgia,serif;font-size:42px;color:#174b34;margin:20px 0}h2{font-size:28px;margin:25px 0 8px}
      .name{font-size:30px;font-weight:bold;border-bottom:2px solid #b89a3e;display:inline-block;padding:8px 30px;margin:18px}
      .meta{margin-top:32px;display:flex;justify-content:space-between;font-size:14px}.number{font-weight:bold;color:#8a722a;margin-top:28px}
      @media print{body{padding:0;background:white}.paper{min-height:96vh}}
      </style></head><body><main class="paper"><img class="logo" src="${officialLogo}" alt="0101 эмблем"><div class="eyebrow">ХИЛИЙН ЦЭРГИЙН 0101 ДҮГЭЭР АНГИ</div><h1>ГЭРЧИЛГЭЭ</h1><p>Энэхүү гэрчилгээг</p><div class="name">${escapeCertificateText(cert.student_name)}</div><p><b>${escapeCertificateText(cert.achievement || 'Шилдэг суралцагч')}</b> амжилтыг үнэлэн олгов.</p><h2>${Number(cert.average_score || 0).toFixed(1)}%</h2><p>Шалгалтын тоо: ${Number(cert.exam_count || 0)}</p><div class="number">Гэрчилгээний дугаар: ${escapeCertificateText(cert.certificate_no)}</div><div class="meta"><span>Олгосон огноо: ${issued}</span><span>Шалгагч-0101</span></div></main><script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  }

  function escapeCertificateText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }
    if (!configured) {
    return (
      <main className="setup">
        <div className="brand"><ShieldCheck size={38}/><span>Шалгагч-0101</span></div>
        <h1>Сургалтын платформын тохиргоо</h1>
        <p>Supabase холболтын мэдээллийг шалгана уу.</p>
        <p>VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY</p>
        <small>service_role түлхүүрийг нийтэд бүү гаргаарай.</small>
      </main>
    );
  }

  return (
    <div className="app">
      <style>{`
        .app{background:#f4f7f3;color:#173b2b;min-height:100vh}
        header{background:#073c2b;color:white;padding:14px 5%;display:flex;justify-content:space-between;align-items:center}
        .brand{display:flex;align-items:center;gap:12px}.brand img{width:48px;height:48px;object-fit:contain}
        .brand b{display:block;font-size:20px}.brand small{display:block;color:#d8c66d;font-size:10px}
        .out,.primary{background:#0a5138;color:white;border:0;padding:12px 18px;border-radius:9px;font-weight:bold}
        .auth,.content{max-width:1100px;margin:24px auto;padding:22px}
        .auth{background:white;border:1px solid #dce6dd;border-radius:14px}
        .auth label{display:block;margin:12px 0;font-weight:600}
        input,textarea,select{display:block;width:100%;padding:11px;margin-top:6px;border:1px solid #ccd8ce;border-radius:8px;background:white;color:#173b2b}
        textarea{min-height:85px}
        .primary{margin-top:12px}.secondary,.danger,.link{border:0;border-radius:8px;padding:10px 14px;cursor:pointer}
        .secondary{background:#e5eee7;color:#14543a}.danger{background:#fbe7e5;color:#9c3028}
        .link{background:transparent;color:#17613f}
        .welcome{padding:25px 5%;background:#0b4b35;color:white;display:flex;justify-content:space-between;align-items:center}
        .welcome h1{margin:8px 0}.role{color:#e2c65d;font-weight:bold}
        nav{display:flex;gap:8px;flex-wrap:wrap;padding:14px 5%;background:#fff;border-bottom:1px solid #dce6dd}
        nav button{border:0;background:#edf3ee;color:#174b35;border-radius:8px;padding:11px 15px}
        nav button.selected{background:#0b5038;color:#fff}
        .course{display:flex;align-items:center;gap:14px;padding:15px;margin:12px 0;background:#fff;border:1px solid #dce6dd;border-radius:12px;flex-wrap:wrap}
        .courseicon{width:44px;height:44px;border-radius:10px;background:#e6efe8;color:#0b5038;display:grid;place-items:center}
        .grow{flex:1;min-width:150px}.grow h3,.grow p{margin:5px 0}
        .empty{padding:18px;color:#738078;background:#f5f8f5;border-radius:9px}
        .stat-card{background:white;padding:18px;border-radius:12px;border:1px solid #dce6dd}
        .stat-card h2{font-size:30px;color:#0a6542;margin:8px 0}
        .dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}
        .chart{display:flex;align-items:end;gap:12px;min-height:180px;padding:15px}
        .chart-column{flex:1;text-align:center;min-width:0}
        .chart-bar-area{height:120px;display:flex;align-items:end;background:#edf3ee;border-radius:8px;overflow:hidden}
        .chart-bar{width:100%;background:linear-gradient(#d9bd54,#0b6544);border-radius:7px 7px 0 0}
        .chart-tabs{display:flex;gap:8px}.chart-tabs button{padding:8px 16px;border:0;border-radius:7px;background:#edf3ee}
        .chart-tabs button.selected{background:#0b5038;color:white}
        .toast{position:fixed;bottom:15px;left:5%;right:5%;padding:14px;background:#173b2b;color:white;border-radius:10px;z-index:10}
        footer{text-align:center;padding:25px;color:#718078}
        .student-home{padding:8px}.student-hero{background:linear-gradient(120deg,#063c2b,#176448);color:white;border-radius:18px;padding:32px;margin-bottom:18px}
        .student-hero h1{font-size:34px}.student-hero h2{color:#e4c65d}
        .student-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .student-panel{background:white;padding:18px;border-radius:12px;border:1px solid #dce6dd}
        .student-panel strong{display:block;font-size:28px;color:#0b6544}
        .student-course-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
        .student-course-card{background:white;border:1px solid #dce6dd;border-radius:12px;padding:15px}
        .student-course-art{background:#0b5038;color:white;padding:18px;border-radius:8px}
        .student-course-body button{background:#0b5038;color:white;padding:9px;border:0;border-radius:8px;width:100%}
        .student-lower-grid{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:18px}
        .student-result-row{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #eee}
        .student-avatar{background:#0b5038;color:#e4c65d;padding:15px;border-radius:50%;width:55px;margin:auto}
        @media(max-width:650px){.auth,.content{padding:14px;margin:10px}.student-overview,.student-lower-grid{grid-template-columns:1fr}.welcome{display:block}.course{align-items:flex-start}}
      `}</style>

      <header>
        <div className="brand">
          <img src={siteSettings.logo_url || officialLogo} alt="0101 эмблем"/>
          <div>
            <b>Шалгагч-0101</b>
            <small>МЭДЛЭГ • САХИЛГА • МЭРГЭШИЛ</small>
          </div>
        </div>
        {session && <button className="out" onClick={logout}><LogOut size={17}/> Гарах</button>}
      </header>

      {recovery ? (
        <main className="auth">
          <h1>Шинэ нууц үг тохируулах</h1>
          <form onSubmit={updatePassword}>
            <label>Шинэ нууц үг<input type="password" minLength="6" required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
            <button className="primary" disabled={loading}>Нууц үг шинэчлэх</button>
          </form>
          {message && <p>{message}</p>}
        </main>
      ) : !session ? (
        <main className="auth">
          <div className="emblem">
            <img src={siteSettings.logo_url || officialLogo} alt="0101 эмблем" style={{width:90,height:90,objectFit:'contain'}}/>
          </div>
          <h1>{mode==='login'?'Системд нэвтрэх':'Шинэ хэрэглэгчийн бүртгэл'}</h1>
          <p>Хилийн шалгагчийн сургалтын цахим платформ</p>
          <form onSubmit={authenticate}>
            {mode==='register' && <>
              <label>Овог нэр<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Овог нэр"/></label>
              <label>Утас<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Утасны дугаар"/></label>
            </>}
            <label>Имэйл<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
            <label>Нууц үг<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Дор хаяж 6 тэмдэгт"/></label>
            <button className="primary" disabled={loading}>{loading?'Түр хүлээнэ үү…':mode==='login'?'Нэвтрэх':'Бүртгүүлэх'}</button>
          </form>
          {mode==='login' && <button className="link" onClick={sendRecovery}>Нууц үг мартсан?</button>}
          <button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setMessage('')}}>
            {mode==='login'?'Бүртгэлгүй юу? Шинээр бүртгүүлэх':'Бүртгэлтэй юу? Нэвтрэх'}
          </button>
          {message && <p className="notice">{message}</p>}
        </main>
      ) : (
        <>
          <section className="welcome">
            <div><span>ТАВТАЙ МОРИЛ</span><h1>{profile?.Full_name || session.user.email}</h1><p>Сургалтын материал, шалгалт болон үр дүнгээ эндээс хараарай.</p></div>
            <span className="role">{isAdmin?'АДМИН':'СУРАЛЦАГЧ'}</span>
          </section>

          <nav>
            <button className={active==='dashboard'?'selected':''} onClick={()=>setActive('dashboard')}><LayoutDashboard/> Dashboard</button>
            <button className={active==='courses'?'selected':''} onClick={()=>setActive('courses')}><BookOpen/> Хичээлүүд</button>
            <button className={active==='exams'?'selected':''} onClick={()=>setActive('exams')}><ClipboardCheck/> Шалгалт</button>
            {isAdmin && <button className={active==='admin'?'selected':''} onClick={()=>setActive('admin')}><Users/> Удирдлага</button>}
          </nav>

          <main className="content">
            {active==='dashboard' && isAdmin && <>
              <h2>Админы Dashboard</h2>
              <div className="dashboard-grid">
                <section className="student-panel" style={{marginTop: '24px'}}>
  <h3>Шалгалт өгсөн суралцагчид</h3>

  <div style={{overflowX: 'auto'}}>
    <table style={{width: '100%', borderCollapse: 'collapse'}}>
      <thead>
        <tr>
          <th style={{padding: '12px', textAlign: 'left'}}>№</th>
          <th style={{padding: '12px', textAlign: 'left'}}>Овог, нэр</th>
          <th style={{padding: '12px', textAlign: 'left'}}>Авсан дүн</th>
          <th style={{padding: '12px', textAlign: 'left'}}>Огноо</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, index) => {
          const student = students.find(
            s => s.user_id === r.user_id
          );
          const percent = r.total_questions
            ? Math.round(r.score / r.total_questions * 100)
            : 0;

          return (
            <tr key={r.id}>
              <td style={{padding: '12px'}}>{index + 1}</td>
              <td style={{padding: '12px'}}>
                {student?.Full_name || 'Нэр тодорхойгүй'}
              </td>
              <td style={{padding: '12px'}}>
                {r.score}/{r.total_questions} ({percent}%)
              </td>
              <td style={{padding: '12px'}}>
                {r.created_at
                  ? new Date(r.created_at).toLocaleDateString('mn-MN')
                  : '—'}
              </td>
            </tr>
          );
        })}
        {results.length === 0 && (
          <tr>
            <td colSpan="4" style={{padding: '16px'}}>
              Одоогоор шалгалтын дүн алга.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section> className="dashboard-grid">
                <div className="stat-card"><Users/><p>Нийт суралцагч</p><h2>{studentsCount ?? '—'}</h2></div>
                <div className="stat-card"><BookOpen/><p>Нийт хичээл</p><h2>{courses.length}</h2></div>
                <div className="stat-card"><ClipboardCheck/><p>Нийт шалгалт</p><h2>{exams.length}</h2></div>
                <div className="stat-card"><GraduationCap/><p>Өгсөн шалгалт</p><h2>{results.length}</h2></div>
                <div className="stat-card"><BarChart3/><p>Дундаж амжилт</p><h2>{averageScore}%</h2></div>
                <div className="stat-card"><BookOpen/><p>Нийт асуулт</p><h2>{questions.length}</h2></div>
              </div>

              <section className="auth">
                <h3>🏆 Шилдэг суралцагчид</h3>
                {leaderboard.length ? leaderboard.map((student,index)=>{
                  const hasCertificate=certificates.some(c=>c.user_id===student.user_id);
                  return <article className="course" key={student.user_id}>
                    <div className="grow"><b>{index+1}. {student.Full_name}</b><p>Дундаж: {student.average}% · Шалгалт: {student.examCount}</p></div>
                    <button className="secondary" disabled={loading||hasCertificate} onClick={()=>issueCertificate(student)}>{hasCertificate?'Олгосон':'Гэрчилгээ олгох'}</button>
                  </article>;
                }):<p className="empty">Шалгалтын дүн бүртгэгдсэний дараа шилдэг суралцагчид харагдана.</p>}
              </section>

              <section className="auth">
                <h3>Сургалтын өсөлт, бууралтын график</h3>
                <div className="chart-tabs">
                  <button className={chartPeriod==='month'?'selected':''} onClick={()=>setChartPeriod('month')}>Сар</button>
                  <button className={chartPeriod==='quarter'?'selected':''} onClick={()=>setChartPeriod('quarter')}>Улирал</button>
                  <button className={chartPeriod==='year'?'selected':''} onClick={()=>setChartPeriod('year')}>Жил</button>
                </div>
                <div className="chart">
                  {chartData.map(item=><div className="chart-column" key={item.key}>
                    <b>{item.count}</b><div className="chart-bar-area"><div className="chart-bar" style={{height:`${Math.max(5,item.count/chartMax*100)}%`}}/></div><small>{item.label}</small>
                  </div>)}
                </div>
              </section>

              <section className="auth">
                <h3>Сүүлийн шалгалтын үр дүн</h3>
                {results.slice(0,10).map(result=><article className="course" key={result.id}>
                  <div className="grow"><b>{exams.find(e=>String(e.id)===String(result.exam_id))?.title || 'Шалгалт'}</b><p>Оноо: {result.score}/{result.total_questions}</p></div>
                  <small>{new Date(result.created_at).toLocaleDateString('mn-MN')}</small>
                </article>)}
              </section>

              <section className="auth">
                <h3>🎓 Гэрчилгээ ({certificates.length})</h3>
                {certificates.map(cert=><article className="course" key={cert.id}>
                  <div className="grow"><b>{cert.student_name}</b><p>{cert.certificate_no} · {cert.average_score}%</p></div>
                  <button className="secondary" onClick={()=>printCertificate(cert)}>Хэвлэх</button>
                </article>)}
              </section>
            </>}

            {active==='dashboard' && !isAdmin && <div className="student-home">
              <section className="student-hero" style={siteSettings.banner_url?{backgroundImage:`linear-gradient(110deg,rgba(3,39,27,.9),rgba(9,75,49,.7)),url("${siteSettings.banner_url}")`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
                <span>ХИЛЧИН ШАЛГАГЧИЙН ЦАХИМ СУРГАЛТЫН ПЛАТФОРМ</span>
                <h1>{siteSettings.hero_title}</h1><h2>{siteSettings.hero_subtitle}</h2><p>{siteSettings.hero_description}</p>
                <button className="primary" onClick={()=>setActive('courses')}>Сургалт эхлэх</button>
              </section>
              <div className="student-overview">
                <section className="student-panel"><span>Миний нийт оноо</span><strong>{averageScore}%</strong><small>{results.length} шалгалт</small></section>
                <section className="student-panel"><span>Өгсөн шалгалт</span><strong>{results.length}</strong></section>
                <section className="student-panel"><span>Боломжтой хичээл</span><strong>{courses.length}</strong></section>
              </div>
              <h2>Миний хичээлүүд</h2>
              <div className="student-course-grid">
                {courses.slice(0,4).map((c,i)=><article className="student-course-card" key={c.id}>
                  <div className="student-course-art">{c.image_url?<img src={c.image_url} alt={c.title} style={{width:'100%',height:100,objectFit:'cover'}}/>:<b>0101</b>}</div>
                  <div className="student-course-body"><h3>{c.title}</h3><p>{c.description}</p><button onClick={()=>openCourse(c)}>Хичээл үзэх</button></div>
                </article>)}
              </div>
              <div className="student-lower-grid">
                <section className="student-panel"><h3>Миний шалгалтын түүх</h3>
                  {results.map(r=><div className="student-result-row" key={r.id}><span>{r.score}/{r.total_questions}</span><small>{new Date(r.created_at).toLocaleDateString('mn-MN')}</small></div>)}
                  {!results.length && <p className="empty">Шалгалтын дүн одоогоор алга байна.</p>}
                </section>
                <section className="student-panel student-profile-panel"><div className="student-avatar"><GraduationCap/></div><h3>{profile?.Full_name}</h3><p>{profile?.phone || profile?.Phone || 'Утас бүртгэгдээгүй'}</p><div className="student-mini-stats"><b>{results.length} шалгалт</b><b>{averageScore}%</b></div></section>
              </div>
            </div>}

            {active==='courses' && <>
              <h2>Сургалтын хичээлүүд</h2>
              {courses.map(c=><article className="course" key={c.id}>
                {c.image_url?<img src={c.image_url} alt={c.title} style={{width:85,height:65,objectFit:'cover',borderRadius:8}}/>:<div className="courseicon"><BookOpen/></div>}
                <div className="grow"><h3>{c.title}</h3><p>{c.description}</p></div>
                <button className="secondary" onClick={()=>openCourse(c)}>Үзэх</button>
                {isAdmin && <button className="danger" onClick={()=>deleteCourse(c)}>Устгах</button>}
              </article>)}
              {!courses.length && <p className="empty">Одоогоор хичээл оруулаагүй байна.</p>}
            </>}

            {active==='exams' && <>
              <h2>Шалгалтууд</h2>
              {exams.filter(e=>isAdmin||e.is_active).map(exam=><article className="course" key={exam.id}>
                <div className="grow"><h3>{exam.title}</h3><p>{exam.question_count} асуулт · {exam.duration_minutes} минут</p></div>
                <button className="secondary" disabled={loading||Boolean(attemptId)} onClick={()=>startExam(exam)}>Эхлэх</button>
                {isAdmin && <button className="danger" onClick={()=>deleteExam(exam)}>Устгах</button>}
              </article>)}
              {!exams.filter(e=>isAdmin||e.is_active).length && <p className="empty">Одоогоор идэвхтэй шалгалт байхгүй байна.</p>}
            </>}

            {active==='admin' && isAdmin && <>
              <h2>Админ удирдлага</h2>
              <form className="auth" onSubmit={saveSiteSettings}>
                <h3>🎨 Нүүр хуудасны загвар тохиргоо</h3>
                <label>Үндсэн гарчиг<input value={siteSettings.hero_title||''} onChange={e=>setSiteSettings(p=>({...p,hero_title:e.target.value}))}/></label>
                <label>Уриа<input value={siteSettings.hero_subtitle||''} onChange={e=>setSiteSettings(p=>({...p,hero_subtitle:e.target.value}))}/></label>
                <label>Тайлбар<textarea value={siteSettings.hero_description||''} onChange={e=>setSiteSettings(p=>({...p,hero_description:e.target.value}))}/></label>
                <label>Баннер зураг<input type="file" accept="image/*" onChange={e=>setBannerFile(e.target.files?.[0]||null)}/></label>
                <label>0101 эмблем зураг<input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files?.[0]||null)}/></label>
                <button className="primary" disabled={loading}>Загварыг хадгалах</button>
              </form>

              <form className="auth" onSubmit={addCourse}>
                <h3>Шинэ хичээл нэмэх</h3>
                <label>Хичээлийн нэр<input required value={courseTitle} onChange={e=>setCourseTitle(e.target.value)}/></label>
                <label>Тайлбар<textarea value={courseDescription} onChange={e=>setCourseDescription(e.target.value)}/></label>
                <label>Картын зураг<input type="file" accept="image/*" onChange={e=>setCourseImageFile(e.target.files?.[0]||null)}/></label>
                <label>Сургалтын материал<input type="file" accept=".pdf,.ppt,.pptx,.mp4,.doc,.docx" onChange={e=>setCourseFile(e.target.files?.[0]||null)}/></label>
                <button className="primary" disabled={loading}>Хичээл хадгалах</button>
              </form>

              <section className="auth">
                <h3>Оруулсан хичээлээ засах</h3>
                {courses.map(course=><form key={course.id} onSubmit={e=>updateCourseDetails(e,course)}>
                  <label>Хичээлийн нэр<input value={courseEditValues[course.id]?.title??course.title} onChange={e=>setCourseEditValues(p=>({...p,[course.id]:{...p[course.id],title:e.target.value}}))}/></label>
                  <label>Тайлбар<textarea value={courseEditValues[course.id]?.description??course.description??''} onChange={e=>setCourseEditValues(p=>({...p,[course.id]:{...p[course.id],description:e.target.value}}))}/></label>
                  <label>Шинэ зураг<input type="file" accept="image/*" onChange={e=>setCourseEditImages(p=>({...p,[course.id]:e.target.files?.[0]||null}))}/></label>
                  <button className="secondary" disabled={loading}>Хадгалах</button>
                </form>)}
              </section>

              <form className="auth" onSubmit={createExam}>
                <h3>Шинэ шалгалт үүсгэх</h3>
                <label>Шалгалтын нэр<input required value={examTitle} onChange={e=>setExamTitle(e.target.value)}/></label>
                <label>Хичээл сонгох<select required value={examCourseId} onChange={e=>setExamCourseId(e.target.value)}><option value="">Сонгоно уу</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
                <label>Асуултын тоо<input type="number" min="1" value={examQuestionCount} onChange={e=>setExamQuestionCount(e.target.value)}/></label>
                <label>Хугацаа (минут)<input type="number" min="1" value={examDuration} onChange={e=>setExamDuration(e.target.value)}/></label>
                <button className="primary" disabled={loading}>Шалгалт үүсгэх</button>
              </form>

              <form className="auth" onSubmit={addQuestion}>
                <h3>Шалгалтын асуулт нэмэх</h3>
                <label>Хичээл сонгох<select required value={examCourseId} onChange={e=>setExamCourseId(e.target.value)}><option value="">Сонгоно уу</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
                <label>Асуулт<textarea required value={questionText} onChange={e=>setQuestionText(e.target.value)}/></label>
                <label>A сонголт<input required value={optionA} onChange={e=>setOptionA(e.target.value)}/></label>
                <label>B сонголт<input required value={optionB} onChange={e=>setOptionB(e.target.value)}/></label>
                <label>C сонголт<input required value={optionC} onChange={e=>setOptionC(e.target.value)}/></label>
                <label>D сонголт<input required value={optionD} onChange={e=>setOptionD(e.target.value)}/></label>
                <label>Зөв хариулт<select value={correctOption} onChange={e=>setCorrectOption(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
                <button className="primary" disabled={loading}>Асуулт хадгалах</button>
              </form>

              <section className="auth">
                <h3>Оруулсан асуултууд</h3>
                {questions.map(q=><article className="course" key={q.id}><div className="grow"><b>{q.question_text}</b></div><button className="danger" onClick={()=>deleteQuestion(q)}>Устгах</button></article>)}
              </section>
              <section className="auth">
                <h3>Суралцагчдын бүртгэл ({students.length})</h3>
                {students.map(s=><article className="course" key={s.user_id}><div className="grow"><b>{s.Full_name}</b><p>{s.phone||s.Phone}</p></div></article>)}
              </section>
            </>}

            {active==='taking' && currentExam && <section className="auth">
              <h2>{currentExam.title}</h2>
              <h3>Үлдсэн хугацаа: {Math.floor(remainingSeconds/60)}:{String(remainingSeconds%60).padStart(2,'0')}</h3>
              <p>Асуулт {questionIndex+1}/{examQuestions.length}</p>
              {examQuestions[questionIndex] && <>
                <h3>{examQuestions[questionIndex].question_text}</h3>
                {['A','B','C','D'].map(letter=><label key={letter}>
                  <input type="radio" name="answer" checked={selectedAnswers[examQuestions[questionIndex].question_id]===letter} onChange={()=>chooseAnswer(examQuestions[questionIndex].question_id,letter)}/>
                  {letter}. {examQuestions[questionIndex].options?.[letter]}
                </label>)}
              </>}
              <div className="course">
                <button className="secondary" disabled={questionIndex===0} onClick={()=>setQuestionIndex(p=>p-1)}>Өмнөх</button>
                {questionIndex<examQuestions.length-1?<button className="primary" onClick={()=>setQuestionIndex(p=>p+1)}>Дараагийн</button>:<button className="primary" onClick={finishExam}>Шалгалт дуусгах</button>}
              </div>
            </section>}

            {active==='result' && <section className="auth">
              <CheckCircle size={42}/><h2>Шалгалт дууслаа</h2>
              {examResult && <><h3>Таны оноо: {examResult.score}/{examResult.total_questions}</h3><p>{examResult.total_questions?Math.round(examResult.score/examResult.total_questions*100):0}% амжилт</p></>}
              <button className="primary" onClick={()=>setActive('exams')}>Шалгалтууд руу буцах</button>
            </section>}
          </main>
        </>
      )}

      <footer>© 2026 Шалгагч-0101 · Сургалтын платформ</footer>
      {message && session && <div className="toast" onClick={()=>setMessage('')}>{message}　×</div>}
    </div>
  );
}
