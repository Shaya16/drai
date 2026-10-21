// the site comes in english (index.html) and in hebrew (he.html). the page says which one it is: <html lang="he">
export const HE = document.documentElement.lang === "he";

// t("english", "עברית"): whichever one this page needs. works for lists too
export const t = (en, he) => (HE ? he : en);
