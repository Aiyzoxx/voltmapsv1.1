const fs = require('fs');
const path = require('path');
function walk(d) {
    let r = [];
    fs.readdirSync(d).forEach(f => {
        f = path.join(d, f);
        if (fs.statSync(f).isDirectory()) r = r.concat(walk(f));
        else if (f.endsWith('.html')) r.push(f);
    });
    return r;
}
let c = 0;
walk(__dirname).forEach(f => {
    try {
        let t = fs.readFileSync(f, 'utf8');
        if (t.includes('unityWebglBuildUrl') && !t.includes('auto-save-popup.js')) {
            let p = 'js/';
            let m = t.match(/<script src="([^"]*)master-loader\.js"/);
            if (m) p = m[1];
            else {
                let m2 = t.match(/<script src="([^"]*)4399\.js"/);
                if (m2) p = m2[1];
            }
            let tag = `<script src="${p}auto-save-popup.js"></script>`;
            t = t.replace(/(<body[^>]*>)/i, '$1\n    ' + tag);
            fs.writeFileSync(f, t, 'utf8');
            console.log('Updated ' + f);
            c++;
        }
    } catch (e) {
        console.error(f, e.message);
    }
});
console.log('Total modified: ' + c);
