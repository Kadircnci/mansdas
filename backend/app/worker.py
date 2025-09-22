"""
RQ Worker for processing background jobs
"""
import logging
from rq import Worker, Connection

from app.tasks import redis_conn, task_queue

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_worker():
    """
    Run the RQ worker to process background jobs.
    """
    logger.info("Starting RQ Worker for post publishing...")
    
    with Connection(redis_conn):
        worker = Worker([task_queue], name='post-publisher')
        worker.work()

if __name__ == '__main__':
    run_worker()

