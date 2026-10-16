/* BRAVE SOUL: job skill effect interpreter for normal adventure battles.
   Pure function; does not touch saves, React or battles outside the caller. */
(function(global){
"use strict";
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min));
function execute(skill,char,enemy,stats,rand=Math.random){
  const c={...char},e={...enemy},log=[];
  const fx=skill.eff||skill.battle||{};
  const type=fx.t||fx.type||"phys",name=(skill.emoji||"✨")+" "+skill.name;
  const atk=Math.max(1,Number(stats.atk)||Number(c.atk)||1);
  const mag=Math.max(1,Number(stats.mag)||Number(c.mag)||1);
  const maxEnemy=Math.max(1,Number(e.hp)||Number(e.currentHp)||1);
  let dealt=0;
  function damage(raw,magical=false,pierce=false){
    const armor=pierce?0:Math.max(0,(Number(e.def)||0)*(1+(e._defDebuf||0)))*(magical?.25:.35);
    const cap=e.hitCap?Math.max(1,Math.floor(maxEnemy*e.hitCap)):Infinity;
    const value=Math.min(cap,(raw<=0?0:Math.max(1,Math.round(raw-armor))));
    e.currentHp=Math.max(0,(Number(e.currentHp)||0)-value);
    dealt+=value;
  }
  function heal(pct){
    const max=Math.max(1,Number(c.maxHp)||Number(c.hp)||1);
    const before=Number(c.hp)||0;
    c.hp=clamp(before+Math.round(max*pct),0,max);
    log.push("💚 "+name+" HP+"+(c.hp-before));
  }
  function buff(kind,value,turns){
    c["_"+kind+"Buf"]=Number(value)||0;
    c["_"+kind+"BufTurns"]=Math.max(1,Number(turns)||2);
  }
  function evade(value,turns){
    c._evaBonus=Math.max(0,Number(value)||0);
    c._evaTurns=Math.max(1,Number(turns)||1);
  }
  if(fx.costHpPct || fx.selfDmgPct){
    const cost=Math.floor(fx.costHpPct?(c.maxHp||1)*fx.costHpPct:atk*fx.selfDmgPct);
    c.hp=Math.max(1,(c.hp||1)-cost);
    log.push("💢 HP-"+cost);
  }
  if(type==="phys"||type==="multi"||type==="phys_low_hp"||
     type==="mag"||type==="magic"||type==="blend"||type==="blend_multi"){
    let hits=(type==="multi"||type==="blend_multi")?Math.max(1,fx.hits||2):Math.max(1,fx.hits||1);
    let scale=Number(fx.v??fx.mult??1.5);
    if(fx.evaBonus===true)scale=1.8*(1+(c._evaBonus||0));
    if(type==="phys_low_hp"){const ratio=clamp((c.hp||0)/Math.max(1,c.maxHp||1),0,1);scale=(fx.maxV||4)-((fx.maxV||4)-(fx.baseV||2))*ratio;}
    if(fx.lowHpBonus && (c.hp||0)<=c.maxHp*(fx.lowHpBonus.threshold||.5))scale*=fx.lowHpBonus.bonus||1;
    const magical=type==="mag"||type==="magic";
    const blended=type==="blend"||type==="blend_multi";
    if(fx.crit || fx.forceCrit || rand()<(c._critBuf||0))scale*=1.5;
    if(fx.cfBonus)scale*=1+(c.cf||0)*fx.cfBonus;
    if(fx.elemBonus)scale*=fx.elemBonus[e.element]||fx.elemBonus.all||1;
    if(fx.missChance && rand()<fx.missChance){scale=0;c.allInMissedThisBattle=true;log.push("🎲 外れ！");}
    for(let i=0;i<hits;i++)damage((blended && skill.job==="holyking" ? atk*2.5+mag : (blended?(atk+mag):magical?mag:atk)*scale),magical,!!(fx.pierce||fx.ignDef));
    if(fx.selfHealPct)heal(fx.selfHealPct);
    if(fx.stun && rand()<(fx.stun.chance||0)){e._stunned=fx.stun.turns||1;log.push("💫 敵はスタン！");}
    if(fx.debuf?.def){e._defDebuf=fx.debuf.def;log.push("🛡️ 敵の防御が低下");}
    if(typeof fx.evaBonus==="number")evade(fx.evaBonus,fx.evaTurns||1);
  }else if(type==="heal"){heal(fx.healPct||.3);if(fx.allBuf)buff("atk",fx.allBuf,fx.turns||2);if(fx.cleanse){c._poisonTurns=0;c._curseTurns=0;}}
  else if(type==="full_heal"){c.hp=c.maxHp;log.push("💚 "+name+" HP全回復");if(fx.allBuf)buff("atk",fx.allBuf,fx.turns);if(fx.defBuf)buff("def",fx.defBuf,fx.turns);}
  else if(type==="gold_heal"){c.gold=(c.gold||0)+(fx.gold||0);heal((fx.heal||0)/Math.max(1,c.maxHp||1));log.push("💰 GOLD+"+(fx.gold||0));}
  else if(type==="def_buf"){buff("def",fx.v||fx.defBuf||.25,fx.turns);log.push("🛡️ "+name+" 防御強化");}
  else if(type==="gold_def"){if((c.gold||0)>=(fx.goldCost||0)){c.gold-=fx.goldCost||0;buff("def",fx.defBuf||.5,fx.turns);log.push("🛡️ "+name+" GOLD消費で防御強化");}else log.push("💰 GOLDが足りない");}
  else if(type==="atk_buf"||type==="all_buf"||type==="general_buf"){
    buff("atk",fx.atk||fx.atkBuf||fx.v||.2,fx.turns);
    if(type!=="atk_buf")buff("def",fx.def||fx.v||.15,fx.turns);
    if(fx.healPct)heal(fx.healPct);
    log.push("✨ "+name+" 能力強化");
  }else if(type==="eva_buf"||type==="first_buf"||type==="focus_buf"||type==="phantom_form"){
    evade(fx.eva||1,fx.turns);
    if(type==="focus_buf")buff("crit",fx.crit||.3,fx.turns);
    if(type==="phantom_form"){c._phantomForm=true;c._phantomTurns=fx.turns||3;}
    log.push("🌫️ "+name+" 回避強化");
  }else if(type==="fate_shift"||type==="fate_guard"){
    if(type==="fate_shift"){e._stunned=1;if(rand()<(fx.reActChance||0))c._reAct=true;}
    else c._deathGuard=true;
    if(fx.healPct)heal(fx.healPct);
    if(fx.defBuf)buff("def",fx.defBuf,fx.turns);
    log.push("🔮 "+name+" 運命の加護");
  }else if(type==="beast_form"||type==="berserker_buf"){
    buff("atk",fx.atkBuf??((fx.atkHit||1.5)-1),fx.turns);
    buff("spd",fx.spdBuf||.5,fx.turns);
    log.push("🐺 "+name+" 変身・強化");
  }else if(type==="ms_scale"){
    buff("atk",(fx.atkBuf||.2)+(fx.scalePerMs||0)*Object.keys(c.inheritedSkills||{}).length,fx.atkTurns||3);
    log.push("🌟 "+name+" 継承の力");
  }else if(type==="gold_attack"){
    damage(Math.min(c.gold||0,9999)*.1+(c.luc||10)*2);
  }else if(type==="random_atk"){
    const scale=(fx.minV||1)+rand()*((fx.maxV||5)-(fx.minV||1));
    damage(atk*scale);
  }else if(type==="instant_kill"){
    if(rand()<(fx.chance||.2) && !e.isBoss){e.currentHp=0;dealt=maxEnemy;log.push("💀 "+name+" 即死成功！");}
    else damage(atk*(fx.fallback?.v||2));
  }else if(type==="gamble"){
    const success=rand()<.5;
    const scale=success?(fx.succMult??3):(fx.failMult??.5);
    damage(atk*scale);
    log.push(success?"🎲 大当たり！":"🎲 外れ！");
  }else if(type==="buff"){
    if(fx.buffEva)evade(fx.buffEva/100,fx.turns);
    if(fx.buffAll)for(const k of ["atk","def","mag","spd","luc"])buff(k,fx.buffAll,fx.turns);
    if(fx.buffDmgRed)buff("def",fx.buffDmgRed/100,fx.turns);log.push("🛡️ "+name+" 防御強化");
  }else if(type==="special"){
    if(fx.instakill && rand()<(fx.instakillChance||.2) && !e.isBoss){e.currentHp=0;dealt=maxEnemy;}
    else if(fx.dodgeNext)evade(1,1);
    else if(fx.healPct)heal(fx.healPct);
    else damage(atk*(fx.failMult||1));
  }else if(type==="bluff"){evade(fx.eva||.4,fx.turns||1);log.push("🎭 "+name+" 敵を惑わせた");}
  else if(type==="shingan"){evade(fx.eva||.4,fx.turns||1);buff("crit",fx.crit||.3,fx.turns);log.push("👁️ "+name+" 見切り");}
  else if(type==="counter_guard"){buff("def",fx.defBuf||.5,fx.turns);log.push("🛡️ "+name+" 反撃態勢");}
  else if(type==="debuf_both"){e._defDebuf=-Math.abs(fx.def||.25);log.push("🌑 "+name+" 敵を弱体化");}
  else if(type==="dropBonus"||type==="critRate"||type==="deathGuard"){buff("crit",fx.crit||.2,fx.turns||1);log.push("✨ "+name+" 特殊能力を発動");}
  else {log.push("⚠️ "+name+" 未対応の効果: "+type);}
  if(fx.allBuf || type==="all_buf")for(const k of ["atk","def","mag","spd","luc"])buff(k,fx.allBuf||fx.v,fx.turns);
  if(fx.spd || fx.spdBuf || (typeof fx.spdBonus==="number"))buff("spd",fx.spd||fx.spdBuf||(fx.spdBonus===2?1:fx.spdBonus),fx.turns);
  if(fx.cleanse){c._poisonTurns=0;c._curseTurns=0;c._stunned=0;for(const k of ["atk","def","mag","spd"])if(c["_"+k+"Debuf"]<0)c["_"+k+"Debuf"]=0;}
  if(fx.debuf)for(const k of ["atk","def","mag","spd"])if(fx.debuf[k]){e["_"+k+"Debuf"]=fx.debuf[k];e["_"+k+"DebufTurns"]=fx.debuf.turns||2;}
  if(fx.spdDebuf){e._spdDebuf=fx.spdDebuf.v;e._spdDebufTurns=fx.spdDebuf.turns;}
  if(fx.curse){e._cursePct=fx.curse.hpDrainPct;e._curseTurns=fx.curse.turns||3;}
  if(fx.dmgTaken){const target=typeof fx.dmgTaken==="number"?c:e;target._dmgTaken=typeof fx.dmgTaken==="number"?fx.dmgTaken:fx.dmgTaken.v;target._dmgTakenTurns=fx.dmgTaken.turns||fx.turns||2;}
  if(fx.counter){c._counter=fx.counter;c._counterTurns=fx.turns||2;}
  if(fx.reAct)c._reActNext=true;
  if(fx.first || fx.preemptive){c._firstBonus=fx.first===true||fx.preemptive?1:fx.first;c._firstTurns=fx.turns||1;}
  if(dealt>0 && c._phantomForm){c._phantomForm=false;c._phantomTurns=0;c._evaBonus=0;c._evaTurns=0;}
  if(dealt>0 && (fx.drain||fx.lifestealPct)){const h=Math.round(dealt*(fx.drain||fx.lifestealPct));c.hp=Math.min(c.maxHp,c.hp+h);log.push("💚 吸収 +"+h);}
  if(dealt>0)log.push(name+"！ "+Math.round(dealt)+"ダメージ");
  return {character:c,enemy:e,log,damage:dealt,type};
}
function stats(c,base=c){const out={...base};for(const k of ["atk","def","mag","spd","luc"])out[k]=(base[k]||0)*(1+(c["_"+k+"Buf"]||0))*(1+(c["_"+k+"Debuf"]||0));return out;}
function tick(c){const n={...c};for(const k of Object.keys(n)){if(k.endsWith("Turns") && n[k]>0){n[k]--;if(!n[k]){if(k==="_evaTurns")n._evaBonus=0;else if(k==="_curseTurns")n._cursePct=0;else n[k.slice(0,-5)]=0;}}}return n;}
function receive(c,raw,rand=Math.random){const n={...c};let d=Math.max(0,Math.round(raw*(1+(n._dmgTaken||0))));if(rand()<(n._evaBonus||0))d=0;if(d>=n.hp&&n._deathGuard){n._deathGuard=false;d=0;}n.hp=Math.max(0,n.hp-d);return {character:n,damage:d};}
global.BraveJobSkill={execute,stats,tick,receive,cost:skill=>skill.mp??skill.mpCost??0};
})(window);
