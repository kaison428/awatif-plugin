// The Assign panel's form values, kept while panels fold and unfold.
import { useState } from "../ui.js";

const LOAD_FORM = { type: "point-load", loadCase: "", Fx: "0", Fy: "0", Fz: "-10", Mx: "0", My: "0", Mz: "0", w: "-10", direction: "global-z" };

export function useAssignForms() {
  const [loadForm, setLoadForm] = useState(LOAD_FORM);
  const [supportType, setSupportType] = useState("fixed");
  const [releaseType, setReleaseType] = useState("both-ends");
  const [section, setSection] = useState("");
  const [other, setOther] = useState({ field: "mesh", templateId: "", params: {} });
  return { loadForm, setLoadForm, supportType, setSupportType, releaseType, setReleaseType, section, setSection, other, setOther };
}
