from typing import List, Optional
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .db import get_session
from .models import Post
from .models import Account
from .models import User as UserModel
from .auth import get_current_user, User
from .social_connector import social_connector


class PostCreate(BaseModel):
  title: str
  content: str
  scheduled_at: Optional[str] = None
  platforms: Optional[list[str]] = None
  caption: Optional[str] = None
  tone: Optional[str] = None
  account_id: Optional[int] = None


class PostRead(BaseModel):
  id: int
  title: str
  content: str
  scheduled_at: Optional[str] = None
  status: str = "taslak"
  retry_count: int = 0
  last_error: Optional[str] = None
  author_id: int
  author_username: str
  platforms: list[str] = []
  caption: Optional[str] = None
  tone: Optional[str] = None
  account_id: Optional[int] = None


class PostScheduleRequest(BaseModel):
  scheduled_at: str  # ISO datetime string


class PostStatusUpdate(BaseModel):
  status: str  # yeni status


router = APIRouter(prefix="/posts", tags=["posts"]) 
class CaptionRequest(BaseModel):
  title: str
  content: str
  tone: str | None = None
  platforms: list[str] | None = None


class CaptionResponse(BaseModel):
  caption: str


@router.post("/caption", response_model=CaptionResponse)
def generate_caption(payload: CaptionRequest, user: User = Depends(get_current_user)):
  """
  Generate a caption using tone and platforms using our ContentGenerationService.
  """
  try:
    from .content_service import ContentGenerationService
    content_service = ContentGenerationService()
    
    # Map tone values to our AI service format
    tone_mapping = {
      "ciddi": "ciddi",
      "kurumsal": "kurumsal", 
      "samimi": "samimi",
      "eğlenceli": "eğlenceli",
      "bilgilendirici": "bilgilendirici",
      "motive edici": "motive edici",
      "resmi": "ciddi",
      "acil_uyari": "ciddi",
      "tesvik_edici": "motive edici",
      "kapsayici": "samimi"
    }
    
    mapped_tone = tone_mapping.get(payload.tone, "kurumsal")
    platforms_text = ", ".join(payload.platforms) if payload.platforms else ""
    
    # Create a prompt combining title and content
    user_prompt = f"{payload.content}"
    if payload.platforms:
      user_prompt += f" Bu içerik {platforms_text} platformu/platformları için hazırlanacak."
    
    generated_content = content_service.generate_content(
      title=payload.title,
      tone=mapped_tone,
      user_prompt=user_prompt
    )
    
    return CaptionResponse(caption=generated_content)
    
  except Exception as e:
    # Fallback to simple template if AI fails
    raw_title = (payload.title or "").strip()
    raw_content = (payload.content or "").strip()
    base_text = raw_content if raw_content else raw_title
    
    if len(base_text) > 200:
      base_text = base_text[:197] + "..."
    
    return CaptionResponse(caption=base_text or "İçerik hazırlandı.")


@router.put("/{post_id}/status", response_model=PostRead)
def update_post_status(
    post_id: int, 
    payload: PostStatusUpdate, 
    session: Session = Depends(get_session), 
    user: User = Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekiyor")
    
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    
    # Status güncelleme
    post.status = payload.status
    session.add(post)
    session.commit()
    session.refresh(post)
    
    return PostRead(
        id=post.id,
        title=post.title,
        content=post.content,
        scheduled_at=post.scheduled_at,
        status=post.status,
        retry_count=post.retry_count,
        last_error=post.last_error
    )


@router.get("/", response_model=List[PostRead])
def list_posts(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  # Admin tüm gönderileri görebilir, normal kullanıcılar sadece kendi gönderilerini
  if user.role == "admin":
    query = select(Post).order_by(Post.id.desc())
  else:
    query = select(Post).where(Post.author_id == user.id).order_by(Post.id.desc())
  
  items = session.exec(query).all()
  results: list[PostRead] = []
  for i in items:
    author = session.get(UserModel, i.author_id)
    results.append(PostRead(
      id=i.id,
      title=i.title,
      content=i.content,
      scheduled_at=i.scheduled_at,
      status=i.status,
      retry_count=i.retry_count,
      last_error=i.last_error,
      author_id=i.author_id,
      author_username=author.username if author else "unknown"
    ))
  return results


@router.post("/", response_model=PostRead)
def create_post(payload: PostCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  obj = Post(
    author_id=user.id,
    title=payload.title,
    content=payload.content,
    scheduled_at=payload.scheduled_at,
    platforms=payload.platforms or [],
    caption=payload.caption,
    tone=payload.tone,
    account_id=payload.account_id,
  )
  
  # If scheduled_at is provided, schedule the post
  if payload.scheduled_at:
    try:
      scheduled_dt = datetime.fromisoformat(payload.scheduled_at.replace('Z', '+00:00'))
      if scheduled_dt > datetime.now():
        from .tasks import schedule_post
        obj.status = "planlandi"
        session.add(obj)
        session.commit()
        session.refresh(obj)
        
        # Schedule the job
        job_id = schedule_post(obj.id, scheduled_dt)
        if job_id:
          return PostRead(
            id=obj.id, 
            title=obj.title, 
            content=obj.content, 
            scheduled_at=obj.scheduled_at,
            status=obj.status,
            retry_count=obj.retry_count,
            last_error=obj.last_error
          )
    except Exception as e:
      obj.last_error = f"Scheduling error: {str(e)}"
  
  session.add(obj)
  session.commit()
  session.refresh(obj)
  author = session.get(UserModel, obj.author_id)
  return PostRead(
    id=obj.id,
    title=obj.title,
    content=obj.content,
    scheduled_at=obj.scheduled_at,
    status=obj.status,
    retry_count=obj.retry_count,
    last_error=obj.last_error,
    author_id=obj.author_id,
    author_username=author.username if author else "unknown",
    platforms=obj.platforms or [],
    caption=obj.caption,
    tone=obj.tone,
    account_id=obj.account_id,
  )


# ----- Accounts minimal CRUD -----
accounts_router = APIRouter(prefix="/accounts", tags=["accounts"]) 


class AccountIn(BaseModel):
  platform: str
  external_id: str
  name: str | None = None
  access_token: str | None = None
  refresh_token: str | None = None
  expires_at: str | None = None


class AccountOut(BaseModel):
  id: int
  platform: str
  external_id: str
  name: str | None = None


@accounts_router.get("/", response_model=List[AccountOut])
def list_accounts(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  items = session.exec(select(Account).where(Account.owner_id == user.id).order_by(Account.id.desc())).all()
  return [AccountOut(id=i.id, platform=i.platform, external_id=i.external_id, name=i.name) for i in items]


@accounts_router.post("/", response_model=AccountOut)
def create_account(payload: AccountIn, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  acc = Account(owner_id=user.id, platform=payload.platform, external_id=payload.external_id, name=payload.name, access_token=payload.access_token, refresh_token=payload.refresh_token, expires_at=payload.expires_at)
  session.add(acc)
  session.commit()
  session.refresh(acc)
  return AccountOut(id=acc.id, platform=acc.platform, external_id=acc.external_id, name=acc.name)


@accounts_router.delete("/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  acc = session.get(Account, account_id)
  if not acc or acc.owner_id != user.id:
    raise HTTPException(status_code=404, detail="Hesap bulunamadı")
  session.delete(acc)
  session.commit()
  return {"ok": True}


@router.put("/{post_id}", response_model=PostRead)
def update_post(post_id: int, payload: PostCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  old_scheduled_at = obj.scheduled_at
  obj.title = payload.title
  obj.content = payload.content
  obj.scheduled_at = payload.scheduled_at
  if payload.platforms is not None:
    obj.platforms = payload.platforms
  obj.caption = payload.caption
  obj.tone = payload.tone
  obj.account_id = payload.account_id
  
  # If scheduled_at changed, reschedule
  if old_scheduled_at != payload.scheduled_at:
    if payload.scheduled_at:
      try:
        scheduled_dt = datetime.fromisoformat(payload.scheduled_at.replace('Z', '+00:00'))
        if scheduled_dt > datetime.now():
          from .tasks import schedule_post, cancel_scheduled_post
          
          # Cancel old schedule if exists
          if old_scheduled_at:
            cancel_scheduled_post(obj.id)
          
          # Schedule new time
          obj.status = "planlandi"
          obj.retry_count = 0
          obj.last_error = None
          session.add(obj)
          session.commit()
          
          job_id = schedule_post(obj.id, scheduled_dt)
          if not job_id:
            obj.last_error = "Failed to schedule post"
        else:
          obj.last_error = "Scheduled time must be in the future"
      except Exception as e:
        obj.last_error = f"Scheduling error: {str(e)}"
    else:
      # Remove scheduling
      from .tasks import cancel_scheduled_post
      cancel_scheduled_post(obj.id)
      obj.status = "taslak"
      obj.retry_count = 0
      obj.last_error = None
  
  session.add(obj)
  session.commit()
  session.refresh(obj)
  author = session.get(UserModel, obj.author_id)
  return PostRead(
    id=obj.id,
    title=obj.title,
    content=obj.content,
    scheduled_at=obj.scheduled_at,
    status=obj.status,
    retry_count=obj.retry_count,
    last_error=obj.last_error,
    author_id=obj.author_id,
    author_username=author.username if author else "unknown",
    platforms=obj.platforms or [],
    caption=obj.caption,
    tone=obj.tone,
    account_id=obj.account_id,
  )


@router.delete("/{post_id}")
def delete_post(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  # Cancel any scheduled jobs
  if obj.scheduled_at and obj.status in ["planlandi", "kuyruk"]:
    from .tasks import cancel_scheduled_post
    cancel_scheduled_post(obj.id)
  
  session.delete(obj)
  session.commit()
  return {"ok": True}


@router.post("/{post_id}/enqueue")
def enqueue_post_now(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Manually enqueue a post for immediate publishing (bypassing schedule)
  """
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  if obj.status not in ["taslak", "planlandi"]:
    raise HTTPException(status_code=400, detail=f"Post cannot be enqueued from status: {obj.status}")
  
  try:
    from .tasks import task_queue, publish_post
    
    # Enqueue immediately
    job = task_queue.enqueue(publish_post, obj.id, 0)
    
    obj.status = "kuyruk"
    obj.retry_count = 0
    obj.last_error = None
    session.add(obj)
    session.commit()
    
    return {"message": "Post enqueued for immediate publishing", "job_id": job.id}
    
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to enqueue post: {str(e)}")


@router.post("/{post_id}/cancel")
def cancel_scheduled_post_endpoint(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Cancel a scheduled post
  """
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  if obj.status not in ["planlandi", "kuyruk"]:
    raise HTTPException(status_code=400, detail=f"Post cannot be cancelled from status: {obj.status}")
  
  try:
    from .tasks import cancel_scheduled_post
    
    success = cancel_scheduled_post(obj.id)
    if success:
      return {"message": "Post scheduling cancelled successfully"}
    else:
      raise HTTPException(status_code=500, detail="Failed to cancel post scheduling")
      
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to cancel post: {str(e)}")


@router.post("/{post_id}/schedule", response_model=PostRead)
def schedule_post_endpoint(post_id: int, payload: PostScheduleRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Schedule a post for future publishing
  """
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  if obj.status not in ["taslak", "planlandi"]:
    raise HTTPException(status_code=400, detail=f"Post cannot be scheduled from status: {obj.status}")
  
  try:
    scheduled_dt = datetime.fromisoformat(payload.scheduled_at.replace('Z', '+00:00'))
    if scheduled_dt <= datetime.now():
      raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    from .tasks import schedule_post, cancel_scheduled_post
    
    # Cancel existing schedule if any
    if obj.status == "planlandi":
      cancel_scheduled_post(obj.id)
    
    # Schedule new time
    obj.scheduled_at = payload.scheduled_at
    obj.status = "planlandi"
    obj.retry_count = 0
    obj.last_error = None
    session.add(obj)
    session.commit()
    
    job_id = schedule_post(obj.id, scheduled_dt)
    if not job_id:
      obj.last_error = "Failed to schedule post"
      session.add(obj)
      session.commit()
      raise HTTPException(status_code=500, detail="Failed to schedule post")
    
    session.refresh(obj)
    author = session.get(UserModel, obj.author_id)
    return PostRead(
      id=obj.id,
      title=obj.title,
      content=obj.content,
      scheduled_at=obj.scheduled_at,
      status=obj.status,
      retry_count=obj.retry_count,
      last_error=obj.last_error,
      author_id=obj.author_id,
      author_username=author.username if author else "unknown",
      platforms=obj.platforms or [],
      caption=obj.caption,
      tone=obj.tone,
      account_id=obj.account_id,
    )
    
  except ValueError as e:
    raise HTTPException(status_code=400, detail=f"Invalid datetime format: {str(e)}")
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to schedule post: {str(e)}")


@router.patch("/{post_id}/status", response_model=PostRead)
def update_post_status(post_id: int, payload: PostStatusUpdate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Update post status with role-based authorization and workflow validation
  """
  obj = session.get(Post, post_id)
  if not obj:
    raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
  
  # Admin can manage all posts, users can only manage their own
  if user.role != "admin" and obj.author_id != user.id:
    raise HTTPException(status_code=403, detail="Bu gönderiyi yönetme yetkiniz yok")
  
  # Valid status transitions
  valid_statuses = ["taslak", "inceleme", "onaylandi", "planlandi", "yayinlandi", "rededildi", "iptal"]
  if payload.status not in valid_statuses:
    raise HTTPException(status_code=400, detail=f"Geçersiz status: {payload.status}")
  
  current = obj.status
  new = payload.status
  
  # Role-based authorization
  user_role = user.role
  
  # Define role-based allowed transitions
  if user_role == "admin":
    # Admin can do all transitions
    allowed_transitions = {
      "taslak": ["inceleme", "onaylandi", "planlandi", "iptal"],
      "inceleme": ["onaylandi", "rededildi", "taslak"],
      "onaylandi": ["planlandi", "yayinlandi", "taslak"],
      "planlandi": ["yayinlandi", "iptal", "taslak"],
      "yayinlandi": [],  # Final state
      "rededildi": ["taslak", "iptal"],
      "iptal": ["taslak"]
    }
  else:
    # Regular user - limited transitions
    allowed_transitions = {
      "taslak": ["inceleme", "iptal"],  # Can submit for review or cancel
      "inceleme": [],  # Cannot change once submitted (admin decides)
      "onaylandi": [],  # Cannot change approved posts
      "planlandi": [],  # Cannot change scheduled posts  
      "yayinlandi": [],  # Final state
      "rededildi": ["taslak", "iptal"],  # Can revise rejected posts
      "iptal": ["taslak"]  # Can restart cancelled posts
    }
  
  if new not in allowed_transitions.get(current, []):
    if user_role != "admin":
      raise HTTPException(
        status_code=403, 
        detail=f"Bu işlem için admin yetkisi gerekiyor. '{current}' durumundan '{new}' durumuna sadece admin geçebilir."
      )
    else:
      raise HTTPException(
        status_code=400, 
        detail=f"'{current}' durumundan '{new}' durumuna geçiş yapılamaz"
      )
  
  # Additional validations for specific transitions
  if new == "planlandi" and not obj.scheduled_at:
    raise HTTPException(
      status_code=400,
      detail="Planlanmış duruma geçmek için scheduled_at tarihi gereklidir"
    )
  
  obj.status = new
  
  # Reset error info when changing status (except for rejection)
  if new != "rededildi":
    obj.last_error = None
    obj.retry_count = 0
  elif new == "rededildi" and not obj.last_error:
    # Add a default rejection reason if admin doesn't provide one
    obj.last_error = "İçerik gözden geçirilmesi gerekiyor"
  
  session.add(obj)
  session.commit()
  session.refresh(obj)
  
  author = session.get(UserModel, obj.author_id)
  return PostRead(
    id=obj.id,
    title=obj.title,
    content=obj.content,
    scheduled_at=obj.scheduled_at,
    status=obj.status,
    retry_count=obj.retry_count,
    last_error=obj.last_error,
    author_id=obj.author_id,
    author_username=author.username if author else "unknown",
    platforms=obj.platforms or [],
    caption=obj.caption,
    tone=obj.tone,
    account_id=obj.account_id,
  )



@router.post("/{post_id}/publish")
def publish_post_now(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Immediately publish a post to selected social media account
  """
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  if obj.status not in ["taslak", "planlandi"]:
    raise HTTPException(status_code=400, detail=f"Post bu durumdan yayınlanamaz: {obj.status}")
  
  # Check if account is selected
  if not obj.account_id:
    raise HTTPException(status_code=400, detail="Lütfen önce bir sosyal medya hesabı seçin")
  
  # Verify account exists
  account = session.get(Account, obj.account_id)
  if not account:
    raise HTTPException(status_code=400, detail="Seçilen hesap bulunamadı")
  
  try:
    from .tasks import task_queue, publish_post
    
    # Enqueue for immediate publishing
    job = task_queue.enqueue(publish_post, obj.id, 0)
    
    obj.status = "kuyruk"
    obj.retry_count = 0
    obj.last_error = None
    session.add(obj)
    session.commit()
    
    return {
      "message": f"Post {account.platform} hesabına yayın için kuyruğa alındı",
      "job_id": job.id,
      "account_info": {
        "platform": account.platform,
        "name": account.name,
        "external_id": account.external_id
      }
    }
    
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Yayın başlatılamadı: {str(e)}")


class PublishingStatusResponse(BaseModel):
  post_id: int
  status: str
  message: str
  account_info: Optional[dict] = None
  last_error: Optional[str] = None
  retry_count: int = 0


@router.get("/{post_id}/publishing-status")
def get_publishing_status(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
  """
  Get current publishing status of a post
  """
  obj = session.get(Post, post_id)
  if not obj or obj.author_id != user.id:
    raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
  
  account_info = None
  if obj.account_id:
    account = session.get(Account, obj.account_id)
    if account:
      account_info = {
        "platform": account.platform,
        "name": account.name,
        "external_id": account.external_id
      }
  
  # Status messages in Turkish
  status_messages = {
    "taslak": "Taslak halinde",
    "planlandi": "Yayın için zamanlandı",
    "kuyruk": "Yayın kuyruğunda",
    "yayinlandi": "Başarıyla yayınlandı",
    "basarisiz": "Yayın başarısız oldu"
  }
  
  return PublishingStatusResponse(
    post_id=obj.id,
    status=obj.status,
    message=status_messages.get(obj.status, obj.status),
    account_info=account_info,
    last_error=obj.last_error,
    retry_count=obj.retry_count
  )


# --- Sosyal Medya Hesap Bağlama Endpoint'leri ---

class OAuthUrlRequest(BaseModel):
  platform: str  # "instagram", "facebook", "twitter", "linkedin"


class OAuthUrlResponse(BaseModel):
  oauth_url: str
  state: str
  platform: str
  instructions: dict


class OAuthCallbackRequest(BaseModel):
  code: str
  state: str


class AccountConnectionResponse(BaseModel):
  success: bool
  account_id: Optional[int] = None
  account_info: Optional[dict] = None
  error: Optional[str] = None


@router.post("/connect/oauth-url", response_model=OAuthUrlResponse)
async def get_oauth_url(
  request: OAuthUrlRequest,
  current_user: User = Depends(get_current_user)
):
  """Sosyal medya hesap bağlama için OAuth URL'i oluştur"""
  
  try:
    # Redirect URI (frontend callback URL)
    redirect_uri = "http://localhost:3000/dashboard/oauth-callback"
    
    oauth_data = social_connector.get_oauth_url(
      platform=request.platform,
      user_id=current_user.id,
      redirect_uri=redirect_uri
    )
    
    return OAuthUrlResponse(**oauth_data)
    
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"OAuth URL oluşturma hatası: {str(e)}")


@router.post("/connect/callback", response_model=AccountConnectionResponse)
async def oauth_callback(
  request: OAuthCallbackRequest,
  current_user: User = Depends(get_current_user)
):
  """OAuth callback'i işle ve hesabı bağla"""
  
  try:
    # Code'u token ile değiştir
    token_data = social_connector.exchange_code_for_token(
      code=request.code,
      state=request.state
    )
    
    if not token_data.get("success"):
      return AccountConnectionResponse(
        success=False,
        error=token_data.get("error", "Token exchange başarısız")
      )
    
    # Platform bilgisini session'dan al
    if request.state in social_connector.oauth_sessions:
      platform = social_connector.oauth_sessions[request.state]["platform"]
      
      # Hesabı veritabanına kaydet
      account_id = social_connector.save_account(
        user_id=current_user.id,
        platform=platform,
        token_data=token_data
      )
      
      # Session'ı temizle
      del social_connector.oauth_sessions[request.state]
      
      return AccountConnectionResponse(
        success=True,
        account_id=account_id,
        account_info=token_data.get("account_info"),
      )
    else:
      return AccountConnectionResponse(
        success=False,
        error="OAuth session bulunamadı"
      )
      
  except ValueError as e:
    return AccountConnectionResponse(
      success=False,
      error=str(e)
    )
  except Exception as e:
    return AccountConnectionResponse(
      success=False,
      error=f"Hesap bağlama hatası: {str(e)}"
    )


@router.delete("/accounts/{account_id}")
async def disconnect_account(
  account_id: int,
  current_user: User = Depends(get_current_user)
):
  """Sosyal medya hesap bağlantısını kes"""
  
  try:
    success = social_connector.disconnect_account(
      user_id=current_user.id,
      account_id=account_id
    )
    
    if success:
      return {"message": "Hesap bağlantısı başarıyla kesildi"}
    else:
      raise HTTPException(status_code=404, detail="Hesap bulunamadı")
      
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Hesap bağlantısı kesme hatası: {str(e)}")


@router.get("/platforms")
async def get_supported_platforms():
  """Desteklenen sosyal medya platformlarını listele"""
  
  platforms = [
    {
      "id": "instagram",
      "name": "Instagram",
      "description": "Instagram Business/Creator hesapları",
      "icon": "instagram",
      "supported_features": ["post", "story", "reels"]
    },
    {
      "id": "facebook",
      "name": "Facebook",
      "description": "Facebook sayfaları",
      "icon": "facebook",
      "supported_features": ["post", "story"]
    },
    {
      "id": "twitter",
      "name": "Twitter",
      "description": "Twitter hesapları",
      "icon": "twitter",
      "supported_features": ["tweet", "thread"]
    },
    {
      "id": "linkedin",
      "name": "LinkedIn",
      "description": "LinkedIn profil ve sayfaları",
      "icon": "linkedin",
      "supported_features": ["post", "article"]
    }
  ]
  
  return {"platforms": platforms}
