import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, XCircle, Loader2, Award, 
  ArrowRight, RotateCcw, ShieldCheck, AlertCircle 
} from "lucide-react";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Props {
  skill: string;
  onClose: () => void;
  onPass: () => void;
}

export const SkillQuiz = ({ skill, onClose, onPass }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.post('/api/v1/quiz', { skill, level: "Mid" })
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
            setQuestions(res.data);
        } else {
            setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
          setError(true);
          setLoading(false);
      });
  }, [skill]);

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null) return; 
    
    setSelectedOption(idx);
    const isCorrect = idx === questions[currentQ].correct_index;
    if (isCorrect) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1);
        setSelectedOption(null);
    } else {
        setShowResult(true);
    }
  };

  const handleRetry = () => {
      setCurrentQ(0);
      setScore(0);
      setSelectedOption(null);
      setShowResult(false);
  };

  if (loading) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center shadow-2xl">
            <Loader2 className="animate-spin mb-4 text-indigo-600" size={32} />
            <p className="font-bold text-gray-700">Generating Verification for {skill}...</p>
        </div>
    </div>
  );

  if (error) return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
            <AlertCircle className="text-red-500 mb-4" size={40} />
            <h3 className="font-bold text-lg mb-2">Quiz Generation Failed</h3>
            <p className="text-gray-500 mb-6">We could not verify this module at the moment.</p>
            <button onClick={onClose} className="bg-gray-100 px-6 py-2 rounded-lg font-bold">Close</button>
        </div>
    </div>
  );

  const passingScore = Math.ceil(questions.length * 0.7); 
  const hasPassed = score >= passingScore;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
       >
          <div className="h-2 bg-gray-100 w-full">
             <motion.div 
               className={`h-full ${showResult ? (hasPassed ? "bg-green-500" : "bg-red-500") : "bg-indigo-600"}`}
               animate={{ width: `${((currentQ + (selectedOption !== null ? 1 : 0)) / questions.length) * 100}%` }} 
             />
          </div>

          <div className="p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600" size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Knowledge Gate</span>
                </div>
                <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <XCircle className="text-gray-300 hover:text-black" />
                </button>
            </div>

            <AnimatePresence mode="wait">
              {showResult ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                      {hasPassed ? (
                          <>
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                                <Award size={48} />
                            </div>
                            <h2 className="text-3xl font-black mb-3 text-gray-900">Module Verified!</h2>
                            <p className="text-gray-500 mb-8 text-lg">You scored <span className="font-bold text-green-600">{score}/{questions.length}</span>. Access granted to the next phase.</p>
                            <button 
                                onClick={onPass}
                                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-xl"
                            >
                                Continue Journey <ArrowRight size={20} />
                            </button>
                          </>
                      ) : (
                          <>
                            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle size={48} />
                            </div>
                            <h2 className="text-3xl font-black mb-3 text-gray-900">Review Needed</h2>
                            <p className="text-gray-500 mb-8 text-lg">You scored <span className="font-bold text-red-600">{score}/{questions.length}</span>. You need {passingScore} correct to pass.</p>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                    Close
                                </button>
                                <button onClick={handleRetry} className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2">
                                    <RotateCcw size={18} /> Try Again
                                </button>
                            </div>
                          </>
                      )}
                  </motion.div>
              ) : (
                  <motion.div 
                    key={currentQ}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                     <span className="text-xs font-bold text-indigo-500 uppercase mb-2 block">Question {currentQ + 1} of {questions.length}</span>
                     <h3 className="text-xl md:text-2xl font-bold mb-8 leading-tight text-gray-900">{questions[currentQ].question}</h3>
                     
                     <div className="space-y-3">
                        {questions[currentQ].options.map((opt, i) => {
                            const isSelected = selectedOption === i;
                            const isCorrect = i === questions[currentQ].correct_index;
                            const showCorrect = selectedOption !== null && isCorrect;
                            const showWrong = selectedOption !== null && isSelected && !isCorrect;
                            const dim = selectedOption !== null && !showCorrect && !showWrong;

                            return (
                                <button
                                    key={i}
                                    disabled={selectedOption !== null}
                                    onClick={() => handleAnswer(i)}
                                    className={`
                                        w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all font-medium flex justify-between items-center text-sm md:text-base
                                        ${showCorrect ? "bg-green-50 border-green-500 text-green-700 shadow-md" : 
                                          showWrong ? "bg-red-50 border-red-500 text-red-700 shadow-md" : 
                                          dim ? "opacity-50 border-gray-100 bg-gray-50" :
                                          "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md"}
                                    `}
                                >
                                    {opt}
                                    {showCorrect && <CheckCircle2 className="text-green-600" size={20} />}
                                    {showWrong && <XCircle className="text-red-600" size={20} />}
                                </button>
                            )
                        })}
                     </div>

                     {selectedOption !== null && (
                         <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
                         >
                             <div className="flex gap-2 mb-2 text-indigo-700 font-bold text-xs uppercase tracking-widest">
                                 <Award size={14} /> Explanation
                             </div>
                             <p className="text-sm text-indigo-900 leading-relaxed">
                                 {questions[currentQ].explanation}
                             </p>
                             <button 
                                onClick={handleNext}
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                             >
                                {currentQ < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight size={16} />
                             </button>
                         </motion.div>
                     )}
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
       </motion.div>
    </div>
  );
};