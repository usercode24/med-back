// main.js (updated - simplified)

// 1. MODAL FUNCTIONS (keep as is)
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
        console.log('Fetching real visitor stats...');
        const response = await fetch('/api/stats');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Real stats:', data);

        return data;
    } catch (error) {
        console.error('Error fetching visitor stats:', error);

        // Return zeros if API fails
        return {
            total_visits: 0,
            today_visits: 0,
            today_unique: 0,
            week_visits: 0,
            month_visits: 0,
            unique_visitors: 0,
            last_24h_visits: 0,
            last_7_days: []
        };
    }
}

// 3. HERO STATS (static business metrics)
function initHeroStats() {
    console.log('Initializing hero stats (static business metrics)...');

    const heroStats = [
        { id: 'patients-served', target: 10000 },
        { id: 'partner-hospitals', target: 50 },
        { id: 'success-rate', target: 98 }
    ];

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

// 4. REAL VISITOR COUNTERS
async function initVisitorCounters() {
    console.log('Initializing REAL visitor counters...');

    try {
        const stats = await fetchVisitorStats();
        console.log('Real stats loaded:', stats);

        // Update statistics section elements with real data
        const statElements = {
            'statsTotal': stats.total_visits || 0,
            'statsUnique': stats.unique_visitors || 0,
            'statsWeek': stats.week_visits || 0,
            'statsToday': stats.today_visits || 0
        };

        // Animate each counter
        for (const [elementId, targetValue] of Object.entries(statElements)) {
            const element = document.getElementById(elementId);
            if (element) {
                const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
                console.log(`Animating ${elementId}: ${currentValue} → ${targetValue}`);

                if (currentValue !== targetValue) {
                    animateValue(element, currentValue, targetValue, 2000);
                }
            }
        }

        // Remove growth rate (fake number)
        const growthElement = document.getElementById('statsGrowth');
        if (growthElement) {
            growthElement.parentElement.style.display = 'none';
        }

        // Update chart with real data if exists
        if (stats.last_7_days && stats.last_7_days.length > 0) {
            updateChartWithRealData(stats.last_7_days);
        } else {
            // Hide chart container if no data
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.style.display = 'none';
            }
        }

        return stats;
    } catch (error) {
        console.error('Error in initVisitorCounters:', error);

        // Set all counters to 0 if error
        const statElements = ['statsTotal', 'statsUnique', 'statsWeek', 'statsToday'];
        statElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });

        // Hide growth rate
        const growthElement = document.getElementById('statsGrowth');
        if (growthElement) {
            growthElement.parentElement.style.display = 'none';
        }

        // Hide chart
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.style.display = 'none';
        }

        return null;
    }
}

// 5. VALUE ANIMATION HELPER
function animateValue(element, start, end, duration, isPercentage = false) {
    if (!element) return;

    start = isNaN(start) ? 0 : Number(start);
    end = isNaN(end) ? 0 : Number(end);

    console.log(`Animating: ${start} → ${end}`);

    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const value = Math.floor(start + (end - start) * easeOutQuart);

        if (isPercentage) {
            element.textContent = `${value}%`;
        } else {
            element.textContent = value.toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = isPercentage ? `${end}%` : end.toLocaleString();
        }
    };

    requestAnimationFrame(step);
}

// 6. UPDATE CHART WITH REAL DATA
function updateChartWithRealData(last7Days) {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx || !last7Days || last7Days.length === 0) return;

    const labels = last7Days.map(day => day.label);
    const visitsData = last7Days.map(day => day.visits);
    const uniqueData = last7Days.map(day => day.unique);

    // Destroy existing chart if exists
    if (window.visitorsChart) {
        window.visitorsChart.destroy();
    }

    // Create new chart with real data
    window.visitorsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Visits',
                    data: visitsData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Unique Visitors',
                    data: uniqueData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
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

// 7. PERIODIC UPDATES
async function updateLiveData() {
    try {
        const stats = await fetchVisitorStats();

        // Update counters with current values
        const statElements = {
            'statsTotal': stats.total_visits || 0,
            'statsUnique': stats.unique_visitors || 0,
            'statsWeek': stats.week_visits || 0,
            'statsToday': stats.today_visits || 0
        };

        for (const [elementId, targetValue] of Object.entries(statElements)) {
            const element = document.getElementById(elementId);
            if (element) {
                const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
                if (currentValue !== targetValue) {
                    animateValue(element, currentValue, targetValue, 1000);
                }
            }
        }

        // Update chart if data exists
        if (stats.last_7_days && stats.last_7_days.length > 0) {
            updateChartWithRealData(stats.last_7_days);
        }

        console.log('Live data updated at:', new Date().toLocaleTimeString());
    } catch (error) {
        console.error('Error updating live data:', error);
    }
}

// 8. SETUP PERIODIC UPDATES
function setupPeriodicUpdates() {
    // Initial update
    updateLiveData();

    // Update every 60 seconds
    setInterval(updateLiveData, 60000);
}

// 9. UI FUNCTIONS (keep all existing UI functions)
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

// 10. MAIN INITIALIZATION
document.addEventListener('DOMContentLoaded', function () {
    console.log('Max medical and healthcare  support - Initializing with REAL visitor tracking...');

    // Initialize all UI components
    initNavbarScroll();
    initMobileMenu();
    initBackToTop();
    initSmoothScrolling();
    initScrollAnimations();
    initFormAnimations();
    initModalClose();
    initPreloader();

    // Start animations after a short delay
    setTimeout(async () => {
        console.log('Starting animations with real data...');

        // Initialize hero stats (static business metrics)
        initHeroStats();

        // Initialize REAL visitor counters
        try {
            const stats = await initVisitorCounters();
            console.log('Real visitor counters initialized');

            // Start live updates
            setupPeriodicUpdates();
        } catch (error) {
            console.error('Failed to initialize visitor counters:', error);
        }

        console.log('Max medical and healthcare  support - Initialization complete!');
    }, 1000);
});

// Debug function
window.debugUpdateStats = function () {
    console.log('Manual stats update triggered');
    updateLiveData();
};