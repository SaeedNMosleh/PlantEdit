// PlantUML encoding utilities for converting text to server-compatible format

function encodePlantUML(text) {
    const zlibData = pako.deflateRaw(text, { level: 9 });
    let r = "";
    for (let i = 0; i < zlibData.length; i += 3) {
        if (i + 2 === zlibData.length) {
            r += append3bytes(zlibData[i], zlibData[i + 1], 0);
        } else if (i + 1 === zlibData.length) {
            r += append3bytes(zlibData[i], 0, 0);
        } else {
            r += append3bytes(zlibData[i], zlibData[i + 1], zlibData[i + 2]);
        }
    }
    return r;
}

function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode6bit(b) {
    if (b < 10) return String.fromCharCode(48 + b);
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b);
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b);
    b -= 26;
    return b === 0 ? '-' : '_';
}

async function generateSVG(plantumlText) {
    const encoded = encodePlantUML(plantumlText);
    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to generate SVG');
        }
        const svgText = await response.text();
        return svgText;
    } catch (error) {
        console.error('Error generating SVG:', error);
        alert('Error generating diagram. Please check your PlantUML syntax.');
        return null;
    }
}

async function generatePNG(plantumlText) {
    const encoded = encodePlantUML(plantumlText);
    const url = `https://www.plantuml.com/plantuml/png/${encoded}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to generate PNG');
        }
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Error generating PNG:', error);
        alert('Error generating PNG. Please check your PlantUML syntax.');
        return null;
    }
}

// Export to global scope for CDN usage
window.PlantUMLEncoder = {
    encodePlantUML,
    generateSVG,
    generatePNG
};