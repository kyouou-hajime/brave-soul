/* BRAVE SOUL — Ogre-inspired dungeon squad engine (isolated, no legacy save mutation).
 * Row/col: 0 front, 1 middle, 2 rear; slots 0..8.
 * One hero + up to three bound souls vs 3–6 enemies.
 * Strategy is party-wide and AI automatically selects actions.
 */
(function(root){
"use strict";
const ORDERS=["assault","balanced","defend","heal"];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pick=(arr,fn)=>arr.filter(fn);
function unit(data,side,i){
  const maxHp=Math.max(1,Math.floor(Number(data.maxHp||data.hp||100)));
  const slot=clamp(Number.isFinite(+data.slot)?+data.slot:(side==="ally"?[3,0,6,4][i]:[0,3,6,1,4,7][i]),0,8);
  return {id:String(data.id||side+"-"+i),name:String(data.name||"???"),side,slot,
    job:data.job||"",element:data.element||null,emoji:data.emoji||"⚔️",
    maxHp,hp:clamp(Math.floor(Number(data.hp||maxHp)),0,maxHp),
    maxMp:Math.max(0,Number(data.maxMp||data.mp||0)),mp:Math.max(0,Number(data.mp||0)),
    atk:Math.max(1,Number(data.atk||10)),def:Math.max(0,Number(data.def||5)),
    mag:Math.max(0,Number(data.mag||0)),spd:Math.max(1,Number(data.spd||5)),
    role:data.role||((data.mag||0)>(data.atk||0)?"caster":"attacker")};
}
function start(data){
  const a=(data.allies||[]).slice(0,4).map((x,i)=>unit(x,"ally",i));
  const e=(data.enemies||[]).slice(0,6).map((x,i)=>unit(x,"enemy",i));
  if(!a.length||e.length<1)throw Error("A squad needs allies and enemies");
  return {allies:a,enemies:e,order:ORDERS.includes(data.order)?data.order:"balanced",round:0,
    log:[],result:null};
}
function setOrder(state,order){if(!ORDERS.includes(order))throw Error("Unknown order");return {...state,order};}
function advance(state,random=Math.random){
  if(state.result)return state;
  const s={...state,allies:state.allies.map(x=>({...x})),enemies:state.enemies.map(x=>({...x})),log:[...state.log]};
  const alive=list=>list.filter(u=>u.hp>0);
  const actors=[...alive(s.allies),...alive(s.enemies)].sort((a,b)=>b.spd-a.spd||(a.side==="ally"?-1:1));
  s.round++;
  for(const actor of actors){
    if(actor.hp<=0)continue;
    const foes=alive(actor.side==="ally"?s.enemies:s.allies);
    const friends=alive(actor.side==="ally"?s.allies:s.enemies);
    if(!foes.length)break;
    const isAlly=actor.side==="ally";
    const order=isAlly?s.order:"balanced";
    const injured=friends.filter(u=>u.hp/u.maxHp<0.75).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    // Healing or caster role can heal a weakened ally when strategy permits.
    if(injured.length && actor.mag>0 && actor.mp>=6 &&
      (actor.role==="healer" || order==="heal") &&
      (order==="heal" || injured[0].hp/injured[0].maxHp<0.4)){
      const target=injured[0];
      const gain=Math.min(target.maxHp-target.hp,Math.max(1,Math.round(actor.mag*.65)));
      actor.mp-=6;target.hp+=gain;
      s.log.push(actor.name+" → "+target.name+" 回復 +"+gain);
      continue;
    }
    let target;
    if(order==="assault") target=[...foes].sort((a,b)=>a.hp-b.hp)[0];
    else target=[...foes].sort((a,b)=>Math.floor(a.slot/3)-Math.floor(b.slot/3)||a.hp-b.hp)[0];
    const front=Math.floor(target.slot/3)===0;
    const rear=Math.floor(actor.slot/3)===2;
    const cast=actor.mag>actor.atk*1.2 && actor.mp>=5 && order!=="defend";
    const mult=order==="assault"?1.25:order==="defend"?.75:1;
    const base=cast?actor.mag*1.3:actor.atk*(rear?.8:1);
    const defense=cast?target.def*.3:target.def*.65;
    const damage=Math.max(1,Math.round((base-defense)*mult+(random()-.5)*6));
    if(cast)actor.mp-=5;
    target.hp=Math.max(0,target.hp-damage);
    s.log.push(actor.name+(cast?" ✨":" ⚔️")+" → "+target.name+" -"+damage+(front?"":" [後衛]"));
  }
  if(!alive(s.enemies).length)s.result="victory";
  else if(!alive(s.allies).length)s.result="defeat";
  s.log=s.log.slice(-24);
  return s;
}
root.BraveDungeonSquad={start,setOrder,advance,ORDERS};
})(typeof window!=="undefined"?window:globalThis);
