/* BRAVE SOUL squad-boss adapter. Uses the same AI round engine as dungeons. */
(function(root){
"use strict";
function start(boss,allies,hero){
 const companions=(allies||[]).slice(0,3);
 const heroUnit={id:"player",name:hero.name||"主人公",emoji:"⚔️",job:hero.currentJob,slot:0,
 hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,atk:hero.atk,def:hero.def,mag:hero.mag,spd:hero.spd,role:"attacker"};
 const friends=companions.map((a,i)=>({id:a.soulId||"soul"+i,name:a.name,emoji:a.emoji||"✨",job:a.currentJob||a.job,
 slot:[3,6,4][i],maxHp:a.maxHp||100+(a.level||1)*18,mp:a.maxMp||40,maxMp:a.maxMp||40,
 atk:a.atk||30,def:a.def||20,mag:a.mag||10,spd:a.spd||10,role:(a.mag||0)>(a.atk||0)?"healer":"attacker"}));
 const enemies=[{...boss,id:"boss",slot:0,maxHp:boss.hp,role:"attacker"}]
   .concat((boss.mobs||[]).slice(0,5).map((m,i)=>({...m,id:"mob"+i,slot:[3,6,1,4,7][i],maxHp:m.hp,role:"attacker"})));
 return root.BraveDungeonSquad.start({allies:[heroUnit,...friends],enemies,order:"balanced"});
}
function render(state,React,onOrder,onNext){
 const h=React.createElement;
 const colors={ally:"#79c9b7",enemy:"#db7775"};
 const unitGrid=(units,side)=>h("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}},
  ...Array.from({length:9},(_,pos)=>{
   const u=units.find(x=>x.slot===pos);
   return h("div",{key:side+pos,style:{minHeight:65,padding:"7px 3px",background:u?"#182037":"#0c1120",
    border:"1px solid "+(u?colors[side]:"#283042"),borderRadius:8,textAlign:"center",opacity:u?.hp===0?.5:1}},
    u?h("div",null,h("div",{style:{fontSize:17}},u.emoji||"⚔️"),
       h("div",{style:{fontSize:13,color:"#f3eee6",wordBreak:"break-word"}},u.name),
       h("div",{style:{fontSize:13,color:u.hp>0?"#bde5d9":"#ed7777"}},u.hp+"/"+u.maxHp)):null);
  }));
 const button=(text,fn,active)=>h("button",{onClick:fn,style:{minHeight:54,fontSize:17,
  padding:"10px 12px",borderRadius:9,color:"#f4eee1",background:active?"#39445e":"#202637",
  border:"2px solid "+(active?"#d2b175":"#4d5970")}},text);
 return h("div",{style:{minHeight:"100vh",padding:"18px 12px 50px",background:"linear-gradient(#11172b,#0a0d19)",color:"#e8e3d6",
  fontFamily:"-apple-system,'Hiragino Kaku Gothic ProN',sans-serif"}},
 h("div",{style:{maxWidth:720,margin:"0 auto"}},
  h("h2",{style:{textAlign:"center",fontSize:23,color:"#f0d6a0",marginBottom:18}},"⚔️ 魂の部隊戦"),
  h("p",{style:{color:"#b7c4d3",fontSize:16,marginBottom:8}},"敵部隊 — "+state.enemies.filter(x=>x.hp>0).length+"体"),
  unitGrid(state.enemies,"enemy"),
  h("p",{style:{color:"#b7c4d3",fontSize:16,margin:"22px 0 8px"}},"味方部隊 — "+state.allies.filter(x=>x.hp>0).length+"体"),
  unitGrid(state.allies,"ally"),
  h("div",{style:{fontSize:16,textAlign:"center",margin:"16px 0"}},"ROUND "+state.round+"　｜　作戦: "+({assault:"突撃",balanced:"均衡",defend:"守備",heal:"回復重視"}[state.order])),
  h("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}},
    ...[["⚔️ 突撃","assault"],["⚖️ 均衡","balanced"],["🛡️ 守備","defend"],["✨ 回復重視","heal"]].map(([name,key])=>button(name,()=>onOrder(key),state.order===key))),
  h("div",{style:{marginTop:12}},button(state.result?"戦闘終了":"▶ 部隊全員の行動を実行",onNext,true)),
  h("div",{style:{background:"#111a2b",border:"1px solid #45506b",borderRadius:8,
  padding:12,marginTop:16,minHeight:95,fontSize:16,lineHeight:1.7}},
   ...(state.log.length?state.log.slice(-7):["作戦を選び、部隊に指示を出そう。"]).map((msg,i)=>h("div",{key:i},msg)))));
}
root.BraveBossAddon={start,render};
})(typeof window!=="undefined"?window:globalThis);
