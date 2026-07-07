import { useState } from "react";
import { Box } from "@mui/material";

import DemoProfileSelector from "./pages/DemoProfileSelector";
import SingpassLogin from "./pages/SingpassLogin";
import UenLookup from "./pages/UenLookup";
import KeymanApproval from "./pages/KeymanApproval";
import MyInfoReview from "./pages/MyInfoReview";
import LoanApplication from "./pages/LoanApplication";
import SupportingDocuments from "./pages/SupportingDocuments";
import InitialAssessment from "./pages/InitialAssessment";
import CreditApproverDashboard from "./pages/CreditApproverDashboard";
import CreditApproverHistory from "./pages/CreditApproverHistory";
import CreditDecisionWorkbench from "./pages/CreditDecisionWorkbench";
import TamperingDetailsPage from "./pages/TamperingDetailsPage";
import LitigationDetailsPage from "./pages/LitigationDetailsPage";
import RiskFlagDetailsPage from "./pages/RiskFlagDetailsPage";
import LoanLandingPage from "./pages/LoanLandingPage";

export default function App() {
  const [screen, setScreen] = useState("profile");
  const [selectedApproverApplication, setSelectedApproverApplication] = useState(null);
  const [decidedApplications, setDecidedApplications] = useState([]);
  const [tamperingApplication, setTamperingApplication] = useState(null);
  const [litigationApplication, setLitigationApplication] = useState(null);
  const [riskFlagState, setRiskFlagState] = useState(null);
  const [application, setApplication] = useState({
    profile: null,
    singpass: null,
    authMethod: null,
    applicant: null,
    loanAmount: 50000,
    tenure: 24,
    interestRate: 6,
    monthlyInstallment: 0,
    loanPurpose: "Working Capital",
    declarations: {
      positiveEBITDA: "",
      positiveTNW: "",
      existingLoans: "",
      existingLoanDetails: "",
      industry: "",
    },
    uploads: {
      bankStatement: null,
      incomeStatement: null,
      ic: null,
      financials: null,
    },
    consent: {
      creditBureau: false,
      acra: false,
      screening: false,
      declaration: false,
    },
    applicationId: null,
    referenceNumber: null,
    assessment: null,
  });

  let page;
  switch (screen) {
    case "profile":
      page = (
        <DemoProfileSelector
          onSelect={(profile) => {
            if (profile === "__APPROVER__") {
              setScreen("creditApprover");
              return;
            }

            setApplication({
              profile,
              singpass: null,
              authMethod: null,
              applicant: null,
              loanAmount: 50000,
              tenure: 24,
              interestRate: 6,
              monthlyInstallment: 0,
              loanPurpose: "Working Capital",
              declarations: { positiveEBITDA: "", positiveTNW: "", existingLoans: "", existingLoanDetails: "", industry: "" },
              uploads: { bankStatement: null, incomeStatement: null, ic: null, financials: null },
              consent: { creditBureau: false, acra: false, screening: false, declaration: false },
              applicationId: null,
              referenceNumber: null,
              assessment: null,
            });

            setScreen("loanLandingPage");;
          }}
        />
      );
      break;

    case "loanLandingPage":
      page = (
        <LoanLandingPage
          application={application}
          next={() => setScreen("singpass")}
          back={() => setScreen("profile")}
        />
      );
      break;
      
    case "singpass":
      page = (
        <SingpassLogin
          application={application}
          setApplication={setApplication}
          next={() => setScreen("myInfoReview")}
          needsKeymanApproval={() => setScreen("keymanApproval")}
          useUenInstead={() => setScreen("uenLookup")}
          back={() => setScreen("profile")}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "uenLookup":
      page = (
        <UenLookup
          application={application}
          setApplication={setApplication}
          next={() => setScreen("keymanApproval")}
          back={() => setScreen("singpass")}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "keymanApproval":
      page = (
        <KeymanApproval
          application={application}
          next={() => setScreen("myInfoReview")}
          back={() => setScreen("singpass")}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "myInfoReview":
      page = (
        <MyInfoReview
          application={application}
          setApplication={setApplication}
          next={() => setScreen("application")}
          back={() => setScreen("singpass")}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "application":
      page = (
        <LoanApplication
          application={application}
          setApplication={setApplication}
          next={() => setScreen("initialAssessment")}
          back={() => setScreen("myInfoReview")}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "initialAssessment":
      page = (
        <InitialAssessment
          application={application}
          setApplication={setApplication}
          uploadSupportingDocs={() => setScreen("supportingDocs")}
          backToHome={() => setScreen("profile")}
        />
      );
      break;

    case "supportingDocs":
      page = (
        <SupportingDocuments
          application={application}
          setApplication={setApplication}
          backToHome={() => setScreen("profile")}
        />
      );
      break;

    case "creditApprover":
      page = (
        <CreditApproverDashboard
          backToClient={() => setScreen("profile")}
          openApplication={(app) => {
            setSelectedApproverApplication(app);
            setScreen("creditDecision");
          }}
          decidedApplications={decidedApplications}
          onViewHistory={() => setScreen("creditHistory")}
        />
      );
      break;

    case "creditHistory":
      page = (
        <CreditApproverHistory
          decidedApplications={decidedApplications}
          openApplication={(app) => {
            setSelectedApproverApplication(app);
            setScreen("creditDecision");
          }}
          goBack={() => setScreen("creditApprover")}
        />
      );
      break;

    case "creditDecision":
      page = (
        <CreditDecisionWorkbench
          applicationSummary={selectedApproverApplication}
          back={() => setScreen("creditApprover")}
          onDecision={(app, decision) =>
            setDecidedApplications((prev) => [...prev, { ...app, approverDecision: decision }])
          }
          onViewTampering={(app) => {
            setTamperingApplication(app);
            setScreen("tamperingDetails");
          }}
          onViewLitigation={(app) => {
            setLitigationApplication(app);
            setScreen("litigationDetails");
          }}
          onViewRiskFlag={(flag, app) => {
            setRiskFlagState({ flag, application: app });
            setScreen("riskFlagDetails");
          }}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "tamperingDetails":
      page = (
        <TamperingDetailsPage
          bankOcr={tamperingApplication?.underwriting?.bank_ocr}
          companyName={tamperingApplication?.company_name}
          referenceNumber={tamperingApplication?.reference_number}
          back={() => {
            setTamperingApplication(null);
            setScreen("creditDecision");
          }}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "litigationDetails":
      page = (
        <LitigationDetailsPage
          litigation={litigationApplication?.underwriting?.litigation}
          companyName={litigationApplication?.company_name}
          referenceNumber={litigationApplication?.reference_number}
          back={() => {
            setLitigationApplication(null);
            setScreen("creditDecision");
          }}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    case "riskFlagDetails":
      page = (
        <RiskFlagDetailsPage
          flag={riskFlagState?.flag}
          application={riskFlagState?.application}
          back={() => {
            setRiskFlagState(null);
            setScreen("creditDecision");
          }}
          goHome={() => setScreen("profile")}
        />
      );
      break;

    default:
      page = null;
  }

  return (
    <>
      {page}
      {screen !== "loanLandingPage" && (
        <Box
          component="img"
          src="/uob-logo.png"
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            height: 40,
            opacity: 0.7,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}