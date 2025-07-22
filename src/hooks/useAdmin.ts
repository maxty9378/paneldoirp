import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  coordinates?: any;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const loadData = async (forceRefresh = false) => {
    // For manual refreshes, we want to show the loading indicator.
    if (forceRefresh) {
      setLoading(true);
    }
    setError(null);

    // Load from cache first to show stale data quickly
    const cachedData = getAdminDataFromCache();
    if (cachedData) {
      setUsers(cachedData.users || []);
      setTerritories(cachedData.territories || []);
      setBranches(cachedData.branches || []);
      setPositions(cachedData.positions || []);
      setStatistics(cachedData.statistics || null);
      if (!forceRefresh) {
        setLoading(false); // Stop loading if we have cache and it's not a forced refresh
      }
    }

    try {
      // Always fetch fresh data from the server
      const [
        usersResponse,
        territoriesResponse,
        branchesResponse,
        positionsResponse
      ] = await Promise.all([
        supabase.from('users').select('*').order('full_name'),
        supabase.from('territories').select('*').order('name'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('positions').select('*').order('name')
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (territoriesResponse.error) throw territoriesResponse.error;
      if (branchesResponse.error) throw branchesResponse.error;
      if (positionsResponse.error) throw positionsResponse.error;

      const usersData: User[] = usersResponse.data || [];
      const territoriesData: Territory[] = territoriesResponse.data || [];
      const branchesData: Branch[] = branchesResponse.data || [];
      const positionsData: Position[] = positionsResponse.data || [];

      setUsers(usersData);
      setTerritories(territoriesData);
      setBranches(branchesData);
      setPositions(positionsData);

      // Вычисляем статистику
      const stats = {
        total_users: usersData.length,
        active_users: usersData.filter(u => u.is_active).length,
        inactive_users: usersData.filter(u => !u.is_active).length,
        administrators: usersData.filter(u => u.role === 'administrator').length,
        trainers: usersData.filter(u => u.role === 'trainer').length,
      };
      setStatistics(stats);

      // Cache the data for future use
      cacheAdminData({
        users: usersData,
        territories: territoriesData,
        branches: branchesData,
        positions: positionsData,
        statistics: stats
      });
      
      // Mark initial load as complete
      setInitialLoadComplete(true);
    } catch (err) {
      console.error('Error loading admin data:', err);
      // Only set error if we don't have cached data to show
      if (!cachedData) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Cleanup function for the effect
    return () => {
      // You can add cleanup logic here if needed, for example, aborting a fetch request.
    };
  }, []); // Run only once on component mount

  return {
    users,
    territories,
    branches,
    positions,
    statistics,
    loading,
    error,
    loadData: () => loadData(true) // Expose a function to manually trigger a refresh
  };
}