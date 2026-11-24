import type { UiLanguage } from "./types";

export type Labels = Record<UiLanguage, string>;

export interface NamedItem {
  id: string;
  labels: Labels;
  aliases: string[];
}

function labels(partial: Labels): Labels {
  return partial;
}

function item(id: string, labelsMap: Labels, extra: string[] = []): NamedItem {
  const aliases = new Set(
    [...Object.values(labelsMap), ...extra].map((value) => value.toLowerCase()),
  );
  return { id, labels: labelsMap, aliases: [...aliases] };
}

export const STATES: NamedItem[] = [
  item("RJ", labels({ en: "Rajasthan", hi: "राजस्थान", mr: "राजस्थान", gu: "રાજસ્થાન", pa: "ਰਾਜਸਥਾਨ", bn: "রাজস্থান", ta: "ராஜஸ்தான்", te: "రాజస్థాన్", kn: "ರಾಜಸ್ಥಾನ", ml: "രാജസ്ഥാൻ" })),
  item("MH", labels({ en: "Maharashtra", hi: "महाराष्ट्र", mr: "महाराष्ट्र", gu: "મહારાષ્ટ્ર", pa: "ਮਹਾਰਾਸ਼ਟਰ", bn: "মহারাষ্ট্র", ta: "மகாராஷ்டிரா", te: "మహారాష్ట్ర", kn: "ಮಹಾರಾಷ್ಟ್ರ", ml: "മഹാരാഷ്ട്ര" })),
  item("GJ", labels({ en: "Gujarat", hi: "गुजरात", mr: "गुजरात", gu: "ગુજરાત", pa: "ਗੁਜਰਾਤ", bn: "গুজরাত", ta: "குஜராத்", te: "గుజరాత్", kn: "ಗುಜರಾತ್", ml: "ഗുജറാത്ത്" })),
  item("PB", labels({ en: "Punjab", hi: "पंजाब", mr: "पंजाब", gu: "પંજાબ", pa: "ਪੰਜਾਬ", bn: "পাঞ্জাব", ta: "பஞ்சாப்", te: "పంజాబ్", kn: "ಪಂಜಾಬ್", ml: "പഞ്ചാബ്" })),
  item("UP", labels({ en: "Uttar Pradesh", hi: "उत्तर प्रदेश", mr: "उत्तर प्रदेश", gu: "ઉત્તર પ્રદેશ", pa: "ਉੱਤਰ ਪ੍ਰਦੇਸ਼", bn: "উত্তরপ্রদেশ", ta: "உத்தரப் பிரதேசம்", te: "ఉత్తర ప్రదేశ్", kn: "ಉತ್ತರ ಪ್ರದೇಶ", ml: "ഉത്തർ പ്രദേശ്" }), ["up", "युपी"]),
  item("MP", labels({ en: "Madhya Pradesh", hi: "मध्य प्रदेश", mr: "मध्य प्रदेश", gu: "મધ્ય પ્રદેશ", pa: "ਮੱਧ ਪ੍ਰਦੇਸ਼", bn: "মধ্যপ্রদেশ", ta: "மத்தியப் பிரதேசம்", te: "మధ్య ప్రదేశ్", kn: "ಮಧ್ಯ ಪ್ರದೇಶ", ml: "മധ്യപ്രദേശ്" }), ["mp"]),
  item("BR", labels({ en: "Bihar", hi: "बिहार", mr: "बिहार", gu: "બિહાર", pa: "ਬਿਹਾਰ", bn: "বিহার", ta: "பீகார்", te: "బీహార్", kn: "ಬಿಹಾರ", ml: "ബീഹാർ" })),
  item("WB", labels({ en: "West Bengal", hi: "पश्चिम बंगाल", mr: "पश्चिम बंगाल", gu: "પશ્ચિમ બંગાળ", pa: "ਪੱਛਮੀ ਬੰਗਾਲ", bn: "পশ্চিমবঙ্গ", ta: "மேற்கு வங்கம்", te: "పశ్చిమ బెంగాల్", kn: "ಪಶ್ಚಿಮ ಬಂಗಾಳ", ml: "പശ്ചിമ ബംഗാൾ" }), ["bengal", "बंगाल"]),
  item("TN", labels({ en: "Tamil Nadu", hi: "तमिलनाडु", mr: "तमिळनाडू", gu: "તમિલનાડુ", pa: "ਤਮਿਲਨਾਡੂ", bn: "তামিলনাড়ু", ta: "தமிழ்நாடு", te: "తమిళనాడు", kn: "ತಮಿಳುನಾಡು", ml: "തമിഴ്നാട്" })),
  item("KA", labels({ en: "Karnataka", hi: "कर्नाटक", mr: "कर्नाटक", gu: "કર્ણાટક", pa: "ਕਰਨਾਟਕ", bn: "কর্নাটক", ta: "கர்நாடகா", te: "కర్ణాటక", kn: "ಕರ್ನಾಟಕ", ml: "കർണാടക" })),
  item("KL", labels({ en: "Kerala", hi: "केरल", mr: "केरळ", gu: "કેરળ", pa: "ਕੇਰਲ", bn: "কেরল", ta: "கேரளா", te: "కేరళ", kn: "ಕೇರಳ", ml: "കേരളം" })),
  item("AP", labels({ en: "Andhra Pradesh", hi: "आंध्र प्रदेश", mr: "आंध्र प्रदेश", gu: "આંધ્ર પ્રદેશ", pa: "ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼", bn: "অন্ধ্রপ্রদেশ", ta: "ஆந்திரப் பிரதேசம்", te: "ఆంధ్ర ప్రదేశ్", kn: "ಆಂಧ್ರ ಪ್ರದೇಶ", ml: "ആന്ധ്രാപ്രദേശ്" })),
  item("TS", labels({ en: "Telangana", hi: "तेलंगाना", mr: "तेलंगणा", gu: "તેલંગાણા", pa: "ਤੇਲੰਗਾਨਾ", bn: "তেলেঙ্গানা", ta: "தெலங்கானா", te: "తెలంగాణ", kn: "ತೆಲಂಗಾಣ", ml: "തെലങ്കാന" })),
  item("HR", labels({ en: "Haryana", hi: "हरियाणा", mr: "हरियाणा", gu: "હરિયાણા", pa: "ਹਰਿਆਣਾ", bn: "হরিয়ানা", ta: "ஹரியானா", te: "హర్యానా", kn: "ಹರಿಯಾಣ", ml: "ഹരിയാന" })),
  item("OD", labels({ en: "Odisha", hi: "ओडिशा", mr: "ओडिशा", gu: "ઓડિશા", pa: "ਓਡੀਸ਼ਾ", bn: "ওড়িশা", ta: "ஒடிசா", te: "ఒడిశా", kn: "ಒಡಿಶಾ", ml: "ഒഡീഷ" }), ["orissa", "उड़ीसा"]),
  item("AS", labels({ en: "Assam", hi: "असम", mr: "आसाम", gu: "આસામ", pa: "ਅਸਾਮ", bn: "আসাম", ta: "அசாம்", te: "అసోం", kn: "ಅಸ್ಸಾಂ", ml: "അസം" })),
];

export const DISTRICTS: (NamedItem & { stateId: string })[] = [
  { ...item("ajmer", labels({ en: "Ajmer", hi: "अजमेर", mr: "अजमेर", gu: "અજમેર", pa: "ਅਜਮੇਰ", bn: "আজমীর", ta: "அஜ்மீர்", te: "అజ్మీర్", kn: "ಅಜ್ಮೀರ್", ml: "അജ്മീർ" }), ["अजमेर जिला"]), stateId: "RJ" },
  { ...item("jaipur", labels({ en: "Jaipur", hi: "जयपुर", mr: "जयपूर", gu: "જયપુર", pa: "ਜੈਪੁਰ", bn: "জয়পুর", ta: "ஜெய்ப்பூர்", te: "జైపూర్", kn: "ಜೈಪುರ", ml: "ജയ്പൂർ" })), stateId: "RJ" },
  { ...item("jodhpur", labels({ en: "Jodhpur", hi: "जोधपुर", mr: "जोधपूर", gu: "જોધપુર", pa: "ਜੋਧਪੁਰ", bn: "জোধপুর", ta: "ஜோத்பூர்", te: "జోధ్‌పూర్", kn: "ಜೋಧ್‌ಪುರ", ml: "ജോധ്പൂർ" })), stateId: "RJ" },
  { ...item("udaipur", labels({ en: "Udaipur", hi: "उदयपुर", mr: "उदयपूर", gu: "ઉદયપુર", pa: "ਉਦੈਪੁਰ", bn: "উদয়পুর", ta: "உதய்பூர்", te: "ఉదయపూర్", kn: "ಉದಯಪುರ", ml: "ഉദയ്പൂർ" })), stateId: "RJ" },
  { ...item("kota", labels({ en: "Kota", hi: "कोटा", mr: "कोटा", gu: "કોટા", pa: "ਕੋਟਾ", bn: "কোটা", ta: "கோட்டா", te: "కోటా", kn: "ಕೋಟಾ", ml: "കോട്ട" })), stateId: "RJ" },
  { ...item("bikaner", labels({ en: "Bikaner", hi: "बीकानेर", mr: "बीकानेर", gu: "બીકાનેર", pa: "ਬੀਕਾਨੇਰ", bn: "বিকানের", ta: "பிகானேர்", te: "బికనీర్", kn: "ಬಿಕಾನೇರ್", ml: "ബിക്കാനീർ" })), stateId: "RJ" },
  { ...item("alwar", labels({ en: "Alwar", hi: "अलवर", mr: "अलवर", gu: "અલવર", pa: "ਅਲਵਰ", bn: "আলওয়ার", ta: "அல்வார்", te: "అల్వార్", kn: "ಅಲ್ವಾರ್", ml: "അൽവാർ" })), stateId: "RJ" },
  { ...item("sikar", labels({ en: "Sikar", hi: "सीकर", mr: "सीकर", gu: "સીકર", pa: "ਸੀਕਰ", bn: "সিকার", ta: "சீக்கர்", te: "సికర్", kn: "ಸಿಕರ್", ml: "സിക്കർ" })), stateId: "RJ" },
  { ...item("pali", labels({ en: "Pali", hi: "पाली", mr: "पाली", gu: "પાલી", pa: "ਪਾਲੀ", bn: "পালি", ta: "பாலி", te: "పాలి", kn: "ಪಾಲಿ", ml: "പാലി" })), stateId: "RJ" },
  { ...item("nagaur", labels({ en: "Nagaur", hi: "नागौर", mr: "नागौर", gu: "નાગૌર", pa: "ਨਾਗੌਰ", bn: "নাগৌর", ta: "நாகவுர்", te: "నాగౌర్", kn: "ನಾಗೌರ್", ml: "നാഗൗർ" })), stateId: "RJ" },
  { ...item("bhilwara", labels({ en: "Bhilwara", hi: "भीलवाड़ा", mr: "भीलवाडा", gu: "ભીલવાડા", pa: "ਭੀਲਵਾੜਾ", bn: "ভিলওয়াড়া", ta: "பில்வாரா", te: "భిల్వారా", kn: "ಭಿಲ್ವಾರಾ", ml: "ഭിൽവാര" }), ["भीलवाडा"]), stateId: "RJ" },
  { ...item("tonk", labels({ en: "Tonk", hi: "टोंक", mr: "टोंक", gu: "ટોંક", pa: "ਟੋਂਕ", bn: "টঙ্ক", ta: "டோங்க்", te: "టోంక్", kn: "ಟೋಂಕ್", ml: "ടോങ്ക്" })), stateId: "RJ" },
];

export const CROPS: NamedItem[] = [
  item("wheat", labels({ en: "Wheat", hi: "गेहूँ", mr: "गहू", gu: "ઘઉં", pa: "ਕਣਕ", bn: "গম", ta: "கோதுமை", te: "గోధుమ", kn: "ಗೋಧಿ", ml: "ഗോതമ്പ്" }), ["गेहूं", "गेहू", "गहूं", "wheat"]),
  item("mustard", labels({ en: "Mustard", hi: "सरसों", mr: "मोहरी", gu: "સરસવ", pa: "ਸਰ੍ਹੋਂ", bn: "সরিষা", ta: "கடுகு", te: "ఆవాలు", kn: "ಸಾಸಿವೆ", ml: "കടുക്" }), ["sarson", "mustard"]),
  item("bajra", labels({ en: "Bajra", hi: "बाजरा", mr: "बाजरी", gu: "બાજરી", pa: "ਬਾਜਰਾ", bn: "বাজরা", ta: "கம்பு", te: "సజ్జ", kn: "ಸಜ್ಜೆ", ml: "ബജ്റ" }), ["pearl millet"]),
  item("rice", labels({ en: "Rice", hi: "धान", mr: "भात", gu: "ડાંગર", pa: "ਝੋਨਾ", bn: "ধান", ta: "நெல்", te: "వరి", kn: "ಭತ್ತ", ml: "നെല്ല്" }), ["चावल", "paddy", "rice"]),
  item("cotton", labels({ en: "Cotton", hi: "कपास", mr: "कापूस", gu: "કપાસ", pa: "ਕਪਾਹ", bn: "তুলা", ta: "பருத்தி", te: "పత్తి", kn: "ಹತ್ತಿ", ml: "പരുത്തി" })),
  item("maize", labels({ en: "Maize", hi: "मक्का", mr: "मका", gu: "મકાઈ", pa: "ਮੱਕੀ", bn: "ভুট্টা", ta: "மக்காச்சோளம்", te: "మొక్కజొన్న", kn: "ಮೆಕ್ಕೆಜೋಳ", ml: "ചോളം" }), ["corn"]),
  item("gram", labels({ en: "Gram", hi: "चना", mr: "हरभरा", gu: "ચણા", pa: "ਛੋਲੇ", bn: "ছোলা", ta: "கொண்டைக்கடலை", te: "శనగ", kn: "ಕಡಲೆ", ml: "കടല" }), ["chana"]),
  item("soybean", labels({ en: "Soybean", hi: "सोयाबीन", mr: "सोयाबीन", gu: "સોયાબીન", pa: "ਸੋਇਆਬੀਨ", bn: "সয়াবিন", ta: "சோயாபீன்", te: "సోయాబీన్", kn: "ಸೋಯಾಬೀನ್", ml: "സോയാബീൻ" })),
  item("groundnut", labels({ en: "Groundnut", hi: "मूंगफली", mr: "भुईमूग", gu: "મગફળી", pa: "ਮੂੰਗਫਲੀ", bn: "চিনাবাদাম", ta: "நிலக்கடலை", te: "వేరుశనగ", kn: "ಕಡಲೆಕಾಯಿ", ml: "നിലക്കടല" }), ["peanut", "मूंगफली"]),
  item("onion", labels({ en: "Onion", hi: "प्याज", mr: "कांदा", gu: "ડુંગળી", pa: "ਪਿਆਜ਼", bn: "পেঁয়াজ", ta: "வெங்காயம்", te: "ఉల్లి", kn: "ಈರುಳ್ಳಿ", ml: "ഉള്ളി" })),
  item("potato", labels({ en: "Potato", hi: "आलू", mr: "बटाटा", gu: "બટાકા", pa: "ਆਲੂ", bn: "আলু", ta: "உருளைக்கிழங்கு", te: "బంగాళాదుంప", kn: "ಆಲೂಗಡ್ಡೆ", ml: "ഉരുളക്കിഴങ്ങ്" })),
  item("sugarcane", labels({ en: "Sugarcane", hi: "गन्ना", mr: "ऊस", gu: "શેરડી", pa: "ਗੰਨਾ", bn: "আখ", ta: "கரும்பு", te: "చెరకు", kn: "ಕಬ್ಬು", ml: "കരിമ്പ്" })),
];

export function labelOf(itemToRead: NamedItem | undefined, lang: UiLanguage, fallback = ""): string {
  if (!itemToRead) return fallback;
  return itemToRead.labels[lang] || itemToRead.labels.en;
}

export function findByAlias<T extends NamedItem>(list: T[], text: string): T | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;
  const exact = list.find((entry) => entry.aliases.some((alias) => alias === value));
  if (exact) return exact;
  return list.find((entry) =>
    entry.aliases.some((alias) => alias.length > 2 && value.includes(alias)),
  );
}
