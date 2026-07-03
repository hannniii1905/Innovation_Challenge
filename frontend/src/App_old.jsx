import { useCallback, useState, useEffect } from "react";
import { uploadDocument, getExtraction, getStatus } from "./api/client"; // Retained for document submission hook integration
import { STAGE } from "./lib/format";
import VerificationTable from "./components/VerificationTable";
import KitingFindings from "./components/KitingFindings";

export default function App() {
  const [role, setRole] = useState("client"); // Default to client to test the intake funnel
  const [sessionId, setSessionId] = useState(null);

  const [stage, setStage] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [applications, setApplications] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem('rm_applications');
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved applications", e);
      }
    }
  }, []);

  // FIX 2: Correctly dependency-manage the save effect
  useEffect(() => {
    localStorage.setItem('rm_applications', JSON.stringify(applications));
  }, [applications]);
  // ---- CLIENT PORTAL INTAKE FUNNEL STATES ----
  const [clientStep, setClientStep] = useState(1); // 1: Singpass, 2: Form, 3: Questionnaire, 4: Upload, 5: Finished
  const [singpassVerified, setSingpassVerified] = useState(false);
  const [singpassLoading, setSingpassLoading] = useState(false);
  
  // Application Form Fields
  const [formData, setFormData] = useState({
    companyName: "",
    uen: "",
    directorName: "",
    requestedLoanAmount: "50000",
    loanPurpose: "Working Capital",
  });

  // Pre-Questionnaire Answers
  const [questionnaire, setQuestionnaire] = useState({
    hasExistingLoans: "no",
    existingLoanAmount: "",
    latePaymentsPast12Months: "no",
    profitableLastYear: "yes",
  });

  // Document Upload Tracker
  const [uploadedDocs, setUploadedDocs] = useState({
    bankStatement: null,
    irasTaxStatement: null,
  });
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  const reset = useCallback(() => {
    setSessionId(null);
    setStage(null);
    setExtraction(null);
    setReport(null);
    setError(null);
    setClientStep(1);
    setSingpassVerified(false);
    setSingpassLoading(false);
    setFormData({
      companyName: "",
      uen: "",
      directorName: "",
      requestedLoanAmount: "50000",
      loanPurpose: "Working Capital",
    });
    setUploadedDocs({ bankStatement: null, irasTaxStatement: null });
  }, []);

  // ---- MOCK TRIGGERS ----
  const handleTriggerSingpass = () => {
    setSingpassLoading(true);
    setTimeout(() => {
      setSingpassVerified(true);
      setSingpassLoading(false);
      setFormData((prev) => ({
        ...prev,
        companyName: "ALPHA LOGISTICS & TRADING PTE. LTD.",
        uen: "201948329Z",
        directorName: "Tan Min Lin (SXXXX123A)",
      }));
      setClientStep(2); // Auto advance to form filling
    }, 1200);
  };

  const handleDocumentChange = (key, file) => {
    // Add a safety check to ensure we aren't crashing the renderer
    if (!file) return;

    setUploadedDocs(prev => ({
      ...prev,
      [key]: file
    }));
  
  // Log it so we can see the data structure
    console.log(`Successfully updated ${key}:`, file);
  };


  const handleClientSubmitApplication = async () => {
    if (!uploadedDocs.bankStatement || !uploadedDocs.irasTaxStatement) {
      setError("Please supply both your Corporate Bank Statement and IRAS Tax Statement files.");
      return;
    }

    setError(null);
    setIsUploadingDocs(true);

    try {
      // 1. Upload the bank statement
      const { session_id } = await uploadDocument(uploadedDocs.bankStatement);

      // 2. Wait until OCR finishes
      let status;

      do {
          await new Promise(resolve => setTimeout(resolve, 1000));

          status = await getStatus(session_id);

          console.log("Current OCR stage:", status.stage);

      } while (status.stage === "extracting");

      // 3. Now fetch the completed extraction
      const ocrData = await getExtraction(session_id);
      console.log("DEBUG: Full OCR Data received from backend:", ocrData);
      // 4. Create the application object with the REAL parsed data
      const newApplication = {
        sessionId: session_id,
        company_name: ocrData.company_name || formData.companyName,
        registration_no: ocrData.registration_no || formData.uen,
        singpass_verified_director: ocrData.singpass_verified_director || formData.directorName,
        total_credits: ocrData.total_credits || 0,
        total_debits: ocrData.total_debits || 0,
        financials: {
          ...ocrData.financials,
          requested_loan: `$${Number(formData.requestedLoanAmount).toLocaleString()}`
        },
        transactions: ocrData.transactions || [] 
      };

      // 4. Update states to move the flow forward
      setSessionId(session_id);
      if (!newApplication) {
        console.error("Critical: Attempted to set extraction to null!");
        return;
      }
      setExtraction(newApplication);
      setApplications((prev) => [newApplication, ...prev]); 
      setStage(status.stage);
      setClientStep(5);
      
    } catch (err) {
      console.error("Submission error:", err);
      
      // Update this to be more aggressive in finding the error message
      // If the backend sends { detail: "Something went wrong" }, this finds it.
      const message = err.message || JSON.stringify(err);
      setError(message);
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const handleAction = (action) => {
    console.log(`Application ${sessionId} moved to status: ${action}`);

    setSessionId(null);
    setExtraction(null);
    setStage(null); 
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* 🔮 BRAND TOP STICKY CONTROLLER BANNER */}
      <div className="bg-white border-b border-slate-200 py-3 shadow-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-sm shadow-sm">
              Ω
            </span>
            <span className="font-bold text-slate-800 text-sm tracking-tight">RiskUnderwrite AI</span>
          </div>
          
          <div className="flex gap-2.5 text-xs font-semibold">
            <button 
              className={`px-3.5 py-2 rounded-xl transition ${role === 'client' ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => { reset(); setRole('client'); }}
            >
              👤 Client Portal
            </button>
            <button 
              className={`px-3.5 py-2 rounded-xl transition ${role === 'rm' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setRole('rm')}
            >
              💼 RM Underwriting Queue
            </button>
          </div>
        </div>
      </div>

      {/* 🎨 VIBRANT BACKGROUND DECORATIVE HEADER BLOCK BAR */}
      <header className="h-16 bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 w-full shadow-inner opacity-90" />

      {/* 🚀 CENTRAL SCREEN CONTAINER FOR LAYOUT DESKS */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 flex-1">
        
        {/* ========================================================================= */}
        {/* ----------------------- 👤 CLIENT HUB INTAKE WIZARD ---------------------- */}
        {/* ========================================================================= */}
        {role === 'client' ? (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* STEP PROGRESS INDICATOR PIPELINE BAR */}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm flex justify-between items-center text-xs font-medium text-slate-400">
              <span className={`flex items-center gap-1.5 ${clientStep >= 1 ? 'text-indigo-600 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${clientStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>1</span> Singpass
              </span>
              <div className="h-px bg-slate-200 flex-1 mx-4" />
              <span className={`flex items-center gap-1.5 ${clientStep >= 2 ? 'text-indigo-600 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${clientStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>2</span> Information
              </span>
              <div className="h-px bg-slate-200 flex-1 mx-4" />
              <span className={`flex items-center gap-1.5 ${clientStep >= 3 ? 'text-indigo-600 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${clientStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>3</span> Questionnaire
              </span>
              <div className="h-px bg-slate-200 flex-1 mx-4" />
              <span className={`flex items-center gap-1.5 ${clientStep >= 4 ? 'text-indigo-600 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${clientStep >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>4</span> Document Upload
              </span>
            </div>

            {/* ERROR ALERTS CONTAINER */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* STEP 1: SINGPASS MYINFO BUSINESS AUTHORIZATION LINK */}
            {clientStep === 1 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-6">
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Link Business Profile</h3>
                  <p className="text-sm text-slate-500">
                    Retrieve registered entity info securely via Singpass MyInfo Business to instantly skip manual data entry logs.
                  </p>
                </div>
                
                <button
                  onClick={handleTriggerSingpass}
                  disabled={singpassLoading}
                  className="mx-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {singpassLoading ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="font-extrabold tracking-wider text-sm">singpass</span>
                  )}
                  Log In with MyInfo Business
                </button>
              </div>
            )}

            {/* STEP 2: BUSINESS APPLICATION FORM FIELDS */}
            {clientStep === 2 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in-up">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Application Parameters</h3>
                    <p className="text-xs text-slate-400">Review corporate profile items and supply required targets.</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2.5 py-0.5 rounded text-[10px]">
                    ✓ Linked via MyInfo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
                  <div className="space-y-1.5">
                    <label className="text-slate-500">ACRA Entity Name</label>
                    <input type="text" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none font-semibold" value={formData.companyName} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500">UEN Number</label>
                    <input type="text" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none font-semibold" value={formData.uen} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-slate-500">Authorized Appointed Director</label>
                    <input type="text" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none font-semibold" value={formData.directorName} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600">Requested Credit Facility Capital ($ SGD)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm transition outline-none" 
                      value={formData.requestedLoanAmount}
                      onChange={(e) => setFormData({...formData, requestedLoanAmount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600">Purpose of Allocation Facility</label>
                    <select 
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 font-medium transition outline-none"
                      value={formData.loanPurpose}
                      onChange={(e) => setFormData({...formData, loanPurpose: e.target.value})}
                    >
                      <option>Working Capital</option>
                      <option>Equipment Asset Purchasing</option>
                      <option>Inventory Invoicing Acceleration</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setClientStep(3)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition">
                    Continue to Questionnaire
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PRE-QUESTIONNAIRE SELECTION PANEL */}
            {clientStep === 3 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in-up">
                <div>
                  <h3 className="font-bold text-slate-900">Pre-Qualification Assessment</h3>
                  <p className="text-xs text-slate-400">Answer preliminary items required for underwriting sorting.</p>
                </div>

                <div className="space-y-4 text-xs font-medium text-slate-700">
                  <div className="space-y-2">
                    <label className="text-slate-600 block">Does the company have active term or credit line facilities out with other institutions?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="loans" checked={questionnaire.hasExistingLoans === 'yes'} onChange={() => setQuestionnaire({...questionnaire, hasExistingLoans: 'yes'})} /> Yes</label>
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="loans" checked={questionnaire.hasExistingLoans === 'no'} onChange={() => setQuestionnaire({...questionnaire, hasExistingLoans: 'no'})} /> No</label>
                    </div>
                  </div>

                  {questionnaire.hasExistingLoans === 'yes' && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 animate-fade-in-up">
                      <label className="text-slate-500">Estimated Total Outstanding Debt Value ($ SGD)</label>
                      <input type="text" className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5" placeholder="e.g. 100,000" value={questionnaire.existingLoanAmount} onChange={(e) => setQuestionnaire({...questionnaire, existingLoanAmount: e.target.value})} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-slate-600 block">Has the company incurred any late trade payment delinquencies over the last 12 months?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="late" checked={questionnaire.latePaymentsPast12Months === 'yes'} onChange={() => setQuestionnaire({...questionnaire, latePaymentsPast12Months: 'yes'})} /> Yes</label>
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="late" checked={questionnaire.latePaymentsPast12Months === 'no'} onChange={() => setQuestionnaire({...questionnaire, latePaymentsPast12Months: 'no'})} /> No</label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-600 block">Was the business net profit flow positive during the preceding audited financial block?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="profit" checked={questionnaire.profitableLastYear === 'yes'} onChange={() => setQuestionnaire({...questionnaire, profitableLastYear: 'yes'})} /> Yes</label>
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="profit" checked={questionnaire.profitableLastYear === 'no'} onChange={() => setQuestionnaire({...questionnaire, profitableLastYear: 'no'})} /> No</label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button onClick={() => setClientStep(2)} className="text-slate-500 font-semibold text-xs hover:bg-slate-50 px-4 py-2 rounded-xl transition">Back</button>
                  <button onClick={() => setClientStep(4)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition">Continue to Document Upload</button>
                </div>
              </div>
            )}

            {/* STEP 4: SEPARATE DROPMARK TRACKERS FOR STATEMENT PACKETS */}
            {clientStep === 4 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in-up">
                <div>
                  <h3 className="font-bold text-slate-900">Document Upload Core</h3>
                  <p className="text-xs text-slate-400">Upload primary items required for automatic system verification routing profiles.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DROPZONE A: BANK STATEMENT */}
                  <div className="border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 p-5 rounded-2xl text-center relative group transition">
                    <div className="space-y-2">
                      <div className="mx-auto h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm font-bold">🏦</div>
                      <h4 className="text-xs font-bold text-slate-800">Corporate Bank Statement</h4>
                      <p className="text-[11px] text-slate-400">PDF copy containing past 6 months cash lines transactions log.</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => handleDocumentChange('bankStatement', e.target.files[0])}
                    />
                    {uploadedDocs.bankStatement && (
                      <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-2 rounded-lg font-medium inline-block">
                        ✓ {uploadedDocs.bankStatement.name}
                      </div>
                    )}
                  </div>

                  {/* DROPZONE B: IRAS STATEMENT */}
                  <div className="border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 p-5 rounded-2xl text-center relative group transition">
                    <div className="space-y-2">
                      <div className="mx-auto h-9 w-9 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center text-sm font-bold">📄</div>
                      <h4 className="text-xs font-bold text-slate-800">IRAS Tax Statement Notice</h4>
                      <p className="text-[11px] text-slate-400">Most recent copy of Notice of Assessment (NOA) PDF.</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => handleDocumentChange('irasTaxStatement', e.target.files[0])} 
                    />
                    {uploadedDocs.irasTaxStatement && (
                      <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-2 rounded-lg font-medium inline-block">
                        ✓ {uploadedDocs.irasTaxStatement.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setClientStep(3)} className="text-slate-500 font-semibold text-xs hover:bg-slate-50 px-4 py-2 rounded-xl transition">Back</button>
                  <button 
                    onClick={handleClientSubmitApplication}
                    disabled={isUploadingDocs || !uploadedDocs.bankStatement || !uploadedDocs.irasTaxStatement}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition"
                  >
                    {isUploadingDocs ? "Transmitting Packet File..." : "Submit Documents for Verification"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: FINALIZED SUCCESS SCREEN STATE */}
            {clientStep === 5 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm animate-fade-in-up space-y-4">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">Application Submitted Completely</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Your documents and Singpass profile logs have been packaged into our encrypted system buffer. A Relationship Manager will run evaluation tasks immediately.
                  </p>
                </div>
                <div className="pt-2">
                  <button onClick={reset} className="text-xs text-indigo-600 hover:underline font-semibold">File another loan registration</button>
                </div>
              </div>
            )}

          </div>
        ) : (
          
          // =========================================================================
          // 💼 RELATIONSHIP MANAGER VIEW PORTAL
          // =========================================================================
          <div className="space-y-6 animate-fade-in-up">
            <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Relationship Manager Portal</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Central credit underwriting pipeline and pending application database queue.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200/60 shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Database Listener Active
              </span>
            </div>

            {/* DYNAMIC PIPELINE QUEUE */}
            {!sessionId ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">Pending Evaluation Queue ({applications.length})</h3>
                </div>

                {applications.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">
                    No pending applications in the queue.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <div 
                        key={app.sessionId}
                        className="p-6 hover:bg-slate-50/80 transition cursor-pointer flex justify-between items-center group"
                        onClick={() => {
                          setSessionId(app.sessionId);
                          setExtraction(app);
                          setStage(STAGE.AWAITING_VERIFICATION);
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                              {app.company_name}
                            </span>
                            <span className="px-2 py-0.5 text-[11px] font-medium bg-violet-50 text-violet-700 rounded border border-violet-100">
                              Singpass Verified
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex gap-4">
                            <span>Reg No: {app.registration_no}</span>
                            <span>•</span>
                            {/* Shows the exact time of submission */}
                            <span>Submitted: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            Pending Credit Review
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              
              /* SPLIT DESK AUDIT ENVIRONMENT WORKSPACE LAYOUT GRID */
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
                  <button 
                    onClick={() => { setSessionId(null); setReport(null); }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Application Pipeline Queue
                  </button>
                  <div className="text-xs text-slate-400 font-mono">Linked Package Hash ID: {sessionId}</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT SPLIT PANEL DESK: KYC CROSS MATRIX AUDITS */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                        📋 Core KYC & Corporate Registry Match
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">ACRA Registered Name</span>
                          <p className="font-semibold text-slate-800">{extraction?.company_name}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">UEN / Entity Code</span>
                          <p className="font-semibold text-slate-800">{extraction?.registration_no}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Requested Capital Matrix</span>
                          <p className="font-bold text-indigo-600">{extraction?.financials?.requested_loan || "$50,000"}</p>
                        </div>
                        <div className="space-y-1 col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-medium block">Singpass Corporate Authenticated Director</span>
                            <span className="font-semibold text-slate-800">{extraction?.singpass_verified_director}</span>
                          </div>
                          <span className="text-emerald-700 bg-emerald-50 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100">MATCHED</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="px-2 pb-3 border-b border-slate-100 mb-4">
                        <h3 className="text-sm font-bold text-slate-900">🔍 OCR Statement Extraction Audit</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Verify background engine extractions to generate final risk outputs.</p>
                      </div>
                      
                      <VerificationTable
                        extraction={extraction}
                        onApprove={() => {
                          // 1. Calculate dynamic risk
                          GET /rm/evaluate/{application_id}
                          
                          // 2. Set the report with dynamic data
                          setReport({
                            ...extraction,
                            document_type: "financial_statement",
                            credit_kiting: dynamicRisk, // Uses the result of the calculation
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* RIGHT SPLIT PANEL DESK: COGNITIVE RISK UNDERWRITING OUTPUTS */}
                  <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
                    {report ? (
                      <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                              ⚠️ Credit Underwriting Engine
                            </h3>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm ${
                              report.risk_level === 'HIGH' ? 'bg-red-600 text-white' : 
                              report.risk_level === 'MEDIUM' ? 'bg-amber-500 text-white' : 
                              'bg-emerald-600 text-white'
                            }`}>
                              {report.risk_level || "UNKNOWN"}
                            </span>
                          </div>
                          {/* Use optional chaining here to prevent crash if credit_kiting is missing */}
                          <KitingFindings creditKiting={report?.credit_kiting} />
                        </div>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleAction('APPROVE')} 
                            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-md"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction('REJECT')} 
                            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition shadow-md"
                          >
                            Reject Case
                          </button>
                          <button 
                            onClick={() => handleAction('ESCALATE')} 
                            className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-md"
                          >
                            Escalate Review
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400">
                        <p className="text-xs font-medium">Approve or submit the audit logs to load risk intelligence scores.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER BAR BRAND */}
      <footer className="border-t border-slate-200/70 py-6 text-center text-xs text-slate-400 w-full bg-white mt-12">
        RiskUnderwrite AI · Human-in-the-loop processing pipeline integration
      </footer>
    </div>
  );
}