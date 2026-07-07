import { useState } from "react";

import DemoProfileSelector from "./pages/DemoProfileSelector";
import SingpassLogin from "./pages/SingpassLogin";
import UenLookup from "./pages/UenLookup";
import KeymanApproval from "./pages/KeymanApproval";
import MyInfoReview from "./pages/MyInfoReview";
import LoanApplication from "./pages/LoanApplication";
import SupportingDocuments from "./pages/SupportingDocuments";
import InitialAssessment from "./pages/InitialAssessment";
import CreditApproverDashboard from "./pages/CreditApproverDashboard";
import CreditDecisionWorkbench from "./pages/CreditDecisionWorkbench";
import LoanLandingPage from "./pages/LoanLandingPage";

export default function App() {
  const [screen, setScreen] = useState("profile");
  const [selectedApproverApplication, setSelectedApproverApplication] = useState(null);
  const [decidedApplications, setDecidedApplications] = useState([]);
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

  switch (screen) {
    case "profile":
      return (
        <DemoProfileSelector
          onSelect={(profile) => {
            if (profile === "__APPROVER__") {
              setScreen("creditApprover");
              return;
            }

            setApplication((prev) => ({
              ...prev,
              profile,
            }));

            setScreen("loanLandingPage");;
          }}
        />
      );

    case "loanLandingPage":
      return (
        <LoanLandingPage
          application={application}
          next={() => setScreen("singpass")}
          back={() => setScreen("profile")}
        />
      );
      
    case "singpass":
      return (
        <SingpassLogin
          application={application}
          setApplication={setApplication}
          next={() => setScreen("myInfoReview")}
          needsKeymanApproval={() => setScreen("keymanApproval")}
          useUenInstead={() => setScreen("uenLookup")}
          back={() => setScreen("profile")}
        />
      );

    case "uenLookup":
      return (
        <UenLookup
          application={application}
          setApplication={setApplication}
          next={() => setScreen("keymanApproval")}
          back={() => setScreen("singpass")}
        />
      );

    case "keymanApproval":
      return (
        <KeymanApproval
          application={application}
          next={() => setScreen("myInfoReview")}
          back={() => setScreen("singpass")}
        />
      );

    case "myInfoReview":
      return (
        <MyInfoReview
          application={application}
          setApplication={setApplication}
          next={() => setScreen("application")}
          back={() => setScreen("singpass")}
        />
      );

    case "application":
      return (
        <LoanApplication
          application={application}
          setApplication={setApplication}
          next={() => setScreen("initialAssessment")}
          back={() => setScreen("myInfoReview")}
        />
      );

    case "initialAssessment":
      return (
        <InitialAssessment
          application={application}
          setApplication={setApplication}
          uploadSupportingDocs={() => setScreen("supportingDocs")}
          backToHome={() => setScreen("profile")}
        />
      );

    case "supportingDocs":
      return (
        <SupportingDocuments
          application={application}
          setApplication={setApplication}
          backToHome={() => setScreen("profile")}
        />
      );

    case "creditApprover":
      return (
        <CreditApproverDashboard
          backToClient={() => setScreen("profile")}
          openApplication={(app) => {
            setSelectedApproverApplication(app);
            setScreen("creditDecision");
          }}
          decidedApplications={decidedApplications}
        />
      );

    case "creditDecision":
      return (
        <CreditDecisionWorkbench
          applicationSummary={selectedApproverApplication}
          back={() => setScreen("creditApprover")}
          onDecision={(app, decision) =>
            setDecidedApplications((prev) => [...prev, { ...app, approverDecision: decision }])
          }
        />
      );

    default:
      return null;
  }
}