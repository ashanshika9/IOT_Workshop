const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;
const DB_FILE = './db.json';

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sensor_data: [] }));
}

function getDB() {
    try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        return content ? JSON.parse(content) : { users: [], sensor_data: [] };
    } catch (e) {
        return { users: [], sensor_data: [] };
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Static File Serving
    if (pathname === '/' || pathname.endsWith('.html') || pathname.includes('.')) {
        let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            return res.end(fs.readFileSync(filePath));
        }
    }

    // --- ROUTES ---

    // Login
    if (pathname === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { email, password } = querystring.parse(body);
            const db = getDB();
            const user = db.users.find(u => u.email === email && u.password === password);
            if (user) {
                // Simple cookie set for "session"
                res.writeHead(302, { 
                    'Location': '/dashboard.html',
                    'Set-Cookie': `user=${user.name}; Path=/` 
                });
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("Invalid Credentials. <a href='/index.html'>Try again</a>");
            }
        });
        return;
    }

    // Register
    if (pathname === '/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { name, email, password } = querystring.parse(body);
            const db = getDB();
            db.users.push({ name, email, password });
            saveDB(db);
            res.writeHead(302, { 'Location': '/index.html' });
            res.end();
        });
        return;
    }

    // Update Data (ESP8266)
    if (pathname === '/update') {
        const temp = parsedUrl.query.t;
        const hum = parsedUrl.query.h;
        if (!temp || !hum) return res.end("Missing data");

        const now = new Date();
        const istTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        const istDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');

        const db = getDB();
        db.sensor_data.push({ id: Date.now(), temperature: temp, humidity: hum, time: istTime, date: istDate });
        saveDB(db);
        return res.end("OK");
    }

    // Fetch Records
    if (pathname === '/api/records') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(getDB().sensor_data.slice().reverse()));
    }

    // Fetch User
    if (pathname === '/api/user') {
        const cookie = req.headers.cookie || '';
        const nameMatch = cookie.match(/user=([^;]+)/);
        const name = nameMatch ? decodeURIComponent(nameMatch[1]) : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ name }));
    }

    // Fetch LCD
    if (pathname === '/lcd') {
        const txt = fs.existsSync('lcd.txt') ? fs.readFileSync('lcd.txt', 'utf8') : "SISTec IoT";
        return res.end(txt);
    }

    // Update LCD
    if (pathname === '/update-lcd' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { lcdText } = querystring.parse(body);
            fs.writeFileSync('lcd.txt', (lcdText || "").substring(0, 16));
            res.writeHead(302, { 'Location': '/dashboard.html' });
            res.end();
        });
        return;
    }

    // Logout
    if (pathname === '/logout') {
        res.writeHead(302, { 'Location': '/index.html', 'Set-Cookie': 'user=; Path=/; Max-Age=0' });
        return res.end();
    }

    // Delete
    if (pathname.startsWith('/delete/')) {
        const id = parseInt(pathname.split('/').pop());
        const db = getDB();
        db.sensor_data = db.sensor_data.filter(r => r.id !== id);
        saveDB(db);
        res.writeHead(302, { 'Location': '/dashboard.html' });
        return res.end();
    }

    res.writeHead(404);
    res.end("Not Found");
});

server.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `SERVER IS RUNNING!`);
    console.log(`Visit: http://localhost:${PORT}`);
});
