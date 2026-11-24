// Matches the words in a name, following the word rules of lodash's camelCase.
// \p{Lu} is any upper case letter, \p{Ll} any lower case letter, \p{N} any digit:
// - \p{Lu}?\p{Ll}+                       a lower case word, optionally capitalised (user, User)
// - \p{Lu}+(?=\p{Lu}\p{Ll}|[^\p{L}]|$)  an upper case run, ending before the next capitalised word (HTTPServer -> HTTP).
//                                       Like lodash this splits a plural acronym: IDs -> I, Ds
// - \p{N}*(?:1ST|2ND|3RD|(?![123])\p{N}TH)(?=\b|[\p{Ll}_])  an upper case ordinal (2ND)
// - \p{N}*(?:1st|2nd|3rd|(?![123])\p{N}th)(?=\b|[\p{Lu}_])  a lower case ordinal (2nd)
// - \p{N}+                              a number
// Everything else (underscores, dashes, spaces, punctuation, emoji) separates words.
// Unlike lodash, emoji are dropped instead of kept as part of a word
//
const wordPattern =
  /\p{Lu}?\p{Ll}+|\p{Lu}+(?=\p{Lu}\p{Ll}|[^\p{L}]|$)|\p{N}*(?:1ST|2ND|3RD|(?![123])\p{N}TH)(?=\b|[\p{Ll}_])|\p{N}*(?:1st|2nd|3rd|(?![123])\p{N}th)(?=\b|[\p{Lu}_])|\p{N}+/gu;

// Matches combining diacritical marks, which NFD normalisation splits off their letter (Ä -> A + ̈)
//
const diacriticPattern = /[̀-ͯ]/g;

// Matches apostrophes, which lodash removes before splitting words: don't -> dont
//
const apostrophePattern = /['’]/g;

// Matches the Latin-1 punctuation and symbol block U+00A0-U+00BF. lodash treats all of it as word
// separators, while Unicode counts some of it as letters or numbers (ª, µ, ², ½)
//
const latin1SymbolPattern = /[\u00a0-\u00bf]/g;

// Latin letters that NFD does not split into a base letter and a mark, replaced like lodash's deburr
//
const deburredLetters: Record<string, string> = {
  Æ: "Ae",
  æ: "ae",
  Ð: "D",
  ð: "d",
  Ø: "O",
  ø: "o",
  Þ: "Th",
  þ: "th",
  ß: "ss",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
  ĸ: "k",
  Ĳ: "IJ",
  ĳ: "ij",
  Ŀ: "L",
  ŀ: "l",
  Ł: "L",
  ł: "l",
  ŉ: "'n",
  Ŋ: "N",
  ŋ: "n",
  Œ: "Oe",
  œ: "oe",
  Ŧ: "T",
  ŧ: "t",
  ſ: "s",
};

// Matches any of the letters in deburredLetters
//
const deburredLetterPattern = new RegExp(`[${Object.keys(deburredLetters).join("")}]`, "g");

// Upper cases the first character: user -> User
//
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Converts a schema id or property name to camel case: postal-address -> postalAddress
// Diacritics are removed like lodash does: Äpfel -> apfel, straße -> strasse
//
export function camelCase(text: string): string {
  const words =
    text
      .normalize("NFD")
      .replace(diacriticPattern, "")
      .replace(deburredLetterPattern, (letter) => deburredLetters[letter] ?? letter)
      .replace(apostrophePattern, "")
      .replace(latin1SymbolPattern, " ")
      .match(wordPattern) ?? [];
  return words
    .map((word, index) => (index === 0 ? word.toLowerCase() : upperFirst(word.toLowerCase())))
    .join("");
}

//
