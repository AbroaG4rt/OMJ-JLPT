// C:\Users\Abroa.G\.gemini\antigravity\scratch\jlpt-app\generate_data.js
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const adminDir = path.join(__dirname, 'admin-format');

// Create directories if they don't exist
[dataDir, adminDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Users DB
const users = [
    { name: "Satoshi Nakamoto", password: "pwd123" },
    { name: "Test User", password: "123" }
];
fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

// Question levels setup
const levelsConfig = {
    "N5": { count: 95, time: 120 },
    "N4": { count: 100, time: 125 },
    "N3": { count: 130, time: 130 },
    "N2": { count: 135, time: 140 },
    "N1": { count: 140, time: 150 }
};

const templates = [
    { type: 'reading', q: "Fill in the blank: 私_学生です。", opts: ["は", "が", "を", "に"], ans: "は" },
    { type: 'grammar', q: "Which particle is correct? 本_読みます。", opts: ["を", "が", "は", "と"], ans: "を" },
    { type: 'grammar', q: "Choose the correct translation: 'I eat apple.'", opts: ["りんごを食べます。", "りんごが食べます。", "りんごに食べます。", "りんごは食べます。"], ans: "りんごを食べます。" },
    { type: 'reading', q: "What does '先生 (Sensei)' mean?", opts: ["Student", "School", "Teacher", "Doctor"], ans: "Teacher" },
    { type: 'image', q: "Is this correct kanji for water? 水", opts: ["Yes", "No", "Maybe", "Unknown"], ans: "Yes", image: "water.jpg" },
    { type: 'listening', q: "Listen to the audio and find the meaning.", opts: ["Hello", "Goodbye", "Thank you", "Sorry"], ans: "Hello", audio: "hello.mp3" }
];

for (const [level, config] of Object.entries(levelsConfig)) {
    const questions = [];
    for (let i = 1; i <= config.count; i++) {
        // Pick a template randomly
        const tmpl = templates[Math.floor(Math.random() * templates.length)];
        let qItem = {
            id: `${level}-Q${i}`,
            type: tmpl.type,
            question: `${level} - Q${i}: ` + tmpl.q,
            options: {
                "A": tmpl.opts[0],
                "B": tmpl.opts[1],
                "C": tmpl.opts[2],
                "D": tmpl.opts[3]
            },
            correctAnswer: ["A", "B", "C", "D"][tmpl.opts.indexOf(tmpl.ans)]
        };
        if (tmpl.image) qItem.image = tmpl.image;
        if (tmpl.audio) qItem.audio = tmpl.audio;
        
        questions.push(qItem);
    }
    
    fs.writeFileSync(path.join(dataDir, `${level}.json`), JSON.stringify(questions, null, 2));
    console.log(`Generated ${level}.json with ${config.count} questions.`);
}

const templateFormat = {
  "type": "reading | grammar | listening | image",
  "question": "Question text goes here",
  "options": {
    "A": "Option 1",
    "B": "Option 2",
    "C": "Option 3",
    "D": "Option 4"
  },
  "correctAnswer": "A",
  "image": "optional_image_url.png",
  "audio": "optional_audio_url.mp3"
};

fs.writeFileSync(path.join(adminDir, 'question-template.json'), JSON.stringify(templateFormat, null, 2));
console.log('Generated Data.');
