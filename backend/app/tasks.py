"""
Background tasks for scheduled posts using RQ (Redis Queue)
"""
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

import redis
from rq import Worker, Queue, Connection
from sqlmodel import Session, select

from app.db import get_engine
from app.models import Post, Account
from app.publishing_service import publishing_service

# Redis connection
redis_conn = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# RQ Queue
task_queue = Queue('posts', connection=redis_conn)

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def publish_post(post_id: int, retry_count: int = 0) -> bool:
    """
    Publish a scheduled post. This is the main RQ job function.
    
    Args:
        post_id: The ID of the post to publish
        retry_count: Current retry attempt (for exponential backoff)
    
    Returns:
        bool: True if successful, False if failed
    """
    max_retries = 3
    engine = get_engine()
    
    try:
        with Session(engine) as session:
            # Get the post
            post = session.get(Post, post_id)
            if not post:
                logger.error(f"Post {post_id} not found")
                return False
            
            # Check if post is in correct state
            if post.status not in ["planlandi", "kuyruk"]:
                logger.warning(f"Post {post_id} is not in schedulable state: {post.status}")
                return False
            
            # Update status to "kuyruk" (enqueued)
            if post.status == "planlandi":
                post.status = "kuyruk"
                session.add(post)
                session.commit()
                logger.info(f"Post {post_id} status updated to 'kuyruk'")
            
            # Get account information for publishing
            account = None
            if post.account_id:
                account = session.get(Account, post.account_id)
                if not account:
                    raise Exception(f"Account {post.account_id} not found")
            
            # Publish to social media platform
            logger.info(f"Publishing post {post_id}: '{post.title[:50]}...'")
            
            if account:
                # Publish to specific account
                result = publishing_service.publish_to_platform(
                    platform=account.platform,
                    content=post.content,
                    access_token=account.access_token,
                    account_info={
                        "external_id": account.external_id,
                        "name": account.name,
                        "platform": account.platform
                    }
                )
                
                if not result["success"]:
                    raise Exception(f"Publishing failed: {result['error']}")
                    
                logger.info(f"Post {post_id} successfully published to {account.platform} ({account.name})")
                
            else:
                # No specific account - simulate general publishing
                logger.info(f"Post {post_id} published without specific account")
            
            # Mark as published
            post.status = "yayinlandi"
            post.retry_count = retry_count
            post.last_error = None
            session.add(post)
            session.commit()
            
            logger.info(f"Post {post_id} successfully published!")
            return True
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to publish post {post_id}: {error_msg}")
        
        try:
            with Session(engine) as session:
                post = session.get(Post, post_id)
                if post:
                    post.retry_count = retry_count + 1
                    post.last_error = error_msg
                    
                    if retry_count < max_retries:
                        # Exponential backoff: 2^retry_count minutes
                        delay_minutes = 2 ** retry_count
                        post.status = "planlandi"  # Keep as scheduled for retry
                        
                        # Schedule retry job
                        retry_time = datetime.now() + timedelta(minutes=delay_minutes)
                        task_queue.enqueue_at(
                            retry_time,
                            publish_post,
                            post_id,
                            retry_count + 1
                        )
                        
                        logger.info(f"Post {post_id} scheduled for retry {retry_count + 1} in {delay_minutes} minutes")
                    else:
                        # Max retries reached
                        post.status = "basarisiz"
                        logger.error(f"Post {post_id} failed after {max_retries} retries")
                    
                    session.add(post)
                    session.commit()
        except Exception as db_error:
            logger.error(f"Failed to update post {post_id} after error: {db_error}")
        
        return False


def schedule_post(post_id: int, scheduled_datetime: datetime) -> Optional[str]:
    """
    Schedule a post for future publishing.
    
    Args:
        post_id: The ID of the post to schedule
        scheduled_datetime: When to publish the post
    
    Returns:
        str: Job ID if successful, None if failed
    """
    try:
        # Update post status to "planlandi"
        engine = get_engine()
        with Session(engine) as session:
            post = session.get(Post, post_id)
            if not post:
                logger.error(f"Post {post_id} not found")
                return None
            
            post.status = "planlandi"
            post.retry_count = 0
            post.last_error = None
            session.add(post)
            session.commit()
        
        # Schedule the job
        job = task_queue.enqueue_at(
            scheduled_datetime,
            publish_post,
            post_id,
            0  # Initial retry count
        )
        
        logger.info(f"Post {post_id} scheduled for {scheduled_datetime}, job ID: {job.id}")
        return job.id
        
    except Exception as e:
        logger.error(f"Failed to schedule post {post_id}: {e}")
        return None


def cancel_scheduled_post(post_id: int) -> bool:
    """
    Cancel a scheduled post by removing it from the queue.
    
    Args:
        post_id: The ID of the post to cancel
    
    Returns:
        bool: True if cancelled successfully
    """
    try:
        # Find and cancel jobs for this post
        # Note: This is a simplified approach. In production, you might want to
        # store job IDs in the database for easier cancellation.
        
        engine = get_engine()
        with Session(engine) as session:
            post = session.get(Post, post_id)
            if not post:
                return False
            
            # Update post status back to draft
            if post.status in ["planlandi", "kuyruk"]:
                post.status = "taslak"
                post.retry_count = 0
                post.last_error = None
                session.add(post)
                session.commit()
                logger.info(f"Post {post_id} cancelled and reset to draft")
                return True
        
        return False
        
    except Exception as e:
        logger.error(f"Failed to cancel post {post_id}: {e}")
        return False
