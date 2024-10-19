const video = document.getElementById('video');
const audioElement = document.getElementById('audio');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d', { willReadFrequently: true });

const canvassub = document.getElementById('canvas-sub');
const contextsub = canvassub.getContext('2d', { willReadFrequently: true });

const apiKey1 = 'YjVjZmI1MjYzYWY0NDA5MWIyMzMzMjQzODNiYzA1Nzc';
const apiKey2 = 'MzNjMTU2Mzk2YmIwNDUyZWI5NWQ1ZTEwNGQ2YmZkMWI';

let pub;
let sub;

let isWebSocketOpen = false;

let mediaRecorder;
let audioChunks = [];

function setPubStreamId() {
    const pubStreamInput = document.getElementById('pub-stream').value;

    // Validate pubStreamInput value
    if (pubStreamInput !== '1' && pubStreamInput !== '2') {
        alert("Please enter 1 or 2 for Pub Stream");
        return;
    }

    const pubStreamId = encodeURIComponent(`0x5dbef432d012c8d20993214f2c3765e9cf83d180/avatarchat-${pubStreamInput}`);

    // Close existing WebSocket connection if open
    if (pub) {
        pub.close();
    }

    // Reconnect WebSocket with the new pub stream ID
    pub = new WebSocket(`wss://evenly-enormous-malamute.ngrok-free.app/streams/${pubStreamId}/publish?apiKey=${apiKey1}`);

    // Set up event handlers for the new WebSocket connection
    pub.onopen = function () {
        console.log('Connected to the WebSocket for sending data.');
        isWebSocketOpen = true;
    };

    pub.onerror = function (err) {
        console.error('WebSocket error (publishing):', err);
    };

    pub.onclose = function () {
        console.log('WebSocket connection closed (publishing).');
        isWebSocketOpen = false;

        // Retry connection after a delay if it wasn't manually closed
        setTimeout(setPubStreamId, 5000);
    };

    console.log('WebSocket connection updated with new pub stream ID:', pubStreamId);
}

function sendData(data) {
    if (isWebSocketOpen && pub.readyState === WebSocket.OPEN) {
        pub.send(data);
    } else {
        console.error('WebSocket is not open. Cannot send data.');
    }
}

function setSubStreamId() {
    const subStreamInput = document.getElementById('sub-stream').value;

    // Validate subStreamInput value
    if (subStreamInput !== '1' && subStreamInput !== '2') {
        alert("Please enter 1 or 2 for Sub Stream");
        return;
    }

    const subStreamId = encodeURIComponent(`0x5dbef432d012c8d20993214f2c3765e9cf83d180/avatarchat-${subStreamInput}`);

    // Close existing WebSocket connection if open
    if (sub) {
        sub.close();
    }

    // Reconnect WebSocket with the new sub stream ID
    sub = new WebSocket(`wss://evenly-enormous-malamute.ngrok-free.app/streams/${subStreamId}/subscribe?apiKey=${apiKey2}`);

    // Set up event handlers for the new WebSocket connection
    sub.onopen = function () {
        console.log('Connected to the WebSocket for receiving data.');
        isWebSocketOpen = true;

        processFrame();
    };

    sub.onerror = function (err) {
        console.error('WebSocket error (subscribing):', err);
    };

    sub.onclose = function () {
        console.log('WebSocket connection closed (subscribing).');
    };

    // Handle incoming messages (video frames and audio)
    sub.onmessage = (event) => {
        let parsedData;
        try {
            parsedData = JSON.parse(event.data);
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return;
        }

        if (parsedData.video) {
            const base64Image = parsedData.video;
            const img = new Image();
            img.onload = () => {
                contextsub.drawImage(img, 0, 0, canvassub.width, canvassub.height);
            };
            img.src = 'data:image/png;base64,' + base64Image;
        }

        if (parsedData.audio) {
            // Decode base64 audio data
            const base64Audio = parsedData.audio;
            const audioBlob = base64ToBlob(base64Audio, 'audio/webm');

            // Play the audio
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(error => {
                console.error('Audio playback failed:', error);
            });

            // Clean up the object URL after the audio is done playing
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        }

    };

    console.log('WebSocket connection updated with new sub stream ID:', subStreamId);
}

    // Convert base64 string to Blob
    function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}                   

// Access the webcam and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        video.srcObject = stream;

    // Set up the MediaRecorder for capturing audio
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];

        // Convert the audio blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];

            // Send the base64 audio string to the WebSocket server
            if (isWebSocketOpen) {
                pub.send(JSON.stringify({ audio: base64Audio }));
            } else {
                console.error('WebSocket is not open. Cannot send data.');
            }
        };
        reader.readAsDataURL(audioBlob);
    };

    // Start recording
    mediaRecorder.start();

    // Stop recording every 5 seconds and start again
    setInterval(() => {
        mediaRecorder.stop();
        mediaRecorder.start();
    }, 5000);
})
.catch(err => {
    console.error("Error accessing the microphone: " + err);
});


// Sobel edge detection algorithm
function applySobelFilter(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const gray = new Uint8ClampedArray(width * height);

    // Convert to grayscale
    for (let i = 0; i < gray.length; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        gray[i] = 0.3 * r + 0.59 * g + 0.11 * b;
    }

    // Sobel kernels
    const sobelX = [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1
    ];
    const sobelY = [
        -1, -2, -1,
        0, 0, 0,
        1, 2, 1
    ];

    // Apply Sobel filter
    const output = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0;
            let gy = 0;

            // Convolve with Sobel kernels
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelVal = gray[(y + ky) * width + (x + kx)];
                    gx += pixelVal * sobelX[(ky + 1) * 3 + (kx + 1)];
                    gy += pixelVal * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
            }

            // Compute gradient magnitude
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            output[y * width + x] = magnitude > 128 ? 255 : 0; // Edge threshold
        }
    }

    // Set edge data to imageData
    for (let i = 0; i < output.length; i++) {
        const value = output[i];
        imageData.data[i * 4] = value > 0 ? 139 : 0;    // Red
        imageData.data[i * 4 + 1] = value > 0 ? 117 : 0; // Green
        imageData.data[i * 4 + 2] = 0;                  // Blue
        imageData.data[i * 4 + 3] = 255;                // Full opacity

    }
}

// Draw the video frame to the canvas, apply edge detection, and send to WebSocket
function processFrame() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    applySobelFilter(frame);
    context.putImageData(frame, 0, 0);

    // Convert the processed frame to a base64 string
    const base64Image = canvas.toDataURL('image/png').split(',')[1];

    // Send the base64 string to the WebSocket server
    if (isWebSocketOpen) {
        sendData(JSON.stringify({ video: base64Image }));
    } else {
        console.error('WebSocket is not open. Cannot send data.');
    }

    requestAnimationFrame(processFrame);
}

