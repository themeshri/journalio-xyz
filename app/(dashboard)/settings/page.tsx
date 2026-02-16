'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [displayName, setDisplayName] = useState('')
  const [transactionLimit, setTransactionLimit] = useState('50')
  const [showUSDValues, setShowUSDValues] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [status])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setDisplayName(data.displayName || '')
        setTransactionLimit(String(data.transactionLimit || 50))
        setShowUSDValues(data.showUSDValues ?? true)
      }
    } catch {
      console.error('Failed to fetch settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          transactionLimit: parseInt(transactionLimit),
          showUSDValues,
          darkMode: false,
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        alert('Failed to save settings')
        setSaveStatus('idle')
      }
    } catch {
      alert('Failed to save settings')
      setSaveStatus('idle')
    }
  }

  async function handleReset() {
    if (!confirm('Reset all settings to default?')) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: '',
          transactionLimit: 50,
          showUSDValues: true,
          darkMode: false,
        }),
      })
      if (res.ok) {
        setDisplayName('')
        setTransactionLimit('50')
        setShowUSDValues(true)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch {
      alert('Failed to reset settings')
    } finally {
      setSaveStatus('idle')
    }
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to manage settings.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="/auth/signin">Sign In</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-8">Settings</h1>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName" className="text-xs mb-1.5">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5">Email</Label>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email || 'Not set'}
            </p>
          </div>
        </div>
      </section>

      <hr className="mb-8 border-border" />

      {/* Preferences */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Preferences</h2>
        <div className="space-y-5">
          <div>
            <Label htmlFor="transactionLimit" className="text-xs mb-1.5">
              Transaction Fetch Limit
            </Label>
            <Select
              value={transactionLimit}
              onValueChange={setTransactionLimit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 transactions</SelectItem>
                <SelectItem value="50">50 transactions</SelectItem>
                <SelectItem value="100">100 transactions</SelectItem>
                <SelectItem value="200">200 transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Show USD Values</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display amounts in USD
              </p>
            </div>
            <Switch
              checked={showUSDValues}
              onCheckedChange={setShowUSDValues}
            />
          </div>
        </div>
      </section>

      <hr className="mb-6 border-border" />

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to Default
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
