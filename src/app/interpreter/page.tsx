'use client';

import React from 'react';
import { PageLayout, PageHeader, PageContent } from '@/components/layout';
import { InterpreterInterface } from '@/components/interpreter/InterpreterInterface';
import { ConnectionManagerProvider } from '@/lib/websocket';

/**
 * Interpreter Page
 *
 * Main interpretation workspace with real-time translation.
 */

export default function InterpreterPage() {
  return (
    <ConnectionManagerProvider autoConnect={false}>
      <PageLayout>
        <PageHeader
          title="Interpreter"
          description="Real-time sign language interpretation"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Interpreter' },
          ]}
        />

        <PageContent className="bg-gray-950">
          <div className="h-full">
            <InterpreterInterface />
          </div>
        </PageContent>
      </PageLayout>
    </ConnectionManagerProvider>
  );
}
