// Conservative claim guards, not semantic truth or hallucination detection.
// Model prose never supplies displayed analytics; reference IDs are checked separately.
const quantity = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|quarter|majority|minority)";
const quantifiedPopulation = new RegExp(`\\b${quantity}(?:[ -]${quantity})*(?:\\s+of(?:\\s+the)?)?\\s+(?:percent(?:age)?|customers?|users?|respondents?|events?|records?|conversions?)\\b`, "iu");
export function hasUnsupportedNumber(text: string): boolean {
  return /[\p{N}%]/u.test(text) || quantifiedPopulation.test(text) ||
    /\b(?:double[ds]?|triple[ds]?)\s+(?:the\s+)?(?:conversion|retention|revenue|engagement|rate)\b/iu.test(text) ||
    /\b(?:all|every)\s+(?:customers?|users?|respondents?)\b/iu.test(text);
}

export function hasUnsupportedCausalAssertion(text: string): boolean {
  return text.split(/(?<=[.!?;])\s+/u).some((sentence) => {
    if (/\b(?:definitely|guarantee[ds]?)\b/iu.test(sentence)) return true;
    sentence = sentence.replace(/\b(?:does not|do not|cannot|can't)\s+(?:prove|establish|demonstrate|confirm)(?:\s+(?:causation|a causal relationship))?\b|\bcausation\s+(?:is\s+)?not\s+(?:established|verified|known)\b/giu, "unverified");
    if (!/\b(caus(?:e[ds]?|ing|ation)|because|result(?:s|ed) in|leads? to|proves?|definitely|guarantee[ds]?)\b/iu.test(sentence)) return false;
    // Negated proof and an explicitly uncertain research relationship are not a
    // verified causal conclusion. Other factual language still requires review.
    const tentative = /\b(?:could|might|may|whether)\b/iu.test(sentence) &&
      (sentence.endsWith("?") || /\b(?:whether|unknown|uncertain|unclear)\b/iu.test(sentence));
    return !tentative;
  });
}
