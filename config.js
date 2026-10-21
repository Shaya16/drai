import { t } from "./lang.js";

// ✏️  everything personal lives in this file. edit away.
// in any text below, {name} {gf} {age} {age+1} {age-2} etc. get filled in for you.
// t("english", "עברית") = the english site (index.html) shows the first one, the hebrew site (he.html) the second.
export const CONFIG = {
  name: t("Drai", "דריי"),
  age: 27, // the age he's turning
  from: t("Shay", "שי AKA אביב"),
  gfName: t("Gal", "גל"),

  // ---------- the start ----------
  // the fake installer's messages, in order: [how full the bar is (%), what it says]
  loader: t(
    [
      [4, "downloading more RAM..."],
      [23, "compressing his age..."],
      [61, "looking for his salary..."],
      [12, "looking for his salary... ERROR: not found"],
      [48, "converting physics degree into money..."],
      [31, "converting physics degree into money... FAILED"],
      [97, "almost done..."],
      [3, "jk"],
      [86, "loading AI baby (brace yourself)..."],
      [100, "done!! (probably)"],
    ],
    [
      [4, "מוריד עוד זיכרון RAM..."],
      [23, "מכווץ לו את הגיל..."],
      [61, "מחפש לו את המשכורת..."],
      [12, "מחפש לו את המשכורת... שגיאה: לא נמצאה"],
      [48, "ממיר תואר בפיזיקה לכסף..."],
      [31, "ממיר תואר בפיזיקה לכסף... נכשל"],
      [97, "עוד שנייה..."],
      [3, "סתם"],
      [86, "טוען את התינוק המשותף (תתכונן נפשית)..."],
      [100, "סיימנו!! (נראה לי)"],
    ],
  ),
  // the text scrolling along the top
  ticker: t(
    [
      "WELCOME TO {name}'S OFFICIAL BIRTHDAY WEBSITE",
      "BEST VIEWED IN INTERNET EXPLORER 6 AT 800x600",
      "NOW IN 3D",
      "HE CHOSE PHYSICS",
      "WARNING: CONTAINS AI BABY",
      "NO REFUNDS",
      "IF YOU CAN READ THIS YOU'RE TOO CLOSE TO THE SCREEN",
      "HAPPY BIRTHDAY {name}",
    ],
    [
      "ברוכים הבאים לאתר יום ההולדת הרשמי של {name}",
      "מומלץ לצפייה באינטרנט אקספלורר 6 ברזולוציה 800x600",
      "עכשיו בתלת־ממד",
      "הוא בחר בפיזיקה",
      "אזהרה: מכיל תינוק AI",
      "אין החזרים",
      "אם אתה מצליח לקרוא את זה אתה יושב קרוב מדי למסך",
      "מזל טוב {name}",
    ],
  ),

  // ---------- his face ----------
  // a front-facing photo of him, sitting next to index.html, named face.jpg.
  // crop it so his head (with all the hair he has left) fills most of the picture.
  // (this one is cropped out of photos/gorilla-cap.jpg)
  photo: "face.jpg",
  // where his eyes / mouth / top of forehead are in that photo (0 = left/top edge, 1 = right/bottom edge).
  // if you swap the photo, open the site with ?calibrate at the end of the url and click on his face.
  leftEye: { x: 0.309, y: 0.55 },
  rightEye: { x: 0.559, y: 0.502 },
  mouth: { x: 0.482, y: 0.728 },
  hairline: { x: 0.456, y: 0.38 },
  eyeSize: 1, // bigger number = bigger eye holes
  mouthSize: 1,
  // chapter 1 opens on a video: scrolling plays intro/frames/*.jpg (cut from intro/squint.mp4),
  // then it freezes on intro/still.jpg, the frame where he's cross-eyed. the eyes / mouth here are where they are in that still.
  // intro: null = skip the video and start chapter 1 on the photo above
  intro: {
    still: "intro/still.jpg",
    frames: "intro/frames/{n}.jpg",
    frameCount: 65,
    leftEye: { x: 0.232, y: 0.449 },
    rightEye: { x: 0.84, y: 0.449 },
    mouth: { x: 0.52, y: 0.855 },
    eyeSize: 0.8,
    // for "fixing" his eyes (the irises get moved to the outer corners): each eye's 2 corners, the top of its
    // upper lid, the bottom of its lower lid, and its iris (r = radius, as a fraction of the still's width)
    eyeShapes: [
      { corners: [[0.086, 0.461], [0.365, 0.467]], top: [0.215, 0.419], bottom: [0.222, 0.481], iris: { x: 0.264, y: 0.457, r: 0.056 } },
      { corners: [[0.694, 0.458], [0.989, 0.456]], top: [0.868, 0.414], bottom: [0.833, 0.485], iris: { x: 0.814, y: 0.455, r: 0.057 } },
    ],
  },

  // ---------- physics vs money ----------
  multiverse: {
    moneyPhoto: "photos/money.jpg", // universe #1's picture. "" = his face with fake sunglasses instead
    money: t(
      ["💰 net worth: $4,200,000", "🏎️ drives: a lambo", "🏠 houses: 3", "🏖️ vacation: maldives", "🧠 knows what the fuck a quantum spin is: fuck no"],
      ["💰 שווי: $4,200,000", "🏎️ נוסע על: למבורגיני", "🏠 דירות: 3", "🏖️ חופשות: במלדיביים", "🧠 יודע מה זה לעזאזל ספין קוונטי: אין מצב"],
    ),
    physics: t(
      ["💰 net worth: $3.50", "🛴 drives: an electric scooter", "🥙 dinner: pita with egg", "🏖️ vacation: exam season", "🧠 knows what the fuck a quantum spin is: of course. he knows."],
      ["💰 שווי: $3.50", "🛴 נוסע על: קורקינט חשמלי", "🥙 ארוחת ערב: פיתה עם ביצה", "🏖️ חופשה: תקופת מבחנים", "🧠 יודע מה זה לעזאזל ספין קוונטי: ברור. הוא יודע."],
    ),
  },
  salaryMath: t(
    [
      "> E = mc²",
      "> $ = passion × hours ÷ respect",
      "> salary − dates with {gf} = −$1340",
      "> {gf}'s salary ÷ his salary = ∞ (division by zero)",
      "> ∫ salary dt (0 → ∞) = 0",
      "> applying heisenberg uncertainty principle...",
    ],
    [
      "> E = mc²",
      "> $ = תשוקה × שעות ÷ הערכה",
      "> משכורת − דייטים עם {gf} = −$1340",
      "> המשכורת של {gf} ÷ המשכורת שלו = ∞ (חילוק באפס)",
      "> ∫ משכורת dt (0 → ∞) = 0",
      "> מפעיל את עקרון אי־הוודאות של הייזנברג...",
    ],
  ),
  salaryResult: "$0 ± $5",

  // ---------- the AI baby generator ----------
  // her photo (optional). she only shows up as "mom", and she does NOT get warped. she's innocent.
  gfPhoto: "", // e.g. "gf.jpg"
  // real AI babies made before. the first "Generate" shows these (in order), then the app makes its own
  babyPhotos: ["photos/ai-baby.jpg"],
  // what the app shows while it "generates"
  babySteps: {
    first: t(
      [
        "Analyzing parent 1…",
        "Parent 1 analyzed. Concerning.",
        "Parent 2 photo protected. Using vibes only.",
        "Merging genetic markers…",
        "Trying to remove the goatee…",
        "Goatee could not be removed.",
      ],
      [
        "מנתח את הורה 1…",
        "הורה 1 נותח. מדאיג.",
        "התמונה של הורה 2 מוגנת. עובדים רק על וייבים.",
        "ממזג סמנים גנטיים…",
        "מנסה להוריד את הזקנקן…",
        "את הזקנקן אי אפשר להוריד.",
      ],
    ),
    again: t(
      ["Regenerating with a new seed…", "Trying to make it cuter…", "Could not make it cuter."],
      ["מייצר מחדש עם seed חדש…", "מנסה לעשות אותו יותר חמוד…", "לא הצלחנו לעשות אותו יותר חמוד."],
    ),
    limit: t(
      "You've reached the free limit. Upgrade to BabyGen Pro to generate a cuter baby. (Not possible.)",
      "נגמרה המכסה החינמית. שדרגו ל-BabyGen Pro בשביל תינוק יותר חמוד. (אין דבר כזה.)",
    ),
  },
  // the AI's reply on each attempt: [title, message]. after the last one you hit the free limit.
  babyVerdicts: t(
    [
      ["Here's your baby! 🎉", "I'm 98% confident. He even came with the mustache. I'm so sorry."],
      ["New version ready", "I changed the seed. It got worse. I didn't know that was possible."],
      ["Version 3", "I made the forehead bigger to fit all of his genes in."],
      ["Version 4", "It smiles exactly like him when he explains physics. Please stop pressing the button."],
      ["Version 5", "I gave it more of her genes. They didn't take. His genes are just louder."],
      ["Version 6", "Have you two considered adopting?"],
    ],
    [
      ["הנה התינוק שלכם! 🎉", "אני בטוח בזה ב-98%. הוא אפילו יצא עם שפם. אני ממש מצטער."],
      ["גרסה חדשה מוכנה", "החלפתי seed. זה רק החמיר. לא ידעתי שזה בכלל אפשרי."],
      ["גרסה 3", "הגדלתי את המצח כדי שכל הגנים שלו ייכנסו."],
      ["גרסה 4", "הוא מחייך בדיוק כמו שהוא מחייך כשהוא מסביר פיזיקה. די ללחוץ על הכפתור, באמת."],
      ["גרסה 5", "שמתי יותר מהגנים שלה. לא תפס. הגנים שלו פשוט צועקים יותר חזק."],
      ["גרסה 6", "חשבתם פעם על אימוץ?"],
    ],
  ),

  // ---------- enemies to lovers ----------
  // someone he "hates". photo = their face (cropped out of photos/office.jpg),
  // hugPhoto = the "leaked footage" right before the wedding invite
  enemy: { name: t("Orel", "אוראל"), photo: "enemy.jpg", hugPhoto: "photos/office-hug.jpg" },

  // ---------- main event: him vs dad ----------
  fight: {
    // the video, next to index.html. mp4 plays everywhere (an iphone .mov might not play in chrome).
    video: "fight.mp4",
    opponent: t("DAD", "אבא"),
    opponentPhoto: "", // optional photo of his dad, e.g. "dad.jpg"
    title: t("the ego championship of the world", "אליפות העולם באגו"),
    // first half of the fight: dad's ego is winning
    dadHits: t(
      [
        "DAD USES: \"WHEN I WAS YOUR AGE\"",
        "DAD USES: \"PHYSICS DOESN'T PAY RENT\"",
        "DAD USES: \"WHO PAYS FOR YOUR PHONE?\"",
        "DAD USES: DISAPPOINTMENT",
        "{name}'S EGO -20",
        "COMBO x3!",
      ],
      [
        "אבא שולף: \"כשאני הייתי בגילך\"",
        "אבא שולף: \"פיזיקה לא משלמת שכר דירה\"",
        "אבא שולף: \"מי משלם לך על הטלפון?\"",
        "אבא שולף: אכזבה",
        "האגו של {name} -20",
        "קומבו x3!",
      ],
    ),
    // halfway: the comeback
    comeback: t("COMEBACK!! 🔥", "קאמבק!! 🔥"),
    // second half: it's all him
    draiHits: t(
      [
        "{name} USES: \"ACTUALLY, IN PHYSICS...\"",
        "IT'S SUPER EFFECTIVE",
        "{name} USES: EYE ROLL. CRITICAL HIT!",
        "DAD'S EGO -40",
        "DAD USES: \"I'M STILL YOUR FATHER\". IT FAILED.",
        "{name} USES: \"OK BOOMER\"",
      ],
      [
        "{name} שולף: \"בעצם, בפיזיקה...\"",
        "זה סופר אפקטיבי",
        "{name} שולף: גלגול עיניים. מכה קריטית!",
        "האגו של אבא -40",
        "אבא שולף: \"אני עדיין אבא שלך\". לא עבד.",
        "{name} שולף: \"אוקיי בומר\"",
      ],
    ),
    winner: t("{name} WINS. DAD'S EGO HAS LEFT THE BUILDING.", "{name} ניצח. האגו של אבא עזב את הבניין."),
    winnerSpoken: t("{name} wins! What an upset!", "{name} ניצח! איזו הפתעה!"),
  },

  // ---------- meme hall of fame ----------
  // the memes are in english on both sites. memeName = his name inside them (on the hebrew site too)
  // types: drake, lasers, stonks, post, brain, fine, friends, expect, wanted, missing, ejected. reorder / delete / duplicate freely.
  memeName: "Drai",
  memes: [
    { type: "drake", no: "making money", yes: "physics" },
    { type: "stonks", lines: [["age", "up"], ["hairline", "down"], ["salary", "flat"], ["back pain", "up"]] },
    {
      type: "post",
      photo: "photos/arak.jpg",
      headline: "Physicist | Equity holder at Deliveright ($2K, pending) | Thought leader",
      text: "Excited to announce that after years of hard work, I've finally achieved work-life balance. 🙏\n\nGrateful for the journey. Agree?",
      tags: "#physics #equity #hustle #grateful",
      reactions: "12,483",
      comments: [["Gal", "come home"], ["Orel", "so proud of you 🥹"]],
    },
    { type: "lasers", top: "when he finally understands quantum mechanics", bottom: "still can't afford rent" },
    {
      type: "brain",
      steps: [
        "buying stock options at your company",
        "not buying them",
        "the company sells. your options would've been worth $70K",
        "joining Deliveright for options worth $2K (if it ever sells 🤞)",
      ],
    },
    {
      type: "friends",
      photo: "photos/friends.jpg",
      count: 3,
      caption: "rare photo of {name}'s entire friend list. all 3 of them. in one place.",
      limit: "friend limit reached (3/3)",
    },
    {
      type: "expect",
      expectation: ["🦄 Neword, valued at $1B", "🤖 AI runs everyone's social media", "🏝️ retire at 30"],
      reality: ["💸 raised: $80K", "📉 revenue: $2K a month", "🤖 the AI is our most active user"],
    },
    {
      type: "missing",
      photo: "photos/scooter.png", // no photo = the emoji below
      emoji: "🛴",
      item: "electric scooter",
      count: 3,
      seen: "wherever he parked it for five minutes",
      plea: "please bring it back. he can't afford a 4th one. (he chose physics)",
      reward: "1 pita with egg 🥙",
      tab: "📞 call {name}",
    },
    { type: "ejected", text: "{name} was not The Impostor.", sub: "he was a physicist. (worse)" },
  ],

  // ---------- the good times ----------
  // { photo } or { video } from the memories folder. videos loop silently, with a tap-for-sound button
  memories: [
    { photo: "memories/crew.jpg", caption: t("the crew, the tea, and a karaoke night that refused to end", "אני אתה איך שלא קוראים לה והויאטנמי החמוד") },
    { video: "memories/thinking.mp4", caption: t("good nights with your thai best friends", "good nights with your thai best friends") },
    { video: "memories/lighter.mp4", caption: t("Satlot Katlot", "סטלות קטלות") },
  ],

  // what the "make a wish" button says each time it runs away from you
  wishTaunts: t(["nope", "too slow", "almost!", "lol", "try harder", "so close", "one more"], ["נופ", "לאט מדי", "כמעט!", "חחחח", "תתאמץ קצת", "כמעטטט", "עוד אחד"]),

  // xbox-style popups as you go
  achievements: {
    open: t("opened the website (wow)", "פתחת את האתר (וואו)"),
    age: t("survived {age} years (somehow)", "שרדת {age} שנים (איכשהו)"),
    hairline: t("watched the hairline leave", "ראית את קו השיער עוזב"),
    physics: t("chose physics. lost money.", "בחרת בפיזיקה. הפסדת כסף."),
    baby: t("saw the AI baby and didn't cry (much)", "ראית את התינוק מה-AI ולא בכית (יותר מדי)"),
    love: t("enemies to lovers arc: complete", "מאויבים לאוהבים: הושלם"),
    fight: t("beat his dad. ego: maxed out.", "ניצחת את אבא. אגו: במקסימום."),
    memes: t("became a meme", "הפכת למם"),
    wish: t("made a wish (it won't come true)", "ביקשת משאלה (היא לא תתגשם)"),
  },

  // jank settings. this is a feature, not a bug.
  fps: 30, // of the 3D only. lower = choppier
  pixelation: 0.75, // 1 = crisp, 0.25 = minecraft
  lagSpikes: false, // true = the 3D randomly freezes for a moment every few seconds

  // shows up at the very end, after the "crash". \n\n = new paragraph
  message: t(
    "I love you man. You've been a true partner, a great friend, and for real, a brother to me.\n\nWriting another birthday message on WhatsApp with a few photos felt way too cliché, so I made you this instead. (Thank god Neword pays for Claude.)\n\nHappy birthday, love you man ❤️",
    "אוהב אותך אח יקר. אתה שותף אמיתי, חבר מטורף, ובאמת כמו אח בשבילי.\n\nחשבתי על לכתוב לך עוד ברכה בוואטסאפ עם כמה תמונות אבל הרגיש לי קצת בנאלי מדי, אז עשיתי לך את זה במקום. (מזל שניוורד ממן את הקלוד שלי)\n\nאז שיהיה לך מלא מזל טוב, חיים מדהימים תמשיך לחוות, להנות, להיות בזוגיות מדהימה עם גלגול, ליזום ושתעשה ארגז אחי.\n\nמזל טוב, אוהב אותך ❤️",
  ),

  // "through the years" gallery. src = a real photo. no src = his face with an effect.
  // fx options: sepia, tiny, pixel, stretch, squish, nose, upside, glasses, fried, invert, bald
  // (sepia, upside, fried and invert also work on real photos)
  gallery: [
    { src: "photos/gorilla-cap.jpg", caption: t("wearing a picture of himself on his hat", "אווירה של נרקומן בסו גוד") },
    { src: "photos/airport.jpg", caption: t("the day he was officially just \"& friend\"", "היום שבו הוא רשמית נהיה \"& friend\"") },
    { fx: "sepia", caption: t("you, age 1 (already disappointed)", "אווירה של נרקומן בסו גוד אבל עצוב") },
    { src: "photos/hammock.jpg", caption: t("a physicist, hard at work", "פיזיקאי בעבודה קשה") },
    { fx: "nose", caption: t("close-up for the investors", "אף נדיר אבל אחי") },
    { src: "photos/braids.jpg", caption: t("the braids era. we don't talk about the braids era.", "התקופה של דריי בגטו בהארלם (כיף שיצאת מזה אחי)") },
    { fx: "pixel", caption: t("you in 2007 (240p)", "אתה ב240p") },
    { src: "photos/mountain.jpg", caption: t("climbed a mountain for a medal. still no salary.", "FOGY FOGYYYYYY") },
    { src: "photos/cool.jpg", caption: t("you thinking you're cool", "יפה אחי מגניב שלך") },
    { src: "photos/3am.jpg", caption: t("you at 3am doing physics homework", "שתזכור איך אתה נראה בPRIME") },
  ],

  // his store listing's reviews. badge = the orange line under the date (default "Verified Purchase"),
  // helpful = how many people found it helpful (default: random)
  reviews: [
    {
      stars: 5,
      title: t("10/10 beauty", "10/10 יופי"),
      text: t("10/10 beauty. 0/10 calm.", "יופי: 10/10. רוגע: 0/10."),
      by: "{gf}",
      badge: t("Verified Girlfriend", "חברה מאומתת"),
      helpful: 89,
    },
    {
      stars: 1,
      title: t("Rematch anytime", "קרב חוזר מתי שבא לו"),
      text: t("I'll beat him any time. That weak ass bitch.", "אני מזיין אותו את החלש הזה"),
      by: t("his dad", "דוד דריי"),
      badge: t("Verified Father", "אבא מאומת"),
      helpful: 1,
    },
  ],
};
