// Executes the real assembled game with a minimal React hook host (not a browser).
const vm=require('node:vm'),fs=require('node:fs');
const {loadGame,root}=require('./load-game.cjs');
async function harness(){
 const html=await loadGame();
 const states=[],effects=[],timers=[],storage=new Map(); let cursor=0;
 const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)}),Fragment:'fragment',
 useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},
 useMemo:f=>f(),useEffect:f=>effects.push(f),useRef:v=>({current:v}),useCallback:f=>f};
 const ctx=vm.createContext({React,ReactDOM:{createRoot:()=>({render(){}})},console,Date,Math:Object.create(Math),
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 document:{getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}}},setTimeout:(f)=>{timers.push(f);return timers.length},clearTimeout(){},setInterval(){},clearInterval(){},navigator:{},
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')});
 ctx.window=ctx;
 for(const name of ['dungeon/ogre-squad-v0.1.js','dungeon/boss-squad-addon.js','combat/job-skills-v1.js','ui/equipment-tactical-v1.js'])vm.runInContext(fs.readFileSync(root+'/'+name,'utf8'),ctx);
 let script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function App()'));
 // Capture closure functions only in test execution, never in the distributed game.
 script=script.replace('  // ── INTRO','  window.early={doBattle,startBoss,doLoad,doAutoSave};\n  // ── INTRO');
 script=script.replace('  // ── MAIN SCREEN (default)','  window.late={doDungeonAction};\n  // ── MAIN SCREEN (default)');
 // Discover hook state positions from real declarations, including added hooks.
 const appPrefix=script.slice(script.indexOf('function App()'),script.indexOf('// ── useMemo:'));
 const names={bsFilmSeen:0}; let index=1;
 for(const m of appPrefix.matchAll(/(?:const|,)\s*(_useState\w*)\s*=\s*(?:React\.)?useState\(/g)){
   const rest=appPrefix.slice(m.index),name=rest.match(/\b(\w+)\s*=\s*\w+\[0\]/); if(name)names[name[1]]=index; index++;
 }
 vm.runInContext(script,ctx);
 return {ctx,names,states,storage,timers,effects,eval:s=>vm.runInContext(s,ctx),set(name,value){if(!(name in names))throw Error(name);states[names[name]]=value},get:name=>states[names[name]],
 render(){cursor=0;effects.length=0;return vm.runInContext('App()',ctx)},flush(){for(const f of effects.splice(0))f()},
 nodes(tree,pred){const out=[];function walk(n){if(!n||typeof n!=='object')return;if(pred(n))out.push(n);for(const c of n.children||[])walk(c)}walk(tree);return out}
 };
}
module.exports={harness};
