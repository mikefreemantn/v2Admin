'use client';

import React, { useEffect } from 'react';
import { configureAmplifyClient } from '@/lib/amplifyClient';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Configure Amplify only on the client side
        configureAmplifyClient();
    }, []);

    return <>{children}</>;
}
