import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Post, Account } from '../../hooks/useDashboard';

interface PostListProps {
  posts: Post[];
  accounts: Account[];
  onUpdatePost: (id: string, data: any) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  userRole?: string;
  loading?: boolean;
}

export function PostList({ posts, accounts, onUpdatePost, onDeletePost, userRole, loading = false }: PostListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editSelectedAccounts, setEditSelectedAccounts] = useState<number[]>([]);
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editTone, setEditTone] = useState('');

  const startEdit = (post: Post) => {
    setEditingId(post._id);
    setEditTitle(post.title);
    setEditContent(post.content || '');
    setEditScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '');
    
    // Find account ID for this post
    const account = accounts.find(acc => acc._id === post.account_id);
    if (account) {
      setEditSelectedAccounts([account.id]);
      setEditPlatforms([account.platform]);
    } else {
      setEditSelectedAccounts([]);
      setEditPlatforms([]);
    }
    
    setEditTone(post.tone || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditScheduledAt('');
    setEditSelectedAccounts([]);
    setEditPlatforms([]);
    setEditTone('');
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await onUpdatePost(editingId, {
        title: editTitle,
        content: editContent,
        scheduled_at: editScheduledAt || undefined,
        platforms: editPlatforms,
        tone: editTone || undefined,
        account_id: editSelectedAccounts[0] ? accounts.find(acc => acc.id === editSelectedAccounts[0])?._id : undefined
      });
      
      cancelEdit();
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const changeStatus = async (postId: string, newStatus: string) => {
    try {
      await onUpdatePost(postId, { status: newStatus });
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Bu postu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await onDeletePost(postId);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const getAvailableStatusTransitions = (currentStatus: string, isAdmin: boolean) => {
    const adminTransitions: Record<string, Array<{ status: string; label: string; color: string }>> = {
      'taslak': [
        { status: 'kuyruk', label: 'Kuyruğa Al', color: 'blue' },
        { status: 'onay_bekliyor', label: 'Onaya Gönder', color: 'orange' },
        { status: 'rededildi', label: 'Reddet', color: 'red' }
      ],
      'onay_bekliyor': [
        { status: 'kuyruk', label: 'Onayla', color: 'green' },
        { status: 'rededildi', label: 'Reddet', color: 'red' },
        { status: 'taslak', label: 'Taslaklara Geri Al', color: 'gray' }
      ],
      'kuyruk': [
        { status: 'planlandi', label: 'Planlandı Olarak İşaretle', color: 'purple' },
        { status: 'yayinlandi', label: 'Yayınlandı Olarak İşaretle', color: 'green' },
        { status: 'basarisiz', label: 'Başarısız Olarak İşaretle', color: 'red' },
        { status: 'taslak', label: 'Taslaklara Geri Al', color: 'gray' }
      ],
      'planlandi': [
        { status: 'yayinlandi', label: 'Yayınlandı', color: 'green' },
        { status: 'basarisiz', label: 'Başarısız', color: 'red' },
        { status: 'kuyruk', label: 'Kuyruğa Geri Al', color: 'blue' }
      ],
      'yayinlandi': [
        { status: 'basarisiz', label: 'Başarısız Olarak İşaretle', color: 'red' }
      ],
      'basarisiz': [
        { status: 'kuyruk', label: 'Tekrar Kuyruğa Al', color: 'blue' },
        { status: 'taslak', label: 'Taslak Yap', color: 'gray' }
      ],
      'rededildi': [
        { status: 'taslak', label: 'Taslak Yap', color: 'gray' },
        { status: 'onay_bekliyor', label: 'Tekrar Onaya Gönder', color: 'orange' }
      ]
    };

    const userTransitions: Record<string, Array<{ status: string; label: string; color: string }>> = {
      'taslak': [
        { status: 'onay_bekliyor', label: 'Onaya Gönder', color: 'orange' }
      ],
      'onay_bekliyor': [
        { status: 'taslak', label: 'Taslaklara Geri Al', color: 'gray' }
      ],
      'rededildi': [
        { status: 'taslak', label: 'Taslak Yap', color: 'gray' },
        { status: 'onay_bekliyor', label: 'Tekrar Onaya Gönder', color: 'orange' }
      ],
      'basarisiz': [
        { status: 'taslak', label: 'Taslak Yap', color: 'gray' }
      ]
    };

    if (isAdmin) {
      return adminTransitions[currentStatus] || [];
    } else {
      return userTransitions[currentStatus] || [];
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'kuyruk': return 'default';
      case 'yayinlandi': return 'default';
      case 'basarisiz': return 'destructive';
      case 'planlandi': return 'secondary';
      case 'onay_bekliyor': return 'secondary';
      case 'rededildi': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'kuyruk': return 'bg-blue-100 text-blue-800';
      case 'yayinlandi': return 'bg-green-100 text-green-800';
      case 'basarisiz': return 'bg-red-100 text-red-800';
      case 'planlandi': return 'bg-purple-100 text-purple-800';
      case 'onay_bekliyor': return 'bg-orange-100 text-orange-800';
      case 'rededildi': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const getStatusDisplayName = (status: string) => {
    const statusNames: Record<string, string> = {
      'kuyruk': 'Yayın Kuyruğunda',
      'yayinlandi': 'Yayınlandı',
      'basarisiz': 'Yayın Başarısız',
      'planlandi': 'Zamanlandı',
      'taslak': 'Taslak',
      'onay_bekliyor': 'Onay Bekliyor',
      'rededildi': 'Reddedildi'
    };
    return statusNames[status] || status;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Postlar yükleniyor...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            <p>Henüz gönderi yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post._id} className="border border-gray-200">
              <CardContent className="pt-4">
                {editingId === post._id ? (
                  // Edit Mode
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
                    
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Sosyal Medya Hesabı</label>
                        <select 
                          value={editSelectedAccounts.length > 0 ? editSelectedAccounts[0] : ""} 
                          onChange={(e) => {
                            const accountId = parseInt(e.target.value);
                            if (accountId) {
                              setEditSelectedAccounts([accountId]);
                              const selectedAccount = accounts.find(acc => acc.id === accountId);
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
                          {accounts.map(account => (
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
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={saveEdit} size="sm" className="bg-green-600 hover:bg-green-700">
                        Kaydet
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="outline">
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{post.title}</h3>
                      <Badge 
                        variant={getStatusBadgeVariant(post.status)} 
                        className={getStatusBadgeClass(post.status)}
                      >
                        {getStatusDisplayName(post.status)}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{post.content}</p>
                    
                    {post.scheduled_at && (
                      <p className="text-xs text-gray-500 mb-2">
                        Planlanma: {new Date(post.scheduled_at).toLocaleString('tr-TR')}
                      </p>
                    )}
                    
                    {post.platforms && post.platforms.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {post.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {post.account_id && (
                      <div className="mb-2">
                        {(() => {
                          const account = accounts.find(acc => acc._id === post.account_id);
                          return account ? (
                            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                              <strong>Hedef Hesap:</strong> {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} - {account.name || account.external_id}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    
                    {post.caption && (
                      <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2">
                        <strong>Caption:</strong> {post.caption}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button onClick={() => startEdit(post)} size="sm" variant="outline">
                        Düzenle
                      </Button>
                      <Button onClick={() => handleDelete(post._id)} size="sm" variant="destructive">
                        Sil
                      </Button>
                      
                      {/* Status Transition Buttons */}
                      {getAvailableStatusTransitions(post.status, userRole === "admin").map((transition) => (
                        <Button
                          key={transition.status}
                          onClick={() => changeStatus(post._id, transition.status)}
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
      </CardContent>
    </Card>
  );
}