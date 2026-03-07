const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'games/3-over-match/data');
if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const p = path.join(dir, file);
            try {
                const data = JSON.parse(fs.readFileSync(p));
                if (data && Array.isArray(data.questions)) {
                    let q = data.questions;
                    // remove empty
                    q = q.filter(x => x.question && x.question.trim().length > 0);
                    // limit to 18
                    if (q.length > 18) q = q.slice(0, 18);
                    data.questions = q;
                    fs.writeFileSync(p, JSON.stringify(data, null, 2));
                    console.log(`Cleaned ${file}: ${q.length} questions remaining.`);
                }
            } catch(e) {}
        }
    }
}
