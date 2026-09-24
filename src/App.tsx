import { useMemo, useState } from "react";

type Role = "va" | "owner";
type Tab = "quote" | "inventory" | "purchasing" | "handoff" | "finance";

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);

const inventory={
  c9sun:{name:"C9 Sun Warm White",on:3500,reserved:600,reorder:1500,cost:.64},
  c9trad:{name:"C9 Traditional Warm",on:3125,reserved:0,reorder:0,cost:.65},
  cord:{name:'15" C9 socket cord (ft)',on:10000,reserved:500,reorder:1500,cost:.26},
  clips:{name:"Minleon C9 clips",on:6100,reserved:400,reorder:1500,cost:.24},
  stakes:{name:"C9 ground stakes",on:2250,reserved:200,reorder:500,cost:.66},
  minis:{name:"S4 NxG Sun Warm minis",on:96,reserved:24,reorder:48,cost:11.88},
  garland:{name:"Commercial garland (ft)",on:18,reserved:0,reorder:18,cost:10.7}
};

function Field({label,children}:{label:string;children:React.ReactNode}){
  return <label className="field"><span>{label}</span>{children}</label>;
}
function Metric({label,value}:{label:string;value:string}){
  return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div></div>;
}

export default function App(){
  const [role,setRole]=useState<Role>("va");
  const [tab,setTab]=useState<Tab>("quote");
  const [customer,setCustomer]=useState("");
  const [address,setAddress]=useState("");
  const [projectStatus,setProjectStatus]=useState("Draft");
  const [salesTaxRate,setSalesTaxRate]=useState(7);
  const [stories,setStories]=useState(2);
  const [roof,setRoof]=useState("Shingle");
  const [complexity,setComplexity]=useState("A few peaks");
  const [roofFt,setRoofFt]=useState(250);
  const [color,setColor]=useState("Sun Warm White");
  const [groundFt,setGroundFt]=useState(0);
  const [bushFt,setBushFt]=useState(286);
  const [palmStrands,setPalmStrands]=useState(4);
  const [wreath,setWreath]=useState(0);
  const [garlandFt,setGarlandFt]=useState(0);

  const calc=useMemo(()=>{
    let ppf=stories===1?8.5:stories===2?9.5:10.75;
    if(complexity==="A few peaks") ppf+=.5;
    if(complexity==="Complex") ppf+=1.25;
    if(roof==="Tile") ppf+=.5;
    if(roof==="Metal") ppf+=.25;
    ppf=Math.min(12,Math.max(8,ppf));
    const roofBulbs=Math.ceil(roofFt/1.25);
    const groundBulbs=Math.ceil(groundFt/1.25);
    const bushStrands=Math.ceil(bushFt/25);
    const minis=bushStrands+palmStrands;
    const selling=roofFt*ppf+groundFt*4+minis*40+wreath+garlandFt*22;
    const roofBulbCost=color==="Traditional Warm White"?inventory.c9trad.cost:inventory.c9sun.cost;
    const material=roofBulbs*roofBulbCost+groundBulbs*inventory.c9trad.cost+(roofFt+groundFt)*inventory.cord.cost+roofBulbs*inventory.clips.cost+groundBulbs*inventory.stakes.cost+minis*inventory.minis.cost+garlandFt*inventory.garland.cost+(wreath?wreath*.45:0);
    const gp=selling-material;
    const gm=selling?gp/selling*100:0;
    return {ppf,roofBulbs,groundBulbs,bushStrands,minis,selling,material,gp,gm};
  },[stories,roof,complexity,roofFt,color,groundFt,bushFt,palmStrands,wreath,garlandFt]);

  const usage:any={
    c9sun:color==="Sun Warm White"?calc.roofBulbs:0,
    c9trad:(color==="Traditional Warm White"?calc.roofBulbs:0)+calc.groundBulbs,
    cord:roofFt+groundFt,
    clips:calc.roofBulbs,
    stakes:calc.groundBulbs,
    minis:calc.minis,
    garland:garlandFt
  };

  const handoff=`CUSTOMER: ${customer || "—"}\nPROPERTY: ${address || "—"}\nSTATUS: ${projectStatus}\n\nROOFLINE: ${roofFt} ft • ${color} • ${roof} • ${stories} story • ${complexity}\nEXPECTED: ${calc.roofBulbs} C9 bulbs / ${calc.roofBulbs} roof clips / ${roofFt} ft 15-inch socket cord\n\nGROUND STAKE: ${groundFt} ft • Traditional Warm phase-out inventory\nEXPECTED: ${calc.groundBulbs} C9 bulbs / ${calc.groundBulbs} stakes\n\nBUSHES: ${bushFt} measured ft → ${calc.bushStrands} mini strands\nPALMS: ${palmStrands} mini strands\nTOTAL MINIS: ${calc.minis}\nGARLAND: ${garlandFt} ft\n\nTECH: Record actual material used and explain any over/under variance.`;

  function switchRole(next:Role){
    setRole(next);
    if(next==="va" && tab==="finance") setTab("quote");
  }

  const nav=(id:Tab,label:string,ownerOnly=false)=>{
    if(ownerOnly && role!=="owner") return null;
    return <button className={"nav-btn "+(tab===id?"active":"")} onClick={()=>setTab(id)}>{label}</button>;
  };

  return <div className="shell">
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-eyebrow">Light The Peak</div>
        <div className="brand-title">Lighting Ops</div>
        <div className="role-grid">
          <button className={"btn "+(role==="va"?"active":"")} onClick={()=>switchRole("va")}>VA</button>
          <button className={"btn "+(role==="owner"?"active":"")} onClick={()=>switchRole("owner")}>Owner</button>
        </div>
        <nav className="nav">
          {nav("quote","New Quote")}
          {nav("inventory","Inventory")}
          {nav("purchasing","Purchasing")}
          {nav("handoff","Jobber Handoff")}
          {nav("finance","Company Finance",true)}
        </nav>
      </aside>

      <main className="main">
        {tab==="quote" && <section className="card">
          <div className="header">
            <div><div className="eyebrow">Virtual quote builder</div><h2>Measurements → price → materials</h2></div>
            <div className="badge">{role==="owner"?"Owner access":"VA access"}</div>
          </div>

          <div className="form-grid">
            <Field label="Customer name"><input className="input" value={customer} onChange={e=>setCustomer(e.target.value)} /></Field>
            <Field label="Property address"><input className="input" value={address} onChange={e=>setAddress(e.target.value)} /></Field>
            <Field label="Project status"><select className="input" value={projectStatus} onChange={e=>setProjectStatus(e.target.value)}><option>Draft</option><option>Quote Sent</option><option>Approved</option><option>Installed</option><option>Cancelled</option></select></Field>
            <Field label="Stories"><select className="input" value={stories} onChange={e=>setStories(+e.target.value)}><option value={1}>1 story</option><option value={2}>2 story</option><option value={3}>3 story</option></select></Field>
            <Field label="Roof surface"><select className="input" value={roof} onChange={e=>setRoof(e.target.value)}><option>Shingle</option><option>Tile</option><option>Metal</option></select></Field>
            <Field label="Complexity"><select className="input" value={complexity} onChange={e=>setComplexity(e.target.value)}><option>Mostly straight</option><option>A few peaks</option><option>Complex</option></select></Field>
            <Field label="Roofline ft"><input className="input" type="number" min="0" value={roofFt} onChange={e=>setRoofFt(+e.target.value)} /></Field>
            <Field label="C9 color"><select className="input" value={color} onChange={e=>setColor(e.target.value)}><option>Sun Warm White</option><option>Traditional Warm White</option><option>Red</option><option>Green</option><option>Multicolor</option></select></Field>
            <Field label="Ground stake ft"><input className="input" type="number" min="0" value={groundFt} onChange={e=>setGroundFt(+e.target.value)} /></Field>
            <Field label="Bush measurement ft"><input className="input" type="number" min="0" value={bushFt} onChange={e=>setBushFt(+e.target.value)} /></Field>
            <Field label="Palm mini strands"><input className="input" type="number" min="0" value={palmStrands} onChange={e=>setPalmStrands(+e.target.value)} /></Field>
            <Field label="Wreath"><select className="input" value={wreath} onChange={e=>setWreath(+e.target.value)}><option value={0}>None</option><option value={225}>36 in</option><option value={400}>48 in</option><option value={650}>60 in</option></select></Field>
            <Field label="Garland ft"><input className="input" type="number" min="0" value={garlandFt} onChange={e=>setGarlandFt(+e.target.value)} /></Field>
          </div>

          <div className="metrics">
            <Metric label="Suggested price" value={money(calc.selling)} />
            <Metric label="Material cost" value={money(calc.material)} />
            <Metric label="Gross profit" value={money(calc.gp)} />
            <Metric label="Gross margin" value={calc.gm.toFixed(1)+"%"} />
          </div>

          <div className="note">
            15-inch C9: <b>{roofFt} ft → {calc.roofBulbs} bulbs / {calc.roofBulbs} clips</b>. Bushes: <b>{bushFt} ft ÷ 25 → {calc.bushStrands} strands</b>, always rounded up.
          </div>
        </section>}

        {tab==="inventory" && <section className="card">
          <div className="eyebrow">Inventory</div><h2>On hand / reserved / available</h2>
          <div className="table-wrap"><table><thead><tr><th>SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>This quote</th><th>After quote</th></tr></thead>
          <tbody>{Object.entries(inventory).map(([key,item]:any)=>{const available=item.on-item.reserved;const committed=projectStatus==="Approved"||projectStatus==="Installed";const after=available-(committed?(usage[key]||0):0);return <tr key={key}><td><b>{item.name}</b></td><td>{item.on.toLocaleString()}</td><td>{item.reserved.toLocaleString()}</td><td>{available.toLocaleString()}</td><td>{projectStatus==="Approved"||projectStatus==="Installed"?"-":"~"}{(usage[key]||0).toLocaleString()}</td><td className={item.reorder && after<item.reorder?"warn":""}>{after.toLocaleString()}</td></tr>})}</tbody></table></div>
        </section>}

        {tab==="purchasing" && <section className="card">
          <div className="eyebrow">Purchasing</div><h2>Recommended replenishment</h2>
          <div className="stack">
            {Object.entries(inventory).map(([key,item]:any)=>{const committed=projectStatus==="Approved"||projectStatus==="Installed";const after=item.on-item.reserved-(committed?(usage[key]||0):0);if(!item.reorder||after>=item.reorder)return null;let qty=Math.max(item.reorder*2-after,0);if(key==="minis")qty=Math.ceil(qty/24)*24;if(key.startsWith("c9"))qty=Math.ceil(qty/500)*500;if(key==="clips")qty=Math.ceil(qty/500)*500;return <div className="purchase" key={key}><b>{item.name}</b><div className="muted">Recommended order: {qty.toLocaleString()} • estimated {money(qty*item.cost)}</div></div>})}
          </div>
        </section>}

        {tab==="handoff" && <section className="card">
          <div className="eyebrow">Jobber handoff</div><h2>Technician install plan</h2>
          <textarea className="input" readOnly rows={14} value={handoff} />
        </section>}

        {tab==="finance" && role==="owner" && <section className="card">
          <div className="eyebrow">Company finance</div><h2>Cash allocation & reserves</h2>
          <div className="metrics">
            <Metric label={`Sales Tax ${salesTaxRate.toFixed(1)}%`} value={money(calc.selling*(salesTaxRate/100))} />
            <Metric label="Owner Compensation 15%" value={money(calc.selling*.15)} />
            <Metric label="Profit Reserve 5%" value={money(calc.selling*.05)} />
            <Metric label="Income Tax Reserve 10%" value={money(calc.selling*.10)} />
            <Metric label="Operating Expenses 70%" value={money(calc.selling*.70)} />
          </div>
          <div className="note"><b>Sales tax is segregated before Profit First allocations.</b> Jobber remains the source of truth for the actual job tax rate. <label style={{marginLeft:12}}>Tax rate <input className="input" style={{width:90,display:"inline-block",padding:6}} type="number" step="0.1" min="0" value={salesTaxRate} onChange={e=>setSalesTaxRate(+e.target.value)} /></label><br/><br/>Weekly Owner Compensation target: <b>$1,500</b>. This quote contributes <b>{money(calc.selling*.15)}</b>.</div>
        </section>}
      </main>
    </div>
  </div>;
}
