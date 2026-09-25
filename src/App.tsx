import { useEffect, useMemo, useState } from "react";

type Service = "Christmas" | "Permanent";
type Status = "New Estimate" | "Quote Approved" | "Quote Not Approved";
type LandscapeItem = { id:string; type:"Palm"|"Tree"|"Bush"|"Column"; preset:string; count:number; strandsEach:number };
type DecorItem = { id:string; type:"Wreath"|"Garland"|"Snowflake"|"Teardrop"|"Ground Stakes"; preset:string; count:number; amount:number };
type Tab = "new" | "quote" | "measure" | "projects" | "inventory" | "purchasing";
type POStatus = "Draft" | "Ordered" | "Partially Received" | "Received" | "Cancelled";
type POLine = { key:string; quantity:number; unitCost:number; received:number };
type PurchaseOrder = { id:string; poNumber:string; supplier:string; status:POStatus; expectedDate:string; notes:string; createdAt:string; lines:POLine[] };
type InventoryItem = {
  name:string; category:string; on:number; unit:string; cost:number; reorder?:number;
  note?:string; supplier?:string; purchaseTier?:number; legacy?:boolean; damaged?:number;
};
type Project = {
  id:string; updatedAt:string; customer:string; address:string; city:string; taxRate:number; service:Service; status:Status;
  roofFt:number; ridgeFt:number; groundFt:number; garageFt:number; windowFt:number; c9Color:string;
  stories:number; roofSurface:string; complexity:string; access:string;
  bushFt:number; bushStrandsOverride:number; palmStrands:number; treeStrands:number; columnStrands:number;
  wreathSize:number; wreathQty:number; garlandFt:number; snowflakes:number; treeDrops:number;
  roofRate:number; permanentFt:number; permanentCoverage:string; permanentRate:number;
  landscapeItems?:LandscapeItem[]; decorItems?:DecorItem[]; quoteComplete?:boolean; draftStep?:number;
};

const STORAGE="ltp-projects-v2";
const PO_STORAGE="ltp-purchase-orders-v1";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const qty=(n:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(Number.isFinite(n)?n:0);
const uid=()=>Math.random().toString(36).slice(2,9);

const INV:Record<string,InventoryItem>={
  c9Sun:{name:"C9 Sun Warm White",category:"C9 Bulbs",on:3500,unit:"bulbs",cost:.638,supplier:"CLC USA",reorder:1500},
  c9Traditional:{name:"C9 Traditional Warm White",category:"C9 Bulbs",on:3125,unit:"bulbs",cost:.65,supplier:"Legacy",legacy:true,note:"Ground-stake phase-out only."},
  c9Cool:{name:"C9 Cool White",category:"C9 Bulbs",on:500,unit:"bulbs",cost:.65,supplier:"CLC USA"},
  c9Pure:{name:"C9 Pure White",category:"C9 Bulbs",on:525,unit:"bulbs",cost:.65,supplier:"LGL"},
  c9Red:{name:"C9 Red",category:"C9 Bulbs",on:750,unit:"bulbs",cost:.70,supplier:"Minleon"},
  c9Green:{name:"C9 Green",category:"C9 Bulbs",on:625,unit:"bulbs",cost:.70,supplier:"Minleon"},
  c9Blue:{name:"C9 Blue",category:"C9 Bulbs",on:375,unit:"bulbs",cost:.70,supplier:"Minleon"},
  c9Multi:{name:"C9 Multicolor",category:"C9 Bulbs",on:950,unit:"bulbs",cost:.65,supplier:"Minleon"},
  c9Pink:{name:"C9 Pink",category:"C9 Bulbs",on:150,unit:"bulbs",cost:.85,supplier:"Minleon"},
  c9Yellow:{name:"C9 Yellow",category:"C9 Bulbs",on:50,unit:"bulbs",cost:.85,supplier:"Minleon"},
  c9Purple:{name:"C9 Purple",category:"C9 Bulbs",on:50,unit:"bulbs",cost:.88,supplier:"CLC USA"},
  c9Cord15:{name:'C9 Socket Cord · 15" spacing',category:"Wire",on:10000,unit:"ft",cost:.26,supplier:"CLC USA",reorder:1500},
  c9Cord12:{name:'C9 Socket Cord · 12" spacing',category:"Wire",on:1000,unit:"ft",cost:.279,supplier:"Legacy",legacy:true,note:"Do not purchase. Legacy inventory only."},
  c7Sun:{name:"C7 Sun Warm White · confirmed",category:"C7",on:500,unit:"bulbs",cost:.76,supplier:"CLC USA",reorder:250,note:"Additional 4 LGL line-units have unknown package quantity."},
  c7Cord24:{name:'C7 Socket Cord · 24" spacing',category:"C7",on:1500,unit:"ft",cost:.398,supplier:"LGL"},
  miniSun:{name:"Minleon Sun Warm Minis · 50L",category:"Mini Strands",on:701,damaged:72,unit:"strands",cost:11.99,supplier:"LGL",note:"72 damaged is provisional: 3 cases × 24 strands. Verify exact case count."},
  miniMulti:{name:"Minleon Multicolor Minis · 50L",category:"Mini Strands",on:49,unit:"strands",cost:11.99,supplier:"LGL"},
  miniRed:{name:"Minleon Red Minis · 50L",category:"Mini Strands",on:25,unit:"strands",cost:10.79,supplier:"LGL"},
  miniGreen:{name:"Minleon Green Minis · 50L",category:"Mini Strands",on:25,unit:"strands",cost:10.79,supplier:"LGL"},
  miniBlue:{name:"Minleon Blue Minis · 50L",category:"Mini Strands",on:10,unit:"strands",cost:10.79,supplier:"LGL"},
  s4Mini:{name:"S4 NxG Coupling Sun Warm · 4in",category:"Mini Strands",on:0,unit:"strands",cost:11.88,supplier:"S4",reorder:48,purchaseTier:24,note:"New standard for replenishment; supplier price at 24+."},
  clipShingle:{name:"Minleon C9 Roof Clips",category:"Clips",on:6100,unit:"clips",cost:.24,supplier:"CLC/LGL",reorder:1500},
  clipTile:{name:"C9 Tuff Tile Clips · Terracotta",category:"Clips",on:500,unit:"clips",cost:.22,supplier:"CLC",reorder:200},
  clipMetal:{name:"Magnetic C9 Clips · confirmed",category:"Clips",on:150,unit:"clips",cost:.79,supplier:"LGL",reorder:100,note:"Older magnetic clip units exist but pack quantity is not fully reconciled."},
  clipRidge:{name:"Ridge / Peak Clips",category:"Clips",on:650,unit:"clips",cost:.60,supplier:"CLC/LGL",reorder:250},
  stakesCircle:{name:'Minleon 7.5" Circle Top Stakes',category:"Stakes",on:1500,unit:"stakes",cost:.66,supplier:"LGL",reorder:500},
  stakes7:{name:'Minleon 7" Ground Stakes',category:"Stakes",on:250,unit:"stakes",cost:.90,supplier:"CLC"},
  stakes5:{name:'Minleon 5" Stakes',category:"Stakes",on:400,unit:"stakes",cost:.45,supplier:"LGL"},
  stakesCrown:{name:'Minleon 7.5" Crown Stakes',category:"Stakes",on:100,unit:"stakes",cost:.40,supplier:"LGL"},
  wreath48:{name:'48" Lush Mixed Pine Wreath · Unlit',category:"Greenery",on:19,unit:"wreaths",cost:99.99,supplier:"LGL"},
  garland9:{name:"9ft Minleon Prelit Garland · Sun Warm",category:"Greenery",on:2,unit:"sections",cost:152,supplier:"CLC"},
  spt:{name:"Green SPT-1 Blank Wire",category:"Electrical",on:4750,unit:"ft",cost:.26,supplier:"CLC/LGL"},
  plugUniversal:{name:"Universal / One-Plug SPT-1",category:"Electrical",on:850,unit:"plugs",cost:1.04,supplier:"CLC/LGL"},
  plugMale:{name:"Male SPT-1 Plugs",category:"Electrical",on:250,unit:"plugs",cost:1.04,supplier:"LGL"},
  plugFemale:{name:"Female SPT-1 Plugs",category:"Electrical",on:425,unit:"plugs",cost:1.04,supplier:"CLC/LGL"},
  timerPhoto:{name:"Weatherproof Photocell Timers",category:"Timers",on:10,unit:"timers",cost:14.95,supplier:"CLC",legacy:true},
  timerMechanical:{name:"Mechanical Timers",category:"Timers",on:5,unit:"timers",cost:19.95,supplier:"LGL",legacy:true},
  timerTouchSmart:{name:"TouchSmart Digital Timers",category:"Timers",on:0,unit:"timers",cost:0,supplier:"TBD",reorder:10,note:"New timer standard. Exact SKU/cost still needs to be entered."},
  bowHbl18:{name:'HBL Velvet Bow · Gold · 18"',category:"Bows",on:4,unit:"bows",cost:35.91,supplier:"CLC"},
  bowMinleon18:{name:'Minleon Red/Gold Bow · 18"',category:"Bows",on:4,unit:"bows",cost:34,supplier:"CLC"},
  bowStruct12:{name:'Structural Red/Gold Bow · 12"',category:"Bows",on:3,unit:"bows",cost:19.99,supplier:"LGL"},
  bowStruct15:{name:'Structural Red/Gold Bow · 15"',category:"Bows",on:3,unit:"bows",cost:32.99,supplier:"LGL"},
  bowStruct18:{name:'Structural Red/Gold Bow · 18"',category:"Bows",on:3,unit:"bows",cost:39.99,supplier:"LGL"},
  permanent:{name:"Minleon Permanent Lighting",category:"Permanent",on:200,unit:"ft",cost:0,supplier:"Current inventory",note:"Current balance supplied by company; no cut/waste allowance."}
};

const complexityRates:Record<string,number>={
  "Straight / simple":0,
  "Light peaks":.25,
  "Moderate peaks":.5,
  "Complex":1,
  "Very complex / custom":1.5
};
const COMPLEXITY_GUIDE=[
  {key:"Straight / simple",title:"Straight / Simple",note:"One clean run with little or no peak work."},
  {key:"Light peaks",title:"Light Peaks",note:"One simple peak or small roof-direction change."},
  {key:"Moderate peaks",title:"Moderate Peaks",note:"Several peaks/returns but still straightforward."},
  {key:"Complex",title:"Complex",note:"Multiple offsets, upper transitions or harder geometry."},
  {key:"Very complex / custom",title:"Very Complex",note:"Custom architecture or unusually detailed layout."}
];
const REFERENCE_PRESETS=[
  {key:"garage1",label:"1-Car Garage",feet:9,type:"garage1"},
  {key:"garage2",label:"2-Car Garage",feet:16,type:"garage2"},
  {key:"door1",label:"Exterior Door",feet:3,type:"door"},
  {key:"door2",label:"Double Entry",feet:6,type:"doubleDoor"},
  {key:"window1",label:"Single Window",feet:3,type:"window1"},
  {key:"window2",label:"Double Window",feet:6,type:"window2"},
  {key:"window3",label:"Triple Window",feet:9,type:"window3"},
  {key:"custom",label:"Custom",feet:0,type:"custom"}
];


const emptyProject=():Project=>({
  id:uid(),updatedAt:new Date().toISOString(),customer:"",address:"",city:"",taxRate:0,service:"Christmas",status:"New Estimate",
  roofFt:0,ridgeFt:0,groundFt:0,garageFt:0,windowFt:0,c9Color:"Sun Warm White",
  stories:1,roofSurface:"Shingle",complexity:"Straight / simple",access:"Standard ladder access",
  bushFt:0,bushStrandsOverride:0,palmStrands:0,treeStrands:0,columnStrands:0,
  wreathSize:48,wreathQty:0,garlandFt:0,snowflakes:0,treeDrops:0,
  roofRate:8,permanentFt:0,permanentCoverage:"Front Only",permanentRate:35,landscapeItems:[],decorItems:[],quoteComplete:false,draftStep:0
});

function loadProjects():Project[]{
  try{return JSON.parse(localStorage.getItem(STORAGE)||"[]")}catch{return[]}
}
function loadPOs():PurchaseOrder[]{
  try{return JSON.parse(localStorage.getItem(PO_STORAGE)||"[]")}catch{return[]}
}
function Field({label,children,hint}:{label:string;children:any;hint?:string}){
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>
}
function Metric({label,value,tone}:{label:string;value:string;tone?:string}){
  return <div className={"metric "+(tone||"")}><div className="metric-label">{label}</div><div className="metric-value">{value}</div></div>
}
function StepDot({n,label,active,done,onClick}:{n:number;label:string;active:boolean;done:boolean;onClick:()=>void}){
  return <button className={"step-dot "+(active?"active ":"")+(done?"done":"")} onClick={onClick}><b>{n}</b><span>{label}</span></button>
}

export default function App(){
  const [tab,setTab]=useState<Tab>("new");
  const [step,setStep]=useState(1);
  const [project,setProject]=useState<Project>(emptyProject());
  const [projects,setProjects]=useState<Project[]>(()=>loadProjects());
  const [salesTaxRate,setSalesTaxRate]=useState(7);
  const [savedFlash,setSavedFlash]=useState("");
  const [purchaseOrders,setPurchaseOrders]=useState<PurchaseOrder[]>(()=>loadPOs());
  const [inventorySearch,setInventorySearch]=useState("");
  const [inventoryCategory,setInventoryCategory]=useState("All");
  const [inventoryStatus,setInventoryStatus]=useState("All");
  const [poSupplier,setPoSupplier]=useState("CLC USA");
  const [poExpectedDate,setPoExpectedDate]=useState("");
  const [poNotes,setPoNotes]=useState("");
  const [poLineKey,setPoLineKey]=useState("c9Sun");
  const [poLineQty,setPoLineQty]=useState(500);
  const [poLines,setPoLines]=useState<POLine[]>([]);
  const [landscapeType,setLandscapeType]=useState<LandscapeItem["type"]>("Palm");
  const [landscapePreset,setLandscapePreset]=useState("Small Palm");
  const [landscapeCount,setLandscapeCount]=useState(1);
  const [decorType,setDecorType]=useState<DecorItem["type"]>("Wreath");
  const [decorPreset,setDecorPreset]=useState("48 in");
  const [decorCount,setDecorCount]=useState(1);
  const [decorAmount,setDecorAmount]=useState(9);
  const [receiptBusy,setReceiptBusy]=useState(false);
  const [receiptLines,setReceiptLines]=useState<POLine[]>([]);
  const [receiptSupplier,setReceiptSupplier]=useState("Receipt Import");
  const [receiptMessage,setReceiptMessage]=useState("");
  const [projectServiceView,setProjectServiceView]=useState<Service>("Christmas");
  const [draftsOnly,setDraftsOnly]=useState(false);

  useEffect(()=>{localStorage.setItem(STORAGE,JSON.stringify(projects))},[projects]);
  useEffect(()=>{localStorage.setItem(PO_STORAGE,JSON.stringify(purchaseOrders))},[purchaseOrders]);

  const set=<K extends keyof Project>(key:K,value:Project[K])=>setProject(p=>({...p,[key]:value,updatedAt:new Date().toISOString()}));

  const estimate=useMemo(()=>{
    if(project.service==="Permanent"){
      const sell=project.permanentFt*project.permanentRate;
      const material=0;
      return {selling:sell,material,gp:sell-material,gm:sell?sell?((sell-material)/sell)*100:0:0,roofRate:0,suggestedRoofRate:0,
        roofBulbs:0,ridgeBulbs:0,groundBulbs:0,bushStrands:0,miniStrands:0};
    }
    let base=project.stories===1?8:project.stories===2?9:10;
    base+=complexityRates[project.complexity]||0;
    if(project.roofSurface==="Tile")base+=.5;
    if(project.roofSurface==="Metal")base+=.25;
    if(project.access==="Difficult / steep")base+=.5;
    if(project.access==="Special equipment")base+=1;
    const suggestedRoofRate=Math.min(12,Math.max(8,base));
    const roofRate=project.roofRate>0?project.roofRate:8;
    const roofBulbs=Math.ceil((project.roofFt+project.garageFt+project.windowFt)/1.25);
    const ridgeBulbs=Math.ceil(project.ridgeFt/1.25);
    const groundBulbs=Math.ceil(project.groundFt/1.25);
    const landscapeItems=project.landscapeItems||[];
    const arrayMini=landscapeItems.reduce((s,i)=>s+(i.count||0)*(i.strandsEach||0),0);
    const bushStrands=project.bushStrandsOverride>0?project.bushStrandsOverride:Math.ceil(project.bushFt/25);
    const legacyMini=bushStrands+project.palmStrands+project.treeStrands+project.columnStrands;
    const miniStrands=landscapeItems.length?arrayMini:legacyMini;
    const decorItems=project.decorItems||[];
    const wreathPrice=decorItems.length?decorItems.filter(i=>i.type==="Wreath").reduce((s,i)=>s+i.count*(i.preset==="36 in"?200:i.preset==="48 in"?300:600),0):project.wreathQty*(project.wreathSize===36?200:project.wreathSize===48?300:600);
    const selling=(project.roofFt+project.garageFt+project.windowFt)*roofRate+
      project.ridgeFt*Math.min(12,roofRate+.5)+project.groundFt*4+miniStrands*35+
      wreathPrice+
      (decorItems.length?decorItems.filter(i=>i.type==="Garland").reduce((s,i)=>s+i.amount*22,0):project.garlandFt*22);
    const bulbCost=colorCost(project.c9Color);
    const clipCost=project.roofSurface==="Tile"?INV.clipTile.cost:project.roofSurface==="Metal"?INV.clipMetal.cost:INV.clipShingle.cost;
    const existingMinis=Math.max(0,(INV.miniSun.on-(INV.miniSun.damaged||0)));
    const minleonUsed=Math.min(existingMinis,miniStrands);
    const s4Used=Math.max(0,miniStrands-minleonUsed);
    const material=(roofBulbs+ridgeBulbs)*bulbCost+groundBulbs*INV.c9Traditional.cost+
      (project.roofFt+project.ridgeFt+project.groundFt+project.garageFt+project.windowFt)*INV.c9Cord15.cost+
      roofBulbs*clipCost+ridgeBulbs*INV.clipRidge.cost+groundBulbs*INV.stakesCircle.cost+
      minleonUsed*INV.miniSun.cost+s4Used*INV.s4Mini.cost+
      (decorItems.length?decorItems.filter(i=>i.type==="Wreath").reduce((s,i)=>s+i.count*(i.preset==="48 in"?INV.wreath48.cost:i.preset==="36 in"?85:300),0):project.wreathQty*(project.wreathSize===48?INV.wreath48.cost:project.wreathSize===36?85:300))+
      (decorItems.length?decorItems.filter(i=>i.type==="Garland").reduce((s,i)=>s+Math.ceil(i.amount/9)*INV.garland9.cost,0):Math.ceil(project.garlandFt/9)*INV.garland9.cost);
    return {selling,material,gp:selling-material,gm:selling?((selling-material)/selling)*100:0,roofRate,suggestedRoofRate,roofBulbs,ridgeBulbs,groundBulbs,bushStrands,miniStrands};
  },[project]);

  const projectUsage=(p:Project)=>{
    if(p.service==="Permanent")return {permanent:p.permanentFt};
    const roofBulbs=Math.ceil((p.roofFt+p.garageFt+p.windowFt)/1.25);
    const ridgeBulbs=Math.ceil(p.ridgeFt/1.25);
    const groundBulbs=Math.ceil(p.groundFt/1.25);
    const landscapeItems=p.landscapeItems||[];
    const bushes=p.bushStrandsOverride>0?p.bushStrandsOverride:Math.ceil(p.bushFt/25);
    const minis=landscapeItems.length?landscapeItems.reduce((s,i)=>s+(i.count||0)*(i.strandsEach||0),0):bushes+p.palmStrands+p.treeStrands+p.columnStrands;
    const u:Record<string,number>={c9Cord15:p.roofFt+p.ridgeFt+p.groundFt+p.garageFt+p.windowFt,clipRidge:ridgeBulbs,stakesCircle:groundBulbs,c9Traditional:groundBulbs};
    const clip=p.roofSurface==="Tile"?"clipTile":p.roofSurface==="Metal"?"clipMetal":"clipShingle";
    u[clip]=(u[clip]||0)+roofBulbs;
    applyColor(u,p.c9Color,roofBulbs+ridgeBulbs);
    const minleonAvailable=Math.max(0,INV.miniSun.on-(INV.miniSun.damaged||0));
    u.miniSun=Math.min(minleonAvailable,minis);
    u.s4Mini=Math.max(0,minis-u.miniSun);
    const decorItems=p.decorItems||[];
    if(decorItems.length){
      u.wreath48=decorItems.filter(i=>i.type==="Wreath"&&i.preset==="48 in").reduce((s,i)=>s+i.count,0);
      u.garland9=decorItems.filter(i=>i.type==="Garland").reduce((s,i)=>s+Math.ceil(i.amount/9),0);
    }else{
      if(p.wreathSize===48)u.wreath48=p.wreathQty;
      u.garland9=Math.ceil(p.garlandFt/9);
    }
    return u;
  };

  const committed=useMemo(()=>{
    const reserved:Record<string,number>={},consumed:Record<string,number>={};
    projects.forEach(p=>{
      const u=projectUsage(p);
      const bucket=p.status==="Quote Approved"?reserved:null;
      if(!bucket)return;
      Object.entries(u).forEach(([k,v])=>bucket[k]=(bucket[k]||0)+v);
    });
    return {reserved,consumed};
  },[projects]);

  const stockReceived=useMemo(()=>{
    const out:Record<string,number>={};
    purchaseOrders.forEach(po=>{
      if(po.status==="Cancelled")return;
      po.lines.forEach(line=>out[line.key]=(out[line.key]||0)+(line.received||0));
    });
    return out;
  },[purchaseOrders]);

  const incoming=useMemo(()=>{
    const out:Record<string,number>={};
    purchaseOrders.forEach(po=>{
      if(po.status==="Cancelled"||po.status==="Received"||po.status==="Draft")return;
      po.lines.forEach(line=>{
        const open=Math.max(0,line.quantity-(line.received||0));
        out[line.key]=(out[line.key]||0)+open;
      });
    });
    return out;
  },[purchaseOrders]);

  const currentUsage=projectUsage(project);

  const availability=(key:string)=>{
    const item=INV[key];
    const damaged=item.damaged||0;
    const reserved=committed.reserved[key]||0;
    const consumed=committed.consumed[key]||0;
    const received=stockReceived[key]||0;
    const incomingQty=incoming[key]||0;
    const onHand=item.on+received;
    const available=onHand-damaged-reserved-consumed;
    return {damaged,reserved,consumed,received,incoming:incomingQty,onHand,available,projected:available+incomingQty};
  };

  const shortages=Object.entries(currentUsage).filter(([key,use])=>{
    const a=availability(key);
    return use>a.available;
  });

  function saveProject(complete=false){
    const next={...project,quoteComplete:complete,draftStep:complete?4:step,updatedAt:new Date().toISOString()};
    setProject(next);
    setProjects(prev=>{
      const i=prev.findIndex(x=>x.id===next.id);
      if(i<0)return [next,...prev];
      const copy=[...prev];copy[i]=next;return copy;
    });
    setSavedFlash(complete?"Project Saved":"Draft Saved");
    window.setTimeout(()=>setSavedFlash(""),1600);
  }
  function newProject(){setProject(emptyProject());setStep(1);setTab("new")}
  function openProject(p:Project){setProject(p);setStep(1);setTab("quote")}
  function deleteProject(id:string){setProjects(p=>p.filter(x=>x.id!==id));if(project.id===id)newProject()}

  function addLandscape(){
    const preset=LANDSCAPE_PRESETS[landscapePreset]; if(!preset||landscapeCount<=0)return;
    const item:LandscapeItem={id:uid(),type:landscapeType,preset:landscapePreset,count:landscapeCount,strandsEach:preset.strands};
    setProject(p=>({...p,landscapeItems:[...(p.landscapeItems||[]),item],updatedAt:new Date().toISOString()}));
  }
  function updateLandscape(id:string,patch:Partial<LandscapeItem>){
    setProject(p=>({...p,landscapeItems:(p.landscapeItems||[]).map(i=>i.id===id?{...i,...patch}:i),updatedAt:new Date().toISOString()}));
  }
  function removeLandscape(id:string){
    setProject(p=>({...p,landscapeItems:(p.landscapeItems||[]).filter(i=>i.id!==id),updatedAt:new Date().toISOString()}));
  }
  function addDecor(){
    if(decorCount<=0)return;
    const item:DecorItem={id:uid(),type:decorType,preset:decorPreset,count:decorCount,amount:decorAmount};
    if(decorType==="Ground Stakes"){
      setProject(p=>({...p,groundFt:decorAmount,decorItems:[...(p.decorItems||[]).filter(i=>i.type!=="Ground Stakes"),item],updatedAt:new Date().toISOString()}));
    }else{
      setProject(p=>({...p,decorItems:[...(p.decorItems||[]),item],updatedAt:new Date().toISOString()}));
    }
  }
  function removeDecor(id:string){
    setProject(p=>{
      const old=(p.decorItems||[]).find(i=>i.id===id);
      return {...p,groundFt:old?.type==="Ground Stakes"?0:p.groundFt,decorItems:(p.decorItems||[]).filter(i=>i.id!==id),updatedAt:new Date().toISOString()};
    });
  }

  const suppliers=["CLC USA","S4","LGL","Dekra-Lite","Commercial Christmas Supply","Other"];

  function addPOLine(){
    const item=INV[poLineKey];
    if(!item||poLineQty<=0)return;
    setPoLines(lines=>{
      const existing=lines.find(x=>x.key===poLineKey);
      if(existing)return lines.map(x=>x.key===poLineKey?{...x,quantity:x.quantity+poLineQty}:x);
      return [...lines,{key:poLineKey,quantity:poLineQty,unitCost:item.cost||0,received:0}];
    });
  }
  function createPO(){
    if(poLines.length===0)return;
    const nextNum="PO-"+String(purchaseOrders.length+1).padStart(4,"0");
    const po:PurchaseOrder={id:uid(),poNumber:nextNum,supplier:poSupplier,status:"Draft",expectedDate:poExpectedDate,notes:poNotes,createdAt:new Date().toISOString(),lines:poLines};
    setPurchaseOrders(prev=>[po,...prev]);
    setPoLines([]);setPoExpectedDate("");setPoNotes("");
  }
  function setPOStatus(id:string,status:POStatus){
    setPurchaseOrders(prev=>prev.map(po=>po.id===id?{...po,status}:po));
  }
  function receiveAll(id:string){
    setPurchaseOrders(prev=>prev.map(po=>po.id===id?{...po,status:"Received",lines:po.lines.map(line=>({...line,received:line.quantity}))}:po));
  }
  function deletePO(id:string){setPurchaseOrders(prev=>prev.filter(po=>po.id!==id))}

  async function importReceipt(file:File){
    setReceiptBusy(true);setReceiptMessage("Reading receipt…");setReceiptLines([]);
    try{
      const Tesseract=await import("tesseract.js");
      const result=await Tesseract.recognize(file,"eng");
      const text=(result.data.text||"").toLowerCase();
      const guessed=text.includes("christmas light contractors")||text.includes("clc")?"CLC USA":
        text.includes("let's get lit")||text.includes("lets get lit")?"LGL":
        text.includes("s4")?"S4":text.includes("dekra")?"Dekra-Lite":"Receipt Import";
      setReceiptSupplier(guessed);
      const parsed=parseReceiptText(text);
      setReceiptLines(parsed);
      setReceiptMessage(parsed.length?parsed.length+" inventory lines matched. Review quantities, then receive.":"No inventory SKUs matched automatically. Add the receipt as a PO or enter items manually.");
    }catch(e){
      setReceiptMessage("Could not read this receipt image. Try a clearer JPG/PNG or enter the PO manually.");
    }finally{setReceiptBusy(false)}
  }
  function confirmReceipt(){
    if(receiptLines.length===0)return;
    const nextNum="RCPT-"+String(purchaseOrders.length+1).padStart(4,"0");
    const po:PurchaseOrder={id:uid(),poNumber:nextNum,supplier:receiptSupplier,status:"Received",expectedDate:"",notes:"Imported from receipt image",createdAt:new Date().toISOString(),lines:receiptLines.map(l=>({...l,received:l.quantity}))};
    setPurchaseOrders(prev=>[po,...prev]);setReceiptLines([]);setReceiptMessage("Receipt received into inventory.");
  }

  function projectAction(p:Project,action:string){
    if(!action)return;
    if(action==="approved"){
      const next={...p,status:"Quote Approved" as Status,updatedAt:new Date().toISOString()};
      setProjects(prev=>prev.map(x=>x.id===p.id?next:x));if(project.id===p.id)setProject(next);return;
    }
    if(action==="not-approved"){
      const next={...p,status:"Quote Not Approved" as Status,updatedAt:new Date().toISOString()};
      setProjects(prev=>prev.map(x=>x.id===p.id?next:x));if(project.id===p.id)setProject(next);return;
    }
    if(action==="new-estimate"){
      const next={...p,status:"New Estimate" as Status,updatedAt:new Date().toISOString()};
      setProjects(prev=>prev.map(x=>x.id===p.id?next:x));if(project.id===p.id)setProject(next);return;
    }
    if(action==="delete"){deleteProject(p.id)}
  }

  const serviceProjects=projects.filter(p=>p.service===projectServiceView);
  const approvedProjects=serviceProjects.filter(p=>p.status==="Quote Approved");
  const lostProjects=serviceProjects.filter(p=>p.status==="Quote Not Approved");
  const openProjects=serviceProjects.filter(p=>p.status==="New Estimate");
  const unfinishedProjects=serviceProjects.filter(p=>!p.quoteComplete);
  const decidedProjects=approvedProjects.length+lostProjects.length;
  const closingRate=decidedProjects?approvedProjects.length/decidedProjects*100:0;
  const christmasProjects=projects.filter(p=>p.service==="Christmas");
  const permanentProjects=projects.filter(p=>p.service==="Permanent");
  const serviceClose=(rows:Project[])=>{
    const won=rows.filter(p=>p.status==="Quote Approved").length;
    const lost=rows.filter(p=>p.status==="Quote Not Approved").length;
    return won+lost?won/(won+lost)*100:0;
  };
  const visibleOpen=draftsOnly?openProjects.filter(p=>!p.quoteComplete):openProjects;
  const visibleApproved=draftsOnly?approvedProjects.filter(p=>!p.quoteComplete):approvedProjects;
  const visibleLost=draftsOnly?lostProjects.filter(p=>!p.quoteComplete):lostProjects;

  const handoff=buildHandoff(project,estimate);

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">LTP</span>
        <div><small>Company Operations</small><strong>Lighting Ops</strong></div>
      </div>
      <div className="single-mode">Single-app mode · real user login is the next security layer.</div>
      <nav>
        <Nav active={tab==="new"} tone="blue" onClick={newProject}>New Project</Nav>
        <Nav active={tab==="projects"} tone="cyan" onClick={()=>setTab("projects")}>Projects</Nav>
        <Nav active={tab==="measure"} tone="purple" onClick={()=>setTab("measure")}>Measurements</Nav>
        <Nav active={tab==="quote"} tone="blue" onClick={()=>setTab("quote")}>Quote Builder</Nav>
        <Nav active={tab==="inventory"} tone="green" onClick={()=>setTab("inventory")}>Inventory</Nav>
        <Nav active={tab==="purchasing"} tone="orange" onClick={()=>setTab("purchasing")}>Procurement</Nav>
      </nav>
    </aside>

    <main className="main">
      {tab==="new"&&<section className="page">
        <div className="page-head blue-head"><div><span className="eyebrow">Start here</span><h1>New Project</h1><p>Create the customer and property record once. Every other module works from this same project.</p></div></div>
        <div className="wizard-card step-1 new-project-card">
          <div className="section-title"><span>1</span><div><h2>Customer & project</h2><p>No duplicate customer entry in Measurements or Quote Builder.</p></div></div>
          <div className="form-grid two">
            <Field label="Customer name"><input className="input" value={project.customer} onChange={e=>set("customer",e.target.value)}/></Field>
            <Field label="Property address"><input className="input" value={project.address} onChange={e=>set("address",e.target.value)}/></Field>
            <Field label="City"><input className="input" value={project.city||""} onChange={e=>{const city=e.target.value;setProject(p=>({...p,city,taxRate:suggestTaxRate(city),updatedAt:new Date().toISOString()}))}} /></Field>
            <Field label="Suggested sales tax"><div className="tax-suggestion"><b>{(project.taxRate||0).toFixed(1)}%</b><span>{project.city?taxCountyNote(project.city):"Enter city to suggest rate"}</span></div></Field>
            <Field label="Service"><select className="input" value={project.service} onChange={e=>set("service",e.target.value as Service)}><option>Christmas</option><option>Permanent</option></select></Field>
            <Field label="Status"><select className="input" value={project.status} onChange={e=>set("status",e.target.value as Status)}>{["New Estimate","Quote Approved","Quote Not Approved"].map(x=><option key={x}>{x}</option>)}</select></Field>
          </div>
          <div className="new-project-actions">
            <button className="primary" onClick={()=>{saveProject(false);setTab("measure")}}>Start with Measurements</button>
            <button onClick={()=>{saveProject(false);setTab("quote")}}>Start Quote</button>
          </div>
        </div>
      </section>}

      {tab==="quote"&&<section className="page">
        <div className="page-head blue-head">
          <div><span className="eyebrow">Quote Builder · {project.customer||"Current project"}</span><h1>Build the scope without the noise.</h1><p>Property first, then lighting and landscape, then décor. Pricing and Jobber notes stay on the final estimate step.</p></div>
          <div className="head-actions"><span className={"status-pill "+project.status.toLowerCase().replaceAll(" ","-")}>{project.status}</span><button className="primary" onClick={()=>saveProject(step===4)}>{savedFlash||(step===4?"Save Project":"Save Draft")}</button></div>
        </div>

        <div className="stepper four-steps">
          <StepDot n={1} label="Property" active={step===1} done={step>1} onClick={()=>setStep(1)}/>
          <StepDot n={2} label="Lighting & Landscape" active={step===2} done={step>2} onClick={()=>setStep(2)}/>
          <StepDot n={3} label="Décor & Add-ons" active={step===3} done={step>3} onClick={()=>setStep(3)}/>
          <StepDot n={4} label="Project Estimate" active={step===4} done={false} onClick={()=>setStep(4)}/>
        </div>

        <div className={"wizard-card step-"+step}>
          {step===1&&<>
            <div className="section-title"><span>1</span><div><h2>Property</h2><p>Property conditions drive the suggested roofline rate and the expected hardware.</p></div></div>
            <div className="form-grid two">
              <Field label="Stories" hint="Choose the highest level that contains the lighting scope."><select className="input" value={project.stories} onChange={e=>set("stories",+e.target.value)}><option value={1}>1 story</option><option value={2}>2 stories</option><option value={3}>3 stories</option></select></Field>
              <Field label="Roof surface"><select className="input" value={project.roofSurface} onChange={e=>set("roofSurface",e.target.value)}><option>Shingle</option><option>Tile</option><option>Metal</option><option>Mixed / Other</option></select></Field>
              <div className="field complexity-field"><span>Roofline complexity</span>
                <div className="complexity-grid">{COMPLEXITY_GUIDE.map(item=><button type="button" key={item.key} className={"complexity-option "+(project.complexity===item.key?"selected":"")} onClick={()=>set("complexity",item.key)}>
                  <RoofSketch kind={item.key}/><b>{item.title}</b><small>{item.note}</small>
                </button>)}</div>
              </div>
              <Field label="Access" hint="Use difficult/steep or special equipment only when access actually changes production time."><select className="input" value={project.access} onChange={e=>set("access",e.target.value)}><option>Standard ladder access</option><option>Difficult / steep</option><option>Special equipment</option></select></Field>
            </div>
            {project.service==="Christmas"&&<div className="rate-display suggestion-rate"><span>Suggested roofline rate</span><strong>{money(estimate.suggestedRoofRate)}/ft</strong><small>Suggestion only. Simple 1-story starts at $8/ft.</small></div>}
          </>}

          {step===2&&project.service==="Christmas"&&<>
            <div className="section-title"><span>2</span><div><h2>Lighting & Landscape</h2><p>Build the actual scope. Everything is optional except what the customer is buying.</p></div></div>
            <section className="scope-block">
              <div className="scope-block-head"><h3>C9 Lighting</h3><button className="measure-link compact" onClick={()=>setTab("measure")}>Use Measurements</button></div>
              <div className="form-grid three">
                <Field label="Roofline · ft"><input className="input" type="number" min="0" value={project.roofFt} onChange={e=>set("roofFt",+e.target.value)}/></Field>
                <Field label="Selling rate · $/ft" hint={"Suggested "+money(estimate.suggestedRoofRate)+"/ft"}><input className="input" type="number" min="0" step=".25" value={project.roofRate} onChange={e=>set("roofRate",+e.target.value)}/></Field>
                <Field label="Color / pattern"><select className="input" value={project.c9Color} onChange={e=>set("c9Color",e.target.value)}>{["Sun Warm White","Pure White","Cool White","Red","Green","Red / Green","Multicolor","Blue","Pink","Purple","Yellow"].map(x=><option key={x}>{x}</option>)}</select></Field>
              </div>
              <details className="optional-scope">
                <summary>+ Add another C9 area</summary>
                <div className="form-grid three">
                  <Field label="Ridgeline · ft"><input className="input" type="number" min="0" value={project.ridgeFt} onChange={e=>set("ridgeFt",+e.target.value)}/></Field>
                  <Field label="Garden bed / ground C9 · ft"><input className="input" type="number" min="0" value={project.groundFt} onChange={e=>set("groundFt",+e.target.value)}/></Field>
                  <Field label="Garage / architecture · ft"><input className="input" type="number" min="0" value={project.garageFt} onChange={e=>set("garageFt",+e.target.value)}/></Field>
                  <Field label="Window outline · ft"><input className="input" type="number" min="0" value={project.windowFt} onChange={e=>set("windowFt",+e.target.value)}/></Field>
                </div>
              </details>
            </section>

            <section className="scope-block">
              <div className="scope-block-head"><div><h3>Landscape Mini Lights</h3><p>Choose the object first, then its size.</p></div></div>
              <div className="landscape-builder">
                <Field label="Object"><select className="input" value={landscapeType} onChange={e=>{const t=e.target.value as LandscapeItem["type"];setLandscapeType(t);setLandscapePreset(defaultLandscapePreset(t))}}><option>Palm</option><option>Tree</option><option>Bush</option><option>Column</option></select></Field>
                <Field label="Size"><select className="input" value={landscapePreset} onChange={e=>setLandscapePreset(e.target.value)}>{landscapePresetsFor(landscapeType).map(x=><option key={x} value={x}>{landscapeSizeLabel(x)}</option>)}</select></Field>
                <Field label="Qty"><input className="input" type="number" min="1" value={landscapeCount} onChange={e=>setLandscapeCount(+e.target.value)}/></Field>
                <button className="primary" onClick={addLandscape}>Add</button>
              </div>
              <div className="size-reference">{landscapeSizeReference(landscapePreset)}</div>
              {(project.landscapeItems||[]).length>0&&<div className="selected-items">{(project.landscapeItems||[]).map(item=><article className="selected-item compact-selected" key={item.id}>
                <div><small>{item.type}</small><h3>{item.preset}</h3></div>
                <span>{item.count} × {item.strandsEach} strands</span><b>{item.count*item.strandsEach} total</b>
                <button className="danger-link" onClick={()=>removeLandscape(item.id)}>Remove</button>
              </article>)}</div>}
            </section>
          </>}

          {step===2&&project.service==="Permanent"&&<>
            <div className="section-title"><span>2</span><div><h2>Permanent Lighting Scope</h2><p>Permanent uses exact measured footage with no automatic waste allowance.</p></div></div>
            <div className="form-grid three">
              <Field label="Measured footage"><input className="input" type="number" min="0" value={project.permanentFt} onChange={e=>set("permanentFt",+e.target.value)}/></Field>
              <Field label="Coverage"><select className="input" value={project.permanentCoverage} onChange={e=>set("permanentCoverage",e.target.value)}><option>Front Only</option><option>Front & Sides</option><option>All Around</option></select></Field>
              <Field label="Selling rate · $/ft"><input className="input" type="number" min="0" step=".5" value={project.permanentRate} onChange={e=>set("permanentRate",+e.target.value)}/></Field>
            </div>
          </>}

          {step===3&&<>
            <div className="section-title"><span>3</span><div><h2>Décor & Add-ons</h2><p>Add only what is actually included. Leave this blank for a lighting-only project.</p></div></div>
            <div className="add-item-row decor-add-row">
              <Field label="Add-on"><select className="input" value={decorType} onChange={e=>{const t=e.target.value as DecorItem["type"];setDecorType(t);if(t==="Wreath")setDecorPreset("48 in");if(t==="Garland")setDecorAmount(9);if(t==="Ground Stakes")setDecorAmount(25)}}><option>Wreath</option><option>Garland</option><option>Snowflake</option><option>Teardrop</option><option>Ground Stakes</option></select></Field>
              {decorType==="Wreath"&&<Field label="Size"><select className="input" value={decorPreset} onChange={e=>setDecorPreset(e.target.value)}><option>36 in</option><option>48 in</option><option>60 in</option></select></Field>}
              {(decorType==="Garland"||decorType==="Ground Stakes")&&<Field label="Length · ft"><input className="input" type="number" min="0" value={decorAmount} onChange={e=>setDecorAmount(+e.target.value)}/></Field>}
              {!(decorType==="Garland"||decorType==="Ground Stakes")&&<Field label="Quantity"><input className="input" type="number" min="1" value={decorCount} onChange={e=>setDecorCount(+e.target.value)}/></Field>}
              <button className="primary" onClick={addDecor}>Add</button>
            </div>
            {(project.decorItems||[]).length===0?<div className="quiet-empty">No décor or add-ons added.</div>:<div className="selected-items">{(project.decorItems||[]).map(item=><article className="selected-item decor-item" key={item.id}>
              <div><small>{item.type}</small><h3>{item.type==="Wreath"?item.preset:item.type}</h3></div>
              <b>{item.type==="Garland"||item.type==="Ground Stakes"?item.amount+" ft":item.count+" ×"}</b>
              <button className="danger-link" onClick={()=>removeDecor(item.id)}>Remove</button>
            </article>)}</div>}
          </>}

          {step===4&&<>
            <div className="section-title"><span>4</span><div><h2>Project Estimate</h2><p>Review the numbers and copy the final Jobber note. No scope editing is needed here.</p></div></div>
            <div className="estimate-summary-clean">
              <div><span>Pre-tax price</span><b>{money(estimate.selling)}</b></div>
              <div><span>Estimated tax · {(project.taxRate||0).toFixed(1)}%</span><b>{money(estimate.selling*(project.taxRate||0)/100)}</b></div>
              <div><span>Customer total</span><b>{money(estimate.selling*(1+(project.taxRate||0)/100))}</b></div>
              <div><span>Material cost</span><b>{money(estimate.material)}</b></div>
              <div><span>Gross profit</span><b>{money(estimate.gp)}</b></div>
              <div><span>Gross margin</span><b>{estimate.gm.toFixed(1)}%</b></div>
            </div>
            {shortages.length>0&&<div className="warning-box red-box"><b>Inventory shortage:</b> {shortages.map(([k,u])=>INV[k]?.name+" ("+qty(u-availability(k).available)+" short)").join(", ")}</div>}
            <div className="inline-jobber">
              <div className="inline-jobber-head"><div><span className="eyebrow">Jobber note</span><h3>Scope-aware install note</h3></div><button onClick={()=>navigator.clipboard.writeText(handoff)}>Copy note</button></div>
              <textarea className="handoff compact" readOnly value={handoff} rows={14}/>
            </div>
            <div className="review-actions"><button className="primary" onClick={()=>saveProject(true)}>{savedFlash||"Save Project"}</button></div>
          </>}

          <div className="wizard-actions">
            <button disabled={step===1} onClick={()=>setStep(s=>Math.max(1,s-1))}>← Back</button>
            <span>Step {step} of 4</span>
            {step<4?<button className="primary" onClick={()=>setStep(s=>Math.min(4,s+1))}>Next →</button>:<button className="primary" onClick={()=>saveProject(true)}>Save Project</button>}
          </div>
        </div>
      </section>}

      {tab==="measure"&&<section className="page measure-page">
        <div className="page-head purple-head"><div><span className="eyebrow">Optional utility · {project.customer||"Current project"}</span><h1>Measurements</h1><p>Upload a property photo only when needed. This screen measures; it does not create a second customer, quote or estimate.</p></div><button className="primary" onClick={()=>setTab("quote")}>Continue to Quote</button></div>
        <PhotoMeasure project={project} onApply={(key,value)=>set(key as keyof Project,value as any)} />
      </section>}

      {tab==="projects"&&<section className="page">
        <div className="page-head cyan-head">
          <div><span className="eyebrow">Sales pipeline</span><h1>Projects</h1><p>Christmas and Permanent are tracked separately so each service has its own estimate volume, wins, losses and closing rate.</p></div>
          <button className={draftsOnly?"primary":""} onClick={()=>setDraftsOnly(v=>!v)}>{draftsOnly?"Show All Projects":"View Drafts / Unfinished"}</button>
        </div>

        <div className="service-scorecards">
          <button className={"service-score "+(projectServiceView==="Christmas"?"active":"")} onClick={()=>setProjectServiceView("Christmas")}>
            <span>Christmas</span><strong>{christmasProjects.length} estimates</strong><small>{serviceClose(christmasProjects).toFixed(1)}% close rate</small>
          </button>
          <button className={"service-score "+(projectServiceView==="Permanent"?"active":"")} onClick={()=>setProjectServiceView("Permanent")}>
            <span>Permanent</span><strong>{permanentProjects.length} estimates</strong><small>{serviceClose(permanentProjects).toFixed(1)}% close rate</small>
          </button>
        </div>

        <div className="project-metrics">
          <Metric label={projectServiceView+" estimates"} value={String(serviceProjects.length)} tone="cyan"/>
          <Metric label="New estimates" value={String(openProjects.length)} tone="blue"/>
          <Metric label="Quote approved" value={String(approvedProjects.length)} tone="green"/>
          <Metric label="Quote not approved" value={String(lostProjects.length)} tone="red"/>
          <Metric label="Closing rate" value={closingRate.toFixed(1)+"%"} tone="purple"/>
          <Metric label="Draft / unfinished" value={String(unfinishedProjects.length)} tone="orange"/>
        </div>

        {serviceProjects.length===0?<div className="empty-state">No {projectServiceView} projects yet.</div>:<>
          <ProjectGroup title="New Estimates" tone="blue" projects={visibleOpen} onAction={projectAction}/>
          <ProjectGroup title="Quote Approved" tone="green" projects={visibleApproved} onAction={projectAction}/>
          <ProjectGroup title="Quote Not Approved" tone="red" projects={visibleLost} onAction={projectAction}/>
        </>}
      </section>}

      {tab==="inventory"&&<section className="page">
        <div className="page-head green-head"><div><span className="eyebrow">Inventory control center</span><h1>See risk, capacity and incoming stock—not noise.</h1><p>Inventory is organized for decisions: what is usable now, what is committed, what is inbound, and what needs attention.</p></div></div>

        <div className="inventory-summary four-summary">
          <Metric label="SKUs tracked" value={String(Object.keys(INV).length)} tone="green"/>
          <Metric label="Needs reorder" value={String(Object.entries(INV).filter(([k,i])=>i.reorder&&availability(k).projected<i.reorder).length)} tone="orange"/>
          <Metric label="Open purchase orders" value={String(purchaseOrders.filter(po=>["Draft","Ordered","Partially Received"].includes(po.status)).length)} tone="blue"/>
          <Metric label="Quote-approved jobs reserving stock" value={String(projects.filter(p=>p.status==="Quote Approved").length)} tone="purple"/>
        </div>

        <div className="inventory-toolbar">
          <input className="input" placeholder="Search SKU, color, supplier…" value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/>
          <select className="input" value={inventoryCategory} onChange={e=>setInventoryCategory(e.target.value)}>
            <option>All</option>{Array.from(new Set(Object.values(INV).map(i=>i.category))).sort().map(x=><option key={x}>{x}</option>)}
          </select>
          <select className="input" value={inventoryStatus} onChange={e=>setInventoryStatus(e.target.value)}>
            <option>All</option><option>Needs reorder</option><option>Incoming</option><option>Legacy</option><option>Healthy</option>
          </select>
        </div>

        <div className="inventory-groups">
          {Array.from(new Set(Object.values(INV).map(i=>i.category))).sort().map(category=>{
            const rows=Object.entries(INV).filter(([k,item])=>{
              const a=availability(k);
              const text=(item.name+" "+(item.supplier||"")+" "+(item.note||"")).toLowerCase();
              const matchesSearch=!inventorySearch||text.includes(inventorySearch.toLowerCase());
              const matchesCategory=inventoryCategory==="All"||item.category===inventoryCategory;
              const needs=!!item.reorder&&a.projected<item.reorder;
              const matchesStatus=inventoryStatus==="All"||
                (inventoryStatus==="Needs reorder"&&needs)||
                (inventoryStatus==="Incoming"&&a.incoming>0)||
                (inventoryStatus==="Legacy"&&!!item.legacy)||
                (inventoryStatus==="Healthy"&&!needs&&!item.legacy);
              return item.category===category&&matchesSearch&&matchesCategory&&matchesStatus;
            });
            if(rows.length===0)return null;
            return <details className="inventory-category" key={category} open={inventoryCategory!=="All"||inventorySearch!==""}>
              <summary><span>{category}</span><b>{rows.length} SKUs</b></summary>
              <div className="inventory-card-grid">
                {rows.map(([k,item])=>{const a=availability(k);const needs=!!item.reorder&&a.projected<item.reorder;return <article className={"inventory-card "+(needs?"needs ":"")+(item.legacy?"legacy ":"")} key={k}>
                  <div className="inventory-card-head"><div><small>{item.supplier||"—"}</small><h3>{item.name}</h3></div>{needs&&<span className="attention">Reorder</span>}{item.legacy&&<span className="legacy-pill">Legacy</span>}</div>
                  <div className="stock-grid">
                    <div><span>On hand</span><b>{qty(a.onHand)}</b></div>
                    <div><span>Reserved</span><b>{qty(a.reserved)}</b></div>
                    <div><span>Available</span><b>{qty(a.available)}</b></div>
                    <div><span>Incoming</span><b>{qty(a.incoming)}</b></div>
                    <div className="projected"><span>Projected</span><b>{qty(a.projected)}</b></div>
                  </div>
                  <div className="inventory-meta"><span>{item.unit}</span>{item.reorder&&<span>Reorder point: {qty(item.reorder)}</span>}{item.note&&<p>{item.note}</p>}</div>
                </article>})}
              </div>
            </details>
          })}
        </div>
      </section>}

      {tab==="purchasing"&&<section className="page">
        <div className="page-head orange-head"><div><span className="eyebrow">Procurement & purchase orders</span><h1>Turn inventory needs into controlled purchasing.</h1><p>Create POs, track what was ordered, receive stock, and let incoming inventory affect purchasing decisions.</p></div></div>

        <section className="receipt-import">
          <div className="section-title"><span>R</span><div><h2>Receive from Receipt</h2><p>Upload a clear receipt photo. The app reads likely inventory items, lets you verify quantities, then receives them into stock.</p></div></div>
          <div className="receipt-upload-row">
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={receiptBusy} onChange={e=>{const f=e.target.files?.[0];if(f)importReceipt(f)}}/>
            <span>{receiptBusy?"Reading…":receiptMessage}</span>
          </div>
          {receiptLines.length>0&&<div className="receipt-matches">
            <div className="receipt-supplier"><Field label="Detected supplier"><input className="input" value={receiptSupplier} onChange={e=>setReceiptSupplier(e.target.value)}/></Field></div>
            {receiptLines.map((line,idx)=><div className="receipt-line" key={line.key}>
              <span>{INV[line.key]?.name}</span>
              <input className="input" type="number" min="0" value={line.quantity} onChange={e=>setReceiptLines(lines=>lines.map((l,i)=>i===idx?{...l,quantity:+e.target.value}:l))}/>
              <span>{INV[line.key]?.unit}</span>
              <button className="danger-link" onClick={()=>setReceiptLines(lines=>lines.filter((_,i)=>i!==idx))}>Remove</button>
            </div>)}
            <button className="primary" onClick={confirmReceipt}>Confirm & Receive Inventory</button>
          </div>}
        </section>

        <div className="procurement-layout">
          <section className="po-builder">
            <div className="section-title"><span>PO</span><div><h2>Create purchase order</h2><p>Build an order by supplier, add SKUs, then move it from Draft → Ordered → Received.</p></div></div>
            <div className="form-grid three">
              <Field label="Supplier"><select className="input" value={poSupplier} onChange={e=>setPoSupplier(e.target.value)}>{suppliers.map(s=><option key={s}>{s}</option>)}</select></Field>
              <Field label="Expected date"><input className="input" type="date" value={poExpectedDate} onChange={e=>setPoExpectedDate(e.target.value)}/></Field>
              <Field label="Notes"><input className="input" value={poNotes} onChange={e=>setPoNotes(e.target.value)} placeholder="Season stock-up, emergency fill, etc."/></Field>
            </div>
            <div className="po-line-builder">
              <select className="input" value={poLineKey} onChange={e=>setPoLineKey(e.target.value)}>{Object.entries(INV).filter(([,i])=>!i.legacy).map(([k,i])=><option value={k} key={k}>{i.name}</option>)}</select>
              <input className="input" type="number" min="1" value={poLineQty} onChange={e=>setPoLineQty(+e.target.value)}/>
              <button onClick={addPOLine}>+ Add line</button>
            </div>
            {poLines.length>0&&<div className="po-draft-lines">
              {poLines.map((line,idx)=><div key={line.key}><span>{INV[line.key]?.name}</span><b>{qty(line.quantity)} {INV[line.key]?.unit}</b><span>{money(line.quantity*line.unitCost)}</span><button onClick={()=>setPoLines(lines=>lines.filter((_,i)=>i!==idx))}>Remove</button></div>)}
              <div className="po-total"><span>Draft total</span><b>{money(poLines.reduce((s,l)=>s+l.quantity*l.unitCost,0))}</b></div>
            </div>}
            <button className="primary po-create" disabled={poLines.length===0} onClick={createPO}>Create Draft PO</button>
          </section>

          <section className="reorder-panel">
            <div className="section-title"><span>!</span><div><h2>Recommended buys</h2><p>Uses projected stock after open POs—not just current on-hand.</p></div></div>
            <div className="purchase-grid compact">{Object.entries(INV).map(([k,item])=>{
              const a=availability(k);if(!item.reorder||a.projected>=item.reorder||item.legacy)return null;
              let buy=Math.max(item.reorder*2-a.projected,0);
              if(item.purchaseTier)buy=Math.ceil(buy/item.purchaseTier)*item.purchaseTier;
              if(k.startsWith("c9")&&item.unit==="bulbs")buy=Math.ceil(buy/500)*500;
              if(k.startsWith("clip"))buy=Math.ceil(buy/500)*500;
              return <article className="purchase-card" key={k}><span>{item.supplier}</span><h3>{item.name}</h3><strong>Buy {qty(buy)} {item.unit}</strong><p>Projected after incoming: {qty(a.projected)}</p><p>Estimated product cost: {item.cost?money(buy*item.cost):"Cost not configured"}</p><button onClick={()=>{setPoSupplier(item.supplier||"Other");setPoLineKey(k);setPoLineQty(buy)}}>Load into PO builder</button></article>
            })}</div>
          </section>
        </div>

        <section className="po-list-section">
          <div className="section-title"><span>#</span><div><h2>Purchase orders</h2><p>Receiving a PO adds its received quantity into live on-hand inventory.</p></div></div>
          {purchaseOrders.length===0?<div className="empty-state">No purchase orders yet.</div>:<div className="po-list">{purchaseOrders.map(po=>{
            const total=po.lines.reduce((s,l)=>s+l.quantity*l.unitCost,0);
            return <article className="po-card" key={po.id}>
              <div className="po-card-top"><div><small>{po.supplier}</small><h3>{po.poNumber}</h3></div><span className={"po-status "+po.status.toLowerCase().replaceAll(" ","-")}>{po.status}</span><b>{money(total)}</b></div>
              <div className="po-meta"><span>Created {new Date(po.createdAt).toLocaleDateString()}</span><span>{po.expectedDate?"Expected "+po.expectedDate:"No expected date"}</span><span>{po.lines.length} line items</span></div>
              <div className="po-lines">{po.lines.map(l=><div key={l.key}><span>{INV[l.key]?.name}</span><b>{qty(l.received)} / {qty(l.quantity)} received</b></div>)}</div>
              {po.notes&&<p className="po-notes">{po.notes}</p>}
              <div className="po-actions">
                {po.status==="Draft"&&<button onClick={()=>setPOStatus(po.id,"Ordered")}>Mark Ordered</button>}
                {["Ordered","Partially Received"].includes(po.status)&&<button className="primary" onClick={()=>receiveAll(po.id)}>Receive All</button>}
                {!["Received","Cancelled"].includes(po.status)&&<button onClick={()=>setPOStatus(po.id,"Cancelled")}>Cancel</button>}
                <button className="danger-link" onClick={()=>deletePO(po.id)}>Delete</button>
              </div>
            </article>})}</div>}
        </section>
      </section>}




    </main>
  </div>;
}


type MeasureField = "roofFt"|"ridgeFt"|"groundFt"|"garageFt"|"windowFt"|"bushFt";

function RoofSketch({kind}:{kind:string}){
  const paths:Record<string,string[]>={
    "Straight / simple":["M8 40 L92 40"],
    "Light peaks":["M8 40 L42 40 L55 24 L70 40 L92 40"],
    "Moderate peaks":["M8 40 L30 40 L42 27 L54 40 L68 40 L77 29 L88 40 L92 40"],
    "Complex":["M8 42 L25 42 L38 24 L50 42 L58 42 L68 19 L83 42 L92 42"],
    "Very complex / custom":["M8 43 L18 43 L28 31 L38 43 L48 43 L60 20 L70 35 L78 25 L92 43"]
  };
  return <svg className="roof-sketch" viewBox="0 0 100 52" aria-hidden="true">
    <path d="M8 44 L92 44" className="roof-house-base"/>
    {(paths[kind]||paths["Straight / simple"]).map((d,i)=><path d={d} key={i} className="roof-line-shape"/>)}
  </svg>
}

function ReferenceSketch({type}:{type:string}){
  return <svg className="reference-sketch" viewBox="0 0 100 62" aria-hidden="true">
    {type==="garage1"&&<><rect x="26" y="18" width="48" height="34" rx="2"/><path d="M31 26 H69 M31 34 H69 M31 42 H69"/></>}
    {type==="garage2"&&<><rect x="12" y="18" width="76" height="34" rx="2"/><path d="M18 26 H82 M18 34 H82 M18 42 H82"/><path d="M50 18 V52"/></>}
    {type==="door"&&<><rect x="35" y="10" width="30" height="44" rx="2"/><circle cx="59" cy="33" r="2"/></>}
    {type==="doubleDoor"&&<><rect x="25" y="10" width="50" height="44" rx="2"/><path d="M50 10 V54"/><circle cx="46" cy="33" r="1.7"/><circle cx="54" cy="33" r="1.7"/></>}
    {type==="window1"&&<><rect x="34" y="14" width="32" height="36" rx="2"/><path d="M50 14 V50 M34 32 H66"/></>}
    {type==="window2"&&<><rect x="22" y="14" width="56" height="36" rx="2"/><path d="M50 14 V50 M22 32 H78"/></>}
    {type==="window3"&&<><rect x="15" y="14" width="70" height="36" rx="2"/><path d="M38 14 V50 M62 14 V50 M15 32 H85"/></>}
    {type==="custom"&&<><path d="M20 32 H80 M20 26 V38 M80 26 V38"/><text x="50" y="22" textAnchor="middle">?</text></>}
  </svg>
}

type DrawPoint={x:number;y:number};
type MeasureSection={id:string;target:MeasureField;points:DrawPoint[]};
type ObjectKind="Palm"|"Tree"|"Column"|"Bush";

function PhotoMeasure({project,onApply}:{project:Project;onApply:(key:MeasureField,value:number)=>void}){
  const [imageUrl,setImageUrl]=useState("");
  const [referencePreset,setReferencePreset]=useState("garage1");
  const [referenceFt,setReferenceFt]=useState(9);
  const [referencePoints,setReferencePoints]=useState<DrawPoint[]>([]);
  const [referenceOpen,setReferenceOpen]=useState(true);
  const [mode,setMode]=useState<"reference"|"line"|"object">("reference");
  const [target,setTarget]=useState<MeasureField>("roofFt");
  const [sections,setSections]=useState<MeasureSection[]>([]);
  const [activePoints,setActivePoints]=useState<DrawPoint[]>([]);
  const [objectKind,setObjectKind]=useState<ObjectKind>("Palm");
  const [objectPoints,setObjectPoints]=useState<DrawPoint[]>([]);
  const [wrapSpacingIn,setWrapSpacingIn]=useState(6);
  const [bushDepth,setBushDepth]=useState(2);

  const refPixels=referencePoints.length===2?distance(referencePoints[0],referencePoints[1]):0;
  const pixelsPerFoot=refPixels>0&&referenceFt>0?refPixels/referenceFt:0;
  const selectedRef=REFERENCE_PRESETS.find(r=>r.key===referencePreset)||REFERENCE_PRESETS[0];

  const lineFeet=(pts:DrawPoint[])=>{
    if(pts.length<2||!pixelsPerFoot)return 0;
    let px=0;for(let i=1;i<pts.length;i++)px+=distance(pts[i-1],pts[i]);
    return px/pixelsPerFoot;
  };
  const activeFeet=lineFeet(activePoints);
  const targetSections=sections.filter(s=>s.target===target);
  const savedFeet=targetSections.reduce((sum,s)=>sum+lineFeet(s.points),0);
  const totalFeet=savedFeet+activeFeet;

  const objectDims=(()=>{
    if(objectPoints.length!==2||!pixelsPerFoot)return null;
    const a=objectPoints[0],b=objectPoints[1];
    const width=Math.abs(b.x-a.x)/pixelsPerFoot;
    const height=Math.abs(b.y-a.y)/pixelsPerFoot;
    const circumference=Math.PI*width;
    const wraps=Math.max(1,Math.ceil(height/(wrapSpacingIn/12)));
    const wrapFeet=circumference*wraps;
    const strands=Math.ceil(wrapFeet/25);
    const bushFace=width*height;
    const bushSurface=(width+2*bushDepth)*height;
    return {width,height,circumference,wraps,wrapFeet,strands,bushFace,bushSurface};
  })();

  function upload(e:any){
    const file=e.target.files?.[0];if(!file)return;
    if(imageUrl)URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));setReferencePoints([]);setSections([]);setActivePoints([]);setObjectPoints([]);setReferenceOpen(true);setMode("reference");
  }
  function chooseReference(key:string){
    const ref=REFERENCE_PRESETS.find(r=>r.key===key);if(!ref)return;
    setReferencePreset(key);if(ref.feet>0)setReferenceFt(ref.feet);setReferencePoints([]);setReferenceOpen(true);setMode("reference");
  }
  function pointFromEvent(e:any):DrawPoint{
    const rect=e.currentTarget.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/rect.width*100,y:(e.clientY-rect.top)/rect.height*100};
  }
  function clickImage(e:any){
    if(!imageUrl)return;const p=pointFromEvent(e);
    if(mode==="reference"){
      setReferencePoints(prev=>{
        const next=prev.length>=2?[p]:[...prev,p];
        if(next.length===2)setTimeout(()=>setReferenceOpen(false),250);
        return next;
      });return;
    }
    if(!pixelsPerFoot)return;
    if(mode==="object"){setObjectPoints(prev=>prev.length>=2?[p]:[...prev,p]);return}
    setActivePoints(prev=>[...prev,p]);
  }
  function newSection(){
    if(activePoints.length>=2)setSections(prev=>[...prev,{id:uid(),target,points:activePoints}]);
    setActivePoints([]);
  }
  function doneDrawing(){newSection();setMode("line")}
  function removeSection(id:string){setSections(prev=>prev.filter(s=>s.id!==id))}
  function clearTarget(){setSections(prev=>prev.filter(s=>s.target!==target));setActivePoints([])}
  function useLineMeasurement(){if(totalFeet>0)onApply(target,Math.round(totalFeet*10)/10)}

  return <div className="measure-v2">
    <div className="measure-toolbar">
      <label className="photo-upload"><input type="file" accept="image/*,.avif" onChange={upload}/><span>{imageUrl?"Replace Photo":"Add Property Photo"}</span></label>
      {imageUrl&&referencePoints.length===2&&<button className="reference-chip" onClick={()=>{setReferenceOpen(v=>!v);setMode("reference")}}>
        <ReferenceSketch type={selectedRef.type}/><span>{selectedRef.label}<b>{referenceFt} ft</b></span><small>{referenceOpen?"Close":"Edit"}</small>
      </button>}
    </div>

    {!imageUrl?<div className="measure-empty clean-empty"><ReferenceSketch type="garage2"/><b>Add a property photo</b><span>Photo measurement is optional. Use it when Google Earth or field dimensions are not enough.</span></div>:
    <div className="measure-v2-layout">
      <aside className="measure-v2-rail">
        {referenceOpen&&<section className="measure-panel compact-reference">
          <div className="panel-head"><b>Reference</b>{referencePoints.length===2&&<button onClick={()=>setReferenceOpen(false)}>Close</button>}</div>
          <div className="reference-visual-grid">{REFERENCE_PRESETS.map(ref=><button type="button" key={ref.key} onClick={()=>chooseReference(ref.key)} className={referencePreset===ref.key?"selected":""}>
            <ReferenceSketch type={ref.type}/><span>{ref.label}</span><small>{ref.feet?ref.feet+" ft":"Known size"}</small>
          </button>)}</div>
          {referencePreset==="custom"&&<Field label="Known width · ft"><input className="input" type="number" min=".1" step=".1" value={referenceFt} onChange={e=>setReferenceFt(+e.target.value)}/></Field>}
          <button className="primary full" onClick={()=>setMode("reference")}>{referencePoints.length===2?"Re-mark reference":"Mark reference"}</button>
        </section>}

        {!referenceOpen&&<section className="measure-panel measurement-controls">
          <div className="measure-mode-tabs"><button className={mode==="line"?"active":""} onClick={()=>setMode("line")}>Lines / Sections</button><button className={mode==="object"?"active":""} onClick={()=>setMode("object")}>Palm / Tree / Column / Bush</button></div>

          {mode!=="object"?<>
            <Field label="What are you measuring?"><select className="input" value={target} onChange={e=>{newSection();setTarget(e.target.value as MeasureField)}}>
              <option value="roofFt">Roofline</option><option value="ridgeFt">Ridgeline</option><option value="groundFt">Ground stake / garden bed C9</option><option value="garageFt">Garage outline</option><option value="windowFt">Window outline</option><option value="bushFt">Garden / bed length</option>
            </select></Field>
            <div className="live-measure-card"><span>Live section</span><b>{activeFeet.toFixed(1)} ft</b><small>Total {targetLabel(target)}: {totalFeet.toFixed(1)} ft</small></div>
            <div className="section-actions"><button className="primary" disabled={activePoints.length<2} onClick={newSection}>New Section</button><button disabled={activePoints.length<2} onClick={doneDrawing}>Done</button><button onClick={clearTarget}>Clear</button></div>
            {targetSections.length>0&&<div className="section-list">{targetSections.map((s,i)=><div key={s.id}><span>Section {i+1}</span><b>{lineFeet(s.points).toFixed(1)} ft</b><button onClick={()=>removeSection(s.id)}>Remove</button></div>)}</div>}
            <button className="primary full" disabled={totalFeet<=0} onClick={useLineMeasurement}>Use {totalFeet.toFixed(1)} ft in Project</button>
          </>:<>
            <Field label="Object"><select className="input" value={objectKind} onChange={e=>{setObjectKind(e.target.value as ObjectKind);setObjectPoints([])}}><option>Palm</option><option>Tree</option><option>Column</option><option>Bush</option></select></Field>
            <div className="object-instruction">Click opposite corners: bottom-left → top-right.</div>
            {(objectKind==="Palm"||objectKind==="Tree"||objectKind==="Column")&&<Field label="Wrap spacing"><select className="input" value={wrapSpacingIn} onChange={e=>setWrapSpacingIn(+e.target.value)}><option value={4}>4 in tight</option><option value={6}>6 in standard</option><option value={8}>8 in loose</option></select></Field>}
            {objectKind==="Bush"&&<Field label="Estimated hidden depth · ft"><input className="input" type="number" min=".5" step=".5" value={bushDepth} onChange={e=>setBushDepth(+e.target.value)}/></Field>}
            {objectDims?<div className="object-results">
              <div><span>Height</span><b>{objectDims.height.toFixed(1)} ft</b></div><div><span>Width</span><b>{objectDims.width.toFixed(1)} ft</b></div>
              {objectKind!=="Bush"?<><div><span>Circumference</span><b>{objectDims.circumference.toFixed(1)} ft</b></div><div><span>Estimated wrap</span><b>{objectDims.wrapFeet.toFixed(0)} ft</b></div><div><span>25-ft strands</span><b>{objectDims.strands}</b></div></>:<><div><span>Depth</span><b>{bushDepth.toFixed(1)} ft</b></div><div><span>Visible face</span><b>{objectDims.bushFace.toFixed(1)} sq ft</b></div><div><span>Approx. wrap surface</span><b>{objectDims.bushSurface.toFixed(1)} sq ft</b></div></>}
            </div>:<div className="quiet-empty">Mark two opposite corners on the photo.</div>}
            <button onClick={()=>setObjectPoints([])}>Clear Object</button>
          </>}
        </section>}
      </aside>

      <div className="measure-photo-stage" onClick={clickImage}>
        <img src={imageUrl}/>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {referencePoints.length===2&&<line x1={referencePoints[0].x} y1={referencePoints[0].y} x2={referencePoints[1].x} y2={referencePoints[1].y} className="ref-line"/>}
          {referencePoints.map((p,i)=><circle key={"r"+i} cx={p.x} cy={p.y} r=".35" className="ref-point"/>)}
          {sections.map((s,si)=><g key={s.id}><polyline points={s.points.map(p=>p.x+","+p.y).join(" ")} className="measure-line saved"/><text x={midPoint(s.points).x} y={midPoint(s.points).y} className="measure-label">{lineFeet(s.points).toFixed(1)} ft</text></g>)}
          {activePoints.length>1&&<><polyline points={activePoints.map(p=>p.x+","+p.y).join(" ")} className="measure-line"/><text x={midPoint(activePoints).x} y={midPoint(activePoints).y} className="measure-label live">{activeFeet.toFixed(1)} ft</text></>}
          {activePoints.map((p,i)=><circle key={"a"+i} cx={p.x} cy={p.y} r=".28" className="measure-point"/>)}
          {objectPoints.length===2&&<><rect x={Math.min(objectPoints[0].x,objectPoints[1].x)} y={Math.min(objectPoints[0].y,objectPoints[1].y)} width={Math.abs(objectPoints[1].x-objectPoints[0].x)} height={Math.abs(objectPoints[1].y-objectPoints[0].y)} className="object-box"/><text x={(objectPoints[0].x+objectPoints[1].x)/2} y={Math.min(objectPoints[0].y,objectPoints[1].y)-1} className="measure-label live">{objectDims?objectDims.height.toFixed(1)+"h × "+objectDims.width.toFixed(1)+"w":""}</text></>}
          {objectPoints.map((p,i)=><circle key={"o"+i} cx={p.x} cy={p.y} r=".28" className="object-point"/>)}
        </svg>
        <div className="photo-hint">{mode==="reference"?"Click both edges of the "+selectedRef.label.toLowerCase():mode==="object"?"Click opposite corners of the "+objectKind.toLowerCase():activePoints.length?"Keep tracing or choose New Section":"Click the first point of this section"}</div>
      </div>
    </div>}
  </div>
}
function targetLabel(v:MeasureField){return ({roofFt:"Roofline",ridgeFt:"Ridgeline",groundFt:"Ground / garden-bed C9",garageFt:"Garage outline",windowFt:"Window outline",bushFt:"Garden / bed"} as Record<MeasureField,string>)[v]}
function midPoint(points:DrawPoint[]){if(!points.length)return{x:50,y:50};const i=Math.floor(points.length/2);if(points.length%2)return points[i];return{x:(points[i-1].x+points[i].x)/2,y:(points[i-1].y+points[i].y)/2}}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(b.x-a.x,b.y-a.y)}

function ProjectGroup({title,tone,projects,onAction}:{title:string;tone:string;projects:Project[];onAction:(p:Project,a:string)=>void}){
  return <section className={"project-group "+tone}>
    <div className="project-group-head"><h2>{title}</h2><span>{projects.length}</span></div>
    {projects.length===0?<div className="project-group-empty">No projects in this category.</div>:<div className="project-list">
      {projects.map(p=><article className="project-row pipeline-row" key={p.id}>
        <div className="project-main"><b>{p.customer||"Unnamed customer"}</b><span>{[p.address,p.city].filter(Boolean).join(", ")||"No address"}</span></div>
        <span>{p.service}</span>
        <span className={p.quoteComplete?"completion-pill complete":"completion-pill draft"}>{p.quoteComplete?"Quote Complete":"Draft · Step "+(p.draftStep||0)}</span>
        <span className={"status-pill "+p.status.toLowerCase().replaceAll(" ","-")}>{p.status}</span>
        <select className="project-action-select" defaultValue="" onChange={e=>{const a=e.target.value;projectActionReset(e.currentTarget);onAction(p,a)}}>
          <option value="" disabled>Update status…</option>
          {p.status!=="New Estimate"&&<option value="new-estimate">Move to New Estimate</option>}
          {p.status!=="Quote Approved"&&<option value="approved">Mark Quote Approved</option>}
          {p.status!=="Quote Not Approved"&&<option value="not-approved">Mark Quote Not Approved</option>}
          <option value="delete">Delete Project</option>
        </select>
      </article>)}
    </div>}
  </section>
}
function projectActionReset(el:HTMLSelectElement){setTimeout(()=>{el.value=""},0)}

function Nav({active,tone,onClick,children}:{active:boolean;tone:string;onClick:()=>void;children:any}){
  return <button className={"nav-item "+tone+" "+(active?"active":"")} onClick={onClick}><i></i>{children}</button>
}


function parseReceiptText(text:string):POLine[]{
  const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const aliases:Record<string,string[]>={
    c9Sun:["sun warm","c9 sun","warm white c9"],c9Traditional:["traditional warm"],
    c9Cool:["cool white"],c9Pure:["pure white"],c9Red:["c9 red","red c9"],c9Green:["c9 green","green c9"],
    c9Blue:["c9 blue","blue c9"],c9Multi:["multicolor","multi color"],c9Pink:["c9 pink"],c9Yellow:["c9 yellow"],c9Purple:["c9 purple"],
    c9Cord15:["15 inch socket","15\" socket","15 in socket","c9 socket cord"],
    c7Sun:["c7 sun warm","c7 warm white"],c7Cord24:["c7 socket","24\" c7"],
    miniSun:["sun warm mini","warm white mini","50l sun warm"],s4Mini:["nxg","coupling nxg","benchmark coupling"],
    wreath48:["48\" wreath","48 inch wreath"],garland9:["9ft garland","9 ft garland","prelit garland"],
    clipShingle:["c9 clip","circle clip"],clipTile:["tile clip"],clipRidge:["ridge clip","peak clip"],
    stakesCircle:["circle top stake"],timerTouchSmart:["touchsmart"]
  };
  const found:Record<string,POLine>={};
  for(const line of lines){
    for(const [key,terms] of Object.entries(aliases)){
      if(terms.some(t=>line.includes(t))){
        const m=line.match(/(?:qty|quantity|x)\s*[:x-]?\s*(\d+(?:\.\d+)?)/i)||line.match(/^\s*(\d+(?:\.\d+)?)\s+/);
        const quantity=m?Number(m[1]):1;
        if(!found[key])found[key]={key,quantity,unitCost:INV[key]?.cost||0,received:0};
        else found[key].quantity+=quantity;
      }
    }
  }
  return Object.values(found);
}

function suggestTaxRate(city:string){
  const v=city.trim().toLowerCase();
  const orange=["orlando","windermere","winter garden","lake nona","winter park","ocoee","apopka"];
  const lake=["clermont","minneola","groveland"];
  const osceola=["kissimmee","celebration","st cloud","saint cloud"];
  const polk=["winter haven","lakeland","davenport","auburndale","hainse city","haines city"];
  if(orange.includes(v))return 6.5;
  if(lake.includes(v))return 7.0;
  if(osceola.includes(v))return 7.5;
  if(polk.includes(v))return 7.0;
  return 6.0;
}
function taxCountyNote(city:string){
  const r=suggestTaxRate(city);
  if(r===6.5)return "6% Florida + 0.5% county surtax suggestion";
  if(r===7.0)return "6% Florida + 1.0% county surtax suggestion";
  if(r===7.5)return "6% Florida + 1.5% county surtax suggestion";
  return "Base Florida rate only — verify exact county/address";
}
function defaultLandscapePreset(type:LandscapeItem["type"]){
  return type==="Palm"?"Small Palm":type==="Tree"?"Small Tree":type==="Bush"?"Small Bush":"Small Column";
}
function landscapePresetsFor(type:LandscapeItem["type"]){
  return Object.keys(LANDSCAPE_PRESETS).filter(k=>LANDSCAPE_PRESETS[k].type===type);
}
function landscapeSizeLabel(preset:string){return preset.replace(/ Palm| Tree| Bush| Column/,"")}
function landscapeSizeReference(preset:string){
  const refs:Record<string,string>={
    "Small Palm":"Small · up to about 6 ft of trunk wrap · 4 strands",
    "Standard Palm":"Standard · about 6–12 ft of trunk wrap · 10 strands",
    "Large Palm":"Large · over about 12 ft of trunk wrap · 16 strands · verify photo/field dimensions",
    "Small Tree":"Small · compact trunk/branch scope · 6 strands",
    "Standard Tree":"Standard · typical front-yard feature tree · 12 strands",
    "Large Tree":"Large · broad/tall tree or heavier branch scope · 20 strands · verify dimensions",
    "Small Bush":"Small · individual compact shrub · 1 strand",
    "Standard Bush":"Standard · typical foundation shrub · 2 strands",
    "Large Bush":"Large · wide/deep shrub mass · 4 strands · verify dimensions",
    "Small Column":"Small · narrow entry post · 2 strands",
    "Standard Column":"Standard · typical porch column · 4 strands",
    "Large Column":"Large · wide/tall pillar · 6 strands · verify circumference"
  };
  return refs[preset]||"";
}

const LANDSCAPE_PRESETS:Record<string,{type:LandscapeItem["type"];strands:number}> = {
  "Small Palm":{type:"Palm",strands:4},"Standard Palm":{type:"Palm",strands:10},"Large Palm":{type:"Palm",strands:16},
  "Small Tree":{type:"Tree",strands:6},"Standard Tree":{type:"Tree",strands:12},"Large Tree":{type:"Tree",strands:20},
  "Small Bush":{type:"Bush",strands:1},"Standard Bush":{type:"Bush",strands:2},"Large Bush":{type:"Bush",strands:4},
  "Small Column":{type:"Column",strands:2},"Standard Column":{type:"Column",strands:4},"Large Column":{type:"Column",strands:6}
};

function colorCost(color:string){
  if(color==="Sun Warm White")return INV.c9Sun.cost;
  if(color==="Pure White")return INV.c9Pure.cost;
  if(color==="Cool White")return INV.c9Cool.cost;
  if(color==="Red")return INV.c9Red.cost;
  if(color==="Green")return INV.c9Green.cost;
  if(color==="Blue")return INV.c9Blue.cost;
  if(color==="Pink")return INV.c9Pink.cost;
  if(color==="Purple")return INV.c9Purple.cost;
  if(color==="Yellow")return INV.c9Yellow.cost;
  if(color==="Multicolor")return INV.c9Multi.cost;
  if(color==="Red / Green")return (INV.c9Red.cost+INV.c9Green.cost)/2;
  return INV.c9Sun.cost;
}
function applyColor(u:Record<string,number>,color:string,count:number){
  const map:Record<string,string>={"Sun Warm White":"c9Sun","Pure White":"c9Pure","Cool White":"c9Cool","Red":"c9Red","Green":"c9Green","Blue":"c9Blue","Pink":"c9Pink","Purple":"c9Purple","Yellow":"c9Yellow","Multicolor":"c9Multi"};
  if(color==="Red / Green"){u.c9Red=(u.c9Red||0)+Math.ceil(count/2);u.c9Green=(u.c9Green||0)+Math.floor(count/2);return}
  const k=map[color]||"c9Sun";u[k]=(u[k]||0)+count;
}
function buildHandoff(p:Project,e:any){
  if(p.service==="Permanent"){
    const lines=[
      "PROPERTY: "+p.stories+" story · "+p.roofSurface+" · "+p.complexity+" · "+p.access,
      "COLOR / SYSTEM: Minleon permanent lighting",
      "",
      "PERMANENT LIGHTING",
      "Coverage: "+p.permanentCoverage,
      "Measured footage: "+p.permanentFt+" ft",
      "Expected material: "+p.permanentFt+" ft Minleon permanent lighting",
      "",
      "TECH: Record actual installed footage and explain any variance."
    ];
    return lines.join("\n");
  }

  const lines:string[]=[
    "PROPERTY: "+p.stories+" story · "+p.roofSurface+" · "+p.complexity+" · "+p.access,
    "COLOR: "+p.c9Color
  ];

  if(p.roofFt>0||p.garageFt>0||p.windowFt>0){
    lines.push("","C9 ROOFLINE / OUTLINES");
    if(p.roofFt>0)lines.push("Roofline: "+p.roofFt+" ft");
    if(p.garageFt>0)lines.push("Garage / architectural outline: "+p.garageFt+" ft");
    if(p.windowFt>0)lines.push("Window outline: "+p.windowFt+" ft");
    const mainBulbs=Math.ceil((p.roofFt+p.garageFt+p.windowFt)/1.25);
    lines.push("Expected materials: "+mainBulbs+" C9 bulbs · "+mainBulbs+" "+(p.roofSurface==="Tile"?"tile clips":p.roofSurface==="Metal"?"magnetic clips":"roof clips")+" · "+qty(p.roofFt+p.garageFt+p.windowFt)+" ft 15-inch socket cord");
  }

  if(p.ridgeFt>0){
    lines.push("","RIDGELINE");
    lines.push(p.ridgeFt+" ft");
    lines.push("Expected materials: "+e.ridgeBulbs+" C9 bulbs · "+e.ridgeBulbs+" ridge clips · "+p.ridgeFt+" ft 15-inch socket cord");
  }

  if(p.groundFt>0){
    lines.push("","GROUND STAKES");
    lines.push(p.groundFt+" ft");
    lines.push("Expected materials: "+e.groundBulbs+" Traditional Warm C9 bulbs · "+e.groundBulbs+" ground stakes · "+p.groundFt+" ft 15-inch socket cord");
  }

  const landscape=p.landscapeItems||[];
  if(landscape.length){
    lines.push("","MINI LIGHTS");
    landscape.forEach(i=>lines.push(i.count+" × "+i.preset+" = "+(i.count*i.strandsEach)+" strands"));
    const total=landscape.reduce((s,i)=>s+i.count*i.strandsEach,0);
    lines.push("Expected materials: "+total+" mini-light strands");
  }

  const decor=(p.decorItems||[]).filter(i=>i.type!=="Ground Stakes");
  if(decor.length){
    lines.push("","DECOR / ADD-ONS");
    decor.forEach(i=>{
      if(i.type==="Wreath")lines.push(i.count+" × "+i.preset+" wreath");
      else if(i.type==="Garland")lines.push(i.amount+" ft garland");
      else lines.push(i.count+" × "+i.type);
    });
  }

  lines.push("","TECH: Install only the listed scope. Record actual material used and note any variance before closing the job.");
  return lines.join("\n");
}
