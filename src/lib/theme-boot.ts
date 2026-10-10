export const SETTINGS_KEY = "vh-settings";

/** Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. */
export const THEME_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");if(s.theme==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
