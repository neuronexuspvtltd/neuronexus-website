// WARNING: Exposing API key in frontend is a SECURITY RISK.
// For demonstration ONLY. Do NOT use in production.
const GEMINI_API_KEY = 'AIzaSyDscEg9nh_U_PK_g8j_kRLCYvcEba9ulPs'; // Replace with your actual API key suyash api = AIzaSyAGpfJ1dJA-fUGGjrF9m8qPOc9ZWZG3qeA
// IMPORTANT: Use gemini-pro-vision for image/multi-modal input
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

// Get references to elements that might exist on EITHER page
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// New elements for voice and file features
const mikeButton = document.getElementById('mike-button');
const fileInput = document.getElementById('file-input');
const fileButton = document.getElementById('file-button');

// Admin panel elements (might be null on index.html)
const intentListDiv = document.getElementById('intent-list');
const unansweredListDiv = document.getElementById('unanswered-list');
const addPatternInput = document.getElementById('add-pattern');
const addAnswerTextarea = document.getElementById('add-answer');
const addIntentButton = document.getElementById('add-intent-button');


let intents = [];
let unansweredQuestions = [];

// --- Speech Synthesis (Text-to-Speech) Variables ---
const synth = window.speechSynthesis;
let selectedVoice = null; // Will store the selected voice
const DEFAULT_LANG = 'en-US'; // Default to English

// --- Global state variables for speech control ---
let isSpeaking = false; // Tracks if AI is actively speaking
let isPaused = false;   // Tracks if AI speech is paused

// --- Global variable to store the selected file for sending ---
let selectedFile = null;

// --- Helper function to update send button icon state ---
function setSendButtonState(state) {
    if (!sendButton) return; // Ensure button exists on the page

    const sendIcon = sendButton.querySelector('.send-icon');
    const stopIcon = sendButton.querySelector('.stop-icon');
    const pauseIcon = sendButton.querySelector('.pause-icon');

    // Remove active class from all icons first
    sendIcon.classList.remove('active-icon');
    stopIcon.classList.remove('active-icon');
    pauseIcon.classList.remove('active-icon');

    // Add active class to the desired icon and update title
    if (state === 'send') {
        sendIcon.classList.add('active-icon');
        sendButton.title = "Send Message";
    } else if (state === 'stop') {
        stopIcon.classList.add('active-icon');
        sendButton.title = "Stop Speech";
    } else if (state === 'pause') {
        pauseIcon.classList.add('active-icon');
        sendButton.title = "Speech Paused (Click to Stop)"; // Changed title for clarity
    }
}

// Function to load and select voices based on the default language
function loadVoices() {
    const voices = synth.getVoices();
    selectedVoice = voices.find(voice => voice.lang === DEFAULT_LANG && voice.name.includes("Google") || voice.default) || voices[0];

    if (!selectedVoice && voices.length === 0) {
        synth.onvoiceschanged = () => {
            loadVoices(); // Try again once voices are loaded
        };
    }
}

// Initial load of voices when the script runs
loadVoices();


// --- Speech Control Functions ---

function speakText(text) {
    if (!synth || !text || !selectedVoice) {
        console.warn("Speech synthesis not available or voice not loaded.");
        setSendButtonState('send'); // Ensure button is 'Send' if speech can't start
        return;
    }

    // If already speaking, cancel current speech before starting new one
    if (synth.speaking || synth.paused) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = DEFAULT_LANG;
    utterance.voice = selectedVoice;

    utterance.onstart = () => {
        isSpeaking = true;
        isPaused = false;
        setSendButtonState('stop'); // Change to stop button when speaking starts
        console.log('Speech started.');
    };

    utterance.onend = () => {
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send'); // Change back to send button when speech ends
        console.log('Speech ended.');
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send'); // Revert on error
    };

    synth.speak(utterance);
}

function stopSpeech() {
    if (synth.speaking || synth.paused) { // Stop if speaking or paused
        synth.cancel();
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send'); // Always go back to send after stopping
        console.log('Speech stopped by user.');
    }
}

function pauseSpeech() {
    if (synth.speaking && !isPaused) {
        synth.pause();
        isPaused = true;
        setSendButtonState('pause'); // Change to pause icon
        console.log('Speech paused.');
    }
}


// --- Chatbot Core Functions ---

// Modified addMessage to handle displaying file previews (e.g., image thumbnail)
function addMessage(text, sender, fileData = null) {
    if (chatBox) { // Ensure chatBox exists before trying to add message
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // If file data is provided, create an image or file link
        if (fileData) {
            const fileElement = document.createElement('div');
            fileElement.style.marginBottom = '5px'; // Small spacing

            if (fileData.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = fileData.content; // Use the data URL as source
                img.style.maxWidth = '100%';
                img.style.maxHeight = '150px'; // Limit preview size
                img.style.borderRadius = '5px';
                img.alt = 'Attached image';
                fileElement.appendChild(img);
            } else if (fileData.type === 'application/pdf') {
                const pdfLink = document.createElement('a');
                pdfLink.href = fileData.content; // data URL
                pdfLink.target = '_blank';
                pdfLink.textContent = `Attached PDF: ${fileData.name}`;
                pdfLink.style.display = 'block';
                pdfLink.style.textDecoration = 'underline';
                pdfLink.style.color = '#00bfa6'; /* Example link color */
                fileElement.appendChild(pdfLink);
            } else {
                // For other file types (like .txt, .json, .csv)
                const fileInfo = document.createElement('span');
                fileInfo.textContent = `Attached File: ${fileData.name} (${fileData.type})`;
                fileElement.appendChild(fileInfo);
            }
            messageDiv.appendChild(fileElement); // Append file element before text
        }

        const textNode = document.createElement('span');
        textNode.textContent = text;
        messageDiv.appendChild(textNode);

        // Add timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('message-timestamp');
        timestampSpan.textContent = timeString;
        messageDiv.appendChild(timestampSpan);


        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom

        if (sender === 'bot') {
            speakText(text); // Speak bot's message
        }
    }
}

// Helper to remove "Thinking..." message
function removeThinkingMessage() {
    if (!chatBox) return;
    const thinkingMessage = chatBox.querySelector('.bot-message:last-child');
    if (thinkingMessage && thinkingMessage.textContent.includes("Thinking...")) { // Check for "Thinking..." text
        thinkingMessage.remove();
    }
}

// Add typing indicator
function showTypingIndicator() {
    if (!chatBox) return;
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Remove typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}


async function getBotResponse(message, fileContent = null, mimeType = null) {
    const lowerCaseMessage = message.toLowerCase().trim();

    // 1. Check Pre-defined Intents
    // Only check intents if there's no file attached.
    // If a file is attached, Gemini is usually the primary source for response.
    if (!fileContent) {
        for (const intent of intents) {
            if (lowerCaseMessage.includes(intent.pattern.toLowerCase())) {
                return intent.answer;
            }
        }
    }

    // 2. Fallback to Gemini (WARNING: API Key Exposure)
    showTypingIndicator(); // Show thinking indicator when going to Gemini

    const contents = [];
    // Add text part if available
    if (message) {
        contents.push({ text: message });
    }
    // Add file part if available
    if (fileContent && mimeType) {
        // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = fileContent.split(',')[1];
        contents.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });
    }

    if (contents.length === 0) {
        hideTypingIndicator(); // Hide indicator if no content
        return "Please enter a message or attach a file to get a response.";
    }

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: contents }] // Wrap contents in 'parts' array
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();
        const geminiText = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I couldn't get a response from Gemini.";

        hideTypingIndicator();

        // Add to Unanswered Questions if Gemini responded AND no predefined intent caught it.
        // This logic is crucial to ensure only truly unanswered *text* questions are logged.
        let isIntentAnswered = false;
        if (!fileContent) { // Only check for text messages if they were answered by intent system
            for (const intent of intents) {
                if (lowerCaseMessage.includes(intent.pattern.toLowerCase())) {
                    isIntentAnswered = true;
                    break;
                }
            }
        }

        if (!isIntentAnswered && !unansweredQuestions.includes(lowerCaseMessage) && lowerCaseMessage !== "") { // Don't log empty messages
            unansweredQuestions.push(lowerCaseMessage);
            saveUnansweredQuestions();
        }

        return geminiText;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        hideTypingIndicator();

        // Log the question to unanswered if there was an error with Gemini too,
        // and it wasn't caught by an intent.
        let isIntentAnswered = false;
        if (!fileContent) {
            for (const intent of intents) {
                if (lowerCaseMessage.includes(intent.pattern.toLowerCase())) {
                    isIntentAnswered = true;
                    break;
                }
            }
        }
        if (!isIntentAnswered && !unansweredQuestions.includes(lowerCaseMessage) && lowerCaseMessage !== "") {
            unansweredQuestions.push(lowerCaseMessage);
            saveUnansweredQuestions();
        }

        return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    }
}


async function sendMessage() {
    // If AI is currently speaking or paused, a click on send button means STOP
    if (isSpeaking || isPaused) {
        stopSpeech();
        return; // Do not proceed with sending a new message
    }

    let message = userInput.value.trim();
    const file = selectedFile; // Get the stored selected file

    if (message === '' && !file) {
        alert("Please enter a message or select a file.");
        return;
    }

    // Handle file input if a file is selected
    if (file) {
        const reader = new FileReader();

        reader.onload = async function (e) {
            const fileContent = e.target.result; // This will be the Base64 data URL
            const mimeType = file.type;
            const fileName = file.name;

            // Display user message with file preview
            addMessage(message, 'user', { content: fileContent, type: mimeType, name: fileName });

            // Clear input and file after display
            userInput.value = ''; // Clear input after sending
            fileInput.value = ''; // Clear the actual file input
            selectedFile = null; // Clear the global variable

            // Get response from bot
            const botResponse = await getBotResponse(message, fileContent, mimeType);
            addMessage(botResponse, 'bot');
        };

        // Read the file as a Data URL (Base64) for images and PDFs
        // For .txt, .json, .csv, we still read as Data URL, and Gemini will handle it.
        reader.readAsDataURL(file);
    } else {
        // No file, just send the text message
        addMessage(message, 'user');
        userInput.value = '';
        const botResponse = await getBotResponse(message);
        addMessage(botResponse, 'bot');
    }
}


// --- Event Listeners for Chatbot UI ---
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state of send button
    setSendButtonState('send');
    loadIntentsForChat(); // Load intents for the chat UI

    // Chat widget toggle functionality
    const chatIconButton = document.getElementById('chat-icon-button');
    const chatContainer = document.getElementById('chat-container');
    const closeBtn = document.querySelector('.chat-header .close-btn');
    const notificationBadge = document.querySelector('.notification-badge');

    // Toggle chat container
    function toggleChat() {
        const isOpening = !chatContainer.classList.contains('open');
        chatContainer.classList.toggle('open');

        if (isOpening) {
            chatIconButton.style.display = 'none';
            notificationBadge.style.display = 'none';
        } else {
            chatIconButton.style.display = 'flex';
            // Stop speech if chat is closed while speaking or paused
            if (isSpeaking || isPaused) {
                stopSpeech();
            }
        }
    }

    if (chatIconButton) chatIconButton.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);

    // Simulate new message notification (for demo purposes)
    if (notificationBadge && chatIconButton) {
        setTimeout(() => {
            notificationBadge.style.display = 'flex';
            notificationBadge.textContent = '1';
            chatIconButton.classList.add('pulse');

            setTimeout(() => {
                chatIconButton.classList.remove('pulse');
            }, 1000);
        }, 3000);
    }

    // Simulate initial bot message on load (only on chat page)
    if (chatBox) {
        setTimeout(() => {
            const initialMessage = "Hello! I'm your virtual assistant. How can I help you today?";
            addMessage(initialMessage, false);
            // speech is handled inside addMessage for bot responses
        }, 1000);
    }

    // Attach event listeners for main chat elements
    if (sendButton && userInput) {
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // If AI is speaking, pause it. If paused, stop it. Otherwise, send the message.
                if (isSpeaking) {
                    pauseSpeech();
                } else if (isPaused) {
                    stopSpeech();
                } else {
                    sendMessage();
                }
            }
        });
    }

    // Handle file button click
    if (fileButton && fileInput) {
        fileButton.addEventListener('click', () => {
            fileInput.click(); // Trigger the hidden file input click
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0]; // Store the selected file
                alert(`File selected: ${selectedFile.name}. It will be sent with your next message.`);
            } else {
                selectedFile = null; // No file selected
            }
        });
    }

    // Handle microphone input
    if (mikeButton && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false; // Listen for a single utterance
        recognition.lang = DEFAULT_LANG; // Set language to default (en-US)
        recognition.interimResults = false; // Only return final results

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript; // Put transcribed text into input
            sendMessage(); // Automatically send message after speech
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                addMessage("Microphone access denied. Please allow microphone in your browser settings.", 'bot');
            } else if (event.error === 'no-speech') {
                addMessage("No speech detected. Please try again.", 'bot');
            } else {
                addMessage(`Speech recognition error: ${event.error}`, 'bot');
            }
            mikeButton.classList.remove('recording');
        };

        recognition.onend = () => {
            mikeButton.classList.remove('recording');
            addMessage("Microphone off.", 'bot');
        };

        mikeButton.addEventListener('click', () => {
            if (mikeButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                try {
                    recognition.lang = DEFAULT_LANG; // Update lang before starting
                    recognition.start();
                    mikeButton.classList.add('recording');
                    addMessage("Listening... Please speak.", 'bot');
                } catch (e) {
                    console.error("Error starting speech recognition:", e);
                    alert("Could not start microphone. Ensure your browser supports it and you've granted permission.");
                    mikeButton.classList.remove('recording');
                }
            }
        });
    } else if (mikeButton) {
        mikeButton.style.display = 'none'; // Hide button if API not supported
        console.warn("Web Speech API (SpeechRecognition) not supported in this browser.");
    }

    // --- Admin Panel Specific Listeners (only if elements exist) ---
    if (addIntentButton) {
        addIntentButton.addEventListener('click', addIntent);
    }
    // Load data for admin panel if on that page
    if (intentListDiv || unansweredListDiv) {
        loadIntents(); // This will also call renderIntents
        loadUnansweredQuestions(); // This will also call renderUnansweredQuestions
    }
});


// --- Local Storage Management (shared between chat & admin) ---

function loadIntents() {
    const storedIntents = localStorage.getItem('chatbotIntents');
    if (storedIntents) {
        intents = JSON.parse(storedIntents);
    } else {
        // Default intents if none are stored
        intents = [
            { pattern: "hello", answer: "Hi there! How can I help you today?" },
            { pattern: "hi", answer: "Hello! What can I do for you?" },
            { pattern: "how are you", answer: "I'm a bot, so I don't have feelings, but thanks for asking!" },
            { pattern: "contact", answer: "You can reach us at support@example.com or call us at 123-456-7890." },
            { pattern: "thank you", answer: "You're welcome!" }
        ];
        saveIntents();
    }
    if (intentListDiv) { // Only render if on admin page
        renderIntents();
    }
}

function loadIntentsForChat() { // Specific function for chat page to avoid rendering admin UI
    const storedIntents = localStorage.getItem('chatbotIntents');
    if (storedIntents) {
        intents = JSON.parse(storedIntents);
    } else {
        // Default intents if none are stored (same as loadIntents for consistency)
        intents = [
            { pattern: "hello", answer: "Hi there! How can I help you today?" },
            { pattern: "hi", answer: "Hello! What can I do for you?" },
            { pattern: "how are you", answer: "I'm a bot, so I don't have feelings, but thanks for asking!" },
            { pattern: "contact", answer: "You can reach us at support@example.com or call us at 123-456-7890." },
            { pattern: "thank you", answer: "You're welcome!" }
        ];
        saveIntents(); // Save if defaults were just set
    }
}


function saveIntents() {
    localStorage.setItem('chatbotIntents', JSON.stringify(intents));
}

// --- Admin Panel Functions (used by admin.html) ---

function renderIntents() {
    if (!intentListDiv) return; // Only run if on admin page

    intentListDiv.innerHTML = '';
    intents.forEach((intent, index) => {
        const item = document.createElement('div');
        item.classList.add('intent-item');
        item.innerHTML = `
            <span><strong>Pattern:</strong> "${intent.pattern}" <br> <strong>Answer:</strong> "${intent.answer}"</span>
            <div>
                <button class="edit" onclick="editIntent(${index})">Edit</button>
                <button class="delete" onclick="deleteIntent(${index})">Delete</button>
            </div>
        `;
        intentListDiv.appendChild(item);
    });
}

function addIntent() {
    if (!addPatternInput || !addAnswerTextarea) return; // Only run if on admin page

    const pattern = addPatternInput.value.trim();
    const answer = addAnswerTextarea.value.trim();

    if (pattern && answer) {
        intents.push({ pattern, answer });
        saveIntents();
        renderIntents(); // Re-render the list on admin page
        addPatternInput.value = '';
        addAnswerTextarea.value = '';
    } else {
        alert("Please enter both a pattern and an answer.");
    }
}

function editIntent(index) {
    if (!intentListDiv) return; // Only run if on admin page

    const newPattern = prompt("Edit pattern:", intents[index].pattern);
    const newAnswer = prompt("Edit answer:", intents[index].answer);

    if (newPattern !== null && newAnswer !== null) { // null if user cancels prompt
        intents[index].pattern = newPattern.trim();
        intents[index].answer = newAnswer.trim();
        saveIntents();
        renderIntents();
    }
}

function deleteIntent(index) {
    if (!intentListDiv) return; // Only run if on admin page

    if (confirm(`Are you sure you want to delete the intent for "${intents[index].pattern}"?`)) {
        intents.splice(index, 1);
        saveIntents();
        renderIntents();
    }
}


// --- Unanswered Questions Management (shared functions, rendered by admin.html) ---

function loadUnansweredQuestions() {
    const storedUnanswered = localStorage.getItem('unansweredChatQuestions');
    if (storedUnanswered) {
        unansweredQuestions = JSON.parse(storedUnanswered);
    }
    if (unansweredListDiv) { // Only render if on admin page
        renderUnansweredQuestions();
    }
}

function saveUnansweredQuestions() {
    localStorage.setItem('unansweredChatQuestions', JSON.stringify(unansweredQuestions));
}

function renderUnansweredQuestions() {
    if (!unansweredListDiv) return; // Only run if on admin page

    unansweredListDiv.innerHTML = '';
    if (unansweredQuestions.length === 0) {
        unansweredListDiv.textContent = "No unanswered questions yet.";
        return;
    }
    unansweredQuestions.forEach((question, index) => {
        const item = document.createElement('div');
        item.classList.add('unanswered-item');
        item.innerHTML = `
            <span>"${question}"</span>
            <div>
                <button class="add-as-intent" onclick="addUnansweredToIntentForm(${index})">Add as Intent</button>
                <button class="delete" onclick="deleteUnanswered(${index})">Delete</button>
            </div>
        `;
        unansweredListDiv.appendChild(item);
    });
}

function deleteUnanswered(index) {
    if (!unansweredListDiv) return; // Only run if on admin page

    if (confirm(`Remove "${unansweredQuestions[index]}" from unanswered list?`)) {
        unansweredQuestions.splice(index, 1);
        saveUnansweredQuestions();
        renderUnansweredQuestions();
    }
}

// Pre-fills the Add Intent form with an unanswered question
function addUnansweredToIntentForm(index) {
    if (!addPatternInput || !addAnswerTextarea) return; // Ensure elements exist

    const questionToAdd = unansweredQuestions[index];
    addPatternInput.value = questionToAdd;
    addAnswerTextarea.value = "Please provide an answer here..."; // Suggest an answer
}