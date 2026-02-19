import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface AuthScreenProps {
  onComplete: (config: any, name: string, role?: string, email?: string) => void;
  onCancel: () => void;
}

export const AuthScreen = ({ onComplete, onCancel }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      
      if (isLogin) {
        // --- LOGIN ---
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        
        // Fetch existing profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.data.user.id)
          .single();

        onComplete(
            profile?.avatar_config, 
            profile?.full_name || email.split('@')[0], 
            profile?.target_role, 
            email
        );

      } else {
        // --- SIGN UP ---
        result = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: name } }
        });
        
        if (result.error) throw result.error;
        
        // Manually create profile row if trigger didn't catch it
        if (result.data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: result.data.user.id,
                email: email,
                full_name: name,
                current_level: 1,
                current_xp: 0
            });
            if (profileError) console.warn("Profile creation warning:", profileError);
        }

        onComplete(null, name, undefined, email);
      }

    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="bg-black p-8 text-center">
           <h2 className="text-2xl font-bold text-white mb-2">
             {isLogin ? "Welcome Back" : "Start Your Journey"}
           </h2>
           <p className="text-gray-400 text-sm">
             {isLogin ? "Resume your career roadmap." : "Create an account to save your progress."}
           </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="p-8 space-y-6">
           
           {error && (
             <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {error}
             </div>
           )}

           {!isLogin && (
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Full Name</label>
               <div className="relative">
                 <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                 <input 
                   type="text" 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                   placeholder="John Doe"
                   required
                 />
               </div>
             </div>
           )}

           <div className="space-y-2">
             <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email</label>
             <div className="relative">
               <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                 placeholder="name@example.com"
                 required
               />
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Password</label>
             <div className="relative">
               <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                 placeholder="••••••••"
                 required
                 minLength={6}
               />
             </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isLogin ? "Sign In" : "Create Account"} <ArrowRight size={20} />
                </>
             )}
           </button>
        </form>

        {/* Footer */}
        <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
           <button 
             onClick={() => { setIsLogin(!isLogin); setError(""); }}
             className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
           >
             {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
           </button>
           
           <div className="mt-4">
             <button onClick={onCancel} className="text-xs text-gray-400 hover:text-red-500 hover:underline">
               Cancel and go back
             </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};