// Curated quick-pick lists of medications, all using verified RxNorm codes matching what's
// already present in the seeded patient data for each specialty. Doctors can also type a
// free-text medication name for anything not in the list (creates a text-only
// medicationCodeableConcept — still a valid FHIR MedicationRequest, just uncoded).

import type { SpecialtyKey } from "./specialty";

export interface CatalogMedication {
  rxcui: string;
  display: string;
  defaultDosage: string;
}

export const PULMO_MEDICATION_CATALOG: CatalogMedication[] = [
  { rxcui: "2123111", display: "Albuterol HFA 90mcg inhaler (rescue)", defaultDosage: "Inhale 2 puffs every 4-6 hours as needed" },
  { rxcui: "966529", display: "Budesonide (Pulmicort) inhaled", defaultDosage: "Inhale as directed twice daily" },
  { rxcui: "896184", display: "Fluticasone/Salmeterol (Advair) 250/50 Diskus", defaultDosage: "Inhale 1 puff by mouth twice daily" },
  { rxcui: "1246306", display: "Budesonide/Formoterol (Symbicort) 160/4.5", defaultDosage: "Inhale 2 puffs by mouth twice daily" },
  { rxcui: "1246315", display: "Budesonide/Formoterol (Symbicort) 80/4.5", defaultDosage: "Inhale 2 puffs by mouth twice daily" },
  { rxcui: "749762", display: "Montelukast 10mg tablet", defaultDosage: "Take 1 tablet by mouth nightly" },
  { rxcui: "198145", display: "Prednisone 10mg tablet (burst)", defaultDosage: "Take 5 tablets (50mg) by mouth once daily for 5 days" },
  { rxcui: "580261", display: "Tiotropium (Spiriva) HandiHaler", defaultDosage: "Inhale 1 capsule once daily" },
  { rxcui: "1651266", display: "Olodaterol/Tiotropium (Stiolto) Respimat", defaultDosage: "Inhale 2 puffs once daily" },
  { rxcui: "308460", display: "Azithromycin 250mg tablet", defaultDosage: "Take as directed for acute exacerbation" },
  { rxcui: "1657212", display: "Omalizumab (Xolair) injection", defaultDosage: "225 mg subcutaneously every 2 weeks" },
];

export const DENTAL_MEDICATION_CATALOG: CatalogMedication[] = [
  { rxcui: "308191", display: "Amoxicillin 500mg tablet", defaultDosage: "Take 1 tablet (500mg) by mouth three times daily for 7 days" },
  { rxcui: "197806", display: "Ibuprofen 600mg tablet", defaultDosage: "Take 1 tablet (600mg) by mouth every 6 hours as needed for pain" },
  { rxcui: "308460", display: "Azithromycin 250mg tablet (penicillin-allergic)", defaultDosage: "Take 2 tablets (500mg) day 1, then 1 tablet (250mg) daily days 2-5" },
  { rxcui: "1049221", display: "Clindamycin 300mg tablet (penicillin-allergic)", defaultDosage: "Take 1 tablet (300mg) by mouth every 6 hours for 7 days" },
  { rxcui: "834061", display: "Chlorhexidine gluconate 0.12% oral rinse", defaultDosage: "Rinse with 15mL for 30 seconds twice daily for 2 weeks" },
  { rxcui: "312615", display: "Articaine 4% with epinephrine 1:100,000 (local anesthetic)", defaultDosage: "Administered by injection at time of procedure" },
  { rxcui: "749762", display: "Acetaminophen 500mg tablet", defaultDosage: "Take 2 tablets (1000mg) by mouth every 6 hours as needed for pain" },
];

export function medicationCatalogFor(specialtyKey: SpecialtyKey): CatalogMedication[] {
  return specialtyKey === "denta" ? DENTAL_MEDICATION_CATALOG : PULMO_MEDICATION_CATALOG;
}
