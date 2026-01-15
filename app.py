# app.py (updated database setup and tracking functions)

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import os
import logging
import secrets
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the current directory
BASE_DIR = Path(__file__).resolve().parent

# Create directories
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)

# Database setup for anonymous visitor tracking
DATABASE = BASE_DIR / "visitors.db"

def init_db():
    """Initialize database for anonymous visitor counting only"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Simplified visitors table - NO PERSONAL DATA
        c.execute('''CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Create index for faster queries
        c.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON visits(timestamp)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_visitor_id ON visits(visitor_id)")
        
        # Total counts table (for quick retrieval)
        c.execute('''CREATE TABLE IF NOT EXISTS total_counts (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_visits INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
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
    title="Max medical and healthcare  support",
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

def get_or_create_visitor_id(request: Request):
    """Get or create anonymous visitor ID using cookie (NO IP tracking)"""
    # Try to get existing visitor ID from cookie
    visitor_id = request.cookies.get("visitor_id")
    
    if not visitor_id:
        # Create new anonymous ID
        visitor_id = str(uuid.uuid4())
        logger.info(f"New visitor assigned ID: {visitor_id[:8]}...")
    
    return visitor_id

def track_visit(visitor_id: str):
    """Track a visit anonymously"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Check if this visitor has visited today (for daily unique count)
        today = datetime.now().strftime('%Y-%m-%d')
        c.execute(
            "SELECT COUNT(*) FROM visits WHERE visitor_id = ? AND DATE(timestamp) = ?", 
            (visitor_id, today)
        )
        has_visited_today = c.fetchone()[0] > 0
        
        # Always record the visit
        c.execute(
            "INSERT INTO visits (visitor_id) VALUES (?)", 
            (visitor_id,)
        )
        
        # Update total counts cache
        c.execute('''INSERT OR REPLACE INTO total_counts (id, total_visits, last_updated) 
                     VALUES (1, COALESCE((SELECT total_visits FROM total_counts WHERE id = 1), 0) + 1, 
                     CURRENT_TIMESTAMP)''')
        
        conn.commit()
        
        return {
            "is_new_today": not has_visited_today,
            "visitor_id": visitor_id[:8] + "..."  # Return truncated for logging only
        }
        
    except Exception as e:
        logger.error(f"Error tracking visit: {e}")
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

def get_visitor_stats():
    """Get visitor statistics (anonymous)"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get cached total visits
        c.execute("SELECT total_visits FROM total_counts WHERE id = 1")
        total_row = c.fetchone()
        total = total_row[0] if total_row else 0
        
        # Today's visits (all)
        today = datetime.now().strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visits WHERE DATE(timestamp) = ?", (today,))
        today_count = c.fetchone()[0] or 0
        
        # Today's unique visitors
        c.execute("SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE DATE(timestamp) = ?", (today,))
        today_unique = c.fetchone()[0] or 0
        
        # This week's visits
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visits WHERE DATE(timestamp) >= ?", (week_ago,))
        week_count = c.fetchone()[0] or 0
        
        # This month's visits
        month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        c.execute("SELECT COUNT(*) FROM visits WHERE DATE(timestamp) >= ?", (month_ago,))
        month_count = c.fetchone()[0] or 0
        
        # Unique visitors all time
        c.execute("SELECT COUNT(DISTINCT visitor_id) FROM visits")
        unique = c.fetchone()[0] or 0
        
        # Visitors in last 24 hours
        day_ago = datetime.now() - timedelta(hours=24)
        c.execute("SELECT COUNT(*) FROM visits WHERE timestamp >= ?", (day_ago,))
        last_24h = c.fetchone()[0] or 0
        
        # Last 7 days data for chart
        last_7_days = []
        for i in range(6, -1, -1):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            day_label = (datetime.now() - timedelta(days=i)).strftime('%a')
            
            c.execute("SELECT COUNT(*) FROM visits WHERE DATE(timestamp) = ?", (date,))
            day_count = c.fetchone()[0] or 0
            
            c.execute("SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE DATE(timestamp) = ?", (date,))
            day_unique = c.fetchone()[0] or 0
            
            last_7_days.append({
                "date": date,
                "label": day_label,
                "visits": day_count,
                "unique": day_unique
            })
        
        conn.close()
        
        return {
            "total_visits": total,
            "today_visits": today_count,
            "today_unique": today_unique,
            "week_visits": week_count,
            "month_visits": month_count,
            "unique_visitors": unique,
            "last_24h_visits": last_24h,
            "last_7_days": last_7_days,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {
            "total_visits": 0,
            "today_visits": 0,
            "today_unique": 0,
            "week_visits": 0,
            "month_visits": 0,
            "unique_visitors": 0,
            "last_24h_visits": 0,
            "last_7_days": [],
            "timestamp": datetime.now().isoformat()
        }

# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page route - serves index.html"""
    try:
        # Get or create anonymous visitor ID
        visitor_id = get_or_create_visitor_id(request)
        
        # Track visit (anonymous)
        track_result = track_visit(visitor_id)
        
        # Serve index.html from root directory
        html_path = BASE_DIR / "index.html"
        
        if not html_path.exists():
            logger.error(f"index.html not found at: {html_path}")
            raise HTTPException(status_code=404, detail="index.html not found")
        
        # Read HTML file
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Create response with visitor ID cookie (30 days expiration)
        response = HTMLResponse(content=html_content, status_code=200)
        response.set_cookie(
            key="visitor_id",
            value=visitor_id,
            max_age=30*24*60*60,  # 30 days
            httponly=True,
            samesite="lax"
        )
        
        logger.info(f"Served home page to visitor: {visitor_id[:8]}... (new today: {track_result.get('is_new_today', False)})")
        return response
        
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

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Max medical and healthcare  support Website",
        "timestamp": datetime.now().isoformat(),
        "database": os.path.exists(DATABASE),
        "index_html": os.path.exists(BASE_DIR / "index.html"),
        "static_dir": os.path.exists(STATIC_DIR),
        "uptime": "running"
    }

# Debug endpoint (simplified)
@app.get("/debug")
async def debug_info():
    """Debug endpoint to check server status"""
    stats = get_visitor_stats()
    return {
        "server_time": datetime.now().isoformat(),
        "visitor_stats": {
            "total_visits": stats["total_visits"],
            "unique_visitors": stats["unique_visitors"],
            "today_visits": stats["today_visits"]
        }
    }

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
                "/health - Health check",
                "/debug - Debug information"
            ]
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("🚀 Starting Max medical and healthcare  support Website")
    print("=" * 50)
    print("📊 Anonymous Visitor Tracking Enabled")
    print("🚫 No IP or personal data stored")
    print("🍪 Using cookies for unique visitor identification")
    print("\n🌐 Website URL: http://localhost:8000")
    print("📈 Stats API: http://localhost:8000/api/stats")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)