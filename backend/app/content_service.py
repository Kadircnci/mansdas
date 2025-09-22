import os
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ContentGenerationService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    def generate_content(self, title: str, tone: str, user_prompt: str) -> str:
        """
        OpenAI API kullanarak içerik üretir
        """
        try:
            # Ton tanımlamaları
            tone_descriptions = {
                "ciddi": "ciddi, resmi ve kurumsal",
                "kurumsal": "profesyonel, güvenilir ve resmi",
                "samimi": "samimi, dostça ve yakın",
                "eğlenceli": "eğlenceli, canlı ve çekici",
                "bilgilendirici": "bilgilendirici, açıklayıcı ve öğretici",
                "motive edici": "motive edici, ilham verici ve pozitif"
            }
            
            tone_desc = tone_descriptions.get(tone, "kurumsal")
            
            system_prompt = f"""Sen bir kamu kurumu için sosyal medya içeriği üreten bir asistansın. 
            İçeriklerin {tone_desc} bir tonda olmalı. 
            Kamu kurumları için uygun, etik ve profesyonel içerikler üret.
            İçerikler Türkçe olmalı ve sosyal medya platformları için optimize edilmeli."""
            
            user_message = f"""Başlık: {title}
            
            İstek: {user_prompt}
            
            Bu başlık ve istek doğrultusunda {tone_desc} tonda bir sosyal medya içeriği üret. 
            İçerik maksimum 500 karakter olsun ve hashtag'ler içerebilir."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            raise Exception(f"İçerik üretimi sırasında hata oluştu: {str(e)}")
    
    def enhance_content(self, content: str, tone: str) -> str:
        """
        Mevcut içeriği geliştir
        """
        try:
            tone_descriptions = {
                "ciddi": "ciddi, resmi ve kurumsal",
                "kurumsal": "profesyonel, güvenilir ve resmi", 
                "samimi": "samimi, dostça ve yakın",
                "eğlenceli": "eğlenceli, canlı ve çekici",
                "bilgilendirici": "bilgilendirici, açıklayıcı ve öğretici",
                "motive edici": "motive edici, ilham verici ve pozitif"
            }
            
            tone_desc = tone_descriptions.get(tone, "kurumsal")
            
            system_prompt = f"""Sen bir kamu kurumu için sosyal medya içeriği geliştiren bir editörsün.
            İçerikleri {tone_desc} tonda düzenlemen gerekiyor."""
            
            user_message = f"""Bu içeriği {tone_desc} tonda geliştir ve düzenle:
            
            {content}
            
            İçerik maksimum 500 karakter olsun ve sosyal medya için uygun olsun."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            raise Exception(f"İçerik geliştirme sırasında hata oluştu: {str(e)}")