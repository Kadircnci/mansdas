"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ExternalLink, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import MainNavbar from "../../components/MainNavbar";

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  supported_features: string[];
}

interface Account {
  id: number;
  platform: string;
  name: string;
  external_id: string;
  is_active: boolean;
}

interface OAuthResponse {
  oauth_url: string;
  state: string;
  platform: string;
  instructions: {
    title: string;
    description: string;
    steps: string[];
    requirements: string;
  };
}

const defaultPlatforms: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Fotoğraf ve video paylaşımı",
    icon: "📸",
    supported_features: ["Otomatik Paylaşım", "Reels", "Stories", "İstatistikler"]
  },
  {
    id: "twitter",
    name: "Twitter/X",
    description: "Kısa mesaj paylaşımı",
    icon: "🐦",
    supported_features: ["Otomatik Tweet", "Thread", "Retweet", "İstatistikler"]
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Sosyal ağ paylaşımı",
    icon: "📘",
    supported_features: ["Otomatik Paylaşım", "Sayfalar", "Gruplar", "İstatistikler"]
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Profesyonel ağ paylaşımı",
    icon: "💼",
    supported_features: ["Otomatik Paylaşım", "Şirket Sayfaları", "Makaleler", "İstatistikler"]
  }
];

export default function AccountsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(defaultPlatforms);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
    checkCallbackResult();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        window.location.href = "/giris";
        return;
      }
      
      // Platformları yükle
      try {
        const platformsResponse = await fetch('http://localhost:8000/posts/platforms');
        if (platformsResponse.ok) {
          const platformsData = await platformsResponse.json();
          if (platformsData.platforms && platformsData.platforms.length > 0) {
            setPlatforms(platformsData.platforms);
          }
        }
      } catch (error) {
        console.warn('Platform bilgileri yüklenemedi, varsayılan platformlar kullanılıyor');
      }
      
      // Hesapları yükle
      const accountsResponse = await fetch('http://localhost:8000/posts/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData.accounts || []);
      } else {
        // API yoksa Next.js API route'unu dene
        const fallbackResponse = await fetch('/api/accounts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setAccounts(data.success ? data.data || [] : []);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setMessage({ type: 'error', text: 'Veriler yüklenirken hata oluştu' });
      setLoading(false);
    }
  };

  const checkCallbackResult = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // OAuth callback handling
    if (code && state) {
      handleOAuthCallback(code, state);
      return;
    }

    // Legacy callback messages
    if (success === 'twitter_connected') {
      setMessage({type: 'success', text: 'Twitter hesabınız başarıyla bağlandı!'});
    } else if (success === 'x_connected') {
      setMessage({type: 'success', text: 'X hesabınız başarıyla bağlandı!'});
    } else if (error) {
      const errorMessages: {[key: string]: string} = {
        'access_denied': 'Bağlantı erişimi reddedildi',
        'invalid_callback': 'Geçersiz callback parametreleri',
        'callback_failed': 'Bağlantı işlemi başarısız'
      };
      setMessage({type: 'error', text: errorMessages[error] || 'Bağlantı hatası oluştu'});
    }

    // URL'den parametreleri temizle
    if (success || error || (code && state)) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const connectAccount = async (platform: string) => {
    try {
      setConnectingPlatform(platform);
      const token = localStorage.getItem('access_token');
      
      // Twitter için özel OAuth flow
      if (platform === 'twitter') {
        const response = await fetch('/api/auth/twitter/oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.oauth_url) {
            window.location.href = data.oauth_url;
            return;
          }
        } else {
          throw new Error('Twitter OAuth URL alınamadı');
        }
      }
      
      // Diğer platformlar için genel OAuth flow
      const response = await fetch('http://localhost:8000/posts/connect/oauth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ platform }),
      });
      
      if (!response.ok) {
        throw new Error('OAuth URL alınamadı');
      }
      
      const data: OAuthResponse = await response.json();
      window.location.href = data.oauth_url;
      
    } catch (error) {
      console.error('Hesap bağlama hatası:', error);
      setMessage({ type: 'error', text: 'Hesap bağlanırken hata oluştu' });
      setConnectingPlatform(null);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch('http://localhost:8000/posts/connect/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code, state }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Hesap başarıyla bağlandı!' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Hesap bağlama başarısız' });
      }
    } catch (error) {
      console.error('OAuth callback hatası:', error);
      setMessage({ type: 'error', text: 'OAuth işlemi başarısız' });
    }
    
    setConnectingPlatform(null);
  };

  const disconnectAccount = async (accountId: number) => {
    if (!confirm('Bu hesabın bağlantısını kesmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`http://localhost:8000/posts/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Hesap bağlantısı kesildi' });
        loadData();
      } else {
        throw new Error('Hesap bağlantısı kesilemedi');
      }
    } catch (error) {
      console.error('Hesap bağlantısı kesme hatası:', error);
      setMessage({ type: 'error', text: 'Hesap bağlantısı kesilirken hata oluştu' });
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📸",
      facebook: "📘",
      twitter: "🐦",
      linkedin: "💼"
    };
    return icons[platform] || "🔗";
  };

  const getConnectedAccount = (platformId: string) => {
    return accounts.find(account => 
      account.platform === platformId && account.is_active
    );
  };

  // Mesajları otomatik temizle
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <MainNavbar />
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <MainNavbar />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Sosyal Medya Hesapları</h1>
          <p className="text-gray-600">
            Sosyal medya hesaplarınızı bağlayarak içeriklerinizi otomatik olarak yayınlayabilirsiniz.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {platforms.map((platform) => {
            const connectedAccount = getConnectedAccount(platform.id);
            const isConnected = !!connectedAccount;
            
            return (
              <Card key={platform.id} className="relative border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(platform.id)}</span>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </div>
                    </div>
                    
                    {isConnected && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bağlı
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Desteklenen özellikler */}
                    <div>
                      <p className="text-sm font-medium mb-2">Desteklenen özellikler:</p>
                      <div className="flex flex-wrap gap-1">
                        {platform.supported_features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Bağlı hesap bilgisi */}
                    {isConnected && connectedAccount && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium">Bağlı Hesap:</p>
                        <p className="text-sm text-gray-600">{connectedAccount.name}</p>
                        <p className="text-xs text-gray-500">ID: {connectedAccount.external_id}</p>
                      </div>
                    )}
                    
                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                      {isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectAccount(connectedAccount!.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Bağlantıyı Kes
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => connectAccount(platform.id)}
                          disabled={connectingPlatform === platform.id}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        >
                          {connectingPlatform === platform.id ? (
                            <>
                              <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                              Bağlanıyor...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Hesap Bağla
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://${platform.id}.com`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {platform.name}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Twitter API Callback Bilgileri */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-1">ℹ️</div>
            <div>
              <h3 className="text-blue-800 font-medium mb-2">Twitter/X API Bağlantısı</h3>
              <p className="text-blue-700 text-sm mb-3">
                Twitter hesabınızı bağlamak için Twitter Developer Portal'da aşağıdaki 
                Callback URL'leri eklemeniz gerekiyor:
              </p>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div className="mb-2">
                  <strong>Local Development:</strong><br />
                  http://localhost:3000/api/auth/callback/twitter<br />
                  http://localhost:3000/api/auth/callback/x
                </div>
                <div>
                  <strong>Production:</strong><br />
                  https://mansdas.vercel.app/api/auth/callback/twitter<br />
                  https://mansdas.vercel.app/api/auth/callback/x
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Demo Mode Uyarısı */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 mt-1">⚠️</div>
            <div>
              <h3 className="text-yellow-800 font-medium mb-1">Demo Modu</h3>
              <p className="text-yellow-700 text-sm">
                Şu anda demo modunda çalışıyorsunuz. Gerçek sosyal medya hesapları bağlamak için 
                platform API anahtarlarının konfigüre edilmesi gerekiyor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}