import { supabase } from '../lib/supabase';

export interface DeploymentStatus {
  id?: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';
  url?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  project_name?: string;
  commit_message?: string;
  branch?: string;
  environment?: string;
}

/**
 * Get the current deployment status
 * @param id Optional deployment ID to check
 * @returns Deployment status information
 */
export async function getDeploymentStatus(id?: string): Promise<DeploymentStatus> {
  try {
    console.log(`Checking deployment status${id ? ` for: ${id}` : ''}`);
    
    // Call the RPC function to get deployment status
    const { data, error } = await supabase.rpc(
      'get_deployment_status',
      id ? { p_deployment_id: id } : {}
    );

    if (error) {
      console.error('Error getting deployment status:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }

    // Return the deployment status or a default status
    return data || {
      status: 'success',
      url: window.location.origin,
      project_name: 'SNS Training Platform'
    };
  } catch (error) {
    console.error('Exception in getDeploymentStatus:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}