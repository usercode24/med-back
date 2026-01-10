// ============================================
// MAIN JAVASCRIPT FILE - MEDITOUR
// ============================================

// API Configuration
const API_CONFIG = {
    baseURL: '/api',
    endpoints: {
        stats: '/stats',
        live: '/live-visitors?minutes=5'
    },
    updateInterval: 30000
};

// Fallback data (STATIC FALLBACK - WILL BE USED IF API FAILS)
function getFallbackStats() {
    return {
        total: 12500,
        unique: 8900,
        week: 2100,
        month: 4500,
        today: 342,
        last24h: 150,
        growth: 24
    };
}

// 1. MODAL FUNCTIONS
function openConsultationModal() {
    const modal = document.getElementById('consultationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.style.opacity = '1', 10);
    }
}

function closeConsultationModal() {
    const modal = document.getElementById('consultationModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function openServicesModal() {
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.style.opacity = '1', 10);
    }
}

function closeServicesModal() {
    const modal = document.getElementById('servicesModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// 2. API FUNCTIONS
async function fetchVisitorStats() {
    try {
        console.log('Fetching visitor stats from API...');
        const response = await fetch(`${API_CONFIG.baseURL}/stats`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Transform FastAPI response to match expected format
        return {
            total: data.total_visitors || 12500,
            unique: data.unique_visitors || 8900,
            week: data.week_visitors || 2100,
            month: data.month_visitors || 4500,
            today: data.today_visitors || 342,
            last24h: data.last_24h_visitors || 150,
            growth: 24 // Static growth rate
        };
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        console.log('Using fallback stats');
        return getFallbackStats();
    }
}

// 3. STAT COUNTER ANIMATION FOR HERO SECTION (STATIC)
function initHeroStats() {
    console.log('Initializing hero stats...');

    // Hero section stats (these are static values)
    const heroStats = [
        { id: 'patients-served', target: 10000 },
        { id: 'partner-hospitals', target: 50 },
        { id: 'success-rate', target: 98 }
    ];

    // Get all hero stat number elements
    const heroStatElements = document.querySelectorAll('.hero .stat-number');

    heroStatElements.forEach((element, index) => {
        if (index < heroStats.length) {
            const stat = heroStats[index];
            const current = parseInt(element.textContent.replace(/,/g, '')) || 0;
            const target = stat.target;

            console.log(`Animating hero stat ${index}: ${current} → ${target}`);

            if (element && element.textContent !== target.toString()) {
                animateValue(element, current, target, 2000);
            }
        }
    });
}

// 4. VISITOR COUNTER ANIMATION FOR STATISTICS SECTION (REAL DATA)
async function initVisitorCounters() {
    console.log('Initializing visitor counters...');

    try {
        const stats = await fetchVisitorStats();
        console.log('Stats loaded:', stats);

        // Update statistics section elements
        const statElements = {
            'statsTotal': stats.total,
            'statsUnique': stats.unique,
            'statsWeek': stats.week,
            'statsGrowth': stats.growth
        };

        // Animate each counter
        for (const [elementId, targetValue] of Object.entries(statElements)) {
            const element = document.getElementById(elementId);
            if (element) {
                const currentText = element.textContent;
                const currentValue = parseInt(currentText.replace(/[%,]/g, '')) || 0;
                const isPercentage = elementId === 'statsGrowth';

                console.log(`Animating ${elementId}: ${currentValue} → ${targetValue}`);

                if (currentValue !== targetValue) {
                    animateValue(element, currentValue, targetValue, 2500, isPercentage);
                } else {
                    // Just set the value directly if already correct
                    element.textContent = isPercentage ? `${targetValue}%` : targetValue.toLocaleString();
                }
            }
        }

        return stats;
    } catch (error) {
        console.error('Error in initVisitorCounters:', error);

        // Use fallback if everything fails
        const fallback = getFallbackStats();
        updateStatsWithFallback(fallback);
        return fallback;
    }
}

// 5. FALLBACK STATS UPDATE (if all else fails)
function updateStatsWithFallback(fallbackStats) {
    console.log('Using fallback stats:', fallbackStats);

    const statElements = {
        'statsTotal': fallbackStats.total,
        'statsUnique': fallbackStats.unique,
        'statsWeek': fallbackStats.week,
        'statsGrowth': fallbackStats.growth
    };

    for (const [elementId, targetValue] of Object.entries(statElements)) {
        const element = document.getElementById(elementId);
        if (element) {
            const isPercentage = elementId === 'statsGrowth';
            element.textContent = isPercentage ? `${targetValue}%` : targetValue.toLocaleString();
        }
    }
}

// 6. VALUE ANIMATION HELPER (FIXED)
function animateValue(element, start, end, duration, isPercentage = false) {
    if (!element) {
        console.error('animateValue: Element not found');
        return;
    }

    // Ensure start and end are valid numbers
    start = isNaN(start) ? 0 : Number(start);
    end = isNaN(end) ? 0 : Number(end);

    console.log(`Starting animation: ${start} → ${end} (${duration}ms)`);

    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const value = Math.floor(start + (end - start) * easeOutQuart);

        // Update element with formatted value
        if (isPercentage) {
            element.textContent = `${value}%`;
        } else {
            element.textContent = value.toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            // Final value
            element.textContent = isPercentage ? `${end}%` : end.toLocaleString();
            console.log(`Animation complete: ${end}`);
        }
    };

    requestAnimationFrame(step);
}

// 7. TYPING EFFECT
function initTypingEffect() {
    const typewriterText = document.querySelector('.typewriter-text');
    if (!typewriterText) return;

    const words = ["India", "Russia", "Uzbekistan", "Kazakhstan"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }

        typewriterText.textContent = currentWord.substring(0, charIndex);

        let typeSpeed = 100;

        if (isDeleting) {
            typeSpeed /= 2;
        }

        if (!isDeleting && charIndex === currentWord.length) {
            typeSpeed = 1500;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500;
        }

        setTimeout(type, typeSpeed);
    }

    setTimeout(type, 500);
}

// 8. SCROLL ANIMATIONS
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// 9. FORM HANDLING
function initFormAnimations() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            setTimeout(() => {
                alert('Thank you! Your message has been sent successfully.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                this.reset();
            }, 1500);
        });
    }

    const assessmentForm = document.getElementById('assessmentForm');
    if (assessmentForm) {
        assessmentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;

            setTimeout(() => {
                alert('Assessment request submitted successfully! Our team will contact you within 24 hours.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                closeConsultationModal();
                this.reset();
            }, 1500);
        });
    }
}

// 10. NAVBAR SCROLL EFFECT
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

// 11. MOBILE MENU
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-toggle');
    const menu = document.querySelector('.nav-menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            toggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('active');
                toggle.classList.remove('active');
            });
        });
    }
}

// 12. BACK TO TOP BUTTON
function initBackToTop() {
    const button = document.querySelector('.back-to-top');
    if (button) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                button.classList.add('visible');
            } else {
                button.classList.remove('visible');
            }
        });

        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// 13. SMOOTH SCROLLING
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 14. PRELOADER
function initPreloader() {
    window.addEventListener('load', function () {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.style.opacity = '0';
                preloader.style.visibility = 'hidden';
            }, 500);
        }
    });
}

// 15. CHART INITIALIZATION
function initCharts() {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx) return;

    window.visitorsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Visitors',
                data: [65, 78, 90, 85, 120, 98, 110],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            }
        }
    });
}

// 16. CLOSE MODAL CLICK OUTSIDE
function initModalClose() {
    window.addEventListener('click', function (e) {
        const consultationModal = document.getElementById('consultationModal');
        const servicesModal = document.getElementById('servicesModal');

        if (e.target === consultationModal) closeConsultationModal();
        if (e.target === servicesModal) closeServicesModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeConsultationModal();
            closeServicesModal();
        }
    });
}

// 17. LIVE DATA UPDATES
async function updateLiveData() {
    try {
        const stats = await fetchVisitorStats();

        // Update statistics
        const statElements = {
            'statsTotal': stats.total,
            'statsUnique': stats.unique,
            'statsWeek': stats.week,
            'statsGrowth': stats.growth
        };

        for (const [elementId, targetValue] of Object.entries(statElements)) {
            const element = document.getElementById(elementId);
            if (element) {
                const currentText = element.textContent;
                const currentValue = parseInt(currentText.replace(/[%,]/g, '')) || 0;
                const isPercentage = elementId === 'statsGrowth';

                if (currentValue !== targetValue) {
                    animateValue(element, currentValue, targetValue, 1000, isPercentage);
                }
            }
        }

        console.log('Live data updated at:', new Date().toLocaleTimeString());
    } catch (error) {
        console.error('Error updating live data:', error);
    }
}

// 18. SETUP PERIODIC UPDATES
function setupPeriodicUpdates() {
    // Initial update
    updateLiveData();

    // Set up interval for periodic updates
    setInterval(updateLiveData, API_CONFIG.updateInterval);
}

// 19. MAIN INITIALIZATION
document.addEventListener('DOMContentLoaded', function () {
    console.log('MediTour - Initializing...');

    // Initialize all UI components
    initNavbarScroll();
    initMobileMenu();
    initBackToTop();
    initSmoothScrolling();
    initScrollAnimations();
    initFormAnimations();
    initModalClose();
    initCharts();
    initPreloader();

    // Start animations after a short delay
    setTimeout(() => {
        console.log('Starting animations...');

        // Initialize hero stats (static values)
        initHeroStats();

        // Initialize visitor counters (real data from API)
        initVisitorCounters().then(stats => {
            console.log('Visitor counters initialized with:', stats);
        }).catch(error => {
            console.error('Failed to initialize visitor counters:', error);
            // Use fallback
            updateStatsWithFallback(getFallbackStats());
        });

        // Start typing effect
        initTypingEffect();

        // Start live updates
        setupPeriodicUpdates();

    }, 1000);

    console.log('MediTour - Initialization complete!');
});

// 20. DEBUG FUNCTION - Manually trigger stats update
window.debugUpdateStats = function () {
    console.log('Manual stats update triggered');
    updateLiveData();
};