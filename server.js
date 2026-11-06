const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const server=http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(html)});
const wss=new WebSocketServer({server});
const P=new Map(); let nid=1, score=[0,0]; const WIN=30, MAX=8;
const spawn=t=>({x:(Math.random()-.5)*20, z:t?-35:35});
const send=(ws,o)=>{if(ws.readyState===1)ws.send(JSON.stringify(o))};
const all=o=>P.forEach((p,ws)=>send(ws,o));
wss.on('connection',ws=>{
  if(P.size>=MAX){ws.close();return}
  const c=[0,0];P.forEach(p=>c[p.team]++);
  const team=c[0]<=c[1]?0:1, sp=spawn(team);
  const p={id:nid++,team,x:sp.x,y:1.6,z:sp.z,ry:0,rx:0,hp:100,k:0,d:0,dead:0,last:0,name:'P'+nid};
  P.set(ws,p);
  send(ws,{t:'init',id:p.id,team,x:p.x,z:p.z});
  ws.on('message',m=>{
    let d;try{d=JSON.parse(m)}catch{return}
    if(d.t==='name')p.name=String(d.n||'').slice(0,12)||p.name;
    else if(d.t==='move'&&!p.dead){p.x=+d.x;p.y=+d.y;p.z=+d.z;p.ry=+d.ry}
    else if(d.t==='hit'&&!p.dead){
      const now=Date.now(); if(now-p.last<90)return; p.last=now;
      let tw,tg;P.forEach((q,w)=>{if(q.id===d.id){tg=q;tw=w}});
      if(!tg||tg.dead||tg.team===p.team)return;
      tg.hp-=25;
      if(tg.hp<=0){
        tg.dead=1;tg.d++;p.k++;score[p.team]++;
        all({t:'kill',a:p.name,b:tg.name});
        setTimeout(()=>{const s=spawn(tg.team);tg.x=s.x;tg.z=s.z;tg.y=1.6;tg.hp=100;tg.dead=0;send(tw,{t:'respawn',x:s.x,z:s.z})},3000);
        if(score[p.team]>=WIN){all({t:'win',team:p.team});score=[0,0];P.forEach(q=>{q.k=0;q.d=0})}
      }
    }
  });
  ws.on('close',()=>P.delete(ws));
});
setInterval(()=>all({t:'s',s:score,p:[...P.values()].map(({id,team,x,y,z,ry,hp,k,d,dead,name})=>({id,team,x,y,z,ry,hp,k,d,dead,name}))}),50);
server.listen(process.env.PORT||3000,()=>console.log('listening'));
