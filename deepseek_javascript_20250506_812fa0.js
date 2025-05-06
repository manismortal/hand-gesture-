// ভ্যারিয়েবল সেটআপ
let activeCategory = 'appetizers';
let selectedItems = [];
let totalAmount = 0;
let lastGesture = null;
let gestureTimeout = null;
let confirmationTimeout = null;
let isConfirming = false;
let cameraStarted = false;

// DOM এলিমেন্ট রেফারেন্স
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const handPosition = document.getElementById('handPosition');
const tabs = document.querySelectorAll('.tab');
const menuCategories = document.querySelectorAll('.menu-category');
const menuItems = document.querySelectorAll('.menu-item');
const orderItemsContainer = document.getElementById('orderItems');
const totalAmountElement = document.getElementById('totalAmount');
const confirmBtn = document.getElementById('confirmBtn');
const statusIndicator = document.getElementById('statusIndicator');
const cameraPermission = document.getElementById('cameraPermission');
const permissionBtn = document.getElementById('permissionBtn');
const gestureFeedback = document.getElementById('gestureFeedback');
const playButton = document.getElementById('playButton');

// HTTPS চেক
function checkHTTPS() {
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
        showError('এই অ্যাপ্লিকেশনটি ব্যবহার করতে HTTPS সংযোগ প্রয়োজন।');
        return false;
    }
    return true;
}

// ডিভাইস সাপোর্ট চেক
function checkDeviceSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('আপনার ডিভাইস বা ব্রাউজার এই বৈশিষ্ট্য সমর্থন করে না।');
        return false;
    }
    return true;
}

// এরর মেসেজ দেখান
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
}

// ক্যামেরা অনুমতি চেক
async function checkCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        showPermissionInstructions();
        return false;
    }
}

// ক্যামেরা অনুমতি নির্দেশিকা দেখান
function showPermissionInstructions() {
    cameraPermission.innerHTML = `
        <h2>ক্যামেরা অ্যাক্সেস প্রয়োজন</h2>
        <p>Android Chrome-এ ক্যামেরা ব্যবহার করতে:</p>
        <ol style="text-align: left; margin: 20px;">
            <li>ঠিকানা বারের ক্যামেরা আইকনে ট্যাপ করুন</li>
            <li>"অনুমতি দিন" নির্বাচন করুন</li>
            <li>পৃষ্ঠাটি রিফ্রেশ করুন</li>
        </ol>
        <button class="permission-btn" id="retryBtn">আবার চেষ্টা করুন</button>
    `;
    document.getElementById('retryBtn').addEventListener('click', initializeApp);
}

// ভিডিও প্লে বাটন দেখান
function showPlayButton() {
    playButton.style.display = 'block';
    playButton.onclick = () => {
        video.play()
            .then(() => {
                playButton.style.display = 'none';
            })
            .catch(error => {
                showError('ভিডিও শুরু করতে ব্যর্থ: ' + error.message);
            });
    };
}

// ক্যানভাস সেটআপ
function setupCanvas() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

// MediaPipe হ্যান্ডস মডেল সেটআপ
function setupHandTracking() {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);

    return hands;
}

// হ্যান্ড ট্র্যাকিং রেজাল্ট প্রসেসিং
function onResults(results) {
    if (!cameraStarted) return;
    
    setupCanvas();
    
    // ক্যানভাস ক্লিয়ার
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ভিডিও তে হ্যান্ড ল্যান্ডমার্ক আঁকা
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#e63946', lineWidth: 5});
            drawLandmarks(ctx, landmarks, {color: '#f1faee', lineWidth: 2});
            
            // ইশারা শনাক্তকরণ ও প্রসেসিং
            processGesture(landmarks);
        }
    } else {
        gestureFeedback.textContent = 'কোন হাত শনাক্ত করা যায়নি';
    }
}

// ইশারা প্রসেসিং ফাংশন
function processGesture(landmarks) {
    // আঙুলের টিপ এবং অন্যান্য ল্যান্ডমার্ক
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const ringBase = landmarks[13];
    const pinkyBase = landmarks[17];
    
    // আঙুল উপরে/নিচে আছে কিনা চেক
    const indexUp = indexTip.y < indexBase.y;
    const middleUp = middleTip.y < middleBase.y;
    const ringUp = ringTip.y < ringBase.y;
    const pinkyUp = pinkyTip.y < pinkyBase.y;
    
    // মুঠো বন্ধ আছে কিনা
    const fistClosed = !indexUp && !middleUp && !ringUp && !pinkyUp;
    
    // হ্যান্ড পজিশন আপডেট
    handPosition.style.left = `${indexTip.x * canvas.width}px`;
    handPosition.style.top = `${indexTip.y * canvas.height}px`;
    
    let currentGesture = null;
    let gestureText = '';
    
    // ইশারা শনাক্তকরণ লজিক
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        currentGesture = 'oneFingerUp';
        gestureText = 'এক আঙুল উপরে - আগের আইটেম';
    } else if (!indexUp && middleUp && !ringUp && !pinkyUp) {
        currentGesture = 'oneFingerDown';
        gestureText = 'এক আঙুল নিচে - পরের আইটেম';
    } else if (indexUp && middleUp && !ringUp && !pinkyUp) {
        currentGesture = 'twoFingersUp';
        gestureText = 'দুই আঙুল উপরে - আগের ক্যাটাগরি';
    } else if (!indexUp && middleUp && ringUp && !pinkyUp) {
        currentGesture = 'twoFingersDown';
        gestureText = 'দুই আঙুল নিচে - পরের ক্যাটাগরি';
    } else if (fistClosed) {
        currentGesture = 'fist';
        gestureText = 'মুঠো বন্ধ - আইটেম নির্বাচন করুন';
    } else if (indexUp && middleUp && ringUp && pinkyUp) {
        currentGesture = 'handOpen';
        gestureText = 'হাত খোলা - অর্ডার কনফার্ম করুন';
    }
    
    gestureFeedback.textContent = gestureText;
    
    // ইশারা পরিবর্তনে অ্যাকশন করা
    if (currentGesture !== lastGesture) {
        clearTimeout(gestureTimeout);
        
        gestureTimeout = setTimeout(() => {
            performAction(currentGesture);
        }, 200); // 200ms ডিবাউন্স
        
        lastGesture = currentGesture;
    }
    
    // হাত খোলা অবস্থায় কনফার্মেশন কাউন্টডাউন
    if (currentGesture === 'handOpen' && !isConfirming) {
        isConfirming = true;
        let countdown = 3;
        
        statusIndicator.textContent = `অর্ডার কনফার্ম করতে ${countdown} সেকেন্ড...`;
        statusIndicator.style.backgroundColor = '#ffd166';
        
        confirmationTimeout = setInterval(() => {
            countdown--;
            
            if (countdown > 0) {
                statusIndicator.textContent = `অর্ডার কনফার্ম করতে ${countdown} সেকেন্ড...`;
            } else {
                clearInterval(confirmationTimeout);
                confirmOrder();
                isConfirming = false;
            }
        }, 1000);
    } else if (currentGesture !== 'handOpen' && isConfirming) {
        // কাউন্টডাউন বাতিল
        clearInterval(confirmationTimeout);
        statusIndicator.textContent = '';
        statusIndicator.style.backgroundColor = 'transparent';
        isConfirming = false;
    }
}

// শনাক্তকৃত ইশারা অনুযায়ী অ্যাকশন করা
function performAction(gesture) {
    const activeMenuCategory = document.querySelector('.menu-category.active');
    const activeMenuItems = activeMenuCategory.querySelectorAll('.menu-item');
    const selectedMenuItem = activeMenuCategory.querySelector('.menu-item.selected');
    let selectedIndex = -1;
    
    if (selectedMenuItem) {
        selectedIndex = Array.from(activeMenuItems).indexOf(selectedMenuItem);
    }
    
    switch (gesture) {
        case 'oneFingerUp':
            if (selectedIndex > 0) {
                selectedMenuItem?.classList.remove('selected');
                activeMenuItems[selectedIndex - 1].classList.add('selected');
                activeMenuItems[selectedIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (selectedIndex === -1 && activeMenuItems.length > 0) {
                activeMenuItems[0].classList.add('selected');
                activeMenuItems[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
            
        case 'oneFingerDown':
            if (selectedIndex < activeMenuItems.length - 1) {
                selectedMenuItem?.classList.remove('selected');
                activeMenuItems[selectedIndex + 1].classList.add('selected');
                activeMenuItems[selectedIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (selectedIndex === -1 && activeMenuItems.length > 0) {
                activeMenuItems[0].classList.add('selected');
                activeMenuItems[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
            
        case 'twoFingersUp':
            const prevCategoryIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active')) - 1;
            if (prevCategoryIndex >= 0) {
                changeCategory(tabs[prevCategoryIndex].dataset.category);
            }
            break;
            
        case 'twoFingersDown':
            const nextCategoryIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active')) + 1;
            if (nextCategoryIndex < tabs.length) {
                changeCategory(tabs[nextCategoryIndex].dataset.category);
            }
            break;
            
        case 'fist':
            if (selectedMenuItem) {
                const itemName = selectedMenuItem.querySelector('span:first-child').textContent;
                const itemPrice = parseInt(selectedMenuItem.dataset.price);
                addToOrder(itemName, itemPrice);
                
                statusIndicator.textContent = `"${itemName}" অর্ডারে যোগ করা হয়েছে`;
                statusIndicator.style.backgroundColor = '#d8f3dc';
                
                setTimeout(() => {
                    statusIndicator.textContent = '';
                    statusIndicator.style.backgroundColor = 'transparent';
                }, 2000);
            }
            break;
    }
}

// ক্যাটাগরি পরিবর্তন ফাংশন
function changeCategory(category) {
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    menuCategories.forEach(menuCategory => {
        menuCategory.classList.toggle('active', menuCategory.id === category);
    });
    
    menuItems.forEach(item => item.classList.remove('selected'));
    
    const firstItem = document.querySelector(`#${category} .menu-item`);
    if (firstItem) {
        firstItem.classList.add('selected');
    }
    
    statusIndicator.textContent = `"${getCategoryNameBangla(category)}" ক্যাটাগরিতে পরিবর্তন করা হয়েছে`;
    statusIndicator.style.backgroundColor = '#caf0f8';
    
    setTimeout(() => {
        statusIndicator.textContent = '';
        statusIndicator.style.backgroundColor = 'transparent';
    }, 2000);
}

// বাংলায় ক্যাটাগরির নাম
function getCategoryNameBangla(category) {
    const categoryNames = {
        'appetizers': 'অ্যাপিটাইজার',
        'main': 'মূল খাবার',
        'desserts': 'ডেজার্ট',
        'drinks': 'পানীয়'
    };
    return categoryNames[category] || category;
}

// অর্ডার লিস্টে আইটেম যোগ করা
function addToOrder(itemName, itemPrice) {
    const existingItemIndex = selectedItems.findIndex(item => item.name === itemName);
    
    if (existingItemIndex !== -1) {
        selectedItems[existingItemIndex].quantity++;
    } else {
        selectedItems.push({
            name: itemName,
            price: itemPrice,
            quantity: 1
        });
    }
    
    updateOrderSummary();
}

// অর্ডার সারাংশ আপডেট করা
function updateOrderSummary() {
    orderItemsContainer.innerHTML = '';
    totalAmount = 0;
    
    selectedItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        const orderItemElement = document.createElement('div');
        orderItemElement.classList.add('order-item');
        orderItemElement.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>৳${itemTotal}</span>
        `;
        orderItemsContainer.appendChild(orderItemElement);
    });
    
    totalAmountElement.textContent = `৳${totalAmount}`;
}

// অর্ডার কনফার্ম করার ফাংশন
function confirmOrder() {
    if (selectedItems.length > 0) {
        statusIndicator.textContent = 'অর্ডার সফলভাবে কনফার্ম করা হয়েছে!';
        statusIndicator.style.backgroundColor = '#80ed99';
        
        console.log('অর্ডার কনফার্ম করা হয়েছে:', selectedItems);
        selectedItems = [];
        totalAmount = 0;
        updateOrderSummary();
        
        setTimeout(() => {
            statusIndicator.textContent = '';
            statusIndicator.style.backgroundColor = 'transparent';
        }, 3000);
    } else {
        statusIndicator.textContent = 'অর্ডার কনফার্ম করতে আইটেম যোগ করুন';
        statusIndicator.style.backgroundColor = '#ffd166';
        
        setTimeout(() => {
            statusIndicator.textContent = '';
            statusIndicator.style.backgroundColor = 'transparent';
        }, 2000);
    }
}

// অ্যাপ্লিকেশন ইনিশিয়ালাইজেশন
async function initializeApp() {
    try {
        if (!checkHTTPS() || !checkDeviceSupport()) return;
        
        cameraPermission.style.display = 'flex';
        
        if (!await checkCameraPermission()) return;
        
        cameraPermission.style.display = 'none';
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        video.srcObject = stream;
        cameraStarted = true;
        
        const hands = setupHandTracking();
        
        // ক্যামেরা ফ্রেম প্রসেসিং
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({image: video});
            },
            width: 640,
            height: 480
        });
        
        camera.start();
        
        video.play().catch(error => {
            showPlayButton();
        });
        
        // প্রথম আইটেম সিলেক্ট
        document.querySelector('.menu-item').classList.add('selected');
        
    } catch (error) {
        console.error('ইনিশিয়ালাইজেশন ত্রুটি:', error);
        showError('ত্রুটি: ' + error.message);
        cameraPermission.style.display = 'flex';
    }
}

// ইভেন্ট লিসেনার
permissionBtn.addEventListener('click', initializeApp);
confirmBtn.addEventListener('click', confirmOrder);

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        changeCategory(tab.dataset.category);
    });
});

// DOM কন্টেন্ট লোড হওয়ার পর অ্যাপ্লিকেশন শুরু
document.addEventListener('DOMContentLoaded', initializeApp);