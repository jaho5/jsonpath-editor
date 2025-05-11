document.addEventListener('DOMContentLoaded', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonPathDisplay = document.getElementById('json-path');
    const errorDisplay = document.getElementById('error-display');
    const copyButton = document.getElementById('copy-btn');
    
    // Sample JSON for initial load
    const sampleJson = {
        "name": "John",
        "age": 30,
        "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA"
        },
        "hobbies": [
            "reading",
            "hiking",
            "coding"
        ],
        "contacts": [
            {
                "type": "email",
                "value": "john@example.com"
            },
            {
                "type": "phone",
                "value": "555-1234"
            }
        ]
    };
    
    // Initialize editor with sample JSON
    jsonEditor.value = JSON.stringify(sampleJson, null, 2);
    
    // Calculate JSONPath based on cursor position
    function calculateJsonPath(text, position) {
        if (!text.trim()) return '$';
        
        try {
            // Validate JSON first
            JSON.parse(text);
            
            // Find the path to cursor position
            let inString = false;
            let escapeNext = false;
            let inKey = false;
            let currentKey = '';
            let path = ['$'];
            let objStack = []; // Stack to track object/array nesting
            let indexStack = []; // Stack to track array indices
            
            for (let i = 0; i < position; i++) {
                const char = text[i];
                
                // Handle escape sequences
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                // String handling
                if (char === '"' && !escapeNext) {
                    inString = !inString;
                    
                    // End of a key
                    if (!inString && inKey) {
                        path.push(currentKey);
                        inKey = false;
                        currentKey = '';
                    }
                    
                    // Start of a key (after a colon it would be a value)
                    if (inString && !inKey && objStack[objStack.length - 1] === '{' && 
                        (i === 0 || /[\{\,]/.test(text.substring(0, i).trim().slice(-1)))) {
                        inKey = true;
                        currentKey = '';
                    }
                    
                    continue;
                }
                
                // Within a string
                if (inString) {
                    if (inKey) {
                        currentKey += char;
                    }
                    continue;
                }
                
                // Object start
                if (char === '{') {
                    objStack.push('{');
                    continue;
                }
                
                // Object end
                if (char === '}') {
                    objStack.pop();
                    // If we're exiting an object, remove the last key from the path
                    if (path.length > 1 && typeof path[path.length - 1] === 'string') {
                        path.pop();
                    }
                    continue;
                }
                
                // Array start
                if (char === '[') {
                    objStack.push('[');
                    indexStack.push(0);
                    // Add the initial array index (0) to the path
                    if (text[i+1] !== ']') { // Skip empty arrays
                        path.push(0);
                    }
                    continue;
                }
                
                // Array end
                if (char === ']') {
                    objStack.pop();
                    indexStack.pop();
                    // Remove array index from path
                    if (path.length > 1 && typeof path[path.length - 1] === 'number') {
                        path.pop();
                    }
                    continue;
                }
                
                // Handle commas
                if (char === ',') {
                    // In an array, increment the current index
                    if (objStack[objStack.length - 1] === '[') {
                        const newIndex = indexStack[indexStack.length - 1] + 1;
                        indexStack[indexStack.length - 1] = newIndex;
                        
                        // Update the path with the new index
                        if (typeof path[path.length - 1] === 'number') {
                            path[path.length - 1] = newIndex;
                        } else {
                            path.push(newIndex);
                        }
                    } else {
                        // In an object, remove the previous key
                        if (path.length > 1 && typeof path[path.length - 1] === 'string') {
                            path.pop();
                        }
                    }
                    continue;
                }
            }
            
            // Format the path to standard JSONPath notation
            return path.map((segment, index) => {
                if (index === 0) return segment;
                if (typeof segment === 'number') return `[${segment}]`;
                return `.${segment}`;
            }).join('');
            
        } catch (e) {
            showError(`Invalid JSON: ${e.message}`);
            return '$';
        }
    }
    
    // Update JSONPath when cursor moves
    function updateJsonPath() {
        const cursorPosition = jsonEditor.selectionStart;
        const path = calculateJsonPath(jsonEditor.value, cursorPosition);
        jsonPathDisplay.textContent = path;
    }
    
    // Show error message
    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.classList.remove('hidden');
    }
    
    // Hide error message
    function hideError() {
        errorDisplay.classList.add('hidden');
    }
    
    // Validate JSON
    function validateJson(text) {
        try {
            JSON.parse(text);
            hideError();
            return true;
        } catch (e) {
            showError(`Invalid JSON: ${e.message}`);
            return false;
        }
    }
    
    // Copy JSONPath to clipboard
    function copyJsonPath() {
        navigator.clipboard.writeText(jsonPathDisplay.textContent)
            .then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 1500);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    }
    
    // Event listeners
    jsonEditor.addEventListener('click', updateJsonPath);
    jsonEditor.addEventListener('keyup', updateJsonPath);
    
    jsonEditor.addEventListener('input', () => {
        validateJson(jsonEditor.value);
        updateJsonPath();
    });
    
    copyButton.addEventListener('click', copyJsonPath);
    
    // Initial validation
    validateJson(jsonEditor.value);
});