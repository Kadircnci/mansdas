"""
RQ Scheduler for managing scheduled posts
"""
import logging
from datetime import datetime
from rq_scheduler import Scheduler

from app.tasks import redis_conn
from app.db import get_engine
from app.models import Post
from sqlmodel import Session, select

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_scheduler():
    """
    Run the RQ scheduler to manage scheduled jobs.
    """
    logger.info("Starting RQ Scheduler for scheduled posts...")
    
    scheduler = Scheduler(connection=redis_conn)
    
    # Run the scheduler
    scheduler.run()

def sync_scheduled_posts():
    """
    Sync existing scheduled posts from database to RQ scheduler.
    This should be run when starting the scheduler to ensure consistency.
    """
    logger.info("Syncing scheduled posts from database...")
    
    try:
        engine = get_engine()
        with Session(engine) as session:
            # Find all posts that are scheduled but not yet processed
            scheduled_posts = session.exec(
                select(Post).where(
                    Post.status == "planli",
                    Post.scheduled_at.is_not(None)
                )
            ).all()
            
            scheduler = Scheduler(connection=redis_conn)
            
            for post in scheduled_posts:
                if post.scheduled_at:
                    try:
                        # Parse the scheduled datetime
                        scheduled_dt = datetime.fromisoformat(post.scheduled_at.replace('Z', '+00:00'))
                        
                        # Only schedule if the time is in the future
                        if scheduled_dt > datetime.now():
                            from app.tasks import publish_post
                            
                            job = scheduler.enqueue_at(
                                scheduled_dt,
                                publish_post,
                                post.id,
                                0  # Initial retry count
                            )
                            
                            logger.info(f"Synced post {post.id} scheduled for {scheduled_dt}, job ID: {job.id}")
                        else:
                            logger.warning(f"Post {post.id} scheduled time {scheduled_dt} is in the past, skipping")
                            
                    except Exception as e:
                        logger.error(f"Failed to sync post {post.id}: {e}")
            
            logger.info(f"Sync completed. Processed {len(scheduled_posts)} scheduled posts.")
            
    except Exception as e:
        logger.error(f"Failed to sync scheduled posts: {e}")

if __name__ == '__main__':
    # Sync existing posts first
    sync_scheduled_posts()
    
    # Then run the scheduler
    run_scheduler()

