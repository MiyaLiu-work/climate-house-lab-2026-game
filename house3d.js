// 3D house for the build stage (Three.js r149, bundled locally in vendor/).
// House3D.create(stage) returns {update(climateId, partIds)} or null when WebGL is unavailable,
// in which case the game keeps the original 2D house.
(function(){
'use strict';
const T=window.THREE;
const W=6,D=4.4,H=2.5;            // wall width (x), depth (z), height
const INK=0x173c3b;

const GROUND={humid:0x9fcf8f,dry:0xe4c48e,cold:0xeef3f6,rainy:0x92c08b};
const SKY={humid:['#d6f1ee','#f3fbf9'],dry:['#ffe7c2','#fff8ea'],cold:['#dfeaf3','#f7fbfd'],rainy:['#aebfc8','#dfe7ea']};

const ROOFS={
  base:{color:0xde7d65},
  hr1:{color:0xeb8a70,double:true},
  hr2:{color:0x30383a},
  dr1:{color:0xe6bf85,thick:.34,tiles:0xb98a52,ridge:0xb5734a},
  dr2:{color:0x6fbfe8,glass:'frame'},   // 'frame' glass with metal grid | 'skylight' metal roof with glass panels | 'saw' sawtooth glazing
  cr1:{color:0x56707c,thick:.14,snow:true,layers:true},   // variants: layers (cut-away insulation) | chalet | panel
  cr2:{color:0x5f7f8c,vent:'ridge'},   // variants: vent 'ridge' | vent 'turbine' | slats (open slices)
  rr1:{color:0x41637a,steep:true,gutter:true,tiles:0x2e4b5e,barrel:true},   // variants: slate tiles | metal seams | aframe
  rr2:{color:0x8e9a91,flat:true}
};
const WALLS={
  base:{color:0xf7edd8},
  hw1:{color:0xfff1d4,veranda:'wood'},   // 'wood' sloped timber veranda | 'louver' slatted canopy | 'pergola' planted trellis
  hw2:{color:0x7dc2e5,glass:true},
  dw1:{color:0xd9b57a,thick:.28,trim:0xa66f45},
  dw2:{color:0xaeb8b4,metal:true},
  cw1:{color:0xf7eed4,insulation:true},
  cw2:{color:0xf2ead7,slats:true},
  rw1:{color:0xe8e2c9,battens:0x7fa58c},
  rw2:{color:0x8fa08a,damp:true}
};
const WINDOWS={
  base:{glass:0x77b9db},
  hv1:{glass:0xbfe3f2,hood:0x147f85,wind:0x147f85,back:true},
  hv2:{glass:0x74aee8,big:true},
  dv1:{glass:0x24506a,wind:0xfff4ad,back:true},
  dv2:{glass:0xffe2b0,big:true,wind:0xc0502f,back:true},
  cv1:{glass:0xdbeef3,frame:.16,small:true},
  cv2:{glass:0x83add0,single:true},
  rv1:{glass:0xbfe3f2,hood:0x6f9e79,wind:0x147f85,back:true},
  rv2:{glass:0x647471,frame:.14}
};

function mat(color,o={}){return new T.MeshStandardMaterial(Object.assign({color,roughness:.82,metalness:0},o))}
function outline(mesh,opacity=.55){const e=new T.LineSegments(new T.EdgesGeometry(mesh.geometry,25),new T.LineBasicMaterial({color:INK,transparent:true,opacity}));mesh.add(e);return mesh}
function box(w,h,d,material,x=0,y=0,z=0,edges=true){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(edges)outline(m);return m}

// Gable prism: ridge along x, eaves overhang on every side.
function gable(width,depth,rise,material,thick=.18){
  const s=new T.Shape(),hd=depth/2;
  s.moveTo(-hd,0);s.lineTo(0,rise);s.lineTo(hd,0);s.lineTo(hd-thick*1.4,0);s.lineTo(0,rise-thick*1.6);s.lineTo(-hd+thick*1.4,0);s.lineTo(-hd,0);
  const g=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:false});
  g.translate(0,0,-width/2);g.rotateY(Math.PI/2);
  const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return outline(m)
}
// Gable end walls (the triangles under the roof) so the attic is closed.
function gableEnds(depth,rise,material){
  const s=new T.Shape(),hd=depth/2;s.moveTo(-hd,0);s.lineTo(0,rise);s.lineTo(hd,0);s.lineTo(-hd,0);
  const g=new T.ExtrudeGeometry(s,{depth:W-.02,bevelEnabled:false});g.translate(0,0,-(W-.02)/2);g.rotateY(Math.PI/2);
  const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m
}

function arrow(color){
  const g=new T.Group(),m=new T.MeshBasicMaterial({color,transparent:true,opacity:1});
  const shaft=new T.Mesh(new T.CylinderGeometry(.09,.09,.9,10),m);shaft.rotation.x=Math.PI/2;
  const head=new T.Mesh(new T.ConeGeometry(.24,.44,16),m);head.rotation.x=-Math.PI/2;head.position.z=-.66;
  g.add(shaft,head);g.userData.mat=m;return g
}

// Flat illustrated sun and cloud (billboards that always face the camera).
function makeSun(hot){
  const g=new T.Group(),b=c=>new T.MeshBasicMaterial({color:c,transparent:true,side:T.DoubleSide});
  const glow=new T.Mesh(new T.CircleGeometry(1.45,48),b(hot?0xffd9a0:0xfff0b8));glow.material.opacity=.55;glow.position.z=-.06;
  const ring=new T.Mesh(new T.RingGeometry(.98,1.06,48),b(hot?0xf59a3a:0xf7b84a));ring.position.z=-.02;
  const disc=new T.Mesh(new T.CircleGeometry(.8,48),b(hot?0xff9f2e:0xffc23d));
  const core=new T.Mesh(new T.CircleGeometry(.5,48),b(hot?0xffc561:0xffe08a));core.position.z=.02;
  const rays=new T.Group();
  for(let i=0;i<12;i++){const r=new T.Mesh(new T.PlaneGeometry(.13,i%2?.3:.48),b(hot?0xf59a3a:0xf7b84a)),q=i/12*Math.PI*2,rr=i%2?1.3:1.38;r.position.set(Math.cos(q)*rr,Math.sin(q)*rr,-.04);r.rotation.z=q-Math.PI/2;rays.add(r)}
  g.add(glow,ring,rays,disc,core);g.userData={billboard:true,spin:rays};return g
}
function makeCloud(face=0xffffff,shade=0xbcd9ea){
  const sh=new T.Shape();
  sh.moveTo(-1.2,0);sh.lineTo(1.25,0);
  sh.absarc(1.25,.42,.42,-Math.PI/2,Math.PI*.6,false);
  sh.absarc(.5,.78,.62,Math.PI*.05,Math.PI*.9,false);
  sh.absarc(-.45,.72,.55,Math.PI*.25,Math.PI,false);
  sh.absarc(-1.2,.4,.4,Math.PI*.6,Math.PI*1.5,false);
  const geo=new T.ShapeGeometry(sh,24),g=new T.Group();
  const back=new T.Mesh(geo,new T.MeshBasicMaterial({color:shade,side:T.DoubleSide}));back.position.set(.14,-.12,-.03);
  const front=new T.Mesh(geo,new T.MeshBasicMaterial({color:face,side:T.DoubleSide}));
  const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(sh.getPoints(24)),new T.LineBasicMaterial({color:INK,transparent:true,opacity:.5}));line.position.z=.01;
  g.add(back,front,line);g.position.y=-.5;g.userData={billboard:true,cloud:true};return g
}

// Deep veranda in front of (sd=1) and behind (sd=-1) the house. Posts stand clear of the door and windows.
function veranda(style,sd,y0){
  const g=new T.Group(),z0=D/2,z1=D/2+1.15,posts=[-W/2-.45,-.78,.78,W/2+.45],span=W+1.2;
  const put=(m,rx=0)=>{m.position.z*=sd;m.rotation.x=sd*rx;g.add(m);return m};
  if(style==='wood'){
    const yA=y0+2.42,yB=y0+2.02,run=z1-z0+.2,sl=Math.atan2(yA-yB,run),len=Math.hypot(run,yA-yB),wood=mat(0x8a5634);
    put(box(span,.1,z1-z0+.15,mat(0xc89462),0,y0+.05,z0+.6));
    put(box(span+.1,.1,len,mat(0xd9714a),0,(yA+yB)/2+.06,z0+run/2),sl);
    for(let i=0;i<12;i++)put(box(.07,.07,len,mat(0xb2563a),-span/2+(i+.5)*span/12,(yA+yB)/2+.13,z0+run/2,false),sl);
    put(box(span-.1,.16,.18,wood,0,yB,z1));
    for(const x of posts){put(box(.16,yB-y0,.16,wood,x,y0+(yB-y0)/2,z1));
      for(const d of[-1,1])if(Math.abs(x+d*.3)<span/2){const br=put(box(.07,.5,.07,wood,x+d*.18,yB-.2,z1,false));br.rotation.z=d*.75}}
  }else if(style==='louver'){
    const y=y0+2.3,steel=mat(0x2f5562,{metalness:.35,roughness:.5});
    for(const x of posts)put(box(.1,y-y0,.1,steel,x,y0+(y-y0)/2,z1));
    put(box(span,.12,.12,steel,0,y,z1));put(box(span,.12,.12,steel,0,y,z0+.05));
    for(const x of[-span/2,span/2])put(box(.1,.12,z1-z0,steel,x,y,z0+(z1-z0)/2));
    for(let i=0;i<7;i++)put(box(span-.1,.03,.17,mat(0xd9b77e),0,y+.02,z0+.15+i*(z1-z0-.2)/6),1.05);
  }else{
    const y=y0+2.28,wood=mat(0x9a6b43),leaf=[0x5fa75a,0x7dbd6a,0x4e9152,0x96cc7a];
    for(const x of posts)put(box(.16,y-y0,.16,wood,x,y0+(y-y0)/2,z1));
    put(box(span,.16,.14,wood,0,y,z1));put(box(span,.16,.14,wood,0,y,z0+.06));
    for(let i=0;i<11;i++)put(box(.08,.12,z1-z0+.35,wood,-span/2+(i+.5)*span/11,y+.14,z0+(z1-z0)/2+.1));
    for(let i=0;i<16;i++){const lm=new T.Mesh(new T.IcosahedronGeometry(.26+(i*37%7)*.025,0),mat(leaf[i%4],{flatShading:true}));
      lm.position.set(-span/2+.35+(i*0.53*7.3)%(span-.7),y+.26+(i%3)*.04,z0+.25+((i*5)%4)*.25);lm.scale.y=.6;lm.castShadow=true;put(lm)}
    for(const x of[posts[0],posts[3]])for(let k=0;k<3;k++){const v=new T.Mesh(new T.IcosahedronGeometry(.16,0),mat(leaf[k%4],{flatShading:true}));v.position.set(x+(k%2?.1:-.1),y-.35-k*.42,z1+.08);put(v)}
  }
  return g
}

function create(stage){
  if(!T)return null;
  let renderer;
  try{
    const probe=document.createElement('canvas');
    if(!(probe.getContext('webgl2')||probe.getContext('webgl')))return null;
    renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  }catch(e){return null}
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='house3d-canvas';canvas.setAttribute('aria-hidden','true');
  stage.prepend(canvas);stage.classList.add('house3d-on');

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(34,1,.1,100);
  scene.add(new T.HemisphereLight(0xffffff,0xb9a27a,.75));
  const sun=new T.DirectionalLight(0xffffff,.95);sun.position.set(6,10,7);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:30});sun.shadow.bias=-.0015;
  scene.add(sun);

  const ground=new T.Mesh(new T.CircleGeometry(11,48),mat(GROUND.humid));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const plinth=box(W+.9,.18,D+.9,mat(0x5d6b66),0,.09,0);scene.add(plinth);

  const root=new T.Group();scene.add(root);
  const fx=new T.Group();scene.add(fx);
  let house=null,winds=[],spin=[],weather=null,climate='humid',pop=1,key='';

  function buildHouse(roofId,wallId,winId){
    const r=ROOFS[roofId]||ROOFS.base,w=WALLS[wallId]||WALLS.base,n=WINDOWS[winId]||WINDOWS.base;
    const g=new T.Group();winds=[];spin=[];
    const y0=.18,top=y0+H;
    // walls
    const wallMat=w.glass?mat(w.color,{transparent:true,opacity:.3,roughness:.15,metalness:.1}):w.metal?mat(w.color,{metalness:.55,roughness:.45}):mat(w.color);
    const t=w.thick||0;
    if(w.slats){
      // open slatted wall: bright room visible between the slats, cold wind blowing straight through
      g.add(box(W-.1,.12,D-.1,mat(0xf3e3c3),0,y0+.06,0,false));
      g.add(box(1.5,.5,.65,mat(0xe58a6b),-1.3,y0+.37,-.95));g.add(box(.85,.42,.85,mat(0xc89462),1.25,y0+.33,-.7));
      for(const sx of[-1,1])for(const sz of[-1,1])g.add(box(.22,H,.22,mat(0x7a5a3e),sx*(W/2-.05),y0+H/2,sz*(D/2-.05)));
      const slat=mat(0xdcbf92);
      for(let y=y0+.35;y<top-.15;y+=.52){for(const sz of[-1,1])g.add(box(W,.11,.07,slat,0,y,sz*D/2));for(const sx of[-1,1])g.add(box(.07,.11,D,slat,sx*W/2,y,0))}
      g.add(box(W+.1,.14,D+.1,mat(w.color),0,top-.07,0));
      for(let k=0;k<4;k++){const a=arrow(0x1677d2);a.userData.mat.transparent=true;a.rotation.y=-Math.PI/2;a.scale.setScalar(.95);a.userData={x0:-W/2-1.4,x1:W/2+1.4,y:y0+.65+(k%2)*.75,z:k<2?.6:-.3,phase:k/4,mat:a.userData.mat,slow:true};g.add(a);winds.push(a)}
    }else{
      g.add(box(W+t,H,D+t,wallMat,0,y0+H/2,0));
    }
    if(w.glass){for(let x=-W/2;x<=W/2+.01;x+=1){g.add(box(.07,H,.07,mat(0x1e4d6b),x,y0+H/2,D/2));g.add(box(.07,H,.07,mat(0x1e4d6b),x,y0+H/2,-D/2))}g.add(box(.6,H*.6,.6,mat(0xf2e3c7),-1.4,y0+H*.3,0))}
    if(w.trim){for(const sx of[-1,1])for(const sz of[-1,1])g.add(box(.3,H+.02,.3,mat(w.trim),sx*(W+t)/2,y0+H/2,sz*(D+t)/2))}
    if(w.metal){for(let x=-W/2+.2;x<W/2;x+=.3){g.add(box(.05,H,.04,mat(0x899795,{metalness:.6,roughness:.4}),x,y0+H/2,D/2+.02,false))}}
    if(w.insulation){const shell=new T.Mesh(new T.BoxGeometry(W+.36,H+.12,D+.36),mat(0xbfe0ea,{transparent:true,opacity:.35}));shell.position.set(0,y0+H/2+.04,0);outline(shell,.35);g.add(shell)}
    if(w.battens){for(let x=-W/2+.25;x<W/2;x+=.5)g.add(box(.08,H,.08,mat(w.battens),x,y0+H/2,D/2+.06))}
    if(w.damp){g.add(box(W+.02,H*.38,D+.02,mat(0x5d7563),0,y0+H*.19,0,false))}
    if(w.veranda)for(const sd of[1,-1])g.add(veranda(w.veranda,sd,y0));
    // door and windows sit in front of any cladding (battens, ribs, slats, insulation) so nothing covers them
    const face=w.insulation?.2:w.battens?.12:w.slats?.1:w.metal?.06:w.glass?.05:t/2;
    g.add(box(1.05,1.75,.08,mat(INK),0,y0+.875,D/2+face+.03,false));
    g.add(box(.85,1.6,.1,mat(0xd6a26c),0,y0+.8,D/2+face+.06));
    // windows
    const ww=n.big?1.45:n.small?.78:1.05,wh=n.big?1.05:n.small?.68:.82,fr=n.frame||.07,wy=y0+H*.58;
    const glass=mat(n.glass,{roughness:.2,metalness:.1,emissive:n.glass,emissiveIntensity:.12});
    const spots=n.single?[[1.85,1]]:[[-1.75,1],[1.75,1]];
    if(n.back)spots.push(...spots.map(([x])=>[x,-1]));
    for(const [x,side] of spots){
      const sw=n.single?1.8:ww,sh=n.single?1.25:wh,z=side*(D/2+face+.05);
      const f=box(sw+fr*2,sh+fr*2,.1,mat(n.frame?0x193f52:INK),x,wy,z,false);g.add(f);
      g.add(box(sw,sh,.12,glass,x,wy,z+side*.01,false));
      if(n.frame&&n.frame>.12)g.add(box(sw*.62,sh*.62,.13,mat(0xffffff,{transparent:true,opacity:.35}),x,wy,z+side*.02,false));
      if(n.hood)g.add(box(sw+.4,.08,.5,mat(n.hood),x,wy+sh/2+.22,z+side*.25));
      if(n.wind&&side===1&&!w.glass){for(let k=0;k<2;k++){const a=arrow(n.wind);a.rotation.y=-Math.PI/2;a.scale.setScalar(.65);a.userData={x0:x-sw/2-.1,x1:x+sw/2+.1,y:wy+(k?-sh*.22:sh*.22),z:z+.14,phase:k*.5,mat:a.userData.mat};g.add(a);winds.push(a)}}
    }
    // see-through glass walls: show the airflow as a loop circulating inside the room instead
    if(w.glass&&n.wind){for(let k=0;k<8;k++){const p=new T.Group(),a=arrow(0xffd23f);a.userData.mat.transparent=false;a.rotation.y=-Math.PI/2;a.scale.setScalar(.85);p.add(a);p.userData={loop:{rx:2.2,rz:1.35,y:y0+.55},phase:k/8,mat:a.userData.mat};g.add(p);winds.push(p)}}
    // roof
    const ov=r.ov||.45,rise=r.rise||(r.steep?2.2:1.35);
    const roofMat=r.glass==='skylight'?mat(0xc3ccce,{metalness:.3,roughness:.5}):r.glass?mat(r.color,{transparent:true,opacity:.55,roughness:.1,emissive:r.color,emissiveIntensity:.2}):mat(r.color);
    const glassMat=()=>mat(0x4fa9dc,{transparent:true,opacity:.7,roughness:.05,metalness:.1,emissive:0x4fa9dc,emissiveIntensity:.35}),frameMat=mat(0x1f4656,{metalness:.4,roughness:.4});
    if(r.glass==='saw'){
      const L=W+.5,Dz=D+.5,tw=L/3,th=1.15;g.add(box(L,.16,Dz,mat(0xdfe6e8),0,top+.08,0));
      for(let i=0;i<3;i++){const x0=-L/2+i*tw,sl=Math.atan2(th,tw);
        const p=box(Math.hypot(tw,th),.1,Dz,mat(0xe9eef0),x0+tw/2,top+.16+th/2,0);p.rotation.z=-sl;g.add(p);
        g.add(box(.06,th,Dz,glassMat(),x0+.03,top+.16+th/2,0,false));
        for(let k=0;k<=4;k++)g.add(box(.08,th,.08,frameMat,x0+.03,top+.16+th/2,-Dz/2+k*Dz/4,false));
        const tri=new T.Shape();tri.moveTo(0,0);tri.lineTo(tw,0);tri.lineTo(0,th);tri.lineTo(0,0);
        for(const sd of[1,-1]){const m=new T.Mesh(new T.ShapeGeometry(tri),mat(0xe9eef0,{side:T.DoubleSide}));m.position.set(x0,top+.16,sd*Dz/2);g.add(outline(m))}}
    }else 
    if(r.flat){
      g.add(box(W+.7,.32,D+.7,roofMat,0,top+.16,0));
      const puddle=new T.Mesh(new T.CircleGeometry(.9,32),mat(0x5ea7d6,{roughness:.05,metalness:.2}));puddle.rotation.x=-Math.PI/2;puddle.scale.set(1.6,1,1);puddle.position.set(.4,top+.33,.2);g.add(puddle);
    }else{
      g.add(gableEnds(D,rise-.05,mat(w.slats?0xf2ead7:w.glass?0xdcebf2:w.color)).translateY(top));
      if(r.slats){
        for(let i=0;i<7;i++){const s=gable(W+ov*2,D+ov*2,rise,roofMat,.14);s.position.y=top;s.scale.x=.11;s.position.x=-W/2-ov+(i+.5)*(W+ov*2)/7;g.add(s)}
      }else{
        const lift=r.layers?.44:0;
        const rf=gable(W+ov*2,D+ov*2,rise,roofMat,r.thick||.18);rf.position.y=top+lift;g.add(rf);
        // cut-away roof build-up: white ceiling, thick yellow insulation, dark roofing on top
        if(r.layers){const ce=gable(W+ov*2,D+ov*2,rise,mat(0xf7f3ea),.14);ce.position.y=top;g.add(ce);const ins=gable(W+ov*2-.02,D+ov*2,rise,mat(0xf5cf63),.32);ins.position.y=top+.14;g.add(ins)}
        if(r.chimney){g.add(box(.55,1.5,.55,mat(0xa65a44),1.7,top+rise*.55+.35,-.7));g.add(box(.7,.14,.7,mat(0x6e3a2c),1.7,top+rise*.55+1.12,-.7))}
        // light cool roof: rows of pale clay tiles (or standing seams) and a ridge cap so it reads as a real roof, not a white slab
        const hd=(D+ov*2)/2,sl=Math.atan2(rise,hd),len=Math.hypot(hd,rise);
        if(r.tiles)for(const sd of[1,-1])for(let i=1;i<7;i++){const f=i/7,t=box(W+ov*2,.06,.1,mat(r.tiles),0,top+rise*f+.04,sd*hd*(1-f),false);t.rotation.x=sd*sl;g.add(t)}
        if(r.seams)for(const sd of[1,-1])for(let i=0;i<9;i++){const t=box(.08,.08,len,mat(r.seams),-W/2-ov+(i+.5)*(W+ov*2)/9,top+rise/2+.06,sd*hd/2,false);t.rotation.x=sd*sl;g.add(t)}
        if(r.ridge)g.add(box(W+ov*2+.1,.16,.34,mat(r.ridge),0,top+rise+.02,0));
        if(r.glass==='frame'){for(const sd of[1,-1]){for(let i=0;i<=8;i++){const b=box(.07,.07,len,frameMat,-W/2-ov+i*(W+ov*2)/8,top+rise/2+.03,sd*hd/2,false);b.rotation.x=sd*sl;g.add(b)}
          for(const f of[0,.5])g.add(box(W+ov*2,.08,.08,frameMat,0,top+rise*f+.03,sd*hd*(1-f),false))}g.add(box(W+ov*2+.1,.12,.2,frameMat,0,top+rise,0,false))}
        if(r.glass==='skylight')for(const sd of[1,-1])for(let i=0;i<3;i++){const f=.48,x=-2.3+i*2.3,y=top+rise*f+.08,z=sd*hd*(1-f);
          const fr=box(1.75,.06,1.55,frameMat,x,y,z,false);fr.rotation.x=sd*sl;g.add(fr);const gl=box(1.55,.08,1.35,glassMat(),x,y+.02,z,false);gl.rotation.x=sd*sl;g.add(gl)}
        if(r.double){const up=gable(W+ov*2,D+ov*2+.1,rise,mat(0xf3a58c),.12);up.position.y=top+.32;g.add(up);for(const x of[-W/2,0,W/2])g.add(box(.1,.32,.1,mat(INK),x,top+.16,D/2+ov-.2))}
        if(r.snow){const k=.62,sn=gable(W+ov*2+.06,(D+ov*2)*k,rise*k,mat(0xffffff,{roughness:1}),.12);sn.position.y=top+.13+lift+rise*(1-k);sn.scale.set(1,1,.98);g.add(sn)}
        if(r.vent==='ridge'){g.add(box(W*.8,.1,.95,mat(0x56707c),0,top+rise+.42,0));for(let i=0;i<5;i++)g.add(box(.08,.42,.08,mat(INK),-W*.36+i*W*.18,top+rise+.2,0,false));
          for(const x of[-1.8,1.8]){const lv=box(1.1,.5,.12,mat(0x3c4f57),x,top+rise*.45+.12,hd*.55,false);lv.rotation.x=sl;g.add(lv);for(let k=0;k<3;k++){const sb=box(1,.05,.14,mat(0xc9d3d6),x,top+rise*.45+.02+k*.13,hd*.55+.02,false);sb.rotation.x=sl;g.add(sb)}}}
        if(r.vent==='turbine')for(const x of[-1.9,0,1.9]){const tb=new T.Group();const cyl=new T.Mesh(new T.CylinderGeometry(.34,.34,.5,14,1,true),mat(0xb8c4c8,{metalness:.6,roughness:.35,side:T.DoubleSide}));outline(cyl,.4);const dome=new T.Mesh(new T.SphereGeometry(.34,14,8,0,Math.PI*2,0,Math.PI/2),mat(0xc9d3d6,{metalness:.6,roughness:.35}));dome.position.y=.25;tb.add(cyl,dome);for(let k=0;k<10;k++){const f=box(.05,.5,.16,mat(0x8f9da2,{metalness:.5}),Math.cos(k/10*Math.PI*2)*.34,0,Math.sin(k/10*Math.PI*2)*.34,false);f.rotation.y=-k/10*Math.PI*2;tb.add(f)}tb.position.set(x,top+rise+.3,0);g.add(tb);spin.push(tb);g.add(box(.3,.3,.3,mat(0x56707c),x,top+rise,0))}
        if(r.vent)for(let k=0;k<4;k++){const a=arrow(0xf08a3c);a.rotation.x=Math.PI/2;a.scale.setScalar(.6);a.userData={up:true,x:-2.4+k*1.6,y0:top+rise+.3,y1:top+rise+2.2,z:0,phase:k/4,mat:a.userData.mat};g.add(a);winds.push(a)}
        if(r.barrel){const br=new T.Mesh(new T.CylinderGeometry(.32,.32,.7,16),mat(0x3f7d5c));outline(br,.4);br.position.set(W/2+ov+.15,y0+.35,D/2+ov-.1);g.add(br)}
        if(r.gutter){for(const z of[1,-1])g.add(box(W+ov*2,.14,.16,mat(0x50705a),0,top-.02,z*(D/2+ov)));g.add(box(.12,H,.12,mat(0x50705a),W/2+ov-.1,y0+H/2,D/2+ov))}
      }
    }
    return g;
  }

  // sky billboards are pinned to a screen position (NDC x,y) and always drawn on top, so the house, the rotation and the hint chips never hide them
  function skyPin(o,sx,sy,ph=0){o.userData.ndc=[sx,sy];o.userData.ph=ph;let n=0;o.traverse(m=>{if(m.material){m.material.depthTest=false;m.material.depthWrite=false;m.renderOrder=50+n++}})}
  const _v=new T.Vector3();
  function buildWeather(id){
    const g=new T.Group();g.userData.kind=id;
    if(id==='humid'||id==='dry'){
      const sun=makeSun(id==='dry');skyPin(sun,-.74,.66);if(id==='dry')sun.scale.setScalar(1.2);g.add(sun);
      if(id==='humid')for(const [sx,sy,k,ph] of[[-.12,.72,1,0],[.3,.6,.66,2]]){const c=makeCloud();skyPin(c,sx,sy,ph);c.scale.setScalar(k);g.add(c)}
    }
    if(id==='rainy'){
      // long dark rain streaks, grey clouds, and ripples on puddles around the house
      for(const [sx,sy,k,ph] of[[-.62,.64,1.15,0],[.28,.66,.9,1.5],[-.16,.8,.7,3]]){const c=makeCloud(0xd7dee3,0x8e9ca6);skyPin(c,sx,sy,ph);c.scale.setScalar(k);g.add(c)}
      const n=650,pos=new Float32Array(n*6);
      for(let i=0;i<n;i++){const x=(Math.random()-.5)*20,y=Math.random()*10,z=(Math.random()-.5)*14;pos.set([x,y,z,x+.1,y-.6,z],i*6)}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
      const st=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x245f93,transparent:true,opacity:.8}));g.add(st);g.userData.streaks=st;
      const pud=mat(0x6d9fc4,{roughness:.1,metalness:.2});
      for(const [x,z,sx,sz] of[[-4.4,2.6,1.6,.9],[3.9,3.3,1.3,.7],[-1.2,4.2,1.1,.6],[4.6,-1.2,1,.8]]){const m=new T.Mesh(new T.CircleGeometry(1,28),pud);m.rotation.x=-Math.PI/2;m.scale.set(sx,sz,1);m.position.set(x,.03,z);g.add(m)}
      g.userData.ripples=[];
      for(let i=0;i<12;i++){const r=new T.Mesh(new T.RingGeometry(.2,.26,28),new T.MeshBasicMaterial({color:0x1f5b8f,transparent:true}));r.rotation.x=-Math.PI/2;const sp=[[-4.4,2.6],[3.9,3.3],[-1.2,4.2],[4.6,-1.2]][i%4];r.position.set(sp[0]+Math.sin(i*2.1)*.6,.05,sp[1]+Math.cos(i*1.7)*.35);r.userData.ph=i/12;g.add(r);g.userData.ripples.push(r)}
    }
    if(id==='cold'){
      for(const [sx,sy,k,ph] of[[-.6,.66,1.05,0],[.18,.74,.8,2]]){const c=makeCloud(0xf6f9fb,0xb4c4d1);skyPin(c,sx,sy,ph);c.scale.setScalar(k);g.add(c)}
      const n=220,pos=new Float32Array(n*3);
      for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*20;pos[i*3+1]=Math.random()*10;pos[i*3+2]=(Math.random()-.5)*14}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
      const p=new T.Points(geo,new T.PointsMaterial({color:0xffffff,size:.16}));
      g.add(p);g.userData.points=p;
    }
    return g;
  }

  function update(climateId,partIds){
    const ids=partIds||[],pick=k=>ids.find(id=>(k==='roof'?ROOFS:k==='wall'?WALLS:WINDOWS)[id]);
    const next=[climateId,pick('roof'),pick('wall'),pick('window')].join('|');
    if(climateId!==climate||!weather){
      climate=climateId;ground.material.color.setHex(GROUND[climateId]||GROUND.humid);
      const sky=SKY[climateId]||SKY.humid;stage.style.setProperty('--sky-top',sky[0]);stage.style.setProperty('--sky-bottom',sky[1]);
      if(weather){fx.remove(weather);dispose(weather)}weather=buildWeather(climateId);fx.add(weather);
    }
    if(next===key)return;
    const first=!key;key=next;
    if(house){root.remove(house);dispose(house)}
    house=buildHouse(pick('roof'),pick('wall'),pick('window'));root.add(house);
    pop=first?1:.9;
  }
  function dispose(obj){obj.traverse(o=>{o.geometry&&o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())})}

  // orbit: gentle automatic sway, drag to look around
  let yaw=-.35,target=-.35,dragging=false,lastX=0,idle=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;target=Math.max(-1.25,Math.min(1.25,target+(e.clientX-lastX)*.008));lastX=e.clientX;idle=0});
  const stop=()=>{dragging=false;idle=0};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);

  let w=0,h=0;
  function resize(){
    const cw=stage.clientWidth,ch=stage.clientHeight;if(!cw||!ch||(cw===w&&ch===h))return;w=cw;h=ch;
    const fit=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit'))||1;
    renderer.setPixelRatio(Math.min(1.5,(window.devicePixelRatio||1)*fit));renderer.setSize(cw,ch,false);
    camera.aspect=cw/ch;camera.fov=cw/ch<1.45?40:32;camera.updateProjectionMatrix();
  }
  let last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||!stage.offsetParent)return;
    resize();
    const dt=Math.min(.05,(now-last)/1000);last=now;idle+=dt;
    if(!dragging&&idle>2.5)target=-.35+Math.sin(now/3200)*.32;
    yaw+=(target-yaw)*Math.min(1,dt*3);
    const dist=w/h<1.45?16:13.6;
    camera.position.set(Math.sin(yaw)*dist,6.2,Math.cos(yaw)*dist);camera.lookAt(0,1.95,0);
    pop+=(1-pop)*Math.min(1,dt*9);root.scale.setScalar(pop);
    for(const t of spin)t.rotation.y+=dt*2.4;
    for(const a of winds){const u=a.userData;if(u.up){const t=((now/1000)/1.6+u.phase)%1;a.position.set(u.x,u.y0+(u.y1-u.y0)*t,u.z);u.mat.opacity=t<.15?t/.15:t>.7?(1-t)/.3:1;continue}if(u.loop){const L=u.loop,q=((now/1000)/4+u.phase)%1*Math.PI*2;a.position.set(L.rx*Math.cos(q),L.y,L.rz*Math.sin(q));a.rotation.y=Math.atan2(-L.rz*Math.cos(q),-L.rx*Math.sin(q));continue}const t=((now/1000)/(u.slow?2.8:1.8)+u.phase)%1;a.position.set(u.x0+(u.x1-u.x0)*t,u.y,u.z);u.mat.opacity=t<.12?t/.12:t>.85?(1-t)/.15:1}
    if(weather)for(const o of weather.children){const u=o.userData;if(!u.billboard)continue;o.quaternion.copy(camera.quaternion);if(u.spin)u.spin.rotation.z=-now/9000;if(u.ndc){_v.set(u.ndc[0]+(u.cloud?Math.sin(now/2600+u.ph)*.025:0),u.ndc[1],.5).unproject(camera).sub(camera.position).normalize();o.position.copy(camera.position).addScaledVector(_v,20)}}
    if(weather&&weather.userData.streaks){const p=weather.userData.streaks.geometry.attributes.position,fall=11*dt;for(let i=0;i<p.count;i+=2){let y=p.getY(i)-fall;if(y<0)y+=10;p.setY(i,y);p.setY(i+1,y-.6)}p.needsUpdate=true;
      for(const r of weather.userData.ripples){const t=((now/1000)/1.3+r.userData.ph)%1;r.scale.setScalar(.5+t*2.4);r.material.opacity=.85*(1-t)}}
    if(weather&&weather.userData.points){const p=weather.userData.points.geometry.attributes.position,fall=climate==='cold'?1.1:7;for(let i=0;i<p.count;i++){let y=p.getY(i)-fall*dt;if(y<0)y+=10;p.setY(i,y);if(climate==='cold')p.setX(i,p.getX(i)+Math.sin(now/900+i)*.004)}p.needsUpdate=true}
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  return {update};
}

window.House3D={create};
})();
