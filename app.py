from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import os
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the current directory
BASE_DIR = Path(__file__).resolve().parent

# Create directories
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)

# Database setup for visitor tracking only
DATABASE = BASE_DIR / "visitors.db"

def init_db():
    """Initialize database for visitor tracking only"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Visitors table
        c.execute('''CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT,
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            page TEXT
        )''')
        
        # Create index for faster queries
        c.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON visitors(timestamp)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_ip ON visitors(ip)")
        
        conn.commit()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
    finally:
        if conn:
            conn.close()

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="MediTour - Medical Tourism Website",
    description="A platform for medical tourism services",
    version="1.0.0",
    debug=True
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def track_visitor(ip: str, user_agent: str, page: str = "/"):
    """Track visitor information"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute(
            "INSERT INTO visitors (ip, user_agent, page) VALUES (?, ?, ?)", 
            (ip, user_agent, page)
        )
        conn.commit()
        logger.info(f"Visitor tracked: {ip} on {page}")
        return True
    except Exception as e:
        logger.error(f"Error tracking visitor: {e}")
        return False
    finally:
        if conn:
            conn.close()

def get_visitor_stats():
    """Get visitor statistics"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Total visitors
        c.execute("SELECT COUNT(*) FROM visitors")
        total = c.fetchone()[0] or 0
        
        # Today's visitors
        today = datetime.now().strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visitors WHERE DATE(timestamp) = ?", (today,))
        today_count = c.fetchone()[0] or 0
        
        # This week's visitors
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visitors WHERE DATE(timestamp) >= ?", (week_ago,))
        week_count = c.fetchone()[0] or 0
        
        # This month's visitors
        month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visitors WHERE DATE(timestamp) >= ?", (month_ago,))
        month_count = c.fetchone()[0] or 0
        
        # Unique visitors (based on IP)
        c.execute("SELECT COUNT(DISTINCT ip) FROM visitors")
        unique = c.fetchone()[0] or 0
        
        # Visitors in last 24 hours
        day_ago = datetime.now() - timedelta(hours=24)
        c.execute("SELECT COUNT(*) FROM visitors WHERE timestamp >= ?", (day_ago,))
        last_24h = c.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "total_visitors": total,
            "today_visitors": today_count,
            "week_visitors": week_count,
            "month_visitors": month_count,
            "unique_visitors": unique,
            "last_24h_visitors": last_24h,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {
            "total_visitors": 0,
            "today_visitors": 0,
            "week_visitors": 0,
            "month_visitors": 0,
            "unique_visitors": 0,
            "last_24h_visitors": 0,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

def get_live_visitors(minutes: int = 5):
    """Get visitors from the last X minutes (live visitors)"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get timestamp X minutes ago
        time_ago = datetime.now() - timedelta(minutes=minutes)
        
        # Get visitors from last X minutes
        c.execute("""
            SELECT ip, user_agent, timestamp, page 
            FROM visitors 
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
        """, (time_ago,))
        
        visitors = []
        rows = c.fetchall()
        for row in rows:
            visitors.append({
                "ip": row[0] or "unknown",
                "user_agent": row[1] or "unknown",
                "timestamp": row[2] or datetime.now().isoformat(),
                "page": row[3] or "/",
                "time_ago": get_time_ago(row[2]) if row[2] else "just now"
            })
        
        # Get unique IPs in last X minutes
        c.execute("""
            SELECT COUNT(DISTINCT ip) 
            FROM visitors 
            WHERE timestamp >= ?
        """, (time_ago,))
        
        unique_count = c.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "total": len(visitors),
            "unique": unique_count,
            "time_period_minutes": minutes,
            "visitors": visitors,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting live visitors: {e}")
        return {
            "total": 0,
            "unique": 0,
            "time_period_minutes": minutes,
            "visitors": [],
            "error": str(e)
        }

def get_time_ago(timestamp_str: str) -> str:
    """Convert timestamp to human-readable time ago"""
    try:
        if isinstance(timestamp_str, str):
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            timestamp = timestamp_str
            
        now = datetime.now()
        diff = now - timestamp
        
        if diff.total_seconds() < 60:
            return "just now"
        elif diff.total_seconds() < 3600:
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        else:
            days = int(diff.total_seconds() / 86400)
            return f"{days} day{'s' if days > 1 else ''} ago"
    except:
        return "recently"

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    if request.client:
        ip = request.client.host
        # Check for X-Forwarded-For header if behind proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        return ip
    return "unknown"

# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page route - serves index.html"""
    try:
        # Get client IP and user agent
        ip = get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "unknown")
        
        # Track visitor
        track_visitor(ip, user_agent, "/")
        
        # Serve index.html from root directory
        html_path = BASE_DIR / "templates/index.html"
        
        if not html_path.exists():
            logger.error(f"index.html not found at: {html_path}")
            raise HTTPException(status_code=404, detail="index.html not found")
        
        # Read and return HTML file
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        logger.info(f"Served home page to {ip}")
        return HTMLResponse(content=html_content, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving home page: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# API endpoints
@app.get("/api/stats")
async def stats_api():
    """API endpoint to get visitor statistics"""
    return JSONResponse(get_visitor_stats())

@app.get("/api/live-visitors")
async def live_visitors_api(minutes: int = 5):
    """API endpoint to get live visitors (from last X minutes)"""
    return JSONResponse(get_live_visitors(minutes))

@app.get("/api/visitors/recent")
async def recent_visitors(limit: int = 20):
    """API endpoint to get recent visitors"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("""
            SELECT ip, user_agent, timestamp, page 
            FROM visitors 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        visitors = []
        rows = c.fetchall()
        for row in rows:
            visitors.append({
                "ip": row[0] or "unknown",
                "user_agent": row[1] or "unknown",
                "timestamp": row[2] or datetime.now().isoformat(),
                "page": row[3] or "/",
                "time_ago": get_time_ago(row[2]) if row[2] else "just now"
            })
        
        conn.close()
        return JSONResponse(visitors)
        
    except Exception as e:
        logger.error(f"Error getting recent visitors: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/visitors/count")
async def visitor_count(days: int = None, hours: int = None):
    """API endpoint to get visitor count for specific period"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        if hours:
            time_filter = datetime.now() - timedelta(hours=hours)
            c.execute("SELECT COUNT(*) FROM visitors WHERE timestamp >= ?", (time_filter,))
            period = f"{hours} hours"
        elif days:
            time_filter = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            c.execute("SELECT COUNT(*) FROM visitors WHERE DATE(timestamp) >= ?", (time_filter,))
            period = f"{days} days"
        else:
            c.execute("SELECT COUNT(*) FROM visitors")
            period = "all time"
        
        count = c.fetchone()[0] or 0
        
        # Get unique count for the same period
        if hours:
            c.execute("SELECT COUNT(DISTINCT ip) FROM visitors WHERE timestamp >= ?", (time_filter,))
        elif days:
            c.execute("SELECT COUNT(DISTINCT ip) FROM visitors WHERE DATE(timestamp) >= ?", (time_filter,))
        else:
            c.execute("SELECT COUNT(DISTINCT ip) FROM visitors")
        
        unique_count = c.fetchone()[0] or 0
        
        conn.close()
        
        return JSONResponse({
            "total": count, 
            "unique": unique_count,
            "period": period,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting visitor count: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MediTour Website",
        "timestamp": datetime.now().isoformat(),
        "database": os.path.exists(DATABASE),
        "index_html": os.path.exists(BASE_DIR / "index.html"),
        "static_dir": os.path.exists(STATIC_DIR),
        "uptime": "running"
    }

# Debug endpoint
@app.get("/debug")
async def debug_info():
    """Debug endpoint to check server status"""
    return {
        "base_dir": str(BASE_DIR),
        "files": {
            "index.html": os.path.exists(BASE_DIR / "index.html"),
            "style.css": os.path.exists(BASE_DIR / "static/css/style.css"),
            "main.js": os.path.exists(BASE_DIR / "static/js/main.js"),
            "visitors.db": os.path.exists(DATABASE),
            "app.py": os.path.exists(BASE_DIR / "app.py")
        },
        "static_files": {
            "css": os.listdir(BASE_DIR / "static/css") if os.path.exists(BASE_DIR / "static/css") else [],
            "js": os.listdir(BASE_DIR / "static/js") if os.path.exists(BASE_DIR / "static/js") else []
        },
        "stats": get_visitor_stats(),
        "live_visitors": get_live_visitors(5),
        "server_time": datetime.now().isoformat()
    }

@app.get("/favicon.ico")
async def favicon():
    """Handle favicon requests"""
    favicon_path = BASE_DIR / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    favicon_path = STATIC_DIR / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    return JSONResponse({"status": "no favicon"}, status_code=404)

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "message": "Resource not found", 
            "path": str(request.url.path),
            "available_endpoints": [
                "/ - Home page",
                "/api/stats - Visitor statistics",
                "/api/live-visitors - Live visitors (last 5 minutes)",
                "/api/visitors/recent - Recent visitors",
                "/api/visitors/count - Visitor count by period",
                "/health - Health check",
                "/debug - Debug information"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("🚀 Starting MediTour Medical Tourism Website")
    print("=" * 50)
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"📁 Base directory: {BASE_DIR}")
    print(f"📄 Main HTML file: {BASE_DIR / 'index.html'} (exists: {os.path.exists(BASE_DIR / 'index.html')})")
    print(f"🎨 Static files directory: {STATIC_DIR} (exists: {os.path.exists(STATIC_DIR)})")
    print(f"🗄️  Database: {DATABASE} (exists: {os.path.exists(DATABASE)})")
    print("\n✅ Server initialized")
    print("\n🌐 Website URLs:")
    print("   - Main site: http://localhost:8000")
    print("   - Health check: http://localhost:8000/health")
    print("   - Debug info: http://localhost:8000/debug")
    print("   - Visitor stats API: http://localhost:8000/api/stats")
    print("   - Live visitors API: http://localhost:8000/api/live-visitors")
    print("   - Recent visitors API: http://localhost:8000/api/visitors/recent")
    print("\n⚡ Running FastAPI with Uvicorn...")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)