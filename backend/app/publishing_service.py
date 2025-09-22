"""
Social Media Publishing Service
Handles actual posting to different social media platforms
"""
import os
import logging
from typing import Dict, Any, Optional
import requests
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class PublishingService:
    """Service for publishing content to social media platforms"""
    
    def __init__(self):
        self.demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"
        
    def publish_to_platform(self, platform: str, content: str, access_token: str, 
                          account_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publish content to a specific social media platform
        
        Args:
            platform: Platform name (instagram, twitter, facebook, linkedin)
            content: Content to publish
            access_token: Platform access token
            account_info: Account information including external_id, name etc.
            
        Returns:
            Dict with success status and platform response
        """
        if self.demo_mode:
            return self._demo_publish(platform, content, account_info)
        
        # Real API calls would go here
        if platform == "instagram":
            return self._publish_instagram(content, access_token, account_info)
        elif platform == "twitter":
            return self._publish_twitter(content, access_token, account_info)
        elif platform == "facebook":
            return self._publish_facebook(content, access_token, account_info)
        elif platform == "linkedin":
            return self._publish_linkedin(content, access_token, account_info)
        else:
            return {
                "success": False,
                "error": f"Unsupported platform: {platform}",
                "platform_response": None
            }
    
    def _demo_publish(self, platform: str, content: str, account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Demo mode - simulates publishing without actual API calls"""
        import random
        import time
        
        # Simulate processing time
        time.sleep(random.uniform(0.5, 2.0))
        
        # Simulate random failures (5% chance)
        if random.random() < 0.05:
            return {
                "success": False,
                "error": f"Demo API error for {platform}",
                "platform_response": {"error": "simulated_failure"}
            }
        
        # Success response
        return {
            "success": True,
            "error": None,
            "platform_response": {
                "platform": platform,
                "account": account_info.get("name", "Unknown"),
                "external_id": account_info.get("external_id", ""),
                "post_id": f"demo_{platform}_{random.randint(1000, 9999)}",
                "published_at": datetime.now().isoformat(),
                "content_length": len(content),
                "demo_mode": True
            }
        }
    
    def _publish_instagram(self, content: str, access_token: str, account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Publish to Instagram using Graph API"""
        try:
            # Instagram Graph API endpoint
            url = f"https://graph.facebook.com/v18.0/{account_info['external_id']}/media"
            
            payload = {
                "caption": content,
                "access_token": access_token
            }
            
            response = requests.post(url, data=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "error": None,
                    "platform_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"Instagram API error: {response.status_code}",
                    "platform_response": response.json() if response.text else None
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Instagram publishing failed: {str(e)}",
                "platform_response": None
            }
    
    def _publish_twitter(self, content: str, access_token: str, account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Publish to Twitter/X using API v2"""
        try:
            url = "https://api.twitter.com/2/tweets"
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "text": content
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "error": None,
                    "platform_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"Twitter API error: {response.status_code}",
                    "platform_response": response.json() if response.text else None
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Twitter publishing failed: {str(e)}",
                "platform_response": None
            }
    
    def _publish_facebook(self, content: str, access_token: str, account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Publish to Facebook using Graph API"""
        try:
            url = f"https://graph.facebook.com/v18.0/{account_info['external_id']}/feed"
            
            payload = {
                "message": content,
                "access_token": access_token
            }
            
            response = requests.post(url, data=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "error": None,
                    "platform_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"Facebook API error: {response.status_code}",
                    "platform_response": response.json() if response.text else None
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Facebook publishing failed: {str(e)}",
                "platform_response": None
            }
    
    def _publish_linkedin(self, content: str, access_token: str, account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Publish to LinkedIn using API v2"""
        try:
            url = "https://api.linkedin.com/v2/shares"
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            payload = {
                "content": {
                    "contentEntities": [],
                    "title": "Social Media Post"
                },
                "distribution": {
                    "linkedInDistributionTarget": {}
                },
                "owner": f"urn:li:person:{account_info['external_id']}",
                "subject": "Social Media Post",
                "text": {
                    "text": content
                }
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "error": None,
                    "platform_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"LinkedIn API error: {response.status_code}",
                    "platform_response": response.json() if response.text else None
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"LinkedIn publishing failed: {str(e)}",
                "platform_response": None
            }


# Global publishing service instance
publishing_service = PublishingService()