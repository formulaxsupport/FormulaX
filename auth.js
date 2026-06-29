// Der direkte Draht zu eurem Google Script
const API_URL = "https://script.google.com/macros/s/AKfycbySow-kXXtEjavDSwOQE5I1kXbx1OoutxaaDU3IxT6Lz0AkDzthlRQvBe72z-2_A1Tt/exec";

// --- 1. INTERFACE-LOGIK (UMSCHALTEN ZWISCHEN LOGIN & REGISTRIERUNG) ---
if (document.getElementById('to-register')) {
    document.getElementById('to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-box').classList.add('hidden');
        document.getElementById('register-box').classList.remove('hidden');
        hideMessage();
    });
}

if (document.getElementById('to-login')) {
    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-box').classList.add('hidden');
        document.getElementById('login-box').classList.remove('hidden');
        hideMessage();
    });
}

if (document.getElementById('register-role')) {
    document.getElementById('register-role').addEventListener('change', (e) => {
        const pinContainer = document.getElementById('lehrer-pin-container');
        if (e.target.value === 'lehrer' || e.target.value === 'admin') {
            pinContainer.classList.remove('hidden');
        } else {
            pinContainer.classList.add('hidden');
        }
    });
}

// --- 2. SICHERHEIT (PASSWORT-HASHING VIA SHA-256) ---
async function hashPassword(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 3. FORMULAR-ABGABE (SUBMIT EVENTS) ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage("Registrierung wird verarbeitet...", "success");

        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;
        const pin = document.getElementById('lehrer-pin').value;

        const passwordHash = await hashPassword(password);
        sendRequest({ action: "register", username, passwordHash, role, pin });
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage("Prüfe Zugangsdaten...", "success");

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const passwordHash = await hashPassword(password);
        sendRequest({ action: "login", username, passwordHash });
    });
}

const guestBtn = document.getElementById('guest-btn');
if (guestBtn) {
    guestBtn.addEventListener('click', () => {
        const guestName = prompt("Bitte gib einen Gast-Namen ein:");
        if (guestName && guestName.trim() !== "") {
            const guestUser = { 
                username: guestName.trim() + " (Gast)", 
                role: "gast", 
                xp: 0, 
                cards: [],
                groupId: "keine"
            };
            sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
            window.location.href = "index.html";
        }
    });
}

// --- 4. NETZWERK-SCHNITTSTELLE (SICHERS LOGIN-SYSTEM) ---
async function sendRequest(payload) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, "success");

            // --- WENN LOGIN ERFOLGREICH ---
            if (payload.action === "login") {
                // Das vollständige User-Objekt inkl. der "groupId" lokal auf dem PC sichern
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));

                setTimeout(() => {
                    if (result.user.role === "admin") {
                        window.location.href = "admin.html";
                    } else {
                        // Schüler und Lehrer werden direkt auf das Haupt-Dashboard geleitet
                        window.location.href = "index.html";
                    }
                }, 1000);
            } 
            // --- WENN REGISTRIERUNG ERFOLGREICH ---
            else if (payload.action === "register") {
                setTimeout(() => {
                    if (window.location.pathname.includes("admin.html")) {
                        window.location.reload();
                    } else {
                        document.getElementById('register-box').classList.add('hidden');
                        document.getElementById('login-box').classList.remove('hidden');
                        hideMessage();
                    }
                }, 1500);
            }

        } else {
            showMessage(result.message, "error");
        }

    } catch (error) {
        console.error("Netzwerkfehler Details:", error);
        showMessage("Verbindungsfehler zum Google-Server! Überprüfe die Skript-Bereitstellung.", "error");
    }
}

function showMessage(text, type) {
    const box = document.getElementById('message-box');
    if (box) {
        box.innerText = text;
        box.className = "message " + type;
        box.classList.remove('hidden');
    }
}

function hideMessage() {
    const box = document.getElementById('message-box');
    if (box) box.className = "message hidden";
}