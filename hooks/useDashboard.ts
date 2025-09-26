import { useState, useEffect } from 'react';
import { postsApi, accountsApi, ApiError } from '../lib/api';

export interface Post {
  _id: string;
  title: string;
  content?: string;
  scheduled_at?: string;
  status: 'taslak' | 'kuyruk' | 'planlandi' | 'yayinlandi' | 'basarisiz' | 'rededildi' | 'onay_bekliyor';
  platforms: string[];
  caption?: string;
  tone?: string;
  account_id?: string;
  mode?: 'manuel' | 'otomatik';
  user_prompt?: string;
  generated_content?: string;
  author_id: {
    _id: string;
    username: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  _id: string;
  id: number;
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  external_id: string;
  name?: string;
  username?: string;
  is_active: boolean;
  profile_picture?: string;
  followers_count?: number;
  last_sync?: string;
  createdAt: string;
}

// Hook for managing posts
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (params?: { 
    status?: string; 
    platform?: string; 
    search?: string; 
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await postsApi.getPosts(params);
      setPosts(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Postlar yüklenirken hata oluştu';
      setError(errorMessage);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: any) => {
    try {
      const response = await postsApi.createPost(postData);
      setPosts(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Post oluşturulurken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  const updatePost = async (id: string, postData: any) => {
    try {
      const response = await postsApi.updatePost(id, postData);
      setPosts(prev => prev.map(post => 
        post._id === id ? response.data : post
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Post güncellenirken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await postsApi.deletePost(id);
      setPosts(prev => prev.filter(post => post._id !== id));
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Post silinirken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    refetch: fetchPosts
  };
}

// Hook for managing social media accounts
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async (params?: { platform?: string; active?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountsApi.getAccounts(params);
      setAccounts(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Hesaplar yüklenirken hata oluştu';
      setError(errorMessage);
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectAccount = async (accountData: any) => {
    try {
      const response = await accountsApi.connectAccount(accountData);
      setAccounts(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Hesap bağlanırken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  const updateAccount = async (id: string, accountData: any) => {
    try {
      const response = await accountsApi.updateAccount(id, accountData);
      setAccounts(prev => prev.map(account => 
        account._id === id ? response.data : account
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Hesap güncellenirken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await accountsApi.deleteAccount(id);
      setAccounts(prev => prev.filter(account => account._id !== id));
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Hesap silinirken hata oluştu';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    connectAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts
  };
}

// Hook for content generation
export function useContentGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = async (data: {
    prompt: string;
    tone?: string;
    platform?: string;
    language?: string;
    maxTokens?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const { contentApi } = await import('../lib/api');
      const response = await contentApi.generateContent(data);
      
      return response.data?.generated_content;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'İçerik oluşturulurken hata oluştu';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async (data: {
    title: string;
    content: string;
    platform?: string;
    tone?: string;
    language?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const { contentApi } = await import('../lib/api');
      const response = await contentApi.generateCaption(data);
      
      return response.data?.generated_caption;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Caption oluşturulurken hata oluştu';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateContent,
    generateCaption
  };
}

// Hook for managing loading states
export function useAsyncOperation<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (asyncFn: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
}