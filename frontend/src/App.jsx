import { useState } from "react";

import DemoProfileSelector from "./pages/DemoProfileSelector";
import SingpassLogin from "./pages/SingpassLogin";
import LoanApplication from "./pages/LoanApplication";
import InitialAssessment from "./pages/InitialAssessment";
import CreditApproverDashboard from "./pages/CreditApproverDashboard";
import CreditDecisionWorkbench from "./pages/CreditDecisionWorkbench";
import LoanLandingPage from "./pages/LoanLandingPage";

export default function App() {
  const [screen, setScreen] = useState("profile");
  const [selectedApproverApplication, setSelectedApproverApplication] = useState(null);
  const [application, setApplication] = useState({
    profile: null,
    singpass: null,
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
          next={() => setScreen("application")}
          back={() => setScreen("profile")}
        />
      );

    case "application":
      return (
        <LoanApplication
          application={application}
          setApplication={setApplication}
          next={() => setScreen("initialAssessment")}
          back={() => setScreen("singpass")}
        />
      );

    case "initialAssessment":
      return (
        <InitialAssessment
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
        />
      );

    case "creditDecision":
      return (
        <CreditDecisionWorkbench
          applicationSummary={selectedApproverApplication}
          back={() => setScreen("creditApprover")}
        />
      );

    default:
      return null;
  }
}