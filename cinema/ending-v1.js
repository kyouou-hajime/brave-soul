/* BRAVE SOUL cinematic endings v2 — CSS-animated stage, no video downloads. */
(function(global){
"use strict";
const SCENES={
 midBossVictory:[
  {world:"battle",title:"影の将軍、倒れる",line:"最後の一撃とともに、戦場に沈黙が戻った。"},
  {world:"souls",title:"生き残った魂",line:"共に立ち向かった魂が、淡い光を放つ。\nまだ終わりではない。"},
  {world:"dawn",title:"旅はさらに続く",line:"新しい道が開かれる。\nそして、遥か先には真の魔王が待っている。"}
 ],

 ending:[
  {world:"battle",title:"長い旅の終わり",line:"幾度の夜を越え、旅人はここに立つ。"},
  {world:"dawn",title:"世界が目覚める",line:"暗い空に、ひとすじの朝日が差し込んだ。"},
  {world:"souls",title:"魂は受け継がれる",line:"その記憶は、次の旅人を照らす灯になる。"}
 ],
 trueEnding:[
  {world:"throne",title:"魔王の玉座",line:"最後の一撃が、永遠にも思えた闇を裂いた。"},
  {world:"shatter",title:"王冠が砕ける",line:"砕けた王冠は、星のような光となって消えていく。"},
  {world:"souls",title:"共に歩んだ魂",line:"倒れずにここまで来られたのは、一人ではなかったから。"},
  {world:"dawn",title:"夜明け",line:"閉ざされた空が開き、世界は再び色を取り戻した。"},
  {world:"ember",title:"BRAVE SOUL",line:"魂は、死を超えて強くなる。\nそして物語は、次の時代へ。"}
 ],
 midBossVictory:[
  {world:"throne",title:"影の将軍、敗れる",line:"鋼の足音が止まり、戦場に沈黙が訪れる。"},
  {world:"shatter",title:"開かれる運命",line:"閉ざされていた道に、ひとすじの光が射した。"},
  {world:"dawn",title:"新たな試練へ",line:"百日の旅は、ここで終わらない。\nその先に待つ、真の魔王の気配を感じた。"}
 ],
 gameover:[
  {world:"battle",title:"最期の一撃",line:"その手から、剣が滑り落ちた。"},
  {world:"ruins",title:"消えゆく世界",line:"街に灯る光が、一つ、また一つと消えていく。"},
  {world:"ember",title:"残された魂",line:"だが、闇の底に小さな灯が残っていた。\n次の旅人を待ちながら。"}
 ],
 trueEndingLose:[
  {world:"throne",title:"魔王の前で",line:"勇者は、黒い玉座の前に膝をついた。"},
  {world:"ruins",title:"届かなかった夜明け",line:"世界はまた、深い夜の中へ沈む。"},
  {world:"ember",title:"それでも",line:"受け継がれる魂がある限り、物語は終わらない。"}
 ]
};
function Cinema(props){
 const R=global.React, h=R.createElement;
 const [index,setIndex]=R.useState(0);
 const scenes=SCENES[props.kind]||SCENES.gameover;
 const scene=scenes[index];
 const last=index===scenes.length-1;
 const advance=()=>{if(last)props.onDone();else setIndex(n=>n+1);};
 R.useEffect(()=>{
   const id=setTimeout(()=>{if(index>=scenes.length-1)props.onDone();else setIndex(n=>n+1);},7800);
   return()=>clearTimeout(id);
 },[index,props.kind]);
 const defeated=props.kind==="gameover"||props.kind==="trueEndingLose";
 return h("div",{className:"bs-cinema "+(defeated?"bs-lost":"bs-won")},
   h("div",{className:"bs-cinema-vignette"}),
   h("div",{className:"bs-cinema-scene bs-world-"+scene.world,key:index},
     h("div",{className:"bs-cinema-sky"}),
     h("div",{className:"bs-cinema-light"}),
     h("div",{className:"bs-cinema-moon"}),
     h("div",{className:"bs-cinema-spires"}),
     h("div",{className:"bs-cinema-mountain back"}),
     h("div",{className:"bs-cinema-mountain front"}),
     h("div",{className:"bs-cinema-throne"}),
     h("div",{className:"bs-cinema-warrior"}),
     h("div",{className:"bs-cinema-blade"}),
     h("div",{className:"bs-cinema-altar"}),
     h("div",{className:"bs-cinema-soul-orb"}),
     ...Array.from({length:24},(_,i)=>h("i",{key:i,className:"bs-cinema-particle",style:{"--i":i,"--x":((i*73)%93+4)+"%","--delay":((i*17)%39)/10+"s"}})),
     h("div",{className:"bs-cinema-flash"}),
     h("div",{className:"bs-cinema-letterbox top"}),
     h("div",{className:"bs-cinema-letterbox bottom"}),
     h("div",{className:"bs-cinema-caption"},
       h("div",{className:"bs-cinema-kicker"},defeated?"FALLEN SOUL":"THE SOUL ENDURES"),
       h("h2",null,scene.title),
       h("div",{className:"bs-cinema-rule"}),
       h("p",null,scene.line),
       last?h("div",{className:"bs-cinema-name"},"— "+(props.name||"旅人")+" —"):null)
   ),
   h("div",{className:"bs-cinema-controls"},
     h("span",null,"BRAVE SOUL　 •　 "+(index+1)+" / "+scenes.length),
     h("div",null,
       h("button",{type:"button",onClick:advance},last?"結果を見る":"次の場面へ ›"),
       h("button",{type:"button",className:"bs-cinema-skip",onClick:props.onDone},"スキップ ≫")
     )
   )
 );
}
global.BraveEndingFilm={Cinema};
})(window);
