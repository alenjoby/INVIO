/**
 * INVIO Security Guard
 * Layers of deterrents to prevent template inspection and copying.
 */

(function() {
    // 1. Disable Right-Click (Context Menu)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 2. Block Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I (Inspect)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }

        // Ctrl+C (Copy - if we want to be very strict)
        // if (e.ctrlKey && e.keyCode === 67) { e.preventDefault(); return false; }
    });

    // 3. Debugger Trap (Optional but effective)
    // Runs a debugger loop to pause execution if DevTools is opened.
    // Uncomment this for "Maximum Lockdown" mode.
    /*
    setInterval(() => {
        debugger;
    }, 100);
    */

    console.log("INVIO Security Active: Deterrents enabled.");
})();
