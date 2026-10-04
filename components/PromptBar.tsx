"use client";

import { isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  Paperclip,
  CalendarDays,
  X,
  ChartLine,
  FileText,
  Globe2,
  CircleHelp,
  Mail,
  Mic,
  Plus,
  Sparkles,
  Check,
} from "lucide-react";
import "./PromptBar.css";

const ARROW_UP=[12,4.5,18.5,11,14.25,11,14.25,19.5,9.75,19.5,9.75,11,5.5,11];
const SQUARE=[12,6,18,6,18,12,18,18,6,18,6,12,6,6];
const EASE_IN_OUT=[0.77,0,0.175,1] as const;
const LINE=22;
const EDGE=11;

export type PromptSource={key:string;name:string;description?:string;icon?:React.ComponentType<{size?:number;strokeWidth?:number}>;attach?:boolean};
export type PromptCommand={key:string;name:string;description?:string};
export type PromptModel={key:string;name:string;tag?:string};
export type PromptAttachment=File|string;

const DEFAULT_SOURCES:PromptSource[]=[
 {key:"files",name:"Photos & files",description:"Upload from this device",icon:Paperclip,attach:true},
 {key:"web",name:"Web search",description:"Live results",icon:Globe2},
 {key:"sales",name:"Sales data",description:"Revenue and churn",icon:ChartLine},
 {key:"docs",name:"Documents",description:"Specs, notes, briefs",icon:FileText},
 {key:"mail",name:"Mail",description:"Read and draft mail",icon:Mail},
 {key:"calendar",name:"Calendar",description:"Events and availability",icon:CalendarDays},
];
const DEFAULT_COMMANDS:PromptCommand[]=[
 {key:"summarize",name:"/summarize",description:"Digest the thread so far"},
 {key:"compare",name:"/compare",description:"Two options side by side"},
 {key:"draft",name:"/draft",description:"Write a first version"},
 {key:"explain",name:"/explain",description:"A plain-language walkthrough"},
 {key:"tasks",name:"/tasks",description:"Turn this into a to-do list"},
];
const DEFAULT_MODELS:PromptModel[]=[
 {key:"bharatai",name:"BharatAI",tag:"Flagship"},
 {key:"fast",name:"BharatAI Fast",tag:"Fast"},
];
const DEFAULT_EFFORTS=["Low","Medium","High","Extra","Max"];

const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const pathAt=(a:number[],b:number[],t:number)=>{
 let d="";
 for(let i=0;i<a.length;i+=2)d+=`${i?"L":"M"}${mix(a[i],b[i],t).toFixed(2)} ${mix(a[i+1],b[i+1],t).toFixed(2)}`;
 return `${d}Z`;
};
const parseToken=(draft:string)=>{
 const m=/(^|\s)([@/])([\w-]*)$/.exec(draft);
 return m?{kind:m[2]==="@"?"at":"slash",query:m[3].toLowerCase(),start:m.index+m[1].length}:null;
};
const renderIcon=(icon:PromptSource["icon"],size:number)=>isValidElement(icon)?icon:icon?<icon size={size} strokeWidth={1.8}/>:null;

function SendGlyph({busy,morphDuration,squash,tilt}:{busy:boolean;morphDuration:number;squash:number;tilt:number}){
 const reduce=useReducedMotion(),svgRef=useRef<SVGSVGElement>(null),pathRef=useRef<SVGPathElement>(null);
 const dir=useRef(busy?1:-1),t=useMotionValue(busy?1:0);
 useEffect(()=>{const target=busy?1:0;dir.current=busy?1:-1;if(t.get()===target)return;const c=animate(t,target,reduce?{duration:0}:{duration:morphDuration/1000,ease:EASE_IN_OUT});return()=>c.stop()},[busy,morphDuration,reduce,t]);
 useMotionValueEvent(t,"change",v=>{pathRef.current?.setAttribute("d",pathAt(ARROW_UP,SQUARE,v));const goo=reduce?0:Math.sin(v*Math.PI);const sx=1-squash*goo;if(svgRef.current)svgRef.current.style.transform=goo?`rotate(${dir.current*tilt*goo}deg) scale(${sx},${1/sx})`:""});
 return <svg ref={svgRef} className="prompt-bar__glyph" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path ref={pathRef} d={pathAt(ARROW_UP,SQUARE,t.get())}/></svg>;
}

export interface PromptBarProps{
 placeholder?:string;sources?:PromptSource[];commands?:PromptCommand[];models?:PromptModel[];defaultModel?:string;efforts?:string[];defaultEffort?:string;
 onEffortChange?:(effort:string)=>void;busy?:boolean;onSend?:(text:string,meta:{attachments:PromptAttachment[];model?:PromptModel;effort:string})=>void|Promise<void>;onStop?:()=>void;
 onAttach?:()=>Promise<PromptAttachment[]|PromptAttachment|void>|PromptAttachment[]|PromptAttachment|void;
 onDictate?:()=>Promise<string|void>|string|void;background?:string;color?:string;menuBackground?:string;sparkColor?:string;sparkBoost?:number;width?:number;radius?:number;maxRows?:number;morphDuration?:number;squash?:number;tilt?:number;pressScale?:number;className?:string;
}
export default function PromptBar({
 placeholder="Ask anything",sources=DEFAULT_SOURCES,commands=DEFAULT_COMMANDS,models=DEFAULT_MODELS,defaultModel="",efforts=DEFAULT_EFFORTS,defaultEffort="",onEffortChange,busy=false,onSend,onStop,onAttach,onDictate,
 background="#27272a",color="#f5f5f5",menuBackground="#323236",sparkColor="#b39dff",sparkBoost=1,width=400,radius=16,maxRows=5,morphDuration=240,squash=.12,tilt=8,pressScale=.96,className=""
}:PromptBarProps){
 const reduce=useReducedMotion(),rootRef=useRef<HTMLDivElement>(null),inputRef=useRef<HTMLTextAreaElement>(null),glowRef=useRef<HTMLSpanElement>(null),sparkRef=useRef<HTMLCanvasElement>(null);
 const typing=useRef({energy:0,strokes:0}),rowRefs=useRef<HTMLButtonElement[]>([]),lastOpen=useRef<string|null>(null),dictation=useRef(0),latest=useRef({onSend,onStop,onAttach,onDictate,onEffortChange});
 latest.current={onSend,onStop,onAttach,onDictate,onEffortChange};
 const [draft,setDraft]=useState(""),[attachments,setAttachments]=useState<PromptAttachment[]>([]),[modelKey,setModelKey]=useState(defaultModel||models[0]?.key||""),[plusOpen,setPlusOpen]=useState(false),[modelOpen,setModelOpen]=useState(false),[effortOpen,setEffortOpen]=useState(false);
 const [effortIndex,setEffortIndex]=useState(()=>{const i=efforts.indexOf(defaultEffort);return i>=0?i:Math.max(0,Math.floor((efforts.length-1)/2))}),[dismissed,setDismissed]=useState(false),[active,setActive]=useState(0),[listening,setListening]=useState(false),[pressed,setPressed]=useState(false);
 const model=models.find(m=>m.key===modelKey)||models[0],token=dismissed?null:parseToken(draft);
 const open=plusOpen?"at":(token?.kind||(modelOpen?"model":effortOpen?"effort":null)),query=plusOpen?"":(token?.query||"");
 const list=useMemo(()=>open==="at"?sources.filter(s=>s.name.toLowerCase().includes(query)):open==="slash"?commands.filter(c=>c.name.slice(1).toLowerCase().startsWith(query)):open==="model"?models:[],[open,query,sources,commands,models]);
 const cursor=Math.min(active,Math.max(0,list.length-1)),canSend=draft.trim().length>0||attachments.length>0,armed=busy||canSend,level=efforts[effortIndex]||"",maxed=efforts.length>1&&effortIndex===efforts.length-1;
 const focusInput=()=>inputRef.current?.focus({preventScroll:true});
 const closeMenus=useCallback(()=>{setPlusOpen(false);setModelOpen(false);setEffortOpen(false)},[]);
 useLayoutEffect(()=>{const glow=glowRef.current;if(!glow||!open)return;const row=rowRefs.current[cursor];if(!row){glow.style.opacity="0";return}const fresh=lastOpen.current!==open;lastOpen.current=open;if(fresh)glow.style.transition="none";glow.style.top=`${row.offsetTop}px`;glow.style.height=`${row.offsetHeight}px`;glow.style.opacity="1";if(fresh){void glow.offsetHeight;glow.style.transition=""}},[open,cursor,list]);
 useEffect(()=>{if(!open)lastOpen.current=null},[open]);
 useEffect(()=>{if(!plusOpen&&!modelOpen&&!effortOpen)return;const f=(e:PointerEvent)=>{if(!rootRef.current?.contains(e.target as Node))closeMenus()};document.addEventListener("pointerdown",f);return()=>document.removeEventListener("pointerdown",f)},[plusOpen,modelOpen,effortOpen,closeMenus]);
 useLayoutEffect(()=>{const el=inputRef.current;if(!el)return;el.style.height="0px";const max=LINE*maxRows;el.style.height=`${Math.min(el.scrollHeight,max)}px`;el.style.overflowY=el.scrollHeight>max?"auto":"hidden"},[draft,maxRows]);
 useEffect(()=>()=>{dictation.current+=1},[]);
 useEffect(()=>{const canvas=sparkRef.current;if(!maxed||reduce||!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;let raf=0,last=performance.now(),w=0,h=0,due=0,speed=1,pulse=0;const parts:Array<any>=[];const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};const spawn=(burst=false)=>parts.push({x:Math.random()*w,y:burst?h*(.2+Math.random()*.8):h+3,r:.9+Math.random()*1.1,vy:-(7+Math.random()*9),sway:(Math.random()-.5)*10,phase:Math.random()*Math.PI*2,life:burst?Math.random()*1.2:0,span:2.4+Math.random()*2.4});const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;const typed=typing.current;typed.energy*=Math.exp(-dt/.8);pulse*=Math.exp(-dt/.16);if(typed.strokes){typed.strokes=0;if(sparkBoost>0)pulse=1}const energy=typed.energy*sparkBoost;speed+=(1+energy*6-speed)*(1-Math.exp(-dt/.15));due+=dt;while(due>.14){due-=.14;if(parts.length<30)spawn()}ctx.clearRect(0,0,w,h);ctx.fillStyle=sparkColor;ctx.shadowColor=sparkColor;ctx.shadowBlur=6+energy*10+pulse*6;for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life+=dt;if(p.life>p.span){parts.splice(i,1);continue}const k=p.life/p.span,tw=.7+.3*Math.sin(now/160*(1+energy)+p.phase);p.y+=p.vy*dt*speed;if(p.y<-4){p.y=h+3;p.x=Math.random()*w}const edge=Math.min(1,Math.max(0,p.y/14),Math.max(0,(h-p.y)/14));ctx.globalAlpha=Math.min(1,Math.sin(k*Math.PI)*(.9+energy*.25)*tw)*edge;ctx.beginPath();ctx.arc(p.x+Math.sin(now/900*(1+energy*.8)+p.phase)*p.sway,p.y,p.r*tw*(1+energy*.35),0,Math.PI*2);ctx.fill()}raf=requestAnimationFrame(tick)};resize();for(let i=0;i<26;i++)spawn(true);const ro=new ResizeObserver(resize);ro.observe(canvas);raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);ro.disconnect();ctx.clearRect(0,0,w,h)}},[maxed,reduce,sparkColor,sparkBoost]);
 const setEffort=(i:number)=>{const n=Math.max(0,Math.min(efforts.length-1,i));if(n===effortIndex)return;setEffortIndex(n);latest.current.onEffortChange?.(efforts[n])};
 const effortFromPointer=(e:React.PointerEvent)=>{const r=e.currentTarget.getBoundingClientRect(),k=(e.clientX-r.left-EDGE)/Math.max(1,r.width-2*EDGE);setEffort(Math.round(k*(efforts.length-1)))};
 const stepAt=(i:number)=>`calc(${EDGE}px + (100% - ${EDGE*2}px) * ${i/Math.max(1,efforts.length-1)})`;
 const fillAt=(i:number)=>i===efforts.length-1?"100%":`calc(${stepAt(i)} + 7px)`;
 const pick=(row:any)=>{if(open==="model"){setModelKey(row.key);setModelOpen(false);focusInput();return}const head=token?draft.slice(0,token.start):draft;if(row.attach){setDraft(head);Promise.resolve(latest.current.onAttach?.()).then(files=>{if(files)setAttachments(a=>[...a,...(Array.isArray(files)?files:[files])])})}else if(open==="at")setDraft(`${head}@${row.name} `);else setDraft(`${head}${row.name} `);setPlusOpen(false);setDismissed(false);focusInput()};
 const send=()=>{if(!canSend||busy)return;void latest.current.onSend?.(draft.trim(),{attachments,model,effort:level});setDraft("");setAttachments([]);setDismissed(false);closeMenus();focusInput()};
 const toggleListen=()=>{if(listening){dictation.current++;setListening(false);return}const seq=++dictation.current;setListening(true);Promise.resolve(latest.current.onDictate?.()).then(text=>{if(seq!==dictation.current)return;setListening(false);if(text)setDraft(d=>(d.trim()?d.trimEnd()+" ":"")+text);focusInput()},()=>{if(seq===dictation.current)setListening(false)})};
 const onKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(open&&list.length){if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();setActive((cursor+(e.key==="ArrowDown"?1:list.length-1))%list.length);return}if((e.key==="Enter"&&!e.shiftKey)||e.key==="Tab"){e.preventDefault();pick(list[cursor]);return}}if(e.key==="Escape"){if(open){e.preventDefault();setDismissed(true);closeMenus()}return}if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}};
 return <div ref={rootRef} className={`prompt-bar${className?" "+className:""}`} data-busy={busy?"":undefined} data-max={maxed?"":undefined} style={{"--pb-bg":background,"--pb-ink":color,"--pb-menu":menuBackground,"--pb-w":`${width}px`,"--pb-radius":`${radius}px`,"--pb-spark":sparkColor,"--pb-press":pressScale} as React.CSSProperties}>
  {open&&<div className="prompt-bar__menu" role={open==="effort"?"dialog":"listbox"} aria-label={open==="at"?"Sources":open==="slash"?"Commands":open==="model"?"Models":"Effort"} data-kind={open}>
   {open==="effort"?<><div className="prompt-bar__effort-head"><span className="prompt-bar__effort-title">Effort</span><span className="prompt-bar__effort-level">{level}</span><span className="prompt-bar__effort-help" title="Higher effort thinks longer before answering"><CircleHelp size={14}/></span></div><div className="prompt-bar__effort-ends"><span>Faster</span><span>Smarter</span></div><div className="prompt-bar__effort-track" role="slider" tabIndex={0} aria-label="Effort" aria-valuemin={0} aria-valuemax={Math.max(0,efforts.length-1)} aria-valuenow={effortIndex} aria-valuetext={level} style={{"--pb-effort-x":stepAt(effortIndex),"--pb-effort-fill":fillAt(effortIndex)} as React.CSSProperties} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.focus({preventScroll:true});effortFromPointer(e)}} onPointerMove={e=>{if(e.buttons&1)effortFromPointer(e)}} onKeyDown={e=>{const s=e.key==="ArrowRight"||e.key==="ArrowUp"?1:e.key==="ArrowLeft"||e.key==="ArrowDown"?-1:0;if(s){e.preventDefault();setEffort(effortIndex+s)}else if(e.key==="Home"){e.preventDefault();setEffort(0)}else if(e.key==="End"){e.preventDefault();setEffort(efforts.length-1)}else if(e.key==="Escape"){setEffortOpen(false);focusInput()}}}><span className="prompt-bar__effort-fill"/>{efforts.map((label,i)=><i key={label} className="prompt-bar__effort-dot" style={{left:stepAt(i)}}/>)}<span className="prompt-bar__effort-thumb"/></div></>:<><span ref={glowRef} className="prompt-bar__glow" aria-hidden="true"/>{list.map((row:any,i:number)=><button key={row.key} ref={el=>{if(el)rowRefs.current[i]=el}} type="button" role="option" aria-selected={i===cursor} className="prompt-bar__row" onMouseDown={e=>e.preventDefault()} onPointerEnter={()=>setActive(i)} onClick={()=>pick(row)}>{open==="at"&&<span className="prompt-bar__row-icon">{renderIcon(row.icon,15)}</span>}<span className="prompt-bar__row-name">{row.name}</span>{row.description&&<span className="prompt-bar__row-desc">{row.description}</span>}{open==="model"&&<><span className="prompt-bar__row-tag">{row.tag}</span><span className="prompt-bar__row-check" data-on={row.key===model?.key?"":undefined}><Check size={13}/></span></>}</button>)}{!list.length&&<div className="prompt-bar__empty">No matches for “{query}”</div>}</>}
  </div>}
  <div className="prompt-bar__field" onClick={focusInput}>
   <canvas ref={sparkRef} className="prompt-bar__sparks" aria-hidden="true"/>
   {attachments.length>0&&<div className="prompt-bar__chips">{attachments.map((file,i)=>{const name=file instanceof File?file.name:String(file);return <span key={name+"-"+i} className="prompt-bar__chip"><FileText size={12}/><span className="prompt-bar__chip-name">{name}</span><button type="button" className="prompt-bar__chip-x" aria-label={`Remove ${name}`} onClick={e=>{e.stopPropagation();setAttachments(a=>a.filter((_,j)=>j!==i))}}><X size={10}/></button></span>})}</div>}
   <textarea ref={inputRef} className="prompt-bar__input" rows={1} value={draft} placeholder={listening?"Listening…":placeholder} aria-label="Prompt" onChange={e=>{setDraft(e.target.value);typing.current.energy=Math.min(1.6,typing.current.energy+.22);typing.current.strokes=Math.min(4,typing.current.strokes+1);setDismissed(false);closeMenus();setActive(0)}} onFocus={closeMenus} onKeyDown={onKeyDown}/>
   <div className="prompt-bar__bar">
    <button type="button" className="prompt-bar__tool" aria-label="Add files and sources" aria-expanded={plusOpen} data-on={plusOpen?"":undefined} onMouseDown={e=>e.preventDefault()} onClick={()=>{setModelOpen(false);setEffortOpen(false);setActive(0);setPlusOpen(v=>!v);focusInput()}}><Plus size={16}/></button>
    {models.length>0&&<button type="button" className="prompt-bar__pick" aria-label="Choose model" aria-expanded={modelOpen} data-on={modelOpen?"":undefined} onMouseDown={e=>e.preventDefault()} onClick={()=>{setPlusOpen(false);setEffortOpen(false);setActive(Math.max(0,models.indexOf(model)));setModelOpen(v=>!v);focusInput()}}><span>{model?.name}</span><ArrowDown size={12}/></button>}
    {efforts.length>0&&<button type="button" className="prompt-bar__pick" aria-label="Choose effort" aria-expanded={effortOpen} data-on={effortOpen?"":undefined} data-max={maxed?"":undefined} onMouseDown={e=>e.preventDefault()} onClick={()=>{setPlusOpen(false);setModelOpen(false);setEffortOpen(v=>!v);focusInput()}}><Sparkles size={13}/><span>{level}</span></button>}
    <span className="prompt-bar__spacer"/>
    {onDictate&&<button type="button" className="prompt-bar__tool" aria-label={listening?"Stop dictation":"Dictate"} aria-pressed={listening} data-on={listening?"":undefined} onMouseDown={e=>e.preventDefault()} onClick={toggleListen}>{listening?<span className="prompt-bar__eq"><i/><i/><i/></span>:<Mic size={15}/>}</button>}
    <button type="button" className="prompt-bar__send" disabled={!armed} aria-label={busy?"Stop":"Send"} data-armed={armed?"":undefined} data-pressed={pressed?"":undefined} onMouseDown={e=>e.preventDefault()} onPointerDown={e=>{if(e.button===0&&armed)setPressed(true)}} onPointerUp={()=>setPressed(false)} onPointerCancel={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)} onClick={()=>busy?latest.current.onStop?.():send()}><SendGlyph busy={busy} morphDuration={morphDuration} squash={squash} tilt={tilt}/></button>
   </div>
  </div>
 </div>;
}
