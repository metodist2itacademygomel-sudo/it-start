
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var el=function(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
  var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  var pick=function(a){return a[Math.floor(Math.random()*a.length)];};
  var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stage=$('#stage'),lead=$('#lead');
  var S={name:'',step:'intro',got:[],moveN:0,t0:0};
  var cleanups=[];
  /* Ссылка на заготовку проекта в Scratch. Пример: 'https://scratch.mit.edu/projects/123456789/editor/'.
     Пока пусто, кнопка открывает чистый редактор, а ребёнку подсказывают спросить педагога. */
  var SCRATCH_URL='';
  function clearStage(){cleanups.forEach(function(f){try{f();}catch(e){}});cleanups=[];stage.innerHTML='';mc=null;bub=null;}

  /* ---------- sound ---------- */
  var AC=null,soundOn=false;
  function tone(f,d,type,delay,vol){
    if(!soundOn)return;
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      var o=AC.createOscillator(),g=AC.createGain(),st=AC.currentTime+(delay||0);
      o.type=type||'sine';o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,st);
      g.gain.exponentialRampToValueAtTime(vol||0.12,st+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,st+d);
      o.connect(g);g.connect(AC.destination);o.start(st);o.stop(st+d+0.03);
    }catch(e){}
  }
  var sfx={
    tap:function(){tone(520,.08,'triangle');},
    key:function(){tone(700,.07,'square',0,.04);},
    step:function(){tone(330,.07,'sine',0,.1);},
    ok:function(){tone(523,.12,'triangle');tone(659,.12,'triangle',.1);tone(784,.22,'triangle',.2);},
    err:function(){tone(170,.22,'sawtooth',0,.06);},
    win:function(){[523,659,784,1047].forEach(function(f,i){tone(f,.2,'triangle',i*.12);});}
  };
  $('#snd').addEventListener('click',function(){
    soundOn=!soundOn;
    this.setAttribute('aria-pressed',String(soundOn));
    $('#sndtxt').textContent=soundOn?'Звук включён':'Звук выключен';
    $('#sndwave').setAttribute('opacity',soundOn?'1':'0');
    sfx.ok();
  });

  /* ---------- confetti ---------- */
  var cv=null,cx=null,parts=[],raf=0;
  var COL=['#FFBF00','#9966FF','#4C97FF','#59C059','#FF6680','#2D97FF','#FF8A3D'];
  function loop(){
    if(!cx||!cv)return;
    cx.clearRect(0,0,cv.width,cv.height);
    parts=parts.filter(function(p){return p.y<cv.height+30&&p.t<170;});
    parts.forEach(function(p){
      p.vy+=0.3;p.vx*=0.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.t++;
      cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.c;
      cx.globalAlpha=Math.max(0,Math.min(1,(170-p.t)/40));
      cx.fillRect(-p.s/2,-p.s/3,p.s,p.s*0.66);cx.restore();
    });
    if(parts.length)raf=requestAnimationFrame(loop);else{raf=0;cx.clearRect(0,0,cv.width,cv.height);}
  }
  function confetti(x,y,n){
    if(reduce)return;
    try{
      if(!cv){
        cv=document.createElement('canvas');
        cv.setAttribute('aria-hidden','true');
        cv.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:70';
        document.body.appendChild(cv);
      }
      cx=cv.getContext&&cv.getContext('2d');
      if(!cx)return;
      if(cv.width!==window.innerWidth||cv.height!==window.innerHeight){cv.width=window.innerWidth;cv.height=window.innerHeight;}
      for(var i=0;i<(n||70);i++){
        var a=-Math.PI/2+(Math.random()-.5)*2.6,v=5+Math.random()*10;
        parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:6+Math.random()*7,rot:Math.random()*6,vr:(Math.random()-.5)*.4,c:pick(COL),t:0});
      }
      if(!raf)raf=requestAnimationFrame(loop);
    }catch(e){}
  }
  function burstAt(elm,n){
    var r=elm&&elm.getBoundingClientRect?elm.getBoundingClientRect():null;
    var x=r&&r.width?r.left+r.width/2:window.innerWidth/2,y=r&&r.height?r.top+r.height/2:window.innerHeight/3;
    confetti(x,y,n);
  }

  /* ---------- pictures ---------- */
  var FLAG='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 2v16" stroke="#0B1620" stroke-width="2" stroke-linecap="round"/><path d="M4 3c4-2 6 2 11 0v8c-5 2-7-2-11 0z" fill="#34C759" stroke="#0B1620" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var HERO='<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="24" y1="4" x2="24" y2="10" stroke="#0B1620" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="4" r="3" fill="#FFBF00"/><rect x="9" y="10" width="30" height="26" rx="9" fill="#2D97FF" stroke="#0B1620" stroke-width="1.5"/><rect x="14" y="16" width="20" height="12" rx="5" fill="#0B1620"/><circle cx="20" cy="22" r="2.6" fill="#3DDC97"/><circle cx="28" cy="22" r="2.6" fill="#3DDC97"/><rect x="14" y="38" width="8" height="6" rx="3" fill="#EEF4F7"/><rect x="26" y="38" width="8" height="6" rx="3" fill="#EEF4F7"/></svg>';
  var ROCK='<svg viewBox="0 0 48 48" aria-label="камень"><path d="M6 40 L12 20 L24 11 L37 16 L43 40 Z" fill="#6E8793" stroke="#3E525C" stroke-width="2" stroke-linejoin="round"/><path d="M12 20 L24 11 L28 22 L19 40 L6 40Z" fill="#8CA5B1"/></svg>';
  function chestSVG(){
    return '<svg class="chest" viewBox="0 0 48 48" aria-label="сундук"><circle class="glow" cx="24" cy="20" r="16" fill="#FFBF00"/>'+
      '<g class="lid"><path d="M7 22 V17 Q7 6 24 6 Q41 6 41 17 V22 Z" fill="#C98A3D" stroke="#5E3A12" stroke-width="1.5"/></g>'+
      '<rect x="7" y="22" width="34" height="19" rx="3" fill="#A9702B" stroke="#5E3A12" stroke-width="1.5"/><rect x="7" y="22" width="34" height="4" fill="#7A4E1B"/>'+
      '<rect x="20" y="24" width="8" height="9" rx="2" fill="#FFBF00" stroke="#5E3A12" stroke-width="1"/></svg>';
  }
  function chestLockedSVG(){
    return '<svg class="chest" viewBox="0 0 48 48" aria-hidden="true">'+
      '<g class="lid"><path d="M7 22 V17 Q7 6 24 6 Q41 6 41 17 V22 Z" fill="#C98A3D" stroke="#5E3A12" stroke-width="1.5"/></g>'+
      '<rect x="7" y="22" width="34" height="19" rx="3" fill="#A9702B" stroke="#5E3A12" stroke-width="1.5"/><rect x="7" y="22" width="34" height="4" fill="#7A4E1B"/>'+
      '<path d="M20.5 27.5 v-3.2 a3.5 3.5 0 0 1 7 0 v3.2" fill="none" stroke="#8C95A0" stroke-width="2.2" stroke-linecap="round"/>'+
      '<rect x="18.5" y="27" width="11" height="10" rx="2.2" fill="#FF6680" stroke="#C23B57" stroke-width="1.3"/><circle cx="24" cy="31.5" r="1.7" fill="#7A1F36"/></svg>';
  }
  function mascotSVG(){
    return '<svg class="bot" viewBox="0 0 120 130" aria-hidden="true"><g class="b-all">'+
      '<line x1="60" y1="8" x2="60" y2="26" stroke="#8CA3B0" stroke-width="4" stroke-linecap="round"/><circle class="ant" cx="60" cy="8" r="7" fill="#FFBF00"/>'+
      '<rect class="arm l" x="5" y="58" width="17" height="32" rx="8.5" fill="#1769B8"/><rect class="arm r" x="98" y="58" width="17" height="32" rx="8.5" fill="#1769B8"/>'+
      '<rect x="36" y="96" width="18" height="24" rx="8" fill="#1769B8"/><rect x="66" y="96" width="18" height="24" rx="8" fill="#1769B8"/>'+
      '<rect x="22" y="24" width="76" height="76" rx="26" fill="#2D97FF"/><rect x="30" y="36" width="60" height="40" rx="16" fill="#0B1620"/>'+
      '<ellipse class="eye" cx="46" cy="54" rx="6" ry="8" fill="#3DDC97"/><ellipse class="eye" cx="74" cy="54" rx="6" ry="8" fill="#3DDC97"/>'+
      '<path class="mouth smile" d="M50 65 Q60 73 70 65" stroke="#3DDC97" stroke-width="4" fill="none" stroke-linecap="round"/>'+
      '<path class="mouth big" d="M47 62 Q60 80 73 62 Z" fill="#3DDC97"/>'+
      '<path class="mouth sad" d="M50 71 Q60 63 70 71" stroke="#3DDC97" stroke-width="4" fill="none" stroke-linecap="round"/>'+
      '<circle cx="35" cy="68" r="4" fill="#FF6680" opacity=".75"/><circle cx="85" cy="68" r="4" fill="#FF6680" opacity=".75"/>'+
      '<rect x="48" y="83" width="24" height="10" rx="5" fill="#FFBF00"/></g></svg>';
  }
  var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z"/></svg>';

  var BLK={
    flag:function(){return '<div class="blk ev"><span>когда</span>'+FLAG+'<span>нажат</span></div>';},
    goto:function(){return '<div class="blk motion"><span>перейти в</span><span>x:</span><span class="v">-160</span><span>y:</span><span class="v">-80</span></div>';},
    point:function(){return '<div class="blk motion"><span>повернуть в направлении</span><span class="v">90</span></div>';},
    setcostume:function(){return '<div class="blk looks"><span>переключить костюм на</span><span class="v">стоит</span></div>';},
    repeat:function(){return '<div class="blk control"><span>повторять</span><span class="v">10</span><span>раз</span></div>';},
    move:function(){return '<div class="blk motion"><span>идти</span><span class="v">10</span><span>шагов</span></div>';},
    wait3:function(){return '<div class="blk control"><span>ждать</span><span class="v">0,3</span><span>секунд</span></div>';},
    wait1:function(){return '<div class="blk control"><span>ждать</span><span class="v">1</span><span>секунд</span></div>';},
    sayGo:function(){return '<div class="blk looks"><span>говорить</span><span class="v">Иду к сундуку!</span><span class="v">2</span><span>секунд</span></div>';},
    say:function(){return '<div class="blk looks"><span>говорить</span><span class="v">Сезам, откройся!</span><span class="v">2</span><span>секунд</span></div>';},
    next:function(){return '<div class="blk looks"><span>следующий костюм</span></div>';}
  };
  /* район города, блоки (с пояснением) и подсказка Байта для каждой миссии */
  var MI=[
    {cap:'Ворота',place:'Ворота города',blks:[['flag','Запускает программу. Без него герой не тронется с места.'],['setcostume','Герой надевает костюм «стоит». С него начинается путь.']],next:'Ворота открылись! Хаос оставил записку на Шифровальной площади. Идём туда!'},
    {cap:'Шифр',place:'Шифровальная площадь',blks:[['wait1','Пауза в одну секунду.'],['say','Герой произносит волшебные слова, которые откроют сундук.']],next:'Записка прочитана! Теперь на Энергостанцию: герою нужна зарядка.'},
    {cap:'Энергия',place:'Энергостанция',blks:[['point','Герой поворачивается вправо: 90 — это направление вправо.'],['move','Герой делает шаги вперёд. Десять шагов — маленькая прогулка.']],next:'Станция заработала! Дальше Башня Правды: Хаос там всё напутал.'},
    {cap:'Правда',place:'Башня Правды',blks:[['wait3','Короткая пауза. Без неё герой побежит слишком быстро.'],['sayGo','Герой говорит вслух, куда он идёт.']],next:'Башня снова говорит правду! Идём в Зеркальную галерею.'},
    {cap:'Зеркало',place:'Зеркальная галерея',blks:[['next','Меняет костюм героя. Этот блок поможет достать ключ.']],next:'Галерея ожила! Дальше Узорная улица: там сломались узоры.'},
    {cap:'Узор',place:'Узорная улица',blks:[['repeat','Повторяет команды, которые лежат внутри него. Не нужно писать одно и то же десять раз!']],next:'Узоры исправлены! Впереди Двоичный замок.'},
    {cap:'Замок',place:'Двоичный замок',blks:[['goto','Герой переносится в точку с числами x и y. Числа показывают, где стоит герой.']],next:'Замок щёлкнул! Остался последний район: дверь с ключом.'},
    {cap:'Дверь',place:'Дверь с ключом',blks:[['next','Ещё один «следующий костюм»! В конверте таких блоков два, возьми любой.']],next:'Все районы проснулись! Осталось собрать программу и открыть сундук.'}
  ];
  var NMIS=MI.length;

  /* ---------- robot helper ---------- */
  var mc=null,bub=null,moodT=0;
  var JOKES=['Бип-боп! Я Байт, помощник агентов.','Знаешь, чем робот отличается от человека? Он никогда не теряет пароль!','У меня в голове миллион нулей и единиц, и все они за тебя.','Ты справишься, я в тебя верю!','Мой любимый цвет — #2D97FF. Это синий!'];
  function guide(text){
    return '<div class="guide"><button class="mascot" id="mc" type="button" aria-label="Робот Байт. Нажми на него.">'+mascotSVG()+'</button><div class="bubble" id="bub" role="status" aria-live="polite">'+esc(text)+'</div></div>';
  }
  function bindGuide(){
    mc=$('#mc');bub=$('#bub');
    if(mc)mc.addEventListener('click',function(){sfx.tap();talk(pick(JOKES),'happy');});
  }
  function mood(m){
    if(!mc)return;
    mc.classList.remove('m-happy','m-sad','m-think');
    void mc.offsetWidth;
    mc.classList.add('m-'+m);
    clearTimeout(moodT);
    var node=mc;
    moodT=setTimeout(function(){node.classList.remove('m-'+m);},m==='think'?3000:1700);
  }
  function talk(t,m){
    if(bub&&document.body.contains(bub)){
      bub.textContent=t;
      bub.classList.remove('pop');void bub.offsetWidth;bub.classList.add('pop');
    }
    if(m)mood(m);
  }
  function mount(html){stage.append(el(html));bindGuide();}

  /* ---------- keyboard helpers (work on any layout) ---------- */
  var CODEMAP={KeyQ:'Й',KeyW:'Ц',KeyE:'У',KeyR:'К',KeyT:'Е',KeyY:'Н',KeyU:'Г',KeyI:'Ш',KeyO:'Щ',KeyP:'З',BracketLeft:'Х',BracketRight:'Ъ',
    KeyA:'Ф',KeyS:'Ы',KeyD:'В',KeyF:'А',KeyG:'П',KeyH:'Р',KeyJ:'О',KeyK:'Л',KeyL:'Д',Semicolon:'Ж',Quote:'Э',
    KeyZ:'Я',KeyX:'Ч',KeyC:'С',KeyV:'М',KeyB:'И',KeyN:'Т',KeyM:'Ь',Comma:'Б',Period:'Ю',Backquote:'Ё'};
  function ruChar(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return null;
    if(e.code==='Space'||e.key===' ')return ' ';
    if(e.key&&e.key.length===1){var u=e.key.toUpperCase();if(/[А-ЯЁ]/.test(u))return u;}
    return CODEMAP[e.code]||null;
  }


  /* ---------- the final algorithm, as a stack of blocks ---------- */
  function algoHTML(){
    function part(n,t,inner){return '<div class="apart"><span class="aptag">'+n+'. '+t+'</span>'+inner+'</div>';}
    return '<div class="algostack">'+
      part(1,'Подготовка',BLK.flag()+BLK.goto()+BLK.point()+BLK.setcostume())+
      part(2,'Путь к сундуку',BLK.sayGo()+'<div class="cwrap"><div class="chead">'+BLK.repeat().replace('class="blk control"','class="blk control inner"')+'</div><div class="cbody">'+BLK.move()+BLK.wait3()+'</div><div class="cfoot"></div></div>')+
      part(3,'Ключ и заклинание',BLK.next()+BLK.wait1()+BLK.say()+BLK.next())+
    '</div>';
  }

  /* ---------- trail and screens ---------- */
  var NODECLS=['sun','grape','sky','mint','berry'];
  function drawTrail(){
    var caps=MI.map(function(m){return m.cap;}).concat(['Сундук']);
    $('#trail').innerHTML=caps.map(function(c,i){
      var got,cur,reached;
      if(i<NMIS){got=S.got.indexOf('p'+(i+1))>-1;cur=S.step===i+1;reached=i>0&&S.got.indexOf('p'+i)>-1;}
      else{got=false;cur=S.step==='done';reached=S.got.length>=NMIS;}
      return '<li class="'+(got?'got ':'')+(cur?'cur':'')+'"'+(reached?' data-reached':'')+' style="--c:var(--'+NODECLS[i%5]+')"><span class="node">'+(got?'✓':i===NMIS?'X':(i+1))+'</span><span class="cap">'+c+'</span></li>';
    }).join('');
  }
  function head(tag,title,text){
    return '<header class="ph"><p class="tag">'+tag+'</p><h2>'+title+'</h2><p>'+text+'</p></header>';
  }
  function go(step,leadText){S.step=step;drawTrail();clearStage();lead.textContent=leadText;window.scrollTo(0,0);}
  function mtag(n){return 'Миссия '+n+' из '+NMIS+' · '+MI[n-1].place;}

  /* ---------- прогресс в localStorage ---------- */
  var LSK='agents_quest_progress_v1';
  function saveProg(){try{localStorage.setItem(LSK,JSON.stringify({name:S.name,got:S.got,el:Date.now()-(S.t0||Date.now())}));}catch(e){}}
  function loadProg(){
    try{var d=JSON.parse(localStorage.getItem(LSK)||'null');
      if(d&&Array.isArray(d.got)&&d.got.length>0&&d.got.length<NMIS)return d;}catch(e){}
    return null;
  }
  function clearProg(){try{localStorage.removeItem(LSK);}catch(e){}}
  function showResume(sv){
    go('intro','Хакер Хаос выключил цифровой город. Часть районов уже проснулась. Продолжим!');
    S.name=sv.name||'Агент';S.got=sv.got.slice();S.t0=Date.now()-(+sv.el||0);drawTrail();
    var nxt=1;while(S.got.indexOf('p'+nxt)>-1)nxt++;
    mount('<section class="panel" style="--mc:var(--accent)">'+
      '<header class="ph"><p class="tag">С возвращением</p><h2>Агент '+esc(S.name)+', ты уже в пути!</h2><p>Проснулось районов: '+S.got.length+' из '+NMIS+'. Продолжим с миссии '+nxt+'?</p></header>'+
      guide('Я сохранил твой путь. Продолжим?')+
      '<div class="row"><button class="btn sun glow" id="rs" type="button">Продолжить</button><button class="btn ghost" id="rn" type="button">Начать заново</button></div>'+
    '</section>');
    $('#rs').addEventListener('click',function(){sfx.ok();if(nxt===1)mission1();else NEXT[nxt-1]();});
    $('#rn').addEventListener('click',function(){sfx.tap();clearProg();S.name='';S.got=[];S.t0=0;showIntro(true);});
    $('#rs').focus();
  }

  /* ---------- intro: позывной с бейджика ---------- */
  function showIntro(fresh){
    if(!fresh&&!S.test){var sv=loadProg();if(sv){showResume(sv);return;}}
    go('intro','Хакер Хаос выключил цифровой город и спрятал программу, которая открывает сундук с секретами. Разбуди восемь районов: за каждый ты получишь блок. Из блоков соберёшь программу!');
    mount('<section class="panel" style="--mc:var(--accent)">'+
      '<header class="ph"><p class="tag">Старт</p><h2>Назови свой позывной</h2></header>'+
      guide('Привет! Я робот Байт, помощник агентов. Посмотри на свой бейджик. Какой там позывной?')+
      '<ol class="steps">'+
        '<li>Хаос выключил город. Просыпаться районы будут по очереди.</li>'+
        '<li>В каждом районе тебя ждёт задание. За него ты получишь один блок программы.</li>'+
        '<li>Блоки лежат в конверте на столе. Найди такой же и положи перед собой.</li>'+
      '</ol>'+
      '<label class="lab" for="nm">Позывной с бейджика</label>'+
      '<input id="nm" class="fld" maxlength="20" autocomplete="off" placeholder="Напиши его здесь">'+
      '<div class="row"><button class="btn sun glow" id="go" type="button">Начать задание</button></div>'+
    '</section>');
    var nm=$('#nm');
    function start(){sfx.ok();S.name=nm.value.trim()||'Агент';S.t0=Date.now();mission1();}
    $('#go').addEventListener('click',start);
    nm.addEventListener('keydown',function(e){if(e.key==='Enter')start();});
    nm.addEventListener('input',function(){
      var v=nm.value.trim();
      talk(v?'Агент '+v+', рад знакомству! Нажимай «Начать задание».':'Привет! Я робот Байт, помощник агентов. Посмотри на свой бейджик. Какой там позывной?',v?'happy':null);
    });
    nm.focus();
  }

  /* ---------- reward: a Scratch block ---------- */
  var NEXT={};
  function reward(n){
    var key='p'+n,m=MI[n-1];
    if(S.got.indexOf(key)<0)S.got.push(key);
    if(!S.test){if(S.got.length>=NMIS)clearProg();else saveProg();}
    drawTrail();clearStage();window.scrollTo(0,0);
    var mini='';
    for(var k=0;k<NMIS;k++)mini+='<span class="dot'+(S.got.indexOf('p'+(k+1))>-1?' on':'')+'" style="--c:var(--'+NODECLS[k%5]+')"></span>';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      head('Район проснулся · '+m.place,m.blks.length>1?'Найди блоки в конверте':'Найди блок в конверте','Забирай '+(m.blks.length>1?'блоки':'блок')+'. Найди в конверте '+(m.blks.length>1?'такие же и положи их':'такой же и положи его')+' на стол перед собой.')+
      guide(pick(['Ура! Ты молодец!','Отлично получилось!','Вот это да! Забирай!'])+' '+m.next)+
      '<div class="rw"><div class="rays" aria-hidden="true"></div><div class="rwblks">'+m.blks.map(function(b){return '<div class="rwblk">'+BLK[b[0]]()+'</div>';}).join('')+'</div></div>'+
      '<ul class="whatlist">'+m.blks.map(function(b){return '<li><b>Что делает блок.</b> '+esc(b[1])+'</li>';}).join('')+'</ul>'+
      '<div class="pdots" aria-label="Найдено районов: '+S.got.length+' из '+NMIS+'">'+mini+'</div>'+
      '<div class="row"><button class="btn sun glow" id="nx" type="button">'+(n<NMIS?'Дальше: '+MI[n].place:'Собрать программу')+'</button></div>'+
    '</section>');
    mood('happy');sfx.win();
    setTimeout(function(){burstAt($('.rw'),70);},250);
    var b=$('#nx');b.addEventListener('click',function(){sfx.tap();NEXT[n]();});b.focus();
  }

  /* ---------- mission 1: пароль у ворот (keyboard) ---------- */
  function mission1(){
    go(1,'Миссия 1 из '+NMIS+' · '+MI[0].place);
    var ROUNDS=['Я ЮНЫЙ АЙТИШНИК','АГЕНТЫ СПАСУТ ЦИФРОВОЙ ГОРОД ОТ ХАОСА'];
    var TOTAL=ROUNDS.join('').length;
    var ROWS=['ЙЦУКЕНГШЩЗХЪ','ФЫВАПРОЛДЖЭ','ЯЧСМИТЬБЮ'];
    var ticks='';
    for(var a=0;a<8;a++)ticks+='<line x1="90" y1="63" x2="90" y2="68" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" transform="rotate('+(a*45)+' 90 89)"/>';
    var safe='<svg viewBox="0 0 180 180" aria-label="Кодовый замок ворот"><rect x="10" y="14" width="160" height="150" rx="18" fill="#3F86E8"/><rect x="22" y="26" width="136" height="126" rx="12" fill="#1F3D6B"/>'+
      '<g class="gold"><rect x="38" y="116" width="46" height="22" rx="4" fill="#FFBF00"/><rect x="94" y="116" width="46" height="22" rx="4" fill="#FFD84D"/><rect x="62" y="92" width="56" height="22" rx="4" fill="#FFBF00"/></g>'+
      '<g class="door"><rect x="22" y="26" width="136" height="126" rx="12" fill="#7DB7FF"/><rect x="32" y="36" width="116" height="106" rx="8" fill="none" stroke="#4C97FF" stroke-width="3"/>'+
      '<g class="dial"><circle cx="90" cy="89" r="30" fill="#2D6FD1"/><circle cx="90" cy="89" r="21" fill="#1F3D6B"/>'+ticks+'<line x1="90" y1="89" x2="90" y2="72" stroke="#FFBF00" stroke-width="5" stroke-linecap="round"/></g>'+
      '<rect x="128" y="78" width="11" height="28" rx="5.5" fill="#FFBF00"/></g>'+
      '<rect x="24" y="162" width="24" height="10" rx="3" fill="#2D6FD1"/><rect x="132" y="162" width="24" height="10" rx="3" fill="#2D6FD1"/></svg>';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      head(mtag(1),'Пароль у ворот','Хаос запер ворота города двумя кодовыми замками. Напечатай пароль каждого замка: сначала короткий, потом длинный. Нужная клавиша светится жёлтым.')+
      guide('Печатай на клавиатуре или нажимай буквы мышкой. Раскладка не важна!')+
      '<div class="m1grid"><div class="safe" id="safe">'+safe+'</div>'+
      '<div class="phr"><p class="sub" id="rl"></p><div class="typebox big" id="tb" aria-label="Пароль для набора"></div><div class="meter"><i id="mt"></i></div><p class="count" id="cnt"></p></div></div>'+
      '<div class="kbd" id="kbd">'+ROWS.map(function(r){return '<div class="kr">'+r.split('').map(function(c){return '<button type="button" class="kb" data-k="'+c+'" tabindex="-1">'+c+'</button>';}).join('')+'</div>';}).join('')+
      '<div class="kr"><button type="button" class="kb space" data-k=" " tabindex="-1">пробел</button></div></div>'+
    '</section>');
    var tb=$('#tb'),cnt=$('#cnt'),kbd=$('#kbd'),mt=$('#mt'),safeEl=$('#safe'),dial=$('.dial',safeEl);
    var ri=0,cp=0,before=0,done=false,T=ROUNDS[0];
    function keyEl(c){return kbd.querySelector('[data-k="'+c+'"]');}
    function paint(){
      var idx=0;
      tb.innerHTML=T.split(' ').map(function(w,wi){
        var h='<span class="wd">'+w.split('').map(function(c){var i=idx++;return '<span class="ch '+(i<cp?'done':(i===cp?'cur':''))+'">'+c+'</span>';}).join('')+'</span>';
        if(wi<T.split(' ').length-1){var si=idx++;h+='<span class="ch sp '+(si<cp?'done':(si===cp?'cur':''))+'">&nbsp;</span> ';}
        return h;}).join('');
      var all=before+cp;
      $('#rl').textContent='Замок '+(ri+1)+' из '+ROUNDS.length+(ri===0?' · короткая фраза':' · длинная фраза');
      cnt.textContent='Напечатано '+all+' из '+TOTAL+' знаков';
      mt.style.width=(all/TOTAL*100)+'%';
      dial.style.transform='rotate('+(all/TOTAL*540)+'deg)';
      $$('.kb.next',kbd).forEach(function(k){k.classList.remove('next');});
      if(cp<T.length){var nk=keyEl(T.charAt(cp));if(nk)nk.classList.add('next');}
    }
    function flash(k,cls){
      if(!k)return;
      k.classList.remove('hit','miss');void k.offsetWidth;k.classList.add(cls);
      setTimeout(function(){k.classList.remove(cls);},260);
    }
    function press(ch){
      if(done)return;
      var want=T.charAt(cp),k=keyEl(ch);
      if(ch===want){
        cp++;flash(k,'hit');sfx.key();paint();
        if(cp===T.length)roundDone();
        else if(cp%5===0)talk(pick(['Отлично!','Так держать!','Ты быстро печатаешь!','Почти открыто!']),'happy');
      }else{
        flash(k,'miss');sfx.err();
        tb.classList.remove('shake');void tb.offsetWidth;tb.classList.add('shake');
        var c=tb.querySelector('.cur');if(c)c.classList.add('err');
        talk('Ищи '+(want===' '?'пробел':'букву «'+want+'»')+'. Она светится на клавиатуре.','sad');
      }
    }
    function roundDone(){
      if(ri<ROUNDS.length-1){
        done=true;before+=T.length;sfx.ok();burstAt(safeEl,30);
        talk('Первый замок щёлкнул! Теперь второй: фраза подлиннее.','happy');
        setTimeout(function(){ri++;T=ROUNDS[ri];cp=0;done=false;paint();},1300);
      }else win();
    }
    function win(){
      done=true;
      safeEl.classList.add('open');
      sfx.ok();talk('Ворота открыты! Агент '+S.name+', ты в городе.','happy');
      setTimeout(function(){burstAt(safeEl,80);},500);
      setTimeout(function(){reward(1);},2200);
    }
    function onKey(e){if(e.repeat)return;var ch=ruChar(e);if(ch===null)return;e.preventDefault();press(ch);}
    document.addEventListener('keydown',onKey);
    cleanups.push(function(){document.removeEventListener('keydown',onKey);});
    kbd.addEventListener('mousedown',function(e){e.preventDefault();});
    kbd.addEventListener('click',function(e){var b=e.target.closest('.kb');if(b)press(b.getAttribute('data-k'));});
    paint();
  }

  /* ---------- mission 2: шифр Цезаря ---------- */
  function mission2(){
    go(2,'Миссия 2 из '+NMIS+' · '+MI[1].place);
    var AL='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',SH=3;
    function enc(w){return w.split('').map(function(c){var i=AL.indexOf(c);return i<0?c:AL.charAt((i+SH)%AL.length);}).join('');}
    var ROUNDS=[{plain:'ГОРОД',lbl:'Пробное слово'},{plain:'КЛЮЧ У ДВЕРИ',lbl:'Записка Хаоса'}];
    var table='';
    for(var r=0;r<4;r++){
      table+='<div class="czrow">';
      for(var c=0;c<8;c++){var L=AL.charAt(r*8+c);table+='<button type="button" class="czc" data-k="'+L+'" tabindex="-1"><b>'+L+'</b></button>';}
      table+='</div>';
    }
    mount('<section class="panel" style="--mc:var(--grape)">'+
      head(mtag(2),'Шифр Цезаря','Хаос оставил записку на площади и зашифровал её. У шифра есть ключ: сдвиг на 3. Прочитай записку.')+
      guide('Берёшь шифр-букву, отсчитываешь в алфавите три буквы назад и получаешь настоящую.')+
      '<div class="czkey"><b>Ключ шифра: сдвиг на 3</b><p>Хаос сдвинул каждую букву на 3 места вперёд по алфавиту. Чтобы прочитать записку, <b>сдвигайся на три буквы назад</b>. Например, шифр-буква «Ж»: Е, Д, Г. Значит, это «Г».</p><p>Если дошёл до начала алфавита, начни считать с конца. Например, «Б»: А, Я, Ю. Значит, это «Ю».</p></div>'+
      '<div class="czt" id="czt" aria-label="Алфавит">'+table+'</div>'+
      '<p class="sub" id="cl"></p>'+
      '<div class="czmsg" id="cm" aria-live="polite"></div>'+
      '<p class="hint" style="text-align:left">Печатай настоящие буквы или нажимай на них в алфавите.</p>'+
    '</section>');
    var cm=$('#cm'),czt=$('#czt');
    var ri=0,pos=0,wrongs=0,done=false,R=ROUNDS[0],cip='';
    function cells(){return $$('.czl',cm);}
    function showTable(){
      $$('.czc',czt).forEach(function(b){b.classList.remove('now','help');});
      if(done||pos>=R.plain.length)return;
      var cur=cip.charAt(pos),want=R.plain.charAt(pos);
      var b=czt.querySelector('.czc[data-k="'+want+'"]');
      /* подсвечиваем шифр-букву в нижней строке: она лежит в клетке с настоящей буквой want */
      if(b&&wrongs>=2){b.classList.add('help');}
    }
    function build(){
      R=ROUNDS[ri];cip=enc(R.plain);pos=0;wrongs=0;
      $('#cl').textContent=R.lbl+' · '+(ri+1)+' из '+ROUNDS.length;
      cm.innerHTML=cip.split('').map(function(c,i){
        return c===' '?'<span class="czgap"></span>':'<span class="czl" data-i="'+i+'"><span class="cc">'+c+'</span><span class="ca"></span></span>';
      }).join('');
      if(ri===0){
        /* первую букву решаем вместе */
        fill(0,R.plain.charAt(0));pos=1;
        talk('Смотри: первая буква шифра «'+cip.charAt(0)+'». Отсчитываем три назад от неё в алфавите и получаем «'+R.plain.charAt(0)+'». Дальше сам!','think');
      }
      skipGap();showTable();mark();
    }
    function skipGap(){while(pos<R.plain.length&&R.plain.charAt(pos)===' ')pos++;}
    function mark(){cells().forEach(function(c){c.classList.toggle('cur',+c.getAttribute('data-i')===pos);});}
    function fill(i,ch){var c=cm.querySelector('.czl[data-i="'+i+'"]');if(c){c.querySelector('.ca').textContent=ch;c.classList.add('ok');}}
    function press(ch){
      if(done)return;
      var want=R.plain.charAt(pos);
      if(ch===want){
        fill(pos,ch);sfx.key();pos++;wrongs=0;skipGap();
        if(pos>=R.plain.length){roundDone();return;}
        showTable();mark();
        if(pos%3===0)talk(pick(['Отлично!','Так держать!','Ты читаешь шифр!']),'happy');
      }else{
        wrongs++;sfx.err();
        var c=cm.querySelector('.czl.cur');if(c){c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');}
        talk(wrongs>=2?'Я подсвечу нужную букву в алфавите, смотри на жёлтую клетку.':'Найди «'+cip.charAt(pos)+'» в алфавите и отсчитай три буквы назад.','sad');
        showTable();
      }
    }
    function roundDone(){
      mark();
      if(ri<ROUNDS.length-1){
        sfx.ok();burstAt(cm,30);talk('Слово «'+R.plain+'» прочитано! Теперь настоящая записка Хаоса.','happy');
        done=true;
        setTimeout(function(){ri++;done=false;build();},1600);
      }else{
        done=true;showTable();sfx.win();burstAt(cm,90);
        talk('«КЛЮЧ У ДВЕРИ»! Хаос выдал себя: ключ лежит у двери. Запомним!','happy');
        setTimeout(function(){reward(2);},2600);
      }
    }
    function onKey(e){if(e.repeat)return;var ch=ruChar(e);if(ch===null||ch===' ')return;e.preventDefault();press(ch);}
    document.addEventListener('keydown',onKey);
    cleanups.push(function(){document.removeEventListener('keydown',onKey);});
    czt.addEventListener('click',function(e){var b=e.target.closest('.czc');if(b)press(b.getAttribute('data-k'));});
    build();
  }


  /* ---------- missions 3 and 8: energy/key engine ---------- */
  /* ---------- mission 3: energy (batteries + station) ---------- */
  var G=null;
  var D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
  var SYM={U:'↑',D:'↓',L:'←',R:'→'};
  var BATT='<svg viewBox="0 0 48 48" aria-label="батарейка"><rect x="14" y="9" width="20" height="33" rx="5" fill="#34C759" stroke="#1E7A38" stroke-width="2"/><rect x="19" y="5" width="10" height="6" rx="2" fill="#1E7A38"/><path d="M26 15l-8 13h6l-2 10 9-14h-6z" fill="#FFF3A8" stroke="#8A6A00" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var STATION='<svg viewBox="0 0 48 48" aria-label="станция зарядки"><rect x="8" y="30" width="32" height="12" rx="4" fill="#7B61D6" stroke="#463190" stroke-width="2"/><rect x="14" y="8" width="20" height="26" rx="6" fill="#EAF2FF" stroke="#463190" stroke-width="2"/><circle class="stled" cx="24" cy="38" r="2.6" fill="#FFBF00"/><path d="M26 12l-8 12h6l-2 9 9-13h-6z" fill="#FFBF00" stroke="#8A6A00" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  function isRock(x,y){return G.rocks.some(function(r){return r[0]===x&&r[1]===y;});}
  function batAt(x,y){for(var k=0;k<G.bats.length;k++)if(G.bats[k][0]===x&&G.bats[k][1]===y)return k;return -1;}
  function inside(x,y){return x>=0&&y>=0&&x<G.w&&y<G.h;}
  function dist(a,b){
    var q=[[a[0],a[1],0]],seen={};seen[a[0]+','+a[1]]=1;
    while(q.length){
      var c=q.shift();
      if(c[0]===b[0]&&c[1]===b[1])return c[2];
      for(var k in D){
        var nx=c[0]+D[k][0],ny=c[1]+D[k][1],key=nx+','+ny;
        if(inside(nx,ny)&&!isRock(nx,ny)&&!seen[key]){seen[key]=1;q.push([nx,ny,c[2]+1]);}
      }
    }
    return 999;
  }
  function perms(a){
    if(a.length<2)return [a];
    var out=[];
    a.forEach(function(v,i){perms(a.slice(0,i).concat(a.slice(i+1))).forEach(function(p){out.push([v].concat(p));});});
    return out;
  }
  function bestLen(){
    var best=999;
    perms(G.bats).forEach(function(p){
      var pts=[G.start].concat(p,[G.station]),s=0;
      for(var k=0;k<pts.length-1;k++)s+=dist(pts[k],pts[k+1]);
      if(s<best)best=s;
    });
    return best;
  }
  function energy(cfg){
    G=cfg.G;go(cfg.n,'Миссия '+cfg.n+' из '+NMIS+' · '+MI[cfg.n-1].place);
    var best=bestLen(),total=G.bats.length;
    var cells='';
    for(var y=0;y<G.h;y++)for(var x=0;x<G.w;x++){
      var inner='';
      if(isRock(x,y))inner=ROCK;
      else if(x===G.station[0]&&y===G.station[1])inner=cfg.goal;
      else if(batAt(x,y)>-1)inner='<span class="bat">'+cfg.item+'</span>';
      cells+='<div class="cell '+((x+y)%2?'b':'a')+'">'+inner+'</div>';
    }
    mount('<section class="panel" style="--mc:var(--sky)">'+
      head(mtag(cfg.n),cfg.title,cfg.text)+
      guide('Нажимай стрелки. Ошибся? Нажми на стрелку в программе, и она сотрётся.')+
      '<div class="m3">'+
        '<div class="board" id="bd" style="--gw:'+G.w+';--gh:'+G.h+'">'+cells+'<div class="hero" id="hero">'+HERO+'</div></div>'+
        '<div class="ctl">'+
          '<p class="bcount" id="bc" aria-live="polite"></p>'+
          '<div class="pad" role="group" aria-label="Стрелки">'+
            '<button type="button" class="key" data-d="U" aria-label="Вверх">↑</button><button type="button" class="key" data-d="L" aria-label="Влево">←</button><button type="button" class="key" data-d="D" aria-label="Вниз">↓</button><button type="button" class="key" data-d="R" aria-label="Вправо">→</button>'+
          '</div>'+
          '<div><p class="sub" id="pc">Твоя программа</p><div class="prog" id="prog"></div></div>'+
          '<div class="row" id="acts"><button type="button" class="btn good" id="run">Запустить</button><button type="button" class="btn ghost" id="undo">Стереть последнюю</button><button type="button" class="btn ghost" id="clr">Очистить</button></div>'+
        '</div>'+
      '</div>'+
    '</section>');
    var board=$('#bd'),hero=$('#hero'),progEl=$('#prog'),keys=$$('.key'),cellEls=$$('.cell',board);
    var prog=[],running=false,locked=false,alive=true,got=0;
    cleanups.push(function(){alive=false;});
    function cellAt(x,y){return cellEls[y*G.w+x];}
    function showCount(){$('#bc').innerHTML=cfg.label+': <b>'+got+' из '+total+'</b>';}
    function place(x,y){hero.style.transform='translate('+(x*100)+'%,'+(y*100)+'%)';}
    function clearFeet(){$$('.foot',board).forEach(function(f){f.remove();});}
    function resetHero(){
      place(G.start[0],G.start[1]);clearFeet();got=0;showCount();
      $$('.bat',board).forEach(function(b){b.classList.remove('taken');});
      cellAt(G.station[0],G.station[1]).classList.remove('charged');
    }
    function plural(n){return n===1?'стрелка':(n>1&&n<5?'стрелки':'стрелок');}
    function render(bad,isNew){
      if(!prog.length){progEl.innerHTML='<span class="empty">Пока пусто. Нажимай стрелки.</span>';}
      else{progEl.innerHTML=prog.map(function(d,i){return '<button type="button" class="chip'+(i===bad?' bad':'')+(isNew&&i===prog.length-1?' new':'')+'" data-i="'+i+'" aria-label="Стереть стрелку '+(i+1)+'">'+SYM[d]+'</button>';}).join('');}
      $('#pc').textContent='Твоя программа: '+prog.length+' '+plural(prog.length);
    }
    function setBusy(b){
      keys.forEach(function(k){k.disabled=b;});
      ['run','undo','clr','run2','undo2','clr2'].forEach(function(id){var e=$('#'+id);if(e)e.disabled=b;});
    }
    function add(d){if(running||locked||prog.length>=60)return;prog.push(d);sfx.tap();render(-1,true);resetHero();}
    function undo(){if(running||locked)return;prog.pop();render();resetHero();}
    function clear(){if(running||locked)return;prog=[];render();resetHero();talk('Всё стёрто. Начнём сначала!','think');}
    keys.forEach(function(k){k.addEventListener('click',function(){add(k.getAttribute('data-d'));});});
    progEl.addEventListener('click',function(e){
      var c=e.target.closest('.chip');if(!c||running||locked)return;
      prog.splice(+c.getAttribute('data-i'),1);sfx.tap();render();resetHero();
    });
    $('#undo').addEventListener('click',undo);
    $('#clr').addEventListener('click',clear);
    function onKey(e){
      if(running||locked)return;
      if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;
      var m={ArrowUp:'U',ArrowDown:'D',ArrowLeft:'L',ArrowRight:'R'};
      if(m[e.key]){e.preventDefault();if(!e.repeat)add(m[e.key]);}
      else if(e.key==='Backspace'){e.preventDefault();undo();}
    }
    document.addEventListener('keydown',onKey);
    cleanups.push(function(){document.removeEventListener('keydown',onKey);});
    function finish(){locked=true;cfg.done();}
    function success(){
      var n=prog.length,acts=$('#acts'),sc=cellAt(G.station[0],G.station[1]);
      locked=true;setBusy(true);
      hero.classList.add('cheer');sc.classList.add('charged','wob');
      sfx.win();burstAt(sc,90);
      if(cfg.nag&&n>best){
        talk(cfg.short?cfg.short(n,best):'Герой заряжен! Но есть путь короче: всего '+best+' стрелок. Попробуешь?','happy');
        acts.innerHTML='<button type="button" class="btn sun" id="again">Попробовать короче</button>'+(cfg.strict?'':'<button type="button" class="btn ghost" id="keep">Оставить мой путь</button>');
        $('#again').addEventListener('click',function(){
          locked=false;setBusy(false);prog=[];hero.classList.remove('cheer');render();resetHero();
          acts.innerHTML='<button type="button" class="btn good" id="run2">Запустить</button><button type="button" class="btn ghost" id="undo2">Стереть последнюю</button><button type="button" class="btn ghost" id="clr2">Очистить</button>';
          $('#run2').addEventListener('click',run);$('#undo2').addEventListener('click',undo);$('#clr2').addEventListener('click',clear);
          talk('Давай короче! Подумай, где можно срезать путь.','think');
        });
        if(!cfg.strict)$('#keep').addEventListener('click',finish);
      }else{
        talk(cfg.win(n,best),'happy');
        acts.innerHTML='<button type="button" class="btn sun glow" id="take">'+cfg.take+'</button>';
        $('#take').addEventListener('click',finish);
        $('#take').focus();
      }
    }
    async function run(){
      if(running||locked||!prog.length)return;
      running=true;setBusy(true);resetHero();render();
      talk('Поехали!','think');
      var x=G.start[0],y=G.start[1];
      await sleep(300);
      for(var i=0;i<prog.length;i++){
        if(!alive)return;
        var chip=progEl.children[i];
        if(chip)chip.classList.add('now');
        var nx=x+D[prog[i]][0],ny=y+D[prog[i]][1];
        if(!inside(nx,ny)||isRock(nx,ny)){
          hero.classList.remove('bump');void hero.offsetWidth;hero.classList.add('bump');
          if(inside(nx,ny)&&cellAt(nx,ny)){var rc=cellAt(nx,ny);rc.classList.add('wob');setTimeout(function(){rc.classList.remove('wob');},500);}
          sfx.err();render(i);
          talk('Ой! На шаге '+(i+1)+' камень или край поля. Эта стрелка красная: нажми на неё и замени.','sad');
          running=false;setBusy(false);return;
        }
        var foot=document.createElement('span');foot.className='foot';foot.style.left=((x+0.5)/G.w*100)+'%';foot.style.top=((y+0.5)/G.h*100)+'%';board.appendChild(foot);
        x=nx;y=ny;place(x,y);sfx.step();
        hero.classList.remove('hopstep');void hero.offsetWidth;hero.classList.add('hopstep');
        await sleep(400);
        if(!alive)return;
        var bi=batAt(x,y),be=cellAt(x,y).querySelector('.bat');
        if(bi>-1&&be&&!be.classList.contains('taken')){
          be.classList.add('taken');got++;showCount();sfx.ok();burstAt(cellAt(x,y),18);
          talk(cfg.pick(got,total),'happy');
        }
        if(chip)chip.classList.remove('now');
      }
      if(!alive)return;
      running=false;
      if(x===G.station[0]&&y===G.station[1]){
        if(got===total)success();
        else{talk(cfg.miss(got,total),'sad');sfx.err();setBusy(false);}
      }else{talk('Программа закончилась, а до станции ещё далеко. Добавь стрелки!','think');setBusy(false);}
    }
    $('#run').addEventListener('click',run);
    render();resetHero();
  }

  /* ---------- mission 4 ---------- */
  /* ---------- mission 4: swipe true or false ---------- */
  function mission4(){
    go(4,'Миссия 4 из '+NMIS+' · '+MI[3].place);
    var QS=[
      {t:'У компьютера есть клавиатура и мышь.',a:true},
      {t:'<mark>Все</mark> кошки умеют программировать.',a:false},
      {t:'<mark>Некоторые</mark> птицы умеют летать.',a:true},
      {t:'<mark>Ни один</mark> слон не поместится в школьный рюкзак.',a:true},
      {t:'<mark>Все</mark> рыбы живут на деревьях.',a:false},
      {t:'<mark>Некоторые</mark> роботы умеют говорить.',a:true},
      {t:'<mark>Ни один</mark> камень не умеет бегать.',a:true},
      {t:'<mark>Все</mark> дни недели начинаются с буквы П.',a:false}
    ];
    var i=0,busy=true,ready=false,dragging=false,sx=0,dx=0,alive=true,readyT=0;
    cleanups.push(function(){alive=false;clearTimeout(readyT);});
    mount('<section class="panel" style="--mc:var(--mint)">'+
      head(mtag(4),'Правда или ложь','Хаос перепутал надписи на Башне Правды. Прочитай утверждение и реши, верное оно или нет. Слова «все», «некоторые» и «ни один» часто всё меняют, поэтому они выделены.')+
      guide('Перетащи карточку вправо, если это правда, и влево, если ложь. Или жми кнопки.')+
      '<div class="stars" id="stars" aria-hidden="true"></div>'+
      '<div class="deck" id="deck"></div>'+
      '<div class="tf"><button type="button" class="btn bad" id="no">← Ложь</button><button type="button" class="btn good" id="yes">Правда →</button></div>'+
      '<p class="hint">Можно и стрелками на клавиатуре: ← ложь, → правда.</p>'+
    '</section>');
    var deck=$('#deck'),card=null;
    function stars(){$('#stars').innerHTML=QS.map(function(_,k){return STAR.replace('<svg','<svg class="'+(k<i?'on':k===i?'cur':'')+'"');}).join('');}
    function show(){
      stars();busy=false;ready=false;
      card=el('<div class="swipe enter" id="sw" role="group" aria-label="Утверждение"><span class="stamp yes">Правда</span><span class="stamp no">Ложь</span><span>'+QS[i].t+'</span></div>');
      deck.innerHTML='';deck.appendChild(card);
      bindCard();
      clearTimeout(readyT);
      readyT=setTimeout(function(){if(!alive)return;ready=true;if(card)card.classList.remove('enter');},800);
    }
    function bindCard(){
      var c=card;
      c.addEventListener('pointerdown',function(e){
        if(busy||!ready||c!==card)return;
        dragging=true;sx=e.clientX;dx=0;c.classList.add('drag');
        try{c.setPointerCapture(e.pointerId);}catch(err){}
      });
      c.addEventListener('pointermove',function(e){
        if(!dragging||c!==card)return;
        dx=e.clientX-sx;
        c.style.transform='translateX('+dx+'px) rotate('+(dx/20)+'deg)';
        c.style.setProperty('--p',Math.max(-1,Math.min(1,dx/110)));
      });
      function end(){
        if(!dragging||c!==card)return;
        dragging=false;c.classList.remove('drag');
        if(Math.abs(dx)>90)answer(dx>0);
        else{c.style.transform='';c.style.setProperty('--p',0);}
      }
      c.addEventListener('pointerup',end);
      c.addEventListener('pointercancel',end);
    }
    function answer(v){
      if(busy||!ready||!card)return;
      var q=i;
      if(v===QS[q].a){
        busy=true;ready=false;sfx.ok();
        card.classList.remove('enter');
        card.style.transform='translateX('+(v?'130%':'-130%')+') rotate('+(v?18:-18)+'deg)';
        burstAt(deck,35);
        talk(pick(['Верно!','Точно!','Правильно, так держать!','Ты внимательный!']),'happy');
        setTimeout(function(){
          if(!alive||q!==i)return;
          i++;
          if(i>=QS.length){stars();sfx.win();burstAt(deck,90);talk('Все восемь правильно! Ты настоящий логик!','happy');setTimeout(function(){if(alive)reward(4);},1500);}
          else show();
        },650);
      }else{
        sfx.err();
        card.style.transform='';card.style.setProperty('--p',0);
        card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake');
        talk('Не совсем. Прочитай ещё раз и подумай про выделенное слово.','sad');
      }
    }
    $('#yes').addEventListener('click',function(){answer(true);});
    $('#no').addEventListener('click',function(){answer(false);});
    function onKey(e){
      if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
      e.preventDefault();
      if(e.repeat)return;
      answer(e.key==='ArrowRight');
    }
    document.addEventListener('keydown',onKey);
    cleanups.push(function(){document.removeEventListener('keydown',onKey);});
    show();
  }

  /* ---------- mission 5 ---------- */
  var SW=480,SH=400,SMX=240;
  function rr(ctx,x,y,w,h,r){
    ctx.moveTo(x+r,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }
  var FG=null;
  /* левая половина фигуры: прямоугольники. fn() заливает или обводит путь */
  function wingPaths(ctx,fn,i){
    FG.parts.forEach(function(p,k){
      if(i!==undefined&&i!==k)return;
      ctx.beginPath();rr(ctx,p[0],p[1],p[2],p[3],p[4]);fn(k);
    });
  }
  function bodyR(ctx){
    ctx.save();
    ctx.fillStyle='#8CA3B0';ctx.fillRect(SMX-16,232,32,16);
    ctx.strokeStyle='#8CA3B0';ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(SMX,92);ctx.lineTo(SMX,52);ctx.stroke();
    ctx.fillStyle='#FFBF00';ctx.beginPath();ctx.arc(SMX,46,11,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function faceR(ctx){
    ctx.save();
    ctx.fillStyle='#0B1620';ctx.beginPath();ctx.moveTo(150,125);ctx.lineTo(330,125);ctx.lineTo(330,200);ctx.lineTo(150,200);ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#3DDC97';[[200,155],[280,155]].forEach(function(e){ctx.beginPath();ctx.ellipse(e[0],e[1],11,15,0,0,Math.PI*2);ctx.fill();});
    ctx.strokeStyle='#3DDC97';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(214,182);ctx.quadraticCurveTo(SMX,198,266,182);ctx.stroke();
    ctx.restore();
  }
  function bodyC(ctx){
    ctx.save();ctx.strokeStyle='#8CA3B0';ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(SMX,200);ctx.lineTo(SMX,140);ctx.stroke();
    ctx.fillStyle='#FF6680';ctx.beginPath();ctx.moveTo(SMX,140);ctx.lineTo(SMX+46,158);ctx.lineTo(SMX,176);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function faceC(ctx){
    ctx.save();ctx.fillStyle='#0B1620';
    ctx.beginPath();ctx.moveTo(SMX-34,350);ctx.lineTo(SMX-34,286);ctx.arc(SMX,286,34,Math.PI,0);ctx.lineTo(SMX+34,350);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8A6A3A';ctx.fillRect(SMX-2,290,4,60);
    ctx.restore();
  }
  function drawBody(ctx){FG.body(ctx);}
  function drawFace(ctx){FG.face(ctx);}
  var FIGS=[
    {parts:[[110,92,130,140,30],[74,140,36,52,10],[140,248,100,100,22]],cols:['#2D97FF','#FFBF00','#9966FF'],body:bodyR,face:faceR,
     title:'Волшебное зеркало',stk:'мордочка',bbox:[138,113,204,98],
     text:'Лист разделён пунктирной линией, как зеркало. Рисуй на любой стороне, а вторая сторона нарисует то же самое наоборот. Это называется симметрия. Закрась голову, ухо и туловище робота. Мордочку рисовать не надо: когда закончишь, ты получишь стикер «мордочка» и наклеишь его.',
     guide:'Закрась пунктирного робота: голову, ухо и туловище. Мордочка будет стикером!'},
    {parts:[[70,92,90,26,4],[80,118,70,232,4],[150,200,90,150,4]],cols:['#FF6680','#9966FF','#FFBF00'],body:bodyC,face:faceC,
     title:'Зеркало: замок',stk:'ворота',bbox:[196,248,88,108],
     text:'Хаос стёр второй рисунок. Закрась башню, её крышу и стену. Вторая половина появится сама. Ворота рисовать не надо: когда закончишь, ты получишь стикер «ворота» и наклеишь его.',
     guide:'Закрась башню, крышу и стену. Ворота будут стикером!'}
  ];
  function drawSample(cv){
    var ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.save();ctx.scale(cv.width/SW,cv.height/SH);
    ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,SW,SH);
    var COL=FG.cols;
    [0,1].forEach(function(m){
      ctx.save();
      if(m){ctx.translate(SW,0);ctx.scale(-1,1);}
      wingPaths(ctx,function(k){ctx.fillStyle=COL[k];ctx.fill();});
      ctx.restore();
    });
    drawBody(ctx);drawFace(ctx);
    ctx.restore();
  }
  function stickerCanvas(){
    var b=FG.bbox,pad=10,cv=document.createElement('canvas');
    cv.width=b[2]+pad*2;cv.height=b[3]+pad*2;
    var ctx=cv.getContext('2d');
    ctx.fillStyle='#FFFFFF';ctx.beginPath();rr(ctx,0,0,cv.width,cv.height,18);ctx.fill();
    ctx.translate(pad-b[0],pad-b[1]);FG.face(ctx);
    return cv;
  }
  function mission5(fi){
    fi=fi||0;FG=FIGS[fi];
    go(5,'Миссия 5 из '+NMIS+' · '+MI[4].place);
    mount('<section class="panel" style="--mc:var(--berry)">'+
      head(mtag(5)+' · рисунок '+(fi+1)+' из 2',FG.title,FG.text)+
      guide(FG.guide)+
      '<div class="m5">'+
        '<div class="m5side"><p class="sub">Образец</p><canvas id="smp" class="smp" width="240" height="200" aria-label="Образец: симметричный рисунок"></canvas></div>'+
        '<div class="m5main">'+
          '<div class="sheet" id="sheet"><canvas id="gd" width="'+SW+'" height="'+SH+'"></canvas><canvas id="ink" width="'+SW+'" height="'+SH+'" aria-label="Лист для рисования"></canvas><span class="mdot" id="md"></span><span class="stkspot" id="spot" hidden></span></div>'+
          '<div class="pal" id="pal" role="group" aria-label="Цвета"></div>'+
          '<div class="meter m5m"><i id="m5i"></i></div><p class="count" id="m5c"></p>'+
          '<div class="row" id="m5row"><button type="button" class="btn good" id="d5" disabled>Готово</button><button type="button" class="btn ghost" id="c5">Стереть всё</button></div>'+
          '<div class="stkbox" id="stkbox" hidden><p class="sub">Твой стикер «'+FG.stk+'»</p><div class="stkdrag" id="stkd" role="button" tabindex="0" aria-label="Стикер '+FG.stk+'. Перетащи его на рисунок или нажми."></div><p class="hint" style="text-align:left">Перетащи стикер на рисунок. Или просто нажми на него.</p></div>'+
        '</div>'+
      '</div>'+
    '</section>');
    drawSample($('#smp'));
    var gd=$('#gd'),ink=$('#ink'),g=gd.getContext('2d'),c=ink.getContext('2d'),md=$('#md'),sheet=$('#sheet');
    g.fillStyle='#FFFFFF';g.fillRect(0,0,SW,SH);
    g.save();g.setLineDash([7,7]);g.strokeStyle='#9DB2C0';g.lineWidth=3;g.fillStyle='#F4F8FC';
    wingPaths(g,function(){g.fill();g.stroke();});g.restore();
    g.save();g.setLineDash([10,9]);g.strokeStyle='#E0407A';g.lineWidth=3;g.beginPath();g.moveTo(SMX,0);g.lineTo(SMX,SH);g.stroke();g.restore();
    drawBody(g);
    g.fillStyle='#8CA3B0';g.font='700 21px Source Sans 3,Arial,sans-serif';g.textAlign='center';
    g.fillText('рисуй здесь',SMX/2,SH-14);g.fillText('здесь появится отражение',SMX+SMX/2,SH-14);
    var mk=document.createElement('canvas');mk.width=SW;mk.height=SH;
    var mc2=mk.getContext('2d');mc2.fillStyle='#000';
    wingPaths(mc2,function(){mc2.fill();});
    var mdata=mc2.getImageData(0,0,SW,SH).data,wingN=0;
    for(var p=3;p<mdata.length;p+=4)if(mdata[p]>128&&((p>>2)%SW)<SMX)wingN++;
    var COLS=['#2D97FF','#FFBF00','#9966FF','#34C759','#FF6680'];
    var color=COLS[0],drawing=false,lx=0,ly=0,strokes=0,pct=0,done=false,stage2=false,placed=false,alive=true;
    cleanups.push(function(){alive=false;done=true;});
    $('#pal').innerHTML=COLS.map(function(k,n){return '<button type="button" class="sw'+(n===0?' on':'')+'" data-c="'+k+'" style="--c:'+k+'" aria-label="Цвет '+(n+1)+'"></button>';}).join('');
    $('#pal').addEventListener('click',function(e){
      var b=e.target.closest('.sw');if(!b)return;
      color=b.getAttribute('data-c');$$('.sw').forEach(function(s){s.classList.toggle('on',s===b);});sfx.tap();
    });
    function pos(e){var r=ink.getBoundingClientRect();return [(e.clientX-r.left)*SW/r.width,(e.clientY-r.top)*SH/r.height];}
    function seg(x0,y0,x1,y1){
      c.strokeStyle=color;c.lineWidth=17;c.lineCap='round';c.lineJoin='round';
      c.beginPath();c.moveTo(x0,y0);c.lineTo(x1+0.01,y1);
      c.moveTo(SW-x0,y0);c.lineTo(SW-x1-0.01,y1);c.stroke();
    }
    function dot(x,y){md.style.left=((SW-x)/SW*100)+'%';md.style.top=(y/SH*100)+'%';md.style.opacity=1;}
    ink.addEventListener('pointerdown',function(e){
      if(done||stage2)return;
      e.preventDefault();
      try{ink.setPointerCapture(e.pointerId);}catch(err){}
      var q=pos(e);drawing=true;lx=q[0];ly=q[1];seg(lx,ly,lx,ly);dot(lx,ly);sfx.tap();
    });
    ink.addEventListener('pointermove',function(e){
      if(stage2)return;
      var q=pos(e);dot(q[0],q[1]);
      if(!drawing)return;
      seg(lx,ly,q[0],q[1]);lx=q[0];ly=q[1];
    });
    ink.addEventListener('pointerleave',function(){if(!drawing)md.style.opacity=0;});
    function stop(){if(!drawing)return;drawing=false;strokes++;md.style.opacity=0;measure();}
    ink.addEventListener('pointerup',stop);
    ink.addEventListener('pointercancel',stop);
    function counts(){
      var d=c.getImageData(0,0,SW,SH).data,cov=0,inkL=0,out=0;
      for(var p=3,k=0;p<d.length;p+=4,k++){
        var x=k%SW;if(x>=SMX)continue;
        var on=d[p]>60,inw=mdata[p]>128;
        if(on){inkL++;if(inw)cov++;else out++;}
      }
      return {cov:cov,ink:inkL,out:out};
    }
    function measure(){
      var r=counts();
      pct=Math.min(100,Math.round(r.cov/wingN*100/0.9));
      $('#m5i').style.width=pct+'%';
      $('#m5c').textContent='Рисунок закрашен на '+pct+'%';
      $('#d5').disabled=pct<55||stage2;
      $('#d5').classList.toggle('glow',pct>=55&&!stage2);
      if(strokes===1)talk('Видишь? Зеркало рисует то же самое с другой стороны!','happy');
    }
    $('#c5').addEventListener('click',function(){
      if(done||stage2)return;
      c.clearRect(0,0,SW,SH);strokes=0;measure();$('#m5c').textContent='Лист чистый. Рисуй!';sfx.tap();talk('Лист чистый. Начни заново!','think');
    });
    /* этап 2: наклеить стикер */
    function place(){
      if(placed||!alive)return;
      placed=true;done=true;
      FG.face(c);  /* стикер прилип: рисуем его на листе */
      $('#spot').hidden=true;$('#stkbox').hidden=true;
      sfx.win();burstAt(sheet,100);
      talk(fi===0?'Робот готов! Обе половинки одинаковые, это и есть симметрия. Остался ещё один рисунок.':'Замок готов! Обе половинки одинаковые.','happy');
      setTimeout(function(){if(!alive)return;if(fi===0)mission5(1);else reward(5);},2400);
    }
    function showSticker(){
      stage2=true;
      $('#m5row').hidden=true;$('#pal').hidden=true;
      var box=$('#stkbox'),sd=$('#stkd'),spot=$('#spot');
      box.hidden=false;var scv=stickerCanvas();scv.style.width=Math.min(scv.width,190)+'px';sd.appendChild(scv);
      var b=FG.bbox;
      spot.hidden=false;spot.style.left=(b[0]/SW*100)+'%';spot.style.top=(b[1]/SH*100)+'%';spot.style.width=(b[2]/SW*100)+'%';spot.style.height=(b[3]/SH*100)+'%';
      sfx.ok();talk('Хорошо закрашено! Теперь наклей стикер «'+FG.stk+'» на рисунок.','happy');
      var ghost=null,sx=0,sy=0,moved=false,act=false;
      sd.addEventListener('pointerdown',function(e){
        if(placed)return;e.preventDefault();act=true;moved=false;sx=e.clientX;sy=e.clientY;
        try{sd.setPointerCapture(e.pointerId);}catch(err){}
      });
      sd.addEventListener('pointermove',function(e){
        if(!act)return;
        if(!moved&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){
          moved=true;ghost=sd.firstChild.cloneNode(true);
          ghost.getContext('2d').drawImage(sd.firstChild,0,0);
          ghost.className='stkghost';document.body.appendChild(ghost);sd.classList.add('lifted');
        }
        if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
          var r=sheet.getBoundingClientRect();spot.classList.toggle('over',e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom);}
      });
      function end(e){
        if(!act)return;act=false;
        var r=sheet.getBoundingClientRect(),inside=e&&e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom;
        if(ghost){ghost.remove();ghost=null;}
        sd.classList.remove('lifted');spot.classList.remove('over');
        if(!moved||inside)place();
        else{sfx.err();talk('Стикер нужно отпустить на рисунке. Попробуй ещё раз!','think');}
      }
      sd.addEventListener('pointerup',end);
      sd.addEventListener('pointercancel',function(){act=false;if(ghost){ghost.remove();ghost=null;}sd.classList.remove('lifted');});
      sd.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();place();}});
      cleanups.push(function(){if(ghost)ghost.remove();});
    }
    $('#d5').addEventListener('click',function(){
      if(done||stage2)return;
      var r=counts();
      if(r.ink>0&&r.out/r.ink>0.4){
        sfx.err();talk('Много краски вышло за пунктир. Нажми «Стереть всё» и рисуй точнее, внутри пунктирного рисунка.','sad');return;
      }
      showSticker();
    });
    measure();$('#m5c').textContent='Рисунок закрашен на 0%';
  }


  /* ---------- configs for the energy engine ---------- */
  var KEYSVG='<svg viewBox="0 0 48 48" aria-label="ключ"><circle cx="15" cy="24" r="9" fill="#FFBF00" stroke="#8A6A00" stroke-width="2.5"/><circle cx="15" cy="24" r="3.5" fill="#fff"/><path d="M23 24h20M36 24v8M42 24v6" stroke="#8A6A00" stroke-width="4.5" stroke-linecap="round" fill="none"/></svg>';
  var DOORSVG='<svg viewBox="0 0 48 48" aria-label="дверь"><rect x="9" y="5" width="30" height="40" rx="6" fill="#B07A45" stroke="#6B4423" stroke-width="2.5"/><rect x="14" y="10" width="20" height="14" rx="3" fill="#C99560"/><circle cx="32" cy="30" r="3" fill="#FFBF00" stroke="#8A6A00" stroke-width="1.5"/></svg>';
  var CF3=[
    {n:3,G:{w:5,h:4,start:[0,3],station:[4,0],rocks:[[1,2],[3,1],[2,3]],bats:[[0,1],[3,3]]},
     title:'Зарядка героя · поле 1 из 2',text:'Герою нужна энергия. Составь программу из стрелок: собери две батарейки и дойди до станции зарядки. Камни обходи. Потом нажми «Запустить».',
     item:BATT,goal:STATION,label:'Батарейки',nag:false,take:'Следующее поле',
     pick:function(g,t){return g<t?'Батарейка! Ещё '+(t-g)+'.':'Обе батарейки собраны! Теперь к станции.';},
     miss:function(g,t){return 'Станция найдена, но собрано только '+g+' из '+t+' батареек. Нужна энергия от всех! Измени программу.';},
     win:function(n){return 'Герой заряжен! Теперь поле посложнее.';},
     done:function(){mission3(1);}},
    {n:3,G:{w:6,h:5,start:[0,4],station:[5,0],rocks:[[1,3],[2,3],[3,1],[4,2],[1,1]],bats:[[0,2],[2,2],[4,1]]},
     title:'Зарядка героя · поле 2 из 2',text:'Теперь поле побольше. Пройди через все три батарейки и дойди до станции зарядки. Стрелки можно нажимать и на клавиатуре.',
     item:BATT,goal:STATION,label:'Батарейки',nag:true,take:'Забрать блок',
     pick:function(g,t){return g<t?'Батарейка! Ещё '+(t-g)+'.':'Все батарейки собраны! Теперь к станции.';},
     miss:function(g,t){return 'Станция найдена, но собрано только '+g+' из '+t+' батареек. Нужна энергия от всех! Измени программу.';},
     win:function(n){return 'Самый короткий путь! Всего '+n+' стрелок. Ты настоящий алгоритмист!';},
     done:function(){reward(3);}}
  ];
  function mission3(lv){energy(CF3[lv||0]);}
  var CF8={n:8,G:{w:8,h:6,start:[0,5],station:[7,5],rocks:[[2,0],[2,1],[4,1],[5,1],[1,2],[2,2],[5,2],[7,2],[3,3],[6,3],[1,4],[5,4],[1,5],[3,5]],bats:[[1,1]]},
     title:'Ключ и дверь',text:'Дверь в сердце города заперта. Сначала возьми ключ, потом иди к двери. Порядок команд очень важен! Составь программу из стрелок. Но это ещё не всё: нужно пройти маршрут за наименьшее число шагов. Обходи камни и считай внимательно.',
     item:KEYSVG,goal:DOORSVG,label:'Ключ',nag:true,strict:true,take:'Забрать блок',
     short:function(n,b){return 'Дверь открыта, но есть путь короче: всего '+b+' стрелок, а у тебя '+n+'. Подумай, где можно срезать.';},
     pick:function(){return 'Ключ у тебя! Теперь к двери.';},
     miss:function(){return 'Дверь заперта: у тебя нет ключа. Сначала сходи за ключом, а потом к двери. Измени программу.';},
     win:function(n){return 'Самый короткий путь: '+n+' стрелок! Ты настоящий стратег.';},
     done:function(){reward(8);}};
  function mission8(){energy(CF8);}

  /* ---------- mission 6: узоры ---------- */
  var PSH={
    c:'<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#FFBF00" stroke="#0B1620" stroke-width="2.5"/></svg>',
    b:'<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#4C97FF" stroke="#0B1620" stroke-width="2.5"/></svg>',
    s:'<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="6" fill="#9966FF" stroke="#0B1620" stroke-width="2.5"/></svg>',
    d:'<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="6" fill="#FF8A3D" stroke="#0B1620" stroke-width="2.5"/></svg>',
    t:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4L37 35H3z" fill="#59C059" stroke="#0B1620" stroke-width="2.5" stroke-linejoin="round"/></svg>',
    r:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#FF6680" stroke="#0B1620" stroke-width="2.2" stroke-linejoin="round"/></svg>'
  };
  function rep(a,n){var o='';for(var i=0;i<n;i++)o+=a;return o;}
  function mission6(){
    go(6,'Миссия 6 из '+NMIS+' · '+MI[5].place);
    var RS=[
      {seq:rep('cbsd',3),blanks:[3,6,9,11],cyc:4,tokens:'cbsd',hint:'Четыре фигурки идут по кругу. Какая будет в пустой клетке?'},
      {seq:rep('cstrts',2),blanks:[3,7,10,11],cyc:6,tokens:'cstr',hint:'Узор идёт туда и обратно, как зеркало. Найди, какая фигурка пропущена.'},
      {seq:'c'+'ss'+'ccc'+'ssss'+'ccccc',blanks:[9,10,11,12,13,14],tokens:'cs',hint:'Этот узор растёт: каждый раз на одну фигурку больше.'},
      {seq:'cst'+'stc'+'tcs',blanks:[4,5,7,8],cols:3,tokens:'cst',hint:'В каждой строчке фигурки сдвигаются на одну клетку. В каждой строчке и в каждом столбце нет одинаковых.'}
    ];
    mount('<section class="panel" style="--mc:var(--sky)">'+
      head(mtag(6),'Узоры','На Узорной улице Хаос стёр часть узоров. Найди правило каждого узора и заполни пустые клетки по порядку.')+
      guide('Узоры бывают разные: одни повторяются, другие растут. Найди правило!')+
      '<p class="sub" id="pl"></p>'+
      '<p class="hint" id="ph" style="text-align:left"></p>'+
      '<div class="pat" id="pat" aria-live="polite"></div>'+
      '<div class="ptray" id="ptr"></div>'+
    '</section>');
    var pat=$('#pat'),ptr=$('#ptr'),ri=0,bi=0,R=null,busy=false,alive=true;
    cleanups.push(function(){alive=false;});
    function build(){
      R=RS[ri];bi=0;busy=false;pat.classList.remove('grouped');
      $('#pl').textContent='Узор '+(ri+1)+' из '+RS.length;$('#ph').textContent=R.hint;
      pat.style.maxWidth=R.cols?(R.cols*72)+'px':'';
      pat.style.margin=R.cols?'0 auto':'';
      pat.innerHTML=R.seq.split('').map(function(k,i){
        var bl=R.blanks.indexOf(i)>-1,grp=R.cyc?Math.floor(i/R.cyc)%2:0;
        return '<span class="pc'+(bl?' blank'+(i===R.blanks[0]?' cur':''):'')+'" data-i="'+i+'" data-g="'+grp+'">'+(bl?'':PSH[k])+'</span>'+((R.cols&&(i+1)%R.cols===0)?'<br class="brk">':'');
      }).join('');
      if(R.cols)pat.classList.add('gridp');else pat.classList.remove('gridp');
      ptr.innerHTML=R.tokens.split('').map(function(k){return '<button type="button" class="ptok" data-k="'+k+'" aria-label="Фигурка">'+PSH[k]+'</button>';}).join('');
    }
    function pick1(k){
      if(busy)return;
      var i=R.blanks[bi],c=pat.querySelector('.pc[data-i="'+i+'"]');
      if(k===R.seq.charAt(i)){
        c.classList.remove('blank','cur');c.innerHTML=PSH[k];c.classList.add('pop');sfx.key();bi++;
        if(bi>=R.blanks.length)roundDone();
        else{var n=pat.querySelector('.pc[data-i="'+R.blanks[bi]+'"]');if(n)n.classList.add('cur');}
      }else{
        sfx.err();c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');
        talk('Не та фигурка. Посмотри внимательно, как устроен узор.','sad');
      }
    }
    function roundDone(){
      busy=true;if(R.cyc)pat.classList.add('grouped');sfx.ok();burstAt(pat,40);
      if(ri<RS.length-1){
        talk('Верно! Дальше узор хитрее.','happy');
        setTimeout(function(){if(!alive)return;ri++;build();},1900);
      }else{
        sfx.win();burstAt(pat,90);
        talk('Все узоры починены! Одни повторяются, другие растут по правилу. Блок «повторять» помогает программам делать одно и то же много раз.','happy');
        setTimeout(function(){if(alive)reward(6);},3400);
      }
    }
    ptr.addEventListener('click',function(e){var b=e.target.closest('.ptok');if(b)pick1(b.getAttribute('data-k'));});
    build();
  }

  /* ---------- mission 7: двоичный замок ---------- */
  function mission7(){
    go(7,'Миссия 7 из '+NMIS+' · '+MI[6].place);
    var VAL=[16,8,4,2,1];
    var RD=[{t:'set',n:6},{t:'set',n:11},{t:'read',n:13},{t:'set',n:17},{t:'read',n:19},{t:'set',n:20}];
    var BULB='<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 3C10 3 4 10 4 18c0 6 3 9 6 13 2 3 2 5 2 7h16c0-2 0-4 2-7 3-4 6-7 6-13C36 10 30 3 20 3z" class="gl"/><rect x="12" y="40" width="16" height="4" rx="2" fill="#6E8793"/><rect x="14" y="46" width="12" height="4" rx="2" fill="#6E8793"/></svg>';
    mount('<section class="panel" style="--mc:var(--grape)">'+
      head(mtag(7),'Двоичный замок','Замок открывается числом. У каждой лампочки есть своё число: 16, 8, 4, 2 и 1. Горящие лампочки складываются. Иногда нужно зажечь лампочки под число, а иногда прочитать число по лампочкам.')+
      guide('Компьютеры считают именно так: лампочка горит или нет. Попробуй и ты!')+
      '<div class="lockbox" id="lk"><div class="target" id="tgl"></div>'+
      '<div class="lamps" id="lamps">'+VAL.map(function(v,i){return '<button type="button" class="lamp" data-i="'+i+'" aria-pressed="false" aria-label="Лампочка '+v+'">'+BULB+'<span class="lv">'+v+'</span></button>';}).join('')+'</div>'+
      '<p class="lsum" id="ls"></p><div class="opts" id="opts" hidden></div></div>'+
      '<p class="sub" id="lr"></p>'+
    '</section>');
    var on=[0,0,0,0,0],ri=0,busy=false,alive=true,R=null;
    cleanups.push(function(){alive=false;});
    function sum(){return on.reduce(function(s,o,i){return s+o*VAL[i];},0);}
    function bits(n){return VAL.map(function(v){var b=n>=v?1:0;if(b)n-=v;return b;});}
    function paint(){
      $$('.lamp').forEach(function(b,i){b.classList.toggle('on',!!on[i]);b.setAttribute('aria-pressed',on[i]?'true':'false');b.disabled=R.t==='read';});
      var parts=[];on.forEach(function(o,i){if(o)parts.push(VAL[i]);});
      $('#ls').textContent=R.t==='read'?(parts.length?'Горит: '+parts.join(' + '):''):(parts.length?'Горит: '+parts.join(' + ')+' = '+sum():'Все лампочки погашены: 0');
    }
    function build(){
      R=RD[ri];busy=false;$('#lr').textContent='Замок '+(ri+1)+' из '+RD.length;
      var opts=$('#opts');
      if(R.t==='set'){
        on=[0,0,0,0,0];opts.hidden=true;
        $('#tgl').innerHTML='Зажги лампочки на число <b>'+R.n+'</b>';
      }else{
        on=bits(R.n);opts.hidden=false;
        $('#tgl').innerHTML='Какое число показывают лампочки?';
        var a=[R.n],cand=[R.n-1,R.n+1,R.n-2,R.n+2,R.n+4,R.n-4,R.n+3];
        cand.forEach(function(v){if(a.length<4&&v>0&&a.indexOf(v)<0)a.push(v);});
        a.sort(function(x,y){return ((x*7)%11)-((y*7)%11);});
        opts.innerHTML=a.map(function(v){return '<button type="button" class="opt" data-n="'+v+'">'+v+'</button>';}).join('');
      }
      paint();
    }
    function solved(){
      busy=true;sfx.ok();burstAt($('#lk'),40);
      if(ri<RD.length-1){
        talk('Верно! Следующий замок!','happy');
        setTimeout(function(){if(!alive)return;ri++;build();},1300);
      }else{
        $('#lk').classList.add('open');sfx.win();burstAt($('#lk'),90);
        talk('Замок щёлкнул! Ты считаешь, как компьютер.','happy');
        setTimeout(function(){if(alive)reward(7);},2400);
      }
    }
    $('#lamps').addEventListener('click',function(e){
      var b=e.target.closest('.lamp');if(!b||busy||R.t!=='set')return;
      var i=+b.getAttribute('data-i');on[i]=on[i]?0:1;sfx.tap();paint();
      if(sum()===R.n)solved();
    });
    $('#opts').addEventListener('click',function(e){
      var b=e.target.closest('.opt');if(!b||busy)return;
      if(+b.getAttribute('data-n')===R.n){b.classList.add('good');solved();}
      else{sfx.err();b.classList.add('bad');talk('Не то число. Сложи числа горящих лампочек.','sad');}
    });
    build();
  }

  /* ---------- finale ---------- */
  function finale(){
    if(!S.test)clearProg();
    go('done','Все районы проснулись! Осталось собрать программу и открыть сундук.');
    var mins=Math.max(1,Math.round((Date.now()-S.t0)/60000));
    var today=new Date().toLocaleDateString('ru-RU');
    var url=SCRATCH_URL||'https://scratch.mit.edu/projects/1398522787/editor/';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      '<div class="stage-fin"><button type="button" class="chestwrap locked" id="cw" aria-label="Сундук заперт. Нажми на него.">'+chestLockedSVG()+'</button></div>'+
      '<header class="ph"><p class="tag">Все блоки найдены</p><h2>Агент '+esc(S.name)+', город проснулся!</h2><p>Все восемь заданий пройдены за '+mins+' мин. Но сундук всё ещё заперт: Хаос спрятал программу, которая его открывает. Эту программу соберёшь ты сам из блоков, которые лежат у тебя на столе.</p></header>'+
      guide('Нажми на сундук и попробуй открыть его. Не получится! Нужна программа.')+
      '<ol class="steps">'+
        '<li><b>Выложи блоки на столе.</b> У тебя 12 нужных блоков. Из них получается программа из трёх частей. Расставь блоки друг под другом, как герой будет всё делать.</li>'+
        '<li class="hintli"><b>Подсказки от Байта.</b><br><b>1. Подготовка.</b> Программа запускается флажком. Герой встаёт на старт, смотрит вправо и надевает костюм «стоит».<br><b>2. Путь к сундуку.</b> Герой говорит, что идёт, и десять раз шагает и ждёт.<br><b>3. Ключ и заклинание.</b> Герой достаёт ключ, секунду ждёт, говорит волшебные слова и колдует.</li>'+
        '<li><b>Проверь себя.</b> Нажми кнопку ниже и сравни свою программу с настоящей.</li>'+
      '</ol>'+
      '<div class="row"><button type="button" class="btn good" id="chk">Проверить программу</button></div>'+
      '<div class="mapcard" id="mp" hidden><span class="lbl">Программа героя</span><div class="algobox">'+algoHTML()+'</div></div>'+
      '<ol class="steps" id="sc" hidden>'+
        '<li>Нажми «Открыть Scratch». В заготовке есть герой, сундук и салют, но программы у героя нет. Её ты соберёшь сам. Если Scratch на английском, нажми на глобус слева вверху и выбери «Русский».</li>'+
        '<li>Собери в Scratch такую же программу, как на столе. Блоки ищи по цвету: жёлтые и оранжевые в «События» и «Управление», синие в «Движении», фиолетовые во «Внешности».</li>'+
        '<li>Нажми на зелёный флажок. Если всё верно, герой дойдёт до сундука, достанет ключ, скажет «Сезам, откройся!» и сундук откроется. Можно нажать флажок ещё раз: подготовка вернёт героя на старт.</li>'+
      '</ol>'+
      '<div class="row" id="sr" hidden><a class="btn sun glow" href="'+esc(url)+'" target="_blank" rel="noopener">Открыть Scratch</a></div>'+
      '<div class="idcard"><div class="idtop">Удостоверение юного айтишника</div><div class="idbody"><div class="idphoto">'+mascotSVG()+'</div><div class="idinfo"><span class="idlbl">Позывной</span><span class="idname">'+esc(S.name)+'</span><span class="idlbl">Задание</span><span>Разбудил город за '+mins+' мин</span><span class="idlbl">Дата</span><span>'+esc(today)+'</span></div></div><div class="idstripe"></div></div>'+
    '</section>');
    var cw=$('#cw');
    cw.addEventListener('click',function(){
      sfx.err();
      cw.classList.remove('try');void cw.offsetWidth;cw.classList.add('try');
      talk(pick(['Заперто! Хаос заколдовал замок.','Не открывается. Нужна программа!','Замок держится крепко. Собери программу, и он сдастся.']),'sad');
    });
    $('#chk').addEventListener('click',function(){
      sfx.win();
      $('#mp').hidden=false;$('#sc').hidden=false;$('#sr').hidden=false;$('#chk').disabled=true;
      talk('Сравни блоки на столе с картинкой. Всё совпало? Тогда собирай такую же в Scratch!','happy');
      burstAt($('#mp'),70);
      $('#mp').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
    });
    mood('happy');sfx.win();
    setTimeout(function(){burstAt($('.stage-fin'),110);},350);
  }

  NEXT={1:mission2,2:mission3,3:mission4,4:mission5,5:mission6,6:mission7,7:mission8,8:finale};

  /* ---------- teacher panel ---------- */
  var JUMP={intro:showIntro,'1':mission1,'2':mission2,'3':function(){mission3(0);},'3b':function(){mission3(1);},'4':mission4,'5':function(){mission5(0);},'5b':function(){mission5(1);},'6':mission6,'7':mission7,'8':mission8,fin:finale};
  $$('[data-jump]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-jump');
      if(k==='reset'){clearProg();S.test=false;S.name='';S.got=[];S.t0=0;showIntro(true);return;}
      S.test=true;
      if(!S.t0)S.t0=Date.now();
      if(!S.name)S.name='Агент';
      if(k==='fin'){S.got=['p1','p2','p3','p4','p5','p6','p7','p8'];}
      JUMP[k]();
    });
  });

  showIntro();
})();
