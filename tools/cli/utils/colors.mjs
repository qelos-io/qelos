const colorMap = new Map();
colorMap.set("cyan", 36);
colorMap.set("yellow", 33);
colorMap.set("green", 32);
colorMap.set("red", 31);

/**
 * logs the text to the console with the required color
 * @param {string} text 
 * @param {string} color
 * @returns {string} 
 */
function logColor(text, color) {
  if (colorMap.has(color)) {
    return `\x1b[${colorMap.get(color)}m${text}\x1b[0m`;
  }
}

export const green = (text) => logColor(text, "green");
export const blue = (text) => logColor(text, "cyan");
export const yellow = (text) => logColor(text, "yellow");
export const red = (text) => logColor(text, "red");
