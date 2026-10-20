const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/game-harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
async function setup(){const h=await harness();h.render();h.set('char',h.eval('BASE_CHAR("検証")'));h.set('jm',h.eval('BASE_JM()'));h.set('phase','main');h.render();return h}
const text=n=>!n?'':typeof n==='object'?(n.children||[]).map(text).join(''):String(n);
function button(h,tree,label){const b=h.nodes(tree,n=>n.type==='button'&&text(n).includes(label))[0];assert.ok(b,label);return b}
function rng(h,values){let i=0;h.ctx.Math.random=()=>values[Math.min(i++,values.length-1)]}
function dungeon(h,type){h.set('dungeon',{W:1,H:1,grid:[[{type,visited:false}]],playerPos:{x:0,y:0},reward:{exp:1,gold:10}});h.set('dungeonBattle',{enemy:{hp:1,currentHp:1,def:0,atk:0,reward:1,name:'test',emoji:''},charHp:80,charMp:25});h.set('phase','main');h.render()}
test('assembled loader compiles; every weapon has finite positive purchase price',async()=>{const h=await setup();const prices=h.eval('Object.values(WEAPONS).map(w=>Math.round(((w.atk||0)+(w.mag||0)*1.5+(w.luc||0)*2)*80+200))');assert.ok(prices.length>0);assert.ok(prices.every(p=>Number.isFinite(p)&&p>0));});
test('purchase charges once, adds inventory, preserves old equipped-only weapon and persists',async()=>{
 const h=await setup();const old=h.get('char').weapon;h.set('char',{...h.get('char'),gold:100000});h.set('phase','shop');let tree=h.render();
 const b=h.nodes(tree,n=>n.type==='button'&&/^\d+G$/.test(text(n))).at(-1);assert.ok(b);const cost=parseInt(text(b));b.props.onClick();const bought=h.get('char').weapon;
 assert.notEqual(bought,old);assert.equal(h.get('char').gold,100000-cost);assert.ok(h.get('char').inventory.includes(old));assert.ok(h.get('char').inventory.includes(bought));
 b.props.onClick();assert.equal(h.get('char').gold,100000-cost);h.render();h.flush();const save=JSON.parse(h.storage.get('lgm_current'));assert.equal(save.char.weapon,bought);assert.equal(save.char.subEquip,h.get('char').subEquip);
});
test('equipment supports legacy inventory, skill permissions, effective stats, unequip and reload',async()=>{
 const h=await setup();const old=h.get('char').weapon;h.set('char',{...h.get('char'),inventory:[],jobSkills:{warrior_pro:true},learnedSkills:{sub_staff:true},equippedSkills:['warrior_mas']});h.set('phase','equipment');let props=h.render().props;
 assert.equal(props.stats.atk,h.eval('effectiveStats(BASE_CHAR("検証"),BASE_JM()).atk'));assert.ok(props.canEquip('w_wood_staff'));
 props.onEquip(null);assert.ok(h.get('char').inventory.includes(old));assert.equal(h.get('char').weapon,null);
 props=h.render().props;props.onEquip(old);assert.equal(h.get('char').weapon,old);props.onEquip('made_up');assert.equal(h.get('char').weapon,old);
 h.render();h.flush();const save=JSON.parse(h.storage.get('lgm_current'));h.set('saves',[save]);h.set('phase','main');h.render();await h.ctx.early.doLoad(0);
 assert.equal(h.get('char').weapon,old);assert.equal(h.get('char').learnedSkills.sub_staff,true);assert.equal(h.get('char').jobSkills.warrior_pro,true);assert.deepEqual(plain(h.get('char').equippedSkills),['warrior_mas']);
});
test('day 100/150 equipment returns to preparation; boss receives effective stats',async()=>{
 const h=await setup();for(const d of [100,150]){h.set('day',d);h.set('maxDays',d);h.set('phase','equipment');h.render().props.onBack();assert.equal(h.get('phase'),d===100?'midBossPrep':'finalBossPrep');}
 h.set('day',1);h.set('phase','main');h.render();const expected=h.eval('effectiveStats(BASE_CHAR("検証"),BASE_JM())');h.ctx.early.startBoss({name:'test',hp:100,atk:1,def:1,mag:1,spd:1},[]);assert.equal(h.get('bossBattle').squad.allies[0].atk,expected.atk);
});
test('normal loot probability boundaries and 62% weapon branch use real inventory writes',async()=>{
 const h=await setup();h.ctx.c=h.get('char');h.ctx.en={treasure:.15};h.ctx.es={luc:10};h.ctx.bl=[];
 rng(h,[.439999,.619999,0]);const w=h.eval('rollBattleLoot(c,en,es,bl)');assert.equal(w.inventory.length,1);assert.equal(w.weapon,h.get('char').weapon);
 rng(h,[.44]);assert.equal(h.eval('rollBattleLoot(c,en,es,bl)').inventory.length,0);
 rng(h,[0,.62,0]);assert.equal(h.eval('rollBattleLoot(c,en,es,bl)').items.herb,1);
 h.ctx.en={treasure:1};rng(h,[.78]);assert.equal(h.eval('rollBattleLoot(c,en,es,bl)').inventory.length,0);
});
test('actual normal attack button awards loot and saves; cannot reward twice',async()=>{
 const h=await setup();h.set('phase','battle');h.set('battle',{enemy:{hp:1,currentHp:1,def:0,atk:0,exp:1,treasure:.15,name:'test',emoji:''},charHp:80,charMp:25});rng(h,[0]);let tree=h.render();await button(h,tree,'攻撃').props.onClick();assert.equal(h.get('char').inventory.length,1);assert.equal(JSON.parse(h.storage.get('lgm_current')).char.inventory.length,1);assert.equal(h.get('battle').won,true);assert.equal(h.nodes(h.render(),n=>n.type==='button'&&text(n)==='⚔️ 攻撃').length,0);
});
test('normal consumables render and can heal with the shared shop catalog',async()=>{
 const h=await setup();h.set('char',{...h.get('char'),hp:10,items:{herb:1}});h.set('phase','battle');h.set('battle',{enemy:{hp:999,currentHp:999,def:0,atk:1,name:'test',emoji:''},charHp:10,charMp:25});rng(h,[.5]);await button(h,h.render(),'やくそう').props.onClick();assert.equal(h.get('char').items.herb,0);assert.ok(h.get('char').hp>10);
});
test('chest 65% delivers weaker weapon without autoequip and cannot be collected twice',async()=>{
 const h=await setup();dungeon(h,'treasure');rng(h,[0,0,.64999,0]);await h.ctx.late.doDungeonAction('move:0:0');assert.equal(h.get('char').inventory.length,1);const weapon=h.get('char').weapon;h.render();rng(h,[0]);await h.ctx.late.doDungeonAction('move:0:0');assert.equal(h.get('char').inventory.length,1);assert.equal(h.get('char').weapon,weapon);
 const h2=await setup();dungeon(h2,'treasure');rng(h2,[0,0,.65]);await h2.ctx.late.doDungeonAction('move:0:0');assert.equal(h2.get('char').inventory.length,0);
});
test('dungeon 52% boundary and boss guaranteed consumable/save',async()=>{
 for(const [type,roll,expected] of [['battle',.51999,1],['battle',.52,0],['boss',.99999,1]]){const h=await setup();dungeon(h,type);rng(h,[.99,.5,roll,0]);await h.ctx.late.doDungeonAction('attack');assert.equal(Object.values(h.get('char').items||{}).reduce((a,b)=>a+b,0),expected);if(type==='boss')assert.ok(h.storage.get('lgm_current'));}
});
test('all existing job skill definitions still execute and normal UI skill path remains connected',async()=>{
 const h=await setup();const skills=h.eval('Object.values(JOB_SKILLS)');assert.equal(skills.length,88);
 for(const sk of skills){const r=h.ctx.BraveJobSkill.execute(sk,{...h.get('char'),hp:50,mp:100,maxMp:100},{hp:999,currentHp:999,def:5},{atk:30,mag:30},()=>.5);assert.ok(Number.isFinite(r.character.hp),sk.name);assert.ok(Number.isFinite(r.enemy.currentHp),sk.name);}
 h.set('char',{...h.get('char'),jobSkills:{warrior_pro:true},mp:100,maxMp:100});
 h.set('phase','battle');h.set('battle',{enemy:{hp:999,currentHp:999,def:0,atk:1,name:'test',emoji:''},charHp:80,charMp:100});rng(h,[.5]);
 await button(h,h.render(),'パワースラッシュ').props.onClick();assert.ok(h.get('battle').enemy.currentHp<999);assert.equal(h.get('char').mp,94);
});
test('boss preparation shop purchase and return consume no days; insufficient gold cannot purchase',async()=>{
 for(const day of [100,150]){const h=await setup();h.set('day',day);h.set('maxDays',day);h.set('phase',day===100?'midBossPrep':'finalBossPrep');h.set('char',{...h.get('char'),gold:100000});button(h,h.render(),'武器・道具購入').props.onClick();let tree=h.render();const buy=h.nodes(tree,n=>n.type==='button'&&/^\d+G$/.test(text(n))).at(-1);buy.props.onClick();h.render();h.flush();button(h,h.render(),'戻る').props.onClick();assert.equal(h.get('phase'),day===100?'midBossPrep':'finalBossPrep');assert.equal(h.get('day'),day);assert.equal(JSON.parse(h.storage.get('lgm_current')).day,day);}
 const h=await setup();h.set('phase','shop');const b=h.nodes(h.render(),n=>n.type==='button'&&/^\d+G$/.test(text(n))).at(-1);assert.equal(b.props.disabled,true);const before=plain(h.get('char'));b.props.onClick();assert.deepEqual(plain(h.get('char')),before);
});
test('equipment and purchases preserve duplicate weapon drops',async()=>{
 const h=await setup();const old=h.get('char').weapon;h.set('char',{...h.get('char'),inventory:[old,old],gold:100000});h.set('phase','equipment');h.render().props.onEquip(null);assert.equal(h.get('char').inventory.length,2);h.set('phase','shop');const b=h.nodes(h.render(),n=>n.type==='button'&&/^\d+G$/.test(text(n))).at(-1);b.props.onClick();assert.equal(h.get('char').inventory.filter(id=>id===old).length,2);
});
