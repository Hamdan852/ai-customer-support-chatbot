/* Hamdan AI embeddable website widget.
   Usage: <script src="https://YOUR-HAMDAN-DOMAIN/widget.js" data-business-id="YOUR_BUSINESS_ID"></script>
   The widget uses an iframe so the customer's site stays isolated from the assistant UI. */
(function(){
  const script=document.currentScript;
  if(!script) return;
  const base=new URL(script.src,window.location.href).origin;
  const businessId=script.dataset.businessId||'demo-business';
  const mode=script.dataset.mode||'support';
  const button=document.createElement('button');
  button.type='button'; button.setAttribute('aria-label','Open AI assistant');
  button.textContent='💬';
  Object.assign(button.style,{position:'fixed',right:'20px',bottom:'20px',width:'58px',height:'58px',border:0,borderRadius:'50%',background:'#2563eb',color:'#fff',fontSize:'25px',boxShadow:'0 8px 24px rgba(16,24,40,.22)',cursor:'pointer',zIndex:'2147483646'});
  const frame=document.createElement('iframe');
  frame.title='Hamdan AI Assistant'; frame.src=base+'/widget.html?businessId='+encodeURIComponent(businessId)+'&mode='+encodeURIComponent(mode);
  Object.assign(frame.style,{position:'fixed',right:'20px',bottom:'88px',width:'min(390px,calc(100vw - 28px))',height:'min(680px,calc(100vh - 120px))',border:'1px solid #e4e7ec',borderRadius:'18px',background:'#fff',boxShadow:'0 20px 50px rgba(16,24,40,.22)',display:'none',zIndex:'2147483645'});
  button.onclick=function(){const open=frame.style.display==='block';frame.style.display=open?'none':'block';button.textContent=open?'💬':'×';};
  document.body.appendChild(frame);document.body.appendChild(button);
})();
