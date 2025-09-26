"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { apiFetch } from "../../lib/api";
import MainNavbar from "../../components/MainNavbar";

type Post = { 
  id: number; 
  title: string; 
  content: string; 
  scheduled_at?: string | null;
  status: string;
  retry_count: number;
  last_error?: string | null;
  author_id: number;
  author_username: string;
  platforms: string[];
  caption?: string | null;
  tone?: string | null;
  account_id?: number | null;
};

type Account = {
  id: number;
  name: string | null;
  platform: string;
  external_id: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  
  // Form states
  const [mode, setMode] = useState<"manuel" | "otomatik">("manuel");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tone, setTone] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Content approval states
  const [generatedContent, setGeneratedContent] = useState("");
  const [isContentApproved, setIsContentApproved] = useState(false);
  const [showContentPreview, setShowContentPreview] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editCaption, setEditCaption] = useState("");
  const [editTone, setEditTone] = useState("");
  const [editSelectedAccounts, setEditSelectedAccounts] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const userRes = await apiFetch("/auth/me");
      if (!userRes.ok) {
        router.push("/giris");
        return;
      }
      
      const user = await userRes.json();
      setUserRole(user.user?.role || "user");
      
      // Load posts
      const postsRes = await apiFetch("/posts/");
      if (postsRes.ok) {
        const postsResponse = await postsRes.json();
        console.log('📊 Posts response received:', postsResponse);
        
        // Handle new API response format
        const postsData = postsResponse.data || postsResponse;
        
        if (Array.isArray(postsData)) {
          setPosts(postsData);
          console.log('✅ Posts state set:', postsData.length, 'posts');
        } else {
          console.error('❌ Posts data is not an array:', postsData);
          setPosts([]);
        }
      } else {
        console.error('❌ Failed to load posts');
        setPosts([]);
      }
      
      // Load accounts
      const accountsRes = await apiFetch("/accounts/");
      console.log('🔍 Accounts API response:', {
        ok: accountsRes.ok,
        status: accountsRes.status
      });
      
      if (accountsRes.ok) {
        const accountsResponse = await accountsRes.json();
        console.log('📊 Accounts response received:', accountsResponse);
        
        // Handle new API response format
        const accountsData = accountsResponse.data || accountsResponse;
        
        if (Array.isArray(accountsData)) {
          setAccounts(accountsData);
          console.log('✅ Accounts state set:', accountsData.length, 'accounts');
        } else {
          console.error('❌ Accounts data is not an array:', accountsData);
          setAccounts([]);
        }
      } else {
        console.error('❌ Failed to load accounts:', accountsRes.status);
        const errorText = await accountsRes.text();
        console.error('Error details:', errorText);
        setAccounts([]);
      }
      
    } catch (err) {
      setError("Veri yüklenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Hesap seçimi kontrolü
      if (selectedAccounts.length === 0) {
        setError("Lütfen bir sosyal medya hesabı seçin!");
        return;
      }

      // Otomatik modda AI içerik approval kontrolü
      if (mode === "otomatik") {
        if (!generatedContent) {
          setError("Otomatik modda önce AI ile içerik üretmelisiniz!");
          return;
        }
        if (!isContentApproved) {
          setError("Otomatik modda AI üretilen içeriği onaylamalısınız!");
          return;
        }
      }
      
      // Otomatik modda AI'nin ürettiği content'i kullan
      const finalContent = mode === "otomatik" && generatedContent ? generatedContent : content;
      
      const res = await apiFetch("/posts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          content: finalContent, 
          scheduled_at: scheduledAt || undefined,
          platforms,
          caption: mode === "manuel" ? caption || undefined : undefined,
          tone: tone || undefined,
          account_id: selectedAccounts.length > 0 ? selectedAccounts[0] : undefined,
        }),
      });
      
      if (!res.ok) throw new Error("Kayıt oluşturulamadı");
      
      const item = await res.json() as Post;
      setPosts((p) => [item, ...p]);
      
      // Clear form
      setMode("manuel");
      setTitle("");
      setContent("");
      setScheduledAt("");
      setPlatforms([]);
      setCaption("");
      setTone("");
      setSelectedAccounts([]);
      setIsGenerating(false);
      // Clear content approval states
      setGeneratedContent("");
      setIsContentApproved(false);
      setShowContentPreview(false);
      
    } catch (e: any) {
      setError(e.message || "Hata");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/posts/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((p) => p.filter((x) => x.id !== id));
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditContent(p.content);
    setEditScheduledAt(p.scheduled_at ?? "");
    setEditPlatforms(p.platforms || []);
    setEditCaption(p.caption || "");
    setEditTone(p.tone || "");
    setEditSelectedAccounts(p.account_id ? [p.account_id] : []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditScheduledAt("");
    setEditPlatforms([]);
    setEditCaption("");
    setEditTone("");
    setEditSelectedAccounts([]);
  };

  const saveEdit = async (id: number) => {
    const res = await apiFetch(`/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: editTitle, 
        content: editContent, 
        scheduled_at: editScheduledAt || undefined,
        platforms: editPlatforms,
        caption: editCaption || undefined,
        tone: editTone || undefined,
        account_id: editSelectedAccounts.length > 0 ? editSelectedAccounts[0] : undefined,
      }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as Post;
    setPosts((list) => list.map((x) => (x.id === id ? updated : x)));
    cancelEdit();
  };

  const changeStatus = async (postId: number, newStatus: string) => {
    try {
      const res = await apiFetch(`/posts/${postId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) throw new Error("Durum güncellenemedi");
      
      const updatedPost = await res.json();
      setPosts(posts => posts.map(p => p.id === postId ? updatedPost : p));
      
    } catch (e: any) {
      setError(e.message || "Hata");
    }
  };

  const handleAIContent = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Başlık ve konu/istek alanları doldurulmalıdır");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setIsContentApproved(false);
    setShowContentPreview(false);
    
    try {
      const res = await apiFetch('/content/generate', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: content.trim(),
          tone: tone || "kurumsal",
          platform: platforms.length > 0 ? platforms[0] : "genel",
          language: "Türkçe",
          maxTokens: 500
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // API response format: { success: true, data: { generated_content: "...", metadata: {...} } }
        const apiData = data.success ? data.data : data;
        const aiGeneratedContent = apiData.generated_content || '';
        
        if (mode === "otomatik") {
          // Otomatik modda AI içeriği önizleme için hazırla
          setGeneratedContent(aiGeneratedContent);
          setShowContentPreview(true);
          setCaption(aiGeneratedContent); // Preview için
        } else {
          // Manuel modda sadece caption'a eklenir
          setCaption(aiGeneratedContent);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || "AI içerik üretimi başarısız oldu";
        setError(`AI İçerik Hatası: ${errorMessage}`);
        console.error('Content generation failed:', errorData);
      }
    } catch (e: any) {
      setError(`İçerik üretilirken hata oluştu: ${e.message}`);
      console.error('Content generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveContent = () => {
    setIsContentApproved(true);
    setShowContentPreview(false);
  };

  const handleRejectContent = () => {
    setGeneratedContent("");
    setCaption("");
    setIsContentApproved(false);
    setShowContentPreview(false);
  };

  const handleRegenerateContent = async () => {
    await handleAIContent();
  };

  // Publishing functions
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState<{[postId: number]: string}>({});

  const handlePublishPost = async (postId: number) => {
    setIsPublishing(true);
    setError(null);
    
    try {
      const res = await apiFetch(`/posts/${postId}/publish`, {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        setPublishingStatus(prev => ({
          ...prev,
          [postId]: "Publishing..."
        }));
        
        // Start polling for status updates
        pollPublishingStatus(postId);
        
        // Update post status in UI
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, status: "kuyruk" }
            : post
        ));
        
      } else {
        const errorData = await res.json();
        setError(errorData.detail || "Yayın başlatılamadı");
      }
    } catch (e: any) {
      setError(e.message || "Yayın sırasında hata oluştu");
    } finally {
      setIsPublishing(false);
    }
  };

  const pollPublishingStatus = async (postId: number) => {
    const maxAttempts = 30; // 30 attempts = 1.5 minutes
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPublishingStatus(prev => ({
          ...prev,
          [postId]: "Timeout"
        }));
        return;
      }
      
      try {
        const res = await apiFetch(`/posts/${postId}/publishing-status`);
        if (res.ok) {
          const data = await res.json();
          
          setPublishingStatus(prev => ({
            ...prev,
            [postId]: data.message
          }));
          
          // Update post in list
          setPosts(prev => prev.map(post => 
            post.id === postId 
              ? { ...post, status: data.status, last_error: data.last_error }
              : post
          ));
          
          // Continue polling if still in progress
          if (data.status === "kuyruk") {
            attempts++;
            setTimeout(poll, 3000); // Poll every 3 seconds
          } else {
            // Publishing finished (success or failure)
            setTimeout(() => {
              setPublishingStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[postId];
                return newStatus;
              });
            }, 5000); // Clear status after 5 seconds
          }
        }
      } catch (e) {
        console.error("Status polling error:", e);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        }
      }
    };
    
    poll();
  };

  const handleModeChange = (newMode: "manuel" | "otomatik") => {
    // Mode değiştiğinde ilgili state'leri temizle
    setMode(newMode);
    setError(null);
    setIsGenerating(false);
    setGeneratedContent("");
    setIsContentApproved(false);
    setShowContentPreview(false);
    setCaption("");
    setTone("");
  };

  const handleCaption = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Başlık ve içerik alanları doldurulmalıdır");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await apiFetch('/posts/caption', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tone, platforms }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaption(data.caption || '');
      } else {
        setError("Caption üretimi başarısız oldu");
      }
    } catch (e) {
      setError("Caption üretilirken hata oluştu");
    } finally {
      setIsGenerating(false);
    }
  };

  interface StatusTransition {
    status: string;
    label: string;
    color: string;
  }

  type StatusTransitions = {
    [key: string]: StatusTransition[];
  };

  const getAvailableStatusTransitions = (currentStatus: string, isAdmin: boolean): StatusTransition[] => {
    if (isAdmin) {
      const adminTransitions: StatusTransitions = {
        "taslak": [
          { status: "inceleme", label: "İncelemeye Gönder", color: "orange" },
          { status: "onaylandi", label: "Onayla", color: "blue" },
          { status: "planlandi", label: "Planla", color: "purple" },
          { status: "iptal", label: "İptal Et", color: "gray" }
        ],
        "inceleme": [
          { status: "onaylandi", label: "Onayla", color: "blue" },
          { status: "rededildi", label: "Reddet", color: "red" },
          { status: "taslak", label: "Taslağa Döndür", color: "gray" }
        ],
        "onaylandi": [
          { status: "planlandi", label: "Planla", color: "purple" },
          { status: "yayinlandi", label: "Yayınla", color: "green" },
          { status: "taslak", label: "Taslağa Döndür", color: "gray" }
        ],
        "planlandi": [
          { status: "yayinlandi", label: "Yayınla", color: "green" },
          { status: "iptal", label: "İptal Et", color: "gray" },
          { status: "taslak", label: "Taslağa Döndür", color: "gray" }
        ],
        "rededildi": [
          { status: "taslak", label: "Taslağa Döndür", color: "gray" },
          { status: "iptal", label: "İptal Et", color: "gray" }
        ],
        "iptal": [
          { status: "taslak", label: "Yeniden Başlat", color: "gray" }
        ]
      };
      return adminTransitions[currentStatus] || [];
    } else {
      const userTransitions: StatusTransitions = {
        "taslak": [
          { status: "inceleme", label: "İncelemeye Gönder", color: "orange" },
          { status: "iptal", label: "İptal Et", color: "gray" }
        ],
        "rededildi": [
          { status: "taslak", label: "Düzenle", color: "gray" },
          { status: "iptal", label: "İptal Et", color: "gray" }
        ],
        "iptal": [
          { status: "taslak", label: "Yeniden Başlat", color: "gray" }
        ]
      };
      return userTransitions[currentStatus] || [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <MainNavbar />
        <div className="max-w-5xl mx-auto py-12 px-4">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <MainNavbar />
      <div className="max-w-5xl mx-auto space-y-8 py-12 px-4">
        
        {/* Hesap Yönetimi Bölümü */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <Badge className="w-fit bg-gradient-to-r from-blue-500 to-cyan-500 text-white">Hesap Yönetimi</Badge>
            <CardTitle className="text-2xl">Sosyal Medya Hesapları</CardTitle>
            <CardDescription>Bağlı sosyal medya hesaplarınızın durumu</CardDescription>
          </CardHeader>
          <CardContent>
            {!Array.isArray(accounts) || accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Henüz sosyal medya hesabı bağlanmamış.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map((account) => (
                  <div 
                    key={account.id} 
                    className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        account.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                        account.platform === 'twitter' ? 'bg-blue-500' :
                        account.platform === 'facebook' ? 'bg-blue-600' :
                        account.platform === 'linkedin' ? 'bg-blue-700' :
                        'bg-gray-500'
                      }`}>
                        {account.platform === 'instagram' ? '📷' :
                         account.platform === 'twitter' ? '🐦' :
                         account.platform === 'facebook' ? '📘' :
                         account.platform === 'linkedin' ? '💼' : '📱'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {account.platform}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {account.name || account.external_id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Durum</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          Aktif
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">ID</span>
                        <span className="text-xs font-mono text-gray-700">
                          {account.external_id.length > 15 
                            ? `${account.external_id.substring(0, 12)}...` 
                            : account.external_id}
                        </span>
                      </div>
                      
                      {/* Post sayısı (accounts ile ilişkili postları say) */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Postlar</span>
                        <span className="text-xs text-gray-700">
                          {posts.filter(p => p.account_id === account.id).length} adet
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* İstatistikler */}
            {accounts.length > 0 && (
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {accounts.length}
                  </div>
                  <div className="text-sm text-blue-700">Toplam Hesap</div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {posts.filter(p => p.status === "yayinlandi").length}
                  </div>
                  <div className="text-sm text-green-700">Yayınlanan Post</div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {posts.filter(p => p.status === "kuyruk" || p.status === "planlandi").length}
                  </div>
                  <div className="text-sm text-purple-700">Bekleyen Post</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <Badge className="w-fit bg-gradient-to-r from-purple-500 to-pink-500 text-white">Dashboard</Badge>
            <CardTitle className="text-3xl">İçerik Planlama</CardTitle>
            <CardDescription>Gönderileri listeleyin ve yeni gönderi oluşturun</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Mod Seçimi */}
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
                        ? "border-purple-500 bg-purple-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleModeChange("otomatik")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        checked={mode === "otomatik"} 
                        onChange={() => handleModeChange("otomatik")}
                        className="text-purple-600" 
                      />
                      <span className="font-medium">🤖 Otomatik Mod</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      AI sizin için içerik oluşturacak. Sadece temel bilgileri verin.
                    </p>
                  </div>
                </div>
              </div>

              {/* Temel Bilgiler - Her iki modda da görünür */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Başlık</label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder={mode === "manuel" ? "İçerik başlığını girin" : "Konu hakkında kısa bir başlık"} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Sosyal Medya Hesabı</label>
                  <select 
                    value={selectedAccounts.length > 0 ? selectedAccounts[0] : ""} 
                    onChange={(e) => {
                      console.log('🔍 Account dropdown changed:', {
                        value: e.target.value,
                        accounts: accounts,
                        selectedAccounts: selectedAccounts
                      });
                      
                      const accountId = parseInt(e.target.value);
                      console.log('🔢 Parsed account ID:', accountId);
                      
                      if (accountId && !isNaN(accountId)) {
                        console.log('✅ Setting account ID:', accountId);
                        setSelectedAccounts([accountId]);
                        const selectedAccount = Array.isArray(accounts) ? accounts.find(acc => acc.id === accountId) : null;
                        console.log('🎯 Found account:', selectedAccount);
                        if (selectedAccount) {
                          setPlatforms([selectedAccount.platform]);
                          console.log('📱 Set platform:', selectedAccount.platform);
                        }
                      } else {
                        console.log('❌ Clearing account selection');
                        setSelectedAccounts([]);
                        setPlatforms([]);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="">Hesap seçin</option>
                    {Array.isArray(accounts) && accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} - {account.name || account.external_id}
                      </option>
                    ))}
                  </select>
                  {/* Enhanced Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-100 rounded">
                      <div>Accounts loaded: {Array.isArray(accounts) ? accounts.length : 0}</div>
                      <div>Selected: {selectedAccounts[0] || 'none'}</div>
                      <div>Selected platforms: {JSON.stringify(platforms)}</div>
                      {Array.isArray(accounts) && accounts.length > 0 && (
                        <div>Available: {accounts.map(a => `${a.id}:${a.platform}`).join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manuel Mod Alanları */}
              {mode === "manuel" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-800">📝 Manuel Detaylar</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">İçerik</label>
                    <textarea 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                      placeholder="Paylaşılacak içeriği detaylı olarak yazın" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                      rows={4}
                      required 
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Zamanlanmış Paylaşım (Opsiyonel)</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt} 
                        onChange={(e) => setScheduledAt(e.target.value)} 
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Boş bırakırsanız hemen paylaşılır
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Ton</label>
                      <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400">
                        <option value="">Ton seçin</option>
                        <option value="ciddi">Ciddi</option>
                        <option value="kurumsal">Kurumsal</option>
                        <option value="samimi">Samimi</option>
                        <option value="eğlenceli">Eğlenceli</option>
                        <option value="bilgilendirici">Bilgilendirici</option>
                        <option value="motive edici">Motive Edici</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Caption</label>
                    <textarea 
                      value={caption} 
                      onChange={(e) => setCaption(e.target.value)} 
                      placeholder="Sosyal medya caption'ı (opsiyonel)" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                      rows={3} 
                    />
                  </div>
                </div>
              )}

              {/* Otomatik Mod Alanları */}
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
                      readOnly={isGenerating}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Ton</label>
                    <select 
                      value={tone} 
                      onChange={(e) => setTone(e.target.value)} 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      disabled={isGenerating}
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
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Boş bırakırsanız hemen paylaşılır
                    </p>
                  </div>

                  {/* AI İçerik Üretme Butonu */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className={`flex-1 ${isGenerating 
                        ? 'border-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                      }`}
                      onClick={handleAIContent}
                      disabled={isGenerating || !title.trim() || !content.trim()}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                          AI İçerik Üretiyor...
                        </>
                      ) : (
                        '🤖 AI ile İçerik Üret'
                      )}
                    </Button>
                  </div>

                  {/* Content Preview Modal */}
                  {showContentPreview && generatedContent && (
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-300 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-purple-800">🔍 AI Üretilen İçerik Önizlemesi</h4>
                        <span className="text-xs bg-purple-100 px-2 py-1 rounded text-purple-700">
                          Onay Bekliyor
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-700 whitespace-pre-wrap border">
                        {generatedContent}
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={handleApproveContent}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          ✅ Beğendim, Onayla
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRegenerateContent}
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
                        <span className="text-xs bg-green-200 px-2 py-1 rounded text-green-700">
                          Paylaşıma Hazır
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-green-200">
                        {generatedContent}
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Bu içerik paylaşım için onaylandı ve kullanılacaktır.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex items-center gap-3">
                {mode === "manuel" && (
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isGenerating 
                      ? 'border-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                    onClick={handleCaption}
                    disabled={isGenerating || !title.trim() || !content.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                        Caption Üretiliyor...
                      </>
                    ) : (
                      '💡 Caption üret'
                    )}
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  className={`px-6 flex-1 md:flex-none ${
                    mode === "otomatik" && !isContentApproved 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  } text-white`}
                  disabled={isGenerating || (mode === "otomatik" && !isContentApproved)}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      İşleniyor...
                    </>
                  ) : mode === "otomatik" && !isContentApproved ? (
                    "⏳ İçerik Onayını Bekliyor"
                  ) : mode === "otomatik" && isContentApproved ? (
                    "� Onaylanan İçeriği Paylaş"
                  ) : (
                    "📝 Manuel Oluştur"
                  )}
                </Button>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Gönderiler</CardTitle>
            <CardDescription>Kendi oluşturduğunuz gönderiler</CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-gray-600">Henüz gönderi yok.</div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <Card key={p.id} className="border border-gray-200">
                    <CardContent className="pt-4">
                      {editingId === p.id ? (
                        <div className="space-y-3">
                          <input 
                            value={editTitle} 
                            onChange={(e) => setEditTitle(e.target.value)} 
                            placeholder="Başlık" 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                          />
                          <textarea 
                            value={editContent} 
                            onChange={(e) => setEditContent(e.target.value)} 
                            placeholder="İçerik" 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                            rows={3} 
                          />
                          <input 
                            type="datetime-local" 
                            value={editScheduledAt} 
                            onChange={(e) => setEditScheduledAt(e.target.value)} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                          />
                          
                          {/* Sosyal Medya Hesap ve Ton Düzenleme */}
                          <div className="grid md:grid-cols-2 gap-3">
                            {/* Sosyal Medya Hesap Dropdown */}
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700">Sosyal Medya Hesabı</label>
                              <select 
                                value={editSelectedAccounts.length > 0 ? editSelectedAccounts[0] : ""} 
                                onChange={(e) => {
                                  const accountId = parseInt(e.target.value);
                                  if (accountId) {
                                    setEditSelectedAccounts([accountId]);
                                    // Automatically set platform based on selected account
                                    const selectedAccount = Array.isArray(accounts) ? accounts.find(acc => acc.id === accountId) : null;
                                    if (selectedAccount) {
                                      setEditPlatforms([selectedAccount.platform]);
                                    }
                                  } else {
                                    setEditSelectedAccounts([]);
                                    setEditPlatforms([]);
                                  }
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              >
                                <option value="">Hesap seçin</option>
                                {Array.isArray(accounts) && accounts.map(account => (
                                  <option key={account.id} value={account.id}>
                                    {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} - {account.name || account.external_id}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700">Ton</label>
                              <select 
                                value={editTone} 
                                onChange={(e) => setEditTone(e.target.value)} 
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              >
                                <option value="">Ton (opsiyonel)</option>
                                <option value="ciddi">Ciddi</option>
                                <option value="kurumsal">Kurumsal</option>
                                <option value="samimi">Samimi</option>
                                <option value="eğlenceli">Eğlenceli</option>
                                <option value="bilgilendirici">Bilgilendirici</option>
                                <option value="motive edici">Motive Edici</option>
                              </select>
                            </div>
                          </div>
                          
                          <textarea 
                            value={editCaption} 
                            onChange={(e) => setEditCaption(e.target.value)} 
                            placeholder="Caption (opsiyonel)" 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                            rows={3}
                          />
                          
                          <div className="flex gap-2">
                            <Button onClick={() => saveEdit(p.id)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Kaydet</Button>
                            <Button onClick={cancelEdit} size="sm" variant="outline">İptal</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{p.title}</h3>
                            <Badge variant={
                              p.status === "yayinlandi" ? "default" :
                              p.status === "kuyruk" ? "secondary" :
                              p.status === "onaylandi" ? "secondary" :
                              p.status === "basarisiz" ? "destructive" :
                              p.status === "rededildi" ? "destructive" : "outline"
                            } className={
                              p.status === "kuyruk" ? "bg-blue-100 text-blue-800" :
                              p.status === "yayinlandi" ? "bg-green-100 text-green-800" :
                              p.status === "basarisiz" ? "bg-red-100 text-red-800" : ""
                            }>
                              {p.status === "kuyruk" ? "Yayın Kuyruğunda" :
                               p.status === "yayinlandi" ? "Yayınlandı" :
                               p.status === "basarisiz" ? "Yayın Başarısız" :
                               p.status === "planlandi" ? "Zamanlandı" :
                               p.status === "taslak" ? "Taslak" :
                               p.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{p.content}</p>
                          {p.scheduled_at && (
                            <p className="text-xs text-gray-500 mb-2">
                              Planlanma: {new Date(p.scheduled_at).toLocaleString('tr-TR')}
                            </p>
                          )}
                          {p.platforms && p.platforms.length > 0 && (
                            <div className="flex gap-1 mb-2">
                              {p.platforms.map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Show selected account */}
                          {p.account_id && (
                            <div className="mb-2">
                              {(() => {
                                const account = Array.isArray(accounts) ? accounts.find(acc => acc.id === p.account_id) : null;
                                return account ? (
                                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                    <strong>Hedef Hesap:</strong> {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} - {account.name || account.external_id}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                          {p.caption && (
                            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2">
                              <strong>Caption:</strong> {p.caption}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Button onClick={() => startEdit(p)} size="sm" variant="outline">Düzenle</Button>
                            <Button onClick={() => handleDelete(p.id)} size="sm" variant="destructive">Sil</Button>
                            
                            {/* Publishing Button */}
                            {(p.status === "taslak" || p.status === "planlandi") && p.account_id && (
                              <Button
                                onClick={() => handlePublishPost(p.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isPublishing || !!publishingStatus[p.id]}
                              >
                                {publishingStatus[p.id] ? 
                                  publishingStatus[p.id] : 
                                  isPublishing ? "Yayınlanıyor..." : "Yayınla"
                                }
                              </Button>
                            )}
                            
                            {/* Show publishing status if available */}
                            {publishingStatus[p.id] && (
                              <div className="text-sm text-blue-600 font-medium">
                                {publishingStatus[p.id]}
                              </div>
                            )}
                            
                            {/* Show error if publishing failed */}
                            {p.status === "basarisiz" && p.last_error && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                Hata: {p.last_error}
                              </div>
                            )}
                            
                            {/* Status Transition Buttons */}
                            {getAvailableStatusTransitions(p.status, userRole === "admin").map((transition) => (
                              <Button
                                key={transition.status}
                                onClick={() => changeStatus(p.id, transition.status)}
                                size="sm"
                                variant="outline"
                                className={`
                                  ${transition.color === 'orange' ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : ''}
                                  ${transition.color === 'blue' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : ''}
                                  ${transition.color === 'purple' ? 'border-purple-300 text-purple-700 hover:bg-purple-50' : ''}
                                  ${transition.color === 'green' ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}
                                  ${transition.color === 'red' ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}
                                  ${transition.color === 'gray' ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : ''}
                                `}
                              >
                                {transition.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}