"use client";
import { useEffect, useRef, useState } from "react";

type TaskMode = "auto" | "general" | "research" | "coding" | "game" | "creative" | "planning";
type Message = { role: "user" | "assistant"; content: string; image?: string; attachment?: string; sources?: {title:string;url:string}[]; model?:string };
type Usage = { provider:string; used:number; limit:number };
const modes: {id:TaskMode;label:string;hint:string}[] = [
  {id:"auto",label:"Brain Auto",hint:"Sentient chooses a workflow and model"},
  {id:"general",label:"General AI",hint:"Everyday questions and conversations"},
  {id:"research",label:"Research",hint:"Web research and source-aware answers"},
  {id:"coding",label:"Coding Studio",hint:"Programming, debugging, and software design"},
  {id:"game",label:"Game Studio",hint:"Game concepts, Roblox scripts, 3D asset specs"},
  {id:"creative",label:"Creative Studio",hint:"Visual concepts and image generation"},
  {id:"planning",label:"Project Planner",hint:"Break complex goals into milestones"}
];

export default function Home() {
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("");
  const [imageAttachment,setImageAttachment] = useState("");
  const [busy,setBusy] = useState(false);
  const [google,setGoogle] = useState(false);
  const [model,setModel] = useState("auto");
  const [mode,setMode] = useState<TaskMode>("auto");
  const [memories,setMemories] = useState<{id:string;content:string}[]>([]);
  const [memoryInput,setMemoryInput] = useState("");
  const [memoryOpen,setMemoryOpen] = useState(false);
  const [usage,setUsage] = useState<Usage[]>([]);
  const [usageOpen,setUsageOpen] = useState(false);
  const [listening,setListening] = useState(false);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [forgeType,setForgeType] = useState("model_3d");
  const [forgePrompt,setForgePrompt] = useState("");
  const [forgeMaxCredits,setForgeMaxCredits] = useState("");
  const [forgeBusy,setForgeBusy] = useState(false);
  const [forgeStatus,setForgeStatus] = useState("");
  const [forgeOutputs,setForgeOutputs] = useState<any[]>([]);
  const [forgeTaskId,setForgeTaskId] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function refreshUsage() {
    try { const r=await fetch("/api/usage"); const d=await r.json(); if(r.ok) setUsage(d.usage || []); } catch {}
  }
  useEffect(()=>{
    fetch("/api/google/status").then(r=>r.json()).then(d=>setGoogle(!!d.connected)).catch(()=>{});
    fetch("/api/memory").then(r=>r.json()).then(d=>setMemories(d.memories || [])).catch(()=>{});
    refreshUsage();
  },[]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,busy]);

  async function send(text=input) {
    const messageText = text.trim() || (imageAttachment ? "Please analyze this image." : "");
    if (!messageText || busy) return;
    if (mode === "game") setForgePrompt(messageText);
    if (mode === "auto") {
      const t = messageText.toLowerCase();
      if (/roblox|game|level|map|3d model|character|animation|luau|unity|unreal/.test(t)) { setMode("game"); setForgePrompt(messageText); }
      else if (/code|debug|program|javascript|typescript|python|api|website|app|script/.test(t)) setMode("coding");
      else if (/image|picture|logo|illustration|design|thumbnail|artwork/.test(t)) setMode("creative");
      else if (/research|latest|today|current|news|compare sources/.test(t)) setMode("research");
      else if (/plan|roadmap|organize|project|steps|strategy/.test(t)) setMode("planning");
    }
    const next: Message[] = [...messages,{role:"user",content:messageText,...(imageAttachment?{attachment:imageAttachment}:{})}];
    setMessages(next); setInput(""); setImageAttachment(""); setBusy(true);
    try {
      const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next,model,mode})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages([...next,{role:"assistant",content:data.text || "I couldn't generate a response.",sources:data.sources || [],model:data.model}]);
      await refreshUsage();
    } catch(e) {
      setMessages([...next,{role:"assistant",content:`Error: ${e instanceof Error ? e.message : "Something went wrong"}`}]);
      await refreshUsage();
    } finally { setBusy(false); }
  }

  async function generateForgeAsset() {
    const prompt = forgePrompt.trim();
    if (!prompt || forgeBusy) return;
    setForgeBusy(true); setForgeStatus("Submitting asset request…"); setForgeOutputs([]); setForgeTaskId("");
    try {
      const created = await fetch("/api/forge/generations", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({type:forgeType,prompt,parameters:{platform:"roblox"},...(forgeMaxCredits.trim()?{max_credits:Number(forgeMaxCredits)}:{})})
      });
      const initial = await created.json();
      if (!created.ok) throw new Error(initial.error || "ForgeGUI could not start the generation.");
      if (!initial.id) throw new Error("ForgeGUI accepted the request but did not return a task ID.");
      setForgeTaskId(initial.id);
      setForgeStatus(`Generation ${initial.status || "queued"} · waiting for your asset…`);
      let latest = initial;
      for (let attempt=0; attempt<75; attempt++) {
        if (["succeeded","partially_succeeded","failed"].includes(latest.status)) break;
        await new Promise(resolve=>window.setTimeout(resolve,4000));
        const poll = await fetch(`/api/forge/generations/${encodeURIComponent(initial.id)}`,{cache:"no-store"});
        latest = await poll.json();
        if (!poll.ok) throw new Error(latest.error || "Could not check generation status.");
        setForgeStatus(`Generation ${latest.status || "processing"} · task ${initial.id}`);
      }
      setForgeOutputs(latest.outputs || []);
      if (latest.status === "succeeded" || latest.status === "partially_succeeded") {
        setForgeStatus("Asset generation finished. Review and download your files below.");
        setMessages(m=>[...m,{role:"assistant",content:`ForgeGUI finished generating your ${forgeType.replace("_"," ")} asset. Review the files in the Game Studio panel.`}]);
      } else if (latest.status === "failed") {
        setForgeStatus(`Generation failed: ${latest.error?.message || latest.error || "ForgeGUI reported a failure."}`);
      } else {
        setForgeStatus("Generation is still processing. Your task ID is saved below; you can check it again later.");
      }
    } catch(e) {
      setForgeStatus(e instanceof Error ? e.message : "ForgeGUI generation failed.");
    } finally { setForgeBusy(false); }
  }

  async function checkForgeTask() {
    if (!forgeTaskId || forgeBusy) return;
    setForgeBusy(true);
    try {
      const r = await fetch(`/api/forge/generations/${encodeURIComponent(forgeTaskId)}`, {cache:"no-store"});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not check ForgeGUI task.");
      setForgeOutputs(d.outputs || []);
      setForgeStatus(`Generation ${d.status || "unknown"} · task ${forgeTaskId}`);
    } catch(e) {
      setForgeStatus(e instanceof Error ? e.message : "Could not check ForgeGUI task.");
    } finally { setForgeBusy(false); }
  }

  async function makeImage() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setMessages(m=>[...m,{role:"user",content:`Create an image: ${prompt}`}]); setInput(""); setBusy(true);
    try {
      const r=await fetch("/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || "Image generation failed");
      setMessages(m=>[...m,{role:"assistant",content:"Here's your generated image.",image:`data:${d.mimeType || "image/png"};base64,${d.image}`}]);
    } catch(e) { setMessages(m=>[...m,{role:"assistant",content:e instanceof Error?e.message:"Image generation failed"}]); }
    finally { setBusy(false); }
  }

  async function addMemory() {
    const content = memoryInput.trim();
    if (!content) return;
    const r = await fetch("/api/memory", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({content})});
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Could not save memory"); return; }
    setMemories(m=>[d.memory,...m]); setMemoryInput("");
  }

  async function deleteMemory(id:string) {
    const r = await fetch(`/api/memory?id=${encodeURIComponent(id)}`, {method:"DELETE"});
    if (r.ok) setMemories(m=>m.filter(x=>x.id!==id));
  }

  function attachImage(file?:File) {
    if (!file) return;
    if (!["image/png","image/jpeg","image/jpg","image/webp"].includes(file.type)) { alert("Choose a PNG, JPEG, or WebP image."); return; }
    if (file.size > 3 * 1024 * 1024) { alert("Please choose an image smaller than 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setImageAttachment(String(reader.result || ""));
    reader.onerror = () => alert("Could not read that image.");
    reader.readAsDataURL(file);
  }

  function voice() {
    const w=window as any;
    const SpeechRecognition=w.SpeechRecognition || w.webkitSpeechRecognition;
    if(!SpeechRecognition){ alert("Speech recognition isn't supported in this browser. Try Chrome."); return; }
    const recognition=new SpeechRecognition(); recognition.lang="en-US"; recognition.interimResults=false;
    recognition.onresult=(event:any)=>{ const spoken=event.results[0][0].transcript; setInput(spoken); setListening(false); };
    recognition.onerror=()=>setListening(false); recognition.onend=()=>setListening(false);
    setListening(true); recognition.start();
  }

  function speak(text:string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  const launchMode = (nextMode:TaskMode, starter:string) => { setMode(nextMode); setInput(starter); setMobileMenu(false); };
  const modelNames:Record<string,string> = {openai:"OpenAI",claude:"Claude",gemini:"Gemini",deepseek:"DeepSeek"};

  return <div className="shell">
    <aside className={`side ${mobileMenu?"mobile-open":""}`}>
      <div className="brand">SENTIENT <span>AI</span></div>
      <p className="muted">One AI. Many capabilities. One central Brain.</p>
      <button onClick={()=>{setMessages([]);setMobileMenu(false)}}>＋ New conversation</button>
      <div style={{marginTop:24}} className="muted">WORKSPACES</div>
      <button onClick={()=>launchMode("game","Help me create a game. Let's plan the gameplay, world, assets, and scripts.")}>🎮 Game Studio</button>
      <button onClick={()=>launchMode("coding","Help me build software. Let's design and implement it.")}>⌘ Coding Studio</button>
      <button onClick={()=>launchMode("creative","Help me create a visual concept or image.")}>✧ Creative Studio</button>
      <button onClick={()=>launchMode("research","Research this topic and provide reliable sources: ")}>⌕ Research</button>
      <button onClick={()=>launchMode("planning","Help me plan this project into milestones and tasks: ")}>▤ Project Planner</button>
      <div style={{marginTop:24}} className="muted">INTEGRATIONS</div>
      <button onClick={()=>location.href="/api/google/start"}>◎ {google?"Google connected":"Connect Google"}</button>
      <button onClick={()=>setMemoryOpen(v=>!v)}>🧠 Memory ({memories.length})</button>
      <button onClick={()=>setUsageOpen(v=>!v)}>◷ Model usage & limits</button>
      <p className="muted" style={{marginTop:28,fontSize:11}}>Private preview · Add provider credentials in Netlify</p>
    </aside>

    <main className="main">
      <header className="top">
        <button className="menu-button" onClick={()=>setMobileMenu(v=>!v)} aria-label="Open menu">☰</button>
        <div className="brand">SENTIENT <span>AI</span></div>
        <span className="pill">{google?"Google connected":"Google not connected"}</span>
      </header>

      {messages.length===0 ? <section className="welcome">
        <div className="orb">✧</div>
        <div className="brain-label">THE SENTIENT BRAIN · {mode==="auto"?"AUTOMATIC MODE":modes.find(x=>x.id===mode)?.label.toUpperCase()}</div>
        <h1>What can we create today?</h1>
        <p>Ask anything. Sentient will choose a suitable model and workflow.</p>
        <div className="workspace-grid">
          <button onClick={()=>launchMode("game","Help me create a Roblox game. Plan the gameplay, map, 3D assets, and Luau scripts.")}><b>🎮 Game Studio</b><small>Games, worlds, models, scripts</small></button>
          <button onClick={()=>launchMode("coding","Help me build an application. Start by understanding the requirements.")}><b>⌘ Coding Studio</b><small>Websites, apps, debugging</small></button>
          <button onClick={()=>launchMode("creative","Help me create an image. Here is my idea: ") }><b>✧ Creative Studio</b><small>Images and visual concepts</small></button>
          <button onClick={()=>launchMode("research","Research this topic with reliable sources: ")}><b>⌕ Research</b><small>Explore and compare information</small></button>
          <button onClick={()=>launchMode("planning","Help me plan this project: ")}><b>▤ Project Planner</b><small>Milestones and next actions</small></button>
          <button onClick={()=>setMemoryOpen(true)}><b>🧠 Memory</b><small>{memories.length} saved notes</small></button>
        </div>
      </section> : <section className="messages">
        {messages.map((m,i)=><div key={i} className={`msg ${m.role==="user"?"user":"assistant"}`}>
          <strong>{m.role==="user"?"You":"Sentient AI"}</strong><div style={{marginTop:7}}>{m.content}</div>
          {m.model && <div className="response-meta">Brain selected: {m.model}</div>}
          {m.attachment && <div className="result"><img src={m.attachment} alt="User attachment"/></div>}
          {m.image && <div className="result"><img src={m.image} alt="Generated by Sentient AI"/></div>}
          {!!m.sources?.length && <div className="links" style={{marginTop:12,fontSize:13}}>Sources: {m.sources.map((s,j)=><a key={j} href={s.url} target="_blank" rel="noreferrer">{s.title || `Source ${j+1}`}</a>)}</div>}
          {m.role==="assistant" && <button style={{marginTop:10,background:"transparent",border:"1px solid #293958",color:"#aebed8",borderRadius:8,padding:"6px 9px"}} onClick={()=>speak(m.content)}>▶ Listen</button>}
        </div>)}
        {busy&&<div className="msg assistant muted">Sentient Brain is thinking and selecting a workflow…</div>}<div ref={endRef}/>
      </section>}

      {memoryOpen && <section className="panel">
        <div className="panel-head"><strong>Sentient memory</strong><button onClick={()=>setMemoryOpen(false)}>Close</button></div>
        <p className="muted" style={{fontSize:13}}>Add details you want Sentient to remember across conversations. You can remove them at any time.</p>
        <div className="inline-form"><input value={memoryInput} onChange={e=>setMemoryInput(e.target.value)} placeholder="Example: I prefer short, step-by-step explanations"/><button onClick={addMemory}>Remember</button></div>
        <div className="memory-list">{memories.map(m=><div key={m.id}><span>{m.content}</span><button onClick={()=>deleteMemory(m.id)}>Delete</button></div>)}</div>
      </section>}

      {usageOpen && <section className="panel">
        <div className="panel-head"><strong>Model usage · Hourly limits</strong><button onClick={()=>setUsageOpen(false)}>Close</button></div>
        <p className="muted" style={{fontSize:13}}>Counters reset at the start of each UTC hour. These are Sentient-side request limits, not provider billing quotas.</p>
        <div className="usage-grid">{usage.map(u=><div className="usage-card" key={u.provider}><div><b>{modelNames[u.provider]||u.provider}</b><strong>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</strong></div><div className="usage-track"><span style={{width:`${Math.min(100,u.used/u.limit*100)}%`}}/></div></div>)}</div>
        <button onClick={refreshUsage}>Refresh usage</button>
      </section>}

      {mode==="game" && <section className="panel forge-panel">
        <div className="panel-head"><strong>ForgeGUI · Roblox asset generator</strong><span className="forge-tag">Server-side API</span></div>
        <p className="muted" style={{fontSize:13}}>Generate downloadable game assets from your prompt. ForgeGUI uses credits from your ForgeGUI workspace.</p>
        <label className="forge-prompt-label">Describe the asset<textarea value={forgePrompt} onChange={e=>setForgePrompt(e.target.value)} placeholder="Example: A detailed wooden pirate ship with black sails, cannons, ropes, and weathered oak planks."/></label>
        <div className="forge-controls">
          <label>Asset type<select value={forgeType} onChange={e=>setForgeType(e.target.value)}>
            <option value="model_3d">3D model · GLB</option>
            <option value="thumbnail">Game thumbnail · PNG</option>
            <option value="gui">GUI artwork · PNG</option>
            <option value="avatar">Avatar concept · PNG</option>
            <option value="icon">Game icon · PNG</option>
            <option value="clothing">Classic clothing · PNG</option>
            <option value="animation">R15 animation · RBXMX</option>
            <option value="music">Music · MP3</option>
            <option value="sfx">Sound effect · audio</option>
          </select></label>
          <label>Maximum credits (optional)<input type="number" min="0" step="1" value={forgeMaxCredits} onChange={e=>setForgeMaxCredits(e.target.value)} placeholder="No cap"/></label>
          <button onClick={generateForgeAsset} disabled={forgeBusy || !forgePrompt.trim()}>{forgeBusy?"Generating…":"Generate with ForgeGUI"}</button>
        </div>
        {forgeStatus && <p className="forge-status">{forgeStatus}{forgeTaskId?` · ID: ${forgeTaskId}`:""}</p>}
        {forgeTaskId && !forgeBusy && <button className="forge-check" onClick={checkForgeTask}>Check task status</button>}
        {!!forgeOutputs.length && <div className="forge-output-grid">{forgeOutputs.filter((o:any)=>o.file?.id).map((o:any)=><div className="forge-output" key={o.id || o.file.id}>
          {String(o.file.content_type||"").startsWith("image/") && <img src={`/api/forge/files/${encodeURIComponent(o.file.id)}`} alt={o.file.filename || "Generated ForgeGUI asset"}/>}
          <strong>{o.file.filename || o.role || "Generated asset"}</strong>
          <a href={`/api/forge/files/${encodeURIComponent(o.file.id)}`} download={o.file.filename || true}>Download asset ↗</a>
        </div>)}</div>}
      </section>}

      <div className="composer">
        <div className="selectors">
          <label>Brain mode<select value={mode} onChange={e=>setMode(e.target.value as TaskMode)}>{modes.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label>AI model<select value={model} onChange={e=>setModel(e.target.value)}>
            <option value="auto">Automatic · Sentient Brain</option>
            <option value="openai/gpt-4.1">OpenAI GPT-4.1</option>
            <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
          </select></label>
        </div>
        {imageAttachment && <div className="attachment-preview"><img src={imageAttachment} alt="Image ready to send"/><span>Image attached</span><button onClick={()=>setImageAttachment("")}>Remove</button></div>}
        <div className="inputbox">
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={imageAttachment?"Ask Sentient about the attached image…":"Message Sentient AI…"}/>
          <button className="send" onClick={()=>send()} disabled={busy}>Send</button>
        </div>
        <div className="tools">
          <label className="upload-button">＋ Add image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>attachImage(e.target.files?.[0])}/></label>
          {imageAttachment && <button onClick={()=>setImageAttachment("")}>Remove attached image</button>}
          <button onClick={voice}>{listening?"Listening…":"🎙 Voice input"}</button>
          <button onClick={makeImage}>▧ Generate image</button>
          <button onClick={()=>setMemoryOpen(v=>!v)}>🧠 Memory</button>
          <button onClick={()=>setUsageOpen(v=>!v)}>◷ Usage</button>
          <button onClick={()=>location.href="/api/google/start"}>＋ Connect Google</button>
        </div>
        <div className="hint">Sentient's Brain routes tasks to connected models. Tool access depends on configured API keys and integrations. Review important results.</div>
      </div>
    </main>
  </div>;
}
