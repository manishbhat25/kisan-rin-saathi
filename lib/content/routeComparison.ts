export interface ComparisonRow {
  topic: string;
  government: string;
  bank: string;
}

/**
 * Plain-language comparison used on the public comparison page and API.
 * These are demonstration descriptions, not official terms of any scheme or bank.
 */
export const ROUTE_COMPARISON = {
  disclaimer:
    "This comparison describes the two demonstration routes in this prototype. Real government schemes and bank loans have their own rules, interest rates and benefits that vary by provider, product, state and time. Always confirm with the scheme office or bank before deciding.",
  rows: [
    {
      topic: "Purpose",
      government:
        "Support for small and marginal farmers: crop inputs, irrigation, or small equipment.",
      bank: "Credit for crop production, equipment, land development, dairy or storage, sized to your repayment capacity.",
    },
    {
      topic: "Potential benefits",
      government: "Designed for farmers with small landholdings and limited income. May include subsidised or non-repayable support, depending on the scheme.",
      bank: "Larger amounts are possible and can be used for a wider range of purposes. A good repayment record builds your credit history.",
    },
    {
      topic: "Drawbacks",
      government: "Strict eligibility limits on land, income and amount. Limited budgets mean support is not guaranteed.",
      bank: "Must be repaid with interest. Missed payments harm your credit history. Larger loans usually need security.",
    },
    {
      topic: "Who is likely to qualify (demo criteria)",
      government: "Age 18–70, up to 5 acres cultivated, farm income up to ₹2.5 lakh a year, a bank account, and no unmet conditions on earlier schemes.",
      bank: "Age 21–65, total repayments within half of monthly income, loan within 3× yearly income, no defaulted loans, and security for loans above ₹1.6 lakh.",
    },
    {
      topic: "Documents",
      government: "Identity proof, land record or tenancy agreement, bank passbook.",
      bank: "Identity proof, income proof, 6-month bank statement, land record, and collateral documents if security is offered.",
    },
    {
      topic: "Interest",
      government: "Depends on the scheme. Some support is a grant, some is a subsidised loan. This prototype does not quote rates.",
      bank: "Set by each bank and product. This prototype does not quote rates; ask the bank for the current rate.",
    },
    {
      topic: "Repayment",
      government: "Depends on the scheme; grants are not repaid, but scheme conditions must be followed.",
      bank: "Monthly or seasonal instalments over the agreed period.",
    },
    {
      topic: "Collateral",
      government: "Usually not required for this kind of support.",
      bank: "Not needed for small loans in this demo (up to ₹1.6 lakh). Larger loans need security worth at least the loan amount.",
    },
    {
      topic: "Processing stages",
      government: "Submit → officer review → eligibility assessment → corrections if needed → decision.",
      bank: "Submit → officer review → repayment-capacity assessment → corrections if needed → decision.",
    },
    {
      topic: "Flexibility",
      government: "Fixed support categories and limits.",
      bank: "Amount and repayment period can be adjusted to fit your income.",
    },
    {
      topic: "Review process",
      government: "Reviewed by an agriculture department officer. The model result is advice only; the officer decides.",
      bank: "Reviewed by a bank officer. The model result is advice only; the officer decides.",
    },
  ] satisfies ComparisonRow[],
};

export const ROUTE_COMPARISON_HI: typeof ROUTE_COMPARISON = {
  disclaimer:
    "यह तुलना इस प्रोटोटाइप के दो प्रदर्शन विकल्पों का वर्णन करती है। असली सरकारी योजनाओं और बैंक ऋणों के नियम, ब्याज दरें और लाभ प्रदाता, उत्पाद, राज्य और समय के अनुसार बदलते हैं। निर्णय लेने से पहले योजना कार्यालय या बैंक से पुष्टि करें।",
  rows: [
    {
      topic: "उद्देश्य",
      government: "छोटे और सीमांत किसानों के लिए सहायता: फसल की लागत, सिंचाई या छोटे उपकरण।",
      bank: "फसल उत्पादन, उपकरण, भूमि विकास, डेयरी या भंडारण के लिए ऋण, आपकी चुकाने की क्षमता के अनुसार।",
    },
    {
      topic: "संभावित लाभ",
      government: "कम ज़मीन और सीमित आय वाले किसानों के लिए। योजना के अनुसार इसमें रियायती या न लौटाने वाली सहायता हो सकती है।",
      bank: "बड़ी राशि संभव है और अधिक कामों के लिए उपयोग हो सकती है। समय पर भुगतान से आपका क्रेडिट रिकॉर्ड बनता है।",
    },
    {
      topic: "कमियाँ",
      government: "ज़मीन, आय और राशि की सख़्त सीमाएँ। सीमित बजट के कारण सहायता की गारंटी नहीं है।",
      bank: "ब्याज के साथ लौटाना होता है। किस्त छूटने से क्रेडिट रिकॉर्ड ख़राब होता है। बड़े ऋण के लिए अक्सर ज़मानत चाहिए।",
    },
    {
      topic: "कौन पात्र हो सकता है (प्रदर्शन मानदंड)",
      government: "आयु 18–70, 5 एकड़ तक खेती, सालाना खेती की आय ₹2.5 लाख तक, बैंक खाता, और पिछली योजनाओं की कोई अधूरी शर्त नहीं।",
      bank: "आयु 21–65, कुल किस्तें मासिक आय के आधे के भीतर, ऋण सालाना आय के 3 गुना तक, कोई चूका हुआ ऋण नहीं, और ₹1.6 लाख से अधिक ऋण पर ज़मानत।",
    },
    {
      topic: "दस्तावेज़",
      government: "पहचान प्रमाण, भूमि रिकॉर्ड या पट्टा समझौता, बैंक पासबुक।",
      bank: "पहचान प्रमाण, आय प्रमाण, 6 महीने का बैंक स्टेटमेंट, भूमि रिकॉर्ड, और ज़मानत देने पर उसके दस्तावेज़।",
    },
    {
      topic: "ब्याज",
      government: "योजना पर निर्भर। कुछ सहायता अनुदान है, कुछ रियायती ऋण। यह प्रोटोटाइप दरें नहीं बताता।",
      bank: "हर बैंक और उत्पाद की अपनी दर होती है। यह प्रोटोटाइप दरें नहीं बताता; मौजूदा दर बैंक से पूछें।",
    },
    {
      topic: "भुगतान",
      government: "योजना पर निर्भर; अनुदान लौटाना नहीं होता, पर योजना की शर्तें माननी होती हैं।",
      bank: "तय अवधि में मासिक या मौसमी किस्तें।",
    },
    {
      topic: "ज़मानत",
      government: "इस तरह की सहायता के लिए आमतौर पर ज़रूरी नहीं।",
      bank: "इस प्रदर्शन में छोटे ऋण (₹1.6 लाख तक) के लिए ज़रूरी नहीं। बड़े ऋण के लिए कम से कम ऋण के बराबर ज़मानत चाहिए।",
    },
    {
      topic: "प्रक्रिया के चरण",
      government: "जमा करें → अधिकारी समीक्षा → पात्रता मूल्यांकन → ज़रूरत हो तो सुधार → निर्णय।",
      bank: "जमा करें → अधिकारी समीक्षा → चुकाने की क्षमता का मूल्यांकन → ज़रूरत हो तो सुधार → निर्णय।",
    },
    {
      topic: "लचीलापन",
      government: "तय सहायता श्रेणियाँ और सीमाएँ।",
      bank: "राशि और भुगतान अवधि आपकी आय के अनुसार बदली जा सकती है।",
    },
    {
      topic: "समीक्षा प्रक्रिया",
      government: "कृषि विभाग के अधिकारी द्वारा समीक्षा। मॉडल का परिणाम केवल सलाह है; निर्णय अधिकारी लेते हैं।",
      bank: "बैंक अधिकारी द्वारा समीक्षा। मॉडल का परिणाम केवल सलाह है; निर्णय अधिकारी लेते हैं।",
    },
  ],
};
