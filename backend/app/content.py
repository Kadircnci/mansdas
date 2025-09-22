from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from .auth import get_current_user, User
from .db import get_session
from .models import Content
from .content_service import ContentGenerationService
from pydantic import BaseModel

router = APIRouter(prefix="/content", tags=["content"])

# Request/Response models
class ContentCreateRequest(BaseModel):
    title: str
    mode: str  # manuel, otomatik
    content_text: Optional[str] = None  # Manuel modda dolu olacak
    tone: Optional[str] = None  # Otomatik modda gerekli
    user_prompt: Optional[str] = None  # Otomatik modda gerekli
    platforms: List[str] = []

class ContentResponse(BaseModel):
    id: int
    title: str
    content_text: Optional[str]
    mode: str
    tone: Optional[str]
    user_prompt: Optional[str]
    generated_content: Optional[str]
    platforms: List[str]
    status: str
    created_at: Optional[str]
    updated_at: Optional[str]

class ContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content_text: Optional[str] = None
    tone: Optional[str] = None
    user_prompt: Optional[str] = None
    platforms: Optional[List[str]] = None
    status: Optional[str] = None

@router.post("/create", response_model=ContentResponse)
def create_content(
    request: ContentCreateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """İçerik oluştur - manuel veya otomatik mod"""
    
    # Validation
    if request.mode == "otomatik" and (not request.tone or not request.user_prompt):
        raise HTTPException(status_code=400, detail="Otomatik modda ton ve prompt gereklidir")
    
    if request.mode == "manuel" and not request.content_text:
        raise HTTPException(status_code=400, detail="Manuel modda içerik metni gereklidir")
    
    # İçerik oluştur
    content = Content(
        author_id=current_user.id,
        title=request.title,
        content_text=request.content_text,
        mode=request.mode,
        tone=request.tone,
        user_prompt=request.user_prompt,
        platforms=request.platforms,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    # Otomatik modda içerik üret
    if request.mode == "otomatik":
        try:
            content_service = ContentGenerationService()
            generated = content_service.generate_content(
                title=request.title,
                tone=request.tone,
                user_prompt=request.user_prompt
            )
            content.generated_content = generated
            content.status = "hazır"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"İçerik üretimi başarısız: {str(e)}")
    
    session.add(content)
    session.commit()
    session.refresh(content)
    
    return content

@router.get("/list", response_model=List[ContentResponse])
def list_contents(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Kullanıcının içeriklerini listele"""
    contents = session.exec(
        select(Content)
        .where(Content.author_id == current_user.id)
        .order_by(Content.created_at.desc())
    ).all()
    
    return contents

@router.get("/{content_id}", response_model=ContentResponse)
def get_content(
    content_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Belirli bir içeriği getir"""
    content = session.exec(
        select(Content)
        .where(Content.id == content_id)
        .where(Content.author_id == current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")
    
    return content

@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    request: ContentUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """İçeriği güncelle"""
    content = session.exec(
        select(Content)
        .where(Content.id == content_id)
        .where(Content.author_id == current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")
    
    # Güncelle
    if request.title is not None:
        content.title = request.title
    if request.content_text is not None:
        content.content_text = request.content_text
    if request.tone is not None:
        content.tone = request.tone
    if request.user_prompt is not None:
        content.user_prompt = request.user_prompt
    if request.platforms is not None:
        content.platforms = request.platforms
    if request.status is not None:
        content.status = request.status
    
    content.updated_at = datetime.now().isoformat()
    
    session.commit()
    session.refresh(content)
    
    return content

@router.post("/{content_id}/regenerate", response_model=ContentResponse)
def regenerate_content(
    content_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Otomatik modda içeriği yeniden üret"""
    content = session.exec(
        select(Content)
        .where(Content.id == content_id)
        .where(Content.author_id == current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")
    
    if content.mode != "otomatik":
        raise HTTPException(status_code=400, detail="Sadece otomatik modda içerik yeniden üretilebilir")
    
    if not content.tone or not content.user_prompt:
        raise HTTPException(status_code=400, detail="İçerik yeniden üretmek için ton ve prompt gerekli")
    
    try:
        content_service = ContentGenerationService()
        generated = content_service.generate_content(
            title=content.title,
            tone=content.tone,
            user_prompt=content.user_prompt
        )
        content.generated_content = generated
        content.updated_at = datetime.now().isoformat()
        
        session.commit()
        session.refresh(content)
        
        return content
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İçerik yeniden üretimi başarısız: {str(e)}")

@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """İçeriği sil"""
    content = session.exec(
        select(Content)
        .where(Content.id == content_id)
        .where(Content.author_id == current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")
    
    session.delete(content)
    session.commit()
    
    return {"message": "İçerik başarıyla silindi"}