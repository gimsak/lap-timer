// Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const timerDiv = document.getElementById('timer');
const lapsDiv = document.getElementById('laps');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const finalLapBtn = document.getElementById('finalLapBtn');
const zoomRange = document.getElementById('zoomRange');
const trackCountInput = document.getElementById('trackCount');
const timeLimitMinutesInput = document.getElementById('timeLimitMinutes');
const timeLimitSecondsInput = document.getElementById('timeLimitSeconds');
const timeLimitMsInput = document.getElementById('timeLimitMs');
const cameraStatusText = document.getElementById('camera-status-text');
const cameraStatusContainer = document.getElementById('camera-status');
const requestCameraBtn = document.getElementById('requestCameraBtn');

// Add snapshot elements
const snapshotContainer = document.getElementById('snapshot-container');
const snapshotCanvas = document.getElementById('snapshot');
const snapshotCtx = snapshotCanvas.getContext('2d');
const snapshotInfo = snapshotContainer.querySelector('.snapshot-info .badge');

// Add fullscreen functionality
const fullscreenBtn = document.getElementById('fullscreenBtn');

// Variables
let running = false;
let trackCount = 3;
let trackNames = [];
let trackData = [];
let lastFrame = null;
let motionCooldownTime = 500;
let mainStartTime = 0;
let mainFinishTime = 0;
let mainTimerInterval = null;
let finishOrder = [];
let lastDetected = [];
let isFinalLap = false;
let finishImages = [];
let timeLimitMs = 60000;
let timeLimitTimeoutId = null;
let timeLimitTargetTime = 0;
let motionAnimationId = null;
let cameraReady = false;
let isFirstDetection = true;

// Camera setup
async function setupCamera() {
  updateCameraStatus('waiting', 'Waiting for camera permission...');
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateCameraStatus('error', 'Error: Your browser does not support camera access');
    return false;
  }

  try {
    const constraints = { 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 }
      }, 
      audio: false 
    };

    updateCameraStatus('waiting', 'Requesting camera permission...');
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
      setTimeout(resolve, 1000);
    });

    await video.play();
    
    cameraReady = true;
    updateCameraStatus('success', 'Camera active and ready to use');
    return true;
  } catch (err) {
    console.error('Camera error:', err);
    let errorMsg = '';
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMsg = 'Camera access denied. Please enable camera permission in your browser settings.';
    } else if (err.name === 'NotFoundError') {
      errorMsg = 'No camera detected on your device.';
    } else if (err.name === 'NotReadableError') {
      errorMsg = 'Camera is being used by another application. Close that application and try again.';
    } else {
      errorMsg = `Error: ${err.message || 'Could not access camera'}`;
    }
    
    updateCameraStatus('error', errorMsg);
    return false;
  }
}

function updateCameraStatus(status, message) {
  cameraStatusText.textContent = message;
  cameraStatusContainer.classList.remove('error', 'success');
  
  if (status === 'error') {
    cameraStatusContainer.classList.add('error');
    requestCameraBtn.style.display = 'inline-block';
  } else if (status === 'success') {
    cameraStatusContainer.classList.add('success');
    requestCameraBtn.style.display = 'none';
  } else {
    requestCameraBtn.style.display = 'inline-block';
  }
}

function renderCamera() {
  if (!cameraReady || video.readyState < 2) {
    requestAnimationFrame(renderCamera);
    return;
  }

  const zoomLevel = Number(zoomRange.value);
  
  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (zoomLevel > 1) {
      const scaledWidth = canvas.width / zoomLevel;
      const scaledHeight = canvas.height / zoomLevel;
      const centerX = (video.videoWidth - scaledWidth) / 2;
      const centerY = (video.videoHeight - scaledHeight) / 2;
      
      ctx.drawImage(
        video,
        centerX, centerY, scaledWidth, scaledHeight,
        0, 0, canvas.width, canvas.height
      );
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    
    drawTrackLines();
  } catch (err) {
    console.error('Error rendering camera:', err);
    updateCameraStatus('error', 'Error loading camera feed');
    cameraReady = false;
  }
  
  requestAnimationFrame(renderCamera);
}

function drawTrackLines() {
  const w = canvas.width;
  const h = canvas.height;
  const areaW = Math.floor(w / trackCount);
  
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  
  for (let i = 1; i < trackCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * areaW, 0);
    ctx.lineTo(i * areaW, h);
    ctx.stroke();
  }
}

function getTrackNames(n) {
  return Array.from({length: n}, (_, i) => String.fromCharCode(65 + i));
}

function formatTime(ms) {
  if (!ms || ms <= 0) return '00:00.000';
  const date = new Date(ms);
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const sec = String(date.getUTCSeconds()).padStart(2, '0');
  const msStr = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${min}:${sec}.${msStr}`;
}

function updateDisplay() {
  if (!mainStartTime) {
    timerDiv.innerHTML = '00:00.000';
    timerDiv.style.color = '#fff';
    return;
  }

  const currentTime = Date.now();
  const elapsedTime = mainFinishTime ? mainFinishTime - mainStartTime : currentTime - mainStartTime;
  
  if (running) {
    if (timeLimitTargetTime > 0) {
      const timeRemaining = Math.max(0, timeLimitTargetTime - currentTime);
      const percentRemaining = (timeRemaining / timeLimitMs) * 100;
      
      timerDiv.style.color = percentRemaining < 10 ? '#dc3545' : percentRemaining < 25 ? '#ffc107' : '#fff';
      timerDiv.innerHTML = `${formatTime(elapsedTime)}<br><small>${isFinalLap ? 'FINAL LAP' : 'Race'} | Remaining: ${formatTime(timeRemaining)}</small>`;
    } else {
      timerDiv.innerHTML = `${formatTime(elapsedTime)}<br><small>${isFinalLap ? 'FINAL LAP' : 'Race'}</small>`;
    }
  } else if (mainFinishTime) {
    timerDiv.style.color = mainFinishTime === timeLimitTargetTime ? '#dc3545' : '#198754';
    timerDiv.innerHTML = `${formatTime(elapsedTime)}<br><small>${isFinalLap ? 'FINAL LAP COMPLETE' : 'RACE COMPLETE'}</small>`;
  }

  let lapsHtml = '';
  
  if (mainFinishTime === timeLimitTargetTime) {
    lapsHtml += '<div class="race-status">Time Limit Reached - Unfinished Cars Marked as DNF</div>';
  }

  // Show track status cards
  lapsHtml += '<div class="row g-3">';
  trackNames.forEach(name => {
    const lastDetection = lastDetected.find(d => d.name === name);
    const hasFinished = isFinalLap && finishOrder.find(f => f.name === name);
    const position = hasFinished ? finishOrder.findIndex(f => f.name === name) + 1 : null;
    const isDNF = mainFinishTime && !hasFinished;
    
    lapsHtml += `
      <div class="col-md-6 track-status">
        <div class="card ${hasFinished ? 'bg-success bg-opacity-25' : isDNF ? 'bg-danger bg-opacity-25' : 'bg-secondary'}">
          <div class="card-body">
            <h5 class="track-name">Track ${name}</h5>`;
    
    // Only show time if car has finished in final lap
    if (hasFinished) {
      lapsHtml += `
            <div class="track-time">
              ${formatTime(finishOrder.find(f => f.name === name).time)}
            </div>`;
    }

    lapsHtml += `
            <div class="track-status-badge ${hasFinished ? 'status-running' : isDNF ? 'status-dnf' : 'status-running'}">
              ${hasFinished ? `Position #${position}` : isDNF ? 'DNF' : 'Ready'}
            </div>
          </div>
        </div>
      </div>`;
  });
  lapsHtml += '</div>';

  lapsDiv.innerHTML = lapsHtml;
}

// Add time limit validation functions
function validateTimeInputs() {
  // Validate minutes (0-59)
  let minutes = parseInt(timeLimitMinutesInput.value) || 0;
  if (minutes < 0) minutes = 0;
  if (minutes > 59) minutes = 59;
  timeLimitMinutesInput.value = minutes;

  // Validate seconds (0-59)
  let seconds = parseInt(timeLimitSecondsInput.value) || 0;
  if (seconds < 0) seconds = 0;
  if (seconds > 59) seconds = 59;
  timeLimitSecondsInput.value = seconds;

  // Validate milliseconds (0-999)
  let ms = parseInt(timeLimitMsInput.value) || 0;
  if (ms < 0) ms = 0;
  if (ms > 999) ms = 999;
  timeLimitMsInput.value = ms;

  // Calculate total milliseconds
  timeLimitMs = (minutes * 60 * 1000) + (seconds * 1000) + ms;
}

function takeSnapshot() {
  // Draw current frame to snapshot canvas
  snapshotCtx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
  
  // Show snapshot container and hide live camera
  snapshotContainer.style.display = 'block';
  document.querySelector('.card.bg-secondary.mb-4:has(#video-container)').style.display = 'none';
  
  // Update info badge
  const currentTime = formatTime(Date.now() - mainStartTime);
  snapshotInfo.textContent = `Winner Detection at ${currentTime}`;
}

function start() {
  if (!cameraReady) {
    updateCameraStatus('error', 'Camera not active. Please enable the camera first.');
    setupCamera();
    return;
  }

  reset();
  running = true;
  isFirstDetection = true;
  startBtn.disabled = true;
  resetBtn.disabled = false;
  finalLapBtn.disabled = false;
  
  // Activate all lights
  document.querySelectorAll('.light').forEach(light => {
    light.classList.add('active');
  });
  
  // Update UI to show waiting state
  timerDiv.innerHTML = '00:00.000';
  
  detectMotion();
}

function reset() {
  running = false;
  trackCount = parseInt(trackCountInput.value) || 3;
  
  validateTimeInputs();
  
  trackNames = getTrackNames(trackCount);
  trackData = trackNames.map(name => ({
    name,
    cooldown: false,
    validRun: true
  }));
  
  // Update track labels
  const trackLabelsContainer = document.querySelector('.track-labels');
  if (trackLabelsContainer) {
    trackLabelsContainer.innerHTML = trackNames.map(name => `<div class="track-label">${name}</div>`).join('');
  }
  
  lastFrame = null;
  lastDetected = trackNames.map(name => ({ name, time: 0 }));
  mainStartTime = 0;
  mainFinishTime = 0;
  timeLimitTargetTime = 0;
  finishOrder = [];
  finishImages = [];
  isFinalLap = false;
  isFirstDetection = true;
  
  // Reset lights to red
  document.querySelectorAll('.light').forEach(light => {
    light.classList.remove('active');
  });
  
  // Hide snapshot and show live camera
  snapshotContainer.style.display = 'none';
  document.querySelector('.card.bg-secondary.mb-4:has(#video-container)').style.display = 'block';
  
  if (mainTimerInterval) clearInterval(mainTimerInterval);
  if (timeLimitTimeoutId) cancelAnimationFrame(timeLimitTimeoutId);
  if (motionAnimationId) cancelAnimationFrame(motionAnimationId);
  
  startBtn.disabled = false;
  resetBtn.disabled = true;
  finalLapBtn.disabled = true;

  // Reset timer display
  timerDiv.innerHTML = '00:00.000';
  timerDiv.style.color = '#fff';

  // Clear race status
  let statusHtml = '';
  let rowHtml = '<div class="row g-3">';
  
  trackNames.forEach(name => {
    rowHtml += `
      <div class="col-md-6 track-status">
        <div class="card bg-secondary">
          <div class="card-body">
            <h5 class="track-name">Track ${name}</h5>
            <div class="track-status-badge status-running">
              Ready
            </div>
          </div>
        </div>
      </div>`;
  });
  
  rowHtml += '</div>';
  statusHtml = rowHtml;
  
  lapsDiv.innerHTML = statusHtml;
  
  updateDisplay();
}

function detectMotion() {
  if (!running || !cameraReady || video.readyState < 2) {
    motionAnimationId = requestAnimationFrame(detectMotion);
    return;
  }

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  if (lastFrame) {
    const w = canvas.width;
    const h = canvas.height;
    const areaW = Math.floor(w / trackCount);
    
    // Check for motion in each track
    for (let t = 0; t < trackCount; t++) {
      if (trackData[t].cooldown) continue;
      
      let diff = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = t * areaW; x < (t + 1) * areaW; x += 2) {
          const idx = (y * w + x) * 4;
          const gray1 = (lastFrame.data[idx] + lastFrame.data[idx+1] + lastFrame.data[idx+2]) / 3;
          const gray2 = (frame.data[idx] + frame.data[idx+1] + frame.data[idx+2]) / 3;
          diff += Math.abs(gray1 - gray2);
        }
      }
      
      // If significant motion is detected
      if (diff > 150000) {
        const currentTime = Date.now();
        
        // Start timer if this is the first detection
        if (isFirstDetection) {
          isFirstDetection = false;
          mainStartTime = currentTime;
          mainTimerInterval = setInterval(updateDisplay, 30);
          
          if (timeLimitMs > 0) {
            timeLimitTargetTime = mainStartTime + timeLimitMs;
            timeLimitTimeoutId = requestAnimationFrame(checkTimeLimit);
          }
          
          lapsDiv.innerHTML = '<div class="alert alert-success">Car detected! Timer started!</div>';
        }
        
        // Update detection time for this track
        lastDetected[t].time = currentTime;
        
        // Handle final lap detection
        if (isFinalLap && !finishOrder.find(f => f.name === trackData[t].name)) {
          // Only record finish if within time limit
          if (!timeLimitTargetTime || currentTime <= timeLimitTargetTime) {
            finishOrder.push({
              name: trackData[t].name,
              time: currentTime - mainStartTime
            });
            
            // Take snapshot if this is the winner
            if (finishOrder.length === 1) {
              takeSnapshot();
              updateDisplay();

              // Scroll to race status after a short delay
              setTimeout(() => {
                const raceStatus = document.querySelector('.card.bg-secondary:has(#laps)');
                if (raceStatus) {
                  raceStatus.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }
          }
        }
        
        // Set cooldown to prevent multiple detections
        trackData[t].cooldown = true;
        setTimeout(() => { trackData[t].cooldown = false; }, motionCooldownTime);
      }
    }
    
    updateDisplay();
  }
  
  lastFrame = frame;
  
  if (running) {
    motionAnimationId = requestAnimationFrame(detectMotion);
  }
}

function checkTimeLimit() {
  if (!running) return;
  
  const now = Date.now();
  
  if (!timeLimitTargetTime || now < timeLimitTargetTime) {
    timeLimitTimeoutId = requestAnimationFrame(checkTimeLimit);
    return;
  }
  
  // Time limit reached
  mainFinishTime = timeLimitTargetTime;
  
  // Mark all unfinished cars as DNF
  trackData.forEach(track => {
    if (!finishOrder.find(f => f.name === track.name)) {
      track.validRun = false;
    }
  });
  
  stop();

  // Scroll to race status after a short delay to allow UI update
  setTimeout(() => {
    const raceStatus = document.querySelector('.card.bg-secondary:has(#laps)');
    if (raceStatus) {
      raceStatus.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

function stop() {
  running = false;
  
  // Mark all unfinished cars as DNF
  trackData.forEach(track => {
    if (!finishOrder.find(f => f.name === track.name)) {
      track.validRun = false;
    }
  });
  
  if (mainTimerInterval) clearInterval(mainTimerInterval);
  if (timeLimitTimeoutId) cancelAnimationFrame(timeLimitTimeoutId);
  if (motionAnimationId) cancelAnimationFrame(motionAnimationId);
  
  startBtn.disabled = false;
  resetBtn.disabled = false;
  finalLapBtn.disabled = true;
  
  // Hide live camera if there's a winner snapshot
  if (snapshotContainer.style.display === 'block') {
    document.querySelector('.card.bg-secondary.mb-4:has(#video-container)').style.display = 'none';
  }
  
  updateDisplay();
}

function activateFinalLap() {
  if (!running || !mainStartTime || mainFinishTime) {
    alert('Timer must be running to start Final Lap!');
    return;
  }
  
  isFinalLap = true;
  finishOrder = [];
  mainFinishTime = 0;
  
  trackData.forEach(track => {
    track.validRun = true;
    track.cooldown = false;
  });
  
  finalLapBtn.disabled = true;
  updateDisplay();
}

// Event Listeners
startBtn.onclick = start;
resetBtn.onclick = reset;
finalLapBtn.onclick = activateFinalLap;
trackCountInput.oninput = reset;
zoomRange.oninput = () => setZoom(Number(zoomRange.value));

function setZoom(zoomLevel) {
  video.style.transform = `scale(${zoomLevel})`;
  video.style.transformOrigin = 'center';
}

requestCameraBtn.addEventListener('click', async () => {
  await setupCamera();
  if (cameraReady) {
    setZoom(Number(zoomRange.value));
  }
});

// Add event listeners for time limit inputs
timeLimitMinutesInput.addEventListener('input', validateTimeInputs);
timeLimitSecondsInput.addEventListener('input', validateTimeInputs);
timeLimitMsInput.addEventListener('input', validateTimeInputs);

// Add fullscreen functionality
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

// Update fullscreen button icon based on state
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    fullscreenBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>
      </svg>`;
  } else {
    fullscreenBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
      </svg>`;
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Only handle if not typing in input fields
  if (event.target.tagName === 'INPUT') {
    return;
  }

  switch(event.key.toLowerCase()) {
    case 'a':
      // Trigger start button if it's enabled
      if (!startBtn.disabled) {
        startBtn.click();
        // Add visual feedback
        startBtn.classList.add('btn-pressed');
        setTimeout(() => startBtn.classList.remove('btn-pressed'), 200);
      }
      break;
    
    case 's':
      // Trigger final lap button if it's enabled
      if (!finalLapBtn.disabled) {
        finalLapBtn.click();
        // Add visual feedback
        finalLapBtn.classList.add('btn-pressed');
        setTimeout(() => finalLapBtn.classList.remove('btn-pressed'), 200);
      }
      break;
    
    case 'd':
      // Trigger reset button if it's enabled
      if (!resetBtn.disabled) {
        resetBtn.click();
        // Add visual feedback
        resetBtn.classList.add('btn-pressed');
        setTimeout(() => resetBtn.classList.remove('btn-pressed'), 200);
      }
      break;
  }
});

// Initialize
(async () => {
  renderCamera();
  setZoom(Number(zoomRange.value));
  setTimeout(async () => {
    try {
      await setupCamera();
    } catch (err) {
      console.error("Error in auto camera setup:", err);
    }
  }, 1000);
})();

reset();
