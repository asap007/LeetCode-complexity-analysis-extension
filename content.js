// content.js
function extractCodeFromMonaco() {
    try {
        const linesContainer = document.querySelector('.view-lines');
        if (!linesContainer) {
            throw new Error('Code editor not found');
        }
        
        const codeLines = Array.from(linesContainer.children);
        const code = codeLines.map(line => line.textContent || '').join('\n');
        
        const languageElement = document.querySelector('[data-track-load="description_content"] .inline-flex');
        const language = languageElement ? languageElement.textContent.trim().toLowerCase() : 'unknown';
        
        return { success: true, code, language };
    } catch (error) {
        console.error('Error extracting code:', error);
        return { success: false, error: error.message };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCode') {
        const result = extractCodeFromMonaco();
        if (result.success) {
            chrome.runtime.sendMessage({
                action: 'analyzeCode',
                code: result.code,
                language: result.language
            }, response => {
                console.log('Raw API Response:', response);
                if (response.success) {
                    try {
                        const rawText = response.data.candidates[0].content.parts[0].text;
                        console.log('Raw Text:', rawText);
                        // Remove markdown code block if present
                        const jsonString = rawText.replace(/```json\n?|\n?```/g, '');
                        console.log('Cleaned JSON string:', jsonString);
                        const analysis = JSON.parse(jsonString);
                        console.log('Parsed Analysis:', analysis);
                        injectAnalysisUI(analysis);
                    } catch (error) {
                        console.error('Error parsing analysis:', error);
                    }
                }
            });
        }
        sendResponse(result);
    }
    return true;
});

// background.js - Add logging to analyzeCode function
async function analyzeCode(code, language) {
    try {
        const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
        if (!geminiApiKey) {
            throw new Error('API key not found');
        }

        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const data = await response.json();
        console.log('Gemini API Response:', data);
        return data;
    } catch (error) {
        console.error('Analysis Error:', error);
        throw error;
    }
}

function drawComplexityGraph(complexity, containerId) {
    const canvas = document.createElement('canvas');
    const container = document.getElementById(containerId);
    const width = container.offsetWidth;
    canvas.width = width;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Setup
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 200);
    
    // Generate points
    const points = [];
    const n = Array.from({length: 50}, (_, i) => Math.pow(1.2, i));
    const getY = {
        'O(1)': () => 1,
        'O(log n)': x => Math.log2(x),
        'O(n)': x => x,
        'O(n log n)': x => x * Math.log2(x),
        'O(n²)': x => x * x
    }[complexity] || (x => x);

    points.push(...n.map(x => [x, getY(x)]));
    
    // Scale points
    const maxX = Math.max(...points.map(p => p[0]));
    const maxY = Math.max(...points.map(p => p[1]));
    const scaled = points.map(([x, y]) => [
        (Math.log2(x) / Math.log2(maxX)) * (width - 40) + 20,
        180 - (Math.log2(y + 1) / Math.log2(maxY + 1)) * 160
    ]);
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for(let i = 0; i < 5; i++) {
        const y = 20 + i * 40;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }
    
    // Draw curve
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    scaled.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Add gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.1)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(scaled[0][0], scaled[0][1]);
    scaled.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(scaled[scaled.length-1][0], 180);
    ctx.lineTo(scaled[0][0], 180);
    ctx.fill();
    
    container.appendChild(canvas);
}

function injectAnalysisUI(analysis) {
    const complexityStyles = {
        'O(1)': ['#15803d', '#dcfce7'],
        'O(log n)': ['#1e40af', '#dbeafe'],
        'O(n)': ['#854d0e', '#fef9c3'],
        'O(n log n)': ['#9a3412', '#ffedd5'],
        'O(n²)': ['#991b1b', '#fee2e2']
    }[analysis.timeComplexity] || ['#1f2937', '#f3f4f6'];

    const container = document.createElement('div');
    container.id = 'leetcode-analyzer-result';
    container.innerHTML = `
        <div style="
            max-width: 800px;
            margin: 24px auto;
            padding: 24px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05);
            font-family: system-ui, -apple-system, sans-serif;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0;">Time Complexity Analysis</h2>
                <span style="
                    background: ${complexityStyles[1]};
                    color: ${complexityStyles[0]};
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-weight: 500;
                    font-size: 14px;
                    letter-spacing: 0.025em;
                ">${analysis.timeComplexity}</span>
            </div>

            <div style="
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 24px;
                border: 1px solid #e2e8f0;
            ">
                <p style="margin: 0; color: #334155; line-height: 1.6;">${analysis.explanation}</p>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 18px; font-weight: 600; color: #334155; margin-bottom: 16px;">Growth Visualization</h3>
                <div id="complexity-graph" style="
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                "></div>
            </div>

            <div style="
                background: #eff6ff;
                border-radius: 12px;
                padding: 20px;
            ">
                <h3 style="
                    font-size: 18px;
                    font-weight: 600;
                    color: #1e40af;
                    margin: 0 0 16px 0;
                ">Optimization Insights</h3>
                ${analysis.optimizations.map((opt, i) => `
                    <div style="
                        display: flex;
                        gap: 12px;
                        margin-top: ${i === 0 ? '0' : '12px'};
                        padding: ${i === 0 ? '0' : '12px 0 0 0'};
                        border-top: ${i === 0 ? 'none' : '1px solid #bfdbfe'};
                    ">
                        <div style="
                            width: 24px;
                            height: 24px;
                            background: #bfdbfe;
                            border-radius: 6px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #1e40af;
                            font-weight: 500;
                            flex-shrink: 0;
                        ">${i + 1}</div>
                        <p style="margin: 0; color: #1e40af; line-height: 1.6;">${opt}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    const targetElement = document.querySelector('[data-track-load="description_content"]');
    if (targetElement) {
        targetElement.appendChild(container);
        drawComplexityGraph(analysis.timeComplexity, 'complexity-graph');
    }
}

// Then message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCode') {
        const result = extractCodeFromMonaco();
        if (result.success) {
            chrome.runtime.sendMessage({
                action: 'analyzeCode',
                code: result.code,
                language: result.language
            }, response => {
                console.log('Raw API Response:', response);
                if (response.success) {
                    try {
                        const rawText = response.data.candidates[0].content.parts[0].text;
                        const jsonString = rawText.replace(/```json\n?|\n?```/g, '');
                        const analysis = JSON.parse(jsonString);
                        injectAnalysisUI(analysis);
                    } catch (error) {
                        console.error('Error parsing analysis:', error);
                    }
                }
            });
        }
        sendResponse(result);
    }
    return true;
});