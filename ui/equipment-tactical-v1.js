/* BRAVE SOUL — tactical inventory and equipment screen (original UI, classic squad-RPG inspired). */
(function(root){
"use strict";
const h=(...args)=>root.React.createElement(...args);
function Equipment(props){
 const {char,jobName,weapons,canEquip,onEquip,onBack,jobTypes,stats,previewStats}=props;
 const [tab,setTab]=root.React.useState("usable");
 const held=new Set([...(char.inventory||[]),...(char.weapon?[char.weapon]:[])]);
 const entries=Object.entries(weapons).filter(([id])=>held.has(id));
 const filtered=entries.filter(([id])=>tab==="all"||canEquip(id));
 const shown=stats||char;
 const equipped=weapons[char.weapon]||null;
 const stat=(w,key)=>Number(w?.[key])||0;
 const entriesSorted=filtered.sort(([a],[b])=>(b===char.weapon)-(a===char.weapon));
 const panel=(...children)=>h("section",{className:"bs-equip-panel"},...children);
 const statCell=(label,n)=>h("div",{className:"bs-equip-stat"},h("span",null,label),h("strong",null,n));
 const safeName=char.name||"旅人";
 return h("div",{className:"bs-equip-root"},
  h("header",{className:"bs-equip-header"},
    h("div",null,h("small",null,"BRAVE SOUL / ARSENAL"),h("h1",null,"⚔ 装備・編成")),
    h("button",{onClick:onBack},"← 戻る")),
  h("div",{className:"bs-equip-main"},
   h("div",{className:"bs-equip-left"},
    panel(
     h("div",{className:"bs-equip-emblem"},"♜"),
     h("div",{className:"bs-equip-character"},safeName),
     h("div",{className:"bs-equip-job"},jobName),
     h("div",{className:"bs-equip-statgrid"},
      statCell("ATK",shown.atk||0),statCell("DEF",shown.def||0),
      statCell("MAG",shown.mag||0),statCell("SPD",shown.spd||0),
      statCell("LUC",shown.luc||0),statCell("GOLD",char.gold||0))),
    panel(
      h("h2",null,"装備スロット"),
      h("div",{className:"bs-equip-slot"},
       h("span",null,"主武器"),
       h("strong",null,equipped?equipped.emoji+" "+equipped.name:"未装備"),
       equipped?h("button",{onClick:()=>onEquip(null)},"外す"):null),
      equipped?h("div",{className:"bs-equip-comparison"},
       "ATK +"+stat(equipped,"atk")+"　MAG +"+stat(equipped,"mag")+"　LUC +"+stat(equipped,"luc")):null,
      h("div",{className:"bs-equip-hint"},"装備可能種別: "+(jobTypes||[]).join(" / ")))
   ),
   h("div",{className:"bs-equip-right"},
    panel(
     h("div",{className:"bs-equip-inventory-title"},
      h("h2",null,"所持武器　"+entries.length+"点"),
      h("div",{className:"bs-equip-tabs"},
        h("button",{className:tab==="usable"?"selected":"",onClick:()=>setTab("usable")},"装備可能"),
        h("button",{className:tab==="all"?"selected":"",onClick:()=>setTab("all")},"すべて"))),
     filtered.length?h("div",{className:"bs-equip-list"},...entriesSorted.map(([id,w])=>{
       const use=canEquip(id),isEquipped=id===char.weapon;
       const next=previewStats?previewStats(id):null;
       const diff=(key)=>next?stat(next,key)-stat(shown,key):stat(w,key)-stat(equipped,key);
       const delta=(key)=>{const n=diff(key);return (n>0?"+":"")+n};
       return h("button",{key:id,disabled:!use,className:"bs-equip-item"+(isEquipped?" equipped":""),
        onClick:()=>onEquip(isEquipped?null:id)},
        h("div",{className:"bs-equip-item-icon"},w.emoji||"⚔️"),
        h("div",{className:"bs-equip-item-info"},
         h("strong",null,w.name),
         h("small",null,w.desc||"武器"),
         h("div",{className:"bs-equip-comparison"},"実効値差 ATK "+delta("atk")+" / MAG "+delta("mag")+" / LUC "+delta("luc"))),
        h("span",{className:"bs-equip-item-status"},isEquipped?"装備中":use?"装備":"不可"));
     })):h("div",{className:"bs-equip-empty"},"装備できる武器がありません。ショップや戦闘で入手できます。"))
   )
  )
 );
}
root.BraveEquipmentUI={render:(props)=>h(Equipment,props)};
})(window);
