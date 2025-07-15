import { useState, useEffect } from 'react';
import { supabase, cacheUserProfile, getUserFromCache } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  department: string;
  position_id?: string;
  territory_id?: string;
  sap_number?: string;
  
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface Territory {
  id: string;
  name: string;
  region?: string;
  created_at: string;
  updated_at: string;
}

interface Position {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  administrators: number;
  trainers: number;
}

// Key for storing admin data in localStorage
const ADMIN_DATA_CACHE_KEY = 'sns-admin-data-cache';
const ADMIN_DATA_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper to cache admin data
const cacheAdminData = (data: any) => {
  try {
    localStorage.setItem(ADMIN_DATA_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
    console.log('Admin data cached');
  } catch (e) {
    console.warn('Failed to cache admin data:', e);
  }
};

// Helper to get cached admin data
const getAdminDataFromCache = () => {
  try {
    const cache = localStorage.getItem(ADMIN_DATA_CACHE_KEY);
    if (!cache) return null;
    
    const { timestamp, data } = JSON.parse(cache);
    // Check if cache is expired (older than 5 minutes)
    if (Date.now() - timestamp > ADMIN_DATA_CACHE_EXPIRY) {
      console.log('Admin data cache expired');
      return null;
    }
    
    console.log('Using cached admin data');
    return data;
  } catch (e) {
    console.warn('Failed to get admin data from cache:', e);
    return null;
  }
};

export function useAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add state to track if initial load has happened
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const loadData = async () => {
    // Don't show loading indicator for refresh operations after initial load
    const isInitialLoad = !initialLoadComplete;
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    
    // Try to get data from cache first for initial loads
    if (isInitialLoad) {
      const cachedData = getAdminDataFromCache();
      if (cachedData) {
        setUsers(cachedData.users || []);
        setTerritories(cachedData.territories || []);
        setPositions(cachedData.positions || []);
        setStatistics(cachedData.statistics || null);
        setLoading(false);
        setInitialLoadComplete(true);
        console.log('Loaded admin data from cache');
        return;
      }
    }

    try {
      // Загружаем пользователей
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('full_name');

      if (usersError) throw usersError;

      // Загружаем территории
      const { data: territoriesData, error: territoriesError } = await supabase
        .from('territories')
        .select('*')
        .order('name');

      if (territoriesError) throw territoriesError;

      // Загружаем должности
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      if (positionsError) throw positionsError;

      setUsers(usersData || []);
      setTerritories(territoriesData || []);
      setPositions(positionsData || []);

      // Вычисляем статистику
      const stats = {
        total_users: usersData?.length || 0,
        active_users: usersData?.filter(u => u.is_active).length || 0,
        inactive_users: usersData?.filter(u => !u.is_active).length || 0,
        administrators: usersData?.filter(u => u.role === 'administrator').length || 0,
        trainers: usersData?.filter(u => u.role === 'trainer').length || 0,
      };
      setStatistics(stats);

      // Cache the data for future use
      cacheAdminData({
        users: usersData || [],
        territories: territoriesData || [],
        positions: positionsData || [],
        statistics: stats
      });
      
      // Mark initial load as complete
      setInitialLoadComplete(true);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Partial<User>) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      
      await loadData(); // Перезагружаем данные
      
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      await loadData(); // Перезагружаем данные
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      await loadData(); // Перезагружаем данные
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const bulkUpdateUsers = async (userIds: string[], updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .in('id', userIds);

      if (error) throw error;
      
      await loadData(); // Перезагружаем данные
    } catch (error) {
      console.error('Error in bulk update users:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Load data only once during initialization
    if (!initialLoadComplete) {
      loadData();
    }
    
    // Set timeout only for initial load
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Admin data loading timeout reached, stopping loading state');
        setLoading(false);
        setError('Превышено время ожидания загрузки данных. Пожалуйста, обновите страницу.');
      }
    }, 15000); // 15 seconds maximum for loading
    
    return () => {
      clearTimeout(timeout);
    };
  }, [initialLoadComplete]);

  return {
    users,
    territories,
    positions,
    statistics,
    loading,
    error,
    loadData,
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers
  };
}