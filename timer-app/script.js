// ===== STATE MANAGEMENT =====
const state = {
  targetTimestamp: 0,
  totalDurationMs: 0,
  isRunning: false,
  isDragging: false,
  isResizing: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  resizeStartLeft: 0,
  resizeStartBottom: 0,
  resizeStartWidth: 0,
  resizeStartHeight: 0,
  mousePassthroughEnabled: false,
  animationFrameId: null,
  startTimestamp: null,
};

// ===== DOM ELEMENTS =====
const inputSection = document.getElementById('inputSection');
const progressSection = document.getElementById('progressSection');
const dateInput = document.getElementById('dateInput');
const hourInput = document.getElementById('hourInput');
const minuteInput = document.getElementById('minuteInput');
const periodSelect = document.getElementById('periodSelect');
const startBtn = document.getElementById('startBtn');
const errorMsg = document.getElementById('errorMsg');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const resizeHandle = document.getElementById('resizeHandle');

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTargetDateTime() {
  const dateValue = dateInput.value;
  const hourValue = Number.parseInt(hourInput.value, 10);
  const minuteValue = Number.parseInt(minuteInput.value, 10);
  const periodValue = periodSelect.value;

  if (!dateValue) {
    return null;
  }

  if (Number.isNaN(hourValue) || hourValue < 1 || hourValue > 12) {
    return null;
  }

  if (Number.isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map((part) => Number.parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  let twentyFourHour = hourValue % 12;
  if (periodValue === 'PM') {
    twentyFourHour += 12;
  }

  if (periodValue === 'AM' && hourValue === 12) {
    twentyFourHour = 0;
  }

  return new Date(year, month - 1, day, twentyFourHour, minuteValue, 0, 0);
}

// ===== VALIDATION =====
function validateInput() {
  errorMsg.textContent = '';
  const targetDateTime = getTargetDateTime();

  if (!targetDateTime) {
    errorMsg.textContent = 'Please enter a valid date and time';
    return false;
  }

  const now = new Date();
  if (targetDateTime.getTime() <= now.getTime()) {
    errorMsg.textContent = 'The alarm time must be in the future';
    return false;
  }

  state.targetTimestamp = targetDateTime.getTime();
  state.totalDurationMs = state.targetTimestamp - now.getTime();
  return true;
}

// ===== UI VISIBILITY CONTROL =====
function showInputSection() {
  inputSection.classList.remove('hidden');
  progressSection.classList.add('hidden');
  setMousePassthrough(false);
}

function showProgressSection() {
  inputSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  setMousePassthrough(true);
}

function setBarToCenter() {
  progressBar.style.left = '50%';
  progressBar.style.top = '50%';
  progressBar.style.transform = 'translate(-50%, -50%)';
}

function lockBarPosition(rect) {
  progressBar.style.left = `${rect.left}px`;
  progressBar.style.top = `${rect.top}px`;
  progressBar.style.transform = 'none';
}

function setMousePassthrough(enabled) {
  if (state.mousePassthroughEnabled === enabled) {
    return;
  }

  state.mousePassthroughEnabled = enabled;
  window.overlayApi?.setIgnoreMouseEvents(enabled);
}

function updateMousePassthroughFromPoint(clientX, clientY) {
  if (progressSection.classList.contains('hidden')) {
    setMousePassthrough(false);
    return;
  }

  if (state.isDragging || state.isResizing) {
    setMousePassthrough(false);
    return;
  }

  const element = document.elementFromPoint(clientX, clientY);
  const isInteractiveArea = Boolean(
    element && (element.closest('#progressBar') || element.closest('#resizeHandle'))
  );

  setMousePassthrough(!isInteractiveArea);
}

// ===== PROGRESS BAR UPDATE =====
function updateProgressBar(percentComplete) {
  const clampedPercent = Math.max(0, Math.min(100, percentComplete));
  progressFill.style.width = `${clampedPercent}%`;
  progressBar.setAttribute('aria-valuenow', Math.round(clampedPercent));
}

// ===== ANIMATION LOOP =====
function animationTick(currentTimestamp) {
  if (!state.isRunning) return;

  const now = Date.now();
  const remainingMs = Math.max(0, state.targetTimestamp - now);
  const percentComplete = (remainingMs / state.totalDurationMs) * 100;
  updateProgressBar(percentComplete);

  if (remainingMs <= 0) {
    state.isRunning = false;
    return;
  }

  // Continue animation
  state.animationFrameId = requestAnimationFrame(animationTick);
}

function startAnimation() {
  state.isRunning = true;
  state.animationFrameId = requestAnimationFrame(animationTick);
}

function pauseAnimation() {
  state.isRunning = false;
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

// ===== DRAG HANDLING =====
function getPointerPoint(event) {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function getViewportBounds() {
  const rect = progressBar.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    maxX: Math.max(0, window.innerWidth - rect.width),
    maxY: Math.max(0, window.innerHeight - rect.height),
  };
}

function handleDragStart(event) {
  if (progressSection.classList.contains('hidden')) {
    return;
  }

  state.isDragging = true;

  const rect = progressBar.getBoundingClientRect();
  lockBarPosition(rect);

  const point = getPointerPoint(event);
  state.dragOffsetX = point.x - rect.left;
  state.dragOffsetY = point.y - rect.top;

  setMousePassthrough(false);
  progressBar.setPointerCapture(event.pointerId);
}

function handleDragMove(event) {
  if (!state.isDragging) {
    return;
  }

  const point = getPointerPoint(event);
  const bounds = getViewportBounds();
  const nextLeft = Math.max(0, Math.min(bounds.maxX, point.x - state.dragOffsetX));
  const nextTop = Math.max(0, Math.min(bounds.maxY, point.y - state.dragOffsetY));

  progressBar.style.left = `${nextLeft}px`;
  progressBar.style.top = `${nextTop}px`;
}

function handleDragEnd(event) {
  if (!state.isDragging) {
    return;
  }

  state.isDragging = false;

  if (progressBar.hasPointerCapture(event.pointerId)) {
    progressBar.releasePointerCapture(event.pointerId);
  }

  updateMousePassthroughFromPoint(event.clientX, event.clientY);
}

function handleResizeStart(event) {
  event.preventDefault();
  event.stopPropagation();

  if (progressSection.classList.contains('hidden')) {
    return;
  }

  state.isResizing = true;

  const rect = progressBar.getBoundingClientRect();
  lockBarPosition(rect);

  const point = getPointerPoint(event);
  state.resizeStartLeft = rect.left;
  state.resizeStartBottom = rect.bottom;
  state.resizeStartWidth = rect.width;
  state.resizeStartHeight = rect.height;
  state.dragOffsetX = point.x;
  state.dragOffsetY = point.y;

  setMousePassthrough(false);
  resizeHandle.setPointerCapture(event.pointerId);
}

function handleResizeMove(event) {
  if (!state.isResizing) {
    return;
  }

  const point = getPointerPoint(event);
  const deltaX = point.x - state.dragOffsetX;
  const deltaY = point.y - state.dragOffsetY;
  const minWidth = 220;
  const minHeight = 24;
  const maxWidth = Math.max(minWidth, window.innerWidth - state.resizeStartLeft);
  const maxHeight = Math.max(minHeight, state.resizeStartBottom);

  const nextWidth = Math.max(minWidth, Math.min(maxWidth, state.resizeStartWidth + deltaX));
  const nextHeight = Math.max(minHeight, Math.min(maxHeight, state.resizeStartHeight - deltaY));
  const nextTop = state.resizeStartBottom - nextHeight;

  progressBar.style.left = `${state.resizeStartLeft}px`;
  progressBar.style.top = `${Math.max(0, nextTop)}px`;
  progressBar.style.width = `${nextWidth}px`;
  progressBar.style.height = `${nextHeight}px`;
  progressBar.style.transform = 'none';
}

function handleResizeEnd(event) {
  if (!state.isResizing) {
    return;
  }

  state.isResizing = false;

  if (resizeHandle.hasPointerCapture(event.pointerId)) {
    resizeHandle.releasePointerCapture(event.pointerId);
  }

  updateMousePassthroughFromPoint(event.clientX, event.clientY);
}

// ===== START BUTTON HANDLER =====
function handleStart() {
  if (!validateInput()) return;

  showProgressSection();
  setBarToCenter();
  updateProgressBar(100);
  startAnimation();
}

function handleReset() {
  pauseAnimation();
  state.isDragging = false;
  state.isResizing = false;
  showInputSection();
  updateProgressBar(100);
  errorMsg.textContent = '';
}

// ===== EVENT LISTENERS =====
startBtn.addEventListener('click', handleStart);

progressBar.addEventListener('pointerdown', handleDragStart);
progressBar.addEventListener('pointermove', handleDragMove);
progressBar.addEventListener('pointerup', handleDragEnd);
progressBar.addEventListener('pointercancel', handleDragEnd);

resizeHandle.addEventListener('pointerdown', handleResizeStart);
resizeHandle.addEventListener('pointermove', handleResizeMove);
resizeHandle.addEventListener('pointerup', handleResizeEnd);
resizeHandle.addEventListener('pointercancel', handleResizeEnd);

document.addEventListener('mousemove', (event) => {
  updateMousePassthroughFromPoint(event.clientX, event.clientY);
});

// Double-click to reset
progressBar.addEventListener('dblclick', handleReset);

// Keyboard shortcut to reset (Escape key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.isRunning) {
    handleReset();
  }
});

// Initialize default date/time values
dateInput.value = getTodayDateString();
dateInput.min = getTodayDateString();

// Initialize UI
showInputSection();
updateProgressBar(100);
