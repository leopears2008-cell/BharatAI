"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
export default function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const router=useRouter();
  const handleLogin=async(e:React.FormEvent)=>{e.preventDefault();if(!email||password.length<8)return;setLoading(true);setError("");
    try{const res=await fetch((process.env.NEXT_PUBLIC_PYTHON_API_URL||"http://localhost:8000")+"/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const data=await res.json();if(!res.ok)throw new Error(data.detail||data.error||"Login failed");localStorage.setItem("bharatai_token",data.token); if(data.refresh_token)localStorage.setItem("bharatai_refresh_token",data.refresh_token); router.push("/");}
    catch(err:any){setError(err.message||"Login failed");}finally{setLoading(false);}
  };
  return <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md"><div className="flex justify-center"><div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200"><Bot size={32} className="text-white"/></div></div><h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">Welcome to BharatAI</h2><p className="mt-2 text-center text-sm text-slate-600">Sign in to access your intelligent multilingual assistant</p></div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"><div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-slate-100"><form className="space-y-6" onSubmit={handleLogin}>
      <div><label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email address</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="mt-2 block w-full px-4 py-3 border border-slate-200 rounded-xl sm:text-sm"/></div>
      <div><label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label><input id="password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters" className="mt-2 block w-full px-4 py-3 border border-slate-200 rounded-xl sm:text-sm"/></div>
      {error&&<div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
      <button type="submit" disabled={loading||!email||password.length<8} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">{loading?<Loader2 size={18} className="animate-spin"/>:"Sign in"}{!loading&&<ArrowRight size={18}/>}</button>
      <div className="text-center text-xs font-medium text-slate-500">Use at least 8 characters. New accounts are created on first successful sign-in.</div>
    </form></div></div>
  </div>;
}
