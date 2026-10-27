
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
    move:function(){return '<div class="blk motion"><span>идти</span><span class="v">'+(S.moveN*10)+'</span><span>шагов</span></div>';},
    say:function(){return '<div class="blk looks"><span>говорить</span><span class="v">Сезам, откройся!</span><span class="v">2</span><span>секунд</span></div>';},
    costume:function(){return '<div class="blk looks"><span>следующий костюм</span></div>';},
    turn:function(){return '<div class="blk motion"><span>повернуть</span><span aria-hidden="true">↻</span><span>на</span><span class="v">15</span><span>градусов</span></div>';}
  };
  var SOL=['flag','move','say','costume'];

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

  /* ---------- puzzle picture: the algorithm cut into 5 pieces ---------- */
  var STEPS_N=100;
  var PIECES=[[0,0,150,157],[150,0,150,157],[0,157,100,143],[100,157,100,143],[200,157,100,143]];
  var PCOL=['var(--sun)','var(--grape)','var(--sky)','var(--mint)','var(--berry)'];
  function algoInner(){
    var W='font-family="Source Sans 3,Arial,sans-serif" font-weight="700" fill="#fff"';
    var D=W.replace('#fff','#3A2A00');
    function blk(x,y,w,h,fill,body,r){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(r||9)+'" fill="'+fill+'" stroke="rgba(0,0,0,.22)" stroke-width="1.5"/>'+body;}
    function pill(x,y,w,txt,col){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="22" rx="11" fill="#fff"/><text x="'+(x+w/2)+'" y="'+(y+16)+'" font-size="13" text-anchor="middle" font-weight="700" font-family="Source Sans 3,Arial,sans-serif" fill="'+col+'">'+txt+'</text>';}
    var flag='<g transform="translate(78 14)"><path d="M3 1v24" stroke="#3A2A00" stroke-width="2.4" stroke-linecap="round"/><path d="M3 2c6-3 9 3 17 0v12c-8 3-11-3-17 0z" fill="#34C759" stroke="#3A2A00" stroke-width="1.4" stroke-linejoin="round"/></g>';
    return '<rect x="0" y="0" width="300" height="300" fill="#F3F8FF"/>'+
      blk(12,8,276,38,'#FFBF00','<text x="28" y="33" font-size="16" '+D+'>когда</text>'+flag+'<text x="112" y="33" font-size="16" '+D+'>нажат</text>',12)+
      /* повторять 10 раз: C-образный блок */
      '<path d="M12 48h276v36H12z M12 84h26v74H12z M12 158h276v20H12z" fill="#FFAB19" stroke="rgba(0,0,0,.22)" stroke-width="1.5" stroke-linejoin="round"/>'+
      '<text x="28" y="73" font-size="16" '+W+'>повторять</text>'+pill(118,55,40,'10','#8A5A00')+'<text x="168" y="73" font-size="16" '+W+'>раз</text>'+
      blk(38,86,240,34,'#4C97FF','<text x="52" y="109" font-size="16" '+W+'>идти</text>'+pill(100,92,40,'10','#2B4B7A')+'<text x="150" y="109" font-size="16" '+W+'>шагов</text>')+
      blk(38,122,240,34,'#FFAB19','<text x="52" y="145" font-size="16" '+W+'>ждать</text>'+pill(108,128,48,'0.3','#8A5A00')+'<text x="166" y="145" font-size="16" '+W+'>секунд</text>')+
      blk(12,180,276,36,'#9966FF','<text x="28" y="204" font-size="16" '+W+'>следующий костюм</text>')+
      blk(12,218,276,36,'#9966FF','<text x="28" y="241" font-size="15" '+W+'>говорить</text>'+pill(100,224,116,'Сезам, откройся!','#4B2F8A')+pill(222,224,20,'2','#4B2F8A')+'<text x="245" y="241" font-size="12" '+W+'>секунд</text>')+
      blk(12,256,276,36,'#9966FF','<text x="28" y="280" font-size="16" '+W+'>следующий костюм</text>');
  }
  function algoSVG(cls){return '<svg class="'+(cls||'algo')+'" viewBox="0 0 300 300" role="img" aria-label="Программа героя из четырёх блоков">'+algoInner()+'</svg>';}
  function pieceSVG(i,full){
    var p=PIECES[i];
    return '<svg class="pcsvg" viewBox="'+p.join(' ')+'" width="'+(full?'100%':Math.round(p[2]*0.62))+'" '+(full?'height="100%" preserveAspectRatio="none"':'height="'+Math.round(p[3]*0.62)+'"')+' aria-hidden="true">'+algoInner()+
      '<rect x="'+(p[0]+2)+'" y="'+(p[1]+2)+'" width="'+(p[2]-4)+'" height="'+(p[3]-4)+'" rx="10" fill="none" stroke="#fff" stroke-width="4"/>'+
      '<rect x="'+(p[0]+2)+'" y="'+(p[1]+2)+'" width="'+(p[2]-4)+'" height="'+(p[3]-4)+'" rx="10" fill="none" stroke-width="3" style="stroke:'+PCOL[i]+'"/></svg>';
  }

  /* ---------- trail and screens ---------- */
  function drawTrail(){
    var caps=['Сейф','Шифр','Энергия','Логика','Зеркало','Пазл','Сундук'];
    var cls=['sun','grape','sky','mint','berry','sun','sun'];
    $('#trail').innerHTML=caps.map(function(c,i){
      var got,cur,reached;
      if(i<5){got=S.got.indexOf('p'+(i+1))>-1;cur=S.step===i+1;reached=i>0&&S.got.indexOf('p'+i)>-1;}
      else if(i===5){got=S.step==='done';cur=S.step==='puzzle';reached=S.got.length>=5;}
      else{got=false;cur=S.step==='done';reached=S.step==='done';}
      return '<li class="'+(got?'got ':'')+(cur?'cur':'')+'"'+(reached?' data-reached':'')+' style="--c:var(--'+cls[i]+')"><span class="node">'+(got?'✓':i===6?'X':(i+1))+'</span><span class="cap">'+c+'</span></li>';
    }).join('');
  }
  function head(tag,title,text){
    return '<header class="ph"><p class="tag">'+tag+'</p><h2>'+title+'</h2><p>'+text+'</p></header>';
  }
  function go(step,leadText){S.step=step;drawTrail();clearStage();lead.textContent=leadText;window.scrollTo(0,0);}

  /* ---------- intro ---------- */
  function showIntro(){
    go('intro','Хакер Хаос запер сундук с секретами цифрового города. Пройди пять миссий, собери пять кусочков пазла и сложи из них картинку. На ней спрятана программа, которая откроет сундук в Scratch.');
    mount('<section class="panel" style="--mc:var(--accent)">'+
      '<header class="ph"><p class="tag">Старт</p><h2>Получи позывной</h2></header>'+
      guide('Привет! Я робот Байт, помощник агентов. Как тебя зовут?')+
      '<div class="teaser" aria-hidden="true"><span class="tz" style="--c:var(--sun);--dl:0s">?</span><span class="tz" style="--c:var(--grape);--dl:.15s">?</span><span class="tz" style="--c:var(--sky);--dl:.3s">?</span><span class="tz" style="--c:var(--mint);--dl:.45s">?</span><span class="tz" style="--c:var(--berry);--dl:.6s">?</span></div>'+
      '<label class="lab" for="nm">Твоё имя</label>'+
      '<input id="nm" class="fld" maxlength="20" autocomplete="off" placeholder="Например, Маша">'+
      '<div class="row"><button class="btn sun glow" id="go" type="button">Начать задание</button></div>'+
    '</section>');
    var nm=$('#nm');
    function start(){sfx.ok();S.name=nm.value.trim()||'Агент';S.t0=Date.now();mission1();}
    $('#go').addEventListener('click',start);
    nm.addEventListener('keydown',function(e){if(e.key==='Enter')start();});
    nm.addEventListener('input',function(){
      var v=nm.value.trim();
      talk(v?'Приятно познакомиться, '+v+'! Нажимай «Начать задание».':'Привет! Я робот Байт, помощник агентов. Как тебя зовут?',v?'happy':null);
    });
    nm.focus();
  }

  /* ---------- reward: a puzzle piece ---------- */
  var NEXT={};
  function reward(n){
    var key='p'+n;
    if(S.got.indexOf(key)<0)S.got.push(key);
    drawTrail();clearStage();window.scrollTo(0,0);
    var pic=S.got.length;
    var mini='';
    for(var k=0;k<5;k++)mini+='<span class="dot'+(S.got.indexOf('p'+(k+1))>-1?' on':'')+'" style="--c:'+PCOL[k]+'"></span>';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      head('Миссия '+n+' пройдена','Кусочек пазла '+n+' из 5',n<5?'Забирай кусочек. Когда соберёшь все пять, из них сложится картинка. Какая? Пока секрет!':'Последний кусочек у тебя! Теперь из пяти кусочков можно сложить картинку.')+
      guide(pick(['Ура! Ты молодец!','Отлично получилось!','Вот это да! Забирай!']))+
      '<div class="rw"><div class="rays" aria-hidden="true"></div><div class="pzwrap">'+pieceSVG(n-1)+'</div></div>'+
      '<div class="pdots" aria-label="Собрано кусочков: '+pic+' из 5">'+mini+'</div>'+
      '<div class="row"><button class="btn sun glow" id="nx" type="button">'+(n<5?'Дальше: миссия '+(n+1):'Сложить пазл')+'</button></div>'+
    '</section>');
    mood('happy');sfx.win();
    setTimeout(function(){burstAt($('.rw'),70);},250);
    var b=$('#nx');b.addEventListener('click',function(){sfx.tap();NEXT[n]();});b.focus();
  }

  /* ---------- mission 1: safe and keyboard ---------- */
  function mission1(){
    go(1,'Миссия 1 из 5 · клавиатура');
    var T='Я ЮНЫЙ АЙТИШНИК';
    var ROWS=['ЙЦУКЕНГШЩЗХЪ','ФЫВАПРОЛДЖЭ','ЯЧСМИТЬБЮ'];
    var ticks='';
    for(var a=0;a<8;a++)ticks+='<line x1="90" y1="63" x2="90" y2="68" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" transform="rotate('+(a*45)+' 90 89)"/>';
    var safe='<svg viewBox="0 0 180 180" aria-label="Сейф"><rect x="10" y="14" width="160" height="150" rx="18" fill="#3F86E8"/><rect x="22" y="26" width="136" height="126" rx="12" fill="#1F3D6B"/>'+
      '<g class="gold"><rect x="38" y="116" width="46" height="22" rx="4" fill="#FFBF00"/><rect x="94" y="116" width="46" height="22" rx="4" fill="#FFD84D"/><rect x="62" y="92" width="56" height="22" rx="4" fill="#FFBF00"/></g>'+
      '<g class="door"><rect x="22" y="26" width="136" height="126" rx="12" fill="#7DB7FF"/><rect x="32" y="36" width="116" height="106" rx="8" fill="none" stroke="#4C97FF" stroke-width="3"/>'+
      '<g class="dial"><circle cx="90" cy="89" r="30" fill="#2D6FD1"/><circle cx="90" cy="89" r="21" fill="#1F3D6B"/>'+ticks+'<line x1="90" y1="89" x2="90" y2="72" stroke="#FFBF00" stroke-width="5" stroke-linecap="round"/></g>'+
      '<rect x="128" y="78" width="11" height="28" rx="5.5" fill="#FFBF00"/></g>'+
      '<rect x="24" y="162" width="24" height="10" rx="3" fill="#2D6FD1"/><rect x="132" y="162" width="24" height="10" rx="3" fill="#2D6FD1"/></svg>';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      head('Миссия 1 из 5 · клавиатура','Взлом сейфа','Сейф закрыт кодовой фразой. Напечатай её. Нужная клавиша светится жёлтым.')+
      guide('Печатай на клавиатуре или нажимай буквы мышкой. Раскладка не важна!')+
      '<div class="m1grid"><div class="safe" id="safe">'+safe+'</div>'+
      '<div class="phr"><div class="typebox" id="tb" aria-label="Фраза для набора"></div><div class="meter"><i id="mt"></i></div><p class="count" id="cnt"></p></div></div>'+
      '<div class="kbd" id="kbd">'+ROWS.map(function(r){return '<div class="kr">'+r.split('').map(function(c){return '<button type="button" class="kb" data-k="'+c+'" tabindex="-1">'+c+'</button>';}).join('')+'</div>';}).join('')+
      '<div class="kr"><button type="button" class="kb space" data-k=" " tabindex="-1">пробел</button></div></div>'+
    '</section>');
    var tb=$('#tb'),cnt=$('#cnt'),kbd=$('#kbd'),mt=$('#mt'),safeEl=$('#safe'),dial=$('.dial',safeEl);
    var cp=0,done=false;
    function keyEl(c){return kbd.querySelector('[data-k="'+c+'"]');}
    function paint(){
      tb.innerHTML=T.split('').map(function(c,i){return '<span class="ch '+(i<cp?'done':(i===cp?'cur':''))+'">'+(c===' '?'&nbsp;':c)+'</span>';}).join('');
      cnt.textContent='Напечатано '+cp+' из '+T.length+' знаков';
      mt.style.width=(cp/T.length*100)+'%';
      dial.style.transform='rotate('+(cp/T.length*540)+'deg)';
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
        if(cp===T.length)win();
        else if(cp%5===0)talk(pick(['Отлично!','Так держать!','Ты быстро печатаешь!','Почти открыто!']),'happy');
      }else{
        flash(k,'miss');sfx.err();
        tb.classList.remove('shake');void tb.offsetWidth;tb.classList.add('shake');
        var c=tb.querySelector('.cur');if(c)c.classList.add('err');
        talk('Ищи '+(want===' '?'пробел':'букву «'+want+'»')+'. Она светится на клавиатуре.','sad');
      }
    }
    function win(){
      done=true;
      safeEl.classList.add('open');
      sfx.ok();talk('Сейф открыт! Внутри золото и новая карточка.','happy');
      setTimeout(function(){burstAt(safeEl,80);},500);
      setTimeout(function(){reward(1);},2200);
    }
    function onKey(e){var ch=ruChar(e);if(ch===null)return;e.preventDefault();press(ch);}
    document.addEventListener('keydown',onKey);
    cleanups.push(function(){document.removeEventListener('keydown',onKey);});
    kbd.addEventListener('mousedown',function(e){e.preventDefault();});
    kbd.addEventListener('click',function(e){var b=e.target.closest('.kb');if(b)press(b.getAttribute('data-k'));});
    paint();
  }

  /* ---------- mission 2: cipher ---------- */
  function mission2(){
    go(2,'Миссия 2 из 5 · шифр');
    var AL='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',WORDS=['СЕЗАМ','ОТКРОЙСЯ'];
    mount('<section class="panel" style="--mc:var(--grape)">'+
      head('Миссия 2 из 5 · шифр','Шифровальщик','Хаос спрятал волшебные слова в числах. Число показывает, какая это по счёту буква алфавита. Найди числа в таблице и впиши буквы.')+
      guide('Печатай буквы или нажимай на них в таблице. Таблица ниже — твоя подсказка.')+
      '<div class="alpha" id="alpha" aria-label="Алфавит с номерами">'+AL.split('').map(function(c,i){return '<button type="button" class="ac" data-c="'+c+'" aria-label="буква '+c+', номер '+(i+1)+'"><small>'+(i+1)+'</small><b>'+c+'</b></button>';}).join('')+'</div>'+
      '<div class="words" id="words"></div>'+
      '<div class="banner" id="bn" aria-live="polite"></div>'+
    '</section>');
    var wi=0,ins=[],cur=0,fails=0,locked=false,grp=null;
    var alpha=$('#alpha');
    function buildWord(i){
      var w=WORDS[i];
      grp=el('<div class="wgrp"><p class="sub">Слово '+(i+1)+' из 2</p><div class="cipher">'+w.split('').map(function(c,k){return '<label class="cc"><span class="cn">'+(AL.indexOf(c)+1)+'</span><input class="fld cin" data-i="'+k+'" maxlength="1" autocomplete="off" spellcheck="false" aria-label="Буква для числа '+(AL.indexOf(c)+1)+'"></label>';}).join('')+'</div></div>');
      $('#words').append(grp);
      ins=$$('.cin',grp);cur=0;locked=false;
      ins.forEach(function(inp,k){
        inp.addEventListener('focus',function(){cur=k;});
        inp.addEventListener('keydown',function(e){
          if(locked)return;
          var ch=ruChar(e);
          if(ch&&ch!==' '){e.preventDefault();put(k,ch);return;}
          if(e.key==='Backspace'||e.key==='Delete'){
            e.preventDefault();
            if(inp.value){inp.value='';inp.classList.remove('good','bad');}
            else if(ins[k-1]){ins[k-1].value='';ins[k-1].classList.remove('good','bad');ins[k-1].focus();}
          }else if(e.key==='ArrowLeft'&&ins[k-1]){ins[k-1].focus();}
          else if(e.key==='ArrowRight'&&ins[k+1]){ins[k+1].focus();}
        });
        inp.addEventListener('input',function(){
          var v=inp.value.toUpperCase().replace(/[^А-ЯЁ]/g,'');
          inp.value='';
          if(v)put(k,v.slice(-1));
        });
      });
      ins[0].focus();
    }
    function put(k,ch){
      if(locked)return;
      ins[k].value=ch;ins[k].classList.remove('good','bad');
      sfx.tap();
      if(ins[k+1]&&!ins[k+1].value)ins[k+1].focus();
      else{var nx=ins.findIndex(function(x){return !x.value;});if(nx>-1)ins[nx].focus();}
      check();
    }
    function check(){
      if(ins.some(function(x){return !x.value;}))return;
      var w=WORDS[wi],ok=true;
      ins.forEach(function(x,k){
        var g=x.value.toUpperCase()===w.charAt(k);
        x.classList.toggle('good',g);x.classList.toggle('bad',!g);
        if(!g)ok=false;
      });
      if(ok)solved();
      else{
        fails++;sfx.err();
        grp.classList.remove('shake');void grp.offsetWidth;grp.classList.add('shake');
        talk(fails>=2?'Почти! Найди в таблице число над красной клеточкой: нужная буква стоит прямо под ним.':'Не все буквы подошли. Красные клеточки проверь по таблице.','sad');
      }
    }
    function solved(){
      locked=true;
      ins.forEach(function(x){x.readOnly=true;});
      sfx.ok();
      var word=el('<div class="bword"></div>');
      WORDS[wi].split('').forEach(function(c,k){word.append(el('<span class="tile" style="--dl:'+(k*0.07)+'s">'+c+'</span>'));});
      $('#bn').append(word);
      burstAt(word,45);
      if(wi===0){
        talk('Первое слово готово: СЕЗАМ! Теперь второе, оно длиннее.','happy');
        wi=1;
        setTimeout(function(){buildWord(1);},900);
      }else{
        talk('Ты разгадал всё: «Сезам, откройся!» Хаос в шоке!','happy');
        setTimeout(function(){burstAt($('#bn'),90);},500);
        setTimeout(function(){reward(2);},2400);
      }
    }
    alpha.addEventListener('mousedown',function(e){e.preventDefault();});
    alpha.addEventListener('click',function(e){
      var b=e.target.closest('.ac');if(!b||locked)return;
      var k=cur;
      if(ins[k]&&ins[k].value&&ins.some(function(x){return !x.value;}))k=ins.findIndex(function(x){return !x.value;});
      put(k,b.getAttribute('data-c'));
    });
    buildWord(0);
  }


  /* ---------- mission 3: energy (batteries + station) ---------- */
  var G={w:6,h:5,start:[0,4],station:[5,0],rocks:[[1,3],[2,3],[3,1],[4,2],[1,1]],bats:[[0,2],[2,2],[4,1]]};
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
  function mission3(){
    go(3,'Миссия 3 из 5 · алгоритм · около 5 минут');
    var best=bestLen(),total=G.bats.length;
    var cells='';
    for(var y=0;y<G.h;y++)for(var x=0;x<G.w;x++){
      var inner='';
      if(isRock(x,y))inner=ROCK;
      else if(x===G.station[0]&&y===G.station[1])inner=STATION;
      else if(batAt(x,y)>-1)inner='<span class="bat">'+BATT+'</span>';
      cells+='<div class="cell '+((x+y)%2?'b':'a')+'">'+inner+'</div>';
    }
    mount('<section class="panel" style="--mc:var(--sky)">'+
      head('Миссия 3 из 5 · алгоритм','Зарядка героя','Герою нужна энергия. Составь программу из стрелок: пройди через все три батарейки и дойди до станции зарядки. Камни обходи. Потом нажми «Запустить». Стрелки можно нажимать и на клавиатуре.')+
      guide('Нажимай стрелки. Ошибся? Нажми на стрелку в программе, и она сотрётся.')+
      '<div class="m3">'+
        '<div class="board" id="bd">'+cells+'<div class="hero" id="hero">'+HERO+'</div></div>'+
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
    function showCount(){$('#bc').innerHTML='Батарейки: <b>'+got+' из '+total+'</b>';}
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
    function add(d){if(running||locked||prog.length>=40)return;prog.push(d);sfx.tap();render(-1,true);resetHero();}
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
    function finish(){locked=true;reward(3);}
    function success(){
      var n=prog.length,acts=$('#acts'),sc=cellAt(G.station[0],G.station[1]);
      locked=true;setBusy(true);
      hero.classList.add('cheer');sc.classList.add('charged','wob');
      sfx.win();burstAt(sc,90);
      if(n>best){
        talk('Герой заряжен! Но есть путь короче: всего '+best+' стрелок. Попробуешь?','happy');
        acts.innerHTML='<button type="button" class="btn sun" id="again">Попробовать короче</button><button type="button" class="btn ghost" id="keep">Оставить мой путь</button>';
        $('#again').addEventListener('click',function(){
          locked=false;setBusy(false);prog=[];hero.classList.remove('cheer');render();resetHero();
          acts.innerHTML='<button type="button" class="btn good" id="run2">Запустить</button><button type="button" class="btn ghost" id="undo2">Стереть последнюю</button><button type="button" class="btn ghost" id="clr2">Очистить</button>';
          $('#run2').addEventListener('click',run);$('#undo2').addEventListener('click',undo);$('#clr2').addEventListener('click',clear);
          talk('Давай короче! Подумай, где можно срезать путь.','think');
        });
        $('#keep').addEventListener('click',finish);
      }else{
        talk('Самый короткий путь! Всего '+n+' стрелок. Ты настоящий алгоритмист!','happy');
        acts.innerHTML='<button type="button" class="btn sun glow" id="take">Забрать кусочек пазла</button>';
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
          talk(got<total?'Батарейка! Ещё '+(total-got)+'.':'Все батарейки собраны! Теперь к станции.','happy');
        }
        if(chip)chip.classList.remove('now');
      }
      if(!alive)return;
      running=false;
      if(x===G.station[0]&&y===G.station[1]){
        if(got===total)success();
        else{talk('Станция найдена, но собрано только '+got+' из '+total+' батареек. Нужна энергия от всех! Измени программу.','sad');sfx.err();setBusy(false);}
      }else{talk('Программа закончилась, а до станции ещё далеко. Добавь стрелки!','think');setBusy(false);}
    }
    $('#run').addEventListener('click',run);
    render();resetHero();
  }

  /* ---------- mission 4: swipe true or false ---------- */
  function mission4(){
    go(4,'Миссия 4 из 5 · логика');
    var QS=[
      {t:'У компьютера есть клавиатура и мышь.',a:true},
      {t:'<mark>Все</mark> кошки умеют программировать.',a:false},
      {t:'<mark>Некоторые</mark> птицы умеют летать.',a:true},
      {t:'<mark>Ни один</mark> слон не поместится в школьный рюкзак.',a:true},
      {t:'<mark>Все</mark> рыбы живут на деревьях.',a:false}
    ];
    var i=0,busy=true,ready=false,dragging=false,sx=0,dx=0,alive=true,readyT=0;
    cleanups.push(function(){alive=false;clearTimeout(readyT);});
    mount('<section class="panel" style="--mc:var(--mint)">'+
      head('Миссия 4 из 5 · логика','Правда или ложь','Прочитай утверждение и реши, верное оно или нет. Слова «все», «некоторые» и «ни один» часто всё меняют, поэтому они выделены.')+
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
          if(i>=QS.length){stars();sfx.win();burstAt(deck,90);talk('Все пять правильно! Ты настоящий логик!','happy');setTimeout(function(){if(alive)reward(4);},1500);}
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

  /* ---------- mission 5: symmetry drawing ---------- */
  /* ---------- mission 5: symmetry drawing ---------- */
  var SW=480,SH=400,SMX=240;
  function rr(ctx,x,y,w,h,r){
    ctx.moveTo(x+r,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }
  /* левая половина робота: голова, ухо, туловище. fn() заливает или обводит путь */
  var RPARTS=[[110,92,130,140,30],[74,140,36,52,10],[140,248,100,100,22]];
  function wingPaths(ctx,fn,i){
    RPARTS.forEach(function(p,k){
      if(i!==undefined&&i!==k)return;
      ctx.beginPath();rr(ctx,p[0],p[1],p[2],p[3],p[4]);fn(k);
    });
  }
  function drawBody(ctx){
    ctx.save();
    ctx.fillStyle='#8CA3B0';ctx.fillRect(SMX-16,232,32,16);
    ctx.strokeStyle='#8CA3B0';ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(SMX,92);ctx.lineTo(SMX,52);ctx.stroke();
    ctx.fillStyle='#FFBF00';ctx.beginPath();ctx.arc(SMX,46,11,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawFace(ctx){
    ctx.save();
    ctx.fillStyle='#0B1620';ctx.beginPath();ctx.moveTo(150,125);ctx.lineTo(330,125);ctx.lineTo(330,200);ctx.lineTo(150,200);ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#3DDC97';[[200,155],[280,155]].forEach(function(e){ctx.beginPath();ctx.ellipse(e[0],e[1],11,15,0,0,Math.PI*2);ctx.fill();});
    ctx.strokeStyle='#3DDC97';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(214,182);ctx.quadraticCurveTo(SMX,198,266,182);ctx.stroke();
    ctx.restore();
  }
  function drawSample(cv){
    var ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.save();ctx.scale(cv.width/SW,cv.height/SH);
    ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,SW,SH);
    var COL=['#2D97FF','#FFBF00','#9966FF'];
    [0,1].forEach(function(m){
      ctx.save();
      if(m){ctx.translate(SW,0);ctx.scale(-1,1);}
      wingPaths(ctx,function(k){ctx.fillStyle=COL[k];ctx.fill();});
      ctx.restore();
    });
    drawBody(ctx);drawFace(ctx);
    ctx.restore();
  }
  function mission5(){
    go(5,'Миссия 5 из 5 · графика · около 4 минут');
    mount('<section class="panel" style="--mc:var(--berry)">'+
      head('Миссия 5 из 5 · графика','Волшебное зеркало','Лист разделён пунктирной линией, как зеркало. Рисуй на любой стороне, а вторая сторона нарисует то же самое наоборот. Это называется симметрия. Закрась робота, как на образце.')+
      guide('Закрась пунктирного робота: голову, ухо и туловище. Смотри, как рисует зеркало!')+
      '<div class="m5">'+
        '<div class="m5side"><p class="sub">Образец</p><canvas id="smp" class="smp" width="240" height="200" aria-label="Образец: симметричный робот"></canvas></div>'+
        '<div class="m5main">'+
          '<div class="sheet" id="sheet"><canvas id="gd" width="'+SW+'" height="'+SH+'"></canvas><canvas id="ink" width="'+SW+'" height="'+SH+'" aria-label="Лист для рисования"></canvas><span class="mdot" id="md"></span></div>'+
          '<div class="pal" id="pal" role="group" aria-label="Цвета"></div>'+
          '<div class="meter m5m"><i id="m5i"></i></div><p class="count" id="m5c"></p>'+
          '<div class="row"><button type="button" class="btn good" id="d5" disabled>Готово</button><button type="button" class="btn ghost" id="c5">Стереть всё</button></div>'+
        '</div>'+
      '</div>'+
    '</section>');
    drawSample($('#smp'));
    var gd=$('#gd'),ink=$('#ink'),g=gd.getContext('2d'),c=ink.getContext('2d'),md=$('#md');
    /* guide layer */
    g.fillStyle='#FFFFFF';g.fillRect(0,0,SW,SH);
    g.save();g.setLineDash([7,7]);g.strokeStyle='#9DB2C0';g.lineWidth=3;g.fillStyle='#F4F8FC';
    wingPaths(g,function(){g.fill();g.stroke();});g.restore();
    g.save();g.setLineDash([10,9]);g.strokeStyle='#E0407A';g.lineWidth=3;g.beginPath();g.moveTo(SMX,0);g.lineTo(SMX,SH);g.stroke();g.restore();
    drawBody(g);
    g.fillStyle='#8CA3B0';g.font='700 21px Source Sans 3,Arial,sans-serif';g.textAlign='center';
    g.fillText('рисуй здесь',SMX/2,SH-14);g.fillText('здесь появится отражение',SMX+SMX/2,SH-14);
    /* mask: wings, to measure */
    var mk=document.createElement('canvas');mk.width=SW;mk.height=SH;
    var mc2=mk.getContext('2d');mc2.fillStyle='#000';
    wingPaths(mc2,function(){mc2.fill();});
    var mdata=mc2.getImageData(0,0,SW,SH).data,wingN=0;
    for(var p=3;p<mdata.length;p+=4)if(mdata[p]>128&&((p>>2)%SW)<SMX)wingN++;
    var COLS=['#2D97FF','#FFBF00','#9966FF','#34C759','#FF6680'];
    var color=COLS[0],drawing=false,lx=0,ly=0,strokes=0,pct=0,done=false;
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
      if(done)return;
      e.preventDefault();
      try{ink.setPointerCapture(e.pointerId);}catch(err){}
      var q=pos(e);drawing=true;lx=q[0];ly=q[1];seg(lx,ly,lx,ly);dot(lx,ly);sfx.tap();
    });
    ink.addEventListener('pointermove',function(e){
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
      $('#m5c').textContent='Робот закрашен на '+pct+'%';
      $('#d5').disabled=pct<55;
      $('#d5').classList.toggle('glow',pct>=55);
      if(strokes===1)talk('Видишь? Зеркало рисует то же самое с другой стороны!','happy');
    }
    $('#c5').addEventListener('click',function(){
      if(done)return;
      c.clearRect(0,0,SW,SH);strokes=0;measure();$('#m5c').textContent='Лист чистый. Рисуй!';sfx.tap();talk('Лист чистый. Начни заново!','think');
    });
    $('#d5').addEventListener('click',function(){
      if(done)return;
      var r=counts();
      if(r.ink>0&&r.out/r.ink>0.4){
        sfx.err();talk('Много краски вышло за пунктир. Нажми «Стереть всё» и рисуй точнее, внутри пунктирного робота.','sad');return;
      }
      done=true;sfx.win();
      drawFace(c);  /* лицо робота появляется само */
      burstAt($('#sheet'),100);
      talk('Отличный робот! Обе половинки одинаковые, это и есть симметрия.','happy');
      $('#d5').disabled=true;$('#c5').disabled=true;
      setTimeout(function(){reward(5);},2400);
    });
    cleanups.push(function(){done=true;});
    measure();$('#m5c').textContent='Робот закрашен на 0%';
  }

  /* ---------- puzzle assembly ---------- */
  function shuffle(a){
    a=a.slice();
    for(var k=a.length-1;k>0;k--){var j=Math.floor(Math.random()*(k+1));var t=a[k];a[k]=a[j];a[j]=t;}
    return a;
  }
  function puzzle(){
    go('puzzle','Финал · пазл · около 2 минут');
    var order;
    do{order=shuffle([0,1,2,3,4]);}while(order.join()==='0,1,2,3,4');
    var slotsHtml=PIECES.map(function(p,i){
      return '<button type="button" class="pzslot" data-i="'+i+'" aria-label="Место '+(i+1)+'" style="left:'+(p[0]/3)+'%;top:'+(p[1]/3)+'%;width:'+(p[2]/3)+'%;height:'+(p[3]/3)+'%"></button>';
    }).join('');
    mount('<section class="panel" style="--mc:var(--sun)">'+
      head('Финал · пазл','Сложи картинку','Перетащи кусочки на свои места. Нужное место подскажет картинка-тень. Её можно включить кнопкой «Подсказка». Можно и нажимать: сначала на кусочек, потом на место.')+
      guide('Все пять кусочков у тебя. Давай сложим картинку!')+
      '<div class="pzframe" id="fr"><div class="pzghost" id="gh">'+algoSVG('algo')+'</div>'+slotsHtml+'</div>'+
      '<div><p class="sub">Твои кусочки</p><div class="pztray" id="tr"></div></div>'+
      '<div class="row" id="pzrow"><button type="button" class="btn ghost" id="hn">Подсказка</button></div>'+
    '</section>');
    var fr=$('#fr'),tr=$('#tr'),sel=-1,drag=null,placed=0,fin=false,alive=true;
    cleanups.push(function(){alive=false;endDrag();});
    tr.innerHTML=order.map(function(i){return '<button type="button" class="pc" data-i="'+i+'" aria-label="Кусочек пазла">'+pieceSVG(i)+'</button>';}).join('');
    function tryPlace(i,slotEl){
      if(fin||slotEl.classList.contains('ok'))return false;
      var s=+slotEl.getAttribute('data-i');
      if(s===i){
        slotEl.classList.add('ok');slotEl.innerHTML=pieceSVG(i,true);slotEl.disabled=true;
        var pc=tr.querySelector('.pc[data-i="'+i+'"]');if(pc)pc.remove();
        sel=-1;placed++;sfx.ok();burstAt(slotEl,22);
        talk(placed<5?'Кусочек встал на место! Осталось '+(5-placed)+'.':'Пазл собран!','happy');
        if(placed===5)complete();
        return true;
      }
      sfx.err();
      slotEl.classList.remove('nope');void slotEl.offsetWidth;slotEl.classList.add('nope');
      talk('Не тот кусочек. Посмотри на цвета и линии. Можно включить подсказку.','sad');
      return false;
    }
    function complete(){
      fin=true;fr.classList.add('done');
      $('#hn').remove();
      setTimeout(function(){
        if(!alive)return;
        burstAt(fr,110);sfx.win();
        talk('Получилась программа героя! Её нужно повторить в Scratch, и сундук откроется.','happy');
        $('#pzrow').innerHTML='<button type="button" class="btn sun glow" id="tochest">К сундуку</button>';
        var b=$('#tochest');b.addEventListener('click',function(){sfx.tap();finale();});b.focus();
      },600);
    }
    $('#hn').addEventListener('click',function(){
      var on=$('#gh').classList.toggle('on');sfx.tap();
      talk(on?'Серая картинка — это подсказка. Ищи нужный кусочек.':'Подсказка выключена.','think');
    });
    function selectPiece(i){
      sel=sel===i?-1:i;
      $$('.pc',tr).forEach(function(p){p.classList.toggle('sel',+p.getAttribute('data-i')===sel);});
      sfx.tap();
    }
    function endDrag(){
      document.removeEventListener('pointermove',onMove);
      document.removeEventListener('pointerup',onUp);
      document.removeEventListener('pointercancel',onCancel);
      if(drag&&drag.ghost)drag.ghost.remove();
      if(drag)drag.src.classList.remove('lifting');
      $$('.pzslot.over').forEach(function(s){s.classList.remove('over');});
    }
    function onDown(e){
      var pc=e.target.closest('.pc');
      if(!pc||fin||(e.button&&e.button>0))return;
      var r=pc.getBoundingClientRect();
      drag={i:+pc.getAttribute('data-i'),x0:e.clientX,y0:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,moved:false,ghost:null,src:pc};
      document.addEventListener('pointermove',onMove);
      document.addEventListener('pointerup',onUp);
      document.addEventListener('pointercancel',onCancel);
    }
    function onMove(e){
      if(!drag)return;
      if(!drag.moved&&Math.abs(e.clientX-drag.x0)+Math.abs(e.clientY-drag.y0)>8){
        drag.moved=true;
        drag.ghost=el('<div class="dragghost pzdrag">'+pieceSVG(drag.i)+'</div>');
        document.body.appendChild(drag.ghost);drag.src.classList.add('lifting');
      }
      if(drag.moved){
        drag.ghost.style.transform='translate('+(e.clientX-drag.ox)+'px,'+(e.clientY-drag.oy)+'px) rotate(-3deg)';
        $$('.pzslot.over').forEach(function(s){s.classList.remove('over');});
        var t=document.elementFromPoint(e.clientX,e.clientY),s=t&&t.closest&&t.closest('.pzslot');
        if(s&&!s.classList.contains('ok'))s.classList.add('over');
      }
    }
    function onUp(e){
      if(!drag)return;
      var d=drag;
      var t=document.elementFromPoint(e.clientX,e.clientY),s=t&&t.closest&&t.closest('.pzslot');
      endDrag();drag=null;
      if(!d.moved){selectPiece(d.i);return;}
      if(s)tryPlace(d.i,s);
    }
    function onCancel(){endDrag();drag=null;}
    stage.addEventListener('pointerdown',onDown);
    cleanups.push(function(){stage.removeEventListener('pointerdown',onDown);});
    function onClick(e){
      var s=e.target.closest('.pzslot');
      if(s){
        if(s.disabled)return;
        if(sel>-1)tryPlace(sel,s);else talk('Сначала нажми на кусочек внизу, потом на место.','think');
        return;
      }
      var pc=e.target.closest('.pc');
      if(pc&&e.detail===0)selectPiece(+pc.getAttribute('data-i'));
    }
    stage.addEventListener('click',onClick);
    cleanups.push(function(){stage.removeEventListener('click',onClick);});
  }

  /* ---------- finale ---------- */
  function finale(){
    go('done','Пазл собран! Осталось открыть сундук в Scratch.');
    var mins=Math.max(1,Math.round((Date.now()-S.t0)/60000));
    var today=new Date().toLocaleDateString('ru-RU');
    var url=SCRATCH_URL||'https://scratch.mit.edu/projects/1396188075/editor/';
    mount('<section class="panel" style="--mc:var(--sun)">'+
      '<div class="stage-fin"><button type="button" class="chestwrap locked" id="cw" aria-label="Сундук заперт. Нажми на него.">'+chestLockedSVG()+'</button></div>'+
      '<header class="ph"><p class="tag">Пазл собран</p><h2>Агент '+esc(S.name)+', картинка готова!</h2><p>Все пять миссий пройдены за '+mins+' мин. Но сундук всё ещё заперт: Хаос заколдовал замок. Открыть его сможет только программа в Scratch. А она нарисована на твоей картинке.</p></header>'+
      guide('Нажми на сундук и попробуй открыть его. Не получится! Нужна твоя программа.')+
      '<div class="mapcard"><span class="lbl">Программа героя</span><div class="algobox">'+algoSVG('algo big')+'</div></div>'+
      '<ol class="steps">'+
        '<li>Нажми «Открыть заготовку». В ней уже есть герой, сундук и волшебный салют. Но программа героя пока пустая.</li>'+
        '<li>Собери в Scratch такие же блоки, как на картинке, в таком же порядке. Жёлтый блок «когда флажок нажат» ищи в группе «События», синий «идти» в «Движении», а фиолетовые «говорить» и «следующий костюм» во «Внешности».</li>'+
        '<li>Нажми на зелёный флажок. Герой дойдёт до сундука, скажет «Сезам, откройся!» и сколдует.</li>'+
        '<li>Если всё сделано верно, сундук откроется и начнётся салют!</li>'+
      '</ol>'+
      '<div class="row"><a class="btn sun glow" href="'+esc(url)+'" target="_blank" rel="noopener">Открыть Scratch</a></div>'+
      (SCRATCH_URL?'':'<p class="hint" style="text-align:left"> </p>')+
      '<div class="idcard"><div class="idtop">Удостоверение юного айтишника</div><div class="idbody"><div class="idphoto">'+mascotSVG()+'</div><div class="idinfo"><span class="idlbl">Позывной</span><span class="idname">'+esc(S.name)+'</span><span class="idlbl">Задание</span><span>Пазл собран за '+mins+' мин</span><span class="idlbl">Дата</span><span>'+esc(today)+'</span></div></div><div class="idstripe"></div></div>'+
      
    '</section>');
    var cw=$('#cw');
    cw.addEventListener('click',function(){
      sfx.err();
      cw.classList.remove('try');void cw.offsetWidth;cw.classList.add('try');
      talk(pick(['Заперто! Хаос заколдовал замок.','Не открывается. Нужна программа в Scratch!','Замок держится крепко. Собери программу, и он сдастся.']),'sad');
    });
    mood('happy');sfx.win();
    setTimeout(function(){burstAt($('.stage-fin'),110);},350);
    setTimeout(function(){burstAt($('.mapcard'),70);},1500);
  }

  NEXT={1:mission2,2:mission3,3:mission4,4:mission5,5:puzzle};

  /* ---------- teacher panel ---------- */
  var JUMP={intro:showIntro,'1':mission1,'2':mission2,'3':mission3,'4':mission4,'5':mission5,puz:puzzle,fin:finale};
  $$('[data-jump]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-jump');
      if(k==='reset'){S.name='';S.got=[];S.t0=0;showIntro();return;}
      if(!S.t0)S.t0=Date.now();
      if(!S.name)S.name='Агент';
      if(k==='puz'||k==='fin'){S.got=['p1','p2','p3','p4','p5'];}
      JUMP[k]();
    });
  });

  showIntro();
})();
