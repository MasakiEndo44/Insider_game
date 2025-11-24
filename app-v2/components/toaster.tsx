'use client';

import { Toaster } from 'sonner';

export function ToasterProvider() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                },
            }}
        />
    );
}
