import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useContentGeneration } from '../../hooks/useDashboard';

interface PostFormProps {
  onSubmit: (data: any) => Promise<void>;
  accounts: any[];
  loading?: boolean;
}

export function PostForm({ onSubmit, accounts, loading = false }: PostFormProps) {
  // Form state
  const [mode, setMode] = useState<'manuel' | 'otomatik'>('manuel');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [caption, setCaption] = useState('');
  
  // AI content generation
  const [generatedContent, setGeneratedContent] = useState('');
  const [isContentApproved, setIsContentApproved] = useState(false);
  const { loading: isGenerating, generateContent, generateCaption } = useContentGeneration();

  const handleModeChange = (newMode: 'manuel' | 'otomatik') => {
    setMode(newMode);
    // Reset form when changing modes
    setTitle('');
    setContent('');
    setGeneratedContent('');
    setIsContentApproved(false);
    setTone('');
  };

  const handleGenerateContent = async () => {
    if (!content.trim()) return;

    try {
      const generated = await generateContent({
        prompt: content,
        tone: tone || undefined,
        platform: platforms[0] || undefined,
        language: 'Türkçe'
      });
      
      setGeneratedContent(generated);
      setIsContentApproved(false);
    } catch (error) {
      console.error('Content generation error:', error);
    }
  };

  const handleApproveContent = () => {
    setIsContentApproved(true);
  };

  const handleRejectContent = () => {
    setGeneratedContent('');
    setIsContentApproved(false);
  };

  const handleGenerateCaption = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const generated = await generateCaption({
        title,
        content,
        platform: platforms[0] || undefined,
        tone: tone || undefined,
        language: 'Türkçe'
      });
      
      setCaption(generated);
    } catch (error) {
      console.error('Caption generation error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const postData = {
      title,
      content: mode === 'otomatik' && isContentApproved ? generatedContent : content,
      scheduled_at: scheduledAt || undefined,
      platforms,
      caption,
      tone,
      account_id: selectedAccounts[0] || undefined,
      mode,
      user_prompt: mode === 'otomatik' ? content : undefined,
      generated_content: mode === 'otomatik' ? generatedContent : undefined
    };

    await onSubmit(postData);
    
    // Reset form
    setTitle('');
    setContent('');
    setScheduledAt('');
    setSelectedAccounts([]);
    setPlatforms([]);
    setTone('');
    setCaption('');
    setGeneratedContent('');
    setIsContentApproved(false);
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-700">İçerik Oluşturma Modu</label>
            <div className="flex gap-4">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  mode === "manuel" 
                    ? "border-purple-500 bg-purple-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleModeChange("manuel")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="radio" 
                    checked={mode === "manuel"} 
                    onChange={() => handleModeChange("manuel")}
                    className="text-purple-600" 
                  />
                  <span className="font-medium">📝 Manuel Mod</span>
                </div>
                <p className="text-sm text-gray-600">
                  Tüm alanları kendiniz doldurun. Tam kontrol sizde.
                </p>
              </div>
              
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  mode === "otomatik" 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleModeChange("otomatik")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="radio" 
                    checked={mode === "otomatik"} 
                    onChange={() => handleModeChange("otomatik")}
                    className="text-green-600" 
                  />
                  <span className="font-medium">🤖 Otomatik Mod</span>
                </div>
                <p className="text-sm text-gray-600">
                  AI sizin için içerik üretsin. Hızlı ve yaratıcı.
                </p>
              </div>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Başlık *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Paylaşımınız için bir başlık yazın" 
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
              required 
              disabled={loading || isGenerating}
            />
          </div>

          {/* Social Media Account Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Sosyal Medya Hesabı</label>
            <select 
              value={selectedAccounts[0] || ""} 
              onChange={(e) => {
                const accountId = parseInt(e.target.value);
                if (accountId && !isNaN(accountId)) {
                  setSelectedAccounts([accountId]);
                  const selectedAccount = accounts.find(acc => acc.id === accountId);
                  if (selectedAccount) {
                    setPlatforms([selectedAccount.platform]);
                  }
                } else {
                  setSelectedAccounts([]);
                  setPlatforms([]);
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loading || isGenerating}
            >
              <option value="">Hesap seçin</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} - {account.name || account.external_id}
                </option>
              ))}
            </select>
          </div>

          {/* Manuel Mode Fields */}
          {mode === "manuel" && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800">📝 Manuel Detaylar</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">İçerik</label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Paylaşmak istediğiniz içeriği yazın..." 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  rows={4}
                  required 
                  disabled={loading || isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Caption</label>
                <textarea 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)} 
                  placeholder="Sosyal medya için özel caption (opsiyonel)" 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  rows={2}
                  disabled={loading || isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Zamanlanmış Paylaşım (Opsiyonel)</label>
                <input 
                  type="datetime-local" 
                  value={scheduledAt} 
                  onChange={(e) => setScheduledAt(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={loading || isGenerating}
                />
              </div>
            </div>
          )}

          {/* Otomatik Mode Fields */}
          {mode === "otomatik" && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800">🤖 AI İçin Bilgiler</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Konu/İstek</label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="AI'nin hangi konu hakkında içerik üretmesini istiyorsunuz? Örn: 'Dijital dönüşüm başarılarımız hakkında bir paylaşım'" 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  rows={3}
                  required 
                  disabled={loading || isGenerating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Ton</label>
                <select 
                  value={tone} 
                  onChange={(e) => setTone(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={loading || isGenerating}
                >
                  <option value="">AI tonunu seçsin</option>
                  <option value="ciddi">Ciddi</option>
                  <option value="kurumsal">Kurumsal</option>
                  <option value="samimi">Samimi</option>
                  <option value="eğlenceli">Eğlenceli</option>
                  <option value="bilgilendirici">Bilgilendirici</option>
                  <option value="motive edici">Motive Edici</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Zamanlanmış Paylaşım (Opsiyonel)</label>
                <input 
                  type="datetime-local" 
                  value={scheduledAt} 
                  onChange={(e) => setScheduledAt(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={loading || isGenerating}
                />
              </div>

              {/* AI Content Generation */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !content.trim()}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      İçerik Üretiliyor...
                    </>
                  ) : (
                    '🤖 İçerik Üret'
                  )}
                </Button>
              </div>

              {/* Generated Content Preview */}
              {generatedContent && !isContentApproved && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-800 font-medium">✨ Üretilen İçerik</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                      Önizleme
                    </Badge>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-yellow-200 mb-3">
                    {generatedContent}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleApproveContent}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      ✅ Onayla
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateContent}
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                      disabled={isGenerating}
                    >
                      🔄 Yeniden Üret
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRejectContent}
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      ❌ Beğenmedim
                    </Button>
                  </div>
                </div>
              )}

              {/* Approved Content Display */}
              {isContentApproved && generatedContent && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-800 font-medium">✅ Onaylanmış İçerik</span>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      Paylaşıma Hazır
                    </Badge>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-green-200">
                    {generatedContent}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center gap-3">
            {mode === "manuel" && (
              <Button
                type="button"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                onClick={handleGenerateCaption}
                disabled={isGenerating || !title.trim() || !content.trim()}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Caption Üretiliyor...
                  </>
                ) : (
                  '🤖 AI Caption Üret'
                )}
              </Button>
            )}
            
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={loading || isGenerating || (mode === 'otomatik' && !isContentApproved)}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Post Oluşturuluyor...
                </>
              ) : (
                '📝 Post Oluştur'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}