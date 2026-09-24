import { useEffect, useMemo, useState } from "react";

type Service = "Christmas" | "Permanent";
type Status = "Draft" | "Quote Sent" | "Approved" | "Installed" | "Cancelled";
type Tab = "quote" | "measure" | "projects" | "inventory" | "purchasing" | "handoff" | "finance";
type InventoryItem = {
  name:string; category:string; on:number; unit:string; cost:number; reorder?:number;
  note?:string; supplier?:string; purchaseTier?:number; legacy?:boolean; damaged?:number;
};
type Project = {
  id:string; updatedAt:string; customer:string; address:string; service:Service; status:Status;
  roofFt:number; ridgeFt:number; groundFt:number; garageFt:number; windowFt:number; c9Color:string;
  stories:number; roofSurface:string; complexity:string; access:string;
  bushFt:number; bushStrandsOverride:number; palmStrands:number; treeStrands:number; columnStrands:number;
  wreathSize:number; wreathQty:number; garlandFt:number; snowflakes:number; treeDrops:number;
  permanentFt:number; permanentCoverage:string; permanentRate:number;
};

const STORAGE="ltp-projects-v2";
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

const emptyProject=():Project=>({
  id:uid(),updatedAt:new Date().toISOString(),customer:"",address:"",service:"Christmas",status:"Draft",
  roofFt:0,ridgeFt:0,groundFt:0,garageFt:0,windowFt:0,c9Color:"Sun Warm White",
  stories:1,roofSurface:"Shingle",complexity:"Straight / simple",access:"Standard ladder access",
  bushFt:0,bushStrandsOverride:0,palmStrands:0,treeStrands:0,columnStrands:0,
  wreathSize:48,wreathQty:0,garlandFt:0,snowflakes:0,treeDrops:0,
  permanentFt:0,permanentCoverage:"Front Only",permanentRate:35
});

function loadProjects():Project[]{
  try{return JSON.parse(localStorage.getItem(STORAGE)||"[]")}catch{return[]}
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
  const [tab,setTab]=useState<Tab>("quote");
  const [step,setStep]=useState(1);
  const [project,setProject]=useState<Project>(emptyProject());
  const [projects,setProjects]=useState<Project[]>(()=>loadProjects());
  const [salesTaxRate,setSalesTaxRate]=useState(7);
  const [savedFlash,setSavedFlash]=useState("");

  useEffect(()=>{localStorage.setItem(STORAGE,JSON.stringify(projects))},[projects]);

  const set=<K extends keyof Project>(key:K,value:Project[K])=>setProject(p=>({...p,[key]:value,updatedAt:new Date().toISOString()}));

  const estimate=useMemo(()=>{
    if(project.service==="Permanent"){
      const sell=project.permanentFt*project.permanentRate;
      const material=0;
      return {selling:sell,material,gp:sell-material,gm:sell?sell?((sell-material)/sell)*100:0:0,roofRate:0,
        roofBulbs:0,ridgeBulbs:0,groundBulbs:0,bushStrands:0,miniStrands:0};
    }
    let base=project.stories===1?8.5:project.stories===2?9.5:10.5;
    base+=complexityRates[project.complexity]||0;
    if(project.roofSurface==="Tile")base+=.5;
    if(project.roofSurface==="Metal")base+=.25;
    if(project.access==="Difficult / steep")base+=.5;
    if(project.access==="Special equipment")base+=1;
    const roofRate=Math.min(12,Math.max(8,base));
    const roofBulbs=Math.ceil((project.roofFt+project.garageFt+project.windowFt)/1.25);
    const ridgeBulbs=Math.ceil(project.ridgeFt/1.25);
    const groundBulbs=Math.ceil(project.groundFt/1.25);
    const bushStrands=project.bushStrandsOverride>0?project.bushStrandsOverride:Math.ceil(project.bushFt/25);
    const miniStrands=bushStrands+project.palmStrands+project.treeStrands+project.columnStrands;
    const wreathPrice=project.wreathQty*(project.wreathSize===36?200:project.wreathSize===48?300:600);
    const selling=(project.roofFt+project.garageFt+project.windowFt)*roofRate+
      project.ridgeFt*Math.min(12,roofRate+.5)+project.groundFt*4+miniStrands*35+
      wreathPrice+project.garlandFt*22;
    const bulbCost=colorCost(project.c9Color);
    const clipCost=project.roofSurface==="Tile"?INV.clipTile.cost:project.roofSurface==="Metal"?INV.clipMetal.cost:INV.clipShingle.cost;
    const existingMinis=Math.max(0,(INV.miniSun.on-(INV.miniSun.damaged||0)));
    const minleonUsed=Math.min(existingMinis,miniStrands);
    const s4Used=Math.max(0,miniStrands-minleonUsed);
    const material=(roofBulbs+ridgeBulbs)*bulbCost+groundBulbs*INV.c9Traditional.cost+
      (project.roofFt+project.ridgeFt+project.groundFt+project.garageFt+project.windowFt)*INV.c9Cord15.cost+
      roofBulbs*clipCost+ridgeBulbs*INV.clipRidge.cost+groundBulbs*INV.stakesCircle.cost+
      minleonUsed*INV.miniSun.cost+s4Used*INV.s4Mini.cost+
      project.wreathQty*(project.wreathSize===48?INV.wreath48.cost:project.wreathSize===36?85:300)+
      Math.ceil(project.garlandFt/9)*INV.garland9.cost;
    return {selling,material,gp:selling-material,gm:selling?((selling-material)/selling)*100:0,roofRate,roofBulbs,ridgeBulbs,groundBulbs,bushStrands,miniStrands};
  },[project]);

  const projectUsage=(p:Project)=>{
    if(p.service==="Permanent")return {permanent:p.permanentFt};
    const roofBulbs=Math.ceil((p.roofFt+p.garageFt+p.windowFt)/1.25);
    const ridgeBulbs=Math.ceil(p.ridgeFt/1.25);
    const groundBulbs=Math.ceil(p.groundFt/1.25);
    const bushes=p.bushStrandsOverride>0?p.bushStrandsOverride:Math.ceil(p.bushFt/25);
    const minis=bushes+p.palmStrands+p.treeStrands+p.columnStrands;
    const u:Record<string,number>={c9Cord15:p.roofFt+p.ridgeFt+p.groundFt+p.garageFt+p.windowFt,clipRidge:ridgeBulbs,stakesCircle:groundBulbs,c9Traditional:groundBulbs};
    const clip=p.roofSurface==="Tile"?"clipTile":p.roofSurface==="Metal"?"clipMetal":"clipShingle";
    u[clip]=(u[clip]||0)+roofBulbs;
    applyColor(u,p.c9Color,roofBulbs+ridgeBulbs);
    const minleonAvailable=Math.max(0,INV.miniSun.on-(INV.miniSun.damaged||0));
    u.miniSun=Math.min(minleonAvailable,minis);
    u.s4Mini=Math.max(0,minis-u.miniSun);
    if(p.wreathSize===48)u.wreath48=p.wreathQty;
    u.garland9=Math.ceil(p.garlandFt/9);
    return u;
  };

  const committed=useMemo(()=>{
    const reserved:Record<string,number>={},consumed:Record<string,number>={};
    projects.forEach(p=>{
      const u=projectUsage(p);
      const bucket=p.status==="Approved"?reserved:p.status==="Installed"?consumed:null;
      if(!bucket)return;
      Object.entries(u).forEach(([k,v])=>bucket[k]=(bucket[k]||0)+v);
    });
    return {reserved,consumed};
  },[projects]);

  const currentUsage=projectUsage(project);

  const availability=(key:string)=>{
    const item=INV[key];
    const damaged=item.damaged||0;
    const reserved=committed.reserved[key]||0;
    const consumed=committed.consumed[key]||0;
    return {damaged,reserved,consumed,available:item.on-damaged-reserved-consumed};
  };

  const shortages=Object.entries(currentUsage).filter(([key,use])=>{
    const a=availability(key);
    return use>a.available;
  });

  function saveProject(){
    const next={...project,updatedAt:new Date().toISOString()};
    setProjects(prev=>{
      const i=prev.findIndex(x=>x.id===next.id);
      if(i<0)return [next,...prev];
      const copy=[...prev];copy[i]=next;return copy;
    });
    setSavedFlash("Saved");
    window.setTimeout(()=>setSavedFlash(""),1600);
  }
  function newProject(){setProject(emptyProject());setStep(1);setTab("quote")}
  function openProject(p:Project){setProject(p);setStep(1);setTab("quote")}
  function deleteProject(id:string){setProjects(p=>p.filter(x=>x.id!==id));if(project.id===id)newProject()}

  const handoff=buildHandoff(project,estimate);

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">LTP</span>
        <div><small>Company Operations</small><strong>Lighting Ops</strong></div>
      </div>
      <div className="single-mode">Single-app mode · real user login is the next security layer.</div>
      <nav>
        <Nav active={tab==="quote"} tone="blue" onClick={()=>setTab("quote")}>Quote Builder</Nav>
        <Nav active={tab==="measure"} tone="purple" onClick={()=>setTab("measure")}>Photo Measure</Nav>
        <Nav active={tab==="projects"} tone="cyan" onClick={()=>setTab("projects")}>Projects</Nav>
        <Nav active={tab==="inventory"} tone="green" onClick={()=>setTab("inventory")}>Inventory</Nav>
        <Nav active={tab==="purchasing"} tone="orange" onClick={()=>setTab("purchasing")}>Purchasing</Nav>
        <Nav active={tab==="handoff"} tone="pink" onClick={()=>setTab("handoff")}>Jobber Notes</Nav>
      </nav>
      <button className="new-project" onClick={newProject}>+ New project</button>
    </aside>

    <main className="main">
      {tab==="quote"&&<section className="page">
        <div className="page-head blue-head">
          <div><span className="eyebrow">One project · one source of truth</span><h1>Build the quote without duplicating information.</h1><p>Customer data lives once. Property, landscape and lighting measurements all feed the same project, price, material list and Jobber notes.</p></div>
          <div className="head-actions"><span className={"status-pill "+project.status.toLowerCase().replaceAll(" ","-")}>{project.status}</span><button className="primary" onClick={saveProject}>{savedFlash||"Save project"}</button></div>
        </div>

        <div className="stepper four-steps">
          <StepDot n={1} label="Project" active={step===1} done={step>1} onClick={()=>setStep(1)}/>
          <StepDot n={2} label="Property" active={step===2} done={step>2} onClick={()=>setStep(2)}/>
          <StepDot n={3} label="Landscape & décor" active={step===3} done={step>3} onClick={()=>setStep(3)}/>
          <StepDot n={4} label="Lighting scope" active={step===4} done={false} onClick={()=>setStep(4)}/>
        </div>

        <div className={"wizard-card step-"+step}>
          {step===1&&<>
            <div className="section-title"><span>1</span><div><h2>Project reference</h2><p>Only the information needed to tie this internal estimate back to GHL and Jobber.</p></div></div>
            <div className="form-grid two">
              <Field label="Customer name"><input className="input" value={project.customer} onChange={e=>set("customer",e.target.value)}/></Field>
              <Field label="Property address"><input className="input" value={project.address} onChange={e=>set("address",e.target.value)}/></Field>
              <Field label="Service"><select className="input" value={project.service} onChange={e=>set("service",e.target.value as Service)}><option>Christmas</option><option>Permanent</option></select></Field>
              <Field label="Project status" hint="Approved reserves material. Installed consumes the planned quantity until actual usage is reconciled."><select className="input" value={project.status} onChange={e=>set("status",e.target.value as Status)}>{["Draft","Quote Sent","Approved","Installed","Cancelled"].map(x=><option key={x}>{x}</option>)}</select></Field>
            </div>
          </>}

          {step===2&&<>
            <div className="section-title"><span>2</span><div><h2>Property</h2><p>Describe the property before choosing the lighting scope. These answers drive difficulty, hardware and pricing.</p></div></div>
            <div className="form-grid two">
              <Field label="Stories"><select className="input" value={project.stories} onChange={e=>set("stories",+e.target.value)}><option value={1}>1 story</option><option value={2}>2 stories</option><option value={3}>3 stories</option></select></Field>
              <Field label="Roof surface"><select className="input" value={project.roofSurface} onChange={e=>set("roofSurface",e.target.value)}><option>Shingle</option><option>Tile</option><option>Metal</option><option>Mixed / Other</option></select></Field>
              <Field label="Roofline complexity" hint="Five levels so 'a few peaks' is not forced to jump straight to complex."><select className="input" value={project.complexity} onChange={e=>set("complexity",e.target.value)}>{Object.keys(complexityRates).map(x=><option key={x}>{x}</option>)}</select></Field>
              <Field label="Access"><select className="input" value={project.access} onChange={e=>set("access",e.target.value)}><option>Standard ladder access</option><option>Difficult / steep</option><option>Special equipment</option></select></Field>
            </div>
            {project.service==="Christmas"&&<div className="rate-display"><span>Auto roofline rate</span><strong>{money(estimate.roofRate)}/ft</strong><small>Target range is constrained to $8–$12/ft.</small></div>}
          </>}

          {step===3&&<>
            <div className="section-title"><span>3</span><div><h2>Landscape & décor</h2><p>Add only what is actually in the design. Use the measurement tool for trees, columns and irregular bushes when needed.</p></div></div>
            <div className="subgroup green-group">
              <h3>Mini-light areas</h3>
              <div className="form-grid four">
                <Field label="Bush measurement · ft" hint="Quick method: measured feet ÷ 25, always round up."><input className="input" type="number" min="0" value={project.bushFt} onChange={e=>set("bushFt",+e.target.value)}/></Field>
                <Field label="Bush strands override" hint="Use this when Photo Measure gives a more accurate surface-area result."><input className="input" type="number" min="0" value={project.bushStrandsOverride} onChange={e=>set("bushStrandsOverride",+e.target.value)}/></Field>
                <Field label="Palm strands"><input className="input" type="number" min="0" value={project.palmStrands} onChange={e=>set("palmStrands",+e.target.value)}/></Field>
                <Field label="Tree strands"><input className="input" type="number" min="0" value={project.treeStrands} onChange={e=>set("treeStrands",+e.target.value)}/></Field>
                <Field label="Column / pillar strands"><input className="input" type="number" min="0" value={project.columnStrands} onChange={e=>set("columnStrands",+e.target.value)}/></Field>
              </div>
              <button className="measure-link" onClick={()=>setTab("measure")}>Open Photo Measure for circumference / surface estimates →</button>
            </div>
            <div className="subgroup purple-group">
              <h3>Decor</h3>
              <div className="form-grid four">
                <Field label="Wreath size"><select className="input" value={project.wreathSize} onChange={e=>set("wreathSize",+e.target.value)}><option value={36}>36 in</option><option value={48}>48 in</option><option value={60}>60 in</option></select></Field>
                <Field label="Wreath quantity"><input className="input" type="number" min="0" value={project.wreathQty} onChange={e=>set("wreathQty",+e.target.value)}/></Field>
                <Field label="Garland · ft"><input className="input" type="number" min="0" value={project.garlandFt} onChange={e=>set("garlandFt",+e.target.value)}/></Field>
                <Field label="Window snowflakes · qty" hint="Included in scope tracking; selling-price rule still needs to be finalized."><input className="input" type="number" min="0" value={project.snowflakes} onChange={e=>set("snowflakes",+e.target.value)}/></Field>
                <Field label="Tree hanging drops · qty" hint="Included in scope tracking; selling-price rule still needs to be finalized."><input className="input" type="number" min="0" value={project.treeDrops} onChange={e=>set("treeDrops",+e.target.value)}/></Field>
              </div>
            </div>
          </>}

          {step===4&&project.service==="Christmas"&&<>
            <div className="section-title"><span>4</span><div><h2>Lighting scope</h2><p>Enter the final lighting measurements for this project. Use Google Earth first and Photo Measure only where it adds accuracy.</p></div></div>
            <div className="form-grid three">
              <Field label="Main roofline · ft"><input className="input" type="number" min="0" value={project.roofFt} onChange={e=>set("roofFt",+e.target.value)}/></Field>
              <Field label="Ridgeline · ft"><input className="input" type="number" min="0" value={project.ridgeFt} onChange={e=>set("ridgeFt",+e.target.value)}/></Field>
              <Field label="Ground-stake line · ft" hint="Automatically burns down Traditional Warm C9 inventory."><input className="input" type="number" min="0" value={project.groundFt} onChange={e=>set("groundFt",+e.target.value)}/></Field>
              <Field label="Garage / architectural outline · ft"><input className="input" type="number" min="0" value={project.garageFt} onChange={e=>set("garageFt",+e.target.value)}/></Field>
              <Field label="Window outline · ft"><input className="input" type="number" min="0" value={project.windowFt} onChange={e=>set("windowFt",+e.target.value)}/></Field>
              <Field label="C9 color / pattern"><select className="input" value={project.c9Color} onChange={e=>set("c9Color",e.target.value)}>{["Sun Warm White","Pure White","Cool White","Red","Green","Red / Green","Multicolor","Blue","Pink","Purple","Yellow"].map(x=><option key={x}>{x}</option>)}</select></Field>
            </div>
            <div className="live-calc blue-strip"><b>{project.roofFt} ft roofline</b> at 15-inch spacing = <b>{Math.ceil(project.roofFt/1.25)} bulbs</b>. Ridgeline and outline footage are calculated separately, not hidden inside the roofline number.</div>
            <div className="quote-summary-inline">
              <Metric label="Suggested pre-tax price" value={money(estimate.selling)} tone="blue"/>
              <Metric label="Material cost" value={money(estimate.material)} tone="purple"/>
              <Metric label="Gross profit" value={money(estimate.gp)} tone="green"/>
              <Metric label="Gross margin" value={estimate.gm.toFixed(1)+"%"} tone="green"/>
            </div>
            {shortages.length>0&&<div className="warning-box red-box"><b>Inventory shortage:</b> {shortages.map(([k,u])=>INV[k]?.name+" ("+qty(u-availability(k).available)+" short)").join(", ")}</div>}
            <div className="review-actions"><button className="primary" onClick={saveProject}>{savedFlash||"Save project"}</button><button onClick={()=>setTab("handoff")}>Open Jobber notes</button></div>
          </>}

          {step===4&&project.service==="Permanent"&&<>
            <div className="section-title"><span>4</span><div><h2>Permanent lighting scope</h2><p>Permanent inventory uses exact footage. No automatic cut or waste allowance.</p></div></div>
            <div className="form-grid three">
              <Field label="Measured footage"><input className="input" type="number" min="0" value={project.permanentFt} onChange={e=>set("permanentFt",+e.target.value)}/></Field>
              <Field label="Coverage"><select className="input" value={project.permanentCoverage} onChange={e=>set("permanentCoverage",e.target.value)}><option>Front Only</option><option>Front & Sides</option><option>All Around</option></select></Field>
              <Field label="Selling rate · $/ft" hint="Owner/company setting; current working value."><input className="input" type="number" min="0" step=".5" value={project.permanentRate} onChange={e=>set("permanentRate",+e.target.value)}/></Field>
            </div>
            <div className="live-calc blue-strip"><b>{project.permanentFt} ft required</b> against <b>200 ft current permanent inventory</b>. No waste deduction.</div>
            <div className="quote-summary-inline">
              <Metric label="Suggested pre-tax price" value={money(estimate.selling)} tone="blue"/>
              <Metric label="Material cost" value={money(estimate.material)} tone="purple"/>
              <Metric label="Gross profit" value={money(estimate.gp)} tone="green"/>
              <Metric label="Gross margin" value={estimate.gm.toFixed(1)+"%"} tone="green"/>
            </div>
            {shortages.length>0&&<div className="warning-box red-box"><b>Inventory shortage:</b> {shortages.map(([k,u])=>INV[k]?.name+" ("+qty(u-availability(k).available)+" short)").join(", ")}</div>}
            <div className="review-actions"><button className="primary" onClick={saveProject}>{savedFlash||"Save project"}</button><button onClick={()=>setTab("handoff")}>Open Jobber notes</button></div>
          </>}

          <div className="wizard-actions">
            <button disabled={step===1} onClick={()=>setStep(s=>Math.max(1,s-1))}>← Back</button>
            <span>Step {step} of 4</span>
            <button className="primary" disabled={step===4} onClick={()=>setStep(s=>Math.min(4,s+1))}>Next →</button>
          </div>
        </div>
      </section>}

      {tab==="measure"&&<section className="page measure-page">
        <div className="page-head purple-head"><div><span className="eyebrow">Measurement tool for the current project</span><h1>Photo Measure</h1><p><b>{project.customer||"Current project"}</b>{project.address?" · "+project.address:""}. Customer information belongs to the project record once; Photo Measure is only for producing measurements.</p></div><a className="open-tool" href="https://light-the-peak-estimator.wealthxgroup.chatgpt.site/" target="_blank" rel="noreferrer">Open full screen ↗</a></div>
        <div className="measure-note"><b>One project only:</b> use Google Earth for roofline/ridgeline when possible, then use Photo Measure for trees, palms, columns, bushes and anything aerial imagery cannot measure well. The current embedded legacy tool still has its own customer fields; those are not part of the new project record and will be removed when we migrate the measurement engine directly into this app.</div>
        <div className="iframe-wrap"><iframe title="Light The Peak Photo Measure" src="https://light-the-peak-estimator.wealthxgroup.chatgpt.site/" /></div>
      </section>}

      {tab==="projects"&&<section className="page">
        <div className="page-head cyan-head"><div><span className="eyebrow">Saved locally on this browser</span><h1>Projects</h1><p>Status is what drives reservation/consumption logic.</p></div><button className="primary" onClick={newProject}>+ New project</button></div>
        <div className="project-list">
          {projects.length===0?<div className="empty-state">No saved projects yet.</div>:projects.map(p=><article className="project-row" key={p.id}><div><b>{p.customer||"Unnamed customer"}</b><span>{p.address||"No address"}</span></div><span className={"status-pill "+p.status.toLowerCase().replaceAll(" ","-")}>{p.status}</span><span>{p.service}</span><button onClick={()=>openProject(p)}>Open</button><button className="danger-link" onClick={()=>deleteProject(p.id)}>Delete</button></article>)}
        </div>
      </section>}

      {tab==="inventory"&&<section className="page">
        <div className="page-head green-head"><div><span className="eyebrow">Inventory control</span><h1>Know what can actually be sold.</h1><p>Approved projects reserve inventory. Installed projects consume inventory. Draft and Quote Sent remain projected only.</p></div></div>
        <div className="inventory-summary"><Metric label="Approved projects" value={String(projects.filter(p=>p.status==="Approved").length)} tone="orange"/><Metric label="Installed projects" value={String(projects.filter(p=>p.status==="Installed").length)} tone="green"/><Metric label="Current project shortages" value={String(shortages.length)} tone={shortages.length?"red":"green"}/></div>
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>On hand</th><th>Damaged</th><th>Reserved</th><th>Consumed</th><th>Available</th><th>Supplier / note</th></tr></thead><tbody>
          {Object.entries(INV).map(([k,item])=>{const a=availability(k);return <tr key={k} className={item.legacy?"legacy-row":""}><td><b>{item.name}</b></td><td>{item.category}</td><td>{qty(item.on)} {item.unit}</td><td>{qty(a.damaged)}</td><td>{qty(a.reserved)}</td><td>{qty(a.consumed)}</td><td className={item.reorder&&a.available<item.reorder?"warn":""}>{qty(a.available)}</td><td><b>{item.supplier||"—"}</b>{item.note&&<small>{item.note}</small>}</td></tr>})}
        </tbody></table></div>
      </section>}

      {tab==="purchasing"&&<section className="page">
        <div className="page-head orange-head"><div><span className="eyebrow">Purchase planning</span><h1>Buy what unlocks booked revenue.</h1><p>Recommendations are based on available inventory after approved and installed projects.</p></div></div>
        <div className="purchase-grid">{Object.entries(INV).map(([k,item])=>{
          const a=availability(k);if(!item.reorder||a.available>=item.reorder)return null;
          let buy=Math.max(item.reorder*2-a.available,0);
          if(item.purchaseTier)buy=Math.ceil(buy/item.purchaseTier)*item.purchaseTier;
          if(k.startsWith("c9")&&item.unit==="bulbs")buy=Math.ceil(buy/500)*500;
          if(k.startsWith("clip"))buy=Math.ceil(buy/500)*500;
          return <article className="purchase-card" key={k}><span>{item.supplier}</span><h3>{item.name}</h3><strong>Buy {qty(buy)} {item.unit}</strong><p>Estimated product cost: {item.cost?money(buy*item.cost):"Cost not configured"}</p>{item.purchaseTier&&<small>Rounded to supplier tier of {item.purchaseTier}+.</small>}</article>
        })}</div>
      </section>}

      {tab==="handoff"&&<section className="page">
        <div className="page-head pink-head"><div><span className="eyebrow">Copy-ready Jobber note</span><h1>Jobber Notes</h1><p>No duplicate customer, property or status lines—just the install note.</p></div><button className="primary" onClick={()=>navigator.clipboard.writeText(handoff)}>Copy note</button></div>
        <textarea className="handoff" readOnly value={handoff} rows={20}/>
      </section>}


    </main>
  </div>;
}

function Nav({active,tone,onClick,children}:{active:boolean;tone:string;onClick:()=>void;children:any}){
  return <button className={"nav-item "+tone+" "+(active?"active":"")} onClick={onClick}><i></i>{children}</button>
}

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
  if(p.service==="Permanent")return [
    "PERMANENT LIGHTING",
    "Coverage: "+p.permanentCoverage,
    "Measured footage: "+p.permanentFt+" ft",
    "Expected material: "+p.permanentFt+" ft Minleon permanent lighting",
    "",
    "TECH: Record actual installed footage and explain any variance."
  ].join("\n");
  return [
    "C9 ROOFLINE / OUTLINES",
    "Roofline: "+p.roofFt+" ft",
    "Garage / architectural outline: "+p.garageFt+" ft",
    "Window outline: "+p.windowFt+" ft",
    "Color: "+p.c9Color,
    "Property: "+p.stories+" story · "+p.roofSurface+" · "+p.complexity+" · "+p.access,
    "Expected main C9 bulbs: "+e.roofBulbs,
    "",
    "RIDGELINE",
    p.ridgeFt+" ft · expected "+e.ridgeBulbs+" bulbs / ridge clips",
    "",
    "GROUND STAKE",
    p.groundFt+" ft · expected "+e.groundBulbs+" Traditional Warm bulbs / stakes",
    "",
    "MINI LIGHTS",
    "Bushes: "+p.bushFt+" measured ft → "+e.bushStrands+" strands",
    "Palms: "+p.palmStrands+" strands",
    "Trees: "+p.treeStrands+" strands",
    "Columns: "+p.columnStrands+" strands",
    "Total minis: "+e.miniStrands,
    "",
    "DECOR",
    p.wreathQty+" × "+p.wreathSize+'" wreath',
    p.garlandFt+" ft garland",
    p.snowflakes+" window snowflakes",
    p.treeDrops+" tree hanging drops",
    "",
    "TECH: Record actual material used. If actual exceeds or falls below plan, enter the variance and reason before closing the job."
  ].join("\n");
}
