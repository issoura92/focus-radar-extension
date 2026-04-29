const qs = new URLSearchParams(location.search);
const site = qs.get('site') || 'هذا الموقع';
const $ = id => document.getElementById(id);
const views = ['welcomeView','pathsView','trackView','lessonView','doneView'];
let currentPath = null, lessonIndex = 0, points = 0, lockUntil = 0;

const paths = [
  {id:'code', icon:'</>', title:'برمجة وتطوير', desc:'تعلم أساسيات بناء المواقع والتطبيقات.', sub:'4 خطوات عملية لتبدأ التفكير كمبرمج.', lessons:[
    ['ما هي البرمجة؟','البرمجة هي إعطاء أوامر واضحة للحاسوب لتنفيذ مهمة. الفكرة ليست حفظ الأكواد، بل تقسيم المشكلة إلى خطوات صغيرة.','مثال: إذا أردت بناء صفحة هبوط، فكّر في: العنوان، العرض، زر الشراء، ثم التصميم.','ابدأ دائمًا بسؤال: ما المشكلة التي أريد حلها؟'],
    ['HTML & CSS','HTML يبني الهيكل، و CSS يعطي الجمال. الأول مثل العظام، والثاني مثل الملابس والألوان.','<h1>عنوان</h1>\n<button>اطلب الآن</button>','لا تبدأ بالجمال قبل ترتيب الهيكل.'],
    ['JavaScript','JavaScript يجعل الصفحة تتفاعل مع المستخدم: زر، نافذة، عداد، تحقق من البيانات.','button.addEventListener("click", () => alert("مرحبا"));','التفاعل الصغير يرفع جودة المنتج كثيرًا.'],
    ['مشروع عملي','اختر فكرة صغيرة وابنِ نسخة أولى: صفحة منتج، حاسبة، أو لوحة بسيطة.','خطة 30 دقيقة: 10 دقائق تصميم، 15 دقيقة كود، 5 دقائق اختبار.','المشروع الصغير المكتمل أفضل من مشروع كبير غير منتهي.']]
  },
  {id:'design', icon:'🎨', title:'تصميم وتجربة مستخدم', desc:'تعلم كيف تجعل المنتج جميلًا وسهلًا.', sub:'خطوات سريعة لفهم التصميم الحديث.', lessons:[
    ['التباين','التصميم الجيد يوجه العين إلى الأهم: العنوان، القيمة، ثم زر الفعل.','اجعل زر الشراء أو البدء واضحًا بلون قوي ومساحة كافية.','كل شاشة يجب أن تملك هدفًا واحدًا واضحًا.'],
    ['المسافات','المساحات الفارغة ليست ضياعًا؛ هي التي تجعل التصميم يتنفس ويبدو احترافيًا.','استعمل هوامش ثابتة بين العناصر: 8، 16، 24، 32.','التصميم المزدحم يقلل الثقة.'],
    ['الألوان','اختر لونًا أساسيًا، لونًا مساعدًا، وخلفية هادئة. لا تكثر الألوان.','أزرق للثقة، بنفسجي للإبداع، أخضر للإنجاز.','الألوان تخدم الرسالة ولا تعوض ضعفها.'],
    ['اختبار المستخدم','اسأل شخصًا: أين تضغط أولًا؟ إذا تردد، التصميم يحتاج تبسيطًا.','راقب أين يتوقف المستخدم وأين يضيع.','أفضل مصمم هو من يزيل التعقيد.']]
  },
  {id:'marketing', icon:'📈', title:'التسويق الرقمي', desc:'تعلم جذب العملاء ورفع التحويل.', sub:'من الفكرة إلى رسالة بيع قوية.', lessons:[
    ['اعرف العميل','لا تبيع المنتج، بع النتيجة التي يريدها العميل.','بدل: قهوة فاخرة. قل: طاقة وتركيز بطعم لا يُنسى.','العميل يشتري التحول، لا المواصفات.'],
    ['العنوان القوي','العنوان يحدد هل يكمل الزائر أم يغادر. اجعله واضحًا ومليئًا بالفائدة.','مثال: ابدأ يومك بتركيز أعلى في أول رشفة.','اختبر 3 عناوين قبل اعتماد واحد.'],
    ['الدليل الاجتماعي','الناس تثق عندما ترى آخرين استفادوا. أضف تقييمات وتجارب وصورًا حقيقية.','تقييم قصير صادق أقوى من نص طويل مبالغ فيه.','الثقة هي العملة الحقيقية للبيع.'],
    ['الدعوة للفعل','قل للزائر بالضبط ماذا يفعل الآن: اطلب، جرّب، احجز.','زر واضح + ضمان + سبب للشراء الآن.','لا تترك الخطوة التالية غامضة.']]
  },
  {id:'business', icon:'💼', title:'ريادة الأعمال', desc:'حوّل الأفكار إلى منتجات قابلة للبيع.', sub:'تعلم كيف تختبر فكرة بسرعة.', lessons:[
    ['المشكلة أولًا','أفضل المشاريع تبدأ من ألم واضح عند الناس، وليس من فكرة جميلة فقط.','اكتب: من العميل؟ ما ألمه؟ كم سيدفع لحله؟','لا تبنِ قبل أن تتحقق من الطلب.'],
    ['العرض','العرض القوي يجمع: نتيجة واضحة، سعر مفهوم، مخاطرة أقل.','مثال: جرّب المنتج 7 أيام أو استرجع مالك.','قلل خوف العميل قبل أن تطلب منه الدفع.'],
    ['نسخة أولى','ابنِ أبسط نسخة تثبت الفكرة: صفحة، نموذج، أو خدمة يدوية.','هدف النسخة الأولى: تعلم السوق، لا الكمال.','السرعة أهم من المثالية في البداية.'],
    ['الأرقام','راقب: الزيارات، النقرات، الطلبات، تكلفة العميل، الربح.','ما لا تقيسه لا تستطيع تحسينه.','رائد الأعمال الجيد يحب الأرقام.']]
  },
  {id:'language', icon:'📚', title:'اللغات', desc:'طور مفرداتك ونطقك يوميًا.', sub:'خطة قصيرة لتعلم أي لغة.', lessons:[
    ['كلمات عالية الاستخدام','ابدأ بأكثر 100 كلمة استعمالًا، فهي تظهر في أغلب المحادثات اليومية.','اكتب 10 كلمات اليوم واستعملها في جمل قصيرة.','الكلمة التي لا تستعملها ستنساها.'],
    ['جملة واحدة يوميًا','احفظ جملة كاملة بدل كلمة منفصلة؛ الجملة تعلمك السياق.','I want to improve my skills today.','الجمل الجاهزة تسرّع الكلام.'],
    ['الاستماع','استمع لمقطع قصير وكرره بصوت عالٍ. النطق يتطور بالتقليد.','اختر مقطعًا من 30 ثانية وكرره 5 مرات.','الأذن تتعلم قبل اللسان.'],
    ['مراجعة ذكية','راجع الكلمات بعد يوم، ثم بعد 3 أيام، ثم بعد أسبوع.','اصنع بطاقات سؤال/جواب بسيطة.','التكرار المتباعد يحميك من النسيان.']]
  },
  {id:'self', icon:'🧠', title:'تطوير الذات', desc:'حسّن تركيزك وعاداتك اليومية.', sub:'خطوات عملية ضد التشتت.', lessons:[
    ['قاعدة الدقيقتين','إذا كانت المهمة تبدأ في دقيقتين، ابدأ الآن ولا تفاوض نفسك.','افتح الملف، اكتب العنوان، أو جهز الأدوات فقط.','البداية الصغيرة تكسر المقاومة.'],
    ['بيئة العمل','اجعل الأشياء المشتتة بعيدة، والأشياء المفيدة قريبة. البيئة أقوى من الإرادة.','ضع الهاتف بعيدًا وافتح نافذة العمل فقط.','صمم بيئتك لتربح بدون مقاومة.'],
    ['هدف واحد','اختر مهمة واحدة فقط للـ 25 دقيقة القادمة. تعدد المهام يخدعك بالإنتاجية.','اليوم: أصلح ملف واحد أو أنجز صفحة واحدة.','التركيز يعني قول لا للباقي مؤقتًا.'],
    ['مكافأة ذكية','بعد الإنجاز، كافئ نفسك باستراحة قصيرة، لا بعودة طويلة للمشتتات.','5 دقائق مشي أو ماء أو تمدد.','المكافأة تبني عادة الاستمرار.']]
  }
];

function show(id){ views.forEach(v => $(v).classList.toggle('hidden', v !== id)); }
function fmtRemain(){ if(!lockUntil) return '--'; const m=Math.max(0, Math.ceil((lockUntil-Date.now())/60000)); return m+'د'; }
async function refreshLock(){ try{ const d=await chrome.runtime.sendMessage({type:'GET_DASHBOARD'}); const lock=d.locks?.[site]; lockUntil=lock?.until||0; $('timerBadge').textContent=lockUntil>Date.now()?`متبقي ${fmtRemain()}`:'انتهى الحظر'; $('remainText').textContent=fmtRemain(); }catch{} }
function renderPaths(){ $('pathGrid').innerHTML=paths.map(p=>`<button class="path" data-id="${p.id}"><div class="icon">${p.icon}</div><h3>${p.title}</h3><p>${p.desc}</p></button>`).join(''); document.querySelectorAll('.path').forEach(b=>b.onclick=()=>selectPath(b.dataset.id)); }
function selectPath(id){ currentPath=paths.find(p=>p.id===id); lessonIndex=0; renderTrack(); show('trackView'); }
function renderTrack(){ $('trackCategory').textContent=currentPath.title; $('trackTitle').textContent='مسارك التعليمي'; $('trackSub').textContent=currentPath.sub; $('pointsBadge').textContent='🔥 '+points; $('progressFill').style.width=`${Math.round((lessonIndex/currentPath.lessons.length)*100)}%`; $('stepsList').innerHTML=currentPath.lessons.map((l,i)=>`<div class="step ${i<lessonIndex?'doneStep':''}"><div class="num">${i+1}</div><div><b>${l[0]}</b><span>${i<lessonIndex?'تم الإكمال':'خطوة تعليمية قصيرة'}</span></div></div>`).join(''); $('showLessonBtn').textContent=lessonIndex===0?'ابدأ الدرس الأول':'تابع الدرس التالي'; }
function renderLesson(){ const l=currentPath.lessons[lessonIndex]; $('lessonCounter').textContent=`${lessonIndex+1} / ${currentPath.lessons.length}`; $('lessonTitle').textContent=l[0]; $('lessonText').textContent=l[1]; $('lessonBox').textContent=l[2]; $('lessonTip').textContent=l[3]; $('prevLesson').disabled=lessonIndex===0; show('lessonView'); }

$('siteName').textContent=site; $('startBtn').onclick=()=>show('pathsView'); $('backBtn').onclick=()=>show('pathsView'); $('showLessonBtn').onclick=renderLesson; $('prevLesson').onclick=()=>{ if(lessonIndex>0){ lessonIndex--; renderLesson(); } };
$('completeLesson').onclick=()=>{ points+=10; lessonIndex=Math.min(lessonIndex+1,currentPath.lessons.length); $('earnedPoints').textContent='+10'; refreshLock(); show('doneView'); };
$('nextLesson').onclick=()=>{ if(lessonIndex>=currentPath.lessons.length){ renderTrack(); show('trackView'); } else renderLesson(); };
$('chooseAnother').onclick=()=>show('pathsView');
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ const go=b.dataset.go; if(go==='welcome') show('welcomeView'); if(go==='paths') show('pathsView'); if(go==='track'){ renderTrack(); show('trackView'); }});
renderPaths(); refreshLock(); setInterval(refreshLock,15000);
