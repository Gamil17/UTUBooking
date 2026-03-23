'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_TENANT, TenantConfig } from '@/lib/tenant';

const TenantContext = createContext<TenantConfig>(DEFAULT_TENANT);

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}

export default TenantContext;
