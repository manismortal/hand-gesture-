// ইশারা প্রসেসিং ফাংশন - আপডেটেড
function processGesture(landmarks) {
    // ... পূর্বের কোড অপরিবর্তিত ...

    // ইশারা শনাক্তকরণ লজিক - আপডেটেড
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
    } else if (indexUp && middleUp && ringUp && !pinkyUp) {
        currentGesture = 'threeFingersUp';
        gestureText = 'তিন আঙুল উপরে - অর্ডার বাতিল করুন';
    } else if (fistClosed) {
        currentGesture = 'fist';
        gestureText = 'মুঠো বন্ধ - আইটেম নির্বাচন করুন';
    } else if (indexUp && middleUp && ringUp && pinkyUp) {
        currentGesture = 'handOpen';
        gestureText = 'হাত খোলা - অর্ডার কনফার্ম করুন';
    }

    // ... বাকি কোড অপরিবর্তিত ...
}

// শনাক্তকৃত ইশারা অনুযায়ী অ্যাকশন করা - আপডেটেড
function performAction(gesture) {
    const activeMenuCategory = document.querySelector('.menu-category.active');
    const activeMenuItems = activeMenuCategory.querySelectorAll('.menu-item');
    const selectedMenuItem = activeMenuCategory.querySelector('.menu-item.selected');
    let selectedIndex = -1;
    
    if (selectedMenuItem) {
        selectedIndex = Array.from(activeMenuItems).indexOf(selectedMenuItem);
    }
    
    switch (gesture) {
        // ... পূর্বের কেসগুলি অপরিবর্তিত ...

        case 'threeFingersUp': // নতুন জেসচার: অর্ডার ক্যানসেল
            cancelOrder();
            break;

        case 'fist':
            if (selectedMenuItem) {
                // হাইলাইট দেখানোর জন্য টেম্পোরারি ক্লাস যোগ
                selectedMenuItem.classList.add('temp-highlight');
                setTimeout(() => {
                    selectedMenuItem.classList.remove('temp-highlight');
                }, 300);
                
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

// অর্ডার ক্যানসেল ফাংশন - নতুন
function cancelOrder() {
    if (selectedItems.length > 0) {
        // অর্ডার আইটেম ক্যানসেল এনিমেশন
        orderItemsContainer.classList.add('order-cancelled');
        setTimeout(() => {
            orderItemsContainer.classList.remove('order-cancelled');
        }, 500);
        
        selectedItems = [];
        totalAmount = 0;
        updateOrderSummary();
        
        statusIndicator.textContent = 'অর্ডার বাতিল করা হয়েছে';
        statusIndicator.style.backgroundColor = '#ffccd5';
        
        setTimeout(() => {
            statusIndicator.textContent = '';
            statusIndicator.style.backgroundColor = 'transparent';
        }, 2000);
    } else {
        statusIndicator.textContent = 'কোন অর্ডার নেই বাতিল করার';
        statusIndicator.style.backgroundColor = '#ffd166';
        
        setTimeout(() => {
            statusIndicator.textContent = '';
            statusIndicator.style.backgroundColor = 'transparent';
        }, 2000);
    }
}

// মেনু আইটেম হাইলাইটিং উন্নত করা
function setupMenuHighlighting() {
    menuItems.forEach(item => {
        // মাউস হোভার ইফেক্ট
        item.addEventListener('mouseenter', () => {
            item.classList.add('temp-highlight');
        });
        
        item.addEventListener('mouseleave', () => {
            item.classList.remove('temp-highlight');
        });
    });
}

// DOM কন্টেন্ট লোড হওয়ার পর অ্যাপ্লিকেশন শুরু - আপডেটেড
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupMenuHighlighting(); // নতুন মেনু হাইলাইটিং সেটআপ
});
