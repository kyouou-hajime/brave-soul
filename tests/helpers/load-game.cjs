const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
async function loadGame(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 let result='',error='';
 const status={set textContent(v){error=v}};
 const context={fetch:async()=>({ok:true,text:async()=>fs.readFileSync(path.join(root,'legacy.html'),'utf8')}),document:{open(){},write(s){result=s},close(){},getElementById(){return status}},console};
 await vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 if(error||!result)throw Error(error||'No game generated');
 for(const m of result.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
 return result;
}
module.exports={loadGame,root};
if(require.main===module)loadGame().then(s=>fs.writeFileSync('/tmp/brave-effective.html',s));
