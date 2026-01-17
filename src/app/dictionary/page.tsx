'use client';

import React from 'react';
import { PageLayout, PageHeader, PageContent } from '@/components/layout';
import { SignDictionaryBrowser } from '@/components/dictionary';

/**
 * Dictionary Page
 *
 * Browse and search the sign language dictionary.
 */

export default function DictionaryPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Sign Dictionary"
        description="Browse and search ASL signs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Dictionary' },
        ]}
      />

      <PageContent className="bg-white dark:bg-gray-900">
        <SignDictionaryBrowser className="h-full" />
      </PageContent>
    </PageLayout>
  );
}
