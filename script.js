(function(){
  var btn=document.getElementById('copy'),label=document.getElementById('copylabel'),status=document.getElementById('status'),box=document.getElementById('prompt');
  function select(){var r=document.createRange();r.selectNodeContents(box);var s=getSelection();s.removeAllRanges();s.addRange(r)}
  function ok(){label.textContent='Copied';btn.classList.add('done');status.textContent='Now paste it into your AI tool.';setTimeout(function(){label.textContent='Copy prompt';btn.classList.remove('done')},2500)}
  function fail(){select();status.textContent='Could not copy automatically. The text is selected: press Ctrl+C (Cmd+C on Mac).'}
  function legacy(){try{select();return document.execCommand('copy')}catch(e){return false}}
  btn.addEventListener('click',function(){
    var t=box.textContent.trim();
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,function(){legacy()?ok():fail()})}
    else{legacy()?ok():fail()}
  });
  var root=document.documentElement,mo=root.classList.contains('mo');
  function onView(el,cb,th){
    if(!mo||!('IntersectionObserver' in window)){cb();return}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){cb();io.unobserve(e.target)}})},{threshold:th});
    io.observe(el);
  }
  if(mo){
    var hero=document.querySelector('.hero');
    requestAnimationFrame(function(){requestAnimationFrame(function(){hero.classList.add('go')})});
    document.querySelectorAll('.rv').forEach(function(e){onView(e,function(){e.classList.add('in')},.05)});
    document.querySelectorAll('[data-stagger]').forEach(function(g){
      var kids=[].slice.call(g.children);
      kids.forEach(function(c,i){c.classList.add('rv');c.style.setProperty('--i',i)});
      onView(g,function(){kids.forEach(function(c){c.classList.add('in')})},.05);
    });
    var sh=document.getElementById('shelves'),st=document.getElementById('steps');
    onView(sh,function(){sh.classList.add('in')},.6);
    onView(st,function(){st.classList.add('in')},.35);
  }
})();
