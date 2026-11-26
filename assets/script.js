(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  function css(n){return getComputedStyle(root).getPropertyValue(n).trim()}
  var recolor=function(){};

  /* dark-theme interaction shine */
  var shine=document.getElementById('shine'),lastScrollShine=0;
  function shineAt(x,y){
    if(reduce||css('--bg')!=='#060715')return;
    shine.style.setProperty('--shine-x',x+'px');
    shine.style.setProperty('--shine-y',y+'px');
    shine.classList.remove('active');
    void shine.offsetWidth;
    shine.classList.add('active');
  }
  document.addEventListener('click',function(event){
    var x=event.clientX,y=event.clientY;
    if(x===0&&y===0&&event.target.closest){
      var target=event.target.closest('button,a');
      if(target){var bounds=target.getBoundingClientRect();x=bounds.left+bounds.width/2;y=bounds.top+bounds.height/2}
    }
    shineAt(x,y);
  });
  addEventListener('scroll',function(){
    var now=Date.now();
    if(now-lastScrollShine<650)return;
    lastScrollShine=now;
    shineAt(innerWidth/2,innerHeight*.45);
  },{passive:true});

  /* status ticker */
  var st=['AI agent online','Reviewing pull requests','Tuning a Postgres query','Shipping to AWS'],si=0,sEl=document.getElementById('status');
  if(!reduce)setInterval(function(){si=(si+1)%st.length;sEl.textContent=st[si]},2600);

  /* Gemini portfolio assistant */
  var out=document.getElementById('out'),quickQuestions=document.querySelectorAll('.chips button'),timer;
  var assistantForm=document.getElementById('assistant-form'),questionInput=document.getElementById('assistant-question');
  var askButton=assistantForm.querySelector('button[type="submit"]');
  var voiceStatus=document.getElementById('voice-status');
  var voiceQuestionButton=document.getElementById('voice-question');
  var voiceCommandButton=document.getElementById('voice-command');
  var voiceRepliesButton=document.getElementById('voice-replies');
  var Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  var canSpeak=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
  var recognition=null,recognitionMode='navigation',receivedCommand=false,isListening=false,isAsking=false;
  var voiceRepliesEnabled=false,chatHistory=[];
  function setVoiceStatus(message){voiceStatus.textContent=message}
  function syncVoiceButtons(){
    var disabled=isAsking||isListening||!Recognition;
    voiceQuestionButton.disabled=disabled;
    voiceCommandButton.disabled=disabled;
  }
  function displayAnswer(text){
    clearInterval(timer);
    if(reduce){out.textContent=text;return}
    out.textContent='';
    var position=0;
    timer=setInterval(function(){
      position+=4;
      out.textContent=text.slice(0,position);
      if(position>=text.length)clearInterval(timer);
    },12);
  }
  function speakAnswer(text){
    if(!voiceRepliesEnabled||!canSpeak)return;
    window.speechSynthesis.cancel();
    var utterance=new SpeechSynthesisUtterance(text);
    utterance.lang='en-US';
    utterance.onerror=function(){setVoiceStatus('The answer is shown above, but speech playback failed.')};
    window.speechSynthesis.speak(utterance);
  }
  async function askGemini(question){
    if(isAsking)return;
    isAsking=true;
    questionInput.disabled=true;
    askButton.disabled=true;
    quickQuestions.forEach(function(button){button.disabled=true});
    out.setAttribute('aria-busy','true');
    out.textContent='Gemini is thinking…';
    setVoiceStatus('Sending your question to Gemini…');
    syncVoiceButtons();
    try{
      var response=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:question,history:chatHistory})
      });
      var payload;
      try{payload=await response.json()}
      catch{throw new Error('The assistant server returned an invalid response.')}
      if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:'Gemini could not answer this question.');
      if(typeof payload.answer!=='string'||!payload.answer.trim())throw new Error('Gemini returned an empty answer. Please try again.');
      chatHistory.push({role:'user',text:question},{role:'model',text:payload.answer});
      chatHistory=chatHistory.slice(-10);
      displayAnswer(payload.answer);
      setVoiceStatus(voiceRepliesEnabled?'Gemini replied. Playing the answer aloud.':'Gemini replied.');
      speakAnswer(payload.answer);
    }catch(error){
      console.error('Gemini assistant request failed:',error);
      var message=error instanceof TypeError?'Could not reach the assistant server. Make sure the Node.js server is running.':error.message;
      displayAnswer(message);
      setVoiceStatus(message);
    }finally{
      isAsking=false;
      questionInput.disabled=false;
      askButton.disabled=false;
      quickQuestions.forEach(function(button){button.disabled=false});
      out.setAttribute('aria-busy','false');
      syncVoiceButtons();
    }
  }
  quickQuestions.forEach(function(button){
    button.addEventListener('click',function(){
      quickQuestions.forEach(function(item){item.setAttribute('aria-pressed',item===button?'true':'false')});
      var question=button.textContent.trim();
      questionInput.value=question;
      askGemini(question);
    });
  });
  assistantForm.addEventListener('submit',function(event){
    event.preventDefault();
    var question=questionInput.value.trim();
    if(!question){questionInput.setCustomValidity('Enter a question to continue.');questionInput.reportValidity();return}
    questionInput.setCustomValidity('');
    quickQuestions.forEach(function(button){button.setAttribute('aria-pressed','false')});
    askGemini(question);
  });
  questionInput.addEventListener('input',function(){this.setCustomValidity('')});

  if(canSpeak){
    voiceRepliesButton.addEventListener('click',function(){
      voiceRepliesEnabled=!voiceRepliesEnabled;
      voiceRepliesButton.setAttribute('aria-pressed',voiceRepliesEnabled?'true':'false');
      voiceRepliesButton.textContent='Voice replies: '+(voiceRepliesEnabled?'on':'off');
      if(!voiceRepliesEnabled)window.speechSynthesis.cancel();
      setVoiceStatus('Spoken replies are '+(voiceRepliesEnabled?'on.':'off.'));
    });
  }else{
    voiceRepliesButton.disabled=true;
    voiceRepliesButton.title='Speech playback is not supported in this browser.';
  }

  if(Recognition){
    recognition=new Recognition();
    recognition.lang='en-US';
    recognition.continuous=false;
    recognition.interimResults=false;
    var destinations=[
      {id:'about',label:'About',terms:['about','profile']},
      {id:'skills',label:'Skills',terms:['skill','skills','technology']},
      {id:'education',label:'Education',terms:['education','study','studies']},
      {id:'projects',label:'Projects',terms:['project','projects','portfolio']},
      {id:'experience',label:'Experience',terms:['experience','work','career']},
      {id:'certificates',label:'Licenses and certificates',terms:['certificate','certificates','certification','license']},
      {id:'codevita',label:'CodeVita',terms:['codevita']},
      {id:'hackathon',label:'HackerRank',terms:['hackerrank','hacker rank']},
      {id:'assistant',label:'Profile assistant',terms:['assistant','ask my profile']},
      {id:'social',label:'Social links',terms:['contact','social','connect','email']}
    ];
    recognition.onstart=function(){
      receivedCommand=false;
      isListening=true;
      voiceQuestionButton.setAttribute('aria-pressed',recognitionMode==='question'?'true':'false');
      voiceCommandButton.setAttribute('aria-pressed',recognitionMode==='navigation'?'true':'false');
      syncVoiceButtons();
      setVoiceStatus(recognitionMode==='question'?'Listening for your question…':'Listening for a navigation command…');
    };
    recognition.onresult=function(event){
      receivedCommand=true;
      var transcript=event.results[0][0].transcript.trim();
      if(recognitionMode==='question'){
        if(!transcript){setVoiceStatus('No question was recognized. Try again.');return}
        questionInput.value=transcript;
        questionInput.setCustomValidity('');
        quickQuestions.forEach(function(button){button.setAttribute('aria-pressed','false')});
        askGemini(transcript);
        return;
      }
      var normalized=transcript.toLowerCase();
      var destination=null;
      for(var i=0;i<destinations.length&&!destination;i++){
        for(var j=0;j<destinations[i].terms.length;j++){
          if(normalized.indexOf(destinations[i].terms[j])!==-1){
            destination=destinations[i];
            break;
          }
        }
      }
      if(destination){
        document.getElementById(destination.id).scrollIntoView({behavior:reduce?'auto':'smooth'});
        setVoiceStatus('Heard “'+transcript+'”. Showing '+destination.label+'.');
      }else{
        setVoiceStatus('Heard “'+transcript+'”. Try saying “show projects”, “skills”, or “contact”.');
      }
    };
    recognition.onerror=function(event){
      var messages={
        'not-allowed':'Microphone access was denied. Allow microphone access to use voice input.',
        'service-not-allowed':'The browser blocked its speech recognition service.',
        'no-speech':'No speech was detected. Try again.',
        'audio-capture':'No microphone was found.',
        'network':'The speech recognition service could not connect.'
      };
      setVoiceStatus(messages[event.error]||'Voice input error: '+event.error+'.');
    };
    recognition.onend=function(){
      isListening=false;
      voiceQuestionButton.setAttribute('aria-pressed','false');
      voiceCommandButton.setAttribute('aria-pressed','false');
      syncVoiceButtons();
      if(!receivedCommand&&voiceStatus.textContent.indexOf('Listening for')===0){
        setVoiceStatus('Voice listening ended. Start voice input to try again.');
      }
    };
    function startListening(mode){
      if(isAsking||isListening)return;
      recognitionMode=mode;
      setVoiceStatus('Requesting microphone access…');
      try{recognition.start()}
      catch(error){
        setVoiceStatus('Could not start voice input: '+error.message);
      }
    }
    voiceQuestionButton.addEventListener('click',function(){startListening('question')});
    voiceCommandButton.addEventListener('click',function(){startListening('navigation')});
  }else{
    voiceQuestionButton.disabled=true;
    voiceCommandButton.disabled=true;
    voiceQuestionButton.title='Speech recognition is not supported in this browser.';
    voiceCommandButton.title='Speech recognition is not supported in this browser.';
    setVoiceStatus('Voice input is not supported in this browser. You can still chat by typing.');
  }

  /* card tilt */
  if(!reduce){
    document.querySelectorAll('.tilt').forEach(function(c){
      c.addEventListener('pointermove',function(e){
        var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
        c.style.transform='perspective(800px) rotateY('+(x*9)+'deg) rotateX('+(-y*9)+'deg)';
      });
      c.addEventListener('pointerleave',function(){c.style.transform=''});
    });
  }

  /* scroll progress on the powerline */
  var fill=document.getElementById('fill'),sy=0;
  function prog(){sy=scrollY/Math.max(1,document.body.scrollHeight-innerHeight);fill.style.height=(sy*100)+'%'}
  addEventListener('scroll',prog,{passive:true});prog();

  /* 3D neural network and floating AI robot */
  try{
    var cv=document.getElementById('bg');
    var R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
    R.setPixelRatio(Math.min(devicePixelRatio,2));
    var S=new THREE.Scene(),C=new THREE.PerspectiveCamera(50,1,.1,100);C.position.z=11;

    var G=new THREE.Group();S.add(G);
    var layers=[4,7,8,6,3],nodes=[],byL=[];
    layers.forEach(function(n,li){byL[li]=[];for(var i=0;i<n;i++){var p=new THREE.Vector3((li-2)*2.6,(i-(n-1)/2)*1.25+(Math.random()-.5)*.5,(Math.random()-.5)*3.4-2);nodes.push(p);byL[li].push(p)}});
    var edges=[],ep=[];
    for(var l=0;l<layers.length-1;l++)byL[l].forEach(function(a){byL[l+1].forEach(function(b){if(Math.random()<.55){edges.push([a,b]);ep.push(a.x,a.y,a.z,b.x,b.y,b.z)}})});
    var eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(ep,3));
    var em=new THREE.LineBasicMaterial({transparent:true,opacity:.3});G.add(new THREE.LineSegments(eg,em));
    var np=[];nodes.forEach(function(p){np.push(p.x,p.y,p.z)});
    var ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.Float32BufferAttribute(np,3));
    var nm=new THREE.PointsMaterial({size:.24,transparent:true,opacity:.85});G.add(new THREE.Points(ng,nm));
    var pulses=[];for(var k=0;k<26;k++)pulses.push({e:Math.floor(Math.random()*edges.length),t:Math.random(),s:.004+Math.random()*.008});
    var pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(pulses.length*3),3));
    var pm=new THREE.PointsMaterial({size:.3,transparent:true});G.add(new THREE.Points(pg,pm));

    /* robot */
    var Rb=new THREE.Group(),head=new THREE.Group();S.add(Rb);Rb.add(head);head.position.y=1;
    var mBody=new THREE.MeshStandardMaterial({color:0xe6e9ff,metalness:.5,roughness:.35});
    var mDark=new THREE.MeshStandardMaterial({color:0x0b0c22,metalness:.8,roughness:.2});
    var gB=new THREE.MeshBasicMaterial({color:0x6fe3ff}),gA=new THREE.MeshBasicMaterial({color:0x8f82ff});
    function M(g,m,x,y,z,par){var o=new THREE.Mesh(g,m);o.position.set(x||0,y||0,z||0);(par||Rb).add(o);return o}
    M(new THREE.BoxGeometry(1.7,1.25,1.4),mBody,0,0,0,head);
    M(new THREE.BoxGeometry(1.4,.62,.12),mDark,0,.05,.7,head);
    var eyeL=M(new THREE.BoxGeometry(.3,.16,.05),gB,-.34,.07,.77,head),eyeR=M(new THREE.BoxGeometry(.3,.16,.05),gB,.34,.07,.77,head);
    M(new THREE.BoxGeometry(.5,.04,.03),gA,0,-.38,.71,head);
    [-1,1].forEach(function(s){var e=M(new THREE.CylinderGeometry(.24,.24,.22,28),mBody,s*.95,0,0,head);e.rotation.z=Math.PI/2;var c=M(new THREE.CylinderGeometry(.12,.12,.24,20),gA,s*.95,0,0,head);c.rotation.z=Math.PI/2});
    M(new THREE.CylinderGeometry(.04,.04,.5,10),mBody,0,.85,0,head);M(new THREE.SphereGeometry(.11,16,16),gA,0,1.15,0,head);
    M(new THREE.CylinderGeometry(.22,.28,.3,20),mDark,0,.22);
    M(new THREE.CylinderGeometry(.6,.85,1.05,32),mBody,0,-.5);
    M(new THREE.SphereGeometry(.15,16,16),gB,0,-.28,.62);
    [-1,1].forEach(function(s){M(new THREE.SphereGeometry(.3,20,20),mBody,s*1,-.1);M(new THREE.CylinderGeometry(.14,.11,.85,16),mBody,s*1.12,-.6);M(new THREE.SphereGeometry(.18,16,16),mDark,s*1.12,-1.08)});
    var halo=M(new THREE.TorusGeometry(1.95,.025,8,90),gA,0,-.1);halo.rotation.x=Math.PI/2.2;
    var halo2=M(new THREE.TorusGeometry(2.3,.015,8,90),gB,0,-.1);halo2.rotation.x=Math.PI/1.8;
    S.add(new THREE.AmbientLight(0xffffff,.65));
    var dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(3,5,6);S.add(dl);
    var pl=new THREE.PointLight(0x6fe3ff,1.2,30);pl.position.set(-4,2,5);S.add(pl);

    recolor=function(){
      nm.color.set(css('--node'));em.color.set(css('--edge'));pm.color.set(css('--pulse'));
      gB.color.set(css('--b'));gA.color.set(css('--a'));pl.color.set(css('--b'));
      mBody.color.set(css('--bg')==='#060715'?0xe6e9ff:0xc9cdea);
    };
    recolor();
    var mx=0,my=0,wide=true,robotX=1;
    addEventListener('pointermove',function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5});
    function size(){
      var w=innerWidth,h=innerHeight;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();
      wide=w>860;robotX=wide?Math.max(2.6,11*Math.tan(25*Math.PI/180)*C.aspect-2.1):1;G.position.x=wide?-1.5:0;G.scale.setScalar(wide?1.15:.8);
      Rb.scale.setScalar(wide?1:.55);
    }
    addEventListener('resize',size);size();
    var ang=0,t0=0,blink=0;
    function frame(ts){
      var t=ts/1000;
      if(!reduce)ang+=.0014;
      G.rotation.y=ang+mx*.4-.4+sy*1.4;G.rotation.x=my*.25+sy*.25;
      var bx=robotX,by=wide?.1:3.2;
      Rb.position.x=bx+(reduce?0:Math.sin(t*.42)*.45);
      Rb.position.y=by+(reduce?0:Math.cos(t*.7)*.28);
      Rb.rotation.z=reduce?0:Math.sin(t*.55)*.045;
      Rb.visible=true;
      if(!reduce){
        head.rotation.y+=(mx*.9-head.rotation.y)*.08;
        head.rotation.x+=(my*.6-head.rotation.x)*.08;
      }
      Rb.rotation.y=(wide?-.25:0)+(reduce?0:Math.sin(t*.38)*.14);
      if(!reduce){halo.rotation.z=t*.5;halo2.rotation.z=-t*.35}
      if(!reduce){blink=(t%4)<.14?.1:1}else blink=1;
      eyeL.scale.y=eyeR.scale.y=blink;
      var pos=pg.attributes.position;
      pulses.forEach(function(p,i){
        if(!reduce){p.t+=p.s;if(p.t>1){p.t=0;p.e=Math.floor(Math.random()*edges.length)}}
        var e=edges[p.e];
        pos.setXYZ(i,e[0].x+(e[1].x-e[0].x)*p.t,e[0].y+(e[1].y-e[0].y)*p.t,e[0].z+(e[1].z-e[0].z)*p.t);
      });
      pos.needsUpdate=true;
      R.render(S,C);requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }catch(err){document.getElementById('bg').style.display='none'}
})();
