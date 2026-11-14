(function(){
  var btn=document.getElementById('copy'),status=document.getElementById('status'),box=document.getElementById('prompt');
  function select(){var r=document.createRange();r.selectNodeContents(box);var s=getSelection();s.removeAllRanges();s.addRange(r)}
  function ok(){btn.textContent='Copied';btn.classList.add('done');status.textContent='Now paste it into your AI tool.';setTimeout(function(){btn.textContent='Copy prompt';btn.classList.remove('done')},2500)}
  function fail(){select();status.textContent='Could not copy automatically. The text is selected: press Ctrl+C (Cmd+C on Mac).'}
  function legacy(){try{select();return document.execCommand('copy')}catch(e){return false}}
  btn.addEventListener('click',function(){
    var t=box.textContent.trim();
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,function(){legacy()?ok():fail()})}
    else{legacy()?ok():fail()}
  });
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.05});
  els.forEach(function(e){io.observe(e)});
})();
