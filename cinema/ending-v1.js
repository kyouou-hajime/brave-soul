/* BRAVE SOUL — ending cinematics v1, independent of saved data. */
(function(global){
"use strict";
const scenes={
 ending:[
  ["⚔️","終わりの地","長い旅路の果てに、ひとつの物語が幕を閉じる。"],
  ["🌅","新しい朝","夜明けは静かに訪れた。\n歩んだ百日のすべてが、この世界に刻まれた。"],
  ["🕯️","魂の間","旅が終わっても、魂の記憶は消えない。\n次の旅人が、その光を受け継ぐ。"]
 ],
 trueEnding:[
  ["👑","崩れる玉座","最後の一撃が、世界を覆う闇を断ち切った。"],
  ["✨","共に戦った魂","共に歩んだ仲間たちが、青白い光に包まれる。\nそれぞれの魂が、勝利の証となった。"],
  ["🌄","夜明けの街","長い夜が終わり、世界に朝が訪れる。"],
  ["🕯️","受け継ぐ未来","魂は、死を超えて強くなる。\n勇者の物語は、次の旅人へ続いていく。"]
 ],
 gameover:[
  ["💀","倒れた旅人","戦場に、剣が落ちた。\n勝利へと伸ばした手は届かなかった。"],
  ["🌑","消えゆく灯火","守れなかったものが、闇の向こうへ遠ざかる。"],
  ["🕯️","それでも魂は残る","ひとつの魂が、静かに灯る。\n終わったのは、この命の旅だけだ。"]
 ],
 trueEndingLose:[
  ["👑","黒い玉座","王の前で、勇者は膝をついた。\n夜明けはまだ、訪れない。"],
  ["🌘","闇に沈む街","世界を覆う影は、さらに深さを増していく。"],
  ["🕯️","次の旅人へ","けれど魂の記憶は、敗北に消されない。\nいつか再び、扉は開かれる。"]
 ]
};
function Cinema(props){
 const R=global.React,h=R.createElement;
 const [idx,setIdx]=R.useState(0);
 const all=scenes[props.kind]||scenes.gameover;
 const s=all[idx],end=idx===all.length-1;
 const advance=()=>end?props.onDone():setIdx(i=>i+1);
 R.useEffect(()=>{const t=setTimeout(advance,6500);return()=>clearTimeout(t);},[idx]);
 const endClass=props.kind==="gameover"||props.kind==="trueEndingLose"?" defeated":" victorious";
 return h("div",{className:"bs-film"+endClass},
  h("div",{className:"bs-film-top"},
   h("strong",null,"BRAVE SOUL"),
   h("button",{type:"button",onClick:props.onDone},"スキップ ≫")),
  h("div",{className:"bs-film-stage",key:idx,onClick:advance,role:"button",tabIndex:0,
   onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();advance();}}},
   h("div",{className:"bs-film-emblem"},s[0]),
   h("div",{className:"bs-film-chapter"},s[1]),
   h("div",{className:"bs-film-rule"}),
   h("p",{className:"bs-film-dialogue"},s[2]),
   end?h("div",{className:"bs-film-hero"},"―― "+(props.name||"旅人")+"の物語 ――"):null),
  h("div",{className:"bs-film-bottom"},
   h("span",null,"SCENE "+(idx+1)+" / "+all.length),
   h("button",{type:"button",onClick:advance},end?"結果画面へ":"次へ ›")));
}
global.BraveEndingFilm={Cinema};
})(window);
