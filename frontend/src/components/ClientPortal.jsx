import React, { useState } from 'react';

export default function ClientPortal() {
  // Staging Application Forms Component State Layers
  const [isSingpassLinked, setIsSingpassLinked] = useState(false);
  const [loadingSingpass, setLoadingSingpass] = useState(false);
  
  const [formData, setFormData] = useState({
    uen: '',
    companyName: '',
    requestedQuantum: '',
    declaredLoans: 'NIL',
    businessType: '',
    yearsInOperation: ''
  });
  
  const [bankStatement, setBankStatement] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  // 1. Simulate GovTech Singpass Myinfo Auth Code Handshake Exchange Loop
  const handleSingpassSync = () => {
    setLoadingSingpass(true);
    // Simulate a secure redirect callback window handshake loop
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        uen: '202188341M', // Triggers our preset Experian charge records verification rule path
        companyName: 'NEXUS INNOVATION PTE. LTD.',
        businessType: 'Information Technology',
        yearsInOperation: '5'
      }));
      setIsSingpassLinked(true);
      setLoadingSingpass(false);
    }, 1200);
  };

  // 2. Handle Text & Selection Changes Across Pre-Questionnaire Forms Grid
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBankStatement(e.target.files[0]);
    }
  };

  // 3. Multi-part Package Compilation Gateway Form Submission Routine
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!bankStatement) {
      alert('Mandatory Requirement: Please attach your corporate UOB Bank Statement PDF before submitting.');
      return;
    }

    setSubmissionStatus({ type: 'info', message: 'Streaming application payload to backend staging ledger...' });

    // Pack standard form parameters into modern HTML5 FormData container objects
    const uploadPayload = new FormData();
    uploadPayload.append('uen', formData.uen);
    uploadPayload.append('company_name', formData.companyName);
    uploadPayload.append('requested_quantum', parseFloat(formData.requestedQuantum));
    uploadPayload.append('declared_loans', formData.declaredLoans);
    
    // Package alternative metadata strings into a single structured questionnaire string
    const questionnairePayload = {
      business_type: formData.businessType,
      years_in_operation: formData.yearsInOperation,
      submission_timestamp: new Date().toISOString()
    };
    uploadPayload.append('pre_questionnaire_json', JSON.stringify(questionnairePayload));

    // Simulate Singpass metadata background profile storage tracking maps
    const singpassPayload = {
      verified_source: "GovTech Myinfo Business API",
      registry_directors: ["Alex Tan Wei Liang", "Sarah Lim Xiu Qi"]
    };
    uploadPayload.append('singpass_profile_json', JSON.stringify(singpassPayload));
    
    // Attach the raw structural stream binary file object
    uploadPayload.append('bank_statement', bankStatement);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/client/submit', {
        method: 'POST',
        body: uploadPayload, // Browser sets multipart/form-data boundary flags automatically
      });

      const data = await response.json();
      if (data.success) {
        setSubmissionStatus({
          type: 'success',
          message: `Application Registered! System Reference ID: ${data.application_id}. State: PENDING RM APPRAISAL EVALUATION.`
        });
      } else {
        throw new Error(data.detail || 'Staging infrastructure validation failure.');
      }
    } catch (error) {
      setSubmissionStatus({ type: 'error', message: `Submission connection block error: ${error.message}` });
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
      <h2 style={{ color: '#111827', borderBottom: '2px solid #3b82f6', paddingBottom: '10px', marginTop: 0 }}>UOB Corporate Smart-Lending Application Portal</h2>
      
      {/* Step 1: Singpass Identity Lock Framework Card */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px dashed #2563eb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>Corporate Profile Verification Gate</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e3a8a' }}>Accelerate your application process. Connect via Singpass to import verified ACRA registry records instantly.</p>
        
        {!isSingpassLinked ? (
          <button type="button" onClick={handleSingpassSync} disabled={loadingSingpass} style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loadingSingpass ? 'Connecting to GovTech Gateways...' : 'Retrieve via Singpass Myinfo'}
          </button>
        ) : (
          <div style={{ color: '#15803d', fontWeight: 'bold', fontSize: '14px' }}>✓ Secured Identity Profile Handshake Active (ACRA Authenticated)</div>
        )}
      </div>

      <form onSubmit={handleSubmitApplication}>
        {/* Core Profile Parameters Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Verified Company Registration UEN</label>
            <input type="text" name="uen" value={formData.uen} onChange={handleInputChange} required readOnly={isSingpassLinked} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: isSingpassLinked ? '#f3f4f6' : '#fff' }} placeholder="e.g. 2021XXXXXM" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Registered Corporate Name Entity</label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required readOnly={isSingpassLinked} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: isSingpassLinked ? '#f3f4f6' : '#fff' }} placeholder="Company Legal Name" />
          </div>
        </div>

        {/* Target Quantums Input fields section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Desired Credit Financing Quantum ($ SGD)</label>
          <input type="number" name="requestedQuantum" value={formData.requestedQuantum} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} placeholder="Amount requested (e.g. 50000)" />
        </div>

        {/* Structured Pre-Questionnaire Form Fields Selection Loop */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#374151', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>Pre-Qualification Disclosures Questionnaire</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Are there any active external commercial credit lines or institutional bank charges filed against your company?</label>
            <select name="declaredLoans" value={formData.declaredLoans} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <option value="NIL">No, we have no active external loan structures facility or floating charges (NIL)</option>
              <option value="ACTIVE_FACILITIES_EXIST">Yes, we have operational debt positions active in other banks</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Industry Core Specialization Verticals</label>
              <input type="text" name="businessType" value={formData.businessType} onChange={handleInputChange} placeholder="e.g. Software Development" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Years of Active Operations</label>
              <input type="number" name="yearsInOperation" value={formData.yearsInOperation} onChange={handleInputChange} placeholder="e.g. 3" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
          </div>
        </div>

        {/* Document Ingestion Zone Hooks */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Upload Latest 6-Months UOB Primary Operating Bank Statement (PDF format)</label>
          <input type="file" accept=".pdf" onChange={handleFileChange} required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }} />
        </div>

        {/* Submission Action Interfaces */}
        <button type="submit" style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          Submit Financial Appraisal Package
        </button>
      </form>

      {/* Dynamic Status Dashboard Visualizations Alerts */}
      {submissionStatus && (
        <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', backgroundColor: submissionStatus.type === 'success' ? '#dcfce7' : submissionStatus.type === 'error' ? '#fee2e2' : '#f3f4f6', color: submissionStatus.type === 'success' ? '#166534' : submissionStatus.type === 'error' ? '#991b1b' : '#374151', border: `1px solid ${submissionStatus.type === 'success' ? '#bbf7d0' : submissionStatus.type === 'error' ? '#fecaca' : '#e5e7eb'}` }}>
          {submissionStatus.message}
        </div>
      )}
    </div>
  );
}