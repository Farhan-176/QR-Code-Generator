// ========================================
// QR CODE GENERATOR ELITE
// Premium JavaScript Implementation
// ========================================

// DOM ELEMENTS
const qrInput = document.getElementById('qr-input');
const generateBtn = document.getElementById('generate-btn');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');
const qrDisplay = document.getElementById('qr-display');
const sizeSelect = document.getElementById('qr-size');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const shareBtn = document.getElementById('share-btn');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const actionsSection = document.getElementById('actions-section');

// STATE
let currentQRData = null;
let qrHistory = [];
let totalGenerated = 0;
const QR_COLOR = '000000'; // Black only
const OUTPUT_FORMAT = 'jpg'; // JPG only

// CONSTANTS
const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';
const MAX_HISTORY = 5;
const STORAGE_KEY = 'qr_generator_data';

// ========================================
// INITIALIZATION
// ========================================
function init() {
    loadFromStorage();
    setupEventListeners();
    renderHistory();
}

function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerate);
    qrInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGenerate();
    });
    
    downloadBtn.addEventListener('click', handleDownload);
    copyBtn.addEventListener('click', handleCopy);
    shareBtn.addEventListener('click', handleShare);
    clearHistoryBtn.addEventListener('click', handleClearHistory);
    
    // Input validation
    qrInput.addEventListener('input', () => {
        if (qrInput.value.trim()) {
            qrInput.style.borderColor = 'rgba(67, 233, 123, 0.3)';
        } else {
            qrInput.style.borderColor = '';
        }
    });
}

// ========================================
// QR CODE GENERATION
// ========================================
async function handleGenerate() {
    const text = qrInput.value.trim();
    
    if (!text) {
        showToast('Please enter text or URL', 'warning');
        qrInput.focus();
        return;
    }
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    
    try {
        await generateQRCode(text);
        showToast('QR Code generated successfully!', 'success');
    } catch (error) {
        showToast('Failed to generate QR code', 'error');
        console.error(error);
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

async function generateQRCode(text) {
    const size = sizeSelect.value;
    const [width, height] = size.split('x');
    
    // Build QR code URL (Black color, JPG format)
    const qrUrl = `${QR_API_BASE}?data=${encodeURIComponent(text)}&size=${width}x${height}&color=${QR_COLOR}&format=jpg&ecc=M`;
    
    // Load image
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            qrImage.src = img.src;
            currentQRData = {
                text: text,
                url: qrUrl,
                timestamp: Date.now(),
                size: size
            };
            
            // Show QR display
            qrDisplay.classList.add('active');
            actionsSection.classList.add('active');
            
            // Update history
            addToHistory(currentQRData);
            saveToStorage();
            
            resolve();
        };
        
        img.onerror = () => {
            reject(new Error('Failed to load QR code'));
        };
        
        img.src = qrUrl;
    });
}

// ========================================
// DOWNLOAD FUNCTIONALITY
// ========================================
async function handleDownload() {
    if (!currentQRData) {
        showToast('Generate a QR code first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(currentQRData.url);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-code-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('QR code downloaded as JPG', 'success');
    } catch (error) {
        showToast('Download failed', 'error');
        console.error(error);
    }
}

// ========================================
// COPY TO CLIPBOARD
// ========================================
async function handleCopy() {
    if (!currentQRData) {
        showToast('Generate a QR code first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(currentQRData.url);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        showToast('QR code copied to clipboard!', 'success');
        
        // Visual feedback
        copyBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            copyBtn.style.transform = '';
        }, 150);
    } catch (error) {
        // Fallback: copy URL
        try {
            await navigator.clipboard.writeText(currentQRData.text);
            showToast('URL copied to clipboard', 'success');
        } catch (e) {
            showToast('Copy failed', 'error');
        }
    }
}

// ========================================
// SHARE FUNCTIONALITY
// ========================================
async function handleShare() {
    if (!currentQRData) {
        showToast('Generate a QR code first', 'warning');
        return;
    }
    
    if (navigator.share) {
        try {
            const response = await fetch(currentQRData.url);
            const blob = await response.blob();
            const file = new File([blob], 'qr-code.png', { type: 'image/png' });
            
            await navigator.share({
                title: 'QR Code',
                text: currentQRData.text,
                files: [file]
            });
            
            showToast('QR code shared successfully!', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Share failed', 'error');
            }
        }
    } else {
        // Fallback: copy link
        try {
            await navigator.clipboard.writeText(currentQRData.text);
            showToast('Link copied! (Share not supported)', 'info');
        } catch {
            showToast('Share not supported on this device', 'warning');
        }
    }
}

// ========================================
// HISTORY MANAGEMENT
// ========================================
function addToHistory(qrData) {
    // Remove if already exists
    qrHistory = qrHistory.filter(item => item.text !== qrData.text);
    
    // Add to beginning
    qrHistory.unshift(qrData);
    
    // Limit to MAX_HISTORY
    if (qrHistory.length > MAX_HISTORY) {
        qrHistory = qrHistory.slice(0, MAX_HISTORY);
    }
    
    renderHistory();
}

function renderHistory() {
    if (qrHistory.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>No recent QR codes</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = qrHistory.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-item-preview">
                <img src="${item.url}" alt="QR Preview">
            </div>
            <div class="history-item-content">
                <div class="history-item-text">${truncateText(item.text, 30)}</div>
                <div class="history-item-time">${formatTime(item.timestamp)}</div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            loadFromHistory(index);
        });
    });
}

function loadFromHistory(index) {
    const item = qrHistory[index];
    if (!item) return;
    
    qrInput.value = item.text;
    sizeSelect.value = item.size;
    
    handleGenerate();
    showToast('Loaded from history', 'info');
}

function handleClearHistory() {
    if (qrHistory.length === 0) return;
    
    if (confirm('Clear all history?')) {
        qrHistory = [];
        renderHistory();
        saveToStorage();
        showToast('History cleared', 'info');
    }
}

// ========================================

// STORAGE
// ========================================
function saveToStorage() {
    try {
        const data = {
            history: qrHistory,
            total: totalGenerated,
            lastUpdated: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to storage:', error);
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            qrHistory = parsed.history || [];
            totalGenerated = parsed.total || 0;
        }
    } catch (error) {
        console.error('Failed to load from storage:', error);
    }
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
        error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
        warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
        info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
    };
    return icons[type] || icons.info;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
    }
    
    // Ctrl/Cmd + D to download
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && currentQRData) {
        e.preventDefault();
        handleDownload();
    }
    
    // Ctrl/Cmd + C when not in input
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement !== qrInput && currentQRData) {
        e.preventDefault();
        handleCopy();
    }
});

// ========================================
// INITIALIZE APP
// ========================================
document.addEventListener('DOMContentLoaded', init);

// ========================================
// EXPORT FOR DEBUGGING
// ========================================
window.QRGenerator = {
    generateQRCode,
    currentQRData: () => currentQRData,
    history: () => qrHistory,
    stats: () => ({ total: totalGenerated })
};