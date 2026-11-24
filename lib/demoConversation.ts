import { CROPS, DISTRICTS, STATES, findByAlias } from "./catalog";
import { copyFor } from "./copy";
import { buildLoans } from "./eligibility";
import { fill, resolveLang } from "./languages";
import { displayState, isReadyForResults } from "./profile";
import type {
  ConversationStep,
  FarmerProfile,
  FarmerType,
  Irrigation,
  LandUnit,
  LoanPurpose,
  OwnershipHint,
  TurnInput,
  TurnResult,
  UiLanguage,
} from "./types";

const STEP_ORDER: ConversationStep[] = [
  "name",
  "state",
  "district",
  "village",
  "landOwnership",
  "selfCultivate",
  "land",
  "crop",
  "irrigation",
  "existingLoan",
  "purpose",
  "amount",
  "done",
];

const GREETING =
  /^(नमस्ते|नमस्कार|hello|hi|hey|start|शुरू|शुरु|हाय|வணக்கம்|నమస్కారం|ನಮಸ್ಕಾರ|നമസ്കാരം|નમસ્તે|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|নমস্কার)[.! ]*$/i;

const UNKNOWN =
  /पता नहीं|याद नहीं|नहीं पता|मालूम नहीं|don't know|dont know|not sure|no idea|skip|याद नाही|माहित नाही|आठवत नाही|ખબર નથી|યાદ નથી|ਪਤਾ ਨਹੀਂ|ਯਾਦ ਨਹੀਂ|জানি না|মনে নেই|தெரியவில்லை|நினைவில் இல்லை|తెలియదు|గుర్తు లేదు|ಗೊತ್ತಿಲ್ಲ|ನೆನಪಿಲ್ಲ|അറിയില്ല|ഓർമ്മയില്ല/i;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  एकर: 1,
};

export function advance(input: TurnInput): TurnResult {
  const text = normalize(input.utterance);
  const copy = copyFor(input.language);
  const lang = resolveLang(input.language);

  if (!text || GREETING.test(text)) {
    const step = input.step === "done" ? "amount" : input.step;
    const stateName = displayState(input.profile, input.language) ?? "";
    return {
      ...base(input),
      reply: fill(copy.questions[step], { state: stateName, name: input.profile.name ?? "" }),
      loans: null,
    };
  }

  if (input.step === "done") {
    return handleDone(input, text, lang);
  }

  const next = handlers[input.step](input, text, lang);
  return next;
}

const handlers: Record<
  Exclude<ConversationStep, "done">,
  (input: TurnInput, text: string, lang: UiLanguage) => TurnResult
> = {
  name: (input, text) => {
    const name = parseName(text);
    if (!name) return clarifyOrAsk(input, "name");
    return move(input, { ...input.profile, name }, "state",  null, fill(copyFor(input.language).ackName, { name }));
  },
  state: (input, text, lang) => {
    const state = findByAlias(STATES, text);
    if (!state) {
      if (input.clarifyCount < 1) return clarifyOrAsk(input, "state");
      return move(input, { ...input.profile, stateId: null, stateText: cleanPlace(text) }, "district");
    }
    return move(input, { ...input.profile, stateId: state.id, stateText: null }, "district", null, "", lang);
  },
  district: (input, text) => {
    const district = findByAlias(DISTRICTS, text);
    if (district && (!input.profile.stateId || district.stateId === input.profile.stateId)) {
      return move(input, { ...input.profile, districtId: district.id, districtText: null }, "village");
    }
    if (input.clarifyCount < 1 && !district) return clarifyOrAsk(input, "district");
    return move(input, { ...input.profile, districtId: district?.id ?? null, districtText: district ? null : cleanPlace(text) }, "village");
  },
  village: (input, text) => {
    if (UNKNOWN.test(text)) {
      return move(input, input.profile, "landOwnership", null, copyFor(input.language).skipVillage);
    }
    const village = cleanPlace(text.replace(/गांव|गाँव|village|ગામ|ਪਿੰਡ|গ্রাম|ஊர்|ఊరు|ಊರು|ഗ്രാമം/gi, ""));
    if (village.length < 2) return clarifyOrAsk(input, "village");
    return move(input, { ...input.profile, village }, "landOwnership");
  },
  landOwnership: (input, text) => {
    const own = detectOwnership(text);
    if (!own) return clarifyOrAsk(input, "landOwnership");
    const cultivates = detectYesNo(text);
    if (cultivates !== null && mentionsCultivation(text)) {
      const farmerType = resolveType(own, cultivates);
      return move(input, { ...input.profile, farmerType }, "land");
    }
    return {
      ...base(input),
      reply: copyFor(input.language).questions.selfCultivate,
      step: "selfCultivate",
      pendingOwnership: own,
      clarifyCount: 0,
      loans: null,
    };
  },
  selfCultivate: (input, text) => {
    const cultivates = detectYesNo(text);
    if (cultivates === null) return clarifyOrAsk(input, "selfCultivate");
    const own = input.pendingOwnership ?? detectOwnership(text) ?? "other";
    const farmerType = resolveType(own, cultivates);
    return move(input, { ...input.profile, farmerType }, "land");
  },
  land: (input, text) => {
    const land = parseLand(text);
    if (!land) return clarifyOrAsk(input, "land");
    return move(input, { ...input.profile, landValue: land.value, landUnit: land.unit }, "crop");
  },
  crop: (input, text) => {
    const crops = parseCrops(text);
    if (crops.ids.length === 0 && !crops.text) return clarifyOrAsk(input, "crop");
    return move(input, { ...input.profile, cropIds: crops.ids, cropText: crops.text }, "irrigation");
  },
  irrigation: (input, text) => {
    const irrigation = parseIrrigation(text);
    if (!irrigation) return clarifyOrAsk(input, "irrigation");
    return move(input, { ...input.profile, irrigation }, "existingLoan");
  },
  existingLoan: (input, text) => {
    const answer = parseExisting(text);
    if (!answer) return clarifyOrAsk(input, "existingLoan");
    return move(input, { ...input.profile, existingLoan: answer }, "purpose");
  },
  purpose: (input, text) => {
    const purpose = parsePurpose(text);
    if (!purpose) return clarifyOrAsk(input, "purpose");
    return move(input, { ...input.profile, purpose }, "amount");
  },
  amount: (input, text, lang) => {
    const amount = parseAmount(text);
    if (amount === null) return clarifyOrAsk(input, "amount");
    const profile = { ...input.profile, amountRupees: amount };
    return finish(input, profile, lang);
  },
};

function handleDone(input: TurnInput, text: string, lang: UiLanguage): TurnResult {
  let profile = { ...input.profile };
  let changed = false;
  const state = findByAlias(STATES, text);
  if (state) {
    profile = { ...profile, stateId: state.id, stateText: null };
    changed = true;
  }
  const district = findByAlias(DISTRICTS, text);
  if (district) {
    profile = { ...profile, districtId: district.id, districtText: null };
    changed = true;
  }
  const amount = parseAmount(text);
  if (amount !== null && /लाख|lakh|લાખ|ਲੱਖ|লাখ|லட்சம்|లక్ష|ಲಕ್ಷ|ലക്ഷം|₹|\d/.test(text)) {
    profile = { ...profile, amountRupees: amount };
    changed = true;
  }
  const crops = parseCrops(text);
  if (crops.ids.length > 0) {
    profile = { ...profile, cropIds: crops.ids, cropText: null };
    changed = true;
  }
  const copy = copyFor(input.language);
  const loans = isReadyForResults(profile) ? buildLoans(profile) : null;
  return {
    reply: changed ? `${copy.updated} ${copy.doneHelp}` : copy.doneHelp,
    step: "done",
    profile,
    pendingOwnership: null,
    clarifyCount: 0,
    loans,
  };
}

function finish(input: TurnInput, profile: FarmerProfile, _lang: UiLanguage): TurnResult {
  const copy = copyFor(input.language);
  const ready = isReadyForResults(profile);
  return {
    reply: ready ? copy.resultsIntro : copy.doneHelp,
    step: "done",
    profile,
    pendingOwnership: null,
    clarifyCount: 0,
    loans: ready ? buildLoans(profile) : null,
  };
}

function move(
  input: TurnInput,
  profile: FarmerProfile,
  step: ConversationStep,
  pending: OwnershipHint | null = null,
  prefix = "",
  lang: UiLanguage = resolveLang(input.language),
): TurnResult {
  const copy = copyFor(input.language);
  const stateName = displayState(profile, lang) ?? profile.stateText ?? "";
  const question =
    step === "done"
      ? copy.resultsIntro
      : fill(copy.questions[step], { state: stateName, name: profile.name ?? "" });
  const reply = [prefix, question].filter(Boolean).join(" ");
  const ready = step === "done" && isReadyForResults(profile);
  return {
    reply,
    step,
    profile,
    pendingOwnership: pending,
    clarifyCount: 0,
    loans: ready ? buildLoans(profile) : null,
  };
}

function clarifyOrAsk(input: TurnInput, step: ConversationStep): TurnResult {
  const copy = copyFor(input.language);
  const stateName = displayState(input.profile, input.language) ?? "";
  if (input.clarifyCount >= 1 && input.step === step && step !== "done") {
    const profile = acceptRaw(input.profile, step, input.utterance);
    const next = nextStep(step);
    if (next === "done") return finish(input, profile, resolveLang(input.language));
    return move({ ...input, profile, clarifyCount: 0 }, profile, next);
  }
  const key = step === "done" ? "amount" : step;
  const prompt =
    input.clarifyCount >= 0 && input.utterance.trim()
      ? copy.clarify[key]
      : fill(copy.questions[key], { state: stateName });
  return {
    ...base(input),
    reply: fill(prompt, { state: stateName }),
    step,
    clarifyCount: input.utterance.trim() ? input.clarifyCount + 1 : input.clarifyCount,
    loans: null,
  };
}

function acceptRaw(profile: FarmerProfile, step: ConversationStep, utterance: string): FarmerProfile {
  const text = cleanPlace(utterance);
  if (step === "name") return { ...profile, name: parseName(utterance) ?? text.slice(0, 40) };
  if (step === "state") return { ...profile, stateText: text };
  if (step === "district") return { ...profile, districtText: text };
  if (step === "village") return { ...profile, village: text };
  if (step === "land") return { ...profile, landValue: 0, landUnit: "acre", cropText: profile.cropText };
  if (step === "crop") return { ...profile, cropText: text };
  if (step === "irrigation") return { ...profile, irrigation: "mixed" };
  if (step === "existingLoan") return { ...profile, existingLoan: text };
  if (step === "purpose") return { ...profile, purpose: "other" };
  if (step === "amount") return profile;
  if (step === "landOwnership" || step === "selfCultivate") {
    return { ...profile, farmerType: profile.farmerType ?? "other" };
  }
  return profile;
}

function nextStep(step: ConversationStep): ConversationStep {
  const index = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)];
}

function base(input: TurnInput): TurnResult {
  return {
    reply: "",
    step: input.step,
    profile: input.profile,
    pendingOwnership: input.pendingOwnership,
    clarifyCount: input.clarifyCount,
    loans: null,
  };
}

function normalize(value: string): string {
  const digits = "०१२३४५६७८९";
  return value
    .trim()
    .replace(/[०-९]/g, (digit) => String(digits.indexOf(digit)))
    .replace(/\s+/g, " ");
}

function parseName(text: string): string | null {
  if (GREETING.test(text) || UNKNOWN.test(text)) return null;
  if (findByAlias(STATES, text) && text.split(" ").length < 3) return null;
  const named = text.match(
    /(?:मेरा नाम|मेरा नाम है|नाम है|my name is|i am|i'm|this is|મારું નામ|ਮੇਰਾ ਨਾਮ|আমার নাম|என் பெயர்|నా పేరు|ನನ್ನ ಹೆಸರು|എന്റെ പേര്)\s+(.+)/i,
  );
  let value = named?.[1] ?? text;
  value = value
    .replace(/^(मैं|main)\s+/i, "")
    .replace(/\s+(हूँ|हूं|है|hai|hoon|आहे|છે|ਹਾਂ|আছি)$/i, "")
    .replace(/[।.!?]+$/g, "")
    .trim();
  if (!value || value.length < 2 || value.length > 40) return null;
  if (/^(हाँ|हां|नहीं|yes|no|ok|ठीक)$/i.test(value)) return null;
  return value
    .split(" ")
    .slice(0, 4)
    .map((part) => (/[a-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}

function detectOwnership(text: string): OwnershipHint | null {
  const value = text.toLowerCase();
  if (/पिता|पिताजी|father|papa|dad|वडिल|પિતા|ਪਿਤਾ|বাবা|தந்தை|నాన్న|ತಂದೆ|അച്ഛൻ/.test(value)) return "father";
  if (/बटाई|बंटाई|sharecrop|भागीदार|ભાગીયા|ਬਟਾਈ|বর্গা|பங்கு|వాటా|ಪಾಲು|പങ്ക്/.test(value)) return "sharecropper";
  if (/मौखिक|oral|तोंडी|મૌખિક|ਜ਼ੁਬਾਨੀ|মৌখিক|வாய்மொழி|మౌఖిక|ಮೌಖಿಕ|വാക്കാ/.test(value)) return "oral";
  if (/किराय|किराए|tenant|भाडे|ભાડ|ਠੇਕ|ভাড়া|குத்தகை|కౌలు|ಗುತ್ತಿಗೆ|പാട്ട/.test(value)) return "tenant";
  if (/मेरे नाम|my name|खुद के नाम|own name|माझ्या नावा|મારા નામ|ਮੇਰੇ ਨਾਮ|আমার নামে|என் பெயர்|నా పేరు|ನನ್ನ ಹೆಸರ|എന്റെ പേര/.test(value)) return "self";
  if (/भाई|चाचा|परिवार|family|कुटुंब|પરિવાર|ਪਰਿਵਾਰ|পরিবার|குடும்ப|కుటుంబ|ಕುಟುಂಬ|കുടുംബ/.test(value)) return "family";
  if (/किसी और|someone else|और के नाम|दुसऱ्या|બીજા|ਕਿਸੇ ਹੋਰ|অন্য|வேறு|ఇంకొక|ಬೇರೆ|മറ്റ്/.test(value)) return "other";
  return null;
}

function mentionsCultivation(text: string): boolean {
  return /खेती|खेत|cultivate|farm|शेती|ખેતી|ਖੇਤੀ|চাষ|விவசாய|సాగు|ಬೇಸಾಯ|കൃഷി|करता|करती|करते/.test(text);
}

function detectYesNo(text: string): boolean | null {
  const value = text.toLowerCase();
  if (/(नहीं|नही|नाही|नથી|ਨਹੀਂ|না|இல்லை|కాదు|ಇಲ್ಲ|ഇല്ല|\bno\b|not)/.test(value)) return false;
  if (/(हाँ|हां|हा|हो|હા|ਹਾਂ|হ্যাঁ|ஆம்|అవును|ಹೌದು|ഉണ്ട്|\byes\b|yeah|खुद|स्वतः|જાતે|ਆਪ|নিজে|நீங்களே|మీరే|ನೀವೇ|നിങ്ങൾ തന്നെ|myself)/.test(value)) return true;
  return null;
}

function resolveType(own: OwnershipHint, cultivates: boolean): FarmerType {
  if (own === "tenant") return cultivates ? "tenant" : "other";
  if (own === "sharecropper") return "sharecropper";
  if (own === "oral") return "oral_lessee";
  if ((own === "father" || own === "family") && cultivates) return "cultivator";
  if (own === "self" && cultivates) return "owner";
  return "other";
}

function parseLand(text: string): { value: number; unit: LandUnit } | null {
  const unit = /बीघा|बिघा|bigha|विघा|વીઘા|ਬੀਘਾ|বিঘা|பிகா|బీఘా|ಬೀಘಾ|ബീഘ/.test(text)
    ? "bigha"
    : /हेक्टेयर|hectare|હેક્ટર|ਹੈਕਟੇਅਰ|হেক্টর|ஹெக்டேர்|హెక్టారు|ಹೆಕ್ಟೇರ್|ഹെക്ടർ/.test(text)
      ? "hectare"
      : /एकड़|एकड|एकर|acre|acres|એકર|ਏਕੜ|একর|ஏக்கர்|ఎకర|ಎಕರೆ|ഏക്കർ/.test(text)
        ? "acre"
        : null;
  const digit = text.match(/(\d+(?:\.\d+)?)/);
  if (digit && unit) return { value: Number(digit[1]), unit };
  const word = Object.keys(NUMBER_WORDS)
    .sort((left, right) => right.length - left.length)
    .find((key) => new RegExp(`(^|\\s)${key}(?=\\s|$)`, "i").test(text));
  if (word && unit) return { value: NUMBER_WORDS[word], unit };
  return null;
}

function parseCrops(text: string): { ids: string[]; text: string | null } {
  const parts = text.split(/,| और | and | एवं | અને | ਅਤੇ | ও | மற்றும் | మరియు | ಮತ್ತು | ഒപ്പം |&/i);
  const ids: string[] = [];
  for (const part of parts) {
    const found = findByAlias(CROPS, part) ?? findByAlias(CROPS, text);
    if (found && !ids.includes(found.id)) ids.push(found.id);
  }
  if (ids.length > 0) return { ids, text: null };
  const cleaned = cleanPlace(text);
  if (cleaned.length < 2) return { ids: [], text: null };
  return { ids: [], text: cleaned };
}

function parseIrrigation(text: string): Irrigation | null {
  if (/ट्यूबवेल|tube ?well|बोर|bore|નળ|ટ્યુબ|ਟਿਊਬ|নলকূপ|টিউব|ஆழ்துளை|బోరు|ಕೊಳವೆ|ട്യൂബ്/.test(text)) return "tubewell";
  if (/नहर|canal|कालवा|નહેર|ਨਹਿਰ|খাল|கால்வாய்|కాలువ|ಕಾಲುವೆ|കനാൽ/.test(text)) return "canal";
  if (/बारिश|वर्षा|rain|पाऊस|વરસાદ|ਮੀਂਹ|বৃষ্টি|மழை|వర్షం|ಮಳೆ|മഴ/.test(text)) return "rain";
  if (/कुआँ|कुआं|कुआ|well|विहीर|કૂવો|ਖੂਹ|কুয়ো|கிணறு|బావి|ಬಾವಿ|കിണർ/.test(text)) return "well";
  if (/नहीं|none|इल്ല|లేదు|ಇಲ್ಲ|ഇല്ല/.test(text)) return "none";
  if (/दोनों|both|mixed|मिश्र/.test(text)) return "mixed";
  return null;
}

function parseExisting(text: string): string | null {
  const yesNo = detectYesNo(text);
  if (yesNo === false) return "none";
  if (yesNo === true) {
    const detail = text.replace(/^(हाँ|हां|yes|हो)[, ]*/i, "").trim();
    if (detail.length > 8) return detail.slice(0, 80);
    return "yes";
  }
  return null;
}

function parsePurpose(text: string): LoanPurpose | null {
  if (/ट्रैक्टर|tractor|उपकरण|मशीन|यंत्र|equipment|machine|pump|पंप|ઓજાર|ਔਜ਼ਾਰ|যন্ত্র|கருவி|పనిముట్లు|ಉಪಕರಣ|ഉപകരണം/.test(text)) return "equipment";
  if (/जमीन खरीद|land|कुआं खोद|समतल|improvement|सुधार/.test(text)) return "land_improvement";
  if (/बीज|खाद|fertili|seed|फसल|crop|input|दवाई|कीट|બિયારણ|ਬੀਜ|বীজ|விதை|విత్తన|ಬೀಜ|വിത്ത്|खर्च|खेती/.test(text)) return "crop_input";
  if (/शादी|घर|personal|अन्य|other/.test(text)) return "other";
  return null;
}

function parseAmount(text: string): number | null {
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|लाख|લાખ|ਲੱਖ|লাখ|லட்சம்|లక్ష|ಲಕ್ಷ|ലക്ഷം)/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  if (/डेढ़|dedh/.test(text)) return 150000;
  const digits = text.replace(/,/g, "").match(/(\d{4,8})/);
  if (digits) return Number(digits[1]);
  const small = text.match(/(\d+(?:\.\d+)?)/);
  if (!small) return null;
  const value = Number(small[1]);
  if (value >= 1000) return Math.round(value);
  if (value > 0 && value <= 50) return Math.round(value * 100000);
  return null;
}

function cleanPlace(value: string): string {
  return value.replace(/[।.!?]+/g, "").trim().slice(0, 40);
}
