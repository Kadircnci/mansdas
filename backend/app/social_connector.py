"""
Sosyal Medya Hesap Bağlama Servisi
OAuth flow ve token yönetimi için
"""
import os
import requests
import hashlib
import secrets
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select
from .models import Account, User as UserModel
from .db import get_engine

# Environment variables'ı yükle
from dotenv import load_dotenv
load_dotenv()

class SocialMediaConnector:
    """Sosyal medya hesap bağlama ve OAuth yönetimi"""
    
    def __init__(self):
        self.oauth_sessions = {}  # Geçici OAuth session storage
        
    def get_oauth_url(self, platform: str, user_id: int, redirect_uri: str) -> Dict[str, Any]:
        """OAuth URL'i oluştur ve session bilgilerini kaydet"""
        
        # State parameter for security
        state = secrets.token_urlsafe(32)
        
        oauth_configs = {
            "instagram": {
                "client_id": os.getenv("INSTAGRAM_CLIENT_ID", "demo_instagram_client"),
                "scope": "user_profile,user_media",
                "auth_url": "https://api.instagram.com/oauth/authorize"
            },
            "facebook": {
                "client_id": os.getenv("FACEBOOK_CLIENT_ID", "demo_facebook_client"),
                "scope": "pages_manage_posts,pages_read_engagement",
                "auth_url": "https://www.facebook.com/v18.0/dialog/oauth"
            },
            "twitter": {
                "client_id": os.getenv("TWITTER_CLIENT_ID", "demo_twitter_client"),
                "scope": "tweet.read,tweet.write,users.read",
                "auth_url": "https://twitter.com/i/oauth2/authorize"
            },
            "linkedin": {
                "client_id": os.getenv("LINKEDIN_CLIENT_ID", "demo_linkedin_client"),
                "scope": "w_member_social,r_basicprofile",
                "auth_url": "https://www.linkedin.com/oauth/v2/authorization"
            }
        }
        
        if platform not in oauth_configs:
            raise ValueError(f"Desteklenmeyen platform: {platform}")
        
        config = oauth_configs[platform]
        
        # OAuth session bilgilerini kaydet
        self.oauth_sessions[state] = {
            "user_id": user_id,
            "platform": platform,
            "timestamp": datetime.now(),
            "redirect_uri": redirect_uri
        }
        
        # OAuth URL'i oluştur
        oauth_url = (
            f"{config['auth_url']}?"
            f"client_id={config['client_id']}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={config['scope']}&"
            f"response_type=code&"
            f"state={state}"
        )
        
        return {
            "oauth_url": oauth_url,
            "state": state,
            "platform": platform,
            "instructions": self._get_platform_instructions(platform)
        }
    
    def _get_platform_instructions(self, platform: str) -> Dict[str, str]:
        """Platform-specific instructions"""
        instructions = {
            "instagram": {
                "title": "Instagram Hesabı Bağlama",
                "steps": [
                    "1. Instagram'a giriş yapın",
                    "2. Hesabınızı seçin ve izinleri onaylayın",
                    "3. Geri yönlendirilmenizi bekleyin"
                ],
                "requirements": "Instagram Business veya Creator hesabı gerekli"
            },
            "facebook": {
                "title": "Facebook Sayfa Bağlama",
                "steps": [
                    "1. Facebook'a giriş yapın",
                    "2. Yönettiğiniz sayfayı seçin",
                    "3. İzinleri onaylayın"
                ],
                "requirements": "Facebook sayfa yöneticisi olmalısınız"
            },
            "twitter": {
                "title": "Twitter Hesabı Bağlama",
                "steps": [
                    "1. Twitter'a giriş yapın",
                    "2. Uygulamaya izin verin",
                    "3. Geri yönlendirilmenizi bekleyin"
                ],
                "requirements": "Twitter hesabınız aktif olmalı"
            },
            "linkedin": {
                "title": "LinkedIn Hesabı Bağlama",
                "steps": [
                    "1. LinkedIn'e giriş yapın",
                    "2. İzinleri onaylayın",
                    "3. Geri yönlendirilmenizi bekleyin"
                ],
                "requirements": "LinkedIn hesabınız olmalı"
            }
        }
        
        return instructions.get(platform, {})
    
    def exchange_code_for_token(self, code: str, state: str) -> Dict[str, Any]:
        """OAuth code'u access token ile değiştir"""
        
        # Session kontrolü
        if state not in self.oauth_sessions:
            raise ValueError("Geçersiz OAuth session")
        
        session_data = self.oauth_sessions[state]
        
        # Session timeout kontrolü (10 dakika)
        if datetime.now() - session_data["timestamp"] > timedelta(minutes=10):
            del self.oauth_sessions[state]
            raise ValueError("OAuth session süresi dolmuş")
        
        platform = session_data["platform"]
        user_id = session_data["user_id"]
        
        # Demo mode için simulated token exchange
        if os.getenv("DEMO_MODE", "true").lower() == "true":
            return self._demo_token_exchange(platform, user_id, code)
        
        # Gerçek token exchange (platform-specific)
        return self._real_token_exchange(platform, code, session_data["redirect_uri"])
    
    def _demo_token_exchange(self, platform: str, user_id: int, code: str) -> Dict[str, Any]:
        """Demo mode için simulated token exchange"""
        
        # Simulated account info
        demo_accounts = {
            "instagram": {
                "id": f"demo_ig_{user_id}",
                "username": "demo_instagram_account",
                "name": "Demo Instagram Account",
                "profile_picture": "https://via.placeholder.com/150"
            },
            "facebook": {
                "id": f"demo_fb_{user_id}",
                "username": "demo_facebook_page",
                "name": "Demo Facebook Page",
                "profile_picture": "https://via.placeholder.com/150"
            },
            "twitter": {
                "id": f"demo_tw_{user_id}",
                "username": "demo_twitter_user",
                "name": "Demo Twitter Account",
                "profile_picture": "https://via.placeholder.com/150"
            },
            "linkedin": {
                "id": f"demo_li_{user_id}",
                "username": "demo_linkedin_user",
                "name": "Demo LinkedIn Account",
                "profile_picture": "https://via.placeholder.com/150"
            }
        }
        
        account_info = demo_accounts.get(platform, {})
        
        return {
            "success": True,
            "access_token": f"demo_{platform}_token_{secrets.token_hex(16)}",
            "account_info": account_info,
            "expires_in": 3600,
            "demo_mode": True
        }
    
    def _real_token_exchange(self, platform: str, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Gerçek platform API'si ile token exchange"""
        
        token_urls = {
            "instagram": "https://api.instagram.com/oauth/access_token",
            "facebook": "https://graph.facebook.com/v18.0/oauth/access_token",
            "twitter": "https://api.twitter.com/2/oauth2/token",
            "linkedin": "https://www.linkedin.com/oauth/v2/accessToken"
        }
        
        client_secrets = {
            "instagram": os.getenv("INSTAGRAM_CLIENT_SECRET"),
            "facebook": os.getenv("FACEBOOK_CLIENT_SECRET"),
            "twitter": os.getenv("TWITTER_CLIENT_SECRET"),
            "linkedin": os.getenv("LINKEDIN_CLIENT_SECRET")
        }
        
        client_ids = {
            "instagram": os.getenv("INSTAGRAM_CLIENT_ID"),
            "facebook": os.getenv("FACEBOOK_CLIENT_ID"),
            "twitter": os.getenv("TWITTER_CLIENT_ID"),
            "linkedin": os.getenv("LINKEDIN_CLIENT_ID")
        }
        
        if platform not in token_urls:
            raise ValueError(f"Desteklenmeyen platform: {platform}")
        
        try:
            # Token exchange request
            response = requests.post(token_urls[platform], data={
                "client_id": client_ids[platform],
                "client_secret": client_secrets[platform],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri
            }, timeout=30)
            
            if response.status_code == 200:
                token_data = response.json()
                
                # Platform-specific account info alma
                account_info = self._get_account_info(platform, token_data["access_token"])
                
                return {
                    "success": True,
                    "access_token": token_data["access_token"],
                    "account_info": account_info,
                    "expires_in": token_data.get("expires_in", 3600),
                    "demo_mode": False
                }
            else:
                return {
                    "success": False,
                    "error": f"Token exchange failed: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Token exchange error: {str(e)}"
            }
    
    def _get_account_info(self, platform: str, access_token: str) -> Dict[str, Any]:
        """Platform API'sinden hesap bilgilerini al"""
        
        api_urls = {
            "instagram": "https://graph.instagram.com/me?fields=id,username,name,profile_picture_url",
            "facebook": "https://graph.facebook.com/me?fields=id,name,picture",
            "twitter": "https://api.twitter.com/2/users/me",
            "linkedin": "https://api.linkedin.com/v2/people/~"
        }
        
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(api_urls[platform], headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {}
                
        except Exception:
            return {}
    
    def save_account(self, user_id: int, platform: str, token_data: Dict[str, Any]) -> int:
        """Hesap bilgilerini veritabanına kaydet"""
        
        engine = get_engine()
        
        with Session(engine) as session:
            # Mevcut hesabı kontrol et
            existing = session.exec(
                select(Account).where(
                    Account.owner_id == user_id,
                    Account.platform == platform,
                    Account.external_id == token_data["account_info"].get("id", "")
                )
            ).first()
            
            if existing:
                # Mevcut hesabı güncelle
                existing.access_token = token_data["access_token"]
                existing.name = token_data["account_info"].get("name", "")
                existing.is_active = True
                session.add(existing)
                account_id = existing.id
            else:
                # Yeni hesap oluştur
                new_account = Account(
                    owner_id=user_id,
                    platform=platform,
                    external_id=token_data["account_info"].get("id", f"new_{platform}_{user_id}"),
                    name=token_data["account_info"].get("name", f"New {platform.title()} Account"),
                    access_token=token_data["access_token"],
                    is_active=True
                )
                session.add(new_account)
                session.commit()
                session.refresh(new_account)
                account_id = new_account.id
            
            session.commit()
            return account_id
    
    def disconnect_account(self, user_id: int, account_id: int) -> bool:
        """Hesap bağlantısını kes"""
        
        engine = get_engine()
        
        with Session(engine) as session:
            account = session.exec(
                select(Account).where(
                    Account.id == account_id,
                    Account.owner_id == user_id
                )
            ).first()
            
            if account:
                account.is_active = False
                account.access_token = ""
                session.add(account)
                session.commit()
                return True
            
            return False


# Global connector instance
social_connector = SocialMediaConnector()