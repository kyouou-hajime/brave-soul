const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/game-harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
async function setup(){const h=await harness();h.render();h.set('char',h.eval('BASE_CHAR("遠征検証")'));h.set('jm',h.eval('BASE_JM()'));h.set('phase','main');h.render();return h;}
test('old saves open campaign from the actual main menu without changing day, mastery or job',async()=>{
 const h=await setup();const c=plain(h.get('char')),j=plain(h.get('jm')),day=h.get('day');
 const text=n=>typeof n==='object'?(n.children||[]).map(text).join(''):String(n||'');
 const b=h.nodes(h.render(),n=>n.type==='button'&&text(n).includes('七つの封印'))[0];assert.ok(b);b.props.onClick();
 const screen=h.render();assert.equal(screen.type,h.ctx.BraveChronicle.Screen);assert.equal(screen.props.souls.length,0);
 assert.deepEqual(plain(h.get('char')),c);assert.deepEqual(plain(h.get('jm')),j);assert.equal(h.get('day'),day);
 screen.props.onBack();assert.equal(h.get('phase'),'main');
});
test('region/day and sequential stage gates prevent skipped or repeated rewards',async()=>{
 const h=await setup(),W=h.ctx.BraveChronicle,c=h.get('char'),r=W.REGIONS;
 assert.equal(W.unlocked(W.data(c),r[0],0,1),true);assert.equal(W.unlocked(W.data(c),r[0],1,1),false);
 assert.equal(W.begin(c,r[1],0,150,c,[],'ward'),c);
 const prior={...c,chronicle:{cleared:['verdant:0','verdant:1','verdant:2'],claimed:[]}};
 assert.equal(W.unlocked(W.data(prior),r[1],0,11),false);assert.equal(W.unlocked(W.data(prior),r[1],0,12),true);
 assert.equal(W.begin(prior,r[0],0,150,c,[],'ward'),prior);
 assert.equal(W.begin({...c,hunger:0},r[0],0,1,c,[],'ward').chronicle,undefined);
});
test('21 missions can be completed in sequence; reward and contract are collected only once',async()=>{
 const h=await setup(),W=h.ctx.BraveChronicle;let c={...h.get('char'),hp:99999,maxHp:99999,atk:99999,mag:99999,def:99999,spd:99999,hunger:10000};
 for(const r of W.REGIONS)for(let s=0;s<3;s++){
  const before=c.gold||0;c=W.begin(c,r,s,150,c,[],'assault');assert.ok(c.chronicle.active);
  for(let i=0;i<10&&!c.chronicle.active.squad.result;i++)c=W.round(c,'assault',()=>.5);
  assert.equal(c.chronicle.active.squad.result,'victory');c=W.settle(c,false);assert.ok(c.gold>before);
  const gold=c.gold;assert.equal(W.settle(c,false).gold,gold);assert.equal(W.begin(c,r,s,150,c,[],'ward'),c);
 }
 assert.equal(c.chronicle.cleared.length,21);
 for(const q of W.CONTRACTS){const before=c.gold;c=W.claim(c,q.n);assert.equal(c.gold,before+q.gold);assert.equal(W.claim(c,q.n),c);}
 assert.equal(c.chronicle.claimed.length,4);
});
test('real save serializer and autosave/load retain active round, unlocks and claimed rewards',async()=>{
 const h=await setup(),W=h.ctx.BraveChronicle;let c=W.begin(h.get('char'),W.REGIONS[0],0,1,{atk:3,def:3,mag:3,spd:3},[],'ward');
 c=W.round(c,'balanced',()=>.5);h.set('char',c);h.set('phase','worldChronicle');const screen=h.render();screen.props.onChange(c);
 const save=JSON.parse(h.storage.get('lgm_current'));assert.deepEqual(plain(save.char.chronicle),plain(c.chronicle));
 h.set('saves',[save]);h.set('char',h.eval('BASE_CHAR("load")'));h.set('phase','main');h.render();await h.ctx.early.doLoad(0);
 assert.deepEqual(plain(h.get('char').chronicle),plain(c.chronicle));assert.equal(h.render().type,W.Screen);
 h.ctx.c=c;const code=h.eval('makeSlimSave(c,BASE_JM(),1,100)');assert.deepEqual(plain(code.char.chronicle),plain(c.chronicle));
 assert.equal(W.data(h.eval('BASE_CHAR("旧データ")')).cleared.length,0);
});
test('retreat and defeat preserve a living hero and grant no reward; preparation buffs never change base stats',async()=>{
 const h=await setup(),W=h.ctx.BraveChronicle,c=h.get('char');
 for(const approach of ['assault','ward','renew']){
  const started=W.begin({...c,hp:1},W.REGIONS[0],0,1,c,[],approach);const end=W.settle(started,true);
  assert.ok(end.hp>=1);assert.equal(end.atk,c.atk);assert.equal(end.def,c.def);assert.equal(end.mag,c.mag);assert.equal(end.gold,c.gold||0);assert.equal(end.hunger,c.hunger-8);assert.equal(end.chronicle.active,null);
 }
 let weak={...c,hp:1,maxHp:1,atk:1,def:0,mag:0,spd:1};weak=W.begin(weak,W.REGIONS[0],0,1,weak,[],'ward');
 for(let i=0;i<60&&!weak.chronicle.active.squad.result;i++)weak=W.round(weak,'balanced',()=>.5);
 assert.equal(weak.chronicle.active.squad.result,'defeat');weak=W.settle(weak,false);assert.equal(weak.hp,1);assert.equal(weak.chronicle.cleared.length,0);
});
test('up to three bound souls join with distinct slots and existing combat stats',async()=>{
 const h=await setup(),W=h.ctx.BraveChronicle,c=h.get('char');const souls=Array.from({length:4},(_,i)=>({name:'魂'+i,soulId:'test'+i,atk:35,def:20,mag:10,spd:8,level:3}));
 const started=W.begin(c,W.REGIONS[0],0,1,{atk:123,def:50,mag:20,spd:12},souls,'assault'),sq=started.chronicle.active.squad;
 assert.equal(sq.allies.length,4);assert.equal(new Set(sq.allies.map(a=>a.slot)).size,4);assert.equal(sq.allies[0].atk,Math.round(123*1.15));
 assert.equal(W.claim(c,3),c);
});
