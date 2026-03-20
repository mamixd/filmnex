import React, { useEffect } from 'react';

const SecurityGuard = () => {
    useEffect(() => {
        // Admin kontrolü - Admin ise hiçbir engelleme yapma
        const userRole = localStorage.getItem('role');
        if (userRole === 'admin') {
            console.log('%c[Security] Admin Mode: Guardian Disabled.', 'color: #22c55e; font-weight: bold;');
            return;
        }

        // 1. Konsol Loglarını Tamamen Sustur (API linklerini gizle)
        const noop = () => {};
        console.log = noop;
        console.info = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
        console.trace = noop;
        
        // Ara ara konsolu temizleyerek önceden atanmış verileri sil
        const clearConsoleInterval = setInterval(() => {
            console.clear();
        }, 2000);

        // 2. Sağ Tık Engeli (Context Menu)
        const handleContextMenu = (e) => {
            if (!e.target.tagName.toLowerCase().match(/input|textarea/)) {
                e.preventDefault();
            }
        };

        // 3. Klavye Kısayolları Engeli (F12, Ctrl+Shift+I, Ctrl+U vb.)
        const handleKeyDown = (e) => {
            // F12
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I veya Ctrl+Shift+J (DevTools)
            if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (Kaynağı Görüntüle)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+C (Element Seçici)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                return false;
            }
        };

        // 4. Sonsuz Debugger Tuzağı (Eğer zorla F12 açılırsa tarayıcıyı dondurur)
        const debuggerTrap = setInterval(() => {
            try {
                const start = new Date();
                debugger; // Tarayıcı DevTools açıksa burada takılır
                const end = new Date();
                if (end - start > 100) {
                    // DevTools açık olduğu için zaman aşıldı!
                    document.body.innerHTML = "<div style='background:#000;color:red;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;'><h1>İzinsiz Giriş: Geliştirici Araçları Yasaktır!</h1></div>";
                }
            } catch (e) {}
        }, 1000);

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearInterval(clearConsoleInterval);
            clearInterval(debuggerTrap);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return null;
};

export default SecurityGuard;
