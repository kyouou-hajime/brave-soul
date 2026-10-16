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
  return {...data,equippedSkills:[...(data.equippedSkills||[])].slice(0,6),skillBook:data.skillBook||{},_cooldowns:{...(data._cooldowns||{})},id:String(data.id||side+"-"+i),name:String(data.name||"???"),side,slot,
    job:data.job||"",element:data.element||null,emoji:data.emoji||"⚔️",
    maxHp,hp:clamp(Math.floor(Number(data.hp??maxHp)),0,maxHp),
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
  const s={...state,allies:state.allies.map(x=>({...x,_cooldowns:{...x._cooldowns}})),enemies:state.enemies.map(x=>({...x,_cooldowns:{...x._cooldowns}})),log:[...state.log]};
  const alive=list=>list.filter(u=>u.hp>0);
  const priority=u=>{const stat=root.BraveJobSkill?root.BraveJobSkill.stats(u).spd:u.spd;const first=(u.equippedSkills||[]).some(id=>{const sk=u.skillBook[id],f=sk&&(sk.eff||sk.battle);return sk && u.mp>=(root.BraveJobSkill?root.BraveJobSkill.cost(sk):0) && (f.first===true||f.preemptive);});return first?stat+100000:stat;};
  const actors=[...alive(s.allies),...alive(s.enemies)].sort((a,b)=>priority(b)-priority(a)||(root.BraveJobSkill?root.BraveJobSkill.stats(b).spd:b.spd)-(root.BraveJobSkill?root.BraveJobSkill.stats(a).spd:a.spd)||(a.side==="ally"?-1:1));
  s.round++;
  const extraDone=new Set();
  for(const actor of actors){
    if(actor.hp<=0)continue;
    if(actor._reActNext && !extraDone.has(actor.id)){actor._reActNext=false;extraDone.add(actor.id);actors.push(actor);}
    if(actor._stunned>0){actor._stunned--;s.log.push(actor.name+" スタンで行動不能");continue;}
    const foes=alive(actor.side==="ally"?s.enemies:s.allies);
    const friends=alive(actor.side==="ally"?s.allies:s.enemies);
    if(!foes.length)break;
    const isAlly=actor.side==="ally";
    const order=isAlly?s.order:"balanced";
    const injured=friends.filter(u=>u.hp/u.maxHp<0.75).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    let target;
    if(order==="assault") target=[...foes].sort((a,b)=>a.hp-b.hp)[0];
    else target=[...foes].sort((a,b)=>Math.floor(a.slot/3)-Math.floor(b.slot/3)||a.hp-b.hp)[0];
    const api=root.BraveJobSkill;
    if(api && isAlly){
      const skills=actor.equippedSkills.map(id=>({id,skill:actor.skillBook[id]})).filter(x=>x.skill && actor.mp>=api.cost(x.skill));
      const healing=x=>["heal","full_heal","gold_heal"].includes((x.skill.eff||x.skill.battle||{}).t||(x.skill.battle||{}).type);
      const usable=skills.filter(x=>{const f=x.skill.eff||x.skill.battle||{};if(healing(x))return actor.hp<actor.maxHp*(order==="heal"?.9:.6);if(f.goldCost>actor.gold)return false;if((actor._cooldowns[x.id]||0)>s.round)return false;return true;});
      const choices=order==="heal"?[...usable.filter(healing),...usable.filter(x=>!healing(x))]:usable;
      if(choices.length){
        const chosen=choices[(actor._skillCursor||0)%choices.length];actor._skillCursor=(actor._skillCursor||0)+1;
        const fx=chosen.skill.eff||chosen.skill.battle||{};
        actor.mp-=api.cost(chosen.skill);
        if(!["phys","multi","magic","mag","blend","blend_multi","instant_kill","phys_low_hp","gold_attack","random_atk","gamble"].includes(fx.t||fx.type))actor._cooldowns[chosen.id]=s.round+(fx.turns||2);
        const targets=fx.aoe?foes:[target];
        const casterBefore={...actor};
        for(const [targetIndex,victim] of targets.entries()){
          const result=api.execute(chosen.skill,casterBefore,{...victim,hp:victim.maxHp,currentHp:victim.hp},api.stats(actor),random);
          if(targetIndex===0)Object.assign(actor,result.character);Object.assign(victim,result.enemy,{hp:result.enemy.currentHp,maxHp:victim.maxHp});
          s.log.push(actor.name+" → "+victim.name+" "+result.log.join(" / "));
        }
        if(actor._reAct && !extraDone.has(actor.id)){actor._reAct=false;extraDone.add(actor.id);actors.push(actor);}
        continue;
      }
    }
    // Preserve the original strategy-based fallback when no equipped skill is usable.
    if(injured.length && actor.mag>0 && actor.mp>=6 &&
      (actor.role==="healer" || order==="heal") &&
      (order==="heal" || injured[0].hp/injured[0].maxHp<0.4)){
      const target=injured[0];const gain=Math.min(target.maxHp-target.hp,Math.max(1,Math.round(actor.mag*.65)));
      actor.mp-=6;target.hp+=gain;s.log.push(actor.name+" → "+target.name+" 回復 +"+gain);continue;
    }
    const front=Math.floor(target.slot/3)===0;
    const rear=Math.floor(actor.slot/3)===2;
    const cast=actor.mag>actor.atk*1.2 && actor.mp>=5 && order!=="defend";
    const mult=order==="assault"?1.25:order==="defend"?.75:1;
    const ast=root.BraveJobSkill?root.BraveJobSkill.stats(actor):actor;
    const tst=root.BraveJobSkill?root.BraveJobSkill.stats(target):target;
    const base=cast?ast.mag*1.3:ast.atk*(rear?.8:1);
    const defense=cast?tst.def*.3:tst.def*.65;
    const damage=Math.max(1,Math.round((base-defense)*mult+(random()-.5)*6));
    if(cast)actor.mp-=5;
    if(root.BraveJobSkill){const r=root.BraveJobSkill.receive(target,damage,random);Object.assign(target,r.character);if(r.damage>0 && random()<(target._counter||0)){const back=root.BraveJobSkill.receive(actor,root.BraveJobSkill.stats(target).atk,random);Object.assign(actor,back.character);s.log.push(target.name+" 反撃 -"+back.damage);}
    if(r.damage===0)s.log.push(target.name+" 回避・無効化");}
    else target.hp=Math.max(0,target.hp-damage);
    s.log.push(actor.name+(cast?" ✨":" ⚔️")+" → "+target.name+" -"+damage+(front?"":" [後衛]"));
  }
  if(root.BraveJobSkill)for(const u of [...s.allies,...s.enemies]){
    if(u.hp>0 && u._curseTurns>0){const d=Math.round(u.maxHp*(u._cursePct||0));u.hp=Math.max(0,u.hp-d);s.log.push(u.name+" 呪い -"+d);}
    Object.assign(u,root.BraveJobSkill.tick(u));
  }
  if(!alive(s.enemies).length)s.result="victory";
  else if(!alive(s.allies).length)s.result="defeat";
  s.log=s.log.slice(-24);
  return s;
}
root.BraveDungeonSquad={start,setOrder,advance,ORDERS};
})(typeof window!=="undefined"?window:globalThis);
