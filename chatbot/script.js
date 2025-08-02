//Script.js--->start

const GEMINI_API_KEY = 'AIzaSyDscEg9nh_U_PK_g8j_kRLCYvcEba9ulPs';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

const mikeButton = document.getElementById('mike-button');
const fileInput = document.getElementById('file-input');
const fileButton = document.getElementById('file-button');

const intentListDiv = document.getElementById('intent-list');
const unansweredListDiv = document.getElementById('unanswered-list');
const addPatternInput = document.getElementById('add-pattern');
const addAnswerTextarea = document.getElementById('add-answer');
const addIntentButton = document.getElementById('add-intent-button');


let intents = [];
let unansweredQuestions = [];

const synth = window.speechSynthesis;
let selectedVoice = null;
const DEFAULT_LANG = 'en-US';

let isSpeaking = false;
let isPaused = false;
let isProcessing = false; // New flag to track if a request is in progress

let selectedFile = null;

function setSendButtonState(state) {
    if (!sendButton) return;

    const sendIcon = sendButton.querySelector('.send-icon');
    const stopIcon = sendButton.querySelector('.stop-icon');
    const pauseIcon = sendButton.querySelector('.pause-icon');

    sendIcon.classList.remove('active-icon');
    stopIcon.classList.remove('active-icon');
    pauseIcon.classList.remove('active-icon');

    if (state === 'send') {
        sendIcon.classList.add('active-icon');
        sendButton.title = "Send Message";
    } else if (state === 'stop') {
        stopIcon.classList.add('active-icon');
        sendButton.title = "Stop Speech";
    } else if (state === 'pause') {
        pauseIcon.classList.add('active-icon');
        sendButton.title = "Speech Paused (Click to Stop)";
    }
}

function loadVoices() {
    const voices = synth.getVoices();
    selectedVoice = voices.find(voice => voice.lang === DEFAULT_LANG && voice.name.includes("Google") || voice.default) || voices[0];

    if (!selectedVoice && voices.length === 0) {
        synth.onvoiceschanged = () => {
            loadVoices();
        };
    }
}

loadVoices();


function speakText(text) {
    if (!synth || !text || !selectedVoice) {
        console.warn("Speech synthesis not available or voice not loaded.");
        setSendButtonState('send');
        return;
    }

    if (synth.speaking || synth.paused) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = DEFAULT_LANG;
    utterance.voice = selectedVoice;

    utterance.onstart = () => {
        isSpeaking = true;
        isPaused = false;
        setSendButtonState('stop');
        console.log('Speech started.');
    };

    utterance.onend = () => {
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send');
        console.log('Speech ended.');
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send');
    };

    synth.speak(utterance);
}

function stopSpeech() {
    if (synth.speaking || synth.paused) {
        synth.cancel();
        isSpeaking = false;
        isPaused = false;
        setSendButtonState('send');
        console.log('Speech stopped by user.');
    }
}

function pauseSpeech() {
    if (synth.speaking && !isPaused) {
        synth.pause();
        isPaused = true;
        setSendButtonState('pause');
        console.log('Speech paused.');
    }
}


function addMessage(text, sender, fileData = null, isTemporary = false) { // Added isTemporary parameter
    if (chatBox) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        if (isTemporary) { // Add a class if it's a temporary message
            messageDiv.classList.add('temporary-message');
        }

        if (fileData) {
            const fileElement = document.createElement('div');
            fileElement.style.marginBottom = '5px';

            if (fileData.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = fileData.content;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '150px';
                img.style.borderRadius = '5px';
                img.alt = 'Attached image';
                fileElement.appendChild(img);
            } else if (fileData.type === 'application/pdf') {
                const pdfLink = document.createElement('a');
                pdfLink.href = fileData.content;
                pdfLink.target = '_blank';
                pdfLink.textContent = `Attached PDF: ${fileData.name}`;
                pdfLink.style.display = 'block';
                pdfLink.style.textDecoration = 'underline';
                pdfLink.style.color = '#00bfa6';
                fileElement.appendChild(pdfLink);
            } else {
                const fileInfo = document.createElement('span');
                fileInfo.textContent = `Attached File: ${fileData.name} (${fileData.type})`;
                fileElement.appendChild(fileInfo);
            }
            messageDiv.appendChild(fileElement);
        }

        const textNode = document.createElement('span');
        textNode.textContent = text;
        messageDiv.appendChild(textNode);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('message-timestamp');
        timestampSpan.textContent = timeString;
        messageDiv.appendChild(timestampSpan);


        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        if (sender === 'bot') {
            // Check if it's the specific microphone prompt before speaking
            if (text !== "Listening... Please speak." && text !== "Microphone off.") {
                speakText(text);
            }
        }
    }
}

// Function to remove temporary messages
function removeTemporaryMessages() {
    const temporaryMessages = chatBox.querySelectorAll('.temporary-message');
    temporaryMessages.forEach(msg => msg.remove());
}


function removeThinkingMessage() {
    if (!chatBox) return;
    const thinkingMessage = chatBox.querySelector('.bot-message:last-child');
    if (thinkingMessage && thinkingMessage.textContent.includes("Thinking...")) {
        thinkingMessage.remove();
    }
}

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

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Function to enable/disable user input
function setInputState(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    mikeButton.disabled = !enabled; // Also disable mike button
    fileButton.disabled = !enabled; // Also disable file button
    if (enabled) {
        userInput.focus(); // Focus input when enabled
    }
}


async function getBotResponse(message, fileContent = null, mimeType = null) {
    const lowerCaseMessage = message.toLowerCase().trim();
    isProcessing = true; // Set processing flag to true
    setInputState(false); // Disable input and buttons

    if (!fileContent) {
        for (const intent of intents) {
            if (lowerCaseMessage.includes(intent.pattern.toLowerCase())) {
                removeTemporaryMessages(); // Remove "Listening..." messages
                isProcessing = false; // Reset processing flag
                setInputState(true); // Re-enable input and buttons
                return intent.answer;
            }
        }
    }

    showTypingIndicator();

    const contents = [];
    if (message) {
        contents.push({ text: message });
    }
    if (fileContent && mimeType) {
        const base64Data = fileContent.split(',')[1];
        contents.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });
    }

    if (contents.length === 0) {
        hideTypingIndicator();
        removeTemporaryMessages(); // Remove "Listening..." messages
        isProcessing = false; // Reset processing flag
        setInputState(true); // Re-enable input and buttons
        return "Please enter a message or attach a file to get a response.";
    }

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: contents }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();
        const geminiText = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I couldn't get a response from Neuronexus.";

        hideTypingIndicator();
        removeTemporaryMessages(); // Remove "Listening..." messages
        isProcessing = false; // Reset processing flag
        setInputState(true); // Re-enable input and buttons


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

        return geminiText;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        hideTypingIndicator();
        removeTemporaryMessages(); // Remove "Listening..." messages
        isProcessing = false; // Reset processing flag
        setInputState(true); // Re-enable input and buttons

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
    // Prevent sending if already processing
    if (isProcessing || isSpeaking || isPaused) {
        if (isSpeaking || isPaused) {
            stopSpeech(); // Allow stopping speech even if processing
        }
        return;
    }

    let message = userInput.value.trim();
    const file = selectedFile;

    if (message === '' && !file) {
        alert("Please enter a message or select a file.");
        return;
    }

    removeTemporaryMessages(); // Remove any existing "Listening..." messages before sending a new message

    if (file) {
        const reader = new FileReader();

        reader.onload = async function (e) {
            const fileContent = e.target.result;
            const mimeType = file.type;
            const fileName = file.name;

            addMessage(message, 'user', { content: fileContent, type: mimeType, name: fileName });

            userInput.value = '';
            fileInput.value = '';
            selectedFile = null;

            const botResponse = await getBotResponse(message, fileContent, mimeType);
            addMessage(botResponse, 'bot');
        };

        reader.readAsDataURL(file);
    } else {
        addMessage(message, 'user');
        userInput.value = '';
        const botResponse = await getBotResponse(message);
        addMessage(botResponse, 'bot');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    setSendButtonState('send');
    loadIntentsForChat();
    setInputState(true); // Ensure inputs are enabled on page load

    const chatIconButton = document.getElementById('chat-icon-button');
    const chatContainer = document.getElementById('chat-container');
    const closeBtn = document.querySelector('.chat-header .close-btn');
    const notificationBadge = document.querySelector('.notification-badge');

    let hasGreeted = false; // New flag to track if greeting has occurred

    function toggleChat() {
        const isOpening = !chatContainer.classList.contains('open');
        chatContainer.classList.toggle('open');

        if (isOpening) {
            if (chatIconButton) {
                chatIconButton.style.display = 'none';
                chatIconButton.classList.remove('pulse');
            }
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
                notificationBadge.textContent = '0';
            }
            // Add initial bot greeting message ONLY when opening for the first time
            if (chatBox && !hasGreeted) {
                addMessage("Hi there! Welcome to Neuronexus", 'bot');
                hasGreeted = true; // Set the flag to true after greeting
            }
            setInputState(true); // Ensure inputs are enabled when chat opens
        } else {
            if (chatIconButton) {
                chatIconButton.style.display = 'flex';
            }
            if (isSpeaking || isPaused) {
                stopSpeech();
            }
            setInputState(true); // Ensure inputs are enabled when chat closes (just in case)
        }
    }

    if (chatIconButton) chatIconButton.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);

    if (sendButton && userInput) {
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (isProcessing) { // Don't allow new messages if processing
                    return;
                }
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

    if (fileButton && fileInput) {
        fileButton.addEventListener('click', () => {
            if (isProcessing) { // Prevent file selection if processing
                alert("Please wait for the current response to complete.");
                return;
            }
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                alert(`File selected: ${selectedFile.name}. It will be sent with your next message.`);
            } else {
                selectedFile = null;
            }
        });
    }

    if (mikeButton && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.lang = DEFAULT_LANG;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            removeTemporaryMessages(); // Hide "Listening..." message when result is obtained
            sendMessage(); // Send the message
            // setInputState(true) is handled by sendMessage -> getBotResponse
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            removeTemporaryMessages(); // Hide "Listening..." message on error
            if (event.error === 'not-allowed') {
                addMessage("Microphone access denied. Please allow microphone in your browser settings.", 'bot');
            } else if (event.error === 'no-speech') {
                addMessage("No speech detected. Please try again.", 'bot');
            } else {
                addMessage(`Speech recognition error: ${event.error}`, 'bot');
            }
            mikeButton.classList.remove('recording');
            setInputState(true); // Re-enable input on error
        };

        recognition.onend = () => {
            mikeButton.classList.remove('recording');
            // 'onend' fires after 'onresult' or 'onerror', so the message should already be handled.
            // setInputState(true) is handled by sendMessage -> getBotResponse, or onerror.
        };

        mikeButton.addEventListener('click', () => {
            if (isProcessing) { // Prevent mic use if a request is already processing
                alert("Please wait for the current response to complete.");
                return;
            }

            if (mikeButton.classList.contains('recording')) {
                recognition.stop();
                removeTemporaryMessages(); // Hide "Listening..." message when mic is manually turned off
                setInputState(true); // Re-enable input when mic is stopped
            } else {
                try {
                    recognition.lang = DEFAULT_LANG;
                    recognition.start();
                    mikeButton.classList.add('recording');
                    setInputState(false); // Disable input and buttons immediately when mic starts
                    // Add a slight delay before speaking the "Listening..." message
                    // and mark it as temporary
                    setTimeout(() => {
                        addMessage("Listening... Please speak.", 'bot', null, true); // Mark as temporary
                    }, 200); // 200ms delay, adjust if needed
                } catch (e) {
                    console.error("Error starting speech recognition:", e);
                    alert("Could not start microphone. Ensure your browser supports it and you've granted permission.");
                    mikeButton.classList.remove('recording');
                    setInputState(true); // Re-enable input on error
                }
            }
        });
    } else if (mikeButton) {
        mikeButton.style.display = 'none';
        console.warn("Web Speech API (SpeechRecognition) not supported in this browser.");
    }

    if (addIntentButton) {
        addIntentButton.addEventListener('click', addIntent);
    }
    if (intentListDiv || unansweredListDiv) {
        loadIntents();
        loadUnansweredQuestions();
    }
});


function loadIntents() {
    const storedIntents = localStorage.getItem('chatbotIntents');
    if (storedIntents) {
        intents = JSON.parse(storedIntents);
    } else {
        intents = [
            { pattern: "hello", answer: "Hi there! How can I help you today?" },
            { pattern: "hi", answer: "Hello! What can I do for you?" },
            { pattern: "how are you", answer: "I'm a bot, so I don't have feelings, but thanks for asking!" },
            { pattern: "contact", answer: "You can reach us at support@example.com or call us at 123-456-7890." },
            { pattern: "thank you", answer: "You're welcome!" }
        ];
        saveIntents();
    }
    if (intentListDiv) {
        renderIntents();
    }
}

function loadIntentsForChat() {
    const storedIntents = localStorage.getItem('chatbotIntents');
    if (storedIntents) {
        intents = JSON.parse(storedIntents);
    } else {
        intents = [
            { pattern: "hello", answer: "Hi there! How can I help you today?" },
            { pattern: "hi", answer: "Hello! What can I do for you?" },
            { pattern: "how are you", answer: "I'm a bot, so I don't have feelings, but thanks for asking!" },
            { pattern: "contact", answer: "You can reach us at support@example.com or call us at 123-456-7890." },
            { pattern: "thank you", answer: "You're welcome!" }
        ];
        saveIntents();
    }
}


function saveIntents() {
    localStorage.setItem('chatbotIntents', JSON.stringify(intents));
}

function renderIntents() {
    if (!intentListDiv) return;

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
    if (!addPatternInput || !addAnswerTextarea) return;

    const pattern = addPatternInput.value.trim();
    const answer = addAnswerTextarea.value.trim();

    if (pattern && answer) {
        intents.push({ pattern, answer });
        saveIntents();
        renderIntents();
        addPatternInput.value = '';
        addAnswerTextarea.value = '';
    } else {
        alert("Please enter both a pattern and an answer.");
    }
}

function editIntent(index) {
    if (!intentListDiv) return;

    const newPattern = prompt("Edit pattern:", intents[index].pattern);
    const newAnswer = prompt("Edit answer:", intents[index].answer);

    if (newPattern !== null && newAnswer !== null) {
        intents[index].pattern = newPattern.trim();
        intents[index].answer = newAnswer.trim();
        saveIntents();
        renderIntents();
    }
}

function deleteIntent(index) {
    if (!intentListDiv) return;

    if (confirm(`Are you sure you want to delete the intent for "${intents[index].pattern}"?`)) {
        intents.splice(index, 1);
        saveIntents();
        renderIntents();
    }
}


function loadUnansweredQuestions() {
    const storedUnanswered = localStorage.getItem('unansweredChatQuestions');
    if (storedUnanswered) {
        unansweredQuestions = JSON.parse(storedUnanswered);
    }
    if (unansweredListDiv) {
        renderUnansweredQuestions();
    }
}

function saveUnansweredQuestions() {
    localStorage.setItem('unansweredChatQuestions', JSON.stringify(unansweredQuestions));
}

function renderUnansweredQuestions() {
    if (!unansweredListDiv) return;

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
    if (!unansweredListDiv) return;

    if (confirm(`Remove "${unansweredQuestions[index]}" from unanswered list?`)) {
        unansweredQuestions.splice(index, 1);
        saveUnansweredQuestions();
        renderUnansweredQuestions();
    }
}

function addUnansweredToIntentForm(index) {
    if (!addPatternInput || !addAnswerTextarea) return;

    const questionToAdd = unansweredQuestions[index];
    addPatternInput.value = questionToAdd;
    addAnswerTextarea.value = "Please provide an answer here...";
}